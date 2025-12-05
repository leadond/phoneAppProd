import React, { useState, useEffect } from 'react';
import { Database, RefreshCw, CheckCircle, AlertTriangle, X, Settings, Play, Pause, Clock, Wifi, WifiOff, Plus, Edit, Trash2, Key, Shield, TestTube } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { dataService } from '../services/dataService';

interface PBXSystem {
  id: string;
  name: string;
  type: 'teams' | 'genesys' | 'rightfax' | 'audiocodes' | 'skype' | 'cucm' | 'avaya' | 'custom';
  status: 'connected' | 'disconnected' | 'syncing' | 'error' | 'configuring';
  lastSync: string;
  numbersManaged: number;
  syncEnabled: boolean;
  endpoint: string;
  version: string;
  health: 'healthy' | 'warning' | 'critical';
  // Authentication and configuration
  authType: 'api_key' | 'oauth' | 'basic_auth' | 'certificate';
  credentials: {
    apiKey?: string;
    clientId?: string;
    clientSecret?: string;
    username?: string;
    password?: string;
    certificatePath?: string;
    tenantId?: string;
    region?: string;
  };
  connectionSettings: {
    timeout: number;
    retryAttempts: number;
    validateSsl: boolean;
    customHeaders?: Record<string, string>;
  };
  syncSettings: {
    dataMapping: Record<string, string>;
    excludeFields?: string[];
    customFilters?: string;
  };
}

interface SystemConfigForm {
  name: string;
  type: string;
  endpoint: string;
  authType: string;
  credentials: Record<string, string>;
  connectionSettings: {
    timeout: number;
    retryAttempts: number;
    validateSsl: boolean;
  };
}

interface SyncOperation {
  id: string;
  systemId: string;
  systemName: string;
  type: 'full' | 'incremental' | 'validation';
  status: 'running' | 'completed' | 'failed';
  progress: number;
  startTime: string;
  endTime?: string;
  recordsProcessed: number;
  recordsTotal: number;
  errors: number;
  changes: {
    added: number;
    updated: number;
    removed: number;
  };
}

