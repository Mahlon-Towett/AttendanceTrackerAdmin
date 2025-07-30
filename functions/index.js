// index.js - Firebase Cloud Functions for Attendance Notifications
// Part 1: Setup and Clock-In Reminder Functions

const functions = require('firebase-functions');
const admin = require('firebase-admin');

// Initialize Firebase Admin SDK
admin.initializeApp();
const db = admin.firestore();
const messaging = admin.messaging();

/**
 * Helper function to get current date in YYYY-MM-DD format (Nairobi timezone)
 */
function getCurrentDateNairobi() {
    const now = new Date();
    const nairobiOffset = 3 * 60; // UTC+3 in minutes
    const nairobiTime = new Date(now.getTime() + (nairobiOffset * 60 * 1000));
    
    return nairobiTime.toISOString().split('T')[0]; // YYYY-MM-DD format
}

/**
 * Helper function to get current time in HH:MM format (Nairobi timezone)
 */
function getCurrentTimeNairobi() {
    const now = new Date();
    const nairobiOffset = 3 * 60; // UTC+3 in minutes
    const nairobiTime = new Date(now.getTime() + (nairobiOffset * 60 * 1000));
    
    return nairobiTime.toTimeString().split(' ')[0].slice(0, 5); // HH:MM format
}

/**
 * Helper function to send FCM notification to a user
 */
async function sendNotificationToUser(employeeDocId, title, body, data = {}) {
    try {
        // Get employee's FCM token from Firestore
        const employeeDoc = await db.collection('employees').doc(employeeDocId).get();
        
        if (!employeeDoc.exists) {
            console.log(`Employee ${employeeDocId} not found`);
            return false;
        }
        
        const employee = employeeDoc.data();
        const fcmToken = employee.fcmToken;
        
        if (!fcmToken) {
            console.log(`No FCM token for employee ${employeeDocId}`);
            return false;
        }
        
        // Prepare notification message
        const message = {
            token: fcmToken,
            notification: {
                title: title,
                body: body,
                icon: 'ic_notification',
                sound: 'default'
            },
            data: {
                type: 'attendance_reminder',
                employeeDocId: employeeDocId,
                timestamp: admin.firestore.Timestamp.now().toString(),
                ...data
            },
            android: {
                priority: 'high',
                notification: {
                    channelId: 'attendance_reminders',
                    color: '#2563EB', // Blue color
                    priority: 'high',
                    defaultSound: true,
                    defaultVibrateTimings: true
                }
            }
        };
        
        // Send the notification
        const response = await messaging.send(message);
        console.log(`Notification sent successfully to ${employee.name}: ${response}`);
        
        // Log notification in Firestore for admin tracking
        await db.collection('notificationLogs').add({
            employeeDocId: employeeDocId,
            employeeName: employee.name,
            pfNumber: employee.pfNumber,
            title: title,
            body: body,
            type: 'attendance_reminder',
            sentAt: admin.firestore.Timestamp.now(),
            fcmResponse: response,
            success: true
        });
        
        return true;
    } catch (error) {
        console.error(`Error sending notification to ${employeeDocId}:`, error);
        
        // Log failed notification
        await db.collection('notificationLogs').add({
            employeeDocId: employeeDocId,
            title: title,
            body: body,
            type: 'attendance_reminder',
            sentAt: admin.firestore.Timestamp.now(),
            error: error.message,
            success: false
        });
        
        return false;
    }
}

/**
 * SCHEDULED FUNCTION: Send Clock-In Reminders at 8:00 AM
 * Runs Monday-Friday at 8:00 AM Nairobi time
 * Sends reminders only to employees who haven't clocked in yet
 */
