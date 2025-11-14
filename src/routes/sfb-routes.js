const express = require('express');
const router = express.Router();
const { v4: uuidv4 } = require('uuid');

// Import authentication middleware from main API routes
const { getDatabaseInstance } = require('../lib/databaseFactory');

// Import SfB file monitor (will be lazy loaded to avoid import issues)
let SfBFileMonitor;
try {
  const { SfBFileMonitor: SfBFileMonitorClass } = require('../lib/sfbFileMonitor');
  SfBFileMonitor = SfBFileMonitorClass;
} catch (error) {
  console.warn('SfB file monitor not available:', error.message);
}

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
const auditLog = (action, type = 'sfb') => {
  return (req, res, next) => {
    const originalSend = res.send;
    res.send = function(data) {
      if (res.statusCode >= 200 && res.statusCode < 400) {
        try {
          const db = getDatabaseInstance();
          db.insertAuditEntry({
            action: `SfB User Management: ${action} - ${req.method} ${req.originalUrl}`,
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
          console.error('Failed to log SfB audit entry:', error);
        }
      }
      return originalSend.call(this, data);
    };
    next();
  };
};

// SfB Users Management Routes

// Search SfB users (offline/online)
router.get('/users/search', authenticateToken, auditLog('Search SfB users'), async (req, res) => {
  try {
    const { 
      query = '', 
      dataSource = 'both', // 'offline', 'online', 'both'
      limit = 100,
      enabled = null,
      voiceEnabled = null
    } = req.query;

    const db = getDatabaseInstance();
    let users = [];

    if (dataSource === 'offline' || dataSource === 'both') {
      const offlineUsers = db.searchSfBUsers(query, 'offline');
      users = users.concat(offlineUsers);
    }

    if (dataSource === 'online' || dataSource === 'both') {
      // TODO: Implement online search when online database integration is added
      console.log('Online search not yet implemented');
    }

    // Apply additional filters
    if (enabled !== null) {
      const enabledFilter = enabled === 'true' || enabled === '1';
      users = users.filter(user => user.enabled === enabledFilter);
    }

    if (voiceEnabled !== null) {
      const voiceFilter = voiceEnabled === 'true' || voiceEnabled === '1';
      users = users.filter(user => user.enterprise_voice_enabled === voiceFilter);
    }

    // Apply limit
    if (limit && parseInt(limit) > 0) {
      users = users.slice(0, parseInt(limit));
    }

    res.json({
      success: true,
      data: users,
      count: users.length,
      query: {
        searchQuery: query,
        dataSource,
        limit: parseInt(limit),
        filters: {
          enabled: enabled !== null ? (enabled === 'true' || enabled === '1') : null,
          voiceEnabled: voiceEnabled !== null ? (voiceEnabled === 'true' || voiceEnabled === '1') : null
        }
      }
    });

  } catch (error) {
    console.error('Failed to search SfB users:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to search SfB users',
      message: error.message
    });
  }
});

// Get SfB user by ID
router.get('/users/:id', authenticateToken, auditLog('Get SfB user'), async (req, res) => {
  try {
    const { id } = req.params;
    const db = getDatabaseInstance();
    
    const user = db.getSfBUserById(id);
    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'User not found',
        message: `SfB user with ID ${id} not found`
      });
    }

    // Get correlations for this user
    const correlations = db.getSfBPhoneCorrelationsByUserId(id);

    res.json({
      success: true,
      data: {
        ...user,
        phoneCorrelations: correlations
      }
    });

  } catch (error) {
    console.error('Failed to get SfB user:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get SfB user',
      message: error.message
    });
  }
});

// Sync offline files with database
router.post('/users/sync', authenticateToken, auditLog('Sync SfB users'), async (req, res) => {
  try {
    const { forceResync = false } = req.body;

    // Start file monitoring if not already running
    const monitor = sfbFileMonitor;
    const status = monitor.getStatus();
    
    if (!status.isMonitoring) {
      await monitor.startMonitoring();
    }

    // Force a file scan
    await monitor.scanForFiles();

    // Get the latest file and process it if needed
    const latestFile = await monitor.getLatestFile();
    
    if (!latestFile) {
      return res.json({
        success: true,
        message: 'No SfB files found to sync',
        data: {
          filesProcessed: 0,
          recordsProcessed: 0
        }
      });
    }

    let result = null;
    if (forceResync || latestFile.processing_status !== 'completed') {
      result = await monitor.processFile(latestFile.file_path, true);
    }

    res.json({
      success: true,
      message: result ? 'File sync completed' : 'Files already up to date',
      data: {
        latestFile: {
          fileName: latestFile.file_name,
          lastModified: latestFile.last_modified,
          processingStatus: latestFile.processing_status
        },
        syncResult: result
      }
    });

  } catch (error) {
    console.error('Failed to sync SfB users:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to sync SfB users',
      message: error.message
    });
  }
});

