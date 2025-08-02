const express = require('express');
const path = require('path');
const cors = require('cors');
const rateLimit = require('express-rate-limit');
const helmet = require('helmet');
const compression = require('compression');
const { createProxyMiddleware } = require('http-proxy-middleware');

const app = express();
const PORT = process.env.PORT || 8080;
const HOST = process.env.HOST || '0.0.0.0';
const NODE_ENV = process.env.NODE_ENV || 'development';

// Trust proxy for production deployments behind reverse proxy
if (process.env.TRUST_PROXY === 'true') {
  app.set('trust proxy', 1);
}

// Security middleware
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'", "'unsafe-inline'"],
      imgSrc: ["'self'", "data:", "https:"],
      connectSrc: ["'self'"],
      fontSrc: ["'self'"],
      objectSrc: ["'none'"],
      mediaSrc: ["'self'"],
      frameSrc: ["'none'"],
    },
  },
  crossOriginEmbedderPolicy: false,
}));

// CORS configuration
const corsOptions = {
  origin: function (origin, callback) {
    const allowedOrigins = (process.env.ALLOWED_ORIGINS || `http://localhost:${PORT}`)
      .split(',')
      .map(o => o.trim());
    
    // Allow requests with no origin (mobile apps, etc.)
    if (!origin) return callback(null, true);
    
    if (allowedOrigins.includes(origin) || allowedOrigins.includes('*')) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
};

app.use(cors(corsOptions));

// Rate limiting
const limiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000, // 15 minutes
  max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS) || 1000, // limit each IP
  message: {
    error: 'Too many requests from this IP, please try again later.',
    retryAfter: Math.ceil((parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000) / 1000)
  },
  standardHeaders: true,
  legacyHeaders: false,
});
app.use(limiter);

// Stricter rate limiting for auth endpoints
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // limit each IP to 5 requests per windowMs
  message: {
    error: 'Too many authentication attempts, please try again later.',
    retryAfter: 900 // 15 minutes
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// Compression and parsing
app.use(compression({
  level: 6,
  threshold: 1024,
  filter: (req, res) => {
    if (req.headers['x-no-compression']) {
      return false;
    }
    return compression.filter(req, res);
  }
}));

app.use(express.json({ 
  limit: process.env.JSON_LIMIT || '10mb',
  type: ['application/json', 'text/plain']
}));

app.use(express.urlencoded({ 
  extended: true, 
  limit: process.env.URL_ENCODED_LIMIT || '10mb' 
}));

// Request logging middleware
app.use((req, res, next) => {
  const start = Date.now();
  const originalSend = res.send;
  
  res.send = function(data) {
    const duration = Date.now() - start;
    console.log(`${new Date().toISOString()} - ${req.method} ${req.originalUrl} - ${res.statusCode} - ${duration}ms - ${req.ip}`);
    return originalSend.call(this, data);
  };
  
  next();
});

// Health check endpoint (before rate limiting)
app.get('/health', (req, res) => {
  const healthCheck = {
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: NODE_ENV,
    version: process.env.VERSION || '1.0.0',
    memory: process.memoryUsage(),
    pid: process.pid
  };

  try {
    // Add database health check if available
    const { DatabaseConnection } = require('./src/lib/databaseFactory');
    DatabaseConnection.healthCheck()
      .then(dbHealthy => {
        healthCheck.database = dbHealthy ? 'healthy' : 'unhealthy';
        res.status(dbHealthy ? 200 : 503).json(healthCheck);
      })
      .catch(() => {
        healthCheck.database = 'error';
        res.status(503).json(healthCheck);
      });
  } catch (error) {
    // Database modules not available (browser mode)
    res.json(healthCheck);
  }
});

// API routes with authentication rate limiting
app.use('/api/auth', authLimiter);

// Main API routes
try {
  const apiRoutes = require('./src/routes/api');
  app.use('/api', apiRoutes);
} catch (error) {
  console.warn('API routes not available (likely in browser-only mode):', error.message);
}

// Serve static files in production
if (NODE_ENV === 'production') {
  const staticPath = path.join(__dirname, 'dist');
  
  // Static file serving with caching
  app.use(express.static(staticPath, {
    maxAge: process.env.STATIC_FILE_CACHE_MAX_AGE || '1y',
    etag: true,
    lastModified: true,
    setHeaders: (res, path) => {
      // Set cache headers based on file type
      if (path.endsWith('.html')) {
        res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
      } else if (path.match(/\.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot)$/)) {
        res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
      }
    }
  }));

  // Catch-all handler for SPA (must be after static files)
  app.get('*', (req, res) => {
    // Don't serve SPA for API routes
    if (req.path.startsWith('/api/') || req.path.startsWith('/health')) {
      return res.status(404).json({ error: 'API endpoint not found' });
    }
    
    res.sendFile(path.join(staticPath, 'index.html'));
  });
} else {
  // Development mode - proxy to Vite dev server
  console.log('Development mode: Proxying to Vite dev server...');
  
  app.use('*', createProxyMiddleware({
    target: 'http://localhost:5173',
    changeOrigin: true,
    ws: true, // Enable WebSocket proxying for HMR
    logLevel: 'silent'
  }));
}

