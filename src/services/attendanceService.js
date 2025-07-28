import { 
  collection, 
  query, 
  where, 
  orderBy, 
  getDocs, 
  Timestamp 
} from 'firebase/firestore';
import { db } from '../firebase/config';

export const getAttendanceByDate = async (date) => {
  try {
    const q = query(
      collection(db, 'attendance'),
      where('date', '==', date),
      orderBy('clockInTimestamp', 'desc')
    );
    
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
  } catch (error) {
    console.error('Error fetching attendance:', error);
    throw error;
  }
};

export const getEmployees = async () => {
  try {
    const q = query(
      collection(db, 'employees'),
      orderBy('name')
    );
    
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
  } catch (error) {
    console.error('Error fetching employees:', error);
    throw error;
  }
};

export const getAttendanceStats = async (date) => {
  try {
    const attendance = await getAttendanceByDate(date);
    const employees = await getEmployees();
    
    const activeEmployees = employees.filter(emp => emp.isActive);
    const presentToday = attendance.filter(record => 
      record.status === 'Present' || record.status === 'Late'
    ).length;
    const lateToday = attendance.filter(record => record.isLate).length;
    const absentToday = activeEmployees.length - presentToday;

    return {
      totalEmployees: activeEmployees.length,
      presentToday,
      lateToday,
      absentToday,
      attendanceRate: ((presentToday / activeEmployees.length) * 100).toFixed(1)
    };
  } catch (error) {
    console.error('Error calculating stats:', error);
    throw error;
  }
};