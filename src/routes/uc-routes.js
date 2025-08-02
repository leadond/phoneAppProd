const express = require('express');
const router = express.Router();
const path = require('path');
const fs = require('fs').promises;
const { v4: uuidv4 } = require('uuid');
const xml2js = require('xml2js');
const dns = require('dns').promises;
const net = require('net');
const axios = require('axios');

// Import authentication middleware from main API routes
const { getDatabaseInstance } = require('../lib/databaseFactory');

// Authentication middleware - reuse from main API
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers.authorization;
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ 
      error: 'Access token required',
      message: 'Please provide a valid authorization token'
    });
  }

  try {
    const { SessionManager } = require('../lib/sessionManager');
    const session = SessionManager.validateSession(token);
    if (!session) {
      return res.status(401).json({ 
        error: 'Invalid or expired token',
        message: 'Please log in again'
      });
    }
    req.user = session;
    next();
  } catch (error) {
    return res.status(401).json({ 
      error: 'Authentication failed',
      message: 'Please log in again'
    });
  }
};

// Audit logging middleware
const auditLog = (action, type = 'uc') => {
  return (req, res, next) => {
    const originalSend = res.send;
    res.send = function(data) {
      if (res.statusCode >= 200 && res.statusCode < 400) {
        try {
          const db = getDatabaseInstance();
          db.insertAuditEntry({
            action: `UC Admin Tools: ${action} - ${req.method} ${req.originalUrl}`,
            user: req.user ? req.user.username : 'anonymous',
            type: type,
            details: {
              method: req.method,
              url: req.originalUrl,
              ip: req.ip,
              userAgent: req.get('User-Agent'),
              statusCode: res.statusCode
            }
          });
        } catch (error) {
          console.error('Failed to log UC audit entry:', error);
        }
      }
      return originalSend.call(this, data);
    };
    next();
  };
};

// Configuration directory setup
const CONFIG_DIR = path.join(process.cwd(), 'uc-configs');

// Ensure UC configuration directory exists
const ensureConfigDir = async () => {
  try {
    await fs.access(CONFIG_DIR);
  } catch (error) {
    await fs.mkdir(CONFIG_DIR, { recursive: true });
    console.log('Created UC configuration directory:', CONFIG_DIR);
  }
};

// Initialize configuration directory
ensureConfigDir();

// UC Configuration Management Routes

// Get all configuration files
router.get('/config/files', authenticateToken, auditLog('List configuration files'), async (req, res) => {
  try {
    await ensureConfigDir();
    const files = await fs.readdir(CONFIG_DIR);
    const xmlFiles = files.filter(file => file.endsWith('.xml'));
    
    const configFiles = await Promise.all(
      xmlFiles.map(async (filename) => {
        const filePath = path.join(CONFIG_DIR, filename);
        const stats = await fs.stat(filePath);
        return {
          name: path.parse(filename).name,
          filename: filename,
          path: filename,
          lastModified: stats.mtime.toISOString(),
          size: stats.size,
          isActive: filename === 'uc_config.xml'
        };
      })
    );

    res.json({
      success: true,
      data: configFiles.sort((a, b) => a.name.localeCompare(b.name)),
      count: configFiles.length
    });

  } catch (error) {
    console.error('Failed to list configuration files:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to list configuration files',
      message: error.message
    });
  }
});

// Load a specific configuration file
router.get('/config/:filename?', authenticateToken, auditLog('Load configuration'), async (req, res) => {
  try {
    const filename = req.params.filename || 'uc_config.xml';
    const filePath = path.join(CONFIG_DIR, filename);
    
    // Check if file exists, create default if not
    try {
      await fs.access(filePath);
    } catch (error) {
      if (filename === 'uc_config.xml') {
        await createDefaultConfig(filePath);
      } else {
        return res.status(404).json({
          success: false,
          error: 'Configuration file not found',
          message: `File ${filename} does not exist`
        });
      }
    }

    const xmlContent = await fs.readFile(filePath, 'utf8');
    const parser = new xml2js.Parser({ explicitArray: false });
    const result = await parser.parseStringPromise(xmlContent);

    const config = parseConfigXML(result);
    
    res.json({
      success: true,
      data: config,
      filename: filename,
      message: `Configuration loaded from ${filename}`
    });

  } catch (error) {
    console.error('Failed to load configuration:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to load configuration',
      message: error.message
    });
  }
});

