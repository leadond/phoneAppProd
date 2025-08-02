import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import path from 'path';
import { authDatabase } from '../lib/authDatabase';
import { ldapAuth } from '../lib/ldapAuth';
import authRoutes from '../api/authRoutes';
import { authMiddleware } from '../lib/authMiddleware';

// Initialize database and LDAP on startup
async function initializeServices() {
  try {
    console.log('Initializing authentication services...');
    
    // Database is initialized in constructor
    console.log('✓ Database initialized');
    
    // Clean up expired sessions
    authDatabase.cleanupExpiredSessions();
    await ldapAuth.cleanupSessions();
    console.log('✓ Expired sessions cleaned up');
    
    // Log system startup
    authDatabase.logAuthEvent({
      username: 'system',
      event_type: 'login_success',
      auth_method: 'local',
      success: true,
      details: JSON.stringify({ 
        event: 'system_startup',
        timestamp: new Date().toISOString(),
        services: ['database', 'ldap', 'auth']
      })
    });
    
    console.log('✓ Authentication services initialized successfully');
  } catch (error) {
    console.error('Failed to initialize authentication services:', error);
    throw error;
  }
}

// Create Express app
const app = express();
const PORT = process.env.PORT || 3001;

// Middleware setup
app.use(cors({
  origin: process.env.CORS_ORIGIN || ['http://localhost:3000', 'http://localhost:5173'],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
}));

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(cookieParser());

// Security headers
app.use((req, res, next) => {
  res.header('X-Content-Type-Options', 'nosniff');
  res.header('X-Frame-Options', 'DENY');
  res.header('X-XSS-Protection', '1; mode=block');
  if (process.env.NODE_ENV === 'production') {
    res.header('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
  }
  next();
});

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    services: {
      database: 'connected',
      ldap: process.env.ENABLE_LDAP === 'true' ? 'enabled' : 'disabled'
    },
    version: '1.0.0'
  });
});

// Authentication routes
app.use('/api/auth', authRoutes);

// Protected API routes (examples)
app.get('/api/user/profile', authMiddleware.requireAuth(), (req, res) => {
  res.json({
    success: true,
    user: req.user,
    permissions: req.permissions,
    session: req.session
  });
});

app.get('/api/admin/users', authMiddleware.requirePermissions('admin', 'manage-users'), (req, res) => {
  // This would return user management data for admins
  res.json({
    success: true,
    message: 'Admin users endpoint',
    user: req.user
  });
});

// Phone management routes with authentication
app.get('/api/phones', authMiddleware.requirePermissions('view-phones', 'read'), (req, res) => {
  // Integrate with existing phone management
  res.json({
    success: true,
    message: 'Phone data endpoint',
    user: req.user,
    permissions: req.permissions
  });
});

app.post('/api/phones', authMiddleware.requirePermissions('manage-phones', 'assign-phones'), (req, res) => {
  // Phone creation/assignment endpoint
  res.json({
    success: true,
    message: 'Phone assignment endpoint',
    user: req.user
  });
});

// Serve static files in production
if (process.env.NODE_ENV === 'production') {
  app.use(express.static(path.join(__dirname, '../../dist')));
  
  app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, '../../dist/index.html'));
  });
}

// Error handling middleware
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('Server error:', err);
  
  // Log error event
  try {
    authDatabase.logAuthEvent({
      username: req.user?.username || 'unknown',
      event_type: 'suspicious_activity',
      auth_method: 'local',
      ip_address: req.ip || 'unknown',
      success: false,
      failure_reason: 'server_error',
      is_suspicious: true,
      risk_score: 30,
      details: JSON.stringify({
        error: err.message,
        stack: err.stack?.substring(0, 500),
        url: req.originalUrl,
        method: req.method
      })
    });
  } catch (logError) {
    console.error('Failed to log error event:', logError);
  }
  
  res.status(500).json({
    success: false,
    error: process.env.NODE_ENV === 'production' ? 'Internal server error' : err.message,
    code: 'INTERNAL_ERROR'
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    success: false,
    error: 'Endpoint not found',
    code: 'NOT_FOUND',
    path: req.originalUrl
  });
});

// Graceful shutdown
process.on('SIGTERM', async () => {
  console.log('Received SIGTERM signal, shutting down gracefully...');
  
  try {
    // Close database connections
    authDatabase.close();
    await ldapAuth.close();
    
    console.log('All services closed successfully');
    process.exit(0);
  } catch (error) {
    console.error('Error during shutdown:', error);
    process.exit(1);
  }
});

process.on('SIGINT', async () => {
  console.log('Received SIGINT signal, shutting down gracefully...');
  
  try {
    authDatabase.close();
    await ldapAuth.close();
    
    console.log('All services closed successfully');
    process.exit(0);
  } catch (error) {
    console.error('Error during shutdown:', error);
    process.exit(1);
  }
});

// Start server
async function startServer() {
  try {
    await initializeServices();
    
    app.listen(PORT, () => {
      console.log(`🚀 Authentication server running on port ${PORT}`);
      console.log(`📍 Health check: http://localhost:${PORT}/api/health`);
      console.log(`🔐 Auth endpoints: http://localhost:${PORT}/api/auth/*`);
      console.log(`🌍 Environment: ${process.env.NODE_ENV || 'development'}`);
      
      if (process.env.ENABLE_LDAP === 'true') {
        console.log(`🔒 LDAP authentication: ENABLED`);
        console.log(`📡 LDAP URL: ${process.env.LDAP_URL || 'not set'}`);
      } else {
        console.log(`🔒 LDAP authentication: DISABLED`);
      }
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
}

// Start the server
if (require.main === module) {
  startServer();
}

export { app, startServer };