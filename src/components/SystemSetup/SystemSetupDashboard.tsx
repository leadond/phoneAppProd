import React, { useState, useEffect } from 'react';
import { 
  Settings, 
  Shield, 
  Database, 
  Network, 
  Activity, 
  AlertTriangle, 
  CheckCircle, 
  Clock,
  Users,
  Server,
  Eye,
  Lock
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Progress } from '@/components/ui/progress';
import { useAdminChallenge } from '../AdminChallengeModal';
import { enhancedAuth, Permission, ElevatedSession } from '@/lib/enhancedAuth';
import { localAuth } from '@/lib/localAuth';

interface SystemStatus {
  overall: 'healthy' | 'warning' | 'critical';
  services: {
    database: 'online' | 'offline' | 'error';
    authentication: 'active' | 'inactive' | 'error';
    encryption: 'enabled' | 'disabled' | 'error';
    audit: 'logging' | 'paused' | 'error';
  };
  metrics: {
    uptime: string;
    totalConfigurations: number;
    activeSessions: number;
    securityEvents: number;
  };
}

interface AccessControlState {
  isAuthorized: boolean;
  elevatedSession: ElevatedSession | null;
  sessionTimeRemaining: number;
  loading: boolean;
  error: string;
}

export const SystemSetupDashboard: React.FC = () => {
  const [activeTab, setActiveTab] = useState('overview');
  const [systemStatus, setSystemStatus] = useState<SystemStatus>({
    overall: 'healthy',
    services: {
      database: 'online',
      authentication: 'active',
      encryption: 'enabled',
      audit: 'logging'
    },
    metrics: {
      uptime: '2d 14h 32m',
      totalConfigurations: 0,
      activeSessions: 0,
      securityEvents: 0
    }
  });

  const [accessControl, setAccessControl] = useState<AccessControlState>({
    isAuthorized: false,
    elevatedSession: null,
    sessionTimeRemaining: 0,
    loading: false,
    error: ''
  });

  const { requestElevatedAccess, AdminChallengeModal } = useAdminChallenge();

  // Check if user has basic admin privileges
  useEffect(() => {
    checkAdminStatus();
    loadSystemStatus();
  }, []);

  // Session timer for elevated access
  useEffect(() => {
    let timer: NodeJS.Timeout;
    
    if (accessControl.elevatedSession && accessControl.isAuthorized) {
      timer = setInterval(() => {
        const session = enhancedAuth.getCurrentElevatedSession();
        if (session) {
          const remaining = new Date(session.expiresAt).getTime() - new Date().getTime();
          if (remaining > 0) {
            setAccessControl(prev => ({
              ...prev,
              sessionTimeRemaining: Math.floor(remaining / 1000)
            }));
          } else {
            // Session expired
            setAccessControl(prev => ({
              ...prev,
              isAuthorized: false,
              elevatedSession: null,
              sessionTimeRemaining: 0
            }));
          }
        }
      }, 1000);
    }

    return () => {
      if (timer) clearInterval(timer);
    };
  }, [accessControl.elevatedSession, accessControl.isAuthorized]);

  const checkAdminStatus = async () => {
    try {
      const isAdmin = await enhancedAuth.isUserAdmin();
      if (!isAdmin) {
        setAccessControl(prev => ({
          ...prev,
          error: 'Administrative privileges required to access system setup'
        }));
      }
    } catch (error) {
      console.error('Failed to check admin status:', error);
    }
  };

  const loadSystemStatus = async () => {
    try {
      // In production, this would load real system metrics
      // For now, we'll simulate the data
      setSystemStatus(prev => ({
        ...prev,
        metrics: {
          uptime: '2d 14h 32m',
          totalConfigurations: 3,
          activeSessions: 1,
          securityEvents: 12
        }
      }));
    } catch (error) {
      console.error('Failed to load system status:', error);
    }
  };

  const requestSystemAccess = async (requiredPermissions: Permission[]) => {
    try {
      setAccessControl(prev => ({ ...prev, loading: true, error: '' }));
      
      const session = await requestElevatedAccess(requiredPermissions);
      
      setAccessControl(prev => ({
        ...prev,
        isAuthorized: true,
        elevatedSession: session,
        loading: false,
        sessionTimeRemaining: 15 * 60 // 15 minutes in seconds
      }));
    } catch (error) {
      setAccessControl(prev => ({
        ...prev,
        error: error.message,
        loading: false
      }));
    }
  };

  const revokeAccess = async () => {
    try {
      await enhancedAuth.revokeElevatedAccess();
      setAccessControl({
        isAuthorized: false,
        elevatedSession: null,
        sessionTimeRemaining: 0,
        loading: false,
        error: ''
      });
    } catch (error) {
      console.error('Failed to revoke access:', error);
    }
  };

  const formatTimeRemaining = (seconds: number): string => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'healthy':
      case 'online':
      case 'active':
      case 'enabled':
      case 'logging':
        return <CheckCircle className="w-4 h-4 text-green-500" />;
      case 'warning':
        return <AlertTriangle className="w-4 h-4 text-yellow-500" />;
      case 'critical':
      case 'offline':
      case 'error':
        return <AlertTriangle className="w-4 h-4 text-red-500" />;
      default:
        return <Clock className="w-4 h-4 text-gray-500" />;
    }
  };

  const getStatusColor = (status: string): string => {
    switch (status) {
      case 'healthy':
      case 'online':
      case 'active':
      case 'enabled':
      case 'logging':
        return 'bg-green-100 text-green-800';
      case 'warning':
        return 'bg-yellow-100 text-yellow-800';
      case 'critical':
      case 'offline':
      case 'error':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const renderAccessControl = () => {
    if (accessControl.isAuthorized && accessControl.elevatedSession) {
      return (
        <Card className="border-green-200 bg-green-50">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <Shield className="w-5 h-5 text-green-600" />
                <div>
                  <div className="font-medium text-green-800">Elevated Access Active</div>
                  <div className="text-sm text-green-600">
                    Role: {accessControl.elevatedSession.role.description}
                  </div>
                </div>
              </div>
              <div className="text-right">
                <div className="text-sm font-mono text-green-700">
                  {formatTimeRemaining(accessControl.sessionTimeRemaining)}
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={revokeAccess}
                  className="mt-1"
                >
                  Revoke Access
                </Button>
              </div>
            </div>
            <Progress 
              value={(accessControl.sessionTimeRemaining / (15 * 60)) * 100} 
              className="mt-3 h-2"
            />
          </CardContent>
        </Card>
      );
    }

    return (
      <Card className="border-amber-200 bg-amber-50">
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <Lock className="w-5 h-5 text-amber-600" />
              <div>
                <div className="font-medium text-amber-800">Administrative Access Required</div>
                <div className="text-sm text-amber-600">
                  System configuration requires elevated privileges
                </div>
              </div>
            </div>
            <Button
              onClick={() => requestSystemAccess([
                { resource: 'system_config', actions: ['read', 'write', 'configure'] }
              ])}
              disabled={accessControl.loading}
              className="bg-amber-600 hover:bg-amber-700 text-white"
            >
              {accessControl.loading ? 'Requesting...' : 'Request Access'}
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  };

  const renderSystemOverview = () => (
    <div className="space-y-6">
      {/* System Status Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-2xl font-bold text-green-600">{systemStatus.metrics.uptime}</div>
                <div className="text-sm text-gray-500">System Uptime</div>
              </div>
              <Server className="w-8 h-8 text-green-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-2xl font-bold text-blue-600">{systemStatus.metrics.totalConfigurations}</div>
                <div className="text-sm text-gray-500">Active Configurations</div>
              </div>
              <Settings className="w-8 h-8 text-blue-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-2xl font-bold text-purple-600">{systemStatus.metrics.activeSessions}</div>
                <div className="text-sm text-gray-500">Admin Sessions</div>
              </div>
              <Users className="w-8 h-8 text-purple-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-2xl font-bold text-orange-600">{systemStatus.metrics.securityEvents}</div>
                <div className="text-sm text-gray-500">Security Events</div>
              </div>
              <Shield className="w-8 h-8 text-orange-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Service Status */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Activity className="w-5 h-5" />
            <span>System Health</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {Object.entries(systemStatus.services).map(([service, status]) => (
              <div key={service} className="flex items-center justify-between p-3 border rounded-lg">
                <div className="flex items-center space-x-3">
                  {getStatusIcon(status)}
                  <span className="font-medium capitalize">{service.replace('_', ' ')}</span>
                </div>
                <Badge className={getStatusColor(status)}>
                  {status}
                </Badge>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );

  const renderPlaceholderTab = (tabName: string) => (
    <Card>
      <CardHeader>
        <CardTitle>{tabName} Configuration</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="text-center py-8">
          <div className="w-16 h-16 mx-auto mb-4 bg-gray-100 rounded-full flex items-center justify-center">
            <Settings className="w-8 h-8 text-gray-400" />
          </div>
          <p className="text-gray-500">
            {tabName} configuration interface will be available here
          </p>
          {!accessControl.isAuthorized && (
            <p className="text-sm text-amber-600 mt-2">
              Administrative access required to configure this section
            </p>
          )}
        </div>
      </CardContent>
    </Card>
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">System Setup</h1>
          <p className="text-gray-500 mt-1">
            Configure authentication, integrations, and security settings
          </p>
        </div>
        <Badge className={getStatusColor(systemStatus.overall)} variant="outline">
