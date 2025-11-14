import React, { useState, useEffect } from 'react';
import {
  Settings,
  Network,
  FileText,
  Server,
  Shield,
  Globe,
  CheckCircle,
  AlertCircle,
  Clock,
  Database,
  Users
} from 'lucide-react';
import { UCConfigurationManager } from './UCConfigurationManager';
import { UCNetworkTools } from './UCNetworkTools';
import { UCDashboard } from './UCDashboard';
import { SfBUserManager } from './SfBUserManager';
import { browserDatabase } from '../../lib/browserDatabase';

interface UCAdminToolsProps {
  onViewChange?: (view: string) => void;
}

export const UCAdminTools: React.FC<UCAdminToolsProps> = ({ onViewChange }) => {
  const [currentView, setCurrentView] = useState('dashboard');
  const [isLoading, setIsLoading] = useState(false);
  
  // System status data
  const [systemStatus, setSystemStatus] = useState({
    configFiles: 0,
    lastConfigUpdate: null,
    networkChecksToday: 0,
    systemHealth: 'healthy'
  });

  useEffect(() => {
    loadSystemStatus();
  }, []);

  const loadSystemStatus = async () => {
    setIsLoading(true);
    try {
      // Load system status from IndexedDB
      const ucStatus = await browserDatabase.getUCSystemStatus();
      const configFiles = await browserDatabase.getAllUCConfigFiles();
      const networkTests = await browserDatabase.getAllUCNetworkTests(10);
      
      setSystemStatus(prev => ({
        ...prev,
        configFiles: configFiles.length,
        lastConfigUpdate: configFiles[0]?.updated_at || null,
        networkChecksToday: networkTests.filter(test => {
          const today = new Date().toDateString();
          return new Date(test.created_at).toDateString() === today;
        }).length,
        systemHealth: ucStatus.configurationService.status === 'Running' &&
                     ucStatus.networkTools.status === 'Running' ? 'healthy' : 'error'
      }));
    } catch (error) {
      console.error('Failed to load system status:', error);
      setSystemStatus(prev => ({
        ...prev,
        systemHealth: 'error'
      }));
    } finally {
      setIsLoading(false);
    }
  };

  const handleViewChange = (view: string) => {
    setCurrentView(view);
    onViewChange?.(view);
  };

  const renderContent = () => {
    switch (currentView) {
      case 'configuration':
        return <div className="text-center py-12"><p className="text-gray-600">Configuration Manager - Coming Soon</p></div>;
      case 'network-tools':
        return <div className="text-center py-12"><p className="text-gray-600">Network Tools - Coming Soon</p></div>;
      case 'sfb-users':
        return <SfBUserManager onStatusChange={loadSystemStatus} />;
      case 'dashboard':
      default:
        return <UCDashboard systemStatus={systemStatus} onViewChange={handleViewChange} />;
    }
  };

  const menuItems = [
    {
      id: 'dashboard',
      label: 'UC Dashboard',
      icon: Database,
      description: 'Overview and system status'
    },
    {
      id: 'sfb-users',
      label: 'Skype for Business',
      icon: Users,
      description: 'SfB user management and phone correlations'
    },
    {
      id: 'configuration',
      label: 'Configuration Manager',
      icon: Settings,
      description: 'Manage UC configuration files'
    },
    {
      id: 'network-tools',
      label: 'Network Tools',
      icon: Network,
      description: 'DNS lookup, port checker, diagnostics'
    }
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 flex items-center">
              <Server className="w-8 h-8 mr-3 text-blue-600" />
              UC Admin Tools
            </h1>
            <p className="text-gray-500 mt-1">
              Unified Communications Administration & Network Diagnostics
            </p>
          </div>
          
          <div className="flex items-center space-x-4">
            <div className="text-right">
              <div className="flex items-center text-sm text-gray-600">
                <Shield className="w-4 h-4 mr-1" />
                System Status
              </div>
              <div className={`flex items-center mt-1 ${
                systemStatus.systemHealth === 'healthy' ? 'text-green-600' : 'text-red-600'
              }`}>
                {systemStatus.systemHealth === 'healthy' ? (
                  <CheckCircle className="w-4 h-4 mr-1" />
                ) : (
                  <AlertCircle className="w-4 h-4 mr-1" />
                )}
                <span className="text-sm font-medium capitalize">
                  {systemStatus.systemHealth}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200">
        <div className="border-b border-gray-200">
          <nav className="flex space-x-8 px-6" aria-label="UC Admin Tools Navigation">
            {menuItems.map((item) => {
              const Icon = item.icon;
              const isActive = currentView === item.id;
              
              return (
                <button
                  key={item.id}
                  onClick={() => handleViewChange(item.id)}
                  className={`
                    flex items-center py-4 px-1 border-b-2 font-medium text-sm transition-colors
                    ${isActive
                      ? 'border-blue-500 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                    }
                  `}
                >
                  <Icon className="w-5 h-5 mr-2" />
                  {item.label}
                </button>
              );
            })}
          </nav>
        </div>

        {/* Content Area */}
        <div className="p-6">
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <div className="text-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto"></div>
                <p className="mt-4 text-gray-600">Loading UC Admin Tools...</p>
              </div>
            </div>
          ) : (
            renderContent()
          )}
        </div>
      </div>

      {/* Quick Stats Footer */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
          <div className="flex items-center">
            <FileText className="w-8 h-8 text-blue-600" />
            <div className="ml-3">
              <p className="text-sm font-medium text-gray-500">Config Files</p>
              <p className="text-2xl font-bold text-gray-900">{systemStatus.configFiles}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
          <div className="flex items-center">
            <Globe className="w-8 h-8 text-green-600" />
            <div className="ml-3">
              <p className="text-sm font-medium text-gray-500">Network Checks</p>
              <p className="text-2xl font-bold text-gray-900">{systemStatus.networkChecksToday}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
          <div className="flex items-center">
            <Clock className="w-8 h-8 text-orange-600" />
            <div className="ml-3">
              <p className="text-sm font-medium text-gray-500">Last Update</p>
              <p className="text-sm font-bold text-gray-900">
                {systemStatus.lastConfigUpdate 
                  ? new Date(systemStatus.lastConfigUpdate).toLocaleDateString()
                  : 'Never'
                }
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
          <div className="flex items-center">
            <Shield className={`w-8 h-8 ${
              systemStatus.systemHealth === 'healthy' ? 'text-green-600' : 'text-red-600'
            }`} />
            <div className="ml-3">
              <p className="text-sm font-medium text-gray-500">System Health</p>
              <p className={`text-sm font-bold capitalize ${
                systemStatus.systemHealth === 'healthy' ? 'text-green-600' : 'text-red-600'
              }`}>
                {systemStatus.systemHealth}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};