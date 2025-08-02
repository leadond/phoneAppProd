import React from 'react';
import { 
  Activity, 
  Settings, 
  Network, 
  FileText, 
  Clock, 
  TrendingUp,
  Server,
  Globe,
  Shield,
  CheckCircle,
  AlertTriangle
} from 'lucide-react';

interface SystemStatus {
  configFiles: number;
  lastConfigUpdate: string | null;
  networkChecksToday: number;
  systemHealth: string;
}

interface UCDashboardProps {
  systemStatus: SystemStatus;
  onViewChange: (view: string) => void;
}

export const UCDashboard: React.FC<UCDashboardProps> = ({ systemStatus, onViewChange }) => {
  const quickActions = [
    {
      id: 'configuration',
      title: 'Configuration Manager',
      description: 'Manage UC configuration files and settings',
      icon: Settings,
      color: 'blue',
      action: () => onViewChange('configuration')
    },
    {
      id: 'network-tools',
      title: 'Network Tools',
      description: 'DNS lookup, port checker, and network diagnostics',
      icon: Network,
      color: 'green',
      action: () => onViewChange('network-tools')
    },
    {
      id: 'reports',
      title: 'System Reports',
      description: 'View audit logs and system reports',
      icon: FileText,
      color: 'purple',
      action: () => console.log('Reports coming soon')
    }
  ];

  const recentActivities = [
    {
      id: 1,
      action: 'Configuration file updated',
      details: 'uc_config.xml modified',
      timestamp: '2 hours ago',
      type: 'config',
      status: 'success'
    },
    {
      id: 2,
      action: 'Network connectivity test',
      details: 'Port check: pool1.contoso.com:5061',
      timestamp: '4 hours ago',
      type: 'network',
      status: 'success'
    },
    {
      id: 3,
      action: 'DNS lookup performed',
      details: 'A record: meet.contoso.com',
      timestamp: '6 hours ago',
      type: 'network',
      status: 'success'
    },
    {
      id: 4,
      action: 'System health check',
      details: 'All services running normally',
      timestamp: '1 day ago',
      type: 'system',
      status: 'success'
    }
  ];

  const systemMetrics = [
    {
      title: 'UC Services',
      value: '12',
      subtitle: 'Active services',
      icon: Server,
      color: 'blue'
    },
    {
      title: 'SIP Domains',
      value: '3',
      subtitle: 'Configured domains',
      icon: Globe,
      color: 'green'
    },
    {
      title: 'Front End Servers',
      value: '6',
      subtitle: 'Pool members',
      icon: Network,
      color: 'purple'
    },
    {
      title: 'Uptime',
      value: '99.9%',
      subtitle: 'Last 30 days',
      icon: TrendingUp,
      color: 'orange'
    }
  ];

  return (
    <div className="space-y-6">
      {/* Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {systemMetrics.map((metric) => {
          const Icon = metric.icon;
          return (
            <div key={metric.title} className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <div className="flex items-center">
                <div className={`flex items-center justify-center w-12 h-12 rounded-lg bg-${metric.color}-100`}>
                  <Icon className={`w-6 h-6 text-${metric.color}-600`} />
                </div>
                <div className="ml-4">
                  <p className="text-2xl font-bold text-gray-900">{metric.value}</p>
                  <p className="text-sm text-gray-500">{metric.subtitle}</p>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Quick Actions */}
      <div>
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Quick Actions</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {quickActions.map((action) => {
            const Icon = action.icon;
            return (
              <button
                key={action.id}
                onClick={action.action}
                className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 text-left hover:shadow-md transition-shadow group"
              >
                <div className="flex items-center mb-3">
                  <div className={`flex items-center justify-center w-10 h-10 rounded-lg bg-${action.color}-100 group-hover:bg-${action.color}-200 transition-colors`}>
                    <Icon className={`w-5 h-5 text-${action.color}-600`} />
                  </div>
                  <h4 className="ml-3 text-lg font-semibold text-gray-900">{action.title}</h4>
                </div>
                <p className="text-gray-600">{action.description}</p>
              </button>
            );
          })}
        </div>
      </div>

      {/* System Status & Recent Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* System Status */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900">System Status</h3>
            <div className="flex items-center">
              <CheckCircle className="w-5 h-5 text-green-500 mr-2" />
              <span className="text-sm text-green-600 font-medium">All Systems Operational</span>
            </div>
          </div>
          
          <div className="space-y-4">
            <div className="flex items-center justify-between py-2">
              <div className="flex items-center">
                <Settings className="w-4 h-4 text-gray-400 mr-3" />
                <span className="text-sm text-gray-700">Configuration Service</span>
              </div>
              <span className="text-xs px-2 py-1 bg-green-100 text-green-800 rounded-full">Running</span>
            </div>
            
            <div className="flex items-center justify-between py-2">
              <div className="flex items-center">
                <Network className="w-4 h-4 text-gray-400 mr-3" />
                <span className="text-sm text-gray-700">Network Tools</span>
              </div>
              <span className="text-xs px-2 py-1 bg-green-100 text-green-800 rounded-full">Running</span>
            </div>
            
            <div className="flex items-center justify-between py-2">
              <div className="flex items-center">
                <Shield className="w-4 h-4 text-gray-400 mr-3" />
                <span className="text-sm text-gray-700">Security Services</span>
              </div>
              <span className="text-xs px-2 py-1 bg-green-100 text-green-800 rounded-full">Running</span>
            </div>
            
            <div className="flex items-center justify-between py-2">
              <div className="flex items-center">
                <Activity className="w-4 h-4 text-gray-400 mr-3" />
                <span className="text-sm text-gray-700">Monitoring</span>
              </div>
              <span className="text-xs px-2 py-1 bg-green-100 text-green-800 rounded-full">Active</span>
            </div>
          </div>
        </div>

        {/* Recent Activity */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Recent Activity</h3>
          <div className="space-y-4">
            {recentActivities.map((activity) => (
              <div key={activity.id} className="flex items-start space-x-3">
                <div className={`flex items-center justify-center w-8 h-8 rounded-full ${
                  activity.status === 'success' ? 'bg-green-100' : 'bg-red-100'
                } flex-shrink-0`}>
                  {activity.status === 'success' ? (
                    <CheckCircle className="w-4 h-4 text-green-600" />
                  ) : (
                    <AlertTriangle className="w-4 h-4 text-red-600" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900">{activity.action}</p>
                  <p className="text-sm text-gray-500">{activity.details}</p>
                  <div className="flex items-center mt-1">
                    <Clock className="w-3 h-3 text-gray-400 mr-1" />
                    <span className="text-xs text-gray-400">{activity.timestamp}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Configuration Summary */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Configuration Summary</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="text-center">
            <div className="text-2xl font-bold text-blue-600">
              {systemStatus.configFiles}
            </div>
            <div className="text-sm text-gray-500">Configuration Files</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-green-600">
              {systemStatus.networkChecksToday}
            </div>
            <div className="text-sm text-gray-500">Network Checks Today</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-purple-600">
              {systemStatus.lastConfigUpdate 
                ? new Date(systemStatus.lastConfigUpdate).toLocaleDateString()
                : 'Never'
              }
            </div>
            <div className="text-sm text-gray-500">Last Configuration Update</div>
          </div>
        </div>
      </div>
    </div>
  );
};