// Phone Number Correlations Routes

// Get all phone number correlations
router.get('/correlations', authenticateToken, auditLog('Get SfB phone correlations'), async (req, res) => {
  try {
    const { phoneNumber, userId, correlationType } = req.query;
    const db = getDatabaseInstance();
    
    let correlations = [];

    if (phoneNumber) {
      correlations = db.getSfBPhoneCorrelationsByPhoneNumber(phoneNumber);
    } else if (userId) {
      correlations = db.getSfBPhoneCorrelationsByUserId(userId);
    } else {
      correlations = db.getAllSfBPhoneCorrelations();
    }

    // Filter by correlation type if specified
    if (correlationType) {
      correlations = correlations.filter(c => c.correlation_type === correlationType);
    }

    res.json({
      success: true,
      data: correlations,
      count: correlations.length,
      filters: {
        phoneNumber: phoneNumber || null,
        userId: userId || null,
        correlationType: correlationType || null
      }
    });

  } catch (error) {
    console.error('Failed to get SfB phone correlations:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get phone correlations',
      message: error.message
    });
  }
});

// Create manual phone number correlation
router.post('/correlations', authenticateToken, auditLog('Create SfB phone correlation'), async (req, res) => {
  try {
    const { phoneNumber, sfbUserId, notes, phoneNumberId } = req.body;

    if (!phoneNumber || !sfbUserId) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields',
        message: 'phoneNumber and sfbUserId are required'
      });
    }

    const db = getDatabaseInstance();
    
    // Verify the SfB user exists
    const sfbUser = db.getSfBUserById(sfbUserId);
    if (!sfbUser) {
      return res.status(404).json({
        success: false,
        error: 'SfB user not found',
        message: `SfB user with ID ${sfbUserId} not found`
      });
    }

    // Check if correlation already exists
    const existingCorrelations = db.getSfBPhoneCorrelationsByUserId(sfbUserId);
    const existingForPhone = existingCorrelations.find(c => c.phone_number === phoneNumber);
    
    if (existingForPhone) {
      return res.status(409).json({
        success: false,
        error: 'Correlation already exists',
        message: `Phone number ${phoneNumber} is already correlated with this SfB user`
      });
    }

    // Create the correlation
    const correlation = db.insertSfBPhoneCorrelation({
      phone_number_id: phoneNumberId || null,
      phone_number: phoneNumber,
      sfb_user_id: sfbUserId,
      line_uri: sfbUser.line_uri,
      correlation_type: 'manual',
      confidence_score: 1.0,
      correlation_method: 'manual_entry',
      notes: notes || null,
      verified_by: req.user.username,
      verified_at: new Date().toISOString()
    });

    res.json({
      success: true,
      message: 'Phone number correlation created successfully',
      data: correlation
    });

  } catch (error) {
    console.error('Failed to create SfB phone correlation:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to create phone correlation',
      message: error.message
    });
  }
});

// Update phone correlation (verify/modify)
router.put('/correlations/:id', authenticateToken, auditLog('Update SfB phone correlation'), async (req, res) => {
  try {
    const { id } = req.params;
    const { correlationType, confidenceScore, notes, verified } = req.body;
    const db = getDatabaseInstance();

    const updates = {};
    
    if (correlationType) {
      updates.correlation_type = correlationType;
    }
    
    if (confidenceScore !== undefined) {
      updates.confidence_score = parseFloat(confidenceScore);
    }
    
    if (notes !== undefined) {
      updates.notes = notes;
    }
    
    if (verified === true) {
      updates.correlation_type = 'verified';
      updates.verified_by = req.user.username;
      updates.verified_at = new Date().toISOString();
    }

    const correlation = db.updateSfBPhoneCorrelation(id, updates);
    
    if (!correlation) {
      return res.status(404).json({
        success: false,
        error: 'Correlation not found',
        message: `Phone correlation with ID ${id} not found`
      });
    }

    res.json({
      success: true,
      message: 'Phone correlation updated successfully',
      data: correlation
    });

  } catch (error) {
    console.error('Failed to update SfB phone correlation:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update phone correlation',
      message: error.message
    });
  }
});

// File Management Routes