// Save configuration
router.post('/config/save', authenticateToken, auditLog('Save configuration'), async (req, res) => {
  try {
    const { config, filename = 'uc_config.xml' } = req.body;
    
    if (!config) {
      return res.status(400).json({
        success: false,
        error: 'Missing configuration data',
        message: 'Configuration data is required'
      });
    }

    const xmlConfig = buildConfigXML(config);
    const builder = new xml2js.Builder({ 
      xmldec: { version: '1.0', encoding: 'utf-8' },
      renderOpts: { pretty: true, indent: '  ' }
    });
    const xmlContent = builder.buildObject(xmlConfig);

    const filePath = path.join(CONFIG_DIR, filename);
    await fs.writeFile(filePath, xmlContent, 'utf8');

    // Store configuration in database for history
    const db = getDatabaseInstance();
    db.insertAuditEntry({
      action: `UC Configuration saved to ${filename}`,
      user: req.user.username,
      type: 'uc',
      details: {
        filename: filename,
        configSummary: {
          sipDomains: config.SIPDomains?.length || 0,
          lyncPools: config.LyncPools?.length || 0,
          frontEndServers: config.FrontEndList?.length || 0
        }
      }
    });

    res.json({
      success: true,
      message: `Configuration saved successfully to ${filename}`,
      filename: filename
    });

  } catch (error) {
    console.error('Failed to save configuration:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to save configuration',
      message: error.message
    });
  }
});

// Create new configuration file
router.post('/config/create', authenticateToken, auditLog('Create configuration'), async (req, res) => {
  try {
    let { filename } = req.body;
    
    if (!filename) {
      return res.status(400).json({
        success: false,
        error: 'Missing filename',
        message: 'Filename is required'
      });
    }

    if (!filename.endsWith('.xml')) {
      filename += '.xml';
    }

    const filePath = path.join(CONFIG_DIR, filename);
    
    // Check if file already exists
    try {
      await fs.access(filePath);
      return res.status(409).json({
        success: false,
        error: 'File already exists',
        message: `Configuration file ${filename} already exists`
      });
    } catch (error) {
      // File doesn't exist, continue with creation
    }

    await createDefaultConfig(filePath);

    res.json({
      success: true,
      message: `Configuration file ${filename} created successfully`,
      filename: filename
    });

  } catch (error) {
    console.error('Failed to create configuration file:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to create configuration file',
      message: error.message
    });
  }
});

// Network Tools Routes

// Port Checker
router.post('/tools/check-port', authenticateToken, auditLog('Port check'), async (req, res) => {
  try {
    const { host, port, timeout = 5000 } = req.body;

    if (!host || !port) {
      return res.status(400).json({
        success: false,
        error: 'Missing parameters',
        message: 'Host and port are required'
      });
    }

    const result = await checkPort(host, parseInt(port), timeout);
    
    res.json({
      success: true,
      data: result
    });

  } catch (error) {
    console.error('Port check failed:', error);
    res.status(500).json({
      success: false,
      error: 'Port check failed',
      message: error.message
    });
  }
});

// DNS Lookup
router.post('/tools/dns-lookup', authenticateToken, auditLog('DNS lookup'), async (req, res) => {
  try {
    const { domain, recordType = 'A', dnsServer } = req.body;

    if (!domain) {
      return res.status(400).json({
        success: false,
        error: 'Missing domain',
        message: 'Domain is required'
      });
    }

    const result = await performDNSLookup(domain, recordType, dnsServer);
    
    res.json({
      success: true,
      data: result
    });

  } catch (error) {
    console.error('DNS lookup failed:', error);
    res.status(500).json({
      success: false,
      error: 'DNS lookup failed',
      message: error.message
    });
  }
});

