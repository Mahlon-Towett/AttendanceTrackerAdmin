import React, { useState, useEffect } from 'react';
import { signOut } from 'firebase/auth';
import { auth } from '../firebase/config';
import { 
  Users, 
  Clock, 
  MapPin, 
  BarChart3, 
  Settings, 
  LogOut, 
  Calendar, 
  Download,
  RefreshCw,
  CheckCircle,
  AlertCircle,
  XCircle,
  TrendingUp,
  Eye,
  Filter
} from 'lucide-react';

const AdminPanel = ({ 
  attendanceData = [], 
  employees = [], 
  stats = {}, 
  selectedDate, 
  onDateChange, 
  loading = false, 
  onRefresh 
}) => {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [isRefreshing, setIsRefreshing] = useState(false);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await onRefresh();
    setIsRefreshing(false);
  };

  const handleLogout = async () => {
    try {
      await signOut(auth);
    } catch (error) {
      console.error('Error signing out:', error);
    }
  };

  const formatTime = (timeString) => {
    if (!timeString || timeString === '--:--') return '--:--';
    try {
      return timeString.length > 5 ? timeString.substring(0, 5) : timeString;
    } catch {
      return '--:--';
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'Present': return 'text-green-600 bg-green-50';
      case 'Late': return 'text-orange-600 bg-orange-50';
      case 'Absent': return 'text-red-600 bg-red-50';
      default: return 'text-gray-600 bg-gray-50';
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className="w-8 h-8 bg-gradient-to-r from-blue-600 to-purple-600 rounded-lg flex items-center justify-center">
                  <Clock className="w-5 h-5 text-white" />
                </div>
              </div>
              <div className="ml-4">
                <h1 className="text-xl font-semibold text-gray-900">TimeTracker Pro</h1>
                <p className="text-sm text-gray-500">Admin Dashboard</p>
              </div>
            </div>

            <div className="flex items-center space-x-4">
              {/* Date Selector */}
              <div className="flex items-center space-x-2">
                <Calendar className="w-4 h-4 text-gray-500" />
                <input
                  type="date"
                  value={selectedDate}
                  onChange={(e) => onDateChange(e.target.value)}
                  className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              {/* Refresh Button */}
              <button
                onClick={handleRefresh}
                disabled={isRefreshing}
                className="flex items-center px-3 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
              >
                <RefreshCw className={`w-4 h-4 mr-2 ${isRefreshing ? 'animate-spin' : ''}`} />
                Refresh
              </button>

              {/* Logout Button */}
              <button
                onClick={handleLogout}
                className="flex items-center px-3 py-2 border border-red-300 rounded-lg text-sm font-medium text-red-700 bg-white hover:bg-red-50 focus:ring-2 focus:ring-red-500"
              >
                <LogOut className="w-4 h-4 mr-2" />
                Logout
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Navigation Tabs */}
      <nav className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex space-x-8">
            {[
              { id: 'dashboard', label: 'Dashboard', icon: BarChart3 },
              { id: 'attendance', label: 'Attendance', icon: Clock },
              { id: 'employees', label: 'Employees', icon: Users },
              { id: 'locations', label: 'Locations', icon: MapPin },
              { id: 'settings', label: 'Settings', icon: Settings }
            ].map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center px-1 py-4 border-b-2 font-medium text-sm ${
                    activeTab === tab.id
                      ? 'border-blue-500 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  <Icon className="w-4 h-4 mr-2" />
                  {tab.label}
                </button>
              );
            })}
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {activeTab === 'dashboard' && (
          <div className="space-y-6">
            {/* Stats Overview */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                      <Users className="w-5 h-5 text-blue-600" />
                    </div>
                  </div>
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-500">Total Employees</p>
                    <p className="text-2xl font-bold text-gray-900">
                      {loading ? '...' : stats.totalEmployees || 0}
                    </p>
                  </div>
                </div>
              </div>

              <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                      <CheckCircle className="w-5 h-5 text-green-600" />
                    </div>
                  </div>
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-500">Present Today</p>
                    <p className="text-2xl font-bold text-green-600">
                      {loading ? '...' : stats.presentToday || 0}
                    </p>
                  </div>
                </div>
              </div>

              <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <div className="w-10 h-10 bg-orange-100 rounded-lg flex items-center justify-center">
                      <AlertCircle className="w-5 h-5 text-orange-600" />
                    </div>
                  </div>
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-500">Late Arrivals</p>
                    <p className="text-2xl font-bold text-orange-600">
                      {loading ? '...' : stats.lateToday || 0}
                    </p>
                  </div>
                </div>
              </div>

              <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <div className="w-10 h-10 bg-red-100 rounded-lg flex items-center justify-center">
                      <XCircle className="w-5 h-5 text-red-600" />
                    </div>
                  </div>
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-500">Absent</p>
                    <p className="text-2xl font-bold text-red-600">
                      {loading ? '...' : stats.absentToday || 0}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Attendance Rate Card */}
            <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-900">Attendance Rate</h3>
                <TrendingUp className="w-5 h-5 text-green-500" />
              </div>
              <div className="flex items-center">
                <div className="flex-1">
                  <div className="w-full bg-gray-200 rounded-full h-3">
                    <div 
                      className="bg-gradient-to-r from-green-400 to-green-600 h-3 rounded-full transition-all duration-300"
                      style={{ width: `${stats.attendanceRate || 0}%` }}
                    ></div>
                  </div>
                </div>
                <span className="ml-4 text-2xl font-bold text-green-600">
                  {loading ? '...' : `${stats.attendanceRate || 0}%`}
                </span>
              </div>
              <p className="text-sm text-gray-500 mt-2">
                {stats.presentToday || 0} out of {stats.totalEmployees || 0} employees present today
              </p>
            </div>

            {/* Quick Actions */}
            <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Quick Actions</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <button
                  onClick={() => setActiveTab('attendance')}
                  className="flex items-center justify-center px-4 py-3 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:ring-2 focus:ring-blue-500"
                >
                  <Eye className="w-4 h-4 mr-2" />
                  View Today's Attendance
                </button>
                <button
                  onClick={() => setActiveTab('employees')}
                  className="flex items-center justify-center px-4 py-3 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:ring-2 focus:ring-blue-500"
                >
                  <Users className="w-4 h-4 mr-2" />
                  Manage Employees
                </button>
                <button className="flex items-center justify-center px-4 py-3 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:ring-2 focus:ring-blue-500">
                  <Download className="w-4 h-4 mr-2" />
                  Export Report
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Attendance Tab */}
        {activeTab === 'attendance' && (
          <div className="space-y-6">
            {/* Attendance Header */}
            <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <h2 className="text-xl font-semibold text-gray-900">Attendance Records</h2>
                  <p className="text-sm text-gray-500 mt-1">
                    {new Date(selectedDate).toLocaleDateString('en-US', { 
                      weekday: 'long', 
                      year: 'numeric', 
                      month: 'long', 
                      day: 'numeric' 
                    })}
                  </p>
                </div>
                <div className="mt-4 sm:mt-0 flex space-x-3">
                  <button className="flex items-center px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 bg-white hover:bg-gray-50">
                    <Filter className="w-4 h-4 mr-2" />
                    Filter
                  </button>
                  <button className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700">
                    <Download className="w-4 h-4 mr-2" />
                    Export
                  </button>
                </div>
              </div>
            </div>

            {/* Attendance Table */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Employee
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Clock In
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Clock Out
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Hours
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Status
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Location
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {loading ? (
                      <tr>
                        <td colSpan="6" className="px-6 py-12 text-center">
                          <div className="flex items-center justify-center">
                            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mr-3"></div>
                            <span className="text-gray-500">Loading attendance data...</span>
                          </div>
                        </td>
                      </tr>
                    ) : attendanceData.length === 0 ? (
                      <tr>
                        <td colSpan="6" className="px-6 py-12 text-center">
                          <div className="text-gray-500">
                            <Clock className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                            <p className="text-lg font-medium">No attendance records</p>
                            <p className="text-sm">No employees have clocked in today.</p>
                          </div>
                        </td>
                      </tr>
                    ) : (
                      attendanceData.map((record) => (
                        <tr key={record.id} className="hover:bg-gray-50">
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="flex items-center">
                              <div className="flex-shrink-0 h-10 w-10">
                                <div className="h-10 w-10 rounded-full bg-gray-300 flex items-center justify-center">
                                  <span className="text-sm font-medium text-gray-700">
                                    {record.employeeName ? record.employeeName.charAt(0).toUpperCase() : 'N'}
                                  </span>
                                </div>
                              </div>
                              <div className="ml-4">
                                <div className="text-sm font-medium text-gray-900">
                                  {record.employeeName || 'Unknown Employee'}
                                </div>
                                <div className="text-sm text-gray-500">
                                  PF: {record.pfNumber || 'N/A'}
                                </div>
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {formatTime(record.clockInTime)}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {formatTime(record.clockOutTime) || '--:--'}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {record.totalHours ? `${record.totalHours.toFixed(1)}h` : '--'}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(record.status)}`}>
                              {record.status || 'Unknown'}
                              {record.isLate && ' (Late)'}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {record.locationName || 'Office'}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* Employees Tab */}
        {activeTab === 'employees' && (
          <div className="space-y-6">
            {/* Employees Header */}
            <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <h2 className="text-xl font-semibold text-gray-900">Employee Management</h2>
                  <p className="text-sm text-gray-500 mt-1">
                    Manage employee accounts and permissions
                  </p>
                </div>
                <div className="mt-4 sm:mt-0">
                  <button className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700">
                    <Users className="w-4 h-4 mr-2" />
                    Add Employee
                  </button>
                </div>
              </div>
            </div>

            {/* Enhanced Employee Stats */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                      <CheckCircle className="w-5 h-5 text-green-600" />
                    </div>
                  </div>
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-500">Active Employees</p>
                    <p className="text-2xl font-bold text-gray-900">
                      {loading ? '...' : employees.filter(emp => emp.isActive).length}
                    </p>
                  </div>
                </div>
              </div>

              <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                      <Users className="w-5 h-5 text-blue-600" />
                    </div>
                  </div>
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-500">Total Registered</p>
                    <p className="text-2xl font-bold text-gray-900">
                      {loading ? '...' : employees.length}
                    </p>
                  </div>
                </div>
              </div>

              <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
                      <TrendingUp className="w-5 h-5 text-purple-600" />
                    </div>
                  </div>
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-500">Admin Staff</p>
                    <p className="text-2xl font-bold text-gray-900">
                      {loading ? '...' : employees.filter(emp => emp.empCategory === 'Administrative Staff').length}
                    </p>
                  </div>
                </div>
              </div>

              <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <div className="w-10 h-10 bg-orange-100 rounded-lg flex items-center justify-center">
                      <AlertCircle className="w-5 h-5 text-orange-600" />
                    </div>
                  </div>
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-500">Password Pending</p>
                    <p className="text-2xl font-bold text-gray-900">
                      {loading ? '...' : employees.filter(emp => !emp.hasPassword).length}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Department & Category Breakdown */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Department Distribution</h3>
                <div className="space-y-3">
                  {loading ? (
                    <div className="text-gray-500">Loading departments...</div>
                  ) : (
                    [...new Set(employees.map(emp => emp.department).filter(Boolean))]
                      .slice(0, 5)
                      .map(dept => {
                        const count = employees.filter(emp => emp.department === dept).length;
                        const percentage = ((count / employees.length) * 100).toFixed(1);
                        return (
                          <div key={dept} className="flex items-center justify-between">
                            <div className="flex-1">
                              <div className="text-sm font-medium text-gray-900 truncate">{dept}</div>
                              <div className="w-full bg-gray-200 rounded-full h-2 mt-1">
                                <div 
                                  className="bg-blue-600 h-2 rounded-full" 
                                  style={{ width: `${percentage}%` }}
                                ></div>
                              </div>
                            </div>
                            <div className="ml-3 text-sm font-semibold text-gray-600">
                              {count}
                            </div>
                          </div>
                        );
                      })
                  )}
                </div>
              </div>

              <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Employment Categories</h3>
                <div className="space-y-3">
                  {loading ? (
                    <div className="text-gray-500">Loading categories...</div>
                  ) : (
                    [...new Set(employees.map(emp => emp.empCategory).filter(Boolean))]
                      .map(category => {
                        const count = employees.filter(emp => emp.empCategory === category).length;
                        const percentage = ((count / employees.length) * 100).toFixed(1);
                        return (
                          <div key={category} className="flex items-center justify-between">
                            <div className="flex-1">
                              <div className="text-sm font-medium text-gray-900">{category}</div>
                              <div className="w-full bg-gray-200 rounded-full h-2 mt-1">
                                <div 
                                  className="bg-green-600 h-2 rounded-full" 
                                  style={{ width: `${percentage}%` }}
                                ></div>
                              </div>
                            </div>
                            <div className="ml-3 text-sm font-semibold text-gray-600">
                              {count} ({percentage}%)
                            </div>
                          </div>
                        );
                      })
                  )}
                </div>
              </div>
            </div>

            {/* Enhanced Employees List */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Employee Details
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Position & Department
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Contact & Location
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Employment Info
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Status & Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {loading ? (
                      <tr>
                        <td colSpan="5" className="px-6 py-12 text-center">
                          <div className="flex items-center justify-center">
                            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mr-3"></div>
                            <span className="text-gray-500">Loading employees...</span>
                          </div>
                        </td>
                      </tr>
                    ) : employees.length === 0 ? (
                      <tr>
                        <td colSpan="5" className="px-6 py-12 text-center">
                          <div className="text-gray-500">
                            <Users className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                            <p className="text-lg font-medium">No employees found</p>
                            <p className="text-sm">Add your first employee to get started.</p>
                          </div>
                        </td>
                      </tr>
                    ) : (
                      employees.map((employee) => (
                        <tr key={employee.id} className="hover:bg-gray-50">
                          {/* Employee Details */}
                          <td className="px-6 py-4">
                            <div className="flex items-center">
                              <div className="flex-shrink-0 h-12 w-12">
                                <div className="h-12 w-12 rounded-full bg-gradient-to-r from-blue-400 to-purple-500 flex items-center justify-center">
                                  <span className="text-sm font-medium text-white">
                                    {employee.name ? employee.name.split(' ').map(n => n.charAt(0)).join('').slice(0, 2) : 'N'}
                                  </span>
                                </div>
                              </div>
                              <div className="ml-4">
                                <div className="text-sm font-semibold text-gray-900">
                                  {employee.name || 'Unknown Employee'}
                                </div>
                                <div className="text-xs text-gray-500 space-y-1">
                                  <div className="flex items-center">
                                    <span className="font-medium">PF:</span>
                                    <span className="ml-1">{employee.pfNumber || 'N/A'}</span>
                                  </div>
                                  <div className="flex items-center">
                                    <span className="font-medium">Gender:</span>
                                    <span className="ml-1">{employee.gender || 'N/A'}</span>
                                  </div>
                                  {employee.disability && employee.disability !== 'NONE' && (
                                    <div className="flex items-center text-orange-600">
                                      <span className="font-medium">Disability:</span>
                                      <span className="ml-1">{employee.disability}</span>
                                    </div>
                                  )}
                                </div>
                              </div>
                            </div>
                          </td>

                          {/* Position & Department */}
                          <td className="px-6 py-4">
                            <div className="space-y-1">
                              <div className="text-sm font-medium text-gray-900">
                                {employee.jobTitle || 'N/A'}
                              </div>
                              <div className="text-xs text-gray-600">
                                <div><strong>Dept:</strong> {employee.department || 'N/A'}</div>
                                <div><strong>Division:</strong> {employee.division || 'N/A'}</div>
                                <div><strong>Section:</strong> {employee.section || 'N/A'}</div>
                              </div>
                              <div className="flex space-x-1 mt-2">
                                <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${
                                  employee.empCategory === 'Administrative Staff' 
                                    ? 'text-blue-600 bg-blue-50'
                                    : employee.empCategory === 'Academic Staff'
                                    ? 'text-green-600 bg-green-50'
                                    : 'text-gray-600 bg-gray-50'
                                }`}>
                                  {employee.empCategory || 'N/A'}
                                </span>
                              </div>
                            </div>
                          </td>

                          {/* Contact & Location */}
                          <td className="px-6 py-4">
                            <div className="space-y-1 text-xs text-gray-600">
                              <div className="flex items-center">
                                <span className="font-medium">Phone:</span>
                                <span className="ml-1">{employee.phone || 'N/A'}</span>
                              </div>
                              <div className="flex items-center">
                                <span className="font-medium">Location:</span>
                                <span className="ml-1">{employee.location || 'N/A'}</span>
                              </div>
                              {employee.email && (
                                <div className="flex items-center">
                                  <span className="font-medium">Email:</span>
                                  <span className="ml-1 text-blue-600">{employee.email}</span>
                                </div>
                              )}
                            </div>
                          </td>

                          {/* Employment Info */}
                          <td className="px-6 py-4">
                            <div className="space-y-1 text-xs text-gray-600">
                              <div className="flex items-center">
                                <span className="font-medium">Category:</span>
                                <span className="ml-1">{employee.jobCategory || 'N/A'}</span>
                              </div>
                              {employee.createdAt && (
                                <div className="flex items-center">
                                  <span className="font-medium">Joined:</span>
                                  <span className="ml-1">
                                    {new Date(employee.createdAt.seconds * 1000).toLocaleDateString('en-US', {
                                      year: 'numeric',
                                      month: 'short',
                                      day: 'numeric'
                                    })}
                                  </span>
                                </div>
                              )}
                              <div className="flex items-center">
                                <span className="font-medium">Role:</span>
                                <span className="ml-1">{employee.role || 'Employee'}</span>
                              </div>
                            </div>
                          </td>

                          {/* Status & Actions */}
                          <td className="px-6 py-4">
                            <div className="space-y-2">
                              <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${
                                employee.isActive 
                                  ? 'text-green-600 bg-green-50' 
                                  : 'text-red-600 bg-red-50'
                              }`}>
                                {employee.isActive ? 'Active' : 'Inactive'}
                              </span>
                              
                              {employee.hasPassword && (
                                <div className="text-xs text-green-600 font-medium">
                                  ✓ Password Set
                                </div>
                              )}
                              
                              <div className="flex flex-col space-y-1">
                                <button className="text-blue-600 hover:text-blue-900 text-xs font-medium">
                                  View Details
                                </button>
                                <button className="text-gray-600 hover:text-gray-900 text-xs font-medium">
                                  Edit Info
                                </button>
                                <button className="text-red-600 hover:text-red-900 text-xs font-medium">
                                  {employee.isActive ? 'Deactivate' : 'Activate'}
                                </button>
                              </div>
                            </div>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* Locations Tab */}
        {activeTab === 'locations' && (
          <div className="space-y-6">
            {/* Locations Header */}
            <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <h2 className="text-xl font-semibold text-gray-900">Office Locations</h2>
                  <p className="text-sm text-gray-500 mt-1">
                    Manage geofenced work locations for attendance tracking
                  </p>
                </div>
                <div className="mt-4 sm:mt-0">
                  <button className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700">
                    <MapPin className="w-4 h-4 mr-2" />
                    Add Location
                  </button>
                </div>
              </div>
            </div>

            {/* Default Location Card */}
            <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
              <div className="flex items-start justify-between">
                <div className="flex items-start">
                  <div className="flex-shrink-0">
                    <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                      <MapPin className="w-6 h-6 text-blue-600" />
                    </div>
                  </div>
                  <div className="ml-4">
                    <h3 className="text-lg font-medium text-gray-900">Main Office</h3>
                    <p className="text-sm text-gray-500 mb-2">Company Headquarters</p>
                    <div className="space-y-1 text-sm text-gray-600">
                      <p><strong>Coordinates:</strong> -1.2921, 36.8219 (Nairobi)</p>
                      <p><strong>Radius:</strong> 200 meters</p>
                      <p><strong>Work Hours:</strong> 08:00 - 17:00</p>
                      <p><strong>Status:</strong> <span className="text-green-600 font-medium">Active</span></p>
                    </div>
                  </div>
                </div>
                <div className="flex space-x-2">
                  <button className="text-blue-600 hover:text-blue-900 text-sm font-medium">
                    Edit
                  </button>
                  <button className="text-red-600 hover:text-red-900 text-sm font-medium">
                    Disable
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}        {/* Settings Tab */}
        {activeTab === 'settings' && (
          <div className="space-y-6">
            {/* Settings Header */}
            <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
              <h2 className="text-xl font-semibold text-gray-900">System Settings</h2>
              <p className="text-sm text-gray-500 mt-1">
                Configure attendance system preferences and security settings
              </p>
            </div>

            {/* Security Settings */}
            <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Security Settings</h3>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="text-sm font-medium text-gray-900">Time Validation</h4>
                    <p className="text-sm text-gray-500">Validate device time against server time</p>
                  </div>
                  <button className="bg-green-100 relative inline-flex h-6 w-11 items-center rounded-full">
                    <span className="translate-x-6 inline-block h-4 w-4 transform rounded-full bg-green-600 transition"></span>
                  </button>
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="text-sm font-medium text-gray-900">Location Accuracy</h4>
                    <p className="text-sm text-gray-500">Require high GPS accuracy for attendance</p>
                  </div>
                  <button className="bg-green-100 relative inline-flex h-6 w-11 items-center rounded-full">
                    <span className="translate-x-6 inline-block h-4 w-4 transform rounded-full bg-green-600 transition"></span>
                  </button>
                </div>
              </div>
            </div>

            {/* Work Hours Settings */}
            <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Work Hours</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Work Start Time
                  </label>
                  <input
                    type="time"
                    defaultValue="08:00"
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Work End Time
                  </label>
                  <input
                    type="time"
                    defaultValue="17:00"
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
              </div>
              <button className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700">
                Save Changes
              </button>
            </div>
          </div>
        )}
      </main>
    </div>
  );
};

export default AdminPanel;