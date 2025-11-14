import React, { useState, useEffect, useCallback } from 'react';
import {
  Users,
  Search,
  Phone,
  RefreshCw,
  Filter,
  Download,
  AlertCircle,
  CheckCircle,
  Clock,
  Database,
  Wifi,
  WifiOff,
  User,
  PhoneCall,
  Mail,
  Building,
  MapPin,
  Crown,
  Activity,
  Link,
  Eye,
  Settings
} from 'lucide-react';
import { localAuth } from '../../lib/localAuth';

// API utility for SfB endpoints
const apiCall = async (endpoint: string, options: RequestInit = {}) => {
  const token = localAuth.getSessionToken();
  const headers = {
    'Content-Type': 'application/json',
    ...(token && { Authorization: `Bearer ${token}` }),
    ...options.headers
  };

  const response = await fetch(endpoint, {
    ...options,
    headers
  });

  const data = await response.json();
  return data;
};

interface SfBUser {
  id: string;
  sip_address: string;
  display_name: string;
  first_name?: string;
  last_name?: string;
  line_uri?: string;
  phone_number?: string;
  enterprise_voice_enabled: boolean;
  department?: string;
  title?: string;
  office?: string;
  enabled: boolean;
  registrar_pool?: string;
  data_source: 'offline' | 'online';
  last_sync_time: string;
  phoneCorrelations?: PhoneCorrelation[];
}

interface PhoneCorrelation {
  id: string;
  phone_number: string;
  correlation_type: 'automatic' | 'manual' | 'verified';
  confidence_score: number;
  verified_by?: string;
  notes?: string;
}

interface SfBStatistics {
  users: {
    total: number;
    enabled: number;
    voiceEnabled: number;
    withPhones: number;
    offline: number;
    online: number;
  };
  correlations: {
    total: number;
    automatic: number;
    manual: number;
    verified: number;
    avgConfidence: number;
  };
  files: {
    total: number;
    processed: number;
    failed: number;
    latestDate: string | null;
  };
}

interface SfBUserManagerProps {
  onStatusChange?: () => void;
}

