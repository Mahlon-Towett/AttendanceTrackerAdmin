// Firebase Cloud Functions for Attendance Notifications
// functions/index.js

const functions = require('firebase-functions');
const admin = require('firebase-admin');

admin.initializeApp();
const db = admin.firestore();
const messaging = admin.messaging();

// Timezone for Nairobi (EAT - UTC+3)
const NAIROBI_TIMEZONE = 'Africa/Nairobi';

/**
 * Scheduled function to send clock-in reminders at 8:00 AM EAT
 * Runs every day at 8:00 AM Nairobi time (Monday-Friday)
 */
exports.sendClockInReminders = functions
    .region('europe-west1') // Choose region closest to Kenya
    .pubsub
    .schedule('0 8 * * 1-5') // 8:00 AM Monday-Friday
    .timeZone(NAIROBI_TIMEZONE)
    .onRun(async (context) => {
        console.log('Starting clock-in reminders at 8:00 AM EAT');
        
        try {
            const today = getTodayDateString();
            
            // Get all active employees
            const employeesSnapshot = await db.collection('employees')
                .where('isActive', '==', true)
                .get();
            
            if (employeesSnapshot.empty) {
                console.log('No active employees found');
                return null;
            }
            
            // Get employees who haven't clocked in yet today
            const attendanceSnapshot = await db.collection('attendance')
                .where('date', '==', today)
                .get();
            
            // Create set of employee IDs who have already clocked in
            const clockedInEmployees = new Set();
            attendanceSnapshot.forEach(doc => {
                const data = doc.data();
                if (data.clockInTime) {
                    clockedInEmployees.add(data.employeeDocId);
                }
            });
            
            // Send notifications to employees who haven't clocked in
            const notifications = [];
            
            employeesSnapshot.forEach(doc => {
                const employee = doc.data();
                const employeeId = doc.id;
                
                if (!clockedInEmployees.has(employeeId)) {
                    // Employee hasn't clocked in yet
                    const fcmToken = employee.fcmToken;
                    if (fcmToken) {
                        const notification = {
                            token: fcmToken,
                            notification: {
                                title: '⏰ Time to Clock In!',
                                body: `Good morning ${getFirstName(employee.name)}! Don't forget to clock in for work.`
                            },
                            data: {
                                type: 'CLOCK_IN_REMINDER',
                                employeeId: employeeId,
                                time: '08:00',
                                date: today
                            },
                            android: {
                                notification: {
                                    icon: 'ic_clock_reminder',
                                    color: '#2563EB',
                                    sound: 'default',
                                    channelId: 'attendance_reminders'
                                }
                            }
                        };
                        
                        notifications.push(notification);
                    }
                }
            });
            
            // Send notifications in batches
            if (notifications.length > 0) {
                const results = await sendNotificationsBatch(notifications);
                console.log(`Sent ${results.successCount} clock-in reminders, ${results.failureCount} failed`);
                
                // Log notification activity
                await logNotificationActivity('CLOCK_IN_REMINDER', notifications.length, results);
            } else {
                console.log('All employees have already clocked in');
            }
            
        } catch (error) {
            console.error('Error sending clock-in reminders:', error);
        }
        
        return null;
    });

/**
 * Scheduled function to send clock-out reminders at 5:00 PM EAT
 * Runs every day at 5:00 PM Nairobi time (Monday-Friday)
 */
exports.sendClockOutReminders = functions
    .region('europe-west1')
    .pubsub
    .schedule('0 17 * * 1-5') // 5:00 PM Monday-Friday
    .timeZone(NAIROBI_TIMEZONE)
    .onRun(async (context) => {
        console.log('Starting clock-out reminders at 5:00 PM EAT');
        
        try {
            const today = getTodayDateString();
            
            // Get employees who are clocked in but haven't clocked out
            const attendanceSnapshot = await db.collection('attendance')
                .where('date', '==', today)
                .where('sessionActive', '==', true)
                .get();
            
            if (attendanceSnapshot.empty) {
                console.log('No employees currently clocked in');
                return null;
            }
            
            const notifications = [];
            
            for (const doc of attendanceSnapshot.docs) {
                const attendance = doc.data();
                
                // Check if employee is still clocked in (no clock out time)
                if (attendance.clockInTime && !attendance.clockOutTime) {
                    // Get employee details
                    const employeeDoc = await db.collection('employees')
                        .doc(attendance.employeeDocId)
                        .get();
                    
                    if (employeeDoc.exists) {
                        const employee = employeeDoc.data();
                        const fcmToken = employee.fcmToken;
                        
                        if (fcmToken) {
                            // Calculate hours worked so far
                            const hoursWorked = calculateHoursWorked(attendance.clockInTime);
                            
                            const notification = {
                                token: fcmToken,
                                notification: {
                                    title: '🏁 Time to Clock Out!',
                                    body: `${getFirstName(employee.name)}, it's 5:00 PM! You've worked ${hoursWorked}. Don't forget to clock out.`
                                },
                                data: {
                                    type: 'CLOCK_OUT_REMINDER',
                                    employeeId: attendance.employeeDocId,
                                    attendanceId: doc.id,
                                    hoursWorked: hoursWorked,
                                    time: '17:00',
                                    date: today
                                },
                                android: {
                                    notification: {
                                        icon: 'ic_clock_reminder',
                                        color: '#EA580C',
                                        sound: 'default',
                                        channelId: 'attendance_reminders'
                                    }
                                }
                            };
                            
                            notifications.push(notification);
                        }
                    }
                }
            }
            
            // Send notifications
            if (notifications.length > 0) {
                const results = await sendNotificationsBatch(notifications);
                console.log(`Sent ${results.successCount} clock-out reminders, ${results.failureCount} failed`);
                
                // Log notification activity
                await logNotificationActivity('CLOCK_OUT_REMINDER', notifications.length, results);
            } else {
                console.log('All employees have already clocked out');
            }
            
        } catch (error) {
            console.error('Error sending clock-out reminders:', error);
        }
        
        return null;
    });