exports.sendClockInReminders = functions
    .region('europe-west1') // Closest region to Kenya
    .pubsub
    .schedule('0 8 * * 1-5') // Cron: 8:00 AM Monday-Friday
    .timeZone('Africa/Nairobi')
    .onRun(async (context) => {
        console.log('Starting clock-in reminders at', getCurrentTimeNairobi());
        
        const today = getCurrentDateNairobi();
        let remindersSent = 0;
        let errors = 0;
        
        try {
            // Get all active employees
            const employeesSnapshot = await db.collection('employees')
                .where('isActive', '==', true)
                .where('role', '!=', 'Admin') // Don't send to admins
                .get();
            
            if (employeesSnapshot.empty) {
                console.log('No active employees found');
                return null;
            }
            
            // Process each employee
            const promises = employeesSnapshot.docs.map(async (employeeDoc) => {
                try {
                    const employee = employeeDoc.data();
                    const employeeDocId = employeeDoc.id;
                    
                    // Check if employee has already clocked in today
                    const attendanceSnapshot = await db.collection('attendance')
                        .where('employeeDocId', '==', employeeDocId)
                        .where('date', '==', today)
                        .limit(1)
                        .get();
                    
                    // If no attendance record found, employee hasn't clocked in
                    if (attendanceSnapshot.empty) {
                        const success = await sendNotificationToUser(
                            employeeDocId,
                            '⏰ Time to Clock In!',
                            `Good morning ${employee.name}! Don't forget to clock in when you arrive at the office.`,
                            {
                                action: 'clock_in_reminder',
                                workStartTime: '08:00'
                            }
                        );
                        
                        if (success) {
                            remindersSent++;
                        } else {
                            errors++;
                        }
                    } else {
                        console.log(`${employee.name} has already clocked in today`);
                    }
                } catch (error) {
                    console.error(`Error processing employee ${employeeDoc.id}:`, error);
                    errors++;
                }
            });
            
            // Wait for all notifications to be processed
            await Promise.all(promises);
            
            console.log(`Clock-in reminders completed: ${remindersSent} sent, ${errors} errors`);
            
            // Send summary to admin web dashboard (log in Firestore)
            await db.collection('adminNotifications').add({
                type: 'clock_in_reminders_summary',
                date: today,
                remindersSent: remindersSent,
                errors: errors,
                totalEmployees: employeesSnapshot.size,
                executedAt: admin.firestore.Timestamp.now(),
                message: `Clock-in reminders sent to ${remindersSent} employees`
            });
            
            return null;
        } catch (error) {
            console.error('Error in sendClockInReminders function:', error);
            
            // Log critical error to admin
            await db.collection('adminNotifications').add({
                type: 'function_error',
                functionName: 'sendClockInReminders',
                error: error.message,
                date: today,
                executedAt: admin.firestore.Timestamp.now(),
                critical: true
            });
            
            throw error;
        }
    });

/**
 * SCHEDULED FUNCTION: Send Late Arrival Alerts at 8:15 AM
 * Runs Monday-Friday at 8:15 AM Nairobi time
 * Sends alerts to employees who are late (haven't clocked in by 8:15 AM)
 */
