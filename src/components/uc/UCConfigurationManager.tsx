import React, { useState, useEffect } from 'react';
import { 
  FileText, 
  Upload, 
  Download, 
  Save, 
  Plus, 
  Trash2, 
  Edit3, 
  Check, 
  X,
  AlertCircle,
  CheckCircle,
  Settings,
  Copy
} from 'lucide-react';

interface UCConfig {
  SIPDomains: string[];
  LyncPools: string[];
  DialInFQDNs: string[];
  MeetFQDNs: string[];
  FrontEndList: string[];
  ExchangeServerList: string[];
  DNSServers: string[];
  AccessEdge: string;
  WebConfEdge: string;
  AVEdge: string;
  ProxyFQDN: string;
  SIPPort: number;
  WebConfPort: number;
  AVPort: number;
}

interface ConfigFile {
  name: string;
  filename: string;
  lastModified: string;
  size: number;
  isActive: boolean;
}

interface UCConfigurationManagerProps {
  onStatusChange?: () => void;
}

export const UCConfigurationManager: React.FC<UCConfigurationManagerProps> = ({ onStatusChange }) => {
  const [configFiles, setConfigFiles] = useState<ConfigFile[]>([]);
  const [currentConfig, setCurrentConfig] = useState<UCConfig | null>(null);
  const [selectedFile, setSelectedFile] = useState<string>('uc_config.xml');
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [newFileName, setNewFileName] = useState('');
  const [showNewFileModal, setShowNewFileModal] = useState(false);

  useEffect(() => {
    loadConfigFiles();
    loadConfiguration(selectedFile);
  }, [selectedFile]);

  const loadConfigFiles = async () => {
    try {
      const response = await fetch('/api/uc/config/files', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('auth_token')}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        setConfigFiles(data.data || []);
      }
    } catch (error) {
      console.error('Failed to load config files:', error);
      setMessage({ type: 'error', text: 'Failed to load configuration files' });
    }
  };

  const loadConfiguration = async (filename: string) => {
    setIsLoading(true);
    try {
      const response = await fetch(`/api/uc/config/${filename}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('auth_token')}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        setCurrentConfig(data.data);
        setMessage({ type: 'success', text: `Configuration loaded from ${filename}` });
      } else {
        throw new Error('Failed to load configuration');
      }
    } catch (error) {
      console.error('Failed to load configuration:', error);
      setMessage({ type: 'error', text: 'Failed to load configuration' });
    } finally {
      setIsLoading(false);
    }
  };

  const saveConfiguration = async () => {
    if (!currentConfig) return;
    
    setIsSaving(true);
    try {
      const response = await fetch('/api/uc/config/save', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('auth_token')}`
        },
        body: JSON.stringify({
          config: currentConfig,
          filename: selectedFile
        })
      });

      if (response.ok) {
        setMessage({ type: 'success', text: 'Configuration saved successfully' });
        onStatusChange?.();
        loadConfigFiles();
      } else {
        throw new Error('Failed to save configuration');
      }
    } catch (error) {
      console.error('Failed to save configuration:', error);
      setMessage({ type: 'error', text: 'Failed to save configuration' });
    } finally {
      setIsSaving(false);
    }
  };

  const createNewFile = async () => {
    if (!newFileName.trim()) return;

    try {
      const response = await fetch('/api/uc/config/create', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('auth_token')}`
        },
        body: JSON.stringify({ filename: newFileName })
      });

      if (response.ok) {
        const data = await response.json();
        setMessage({ type: 'success', text: `Configuration file ${data.filename} created successfully` });
        setNewFileName('');
        setShowNewFileModal(false);
        loadConfigFiles();
        setSelectedFile(data.filename);
      } else {
        const error = await response.json();
        throw new Error(error.message || 'Failed to create file');
      }
    } catch (error) {
      console.error('Failed to create file:', error);
      setMessage({ type: 'error', text: error.message || 'Failed to create configuration file' });
    }
  };

  const updateArrayField = (field: keyof UCConfig, index: number, value: string) => {
    if (!currentConfig) return;
    
    const updatedConfig = { ...currentConfig };
    const array = updatedConfig[field] as string[];
    array[index] = value;
    setCurrentConfig(updatedConfig);
  };

  const addArrayItem = (field: keyof UCConfig) => {
    if (!currentConfig) return;
    
    const updatedConfig = { ...currentConfig };
    const array = updatedConfig[field] as string[];
    array.push('');
    setCurrentConfig(updatedConfig);
  };

  const removeArrayItem = (field: keyof UCConfig, index: number) => {
    if (!currentConfig) return;
    
    const updatedConfig = { ...currentConfig };
    const array = updatedConfig[field] as string[];
    array.splice(index, 1);
    setCurrentConfig(updatedConfig);
  };

  const updateField = (field: keyof UCConfig, value: string | number) => {
    if (!currentConfig) return;
    
    setCurrentConfig({
      ...currentConfig,
      [field]: value
    });
  };

  const renderArrayField = (label: string, field: keyof UCConfig, placeholder: string) => {
    if (!currentConfig) return null;
    
    const array = currentConfig[field] as string[];
    
    return (
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <label className="block text-sm font-medium text-gray-700">{label}</label>
          <button
            type="button"
            onClick={() => addArrayItem(field)}
            className="text-sm text-blue-600 hover:text-blue-800 flex items-center"
          >
            <Plus className="w-4 h-4 mr-1" />
            Add
          </button>
        </div>
        {array.map((item, index) => (
          <div key={index} className="flex items-center space-x-2">
            <input
              type="text"
              value={item}
              onChange={(e) => updateArrayField(field, index, e.target.value)}
              placeholder={placeholder}
              className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
            <button
              type="button"
              onClick={() => removeArrayItem(field, index)}
              className="text-red-600 hover:text-red-800 p-1"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        ))}
      </div>
    );
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading configuration...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header with File Selection */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Configuration Manager</h2>
          <p className="text-gray-500">Manage UC configuration files and settings</p>
        </div>
        
        <div className="flex items-center space-x-4">
          <select
            value={selectedFile}
            onChange={(e) => setSelectedFile(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          >
            {configFiles.map((file) => (
              <option key={file.filename} value={file.filename}>
                {file.name} {file.isActive && '(Active)'}
              </option>
            ))}
          </select>
          
          <button
            onClick={() => setShowNewFileModal(true)}
            className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 flex items-center"
          >
            <Plus className="w-4 h-4 mr-2" />
            New File
          </button>
        </div>
      </div>

      {/* Status Message */}
      {message && (
        <div className={`p-4 rounded-md flex items-center ${
          message.type === 'success' ? 'bg-green-50 text-green-800' : 'bg-red-50 text-red-800'
        }`}>
          {message.type === 'success' ? (
            <CheckCircle className="w-5 h-5 mr-2" />
          ) : (
            <AlertCircle className="w-5 h-5 mr-2" />
          )}
          {message.text}
          <button
            onClick={() => setMessage(null)}
            className="ml-auto text-gray-500 hover:text-gray-700"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Configuration Form */}
      {currentConfig && (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-semibold text-gray-900 flex items-center">
              <Settings className="w-5 h-5 mr-2" />
              Configuration Settings
            </h3>
            <button
              onClick={saveConfiguration}
              disabled={isSaving}
              className="px-4 py-2 text-sm font-medium text-white bg-green-600 rounded-md hover:bg-green-700 disabled:opacity-50 flex items-center"
            >
              {isSaving ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Saving...
                </>
              ) : (
                <>
                  <Save className="w-4 h-4 mr-2" />
                  Save Configuration
                </>
              )}
            </button>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Left Column */}
            <div className="space-y-6">
              {renderArrayField('SIP Domains', 'SIPDomains', 'contoso.com')}
              {renderArrayField('Lync Pools', 'LyncPools', 'pool1.contoso.com')}
              {renderArrayField('Dial-in FQDNs', 'DialInFQDNs', 'dialin.contoso.com')}
              {renderArrayField('Meet FQDNs', 'MeetFQDNs', 'meet.contoso.com')}
              {renderArrayField('Front End Servers', 'FrontEndList', 'fe1.contoso.com')}
            </div>

            {/* Right Column */}
            <div className="space-y-6">
              {renderArrayField('Exchange Servers', 'ExchangeServerList', 'exchange1.contoso.com')}
              {renderArrayField('DNS Servers', 'DNSServers', '8.8.8.8')}
              
              {/* Edge Server Configuration */}
              <div className="space-y-4">
                <h4 className="text-md font-medium text-gray-900">Edge Server Configuration</h4>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Access Edge</label>
                  <input
                    type="text"
                    value={currentConfig.AccessEdge}
                    onChange={(e) => updateField('AccessEdge', e.target.value)}
                    placeholder="access.contoso.com"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Web Conference Edge</label>
                  <input
                    type="text"
                    value={currentConfig.WebConfEdge}
                    onChange={(e) => updateField('WebConfEdge', e.target.value)}
                    placeholder="webconf.contoso.com"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">A/V Edge</label>
                  <input
                    type="text"
                    value={currentConfig.AVEdge}
                    onChange={(e) => updateField('AVEdge', e.target.value)}
                    placeholder="av.contoso.com"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Proxy FQDN</label>
                  <input
                    type="text"
                    value={currentConfig.ProxyFQDN}
                    onChange={(e) => updateField('ProxyFQDN', e.target.value)}
                    placeholder="proxy.contoso.com"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
              </div>

              {/* Port Configuration */}
              <div className="space-y-4">
                <h4 className="text-md font-medium text-gray-900">Port Configuration</h4>
                
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">SIP Port</label>
                    <input
                      type="number"
                      value={currentConfig.SIPPort}
                      onChange={(e) => updateField('SIPPort', parseInt(e.target.value) || 5061)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Web Conf Port</label>
                    <input
                      type="number"
                      value={currentConfig.WebConfPort}
                      onChange={(e) => updateField('WebConfPort', parseInt(e.target.value) || 443)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">A/V Port</label>
                    <input
                      type="number"
                      value={currentConfig.AVPort}
                      onChange={(e) => updateField('AVPort', parseInt(e.target.value) || 443)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Configuration Files List */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Configuration Files</h3>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  File Name
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Last Modified
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Size
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {configFiles.map((file) => (
                <tr key={file.filename} className={selectedFile === file.filename ? 'bg-blue-50' : ''}>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <FileText className="w-5 h-5 text-gray-400 mr-3" />
                      <div>
                        <div className="text-sm font-medium text-gray-900">{file.name}</div>
                        <div className="text-sm text-gray-500">{file.filename}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {new Date(file.lastModified).toLocaleString()}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {(file.size / 1024).toFixed(1)} KB
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                      file.isActive 
                        ? 'bg-green-100 text-green-800' 
                        : 'bg-gray-100 text-gray-800'
                    }`}>
                      {file.isActive ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <button
                      onClick={() => setSelectedFile(file.filename)}
                      className="text-blue-600 hover:text-blue-900 mr-3"
                    >
                      Load
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* New File Modal */}
      {showNewFileModal && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
            <div className="mt-3">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Create New Configuration File</h3>
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">File Name</label>
                <input
                  type="text"
                  value={newFileName}
                  onChange={(e) => setNewFileName(e.target.value)}
                  placeholder="Enter filename (without .xml)"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
              <div className="flex justify-end space-x-3">
                <button
                  onClick={() => {
                    setShowNewFileModal(false);
                    setNewFileName('');
                  }}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-200 rounded-md hover:bg-gray-300"
                >
                  Cancel
                </button>
                <button
                  onClick={createNewFile}
                  disabled={!newFileName.trim()}
                  className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 disabled:opacity-50"
                >
                  Create
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};