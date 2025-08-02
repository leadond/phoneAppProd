const express = require('express');
const bcrypt = require('bcrypt');
const router = express.Router();

// Import managers and database
const { SessionManager } = require('../lib/sessionManager');
const { LockManager } = require('../lib/lockManager');
const { getDatabaseInstance } = require('../lib/databaseFactory');

// Import UC Admin Tools routes
const ucRoutes = require('./uc-routes');

// Authentication middleware
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers.authorization;
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ 
      error: 'Access token required',
      message: 'Please provide a valid authorization token'
    });
  }

  const session = SessionManager.validateSession(token);
  if (!session) {
    return res.status(401).json({ 
      error: 'Invalid or expired token',
      message: 'Please log in again'
    });
  }

  req.user = session;
  next();
};

// Optional authentication middleware (allows both authenticated and unauthenticated access)
const optionalAuth = (req, res, next) => {
  const authHeader = req.headers.authorization;
  const token = authHeader && authHeader.split(' ')[1];

  if (token) {
    const session = SessionManager.validateSession(token);
    if (session) {
      req.user = session;
    }
  }

  next();
};

// Logging middleware for audit trail
const auditLog = (action, type = 'api') => {
  return (req, res, next) => {
    const originalSend = res.send;
    res.send = function(data) {
      // Log successful API calls
      if (res.statusCode >= 200 && res.statusCode < 400) {
        try {
          const db = getDatabaseInstance();
          db.insertAuditEntry({
            action: `${action} - ${req.method} ${req.originalUrl}`,
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
          console.error('Failed to log audit entry:', error);
        }
      }
      return originalSend.call(this, data);
    };
    next();
  };
};

// Authentication routes
router.post('/auth/login', auditLog('User login attempt', 'auth'), async (req, res) => {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({
        error: 'Missing credentials',
        message: 'Username and password are required'
      });
    }

    const db = getDatabaseInstance();
    const user = db.getUserByUsername(username);

    if (!user) {
      return res.status(401).json({
        error: 'Invalid credentials',
        message: 'Username or password is incorrect'
      });
    }

    // Verify password
    const validPassword = await bcrypt.compare(password, user.password_hash);
    if (!validPassword) {
      return res.status(401).json({
        error: 'Invalid credentials',
        message: 'Username or password is incorrect'
      });
    }

    // Create session
    const session = SessionManager.createSession(
      username,
      req.ip,
      req.get('User-Agent') || 'Unknown'
    );

    // Update last login in database
    db.createOrUpdateSession(username, session.token, session.expires.toISOString());

    res.json({
      token: session.token,
      user: {
        username: user.username,
        lastLogin: session.createdAt
      },
      expiresAt: session.expires.toISOString()
    });

  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({
      error: 'Login failed',
      message: 'An error occurred during login'
    });
  }
});

