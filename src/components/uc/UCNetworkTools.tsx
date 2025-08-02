import React, { useState } from 'react';
import { 
  Network, 
  Globe, 
  Shield, 
  Search, 
  Play, 
  CheckCircle, 
  XCircle, 
  Clock,
  AlertTriangle,
  Server,
  Wifi,
  Activity
} from 'lucide-react';

interface PortCheckResult {
  host: string;
  port: number;
  status: string;
  message: string;
  checkedAt: string;
  responseTime: number;
}

interface DNSResult {
  domain: string;
  recordType: string;
  dnsServer: string;
  results: string[];
  status: string;
  lookupTime: string;
  responseTime: number;
}

export const UCNetworkTools: React.FC = () => {
  const [activeTab, setActiveTab] = useState('port-checker');
  
  // Port Checker State
  const [portCheckForm, setPortCheckForm] = useState({ host: '', port: '' });
  const [portCheckResult, setPortCheckResult] = useState<PortCheckResult | null>(null);
  const [portCheckLoading, setPortCheckLoading] = useState(false);

  // DNS Lookup State
  const [dnsForm, setDnsForm] = useState({ 
    domain: '', 
    recordType: 'A', 
    dnsServer: '' 
  });
  const [dnsResult, setDnsResult] = useState<DNSResult | null>(null);
  const [dnsLoading, setDnsLoading] = useState(false);

  // Public IP State
  const [publicIP, setPublicIP] = useState<string | null>(null);
  const [publicIPLoading, setPublicIPLoading] = useState(false);

  const commonPorts = [
    { name: 'SIP (TCP)', port: 5060, description: 'SIP signaling over TCP' },
    { name: 'SIP TLS', port: 5061, description: 'SIP signaling over TLS' },
    { name: 'HTTPS', port: 443, description: 'Web conference and admin' },
    { name: 'HTTP', port: 80, description: 'Web services' },
    { name: 'LDAP', port: 389, description: 'Directory services' },
    { name: 'LDAPS', port: 636, description: 'Secure directory services' },
    { name: 'Exchange MAPI', port: 135, description: 'Exchange services' },
    { name: 'WinRM HTTP', port: 5985, description: 'PowerShell remoting' },
    { name: 'WinRM HTTPS', port: 5986, description: 'Secure PowerShell remoting' }
  ];

  const commonDomains = [
    'pool1.contoso.com',
    'fe1.contoso.com',
    'meet.contoso.com',
    'dialin.contoso.com',
    'access.contoso.com',
    'webconf.contoso.com',
    'av.contoso.com'
  ];

  const handlePortCheck = async () => {
    if (!portCheckForm.host || !portCheckForm.port) return;

    setPortCheckLoading(true);
    try {
      const response = await fetch('/api/uc/tools/check-port', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('auth_token')}`
        },
        body: JSON.stringify({
          host: portCheckForm.host,
          port: parseInt(portCheckForm.port)
        })
      });

      if (response.ok) {
        const data = await response.json();
        setPortCheckResult(data.data);
      } else {
        throw new Error('Port check failed');
      }
    } catch (error) {
      console.error('Port check error:', error);
      setPortCheckResult({
        host: portCheckForm.host,
        port: parseInt(portCheckForm.port),
        status: 'error',
        message: 'Failed to check port connectivity',
        checkedAt: new Date().toISOString(),
        responseTime: 0
      });
    } finally {
      setPortCheckLoading(false);
    }
  };

  const handleDNSLookup = async () => {
    if (!dnsForm.domain) return;

    setDnsLoading(true);
    try {
      const response = await fetch('/api/uc/tools/dns-lookup', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('auth_token')}`
        },
        body: JSON.stringify(dnsForm)
      });

      if (response.ok) {
        const data = await response.json();
        setDnsResult(data.data);
      } else {
        throw new Error('DNS lookup failed');
      }
    } catch (error) {
      console.error('DNS lookup error:', error);
      setDnsResult({
        domain: dnsForm.domain,
        recordType: dnsForm.recordType,
        dnsServer: dnsForm.dnsServer || 'System Default',
        results: ['DNS lookup failed'],
        status: 'error',
        lookupTime: new Date().toISOString(),
        responseTime: 0
      });
    } finally {
      setDnsLoading(false);
    }
  };

  const handleGetPublicIP = async () => {
    setPublicIPLoading(true);
    try {
      const response = await fetch('/api/uc/tools/public-ip', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('auth_token')}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        setPublicIP(data.data.ip);
      } else {
        throw new Error('Failed to get public IP');
      }
    } catch (error) {
      console.error('Public IP error:', error);
      setPublicIP('Error retrieving IP');
    } finally {
      setPublicIPLoading(false);
    }
  };

  const tabs = [
    { id: 'port-checker', label: 'Port Checker', icon: Shield },
    { id: 'dns-lookup', label: 'DNS Lookup', icon: Search },
    { id: 'public-ip', label: 'Public IP', icon: Globe },
    { id: 'common-ports', label: 'Common Ports', icon: Server }
  ];

  const renderPortChecker = () => (
    <div className="space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Port Check Form */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
            <Shield className="w-5 h-5 mr-2" />
            Port Connectivity Test
          </h3>
          
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Host/IP Address</label>
              <input
                type="text"
                value={portCheckForm.host}
                onChange={(e) => setPortCheckForm({ ...portCheckForm, host: e.target.value })}
                placeholder="pool1.contoso.com or 192.168.1.100"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Port Number</label>
              <input
                type="number"
                value={portCheckForm.port}
                onChange={(e) => setPortCheckForm({ ...portCheckForm, port: e.target.value })}
                placeholder="5061"
                min="1"
                max="65535"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
            
            <button
              onClick={handlePortCheck}
              disabled={portCheckLoading || !portCheckForm.host || !portCheckForm.port}
              className="w-full px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 disabled:opacity-50 flex items-center justify-center"
            >
              {portCheckLoading ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Checking...
                </>
              ) : (
                <>
                  <Play className="w-4 h-4 mr-2" />
                  Check Port
                </>
              )}
            </button>
          </div>
        </div>

        {/* Port Check Result */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Test Result</h3>
          
          {portCheckResult ? (
            <div className="space-y-4">
              <div className="flex items-center space-x-2">
                {portCheckResult.status === 'open' ? (
                  <CheckCircle className="w-6 h-6 text-green-500" />
                ) : portCheckResult.status === 'closed' ? (
                  <XCircle className="w-6 h-6 text-red-500" />
                ) : portCheckResult.status === 'timeout' ? (
                  <Clock className="w-6 h-6 text-yellow-500" />
                ) : (
                  <AlertTriangle className="w-6 h-6 text-red-500" />
                )}
                <span className={`font-medium ${
                  portCheckResult.status === 'open' ? 'text-green-700' :
                  portCheckResult.status === 'closed' ? 'text-red-700' :
                  portCheckResult.status === 'timeout' ? 'text-yellow-700' :
                  'text-red-700'
                }`}>
                  Port {portCheckResult.status.toUpperCase()}
                </span>
              </div>
              
              <div className="text-sm text-gray-600 space-y-1">
                <p><strong>Host:</strong> {portCheckResult.host}</p>
                <p><strong>Port:</strong> {portCheckResult.port}</p>
                <p><strong>Message:</strong> {portCheckResult.message}</p>
                <p><strong>Response Time:</strong> {portCheckResult.responseTime}ms</p>
                <p><strong>Checked At:</strong> {new Date(portCheckResult.checkedAt).toLocaleString()}</p>
              </div>
            </div>
          ) : (
            <p className="text-gray-500">Enter a host and port to test connectivity</p>
          )}
        </div>
      </div>
    </div>
  );

  const renderDNSLookup = () => (
    <div className="space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* DNS Lookup Form */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
            <Search className="w-5 h-5 mr-2" />
            DNS Resolution Test
          </h3>
          
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Domain Name</label>
              <input
                type="text"
                value={dnsForm.domain}
                onChange={(e) => setDnsForm({ ...dnsForm, domain: e.target.value })}
                placeholder="pool1.contoso.com"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Record Type</label>
              <select
                value={dnsForm.recordType}
                onChange={(e) => setDnsForm({ ...dnsForm, recordType: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="A">A (IPv4 Address)</option>
                <option value="AAAA">AAAA (IPv6 Address)</option>
                <option value="CNAME">CNAME (Canonical Name)</option>
                <option value="MX">MX (Mail Exchange)</option>
                <option value="TXT">TXT (Text Record)</option>
              </select>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">DNS Server (Optional)</label>
              <input
                type="text"
                value={dnsForm.dnsServer}
                onChange={(e) => setDnsForm({ ...dnsForm, dnsServer: e.target.value })}
                placeholder="8.8.8.8 (leave blank for system default)"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
            
            <button
              onClick={handleDNSLookup}
              disabled={dnsLoading || !dnsForm.domain}
              className="w-full px-4 py-2 text-sm font-medium text-white bg-green-600 rounded-md hover:bg-green-700 disabled:opacity-50 flex items-center justify-center"
            >
              {dnsLoading ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Looking up...
                </>
              ) : (
                <>
                  <Search className="w-4 h-4 mr-2" />
                  Lookup DNS
                </>
              )}
            </button>
          </div>
        </div>

        {/* DNS Lookup Result */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Lookup Result</h3>
          
          {dnsResult ? (
            <div className="space-y-4">
              <div className="flex items-center space-x-2">
                {dnsResult.status === 'success' ? (
                  <CheckCircle className="w-6 h-6 text-green-500" />
                ) : (
                  <XCircle className="w-6 h-6 text-red-500" />
                )}
                <span className={`font-medium ${
                  dnsResult.status === 'success' ? 'text-green-700' : 'text-red-700'
                }`}>
                  {dnsResult.status === 'success' ? 'DNS Resolution Successful' : 'DNS Resolution Failed'}
                </span>
              </div>
              
              <div className="text-sm text-gray-600 space-y-2">
                <p><strong>Domain:</strong> {dnsResult.domain}</p>
                <p><strong>Record Type:</strong> {dnsResult.recordType}</p>
                <p><strong>DNS Server:</strong> {dnsResult.dnsServer}</p>
                <p><strong>Response Time:</strong> {dnsResult.responseTime}ms</p>
                
                <div>
                  <strong>Results:</strong>
                  <div className="mt-1 bg-gray-50 rounded-md p-2">
                    {dnsResult.results.length > 0 ? (
                      <ul className="space-y-1">
                        {dnsResult.results.map((result, index) => (
                          <li key={index} className="font-mono text-sm">{result}</li>
                        ))}
                      </ul>
                    ) : (
                      <span className="text-gray-500">No records found</span>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <p className="text-gray-500">Enter a domain name to perform DNS lookup</p>
          )}
        </div>
      </div>

      {/* Common Domains Quick Test */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Quick Test - Common UC Domains</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
          {commonDomains.map((domain) => (
            <button
              key={domain}
              onClick={() => setDnsForm({ ...dnsForm, domain })}
              className="px-3 py-2 text-sm text-blue-600 bg-blue-50 rounded-md hover:bg-blue-100 transition-colors"
            >
              {domain}
            </button>
          ))}
        </div>
      </div>
    </div>
  );

  const renderPublicIP = () => (
    <div className="space-y-6">
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8 text-center">
        <Globe className="w-16 h-16 text-blue-500 mx-auto mb-4" />
        <h3 className="text-xl font-semibold text-gray-900 mb-4">Your Public IP Address</h3>
        
        {publicIP ? (
          <div className="space-y-4">
            <div className="text-3xl font-mono font-bold text-blue-600 bg-blue-50 rounded-lg py-4 px-6 inline-block">
              {publicIP}
            </div>
            <p className="text-gray-600">This is your external IP address as seen by internet services</p>
          </div>
        ) : (
          <div className="space-y-4">
            <p className="text-gray-600 mb-4">Click the button below to detect your public IP address</p>
            <button
              onClick={handleGetPublicIP}
              disabled={publicIPLoading}
              className="px-6 py-3 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 disabled:opacity-50 flex items-center justify-center mx-auto"
            >
              {publicIPLoading ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Detecting...
                </>
              ) : (
                <>
                  <Globe className="w-4 h-4 mr-2" />
                  Get My Public IP
                </>
              )}
            </button>
          </div>
        )}
      </div>
    </div>
  );

  const renderCommonPorts = () => (
    <div className="space-y-6">
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Common UC Ports Reference</h3>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Service
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Port
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Description
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Action
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {commonPorts.map((portInfo) => (
                <tr key={`${portInfo.name}-${portInfo.port}`}>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                    {portInfo.name}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 font-mono">
                    {portInfo.port}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-500">
                    {portInfo.description}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <button
                      onClick={() => {
                        setPortCheckForm({ host: 'pool1.contoso.com', port: portInfo.port.toString() });
                        setActiveTab('port-checker');
                      }}
                      className="text-blue-600 hover:text-blue-900"
                    >
                      Test
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );

  const renderContent = () => {
    switch (activeTab) {
      case 'port-checker':
        return renderPortChecker();
      case 'dns-lookup':
        return renderDNSLookup();
      case 'public-ip':
        return renderPublicIP();
      case 'common-ports':
        return renderCommonPorts();
      default:
        return renderPortChecker();
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-900 flex items-center">
          <Network className="w-8 h-8 mr-3" />
          Network Diagnostic Tools
        </h2>
        <p className="text-gray-500 mt-1">Test network connectivity and diagnose UC infrastructure</p>
      </div>

      {/* Tool Navigation */}
      <div className="border-b border-gray-200">
        <nav className="-mb-px flex space-x-8">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`
                  flex items-center py-2 px-1 border-b-2 font-medium text-sm transition-colors
                  ${isActive
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }
                `}
              >
                <Icon className="w-4 h-4 mr-2" />
                {tab.label}
              </button>
            );
          })}
        </nav>
      </div>

      {/* Tool Content */}
      {renderContent()}
    </div>
  );
};