// Public IP
router.get('/tools/public-ip', authenticateToken, auditLog('Get public IP'), async (req, res) => {
  try {
    const publicIP = await getPublicIP();
    
    res.json({
      success: true,
      data: { ip: publicIP }
    });

  } catch (error) {
    console.error('Failed to get public IP:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get public IP',
      message: error.message
    });
  }
});

// Network Tools Overview
router.get('/tools/overview', authenticateToken, auditLog('Get network tools overview'), async (req, res) => {
  try {
    // Get recent network tool usage from audit log
    const db = getDatabaseInstance();
    const recentActivity = db.getAllAuditEntries(50)
      .filter(entry => entry.type === 'uc' && entry.action.includes('tools'))
      .slice(0, 10);

    res.json({
      success: true,
      data: {
        availableTools: [
          { id: 'port-checker', name: 'Port Checker', description: 'Test connectivity to specific ports' },
          { id: 'dns-lookup', name: 'DNS Lookup', description: 'Perform DNS resolution tests' },
          { id: 'public-ip', name: 'Public IP', description: 'Get your public IP address' }
        ],
        recentActivity: recentActivity.map(entry => ({
          action: entry.action,
          user: entry.user,
          timestamp: entry.timestamp,
          details: entry.details
        }))
      }
    });

  } catch (error) {
    console.error('Failed to get network tools overview:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get overview',
      message: error.message
    });
  }
});

// Helper Functions

// Create default configuration
async function createDefaultConfig(filePath) {
  const defaultConfig = {
    SIPDomains: ['contoso.com', 'fabrikam.com'],
    LyncPools: ['pool1.contoso.com', 'pool2.contoso.com'],
    DialInFQDNs: ['dialin.contoso.com'],
    MeetFQDNs: ['meet.contoso.com'],
    FrontEndList: ['fe1.contoso.com', 'fe2.contoso.com', 'fe3.contoso.com'],
    ExchangeServerList: ['exchange1.contoso.com', 'exchange2.contoso.com'],
    DNSServers: ['8.8.8.8', '8.8.4.4', '1.1.1.1'],
    AccessEdge: 'access.contoso.com',
    WebConfEdge: 'webconf.contoso.com',
    AVEdge: 'av.contoso.com',
    ProxyFQDN: 'proxy.contoso.com',
    SIPPort: 5061,
    WebConfPort: 443,
    AVPort: 443
  };

  const xmlConfig = buildConfigXML(defaultConfig);
  const builder = new xml2js.Builder({ 
    xmldec: { version: '1.0', encoding: 'utf-8' },
    renderOpts: { pretty: true, indent: '  ' }
  });
  const xmlContent = builder.buildObject(xmlConfig);
  
  await fs.writeFile(filePath, xmlContent, 'utf8');
}

// Parse XML configuration to JavaScript object
function parseConfigXML(xmlResult) {
  const general = xmlResult.configuration?.General || {};
  
  return {
    SIPDomains: parseCommaSeparatedValues(general.SIPDomains),
    LyncPools: parseCommaSeparatedValues(general.LyncPools),
    DialInFQDNs: parseCommaSeparatedValues(general.DialInFQDNs),
    MeetFQDNs: parseCommaSeparatedValues(general.MeetFQDNs),
    FrontEndList: parseCommaSeparatedValues(general.FrontEndList),
    ExchangeServerList: parseCommaSeparatedValues(general.ExchangeServerList),
    DNSServers: parseCommaSeparatedValues(general.DNSServers),
    AccessEdge: general.AccessEdge || '',
    WebConfEdge: general.WebConfEdge || '',
    AVEdge: general.AVEdge || '',
    ProxyFQDN: general.ProxyFQDN || '',
    SIPPort: parseInt(general.SIPPort) || 5061,
    WebConfPort: parseInt(general.WebConfPort) || 443,
    AVPort: parseInt(general.AVPort) || 443
  };
}