exports.sendLateArrivalAlerts = functions
    .region('europe-west1')
    .pubsub
    .schedule('15 8 * * 1-5') // Cron: 8:15 AM Monday-Friday
    .timeZone('Africa/Nairobi')
    .onRun(async (context) => {
        console.log('Starting late arrival alerts at', getCurrentTimeNairobi());
        
        const today = getCurrentDateNairobi();
        let alertsSent = 0;
        let errors = 0;
        let lateEmployees = [];
        
        try {
            // Get all active employees
            const employeesSnapshot = await db.collection('employees')
                .where('isActive', '==', true)
                .where('role', '!=', 'Admin')
                .get();
            
            // Process each employee
            const promises = employeesSnapshot.docs.map(async (employeeDoc) => {
                try {
                    const employee = employeeDoc.data();
                    const employeeDocId = employeeDoc.id;
                    
                    // Check if employee has clocked in today
                    const attendanceSnapshot = await db.collection('attendance')
                        .where('employeeDocId', '==', employeeDocId)
                        .where('date', '==', today)
                        .limit(1)
                        .get();
                    
                    // If no attendance record, employee is late
                    if (attendanceSnapshot.empty) {
                        lateEmployees.push({
                            name: employee.name,
                            pfNumber: employee.pfNumber,
                            department: employee.department
                        });
                        
                        const success = await sendNotificationToUser(
                            employeeDocId,
                            '⚠️ Late Arrival Alert',
                            `You are late for work. Please clock in as soon as you arrive at the office.`,
                            {
                                action: 'late_arrival_alert',
                                lateMinutes: '15+',
                                workStartTime: '08:00'
                            }
                        );
                        
                        if (success) {
                            alertsSent++;
                        } else {
                            errors++;
                        }
                    }
                } catch (error) {
                    console.error(`Error processing late employee ${employeeDoc.id}:`, error);
                    errors++;
                }
            });
            
            await Promise.all(promises);
            
            console.log(`Late arrival alerts completed: ${alertsSent} sent, ${errors} errors, ${lateEmployees.length} late employees`);
            
            // Send detailed summary to admin dashboard
            await db.collection('adminNotifications').add({
                type: 'late_arrival_summary',
                date: today,
                alertsSent: alertsSent,
                errors: errors,
                lateEmployeesCount: lateEmployees.length,
                lateEmployees: lateEmployees,
                executedAt: admin.firestore.Timestamp.now(),
                message: `${lateEmployees.length} employees are late for work`
            });
            
            return null;
        } catch (error) {
            console.error('Error in sendLateArrivalAlerts function:', error);
            
            await db.collection('adminNotifications').add({
                type: 'function_error',
                functionName: 'sendLateArrivalAlerts',
                error: error.message,
                date: today,
                executedAt: admin.firestore.Timestamp.now(),
                critical: true
            });
            
            throw error;
        }
    });
// index.js - Firebase Cloud Functions for Attendance Notifications
// Part 2: Clock-Out Reminders, Device Alerts, and Admin Functions

/**
 * SCHEDULED FUNCTION: Send Clock-Out Reminders at 5:00 PM
 * Runs Monday-Friday at 5:00 PM Nairobi time
 * Sends reminders only to employees who are still clocked in
 */
exports.sendClockOutReminders = functions
    .region('europe-west1')
    .pubsub
    .schedule('0 17 * * 1-5') // Cron: 5:00 PM Monday-Friday
    .timeZone('Africa/Nairobi')
    .onRun(async (context) => {
        console.log('Starting clock-out reminders at', getCurrentTimeNairobi());
        
        const today = getCurrentDateNairobi();
        let remindersSent = 0;
        let errors = 0;
        let stillClockedIn = [];
        
        try {
            // Get all attendance records for today where employees are still clocked in
            const attendanceSnapshot = await db.collection('attendance')
                .where('date', '==', today)
                .where('sessionActive', '==', true) // Still clocked in
                .get();
            
            if (attendanceSnapshot.empty) {
                console.log('No employees are currently clocked in');
                
                // Send admin summary
                await db.collection('adminNotifications').add({
                    type: 'clock_out_reminders_summary',
                    date: today,
                    remindersSent: 0,
                    stillClockedInCount: 0,
                    executedAt: admin.firestore.Timestamp.now(),
                    message: 'No employees needed clock-out reminders'
                });
                
                return null;
            }
            
            // Process each clocked-in employee
            const promises = attendanceSnapshot.docs.map(async (attendanceDoc) => {
                try {
                    const attendance = attendanceDoc.data();
                    const employeeDocId = attendance.employeeDocId;
                    
                    // Get employee details
                    const employeeDoc = await db.collection('employees').doc(employeeDocId).get();
                    
                    if (!employeeDoc.exists) {
                        console.log(`Employee ${employeeDocId} not found`);
                        return;
                    }
                    
                    const employee = employeeDoc.data();
                    
                    // Calculate hours worked so far
                    const clockInTime = attendance.clockInTime; // HH:MM:SS format
                    const currentTime = getCurrentTimeNairobi() + ':00'; // Convert to HH:MM:SS
                    const hoursWorked = calculateHoursWorked(clockInTime, currentTime);
                    
                    stillClockedIn.push({
                        name: employee.name,
                        pfNumber: employee.pfNumber,
                        department: employee.department,
                        clockInTime: attendance.clockInTime,
                        hoursWorked: hoursWorked,
                        deviceModel: attendance.deviceModel || 'Unknown'
                    });
                    
                    const success = await sendNotificationToUser(
                        employeeDocId,
                        '🕐 Time to Clock Out!',
                        `Hi ${employee.name}! It's 5:00 PM. Don't forget to clock out before leaving the office. You've worked ${hoursWorked} hours today.`,
                        {
                            action: 'clock_out_reminder',
                            workEndTime: '17:00',
                            hoursWorked: hoursWorked,
                            clockInTime: attendance.clockInTime
                        }
                    );
                    
                    if (success) {
                        remindersSent++;
                    } else {
                        errors++;
                    }
                } catch (error) {
                    console.error(`Error processing clocked-in employee:`, error);
                    errors++;
                }
            });
            
            await Promise.all(promises);
            
            console.log(`Clock-out reminders completed: ${remindersSent} sent, ${errors} errors, ${stillClockedIn.length} still clocked in`);
            
            // Send detailed summary to admin dashboard
            await db.collection('adminNotifications').add({
                type: 'clock_out_reminders_summary',
                date: today,
                remindersSent: remindersSent,
                errors: errors,
                stillClockedInCount: stillClockedIn.length,
                stillClockedInEmployees: stillClockedIn,
                executedAt: admin.firestore.Timestamp.now(),
                message: `${stillClockedIn.length} employees reminded to clock out`
            });
            
            return null;
        } catch (error) {
            console.error('Error in sendClockOutReminders function:', error);
            
            await db.collection('adminNotifications').add({
                type: 'function_error',
                functionName: 'sendClockOutReminders',
                error: error.message,
                date: today,
                executedAt: admin.firestore.Timestamp.now(),
                critical: true
            });
            
            throw error;
        }
    });

