import React from 'react';
import { Phone, Users, AlertCircle, CheckCircle, Upload } from 'lucide-react';

export const DashboardStats = () => {
  const stats = [
    {
      title: 'Total Numbers',
      value: '67,500',
      icon: Phone,
      color: 'bg-blue-500',
      change: '+1.2%',
    },
    {
      title: 'Assigned',
      value: '45,320',
      icon: Users,
      color: 'bg-green-500',
      change: '+2.3%',
    },
    {
      title: 'Available',
      value: '22,180',
      icon: CheckCircle,
      color: 'bg-yellow-500',
      change: '-0.8%',
    },
    {
      title: 'Issues',
      value: '12',
      icon: AlertCircle,
      color: 'bg-red-500',
      change: '-15.2%',
    },
  ];

  const recentActivity = [
    { action: 'Number 346-720-1234 assigned to John Doe', time: '2 minutes ago' },
    { action: 'Bulk upload completed: 500 numbers', time: '15 minutes ago' },
    { action: 'Number 346-725-5678 released from Mary Smith', time: '1 hour ago' },
    { action: 'System maintenance completed', time: '3 hours ago' },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
        <p className="text-gray-500 mt-1">Overview of phone number management system</p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((stat) => {
          const Icon = stat.icon;
          return (
            <div key={stat.title} className="bg-white rounded-lg shadow-sm p-6 border border-gray-200">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500">{stat.title}</p>
                  <p className="text-2xl font-bold text-gray-900 mt-1">{stat.value}</p>
                  <p className={`text-sm mt-1 ${
                    stat.change.startsWith('+') ? 'text-green-600' : 'text-red-600'
                  }`}>
                    {stat.change} from last month
                  </p>
                </div>
                <div className={`${stat.color} p-3 rounded-full`}>
                  <Icon className="w-6 h-6 text-white" />
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Recent Activity */}
      <div className="bg-white rounded-lg shadow-sm p-6 border border-gray-200">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Recent Activity</h2>
        <div className="space-y-3">
          {recentActivity.map((activity, index) => (
            <div key={index} className="flex justify-between items-center py-2 border-b border-gray-100 last:border-0">
              <p className="text-gray-700">{activity.action}</p>
              <span className="text-sm text-gray-500">{activity.time}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Quick Actions */}
      <div className="bg-white rounded-lg shadow-sm p-6 border border-gray-200">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Quick Actions</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <button className="p-4 border-2 border-dashed border-gray-300 rounded-lg hover:border-blue-500 hover:bg-blue-50 transition-colors text-center">
            <Upload className="w-8 h-8 text-gray-400 mx-auto mb-2" />
            <p className="text-sm text-gray-600">Upload CSV</p>
          </button>
          <button className="p-4 border-2 border-dashed border-gray-300 rounded-lg hover:border-blue-500 hover:bg-blue-50 transition-colors text-center">
            <Phone className="w-8 h-8 text-gray-400 mx-auto mb-2" />
            <p className="text-sm text-gray-600">Assign Number</p>
          </button>
          <button className="p-4 border-2 border-dashed border-gray-300 rounded-lg hover:border-blue-500 hover:bg-blue-50 transition-colors text-center">
            <CheckCircle className="w-8 h-8 text-gray-400 mx-auto mb-2" />
            <p className="text-sm text-gray-600">Release Number</p>
          </button>
        </div>
      </div>
    </div>
  );
};