// Get latest SfbEnabledObjects file info
router.get('/files/latest', authenticateToken, auditLog('Get latest SfB file'), async (req, res) => {
  try {
    const monitor = sfbFileMonitor;
    const latestFile = await monitor.getLatestFile();

    if (!latestFile) {
      return res.json({
        success: true,
        message: 'No SfB files found',
        data: null
      });
    }

    res.json({
      success: true,
      data: latestFile
    });

  } catch (error) {
    console.error('Failed to get latest SfB file:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get latest file info',
      message: error.message
    });
  }
});

// Get file monitor history
router.get('/files/history', authenticateToken, auditLog('Get SfB file history'), async (req, res) => {
  try {
    const { limit = 20 } = req.query;
    const monitor = sfbFileMonitor;
    const fileHistory = await monitor.getFileHistory();

    // Apply limit
    const limitedHistory = fileHistory.slice(0, parseInt(limit));

    res.json({
      success: true,
      data: limitedHistory,
      count: limitedHistory.length,
      total: fileHistory.length
    });

  } catch (error) {
    console.error('Failed to get SfB file history:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get file history',
      message: error.message
    });
  }
});

// Get sync history
router.get('/sync/history', authenticateToken, auditLog('Get SfB sync history'), async (req, res) => {
  try {
    const { limit = 50 } = req.query;
    const monitor = sfbFileMonitor;
    const syncHistory = await monitor.getSyncHistory();

    // Apply limit
    const limitedHistory = syncHistory.slice(0, parseInt(limit));

    res.json({
      success: true,
      data: limitedHistory,
      count: limitedHistory.length
    });

  } catch (error) {
    console.error('Failed to get SfB sync history:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get sync history',
      message: error.message
    });
  }
});

// File monitor control routes

// Start file monitoring
router.post('/monitor/start', authenticateToken, auditLog('Start SfB file monitor'), async (req, res) => {
  try {
    const monitor = sfbFileMonitor;
    const status = monitor.getStatus();

    if (status.isMonitoring) {
      return res.json({
        success: true,
        message: 'File monitor is already running',
        data: status
      });
    }

    await monitor.startMonitoring();

    res.json({
      success: true,
      message: 'File monitor started successfully',
      data: monitor.getStatus()
    });

  } catch (error) {
    console.error('Failed to start SfB file monitor:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to start file monitor',
      message: error.message
    });
  }
});

// Stop file monitoring
router.post('/monitor/stop', authenticateToken, auditLog('Stop SfB file monitor'), async (req, res) => {
  try {
    const monitor = sfbFileMonitor;
    monitor.stopMonitoring();

    res.json({
      success: true,
      message: 'File monitor stopped successfully',
      data: monitor.getStatus()
    });

  } catch (error) {
    console.error('Failed to stop SfB file monitor:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to stop file monitor',
      message: error.message
    });
  }
});

// Get file monitor status
router.get('/monitor/status', authenticateToken, auditLog('Get SfB monitor status'), async (req, res) => {
  try {
    const monitor = sfbFileMonitor;
    const status = monitor.getStatus();
    const db = getDatabaseInstance();
    
    // Get statistics
    const stats = db.getSfBStatistics();

    res.json({
      success: true,
      data: {
        monitor: status,
        statistics: stats,
        lastSync: await monitor.getLatestFile()
      }
    });

  } catch (error) {
    console.error('Failed to get SfB monitor status:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get monitor status',
      message: error.message
    });
  }
});

// Statistics and Overview Routes

// Get SfB statistics
router.get('/statistics', authenticateToken, auditLog('Get SfB statistics'), async (req, res) => {
  try {
    const db = getDatabaseInstance();
    const stats = db.getSfBStatistics();

    res.json({
      success: true,
      data: stats
    });

  } catch (error) {
    console.error('Failed to get SfB statistics:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get statistics',
      message: error.message
    });
  }
});

// Get SfB overview (for dashboard)
router.get('/overview', authenticateToken, auditLog('Get SfB overview'), async (req, res) => {
  try {
    const db = getDatabaseInstance();
    const monitor = sfbFileMonitor;
    
    const stats = db.getSfBStatistics();
    const latestFile = await monitor.getLatestFile();
    const recentActivity = db.getSfBSyncHistory(10);

    res.json({
      success: true,
      data: {
        statistics: stats,
        latestFile: latestFile,
        recentActivity: recentActivity,
        monitorStatus: monitor.getStatus()
      }
    });

  } catch (error) {
    console.error('Failed to get SfB overview:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get overview',
      message: error.message
    });
  }
});

module.exports = router;