/**
 * FIRESTORE TRIGGER: Device Conflict Alert
 * Triggers when a new attendance record is created
 * Detects device conflicts and sends alerts to admin web dashboard
 */
exports.detectDeviceConflicts = functions
    .region('europe-west1')
    .firestore
    .document('attendance/{attendanceId}')
    .onCreate(async (snapshot, context) => {
        try {
            const newAttendance = snapshot.data();
            const attendanceId = context.params.attendanceId;
            
            console.log(`Checking device conflict for attendance ${attendanceId}`);
            
            // Check if this employee has other active sessions on different devices
            const conflictingSessionsSnapshot = await db.collection('attendance')
                .where('employeeDocId', '==', newAttendance.employeeDocId)
                .where('date', '==', newAttendance.date)
                .where('sessionActive', '==', true)
                .get();
            
            // Filter out the current session and check for different devices
            const otherSessions = conflictingSessionsSnapshot.docs.filter(doc => {
                const data = doc.data();
                return doc.id !== attendanceId && data.deviceId !== newAttendance.deviceId;
            });
            
            if (otherSessions.length > 0) {
                // Device conflict detected!
                const employee = await db.collection('employees').doc(newAttendance.employeeDocId).get();
                const employeeData = employee.data();
                
                const conflictData = otherSessions.map(session => {
                    const data = session.data();
                    return {
                        deviceId: data.deviceId,
                        deviceModel: data.deviceModel,
                        clockInTime: data.clockInTime,
                        sessionId: session.id
                    };
                });
                
                // Send critical alert to admin dashboard
                await db.collection('adminNotifications').add({
                    type: 'device_conflict_alert',
                    severity: 'HIGH',
                    employeeDocId: newAttendance.employeeDocId,
                    employeeName: employeeData.name,
                    pfNumber: employeeData.pfNumber,
                    department: employeeData.department,
                    conflictDetails: {
                        newDevice: {
                            deviceId: newAttendance.deviceId,
                            deviceModel: newAttendance.deviceModel,
                            clockInTime: newAttendance.clockInTime
                        },
                        existingSessions: conflictData
                    },
                    date: newAttendance.date,
                    detectedAt: admin.firestore.Timestamp.now(),
                    message: `SECURITY ALERT: ${employeeData.name} has multiple active sessions on different devices`,
                    requiresAction: true
                });
                
                console.log(`Device conflict detected for ${employeeData.name}: ${conflictData.length} conflicting sessions`);
                
                // Optionally: Automatically deactivate the older sessions
                const deactivatePromises = otherSessions.map(async (session) => {
                    await session.ref.update({
                        sessionActive: false,
                        deactivatedReason: 'Device conflict detected',
                        deactivatedAt: admin.firestore.Timestamp.now(),
                        deactivatedBy: 'system'
                    });
                });
                
                await Promise.all(deactivatePromises);
                console.log(`Deactivated ${otherSessions.length} conflicting sessions`);
            }
            
            return null;
        } catch (error) {
            console.error('Error in detectDeviceConflicts function:', error);
            
            await db.collection('adminNotifications').add({
                type: 'function_error',
                functionName: 'detectDeviceConflicts',
                error: error.message,
                executedAt: admin.firestore.Timestamp.now(),
                critical: true
            });
        }
    });