/**
 * Send late arrival notifications (15 minutes after 8:00 AM)
 */
exports.sendLateArrivalAlerts = functions
    .region('europe-west1')
    .pubsub
    .schedule('15 8 * * 1-5') // 8:15 AM Monday-Friday
    .timeZone(NAIROBI_TIMEZONE)
    .onRun(async (context) => {
        console.log('Starting late arrival alerts at 8:15 AM EAT');
        
        try {
            const today = getTodayDateString();
            
            // Get all active employees
            const employeesSnapshot = await db.collection('employees')
                .where('isActive', '==', true)
                .get();
            
            // Get employees who haven't clocked in yet
            const attendanceSnapshot = await db.collection('attendance')
                .where('date', '==', today)
                .get();
            
            const clockedInEmployees = new Set();
            attendanceSnapshot.forEach(doc => {
                const data = doc.data();
                if (data.clockInTime) {
                    clockedInEmployees.add(data.employeeDocId);
                }
            });
            
            const notifications = [];
            const lateEmployees = [];
            
            employeesSnapshot.forEach(doc => {
                const employee = doc.data();
                const employeeId = doc.id;
                
                if (!clockedInEmployees.has(employeeId)) {
                    // Employee is late
                    const fcmToken = employee.fcmToken;
                    if (fcmToken) {
                        const notification = {
                            token: fcmToken,
                            notification: {
                                title: '⚠️ Late Arrival Alert',
                                body: `${getFirstName(employee.name)}, you're running late! Please clock in as soon as you arrive.`
                            },
                            data: {
                                type: 'LATE_ARRIVAL_ALERT',
                                employeeId: employeeId,
                                minutesLate: '15',
                                date: today
                            },
                            android: {
                                notification: {
                                    icon: 'ic_warning',
                                    color: '#DC2626',
                                    sound: 'default',
                                    channelId: 'attendance_alerts'
                                }
                            }
                        };
                        
                        notifications.push(notification);
                        
                        // Add to late employees list for admin summary
                        lateEmployees.push({
                            name: employee.name,
                            pfNumber: employee.pfNumber,
                            department: employee.department || 'Unknown'
                        });
                    }
                }
            });
            
            // Send employee notifications
            if (notifications.length > 0) {
                const results = await sendNotificationsBatch(notifications);
                console.log(`Sent ${results.successCount} late arrival alerts, ${results.failureCount} failed`);
                
                // Log late employees for admin dashboard
                await logLateEmployees(lateEmployees, today);
                
                // Log notification activity
                await logNotificationActivity('LATE_ARRIVAL_ALERT', notifications.length, results);
            }
            
        } catch (error) {
            console.error('Error sending late arrival alerts:', error);
        }
        
        return null;
    });

/**
 * Send batch notifications efficiently
 */
async function sendNotificationsBatch(notifications) {
    const batchSize = 500; // FCM batch limit
    let successCount = 0;
    let failureCount = 0;
    
    for (let i = 0; i < notifications.length; i += batchSize) {
        const batch = notifications.slice(i, i + batchSize);
        
        try {
            const response = await messaging.sendAll(batch);
            successCount += response.successCount;
            failureCount += response.failureCount;
            
            // Handle failed tokens
            if (response.failureCount > 0) {
                const failedTokens = [];
                response.responses.forEach((resp, idx) => {
                    if (!resp.success) {
                        console.error(`Failed to send to token ${batch[idx].token}:`, resp.error);
                        
                        // Check if