export const SfBUserManager: React.FC<SfBUserManagerProps> = ({ onStatusChange }) => {
  const [currentView, setCurrentView] = useState<'search' | 'correlations' | 'monitor'>('search');
  const [users, setUsers] = useState<SfBUser[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [dataSource, setDataSource] = useState<'both' | 'offline' | 'online'>('both');
  const [filters, setFilters] = useState({
    enabled: null as boolean | null,
    voiceEnabled: null as boolean | null,
    department: ''
  });
  
  const [isLoading, setIsLoading] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const [statistics, setStatistics] = useState<SfBStatistics | null>(null);
  const [monitorStatus, setMonitorStatus] = useState<any>(null);
  const [correlations, setCorrelations] = useState<any[]>([]);
  
  const [selectedUser, setSelectedUser] = useState<SfBUser | null>(null);
  const [showUserDetails, setShowUserDetails] = useState(false);

  // Load initial data
  useEffect(() => {
    loadStatistics();
    loadMonitorStatus();
    if (searchQuery.trim()) {
      performSearch();
    }
  }, []);

  // Auto-search when query changes (debounced)
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      if (searchQuery.trim()) {
        performSearch();
      } else {
        setUsers([]);
      }
    }, 300);

    return () => clearTimeout(timeoutId);
  }, [searchQuery, dataSource, filters]);

  const loadStatistics = async () => {
    try {
      const response = await apiCall('/api/uc/sfb/statistics');
      if (response.success) {
        setStatistics(response.data);
      }
    } catch (error) {
      console.error('Failed to load SfB statistics:', error);
    }
  };

  const loadMonitorStatus = async () => {
    try {
      const response = await apiCall('/api/uc/sfb/monitor/status');
      if (response.success) {
        setMonitorStatus(response.data);
      }
    } catch (error) {
      console.error('Failed to load monitor status:', error);
    }
  };

  const loadCorrelations = async () => {
    try {
      setIsLoading(true);
      const response = await apiCall('/api/uc/sfb/correlations');
      if (response.success) {
        setCorrelations(response.data);
      }
    } catch (error) {
      console.error('Failed to load correlations:', error);
      setError('Failed to load phone correlations');
    } finally {
      setIsLoading(false);
    }
  };

  const performSearch = async () => {
    if (!searchQuery.trim()) {
      setUsers([]);
      return;
    }

    try {
      setIsSearching(true);
      setError(null);
      
      const params = new URLSearchParams({
        query: searchQuery,
        dataSource: dataSource,
        limit: '100'
      });

      if (filters.enabled !== null) {
        params.append('enabled', filters.enabled.toString());
      }
      if (filters.voiceEnabled !== null) {
        params.append('voiceEnabled', filters.voiceEnabled.toString());
      }

      const response = await apiCall(`/api/uc/sfb/users/search?${params}`);
      
      if (response.success) {
        setUsers(response.data);
      } else {
        setError(response.message || 'Search failed');
      }
    } catch (error) {
      console.error('Search failed:', error);
      setError('Failed to search SfB users');
    } finally {
      setIsSearching(false);
    }
  };

  const syncUsers = async () => {
    try {
      setIsSyncing(true);
      setError(null);
      
      const response = await apiCall('/api/uc/sfb/users/sync', {
        method: 'POST',
        body: JSON.stringify({ forceResync: true })
      });
      
      if (response.success) {
        await loadStatistics();
        await loadMonitorStatus();
        onStatusChange?.();
        
        // Refresh search if there's an active query
        if (searchQuery.trim()) {
          await performSearch();
        }
      } else {
        setError(response.message || 'Sync failed');
      }
    } catch (error) {
      console.error('Sync failed:', error);
      setError('Failed to sync SfB users');
    } finally {
      setIsSyncing(false);
    }
  };

  const startMonitoring = async () => {
    try {
      const response = await apiCall('/api/uc/sfb/monitor/start', {
        method: 'POST'
      });
      if (response.success) {
        await loadMonitorStatus();
        onStatusChange?.();
      }
    } catch (error) {
      console.error('Failed to start monitoring:', error);
      setError('Failed to start file monitoring');
    }
  };

  const stopMonitoring = async () => {
    try {
      const response = await apiCall('/api/uc/sfb/monitor/stop', {
        method: 'POST'
      });
      if (response.success) {
        await loadMonitorStatus();
        onStatusChange?.();
      }
    } catch (error) {
      console.error('Failed to stop monitoring:', error);
      setError('Failed to stop file monitoring');
    }
  };

  const viewUserDetails = async (user: SfBUser) => {
    try {
      const response = await apiCall(`/api/uc/sfb/users/${user.id}`);
      if (response.success) {
        setSelectedUser(response.data);
        setShowUserDetails(true);
      }
    } catch (error) {
      console.error('Failed to load user details:', error);
    }
  };

  const renderSearchView = () => (
    <div className="space-y-6">
      {/* Search Controls */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900 flex items-center">
            <Search className="w-5 h-5 mr-2" />
            SfB User Search
          </h3>
          <div className="flex items-center space-x-2">
            <div className="flex items-center">
              {dataSource === 'offline' && <Database className="w-4 h-4 text-blue-600 mr-1" />}
              {dataSource === 'online' && <Wifi className="w-4 h-4 text-green-600 mr-1" />}
              {dataSource === 'both' && <Activity className="w-4 h-4 text-purple-600 mr-1" />}
              <span className="text-sm text-gray-600 capitalize">{dataSource} Data</span>
            </div>
            <button
              onClick={syncUsers}
              disabled={isSyncing}
              className="inline-flex items-center px-3 py-1.5 bg-blue-600 text-white text-sm font-medium rounded-md hover:bg-blue-700 disabled:opacity-50"
            >
              <RefreshCw className={`w-4 h-4 mr-1 ${isSyncing ? 'animate-spin' : ''}`} />
              {isSyncing ? 'Syncing...' : 'Sync'}
            </button>
          </div>
        </div>

        {/* Search Input */}
        <div className="space-y-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by name, SIP address, phone number, or department..."
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
            {isSearching && (
              <RefreshCw className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4 animate-spin" />
            )}
          </div>

          {/* Filters */}
          <div className="flex flex-wrap gap-4">
            <select
              value={dataSource}
              onChange={(e) => setDataSource(e.target.value as 'both' | 'offline' | 'online')}
              className="px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-blue-500"
            >
              <option value="both">All Sources</option>
              <option value="offline">Offline Files</option>
              <option value="online">Online Database</option>
            </select>

            <select
              value={filters.enabled === null ? '' : filters.enabled.toString()}
              onChange={(e) => setFilters(prev => ({ 
                ...prev, 
                enabled: e.target.value === '' ? null : e.target.value === 'true' 
              }))}
              className="px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-blue-500"
            >
              <option value="">All Users</option>
              <option value="true">Enabled Only</option>
              <option value="false">Disabled Only</option>
            </select>

            <select
              value={filters.voiceEnabled === null ? '' : filters.voiceEnabled.toString()}
              onChange={(e) => setFilters(prev => ({ 
                ...prev, 
                voiceEnabled: e.target.value === '' ? null : e.target.value === 'true' 
              }))}
              className="px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-blue-500"
            >
              <option value="">All Voice Status</option>
              <option value="true">Voice Enabled</option>
              <option value="false">Voice Disabled</option>
            </select>
          </div>
        </div>
      </div>

      {/* Search Results */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex items-center">
            <AlertCircle className="w-5 h-5 text-red-600 mr-2" />
            <span className="text-red-800">{error}</span>
          </div>
        </div>
      )}

      {users.length > 0 && (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200">
          <div className="p-6 border-b border-gray-200">
            <div className="flex items-center justify-between">
              <h4 className="text-lg font-semibold text-gray-900">
                Search Results ({users.length})
              </h4>
              <button className="inline-flex items-center px-3 py-1.5 text-sm font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200">
                <Download className="w-4 h-4 mr-1" />
                Export
              </button>
            </div>
          </div>

          <div className="divide-y divide-gray-200">
            {users.map((user) => (
              <div key={user.id} className="p-6 hover:bg-gray-50">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center space-x-3 mb-2">
                      <div className="flex-shrink-0">
                        <User className="w-8 h-8 text-gray-400" />
                      </div>
                      <div>
                        <h5 className="text-lg font-semibold text-gray-900">
                          {user.display_name}
                        </h5>
                        <p className="text-sm text-gray-600">{user.sip_address}</p>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mt-3">
                      {user.phone_number && (
                        <div className="flex items-center text-sm text-gray-600">
                          <Phone className="w-4 h-4 mr-2" />
                          {user.phone_number}
                        </div>
                      )}
                      {user.department && (
                        <div className="flex items-center text-sm text-gray-600">
                          <Building className="w-4 h-4 mr-2" />
                          {user.department}
                        </div>
                      )}
                      {user.title && (
                        <div className="flex items-center text-sm text-gray-600">
                          <Crown className="w-4 h-4 mr-2" />
                          {user.title}
                        </div>
                      )}
                      {user.office && (
                        <div className="flex items-center text-sm text-gray-600">
                          <MapPin className="w-4 h-4 mr-2" />
                          {user.office}
                        </div>
                      )}
                    </div>

                    <div className="flex items-center space-x-4 mt-3">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        user.enabled 
                          ? 'bg-green-100 text-green-800' 
                          : 'bg-red-100 text-red-800'
                      }`}>
                        {user.enabled ? 'Enabled' : 'Disabled'}
                      </span>
                      
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        user.enterprise_voice_enabled 
                          ? 'bg-blue-100 text-blue-800' 
                          : 'bg-gray-100 text-gray-800'
                      }`}>
                        <PhoneCall className="w-3 h-3 mr-1" />
                        {user.enterprise_voice_enabled ? 'Voice Enabled' : 'Voice Disabled'}
                      </span>

                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        user.data_source === 'offline' 
                          ? 'bg-blue-100 text-blue-800' 
                          : 'bg-green-100 text-green-800'
                      }`}>
                        {user.data_source === 'offline' ? (
                          <Database className="w-3 h-3 mr-1" />
                        ) : (
                          <Wifi className="w-3 h-3 mr-1" />
                        )}
                        {user.data_source === 'offline' ? 'Offline' : 'Online'}
                      </span>

                      {user.phoneCorrelations && user.phoneCorrelations.length > 0 && (
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-800">
                          <Link className="w-3 h-3 mr-1" />
                          {user.phoneCorrelations.length} Correlation{user.phoneCorrelations.length !== 1 ? 's' : ''}
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center space-x-2">
                    <button
                      onClick={() => viewUserDetails(user)}
                      className="inline-flex items-center px-3 py-1.5 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
                    >
                      <Eye className="w-4 h-4 mr-1" />
                      Details
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {searchQuery.trim() && users.length === 0 && !isSearching && (
        <div className="bg-gray-50 rounded-lg p-8 text-center">
          <Users className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No users found</h3>
          <p className="text-gray-600">
            Try adjusting your search query or filters, or sync the latest data.
          </p>
        </div>
      )}
    </div>
  );

  const renderMonitorView = () => (
    <div className="space-y-6">
      {/* Monitor Status */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900 flex items-center">
            <Activity className="w-5 h-5 mr-2" />
            File Monitor Status
          </h3>
          <div className="flex items-center space-x-2">
            {monitorStatus?.monitor?.isMonitoring ? (
              <button
                onClick={stopMonitoring}
                className="inline-flex items-center px-3 py-1.5 bg-red-600 text-white text-sm font-medium rounded-md hover:bg-red-700"
              >
                <WifiOff className="w-4 h-4 mr-1" />
                Stop Monitoring
              </button>
            ) : (
              <button
                onClick={startMonitoring}
                className="inline-flex items-center px-3 py-1.5 bg-green-600 text-white text-sm font-medium rounded-md hover:bg-green-700"
              >
                <Wifi className="w-4 h-4 mr-1" />
                Start Monitoring
              </button>
            )}
          </div>
        </div>

        {monitorStatus && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="text-center">
              <div className={`text-2xl font-bold ${
                monitorStatus.monitor.isMonitoring ? 'text-green-600' : 'text-red-600'
              }`}>
                {monitorStatus.monitor.isMonitoring ? 'Running' : 'Stopped'}
              </div>
              <div className="text-sm text-gray-500">Monitor Status</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600">
                {monitorStatus.monitor.watchPath || 'Not Set'}
              </div>
              <div className="text-sm text-gray-500">Watch Path</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-purple-600">
                {Math.round((monitorStatus.monitor.checkInterval || 0) / 60000)}m
              </div>
              <div className="text-sm text-gray-500">Check Interval</div>
            </div>
          </div>
        )}
      </div>

      {/* Statistics */}
      {statistics && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
            <div className="flex items-center">
              <Users className="w-8 h-8 text-blue-600" />
              <div className="ml-3">
                <p className="text-sm font-medium text-gray-500">Total Users</p>
                <p className="text-2xl font-bold text-gray-900">{statistics.users.total}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
            <div className="flex items-center">
              <PhoneCall className="w-8 h-8 text-green-600" />
              <div className="ml-3">
                <p className="text-sm font-medium text-gray-500">Voice Enabled</p>
                <p className="text-2xl font-bold text-gray-900">{statistics.users.voiceEnabled}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
            <div className="flex items-center">
              <Link className="w-8 h-8 text-purple-600" />
              <div className="ml-3">
                <p className="text-sm font-medium text-gray-500">Correlations</p>
                <p className="text-2xl font-bold text-gray-900">{statistics.correlations.total}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
            <div className="flex items-center">
              <Database className="w-8 h-8 text-orange-600" />
              <div className="ml-3">
                <p className="text-sm font-medium text-gray-500">Files Processed</p>
                <p className="text-2xl font-bold text-gray-900">{statistics.files.processed}</p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );

  const menuItems = [
    {
      id: 'search',
      label: 'User Search',
      icon: Search,
      description: 'Search and browse SfB users'
    },
    {
      id: 'correlations',
      label: 'Phone Correlations',
      icon: Link,
      description: 'Manage phone number correlations'
    },
    {
      id: 'monitor',
      label: 'File Monitor',
      icon: Activity,
      description: 'Monitor and sync SfB files'
    }
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 flex items-center">
              <Users className="w-8 h-8 mr-3 text-blue-600" />
              Skype for Business User Management
            </h1>
            <p className="text-gray-500 mt-1">
              Search, correlate, and manage SfB users with phone number integration
            </p>
          </div>
          
          <div className="flex items-center space-x-4">
            <div className="text-right">
              <div className="flex items-center text-sm text-gray-600">
                <Database className="w-4 h-4 mr-1" />
                Data Sources
              </div>
              <div className="flex items-center mt-1 space-x-2">
                <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                  <Database className="w-3 h-3 mr-1" />
                  Offline
                </span>
                <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                  <Wifi className="w-3 h-3 mr-1" />
                  Online (Coming Soon)
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200">
        <div className="border-b border-gray-200">
          <nav className="flex space-x-8 px-6" aria-label="SfB User Management Navigation">
            {menuItems.map((item) => {
              const Icon = item.icon;
              const isActive = currentView === item.id;
              
              return (
                <button
                  key={item.id}
                  onClick={() => {
                    setCurrentView(item.id as any);
                    if (item.id === 'correlations' && correlations.length === 0) {
                      loadCorrelations();
                    }
                  }}
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
                <p className="mt-4 text-gray-600">Loading SfB User Management...</p>
              </div>
            </div>
          ) : (
            <>
              {currentView === 'search' && renderSearchView()}
              {currentView === 'monitor' && renderMonitorView()}
              {currentView === 'correlations' && (
                <div className="text-center py-12">
                  <Link className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">Phone Correlations</h3>
                  <p className="text-gray-600">
                    Coming soon - manage phone number correlations between SfB users and phone numbers.
                  </p>
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* User Details Modal */}
      {showUserDetails && selectedUser && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-gray-900">User Details</h3>
                <button
                  onClick={() => setShowUserDetails(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  ✕
                </button>
              </div>
            </div>
            <div className="p-6">
              <div className="space-y-4">
                <div className="flex items-center space-x-3">
                  <User className="w-8 h-8 text-gray-400" />
                  <div>
                    <h4 className="text-xl font-semibold text-gray-900">{selectedUser.display_name}</h4>
                    <p className="text-gray-600">{selectedUser.sip_address}</p>
                  </div>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {selectedUser.phone_number && (
                    <div className="flex items-center text-sm">
                      <Phone className="w-4 h-4 mr-2 text-gray-400" />
                      <span className="font-medium">Phone:</span>
                      <span className="ml-2">{selectedUser.phone_number}</span>
                    </div>
                  )}
                  {selectedUser.department && (
                    <div className="flex items-center text-sm">
                      <Building className="w-4 h-4 mr-2 text-gray-400" />
                      <span className="font-medium">Department:</span>
                      <span className="ml-2">{selectedUser.department}</span>
                    </div>
                  )}
                  {selectedUser.title && (
                    <div className="flex items-center text-sm">
                      <Crown className="w-4 h-4 mr-2 text-gray-400" />
                      <span className="font-medium">Title:</span>
                      <span className="ml-2">{selectedUser.title}</span>
                    </div>
                  )}
                  {selectedUser.office && (
                    <div className="flex items-center text-sm">
                      <MapPin className="w-4 h-4 mr-2 text-gray-400" />
                      <span className="font-medium">Office:</span>
                      <span className="ml-2">{selectedUser.office}</span>
                    </div>
                  )}
                </div>

                {selectedUser.phoneCorrelations && selectedUser.phoneCorrelations.length > 0 && (
                  <div>
                    <h5 className="font-medium text-gray-900 mb-2">Phone Number Correlations</h5>
                    <div className="space-y-2">
                      {selectedUser.phoneCorrelations.map((correlation) => (
                        <div key={correlation.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-md">
                          <div className="flex items-center">
                            <Phone className="w-4 h-4 mr-2 text-gray-400" />
                            <span>{correlation.phone_number}</span>
                          </div>
                          <div className="flex items-center space-x-2">
                            <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                              correlation.correlation_type === 'verified' ? 'bg-green-100 text-green-800' :
                              correlation.correlation_type === 'manual' ? 'bg-blue-100 text-blue-800' :
                              'bg-gray-100 text-gray-800'
                            }`}>
                              {correlation.correlation_type}
                            </span>
                            <span className="text-xs text-gray-500">
                              {Math.round(correlation.confidence_score * 100)}%
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};