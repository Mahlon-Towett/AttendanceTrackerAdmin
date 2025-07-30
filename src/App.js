import React, { useState, useEffect, useCallback } from 'react';
import AdminAuth from './components/AdminAuth';
import AdminPanel from './components/AdminPanel';
import { getAttendanceByDate, getEmployees, getAttendanceStats } from './services/attendanceService';

function App() {
  const [attendanceData, setAttendanceData] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [stats, setStats] = useState({});
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [loading, setLoading] = useState(true);

  // Use useCallback to prevent unnecessary re-renders
  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      const [attendance, employeeList, statsData] = await Promise.all([
        getAttendanceByDate(selectedDate),
        getEmployees(),
        getAttendanceStats(selectedDate)
      ]);
      
      setAttendanceData(attendance);
      setEmployees(employeeList);
      setStats(statsData);
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  }, [selectedDate]); // Include selectedDate in dependencies

  useEffect(() => {
    loadData();
  }, [loadData]); // Now loadData is stable and won't cause infinite loops

  return (
    <AdminAuth>
      <AdminPanel 
        attendanceData={attendanceData}
        employees={employees}
        stats={stats}
        selectedDate={selectedDate}
        onDateChange={setSelectedDate}
        loading={loading}
        onRefresh={loadData}
      />
    </AdminAuth>
  );
}

export default App;