router.post('/auth/logout', authenticateToken, auditLog('User logout', 'auth'), (req, res) => {
  try {
    const db = getDatabaseInstance();
    
    // Clear session in database
    db.clearSession(req.user.username);
    
    // Revoke session in memory
    SessionManager.revokeSession(req.user.token);
    
    // Release any locks held by this user
    LockManager.releaseUserLocks(req.user.username);

    res.json({ 
      message: 'Logged out successfully',
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Logout error:', error);
    res.status(500).json({
      error: 'Logout failed',
      message: 'An error occurred during logout'
    });
  }
});

router.get('/auth/session', authenticateToken, (req, res) => {
  try {
    // Refresh session
    const refreshedSession = SessionManager.refreshSession(req.user.token);
    
    if (!refreshedSession) {
      return res.status(401).json({
        error: 'Session expired',
        message: 'Please log in again'
      });
    }

    res.json({
      user: {
        username: refreshedSession.username,
        lastActivity: refreshedSession.lastActivity
      },
      expiresAt: refreshedSession.expires.toISOString(),
      sessionId: refreshedSession.id
    });

  } catch (error) {
    console.error('Session check error:', error);
    res.status(500).json({
      error: 'Session check failed',
      message: 'An error occurred while checking session'
    });
  }
});

// Phone Numbers routes
router.get('/phone-numbers', authenticateToken, auditLog('Get phone numbers'), async (req, res) => {
  try {
    const db = getDatabaseInstance();
    const phoneNumbers = db.getAllPhoneNumbers();
    
    res.json({
      data: phoneNumbers,
      count: phoneNumbers.length,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Get phone numbers error:', error);
    res.status(500).json({
      error: 'Failed to fetch phone numbers',
      message: 'An error occurred while retrieving phone numbers'
    });
  }
});

router.post('/phone-numbers', authenticateToken, auditLog('Add phone number'), async (req, res) => {
  try {
    const db = getDatabaseInstance();
    const phoneNumber = req.body;

    // Acquire lock for phone number creation
    const lockAcquired = await LockManager.acquireLock(
      `phone-numbers-create`,
      req.user.username,
      5000 // 5 second timeout
    );

    if (!lockAcquired) {
      return res.status(409).json({
        error: 'Resource locked',
        message: 'Another user is currently adding phone numbers'
      });
    }

    try {
      const newPhoneNumber = db.insertPhoneNumber(phoneNumber);
      res.status(201).json({
        data: newPhoneNumber,
        message: 'Phone number added successfully'
      });
    } finally {
      LockManager.releaseLock(`phone-numbers-create`, req.user.username);
    }

  } catch (error) {
    console.error('Add phone number error:', error);
    res.status(500).json({
      error: 'Failed to add phone number',
      message: error.message || 'An error occurred while adding the phone number'
    });
  }
});

router.put('/phone-numbers/:id', authenticateToken, auditLog('Update phone number'), async (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;
    const db = getDatabaseInstance();

    // Acquire lock for specific phone number
    const lockAcquired = await LockManager.acquireLock(
      `phone-number-${id}`,
      req.user.username,
      10000 // 10 second timeout
    );

    if (!lockAcquired) {
      const lockOwner = LockManager.getLockOwner(`phone-number-${id}`);
      return res.status(409).json({
        error: 'Resource locked',
        message: `Phone number is currently being edited by ${lockOwner || 'another user'}`
      });
    }

    try {
      const updatedPhoneNumber = db.updatePhoneNumber(id, updates);
      
      if (!updatedPhoneNumber) {
        return res.status(404).json({
          error: 'Phone number not found',
          message: `Phone number with ID ${id} does not exist`
        });
      }

      res.json({
        data: updatedPhoneNumber,
        message: 'Phone number updated successfully'
      });
    } finally {
      LockManager.releaseLock(`phone-number-${id}`, req.user.username);
    }

  } catch (error) {
    console.error('Update phone number error:', error);
    res.status(500).json({
      error: 'Failed to update phone number',
      message: error.message || 'An error occurred while updating the phone number'
    });
  }
});

router.delete('/phone-numbers/:id', authenticateToken, auditLog('Delete phone number'), async (req, res) => {
  try {
    const { id } = req.params;
    const db = getDatabaseInstance();

    // Acquire lock for phone number deletion
    const lockAcquired = await LockManager.acquireLock(
      `phone-number-${id}`,
      req.user.username,
      5000
    );

    if (!lockAcquired) {
      return res.status(409).json({
        error: 'Resource locked',
        message: 'Phone number is currently being edited by another user'
      });
    }

    try {
      const success = db.deletePhoneNumber(id);
      
      if (!success) {
        return res.status(404).json({
          error: 'Phone number not found',
          message: `Phone number with ID ${id} does not exist`
        });
      }

      res.json({
        message: 'Phone number deleted successfully',
        deletedId: id
      });
    } finally {
      LockManager.releaseLock(`phone-number-${id}`, req.user.username);
    }

  } catch (error) {
    console.error('Delete phone number error:', error);
    res.status(500).json({
      error: 'Failed to delete phone number',
      message: error.message || 'An error occurred while deleting the phone number'
    });
  }
});

// Bulk operations for phone numbers
router.post('/phone-numbers/bulk', authenticateToken, auditLog('Bulk phone number operation'), async (req, res) => {
  try {
    const { operation, data } = req.body;
    const db = getDatabaseInstance();

    // Acquire global lock for bulk operations
    const lockAcquired = await LockManager.acquireLock(
      'bulk-operations',
      req.user.username,
      30000 // 30 second timeout for bulk operations
    );

    if (!lockAcquired) {
      return res.status(409).json({
        error: 'Bulk operation in progress',
        message: 'Another bulk operation is currently running'
      });
    }

    try {
      let result;
      
      switch (operation) {
        case 'import':
          result = db.bulkInsertPhoneNumbers(data);
          break;
        default:
          return res.status(400).json({
            error: 'Invalid operation',
            message: `Operation '${operation}' is not supported`
          });
      }

      res.json({
        data: result,
        operation,
        message: 'Bulk operation completed successfully'
      });
    } finally {
      LockManager.releaseLock('bulk-operations', req.user.username);
    }

  } catch (error) {
    console.error('Bulk operation error:', error);
    res.status(500).json({
      error: 'Bulk operation failed',
      message: error.message || 'An error occurred during bulk operation'
    });
  }
});

// Number Ranges routes
router.get('/number-ranges', authenticateToken, auditLog('Get number ranges'), (req, res) => {
  try {
    const db = getDatabaseInstance();
    const ranges = db.getAllNumberRanges();
    
    res.json({
      data: ranges,
      count: ranges.length,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Get number ranges error:', error);
    res.status(500).json({
      error: 'Failed to fetch number ranges',
      message: 'An error occurred while retrieving number ranges'
    });
  }
});

router.post('/number-ranges', authenticateToken, auditLog('Add number range'), (req, res) => {
  try {
    const db = getDatabaseInstance();
    const range = req.body;
    
    const newRange = db.insertNumberRange(range);
    
    res.status(201).json({
      data: newRange,
      message: 'Number range added successfully'
    });

  } catch (error) {
    console.error('Add number range error:', error);
    res.status(500).json({
      error: 'Failed to add number range',
      message: error.message || 'An error occurred while adding the number range'
    });
  }
});

// Statistics and Analytics
router.get('/statistics', optionalAuth, auditLog('Get statistics'), (req, res) => {
  try {
    const db = getDatabaseInstance();
    const stats = db.getStatistics();
    
    // Add session and lock statistics
    const sessionStats = SessionManager.getSessionStats();
    const lockStats = LockManager.getLockStats();
    
    res.json({
      data: {
        database: stats,
        sessions: sessionStats,
        locks: lockStats,
        timestamp: new Date().toISOString()
      }
    });

  } catch (error) {
    console.error('Get statistics error:', error);
    res.status(500).json({
      error: 'Failed to fetch statistics',
      message: 'An error occurred while retrieving statistics'
    });
  }
});

// Audit Log
router.get('/audit-log', authenticateToken, auditLog('Get audit log'), (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 100;
    const db = getDatabaseInstance();
    const auditEntries = db.getAllAuditEntries(limit);
    
    res.json({
      data: auditEntries,
      count: auditEntries.length,
      limit: limit,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Get audit log error:', error);
    res.status(500).json({
      error: 'Failed to fetch audit log',
      message: 'An error occurred while retrieving audit log'
    });
  }
});

// System Administration routes
router.get('/admin/sessions', authenticateToken, auditLog('Get active sessions', 'admin'), (req, res) => {
  try {
    // Only admin users can view all sessions (you may want to add role checking)
    const sessions = SessionManager.getActiveSessions();
    
    res.json({
      data: sessions.map(session => ({
        id: session.id,
        username: session.username,
        lastActivity: session.lastActivity,
        expires: session.expires,
        ipAddress: session.ipAddress,
        userAgent: session.userAgent
      })),
      count: sessions.length
    });

  } catch (error) {
    console.error('Get sessions error:', error);
    res.status(500).json({
      error: 'Failed to fetch sessions',
      message: 'An error occurred while retrieving sessions'
    });
  }
});

router.get('/admin/locks', authenticateToken, auditLog('Get active locks', 'admin'), (req, res) => {
  try {
    const locks = LockManager.getAllLocks();
    
    res.json({
      data: locks,
      count: locks.length
    });

  } catch (error) {
    console.error('Get locks error:', error);
    res.status(500).json({
      error: 'Failed to fetch locks',
      message: 'An error occurred while retrieving locks'
    });
  }
});

// Database health check
router.get('/health/database', optionalAuth, (req, res) => {
  try {
    const db = getDatabaseInstance();
    const isHealthy = db.healthCheck();
    
    res.status(isHealthy ? 200 : 503).json({
      status: isHealthy ? 'healthy' : 'unhealthy',
      timestamp: new Date().toISOString(),
      checks: {
        database: isHealthy,
        sessions: SessionManager.getSessionCount(),
        locks: LockManager.getLockStats().totalLocks
      }
    });

  } catch (error) {
    console.error('Database health check error:', error);
    res.status(503).json({
      status: 'unhealthy',
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

// Mount UC Admin Tools routes
router.use('/uc', ucRoutes);

// Error handling for API routes
router.use((error, req, res, next) => {
  console.error('API Error:', {
    error: error.message,
    stack: error.stack,
    method: req.method,
    url: req.originalUrl,
    user: req.user ? req.user.username : 'anonymous',
    timestamp: new Date().toISOString()
  });

  res.status(error.status || 500).json({
    error: error.message || 'Internal Server Error',
    timestamp: new Date().toISOString()
  });
});

module.exports = router;