// Build XML configuration from JavaScript object
function buildConfigXML(config) {
  return {
    configuration: {
      General: {
        SIPDomains: (config.SIPDomains || []).join(','),
        LyncPools: (config.LyncPools || []).join(','),
        DialInFQDNs: (config.DialInFQDNs || []).join(','),
        MeetFQDNs: (config.MeetFQDNs || []).join(','),
        FrontEndList: (config.FrontEndList || []).join(','),
        ExchangeServerList: (config.ExchangeServerList || []).join(','),
        DNSServers: (config.DNSServers || []).join(','),
        AccessEdge: config.AccessEdge || '',
        WebConfEdge: config.WebConfEdge || '',
        AVEdge: config.AVEdge || '',
        ProxyFQDN: config.ProxyFQDN || '',
        SIPPort: config.SIPPort || 5061,
        WebConfPort: config.WebConfPort || 443,
        AVPort: config.AVPort || 443
      }
    }
  };
}

// Parse comma-separated values
function parseCommaSeparatedValues(value) {
  if (!value) return [];
  return String(value).split(',')
    .map(item => item.trim())
    .filter(item => item.length > 0);
}

// Check port connectivity
async function checkPort(host, port, timeoutMs = 5000) {
  return new Promise((resolve) => {
    const result = {
      host,
      port,
      status: 'unknown',
      message: '',
      checkedAt: new Date().toISOString(),
      responseTime: 0
    };

    const startTime = Date.now();
    const socket = new net.Socket();

    const timeout = setTimeout(() => {
      socket.destroy();
      result.status = 'timeout';
      result.message = `Connection to ${host}:${port} timed out after ${timeoutMs}ms`;
      result.responseTime = timeoutMs;
      resolve(result);
    }, timeoutMs);

    socket.on('connect', () => {
      clearTimeout(timeout);
      socket.destroy();
      result.status = 'open';
      result.message = `Port ${port} is open on ${host}`;
      result.responseTime = Date.now() - startTime;
      resolve(result);
    });

    socket.on('error', (error) => {
      clearTimeout(timeout);
      socket.destroy();
      result.status = 'closed';
      result.message = `Port ${port} is closed on ${host}: ${error.message}`;
      result.responseTime = Date.now() - startTime;
      resolve(result);
    });

    socket.connect(port, host);
  });
}

// Perform DNS lookup
async function performDNSLookup(domain, recordType = 'A', dnsServer = null) {
  const result = {
    domain,
    recordType,
    dnsServer: dnsServer || 'System Default',
    results: [],
    status: 'unknown',
    lookupTime: new Date().toISOString(),
    responseTime: 0
  };

  const startTime = Date.now();

  try {
    let addresses = [];

    switch (recordType.toUpperCase()) {
      case 'A':
        addresses = await dns.resolve4(domain);
        break;
      case 'AAAA':
        addresses = await dns.resolve6(domain);
        break;
      case 'CNAME':
        addresses = await dns.resolveCname(domain);
        break;
      case 'MX':
        const mxRecords = await dns.resolveMx(domain);
        addresses = mxRecords.map(mx => `${mx.priority} ${mx.exchange}`);
        break;
      case 'TXT':
        const txtRecords = await dns.resolveTxt(domain);
        addresses = txtRecords.map(txt => txt.join(' '));
        break;
      default:
        throw new Error(`Unsupported record type: ${recordType}`);
    }

    result.results = addresses;
    result.status = addresses.length > 0 ? 'success' : 'no_records';
    result.responseTime = Date.now() - startTime;

  } catch (error) {
    result.status = 'error';
    result.results = [error.message];
    result.responseTime = Date.now() - startTime;
  }

  return result;
}

// Get public IP address
async function getPublicIP() {
  try {
    const response = await axios.get('https://api.ipify.org?format=json', {
      timeout: 10000
    });
    return response.data.ip;
  } catch (error) {
    // Fallback to alternative service
    try {
      const response = await axios.get('https://icanhazip.com', {
        timeout: 10000
      });
      return response.data.trim();
    } catch (fallbackError) {
      throw new Error('Unable to retrieve public IP address');
    }
  }
}

module.exports = router;