import React, { useState, useEffect } from 'react';
import { Phone, Users, AlertCircle, CheckCircle, Upload } from 'lucide-react';
import { dataService } from '../services/dataService';

interface DashboardStatsProps {
  onViewChange?: (view: string) => void;
}

export const DashboardStats: React.FC<DashboardStatsProps> = ({ onViewChange }) => {
  const [stats, setStats] = useState([
    {
      title: 'Total Numbers',
      value: '0',
      icon: Phone,
      color: 'bg-blue-500',
      change: '+0%',
    },
    {
      title: 'Assigned',
      value: '0',
      icon: Users,
      color: 'bg-green-500',
      change: '+0%',
    },
    {
      title: 'Available',
      value: '0',
      icon: CheckCircle,
      color: 'bg-yellow-500',
      change: '+0%',
    },
    {
      title: 'Aging Numbers',
      value: '0',
      icon: AlertCircle,
      color: 'bg-red-500',
      change: '+0%',
    },
  ]);

  const [recentActivity, setRecentActivity] = useState<Array<{ action: string; time: string }>>([]);
  const [loading, setLoading] = useState(true);

  const loadData = async () => {
    try {
      setLoading(true);
      const statistics = await dataService.getStatistics();
      const auditLog = await dataService.getAuditLog();
      
      setStats([
        {
          title: 'Total Numbers',
          value: statistics.totalNumbers.toLocaleString(),
          icon: Phone,
          color: 'bg-blue-500',
          change: '+0%', // TODO: Calculate from historical data
        },
        {
          title: 'Assigned',
          value: statistics.assignedNumbers.toLocaleString(),
          icon: Users,
          color: 'bg-green-500',
          change: '+0%',
        },
        {
          title: 'Available',
          value: statistics.availableNumbers.toLocaleString(),
          icon: CheckCircle,
          color: 'bg-yellow-500',
          change: '+0%',
        },
        {
          title: 'Aging Numbers',
          value: statistics.agingNumbers.toString(),
          icon: AlertCircle,
          color: 'bg-red-500',
          change: '+0%',
        },
      ]);

      // Get recent activity from audit log
      const recentEntries = auditLog.slice(0, 5).map(entry => ({
        action: entry.action,
        time: getRelativeTime(entry.timestamp)
      }));
      
      setRecentActivity(recentEntries.length > 0 ? recentEntries : [
        { action: 'System initialized successfully', time: 'Ready for data upload' }
      ]);
    } catch (error) {
      console.error('Failed to load dashboard data:', error);
      // Set default values on error
      setStats(prevStats => prevStats.map(stat => ({ ...stat, value: 'Error' })));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
    
    // Set up real-time updates - refresh every 30 seconds
    const interval = setInterval(loadData, 30000);
    
    return () => clearInterval(interval);
  }, []);

  // Add a manual refresh function for immediate updates
  const handleRefresh = () => {
    loadData();
  };

  const getRelativeTime = (timestamp: string): string => {
    const now = new Date();
    const time = new Date(timestamp);
    const diffInMinutes = Math.floor((now.getTime() - time.getTime()) / (1000 * 60));
    
    if (diffInMinutes < 1) return 'Just now';
    if (diffInMinutes < 60) return `${diffInMinutes} minutes ago`;
    if (diffInMinutes < 1440) return `${Math.floor(diffInMinutes / 60)} hours ago`;
    return `${Math.floor(diffInMinutes / 1440)} days ago`;
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
          <p className="text-gray-500 mt-1">Overview of phone number management system</p>
        </div>
        <button
          onClick={handleRefresh}
          disabled={loading}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
        >
          {loading ? (
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
          ) : (
            <Upload className="w-4 h-4" />
          )}
          {loading ? 'Refreshing...' : 'Refresh Data'}
        </button>
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
                  <p className="text-2xl font-bold text-gray-900 mt-1">
                    {loading ? (
                      <div className="animate-pulse bg-gray-200 h-8 w-16 rounded"></div>
                    ) : (
                      stat.value
                    )}
                  </p>
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
          <button
            onClick={() => onViewChange?.('bulk')}
            className="p-4 border-2 border-dashed border-gray-300 rounded-lg hover:border-blue-500 hover:bg-blue-50 transition-colors text-center"
          >
            <Upload className="w-8 h-8 text-gray-400 mx-auto mb-2" />
            <p className="text-sm text-gray-600">Upload CSV</p>
          </button>
          <button
            onClick={() => onViewChange?.('numbers')}
            className="p-4 border-2 border-dashed border-gray-300 rounded-lg hover:border-blue-500 hover:bg-blue-50 transition-colors text-center"
          >
            <Phone className="w-8 h-8 text-gray-400 mx-auto mb-2" />
            <p className="text-sm text-gray-600">Assign Number</p>
          </button>
          <button
            onClick={() => onViewChange?.('numbers')}
            className="p-4 border-2 border-dashed border-gray-300 rounded-lg hover:border-blue-500 hover:bg-blue-50 transition-colors text-center"
          >
            <CheckCircle className="w-8 h-8 text-gray-400 mx-auto mb-2" />
            <p className="text-sm text-gray-600">Release Number</p>
          </button>
        </div>
      </div>
    </div>
  );
};
