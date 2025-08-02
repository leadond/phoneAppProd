
import React, { useState, useEffect } from 'react';
import { localClient } from '../lib/localClient';
import { MicrosoftSidebar } from '../components/MicrosoftSidebar';
import { Header } from '../components/Header';
import { EnhancedPhoneNumbersTable } from '../components/EnhancedPhoneNumbersTable';
import { NumberRangeManager } from '../components/NumberRangeManager';
import { AnalyticsDashboard } from '../components/AnalyticsDashboard';
import { Reports } from '../components/Reports';
import { BulkOperationsManager } from '../components/BulkOperationsManager';
import { PBXSyncManager } from '../components/PBXSyncManager';
import { LoginModal } from '../components/LoginModal';
import { DashboardStats } from '../components/DashboardStats';
import { SkypeForBusinessManager } from '../components/SkypeForBusinessManager';
import { DatabaseDiagnostics } from '../components/DatabaseDiagnostics';
import { UCAdminTools } from '../components/uc/UCAdminTools';

const Index = () => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);
  const [currentView, setCurrentView] = useState('dashboard');
  const [loading, setLoading] = useState(true);

  // System Settings Form State
  const [settings, setSettings] = useState({
    organizationName: 'Your Company',
    defaultTimeZone: 'America/Chicago',
    numberFormat: 'XXX-XXX-XXXX',
    notifications: {
      emailNotifications: true,
      assignmentAlerts: true,
      systemMaintenance: false,
      weeklyReports: true
    }
  });
  const [settingsLoading, setSettingsLoading] = useState(false);
  const [settingsSaved, setSettingsSaved] = useState(false);

  // Check for existing session on component mount
  useEffect(() => {
    const checkSession = async () => {
      try {
        const { data } = await localClient.auth.getSession();
        if (data.session && data.user) {
          setIsAuthenticated(true);
          setCurrentUser(data.user);
        }
      } catch (error) {
        console.error('Error checking session:', error);
      } finally {
        setLoading(false);
      }
    };

    checkSession();
  }, []);

  const handleLogin = async (credentials: { email: string; password: string }) => {
    try {
      const { data, error } = await localClient.auth.signInWithPassword(credentials);
      
      if (error) {
        throw error;
      }

      if (data.user && data.session) {
        setIsAuthenticated(true);
        setCurrentUser(data.user);
      }
    } catch (error) {
      console.error('Login failed:', error);
      throw error;
    }
  };

  const handleLogout = async () => {
    try {
      await localClient.auth.signOut();
      setIsAuthenticated(false);
      setCurrentUser(null);
      setCurrentView('dashboard');
    } catch (error) {
      console.error('Logout failed:', error);
    }
  };

  // Settings Form Handlers
  const handleSettingsChange = (field: string, value: any) => {
    if (field.startsWith('notifications.')) {
      const notificationField = field.replace('notifications.', '');
      setSettings(prev => ({
        ...prev,
        notifications: {
          ...prev.notifications,
          [notificationField]: value
        }
      }));
    } else {
      setSettings(prev => ({
        ...prev,
        [field]: value
      }));
    }
    // Clear saved indicator when user makes changes
    setSettingsSaved(false);
  };

  const handleSaveSettings = async () => {
    setSettingsLoading(true);
    try {
      // Simulate API call to save settings
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // In production, this would make an actual API call:
      // await localClient.from('system_settings').upsert(settings);
      
      console.log('Settings saved:', settings);
      setSettingsSaved(true);
      
      // Clear saved indicator after 3 seconds
      setTimeout(() => setSettingsSaved(false), 3000);
    } catch (error) {
      console.error('Failed to save settings:', error);
      alert('Failed to save settings. Please try again.');
    } finally {
      setSettingsLoading(false);
    }
  };

  const validateSettings = () => {
    if (!settings.organizationName.trim()) {
      alert('Organization Name is required');
      return false;
    }
    return true;
  };

  const handleSubmitSettings = (e: React.FormEvent) => {
    e.preventDefault();
    if (validateSettings()) {
      handleSaveSettings();
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-500 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <LoginModal onLogin={handleLogin} />;
  }

  const renderContent = () => {
    switch (currentView) {
      case 'dashboard':
        return <DashboardStats onViewChange={setCurrentView} />;
      case 'numbers':
        return <EnhancedPhoneNumbersTable />;
      case 'ranges':
        return <NumberRangeManager />;
      case 'analytics':
        return <AnalyticsDashboard />;
      case 'bulk':
        return <BulkOperationsManager />;
      case 'reports':
        return <Reports />;
      case 'sync':
        return <PBXSyncManager />;
      case 'skype':
        return <SkypeForBusinessManager />;
      case 'uc-admin':
        return <UCAdminTools onViewChange={setCurrentView} />;
      case 'audit':
        return (
          <div className="space-y-6">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Audit Log</h1>
              <p className="text-gray-500 mt-1">Track all system activities and changes</p>
            </div>
            
            <div className="bg-white rounded-lg shadow-sm border border-gray-200">
              <div className="px-6 py-4 border-b border-gray-200">
                <h3 className="text-lg font-semibold text-gray-900">Recent Activities</h3>
              </div>
              <div className="divide-y divide-gray-200">
                {[{
                  action: 'System initialized successfully',
                  user: 'system',
                  time: 'Ready for data upload',
                  type: 'settings'
                }].map((activity, index) => (
                  <div key={index} className="px-6 py-4 flex justify-between items-center">
                    <div>
                      <p className="text-gray-900">{activity.action}</p>
                      <p className="text-sm text-gray-500">by {activity.user}</p>
                    </div>
                    <div className="text-right">
                      <span className={`inline-flex px-2 py-1 text-xs rounded-full ${
                        activity.type === 'assignment' ? 'bg-green-100 text-green-800' :
                        activity.type === 'import' ? 'bg-blue-100 text-blue-800' :
                        activity.type === 'release' ? 'bg-yellow-100 text-yellow-800' :
                        activity.type === 'settings' ? 'bg-purple-100 text-purple-800' :
                        'bg-gray-100 text-gray-800'
                      }`}>
                        {activity.type}
                      </span>
                      <p className="text-sm text-gray-500 mt-1">{activity.time}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        );
      case 'settings':
        return (
          <div className="space-y-6">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">System Settings</h1>
              <p className="text-gray-500 mt-1">Configure system preferences and options</p>
            </div>
            
            <form onSubmit={handleSubmitSettings} className="space-y-6">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="bg-white rounded-lg shadow-sm p-6 border border-gray-200">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">General Settings</h3>
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Organization Name <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        value={settings.organizationName}
                        onChange={(e) => handleSettingsChange('organizationName', e.target.value)}
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Default Time Zone</label>
                      <select
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        value={settings.defaultTimeZone}
                        onChange={(e) => handleSettingsChange('defaultTimeZone', e.target.value)}
                      >
                        <option value="America/Chicago">America/Chicago</option>
                        <option value="America/New_York">America/New_York</option>
                        <option value="America/Los_Angeles">America/Los_Angeles</option>
                        <option value="America/Denver">America/Denver</option>
                        <option value="UTC">UTC</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Number Format</label>
                      <select
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        value={settings.numberFormat}
                        onChange={(e) => handleSettingsChange('numberFormat', e.target.value)}
                      >
                        <option value="XXX-XXX-XXXX">XXX-XXX-XXXX</option>
                        <option value="(XXX) XXX-XXXX">(XXX) XXX-XXXX</option>
                        <option value="XXX.XXX.XXXX">XXX.XXX.XXXX</option>
                        <option value="+1-XXX-XXX-XXXX">+1-XXX-XXX-XXXX</option>
                      </select>
                    </div>
                  </div>
                </div>
                
                <div className="bg-white rounded-lg shadow-sm p-6 border border-gray-200">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">Notification Settings</h3>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium text-gray-700">Email Notifications</span>
                      <input
                        type="checkbox"
                        className="rounded focus:ring-2 focus:ring-blue-500"
                        checked={settings.notifications.emailNotifications}
                        onChange={(e) => handleSettingsChange('notifications.emailNotifications', e.target.checked)}
                      />
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium text-gray-700">Assignment Alerts</span>
                      <input
                        type="checkbox"
                        className="rounded focus:ring-2 focus:ring-blue-500"
                        checked={settings.notifications.assignmentAlerts}
                        onChange={(e) => handleSettingsChange('notifications.assignmentAlerts', e.target.checked)}
                      />
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium text-gray-700">System Maintenance</span>
                      <input
                        type="checkbox"
                        className="rounded focus:ring-2 focus:ring-blue-500"
                        checked={settings.notifications.systemMaintenance}
                        onChange={(e) => handleSettingsChange('notifications.systemMaintenance', e.target.checked)}
                      />
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium text-gray-700">Weekly Reports</span>
                      <input
                        type="checkbox"
                        className="rounded focus:ring-2 focus:ring-blue-500"
                        checked={settings.notifications.weeklyReports}
                        onChange={(e) => handleSettingsChange('notifications.weeklyReports', e.target.checked)}
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Submit Button and Status */}
              <div className="flex items-center justify-between bg-white rounded-lg shadow-sm p-4 border border-gray-200">
                <div className="flex items-center space-x-4">
                  {settingsSaved && (
                    <div className="flex items-center text-green-600">
                      <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                      Settings saved successfully!
                    </div>
                  )}
                  {settingsLoading && (
                    <div className="flex items-center text-blue-600">
                      <svg className="animate-spin -ml-1 mr-2 h-5 w-5" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Saving settings...
                    </div>
                  )}
                </div>
                <div className="flex space-x-3">
                  <button
                    type="button"
                    onClick={() => {
                      setSettings({
                        organizationName: 'Your Company',
                        defaultTimeZone: 'America/Chicago',
                        numberFormat: 'XXX-XXX-XXXX',
                        notifications: {
                          emailNotifications: true,
                          assignmentAlerts: true,
                          systemMaintenance: false,
                          weeklyReports: true
                        }
                      });
                    }}
                    className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                  >
                    Reset to Defaults
                  </button>
                  <button
                    type="submit"
                    disabled={settingsLoading}
                    className="px-6 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {settingsLoading ? 'Saving...' : 'Save Settings'}
                  </button>
                </div>
              </div>
            </form>
            
            <div className="bg-white rounded-lg shadow-sm p-6 border border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Data Management</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <button className="p-4 border-2 border-dashed border-gray-300 rounded-lg hover:border-blue-500 hover:bg-blue-50 transition-colors text-center">
                  <div className="text-blue-600 font-medium">Export All Data</div>
                  <div className="text-sm text-gray-500 mt-1">Download complete dataset</div>
                </button>
                <button className="p-4 border-2 border-dashed border-gray-300 rounded-lg hover:border-green-500 hover:bg-green-50 transition-colors text-center">
                  <div className="text-green-600 font-medium">Backup System</div>
                  <div className="text-sm text-gray-500 mt-1">Create system backup</div>
                </button>
                <button className="p-4 border-2 border-dashed border-gray-300 rounded-lg hover:border-purple-500 hover:bg-purple-50 transition-colors text-center">
                  <div className="text-purple-600 font-medium">Import Data</div>
                  <div className="text-sm text-gray-500 mt-1">Upload new dataset</div>
                </button>
              </div>
            </div>
          </div>
        );
      case 'diagnostics':
        return <DatabaseDiagnostics />;
      default:
        return <DashboardStats />;
    }
  };

  return (
    <div className="ms-layout flex">
      <MicrosoftSidebar currentView={currentView} onViewChange={setCurrentView} />
      <div className="flex-1 flex flex-col">
        <Header user={currentUser} onLogout={handleLogout} />
        <main className="ms-content flex-1">
          {renderContent()}
        </main>
      </div>
    </div>
  );
};

export default Index;