export const PBXSyncManager = () => {
  const [systems, setSystems] = useState<PBXSystem[]>([]);
  const [isAddSystemOpen, setIsAddSystemOpen] = useState(false);
  const [editingSystem, setEditingSystem] = useState<PBXSystem | null>(null);
  const [testingConnection, setTestingConnection] = useState<string | null>(null);
  const [formData, setFormData] = useState<SystemConfigForm>({
    name: '',
    type: 'teams',
    endpoint: '',
    authType: 'api_key',
    credentials: {},
    connectionSettings: {
      timeout: 30,
      retryAttempts: 3,
      validateSsl: true
    }
  });

  // Load systems from backend on component mount
  useEffect(() => {
    loadSystems();
  }, []);

  const loadSystems = async () => {
    try {
      const apiSystems = await dataService.getPBXSystems();
      const pbxSystems: PBXSystem[] = apiSystems.map(system => ({
        id: system.id,
        name: system.name,
        type: system.type as any,
        endpoint: system.endpoint,
        authType: 'api_key',
        credentials: system.credentials,
        connectionSettings: {
          timeout: 30,
          retryAttempts: 3,
          validateSsl: true,
        },
        status: system.status as any,
        lastSync: system.lastSync,
        numbersManaged: system.numbersManaged,
        syncEnabled: system.syncEnabled,
        version: system.version,
        health: system.health,
        syncSettings: {
          dataMapping: {},
          excludeFields: [],
          customFilters: '',
        },
      }));
      setSystems(pbxSystems);
    } catch (error) {
      console.error('Failed to load PBX systems:', error);
    }
  };

  const [syncOperations, setSyncOperations] = useState<SyncOperation[]>([]);

  const [selectedSystem, setSelectedSystem] = useState<string>('');
  const [syncSettings, setSyncSettings] = useState({
    autoSync: true,
    syncInterval: '15',
    conflictResolution: 'pbx_wins',
    validateNumbers: true,
    backupBeforeSync: true
  });

  const saveSystem = async (systemData: SystemConfigForm) => {
    try {
      const baseSystem = {
        name: systemData.name,
        type: systemData.type as any,
        endpoint: systemData.endpoint,
        status: editingSystem?.status ?? 'disconnected',
        lastSync: editingSystem?.lastSync ?? new Date().toISOString(),
        numbersManaged: editingSystem?.numbersManaged ?? 0,
        syncEnabled: editingSystem?.syncEnabled ?? false,
        version: editingSystem?.version ?? 'Unknown',
        health: editingSystem?.health ?? 'warning',
      } as Omit<PBXSystem, 'id' | 'authType' | 'credentials' | 'connectionSettings' | 'syncSettings'>;

      let saved: PBXSystem | null = null;

      if (editingSystem) {
        const updated = await dataService.updatePBXSystem(editingSystem.id, baseSystem as any);
        saved = updated ? {
          ...editingSystem,
          ...baseSystem,
        } : editingSystem;
      } else {
        const created = await dataService.addPBXSystem(baseSystem as any);
        saved = {
          ...created,
          authType: systemData.authType as any,
          credentials: systemData.credentials,
          connectionSettings: systemData.connectionSettings,
          syncSettings: {
            dataMapping: {},
            excludeFields: [],
            customFilters: ''
          }
        };
      }

      if (saved) {
        await loadSystems();
      }
      resetForm();
    } catch (error) {
      console.error('Failed to save system:', error);
    }
  };

  const deleteSystem = async (systemId: string) => {
    try {
      const success = await dataService.deletePBXSystem(systemId);
      if (success) {
        await loadSystems();
      }
    } catch (error) {
      console.error('Failed to delete system:', error);
    }
  };

  const testConnection = async (systemId: string) => {
    setTestingConnection(systemId);
    const system = systems.find(s => s.id === systemId);
    
    if (!system) return;

    try {
      // Update system status to testing
      setSystems(prev => prev.map(s =>
        s.id === systemId ? { ...s, status: 'syncing' as const } : s
      ));

      // Simulate connection test (in real implementation, this would make actual API calls)
      await new Promise(resolve => setTimeout(resolve, 2000));

      // For demo purposes, randomly succeed or fail
      const success = Math.random() > 0.3;
      
      setSystems(prev => prev.map(s =>
        s.id === systemId ? {
          ...s,
          status: success ? 'connected' as const : 'error' as const,
          health: success ? 'healthy' as const : 'critical' as const,
          lastSync: new Date().toISOString()
        } : s
      ));
    } catch (error) {
      setSystems(prev => prev.map(s =>
        s.id === systemId ? { ...s, status: 'error' as const, health: 'critical' as const } : s
      ));
    } finally {
      setTestingConnection(null);
    }
  };

  const resetForm = () => {
    setFormData({
      name: '',
      type: 'teams',
      endpoint: '',
      authType: 'api_key',
      credentials: {},
      connectionSettings: {
        timeout: 30,
        retryAttempts: 3,
        validateSsl: true
      }
    });
    setEditingSystem(null);
    setIsAddSystemOpen(false);
  };

  const openEditSystem = (system: PBXSystem) => {
    setFormData({
      name: system.name,
      type: system.type,
      endpoint: system.endpoint,
      authType: system.authType,
      credentials: system.credentials,
      connectionSettings: system.connectionSettings
    });
    setEditingSystem(system);
    setIsAddSystemOpen(true);
  };

  const getSystemIcon = (type: string) => {
    const icons = {
      teams: '🟦',
      genesys: '🟣',
      rightfax: '📠',
      audiocodes: '🔊',
      skype: '🔷',
      cucm: '📞',
      avaya: '☎️',
      custom: '⚙️'
    };
    return icons[type as keyof typeof icons] || '📞';
  };

  const getSystemTypeLabel = (type: string) => {
    const labels = {
      teams: 'Microsoft Teams',
      genesys: 'Genesys Cloud',
      rightfax: 'RightFax',
      audiocodes: 'AudioCodes',
      skype: 'Skype for Business',
      cucm: 'Cisco CUCM',
      avaya: 'Avaya Aura',
      custom: 'Custom API'
    };
    return labels[type as keyof typeof labels] || type;
  };

  const getAuthTypeLabel = (authType: string) => {
    const labels = {
      api_key: 'API Key',
      oauth: 'OAuth 2.0',
      basic_auth: 'Basic Authentication',
      certificate: 'Certificate'
    };
    return labels[authType as keyof typeof labels] || authType;
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'connected': return <Wifi className="w-4 h-4 text-green-500" />;
      case 'disconnected': return <WifiOff className="w-4 h-4 text-gray-500" />;
      case 'syncing': return <RefreshCw className="w-4 h-4 text-blue-500 animate-spin" />;
      case 'error': return <AlertTriangle className="w-4 h-4 text-red-500" />;
      default: return <Database className="w-4 h-4 text-gray-400" />;
    }
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, string> = {
      connected: 'bg-green-100 text-green-800',
      disconnected: 'bg-gray-100 text-gray-800',
      syncing: 'bg-blue-100 text-blue-800',
      error: 'bg-red-100 text-red-800'
    };
    return variants[status] || 'bg-gray-100 text-gray-800';
  };

  const getHealthBadge = (health: string) => {
    const variants: Record<string, string> = {
      healthy: 'bg-green-100 text-green-800',
      warning: 'bg-yellow-100 text-yellow-800',
      critical: 'bg-red-100 text-red-800'
    };
    return variants[health] || 'bg-gray-100 text-gray-800';
  };

  const loadSyncRunsForSystem = async (systemId: string) => {
    try {
      const runs = await dataService.getPBXSyncRuns(systemId);
      const mapped: SyncOperation[] = runs.map((run) => {
        const system = systems.find(s => s.id === String(run.system_id));
        const total = run.numbers_after ?? 0;
        return {
          id: String(run.id),
          systemId: String(run.system_id),
          systemName: system?.name || `System ${run.system_id}`,
          type: (run.type as any) || 'incremental',
          status: (run.status as any) || 'completed',
          progress: run.status === 'completed' ? 100 : 0,
          startTime: run.started_at,
          endTime: run.finished_at,
          recordsProcessed: total,
          recordsTotal: total,
          errors: run.error ? 1 : 0,
          changes: {
            added: run.changes_added ?? 0,
            updated: run.changes_updated ?? 0,
            removed: run.changes_removed ?? 0,
          },
        };
      });
      setSyncOperations(mapped);
    } catch (error) {
      console.error('Failed to load PBX sync runs:', error);
    }
  };

  const startSync = async (systemId: string, type: 'full' | 'incremental') => {
    const system = systems.find(s => s.id === systemId);
    if (!system) return;

    // Optimistically mark system as syncing
    setSystems(prev => prev.map(s =>
      s.id === systemId ? { ...s, status: 'syncing' as const } : s
    ));

    try {
      await dataService.runPBXSync(systemId, type);
      // Reload systems and sync runs for this system
      await loadSystems();
      await loadSyncRunsForSystem(systemId);
    } catch (error) {
      console.error('Failed to run PBX sync:', error);
      setSystems(prev => prev.map(s =>
        s.id === systemId ? { ...s, status: 'error' as const, health: 'critical' } : s
      ));
    }
  };

  const toggleSystemSync = (systemId: string) => {
    setSystems(prev => prev.map(system => 
      system.id === systemId 
        ? { ...system, syncEnabled: !system.syncEnabled }
        : system
    ));
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">PBX/UC System Synchronization</h1>
          <p className="text-gray-500 mt-1">Manage integrations with voice and UC platforms</p>
        </div>
        <Button>
          <Settings className="w-4 h-4 mr-2" />
          Sync Settings
        </Button>
      </div>

      <Tabs defaultValue="systems" className="space-y-6">
        <TabsList>
          <TabsTrigger value="systems">Connected Systems</TabsTrigger>
          <TabsTrigger value="operations">Sync Operations</TabsTrigger>
          <TabsTrigger value="settings">Configuration</TabsTrigger>
        </TabsList>

        <TabsContent value="systems" className="space-y-6">
          {/* System Overview */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card>
              <CardContent className="p-4">
                <div className="text-2xl font-bold text-blue-600">{systems.length}</div>
                <div className="text-sm text-gray-500">Total Systems</div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="text-2xl font-bold text-green-600">
                  {systems.filter(s => s.status === 'connected').length}
                </div>
                <div className="text-sm text-gray-500">Connected</div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="text-2xl font-bold text-blue-500">
                  {systems.filter(s => s.status === 'syncing').length}
                </div>
                <div className="text-sm text-gray-500">Syncing</div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="text-2xl font-bold text-red-600">
                  {systems.filter(s => s.status === 'error').length}
                </div>
                <div className="text-sm text-gray-500">Errors</div>
              </CardContent>
            </Card>
          </div>

          {/* Add System Button */}
          <div className="flex justify-between items-center">
            <h3 className="text-lg font-semibold">PBX/UC Systems</h3>
            <Dialog open={isAddSystemOpen} onOpenChange={setIsAddSystemOpen}>
              <DialogTrigger asChild>
                <Button onClick={() => resetForm()}>
                  <Plus className="w-4 h-4 mr-2" />
                  Add System
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>
                    {editingSystem ? 'Edit PBX System' : 'Add New PBX System'}
                  </DialogTitle>
                </DialogHeader>
                
                <div className="space-y-6">
                  {/* Basic Information */}
                  <div className="space-y-4">
                    <h4 className="font-medium text-sm text-gray-700">Basic Information</h4>
                    
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="name">System Name</Label>
                        <Input
                          id="name"
                          value={formData.name}
                          onChange={(e) => setFormData({...formData, name: e.target.value})}
                          placeholder="e.g., Production Teams"
                        />
                      </div>
                      
                      <div>
                        <Label htmlFor="type">System Type</Label>
                        <Select value={formData.type} onValueChange={(value) =>
                          setFormData({...formData, type: value})}>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="teams">Microsoft Teams</SelectItem>
                            <SelectItem value="genesys">Genesys Cloud</SelectItem>
                            <SelectItem value="rightfax">RightFax</SelectItem>
                            <SelectItem value="audiocodes">AudioCodes</SelectItem>
                            <SelectItem value="skype">Skype for Business</SelectItem>
                            <SelectItem value="cucm">Cisco CUCM</SelectItem>
                            <SelectItem value="avaya">Avaya Aura</SelectItem>
                            <SelectItem value="custom">Custom API</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                    
                    <div>
                      <Label htmlFor="endpoint">API Endpoint URL</Label>
                      <Input
                        id="endpoint"
                        value={formData.endpoint}
                        onChange={(e) => setFormData({...formData, endpoint: e.target.value})}
                        placeholder="https://api.example.com/v1"
                      />
                    </div>
                  </div>

                  {/* Authentication */}
                  <div className="space-y-4">
                    <h4 className="font-medium text-sm text-gray-700 flex items-center">
                      <Shield className="w-4 h-4 mr-2" />
                      Authentication
                    </h4>
                    
                    <div>
                      <Label htmlFor="authType">Authentication Type</Label>
                      <Select value={formData.authType} onValueChange={(value) =>
                        setFormData({...formData, authType: value, credentials: {}})}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="api_key">API Key</SelectItem>
                          <SelectItem value="oauth">OAuth 2.0</SelectItem>
                          <SelectItem value="basic_auth">Basic Authentication</SelectItem>
                          <SelectItem value="certificate">Certificate</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    {/* Dynamic credential fields based on auth type */}
                    {formData.authType === 'api_key' && (
                      <div>
                        <Label htmlFor="apiKey">API Key</Label>
                        <Input
                          id="apiKey"
                          type="password"
                          value={formData.credentials.apiKey || ''}
                          onChange={(e) => setFormData({
                            ...formData,
                            credentials: { ...formData.credentials, apiKey: e.target.value }
                          })}
                          placeholder="Enter your API key"
                        />
                      </div>
                    )}

                    {formData.authType === 'oauth' && (
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <Label htmlFor="clientId">Client ID</Label>
                          <Input
                            id="clientId"
                            value={formData.credentials.clientId || ''}
                            onChange={(e) => setFormData({
                              ...formData,
                              credentials: { ...formData.credentials, clientId: e.target.value }
                            })}
                          />
                        </div>
                        <div>
                          <Label htmlFor="clientSecret">Client Secret</Label>
                          <Input
                            id="clientSecret"
                            type="password"
                            value={formData.credentials.clientSecret || ''}
                            onChange={(e) => setFormData({
                              ...formData,
                              credentials: { ...formData.credentials, clientSecret: e.target.value }
                            })}
                          />
                        </div>
                        <div>
                          <Label htmlFor="tenantId">Tenant ID (Optional)</Label>
                          <Input
                            id="tenantId"
                            value={formData.credentials.tenantId || ''}
                            onChange={(e) => setFormData({
                              ...formData,
                              credentials: { ...formData.credentials, tenantId: e.target.value }
                            })}
                          />
                        </div>
                        <div>
                          <Label htmlFor="region">Region (Optional)</Label>
                          <Input
                            id="region"
                            value={formData.credentials.region || ''}
                            onChange={(e) => setFormData({
                              ...formData,
                              credentials: { ...formData.credentials, region: e.target.value }
                            })}
                          />
                        </div>
                      </div>
                    )}

                    {formData.authType === 'basic_auth' && (
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <Label htmlFor="username">Username</Label>
                          <Input
                            id="username"
                            value={formData.credentials.username || ''}
                            onChange={(e) => setFormData({
                              ...formData,
                              credentials: { ...formData.credentials, username: e.target.value }
                            })}
                          />
                        </div>
                        <div>
                          <Label htmlFor="password">Password</Label>
                          <Input
                            id="password"
                            type="password"
                            value={formData.credentials.password || ''}
                            onChange={(e) => setFormData({
                              ...formData,
                              credentials: { ...formData.credentials, password: e.target.value }
                            })}
                          />
                        </div>
                      </div>
                    )}

                    {formData.authType === 'certificate' && (
                      <div>
                        <Label htmlFor="certificatePath">Certificate Path</Label>
                        <Input
                          id="certificatePath"
                          value={formData.credentials.certificatePath || ''}
                          onChange={(e) => setFormData({
                            ...formData,
                            credentials: { ...formData.credentials, certificatePath: e.target.value }
                          })}
                          placeholder="/path/to/certificate.pem"
                        />
                      </div>
                    )}
                  </div>

                  {/* Connection Settings */}
                  <div className="space-y-4">
                    <h4 className="font-medium text-sm text-gray-700">Connection Settings</h4>
                    
                    <div className="grid grid-cols-3 gap-4">
                      <div>
                        <Label htmlFor="timeout">Timeout (seconds)</Label>
                        <Input
                          id="timeout"
                          type="number"
                          value={formData.connectionSettings.timeout}
                          onChange={(e) => setFormData({
                            ...formData,
                            connectionSettings: {
                              ...formData.connectionSettings,
                              timeout: parseInt(e.target.value) || 30
                            }
                          })}
                        />
                      </div>
                      <div>
                        <Label htmlFor="retryAttempts">Retry Attempts</Label>
                        <Input
                          id="retryAttempts"
                          type="number"
                          value={formData.connectionSettings.retryAttempts}
                          onChange={(e) => setFormData({
                            ...formData,
                            connectionSettings: {
                              ...formData.connectionSettings,
                              retryAttempts: parseInt(e.target.value) || 3
                            }
                          })}
                        />
                      </div>
                      <div className="flex items-center space-x-2 mt-6">
                        <Switch
                          checked={formData.connectionSettings.validateSsl}
                          onCheckedChange={(checked) => setFormData({
                            ...formData,
                            connectionSettings: {
                              ...formData.connectionSettings,
                              validateSsl: checked
                            }
                          })}
                        />
                        <Label>Validate SSL</Label>
                      </div>
                    </div>
                  </div>

                  {/* Action Buttons */}
                  <div className="flex justify-end space-x-2 pt-4 border-t">
                    <Button variant="outline" onClick={resetForm}>
                      Cancel
                    </Button>
                    <Button onClick={() => saveSystem(formData)}>
                      {editingSystem ? 'Update System' : 'Add System'}
                    </Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          </div>

          {/* Systems Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {systems.map((system) => (
              <Card key={system.id} className="hover:shadow-lg transition-shadow">
                <CardHeader className="pb-3">
                  <div className="flex justify-between items-start">
                    <div className="flex items-center space-x-3">
                      <div className="text-2xl">{getSystemIcon(system.type)}</div>
                      <div>
                        <CardTitle className="text-lg">{system.name}</CardTitle>
                        <p className="text-sm text-gray-500">Version {system.version}</p>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      {getStatusIcon(system.status)}
                      <Badge className={getStatusBadge(system.status)}>
                        {system.status}
                      </Badge>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <div className="text-gray-500">Numbers Managed</div>
                      <div className="font-medium">{system.numbersManaged.toLocaleString()}</div>
                    </div>
                    <div>
                      <div className="text-gray-500">Health Status</div>
                      <Badge className={getHealthBadge(system.health)}>
                        {system.health}
                      </Badge>
                    </div>
                  </div>

                  <div className="text-sm">
                    <div className="text-gray-500">Last Sync</div>
                    <div className="font-medium">
                      {new Date(system.lastSync).toLocaleString()}
                    </div>
                  </div>

                  <div className="text-sm">
                    <div className="text-gray-500">Endpoint</div>
                    <div className="font-mono text-xs bg-gray-100 p-1 rounded">
                      {system.endpoint}
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-2 border-t">
                    <div className="flex items-center space-x-2">
                      <Switch 
                        checked={system.syncEnabled}
                        onCheckedChange={() => toggleSystemSync(system.id)}
                      />
                      <span className="text-sm">Auto Sync</span>
                    </div>
                    <div className="space-x-2">
                      <Button 
                        size="sm" 
                        variant="outline"
                        onClick={() => startSync(system.id, 'incremental')}
                        disabled={system.status === 'syncing'}
                      >
                        <RefreshCw className="w-4 h-4 mr-1" />
                        Sync
                      </Button>
                      <Button 
                        size="sm" 
                        variant="outline"
                        onClick={() => startSync(system.id, 'full')}
                        disabled={system.status === 'syncing'}
                      >
                        Full Sync
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="operations" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Recent Sync Operations</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {syncOperations.map((operation) => (
                  <div key={operation.id} className="border rounded-lg p-4">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center space-x-3">
                        {operation.status === 'running' ? (
                          <RefreshCw className="w-5 h-5 text-blue-500 animate-spin" />
                        ) : operation.status === 'completed' ? (
                          <CheckCircle className="w-5 h-5 text-green-500" />
                        ) : (
                          <X className="w-5 h-5 text-red-500" />
                        )}
                        <div>
                          <h4 className="font-medium">
                            {operation.systemName} - {operation.type} sync
                          </h4>
                          <p className="text-sm text-gray-500">
                            Started {new Date(operation.startTime).toLocaleString()}
                          </p>
                        </div>
                      </div>
                      <Badge className={getStatusBadge(operation.status)}>
                        {operation.status}
                      </Badge>
                    </div>

                    {operation.status === 'running' && (
                      <div className="mb-3">
                        <div className="flex justify-between text-sm mb-1">
                          <span>Progress</span>
                          <span>{operation.progress.toFixed(0)}%</span>
                        </div>
                        <Progress value={operation.progress} className="h-2" />
                      </div>
                    )}

                    <div className="grid grid-cols-2 md:grid-cols-5 gap-4 text-sm">
                      <div>
                        <span className="text-gray-500">Processed:</span>
                        <span className="ml-1 font-medium">{operation.recordsProcessed}</span>
                      </div>
                      <div>
                        <span className="text-gray-500">Total:</span>
                        <span className="ml-1 font-medium">{operation.recordsTotal}</span>
                      </div>
                      <div>
                        <span className="text-gray-500">Added:</span>
                        <span className="ml-1 font-medium text-green-600">{operation.changes.added}</span>
                      </div>
                      <div>
                        <span className="text-gray-500">Updated:</span>
                        <span className="ml-1 font-medium text-blue-600">{operation.changes.updated}</span>
                      </div>
                      <div>
                        <span className="text-gray-500">Errors:</span>
                        <span className="ml-1 font-medium text-red-600">{operation.errors}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="settings" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Synchronization Settings</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <label className="text-sm font-medium">Auto Sync</label>
                    <Switch 
                      checked={syncSettings.autoSync}
                      onCheckedChange={(checked) => setSyncSettings({...syncSettings, autoSync: checked})}
                    />
                  </div>
                  
                  <div>
                    <label className="text-sm font-medium">Sync Interval (minutes)</label>
                    <Select value={syncSettings.syncInterval} onValueChange={(value) => 
                      setSyncSettings({...syncSettings, syncInterval: value})}>
                      <SelectTrigger className="mt-1">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="5">5 minutes</SelectItem>
                        <SelectItem value="15">15 minutes</SelectItem>
                        <SelectItem value="30">30 minutes</SelectItem>
                        <SelectItem value="60">1 hour</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <label className="text-sm font-medium">Conflict Resolution</label>
                    <Select value={syncSettings.conflictResolution} onValueChange={(value) => 
                      setSyncSettings({...syncSettings, conflictResolution: value})}>
                      <SelectTrigger className="mt-1">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="pbx_wins">PBX System Wins</SelectItem>
                        <SelectItem value="numberpro_wins">NumberPro Wins</SelectItem>
                        <SelectItem value="manual">Manual Resolution</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <label className="text-sm font-medium">Validate Numbers</label>
                    <Switch 
                      checked={syncSettings.validateNumbers}
                      onCheckedChange={(checked) => setSyncSettings({...syncSettings, validateNumbers: checked})}
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <label className="text-sm font-medium">Backup Before Sync</label>
                    <Switch 
                      checked={syncSettings.backupBeforeSync}
                      onCheckedChange={(checked) => setSyncSettings({...syncSettings, backupBeforeSync: checked})}
                    />
                  </div>
                </div>
              </div>

              <div className="pt-4 border-t">
                <Button>
                  Save Settings
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};