// Global error handling middleware
app.use((err, req, res, next) => {
  console.error('Server error:', {
    error: err.message,
    stack: NODE_ENV === 'development' ? err.stack : undefined,
    method: req.method,
    url: req.originalUrl,
    ip: req.ip,
    timestamp: new Date().toISOString()
  });

  // CORS error
  if (err.message.includes('CORS')) {
    return res.status(403).json({
      error: 'CORS policy violation',
      message: 'Origin not allowed'
    });
  }

  // Rate limiting error
  if (err.status === 429) {
    return res.status(429).json({
      error: 'Rate limit exceeded',
      message: err.message
    });
  }

  // JSON parsing error
  if (err instanceof SyntaxError && err.status === 400 && 'body' in err) {
    return res.status(400).json({
      error: 'Invalid JSON',
      message: 'Request body contains invalid JSON'
    });
  }

  // Default error response
  const statusCode = err.status || err.statusCode || 500;
  res.status(statusCode).json({
    error: statusCode >= 500 ? 'Internal Server Error' : err.message,
    message: NODE_ENV === 'development' ? err.message : 'Something went wrong!',
    timestamp: new Date().toISOString()
  });
});

// 404 handler for unmatched routes
app.use((req, res) => {
  res.status(404).json({
    error: 'Not Found',
    message: `Route ${req.method} ${req.originalUrl} not found`,
    timestamp: new Date().toISOString()
  });
});

// Graceful shutdown handling
const server = app.listen(PORT, HOST, () => {
  console.log(`🚀 Phone Range Nexus server running on http://${HOST}:${PORT}`);
  console.log(`📊 Environment: ${NODE_ENV}`);
  console.log(`🔒 CORS enabled for: ${process.env.ALLOWED_ORIGINS || `http://localhost:${PORT}`}`);
  
  if (NODE_ENV === 'production') {
    console.log(`📁 Serving static files from: ${path.join(__dirname, 'dist')}`);
  }
});

// Graceful shutdown
const shutdown = (signal) => {
  console.log(`\n📥 Received ${signal}. Starting graceful shutdown...`);
  
  server.close((err) => {
    if (err) {
      console.error('❌ Error during server shutdown:', err);
      process.exit(1);
    }
    
    console.log('✅ Server closed successfully');
    
    // Close database connections and cleanup
    try {
      const { SessionManager } = require('./src/lib/sessionManager');
      const { LockManager } = require('./src/lib/lockManager');
      
      SessionManager.shutdown();
      LockManager.shutdown();
      
      console.log('✅ Cleanup completed');
    } catch (error) {
      console.warn('⚠️ Error during cleanup:', error.message);
    }
    
    process.exit(0);
  });

  // Force shutdown after 10 seconds
  setTimeout(() => {
    console.error('⚠️ Could not close connections in time, forcefully shutting down');
    process.exit(1);
  }, 10000);
};

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));

// Handle uncaught exceptions
process.on('uncaughtException', (err) => {
  console.error('💥 Uncaught Exception:', err);
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('💥 Unhandled Rejection at:', promise, 'reason:', reason);
  process.exit(1);
});

module.exports = app;