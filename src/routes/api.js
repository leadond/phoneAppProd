const express = require('express');
const multer = require('multer');
const { parse } = require('csv-parse');
const fs = require('fs');
const path = require('path');
const bcrypt = require('bcrypt');

// Import our libraries
const { localDatabase } = require('../lib/localDatabase');
const authMiddleware = require('../middleware/authMiddleware');
const { SessionManager } = require('../lib/sessionManager');
const { LockManager } = require('../lib/lockManager');
const { getDatabaseInstance } = require('../lib/databaseFactory');

// Import sub-routes
const ucRoutes = require('./uc-routes');
const sfbRoutes = require('./sfb-routes');

const router = express.Router();
const upload = multer({ dest: 'uploads/' });

// Ensure uploads directory exists
if (!fs.existsSync('uploads')) {
  fs.mkdirSync('uploads');
}

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

  // SessionManager might be undefined if import failed (plain node)
  if (!SessionManager) {
      console.error("SessionManager is not available.");
      return res.status(500).json({ error: "Server configuration error" });
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

const optionalAuth = (req, res, next) => {
  const authHeader = req.headers.authorization;
  const token = authHeader && authHeader.split(' ')[1];

  if (token && SessionManager) {
    const session = SessionManager.validateSession(token);
    if (session) {
      req.user = session;
    }
  }
  next();
};

// Logging middleware
const auditLog = (action, type = 'api') => {
  return (req, res, next) => {
    const originalSend = res.send;
    res.send = function(data) {
      if (res.statusCode >= 200 && res.statusCode < 400) {
        try {
          const db = getDatabaseInstance();
          if (db) {
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
          }
        } catch (error) {
          console.error('Failed to log audit entry:', error);
        }
      }
      return originalSend.call(this, data);
    };
    next();
  };
};

// --- ROUTES ---

// Upload Route
router.post('/upload', authenticateToken, upload.single('file'), async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: 'No file uploaded' });
  }

  const results = [];
  const filePath = req.file.path;

  try {
    fs.createReadStream(filePath)
      .pipe(parse({ columns: true, trim: true }))
      .on('data', (data) => results.push(data))
      .on('error', (error) => {
        console.error('CSV parsing error:', error);
        res.status(500).json({ error: 'Failed to parse CSV file' });
      })
      .on('end', async () => {
        fs.unlinkSync(filePath);
        let successCount = 0;
        let errorCount = 0;
        const errors = [];

        for (const row of results) {
          try {
            const phoneNumber = {
              number: row.number || row.phone || row.phoneNumber,
              extension: row.extension || row.ext,
              carrier: row.carrier,
              department: row.department || row.dept,
              assigned_to: row.assignedTo || row.assigned_to,
              notes: row.notes,
              system: row.system,
              location: row.location,
              status: row.status || 'available',
            };

            if (phoneNumber.number) {
               // Use localDatabase directly if possible, or get instance
               const db = getDatabaseInstance();
               if (db) {
                   db.insertPhoneNumber(phoneNumber);
               } else if (localDatabase) {
                   localDatabase.insertPhoneNumber(phoneNumber);
               }
               successCount++;
            } else {
                errorCount++;
                errors.push(`Row ${results.indexOf(row) + 1}: Missing phone number`);
            }
          } catch (error) {
            errorCount++;
            errors.push(`Failed to insert row: ${error.message}`);
          }
        }

        res.json({
          message: 'File processed successfully',
          success_count: successCount,
          error_count: errorCount,
          errors: errors
        });
      });
  } catch (error) {
    console.error('File upload processing error:', error);
    res.status(500).json({ error: 'Failed to process uploaded file' });
    if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
    }
  }
});

// Auth Routes
router.post('/auth/login', auditLog('User login attempt', 'auth'), async (req, res) => {
  try {
    const { username, password } = req.body;
    if (!username || !password) return res.status(400).json({ error: 'Missing credentials' });

    const db = getDatabaseInstance();
    const user = db.getUserByUsername(username);
    if (!user) return res.status(401).json({ error: 'Invalid credentials' });

    const validPassword = await bcrypt.compare(password, user.password_hash);
    if (!validPassword) return res.status(401).json({ error: 'Invalid credentials' });

    const session = SessionManager.createSession(username, req.ip, req.get('User-Agent') || 'Unknown');
    db.createOrUpdateSession(username, session.token, session.expires.toISOString());

    res.json({
      token: session.token,
      user: { username: user.username, lastLogin: session.createdAt },
      expiresAt: session.expires.toISOString()
    });
  } catch (error) {
    console.error("Login Error:", error);
    res.status(500).json({ error: 'Login failed' });
  }
});

router.post('/auth/logout', authenticateToken, auditLog('User logout', 'auth'), (req, res) => {
    const db = getDatabaseInstance();
    db.clearSession(req.user.username);
    SessionManager.revokeSession(req.user.token);
    LockManager.releaseUserLocks(req.user.username);
    res.json({ message: 'Logged out successfully' });
});

router.get('/auth/session', authenticateToken, (req, res) => {
    const refreshedSession = SessionManager.refreshSession(req.user.token);
    if (!refreshedSession) return res.status(401).json({ error: 'Session expired' });
    res.json({
        user: { username: refreshedSession.username, lastActivity: refreshedSession.lastActivity },
        expiresAt: refreshedSession.expires.toISOString(),
        sessionId: refreshedSession.id
    });
});

// GET phone numbers
router.get('/phone-numbers', authenticateToken, auditLog('Get phone numbers'), async (req, res) => {
    const db = getDatabaseInstance();
    const phoneNumbers = db.getAllPhoneNumbers();
    res.json({ data: phoneNumbers, count: phoneNumbers.length });
});

// Mount other routes
router.use('/uc', ucRoutes);
router.use('/uc/sfb', sfbRoutes);

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

module.exports = router;