/**
 * SCHEDULED FUNCTION: Daily Summary Report at 6:00 PM
 * Sends comprehensive daily attendance summary to admin dashboard
 */
exports.generateDailySummary = functions
    .region('europe-west1')
    .pubsub
    .schedule('0 18 * * 1-5') // Cron: 6:00 PM Monday-Friday
    .timeZone('Africa/Nairobi')
    .onRun(async (context) => {
        console.log('Generating daily summary at', getCurrentTimeNairobi());
        
        const today = getCurrentDateNairobi();
        
        try {
            // Get all active employees
            const employeesSnapshot = await db.collection('employees')
                .where('isActive', '==', true)
                .where('role', '!=', 'Admin')
                .get();
            
            const totalEmployees = employeesSnapshot.size;
            
            // Get today's attendance records
            const attendanceSnapshot = await db.collection('attendance')
                .where('date', '==', today)
                .get();
            
            let presentCount = 0;
            let lateCount = 0;
            let stillClockedIn = 0;
            let deviceConflicts = 0;
            let totalHoursWorked = 0;
            
            const attendanceDetails = [];
            
            attendanceSnapshot.docs.forEach(doc => {
                const attendance = doc.data();
                
                if (attendance.status === 'Present' || attendance.status === 'Late') {
                    presentCount++;
                }
                
                if (attendance.isLate) {
                    lateCount++;
                }
                
                if (attendance.sessionActive) {
                    stillClockedIn++;
                }
                
                if (attendance.totalHours) {
                    totalHoursWorked += attendance.totalHours;
                }
                
                attendanceDetails.push({
                    employeeName: attendance.employeeName,
                    pfNumber: attendance.pfNumber,
                    clockInTime: attendance.clockInTime,
                    clockOutTime: attendance.clockOutTime || 'Still clocked in',
                    totalHours: attendance.totalHours || 0,
                    isLate: attendance.isLate || false,
                    lateMinutes: attendance.lateMinutes || 0,
                    deviceModel: attendance.deviceModel || 'Unknown'
                });
            });
            
            const absentCount = totalEmployees - presentCount;
            const attendanceRate = totalEmployees > 0 ? ((presentCount / totalEmployees) * 100).toFixed(1) : 0;
            const avgHoursWorked = presentCount > 0 ? (totalHoursWorked / presentCount).toFixed(1) : 0;
            
            // Get device conflicts count for today
            const conflictsSnapshot = await db.collection('adminNotifications')
                .where('type', '==', 'device_conflict_alert')
                .where('date', '==', today)
                .get();
            
            deviceConflicts = conflictsSnapshot.size;
            
            // Generate comprehensive summary
            const dailySummary = {
                type: 'daily_attendance_summary',
                date: today,
                statistics: {
                    totalEmployees: totalEmployees,
                    presentToday: presentCount,
                    absentToday: absentCount,
                    lateArrivals: lateCount,
                    stillClockedIn: stillClockedIn,
                    attendanceRate: parseFloat(attendanceRate),
                    totalHoursWorked: parseFloat(totalHoursWorked.toFixed(1)),
                    avgHoursWorked: parseFloat(avgHoursWorked),
                    deviceConflicts: deviceConflicts
                },
                attendanceDetails: attendanceDetails,
                generatedAt: admin.firestore.Timestamp.now(),
                message: `Daily Summary: ${presentCount}/${totalEmployees} employees present (${attendanceRate}% attendance rate)`
            };
            
            // Save to admin notifications
            await db.collection('adminNotifications').add(dailySummary);
            
            console.log(`Daily summary generated: ${presentCount}/${totalEmployees} present, ${lateCount} late, ${stillClockedIn} still clocked in`);
            
            return null;
        } catch (error) {
            console.error('Error in generateDailySummary function:', error);
            
            await db.collection('adminNotifications').add({
                type: 'function_error',
                functionName: 'generateDailySummary',
                error: error.message,
                date: today,
                executedAt: admin.firestore.Timestamp.now(),
                critical: true
            });
            
            throw error;
        }
    });

/**
 * HTTP FUNCTION: Manual notification trigger for testing
 * Allows admin to manually send notifications for testing purposes
 */
exports.sendManualNotification = functions
    .region('europe-west1')
    .https
    .onRequest(async (req, res) => {
        // Enable CORS
        res.set('Access-Control-Allow-Origin', '*');
        res.set('Access-Control-Allow-Methods', 'GET, POST');
        res.set('Access-Control-Allow-Headers', 'Content-Type');
        
        if (req.method === 'OPTIONS') {
            res.status(204).send('');
            return;
        }
        
        try {
            const { type, employeeDocId, title, body } = req.body;
            
            if (!type || !employeeDocId || !title || !body) {
                res.status(400).json({
                    error: 'Missing required parameters: type, employeeDocId, title, body'
                });
                return;
            }
            
            const success = await sendNotificationToUser(employeeDocId, title, body, {
                action: 'manual_notification',
                type: type
            });
            
            if (success) {
                res.status(200).json({
                    success: true,
                    message: 'Notification sent successfully'
                });
            } else {
                res.status(500).json({
                    success: false,
                    message: 'Failed to send notification'
                });
            }
        } catch (error) {
            console.error('Error in sendManualNotification:', error);
            res.status(500).json({
                success: false,
                error: error.message
            });
        }
    });

/**
 * Helper function to calculate hours worked between two times
 */
function calculateHoursWorked(clockInTime, clockOutTime) {
    try {
        const clockIn = new Date(`1970-01-01T${clockInTime}Z`);
        const clockOut = new Date(`1970-01-01T${clockOutTime}Z`);
        
        const diffInMillis = clockOut.getTime() - clockIn.getTime();
        const hours = diffInMillis / (1000 * 60 * 60);
        
        return `${Math.floor(hours)}h ${Math.floor((hours % 1) * 60)}m`;
    } catch (error) {
        return '0h 0m';
    }
}

/**
 * HTTP FUNCTION: Get notification logs for admin dashboard
 * Returns recent notification activity for admin monitoring
 */
exports.getNotificationLogs = functions
    .region('europe-west1')
    .https
    .onRequest(async (req, res) => {
        res.set('Access-Control-Allow-Origin', '*');
        res.set('Access-Control-Allow-Methods', 'GET');
        res.set('Access-Control-Allow-Headers', 'Content-Type');
        
        if (req.method === 'OPTIONS') {
            res.status(204).send('');
            return;
        }
        
        try {
            const days = parseInt(req.query.days) || 7; // Default to last 7 days
            const limit = parseInt(req.query.limit) || 100; // Default to 100 records
            
            const cutoffDate = new Date();
            cutoffDate.setDate(cutoffDate.getDate() - days);
            
            const logsSnapshot = await db.collection('notificationLogs')
                .where('sentAt', '>=', admin.firestore.Timestamp.fromDate(cutoffDate))
                .orderBy('sentAt', 'desc')
                .limit(limit)
                .get();
            
            const logs = logsSnapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data(),
                sentAt: doc.data().sentAt.toDate().toISOString()
            }));
            
            res.status(200).json({
                success: true,
                logs: logs,
                count: logs.length
            });
        } catch (error) {
            console.error('Error in getNotificationLogs:', error);
            res.status(500).json({
                success: false,
                error: error.message
            });
        }
    });