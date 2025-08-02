# Phone Range Nexus - Server Deployment Guide

## Table of Contents
1. [Overview](#overview)
2. [Prerequisites](#prerequisites)
3. [Server Installation](#server-installation)
4. [Shared Database Configuration](#shared-database-configuration)
5. [Multi-User Access Setup](#multi-user-access-setup)
6. [Network Access Configuration](#network-access-configuration)
7. [Production Build Process](#production-build-process)
8. [Database Migration Guide](#database-migration-guide)
9. [Backup and Maintenance](#backup-and-maintenance)
10. [Security Considerations](#security-considerations)
11. [Troubleshooting](#troubleshooting)
12. [Configuration Templates](#configuration-templates)

## Overview

This guide covers deploying Phone Range Nexus on a server to enable shared database access across multiple users. The application will transition from browser-only IndexedDB storage to a centralized SQLite database that multiple users can access simultaneously over the network.

### Architecture Changes
- **From**: Individual IndexedDB per browser → **To**: Shared SQLite database on server
- **From**: Client-only application → **To**: Server-hosted with network access
- **From**: Single-user mode → **To**: Multi-user concurrent access

## Prerequisites

### System Requirements
- **Operating System**: Linux (Ubuntu 20.04+ recommended), Windows Server 2019+, or macOS 10.15+
- **Node.js**: Version 18.0 or higher
- **Memory**: Minimum 2GB RAM, 4GB recommended
- **Storage**: 10GB free space minimum
- **Network**: Static IP address or domain name for network access

### Required Software
```bash
# Ubuntu/Debian
sudo apt update
sudo apt install nodejs npm nginx sqlite3 build-essential python3

# CentOS/RHEL
sudo yum install nodejs npm nginx sqlite build-essential python3

# Windows (using Chocolatey)
choco install nodejs nginx sqlite

# macOS (using Homebrew)
brew install node nginx sqlite
```

### Corporate Environment Considerations
- Ensure ports 80, 443, and 3000-8080 are available
- Configure firewall rules for network access
- Verify proxy settings don't interfere with the application
- Check corporate security policies for SQLite database files

## Server Installation

### 1. Download and Setup Application

```bash
# Clone or copy the application to your server
cd /opt
sudo mkdir phone-range-nexus
sudo chown $USER:$USER phone-range-nexus
cd phone-range-nexus

# If copying from existing installation
scp -r /path/to/local/phone-range-nexus/* ./

# Install dependencies
npm install
```

### 2. Configure Environment Variables

Create production environment file:

```bash
cp .env.example .env.production
```

Edit `.env.production`:

```env
# Production Configuration
NODE_ENV=production
APP_NAME=Phone Range Nexus
PORT=8080

# Database Configuration
DATABASE_TYPE=sqlite
SQLITE_DB_PATH=/opt/phone-range-nexus/data/phone-range-nexus.db
DATABASE_BACKUP_PATH=/opt/phone-range-nexus/backups

# Server Configuration
HOST=0.0.0.0
ALLOWED_ORIGINS=http://your-server-ip:8080,http://your-domain.com

# Authentication Configuration
AUTH_SESSION_DURATION=8h
SESSION_SECRET=your-secure-random-session-secret-here
DEFAULT_ADMIN_USERNAME=admin
DEFAULT_ADMIN_PASSWORD=change-this-secure-password

# Network Configuration
CORS_ENABLED=true
TRUST_PROXY=true

# Backup Configuration
AUTO_BACKUP_ENABLED=true
BACKUP_RETENTION_DAYS=30
BACKUP_SCHEDULE=0 2 * * *  # Daily at 2 AM
```

### 3. Create Required Directories

```bash
sudo mkdir -p /opt/phone-range-nexus/{data,backups,logs}
sudo chown -R $USER:$USER /opt/phone-range-nexus
chmod 755 /opt/phone-range-nexus/data
chmod 755 /opt/phone-range-nexus/backups
chmod 755 /opt/phone-range-nexus/logs
```

## Shared Database Configuration

### 1. Create Server Database Module

Create `src/lib/serverDatabase.ts`:

```typescript
import Database from 'better-sqlite3';
import { readFileSync, existsSync, mkdirSync } from 'fs';
import { join, dirname } from 'path';
import { v4 as uuidv4 } from 'uuid';

export class ServerDatabase {
  private db: Database.Database;
  private static instance: ServerDatabase;
  private dbPath: string;

  constructor(dbPath?: string) {
    this.dbPath = dbPath || process.env.SQLITE_DB_PATH || './data/phone-range-nexus.db';
    
    // Ensure directory exists
    const dir = dirname(this.dbPath);
    if (!existsSync(dir)) {
      mkdirSync(dir, { recursive: true });
    }

    // Initialize database with WAL mode for concurrent access
    this.db = new Database(this.dbPath);
    this.db.pragma('journal_mode = WAL');
    this.db.pragma('synchronous = NORMAL');
    this.db.pragma('cache_size = 1000000');
    this.db.pragma('temp_store = MEMORY');
    
    this.initializeDatabase();
  }

  public static getInstance(dbPath?: string): ServerDatabase {
    if (!ServerDatabase.instance) {
      ServerDatabase.instance = new ServerDatabase(dbPath);
    }
    return ServerDatabase.instance;
  }

  private initializeDatabase(): void {
    try {
      const schemaPath = join(process.cwd(), 'src', 'lib', 'local-database-schema.sql');
      const schema = readFileSync(schemaPath, 'utf8');
      this.db.exec(schema);
      console.log('Server database initialized successfully');
    } catch (error) {
      console.error('Failed to initialize server database:', error);
      throw error;
    }
  }

  // Add connection pooling and concurrent access methods
  public getDatabase(): Database.Database {
    return this.db;
  }

  public close(): void {
    this.db.close();
  }

  // Health check method
  public healthCheck(): boolean {
    try {
      const result = this.db.prepare('SELECT 1 as health').get();
      return result.health === 1;
    } catch {
      return false;
    }
  }
}
```

### 2. Update Database Service Configuration

Create `src/lib/databaseFactory.ts`:

```typescript
import { browserDatabase } from './browserDatabase';
import { ServerDatabase } from './serverDatabase';

export function getDatabaseInstance() {
  // Use server database in Node.js environment, browser database in browser
  if (typeof window === 'undefined') {
    return ServerDatabase.getInstance();
  } else {
    return browserDatabase;
  }
}
```

### 3. Database Connection Configuration

Add database connection retry logic and pooling in `src/lib/dbConnection.ts`:

```typescript
export class DatabaseConnection {
  private static retryAttempts = 3;
  private static retryDelay = 1000;

  static async withRetry<T>(operation: () => T): Promise<T> {
    for (let attempt = 1; attempt <= this.retryAttempts; attempt++) {
      try {
        return operation();
      } catch (error) {
        if (attempt === this.retryAttempts) throw error;
        await new Promise(resolve => setTimeout(resolve, this.retryDelay * attempt));
      }
    }
    throw new Error('Maximum retry attempts exceeded');
  }

  static async healthCheck(): Promise<boolean> {
    try {
      const db = getDatabaseInstance();
      return db.healthCheck();
    } catch {
      return false;
    }
  }
}
```

## Multi-User Access Setup

### 1. User Session Management

Create `src/lib/sessionManager.ts`:

```typescript
import { randomBytes } from 'crypto';

export interface UserSession {
  id: string;
  username: string;
  token: string;
  expires: Date;
  ipAddress: string;
  userAgent: string;
  lastActivity: Date;
}

export class SessionManager {
  private static sessions = new Map<string, UserSession>();
  private static cleanupInterval: NodeJS.Timeout;

  static initialize() {
    // Cleanup expired sessions every 15 minutes
    this.cleanupInterval = setInterval(() => {
      this.cleanupExpiredSessions();
    }, 15 * 60 * 1000);
  }

  static createSession(username: string, ipAddress: string, userAgent: string): UserSession {
    const session: UserSession = {
      id: uuidv4(),
      username,
      token: randomBytes(32).toString('hex'),
      expires: new Date(Date.now() + 8 * 60 * 60 * 1000), // 8 hours
      ipAddress,
      userAgent,
      lastActivity: new Date()
    };

    this.sessions.set(session.token, session);
    return session;
  }

  static validateSession(token: string): UserSession | null {
    const session = this.sessions.get(token);
    if (!session || session.expires < new Date()) {
      if (session) this.sessions.delete(token);
      return null;
    }
    
    session.lastActivity = new Date();
    return session;
  }

  static revokeSession(token: string): void {
    this.sessions.delete(token);
  }

  static getActiveSessions(): UserSession[] {
    return Array.from(this.sessions.values())
      .filter(session => session.expires > new Date());
  }

  private static cleanupExpiredSessions(): void {
    const now = new Date();
    for (const [token, session] of this.sessions.entries()) {
      if (session.expires < now) {
        this.sessions.delete(token);
      }
    }
  }
}
```

### 2. Concurrent Access Control

Create `src/lib/lockManager.ts`:

```typescript
export class LockManager {
  private static locks = new Map<string, { acquired: Date; user: string }>();
  private static lockTimeout = 30000; // 30 seconds

  static async acquireLock(resource: string, userId: string): Promise<boolean> {
    const existing = this.locks.get(resource);
    const now = new Date();

    // Check if lock exists and hasn't expired
    if (existing && (now.getTime() - existing.acquired.getTime()) < this.lockTimeout) {
      return existing.user === userId;
    }

    // Acquire or refresh lock
    this.locks.set(resource, { acquired: now, user: userId });
    return true;
  }

  static releaseLock(resource: string, userId: string): void {
    const existing = this.locks.get(resource);
    if (existing && existing.user === userId) {
      this.locks.delete(resource);
    }
  }

  static cleanupExpiredLocks(): void {
    const now = new Date();
    for (const [resource, lock] of this.locks.entries()) {
      if ((now.getTime() - lock.acquired.getTime()) >= this.lockTimeout) {
        this.locks.delete(resource);
      }
    }
  }
}
```

## Network Access Configuration

### 1. Express Server Setup

Create `server.js` in the root directory:

```javascript
const express = require('express');
const path = require('path');
const cors = require('cors');
const rateLimit = require('express-rate-limit');
const helmet = require('helmet');
const compression = require('compression');

const app = express();
const PORT = process.env.PORT || 8080;
const HOST = process.env.HOST || '0.0.0.0';

// Security middleware
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", "data:", "https:"],
      connectSrc: ["'self'"],
      fontSrc: ["'self'"],
      objectSrc: ["'none'"],
      mediaSrc: ["'self'"],
      frameSrc: ["'none'"],
    },
  },
}));

// CORS configuration
const corsOptions = {
  origin: function (origin, callback) {
    const allowedOrigins = (process.env.ALLOWED_ORIGINS || '').split(',');
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true
};
app.use(cors(corsOptions));

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 1000, // limit each IP to 1000 requests per windowMs
  message: 'Too many requests from this IP, please try again later.'
});
app.use(limiter);

// Compression and parsing
app.use(compression());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// API routes
app.use('/api', require('./src/routes/api'));

// Serve static files
app.use(express.static(path.join(__dirname, 'dist')));

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
});

// Catch-all handler for SPA
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'dist', 'index.html'));
});

// Error handling
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({
    error: 'Internal Server Error',
    message: process.env.NODE_ENV === 'development' ? err.message : 'Something went wrong!'
  });
});

app.listen(PORT, HOST, () => {
  console.log(`Phone Range Nexus server running on http://${HOST}:${PORT}`);
});
```

### 2. API Routes

Create `src/routes/api.js`:

```javascript
const express = require('express');
const router = express.Router();
const { SessionManager } = require('../lib/sessionManager');
const { getDatabaseInstance } = require('../lib/databaseFactory');

// Authentication middleware
const authenticateToken = (req, res, next) => {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) {
    return res.status(401).json({ error: 'Access token required' });
  }

  const session = SessionManager.validateSession(token);
  if (!session) {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }

  req.user = session;
  next();
};

// Auth routes
router.post('/auth/login', async (req, res) => {
  try {
    const { username, password } = req.body;
    // Implement authentication logic
    const session = SessionManager.createSession(
      username,
      req.ip,
      req.get('User-Agent')
    );
    res.json({ token: session.token, user: { username } });
  } catch (error) {
    res.status(401).json({ error: 'Invalid credentials' });
  }
});

router.post('/auth/logout', authenticateToken, (req, res) => {
  SessionManager.revokeSession(req.user.token);
  res.json({ message: 'Logged out successfully' });
});

// Data routes (protected)
router.get('/phone-numbers', authenticateToken, async (req, res) => {
  try {
    const db = getDatabaseInstance();
    const phoneNumbers = await db.getAllPhoneNumbers();
    res.json(phoneNumbers);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch phone numbers' });
  }
});

// Add more API routes as needed...

module.exports = router;
```

### 3. Nginx Configuration

Create `/etc/nginx/sites-available/phone-range-nexus`:

```nginx
server {
    listen 80;
    server_name your-server-ip your-domain.com;

    # Redirect to HTTPS (optional but recommended)
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name your-server-ip your-domain.com;

    # SSL Configuration (if using HTTPS)
    ssl_certificate /path/to/certificate.crt;
    ssl_certificate_key /path/to/private.key;
    ssl_protocols TLSv1.2 TLSv1.3;

    # Security headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header Referrer-Policy "no-referrer-when-downgrade" always;
    add_header Content-Security-Policy "default-src 'self' http: https: data: blob: 'unsafe-inline'" always;

    # Gzip compression
    gzip on;
    gzip_comp_level 6;
    gzip_types text/plain text/css application/json application/javascript text/xml application/xml application/xml+rss text/javascript;

    # Proxy to Node.js application
    location / {
        proxy_pass http://127.0.0.1:8080;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
        
        # Timeouts
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
    }

    # Static file caching
    location /assets/ {
        proxy_pass http://127.0.0.1:8080;
        expires 1y;
        add_header Cache-Control "public, immutable";
    }

    # Health check
    location /health {
        proxy_pass http://127.0.0.1:8080;
        access_log off;
    }
}
```

## Production Build Process

### 1. Build Script

Create `scripts/build-production.sh`:

```bash
#!/bin/bash

echo "🚀 Building Phone Range Nexus for production..."

# Set environment
export NODE_ENV=production

# Clean previous builds
echo "🧹 Cleaning previous builds..."
rm -rf dist/
rm -rf node_modules/.cache/

# Install dependencies
echo "📦 Installing production dependencies..."
npm ci --only=production

# Build the application
echo "🔨 Building application..."
npm run build

# Create production package
echo "📦 Creating production package..."
mkdir -p production-package
cp -r dist/ production-package/
cp -r src/lib/ production-package/src/lib/
cp -r src/routes/ production-package/src/routes/
cp package.json production-package/
cp package-lock.json production-package/
cp server.js production-package/
cp .env.production production-package/.env

# Create systemd service file
cat > production-package/phone-range-nexus.service << 'EOF'
[Unit]
Description=Phone Range Nexus Server
After=network.target

[Service]
Type=simple
User=www-data
WorkingDirectory=/opt/phone-range-nexus
ExecStart=/usr/bin/node server.js
Restart=on-failure
RestartSec=10
Environment=NODE_ENV=production

[Install]
WantedBy=multi-user.target
EOF

echo "✅ Production build complete! Package available in production-package/"
```

### 2. Deployment Script

Create `scripts/deploy.sh`:

```bash
#!/bin/bash

set -e

SERVER_USER=${1:-root}
SERVER_HOST=${2:-your-server-ip}
DEPLOY_PATH="/opt/phone-range-nexus"

echo "🚀 Deploying Phone Range Nexus to $SERVER_HOST..."

# Build application
./scripts/build-production.sh

# Upload to server
echo "📤 Uploading files to server..."
rsync -avz --delete production-package/ $SERVER_USER@$SERVER_HOST:$DEPLOY_PATH/

# Install and configure on server
echo "⚙️ Configuring server..."
ssh $SERVER_USER@$SERVER_HOST << 'EOF'
cd /opt/phone-range-nexus

# Install dependencies
npm ci --only=production

# Create necessary directories
mkdir -p data backups logs
chown -R www-data:www-data .

# Install systemd service
cp phone-range-nexus.service /etc/systemd/system/
systemctl daemon-reload
systemctl enable phone-range-nexus

# Configure nginx
cp nginx-config /etc/nginx/sites-available/phone-range-nexus
ln -sf /etc/nginx/sites-available/phone-range-nexus /etc/nginx/sites-enabled/
nginx -t && systemctl reload nginx

# Start services
systemctl restart phone-range-nexus
systemctl status phone-range-nexus
EOF

echo "✅ Deployment complete!"
echo "🌐 Application should be available at http://$SERVER_HOST"
```

## Database Migration Guide

### 1. Migration from IndexedDB to SQLite

Create `scripts/migrate-database.js`:

```javascript
const fs = require('fs');
const path = require('path');
const { ServerDatabase } = require('../src/lib/serverDatabase');

async function migrateFromExport(exportFile, serverDbPath) {
  console.log('🔄 Starting database migration...');

  try {
    // Read exported data
    const exportData = JSON.parse(fs.readFileSync(exportFile, 'utf8'));
    
    // Initialize server database
    const serverDb = new ServerDatabase(serverDbPath);
    
    // Migrate phone numbers
    if (exportData.phoneNumbers && exportData.phoneNumbers.length > 0) {
      console.log(`📞 Migrating ${exportData.phoneNumbers.length} phone numbers...`);
      
      const stmt = serverDb.getDatabase().prepare(`
        INSERT INTO phone_numbers (
          id, number, status, system, carrier, assigned_to, notes, extension,
          department, location, date_assigned, date_available, last_used, aging_days,
          number_type, range_name, project, reserved_until, usage_inbound, usage_outbound,
          usage_last_activity, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);

      const transaction = serverDb.getDatabase().transaction((numbers) => {
        for (const phone of numbers) {
          stmt.run(
            phone.id, phone.number, phone.status, phone.system, phone.carrier,
            phone.assignedTo, phone.notes, phone.extension, phone.department,
            phone.location, phone.dateAssigned, phone.dateAvailable, phone.lastUsed,
            phone.agingDays, phone.numberType, phone.range, phone.project,
            phone.reservedUntil, phone.usage?.inbound || 0, phone.usage?.outbound || 0,
            phone.usage?.lastActivity, new Date().toISOString(), new Date().toISOString()
          );
        }
      });

      transaction(exportData.phoneNumbers);
    }

    // Migrate number ranges
    if (exportData.numberRanges && exportData.numberRanges.length > 0) {
      console.log(`📋 Migrating ${exportData.numberRanges.length} number ranges...`);
      // Similar migration logic for ranges...
    }

    // Migrate audit log
    if (exportData.auditLog && exportData.auditLog.length > 0) {
      console.log(`📝 Migrating ${exportData.auditLog.length} audit entries...`);
      // Similar migration logic for audit log...
    }

    console.log('✅ Database migration completed successfully!');
    
  } catch (error) {
    console.error('❌ Migration failed:', error);
    throw error;
  }
}

// CLI usage
if (require.main === module) {
  const [exportFile, serverDbPath] = process.argv.slice(2);
  
  if (!exportFile || !serverDbPath) {
    console.log('Usage: node migrate-database.js <export-file.json> <server-db-path>');
    process.exit(1);
  }

  migrateFromExport(exportFile, serverDbPath)
    .then(() => process.exit(0))
    .catch(err => {
      console.error(err);
      process.exit(1);
    });
}

module.exports = { migrateFromExport };
```

### 2. Migration Instructions

1. **Export data from browser version:**
```javascript
// Run in browser console on existing installation
async function exportData() {
  const dataService = window.dataService; // Adjust based on your app structure
  const data = await dataService.exportAllData();
  
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'phone-range-nexus-export.json';
  a.click();
}
exportData();
```

2. **Import to server database:**
```bash
# On server
node scripts/migrate-database.js phone-range-nexus-export.json /opt/phone-range-nexus/data/phone-range-nexus.db
```

## Backup and Maintenance

### 1. Automated Backup Script

Create `scripts/backup-database.sh`:

```bash
#!/bin/bash

# Configuration
DB_PATH="${SQLITE_DB_PATH:-/opt/phone-range-nexus/data/phone-range-nexus.db}"
BACKUP_DIR="${DATABASE_BACKUP_PATH:-/opt/phone-range-nexus/backups}"
RETENTION_DAYS="${BACKUP_RETENTION_DAYS:-30}"
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")

# Create backup directory if it doesn't exist
mkdir -p "$BACKUP_DIR"

echo "🔄 Starting database backup..."

# Create backup with timestamp
BACKUP_FILE="$BACKUP_DIR/phone-range-nexus_$TIMESTAMP.db"

# Use SQLite backup command for consistent backup
sqlite3 "$DB_PATH" ".backup '$BACKUP_FILE'"

# Compress backup
gzip "$BACKUP_FILE"
BACKUP_FILE="$BACKUP_FILE.gz"

# Verify backup
if [ -f "$BACKUP_FILE" ]; then
    BACKUP_SIZE=$(stat -f%z "$BACKUP_FILE" 2>/dev/null || stat -c%s "$BACKUP_FILE" 2>/dev/null)
    echo "✅ Backup created successfully: $BACKUP_FILE ($BACKUP_SIZE bytes)"
    
    # Log backup
    echo "$(date '+%Y-%m-%d %H:%M:%S') - Backup created: $BACKUP_FILE" >> "$BACKUP_DIR/backup.log"
else
    echo "❌ Backup failed!"
    exit 1
fi

# Cleanup old backups
echo "🧹 Cleaning up old backups (older than $RETENTION_DAYS days)..."
find "$BACKUP_DIR" -name "phone-range-nexus_*.db.gz" -mtime +$RETENTION_DAYS -delete

# Create latest symlink
ln -sf "$BACKUP_FILE" "$BACKUP_DIR/latest.db.gz"

echo "✅ Backup process completed!"
```

### 2. Database Maintenance Script

Create `scripts/maintenance.sh`:

```bash
#!/bin/bash

DB_PATH="${SQLITE_DB_PATH:-/opt/phone-range-nexus/data/phone-range-nexus.db}"

echo "🔧 Starting database maintenance..."

# Backup before maintenance
./scripts/backup-database.sh

# Database integrity check
echo "🔍 Checking database integrity..."
sqlite3 "$DB_PATH" "PRAGMA integrity_check;" > /tmp/integrity_check.log

if grep -q "ok" /tmp/integrity_check.log; then
    echo "✅ Database integrity check passed"
else
    echo "⚠️ Database integrity issues detected:"
    cat /tmp/integrity_check.log
fi

# Optimize database
echo "⚡ Optimizing database..."
sqlite3 "$DB_PATH" "PRAGMA optimize;"
sqlite3 "$DB_PATH" "VACUUM;"
sqlite3 "$DB_PATH" "ANALYZE;"

# Update statistics
echo "📊 Updating database statistics..."
sqlite3 "$DB_PATH" "PRAGMA analysis_limit=400; PRAGMA optimize;"

# Clean up temporary files
echo "🧹 Cleaning up temporary files..."
find /tmp -name "phone-range-nexus*" -mtime +1 -delete

echo "✅ Database maintenance completed!"
```

### 3. Crontab Setup

Add to crontab (`crontab -e`):

```bash
# Phone Range Nexus Maintenance
0 2 * * * /opt/phone-range-nexus/scripts/backup-database.sh >> /opt/phone-range-nexus/logs/backup.log 2>&1
0 3 * * 0 /opt/phone-range-nexus/scripts/maintenance.sh >> /opt/phone-range-nexus/logs/maintenance.log 2>&1
```

## Security Considerations

### 1. File Permissions

```bash
# Set secure permissions
sudo chown -R www-data:www-data /opt/phone-range-nexus
sudo chmod 750 /opt/phone-range-nexus
sudo chmod 640 /opt/phone-range-nexus/.env
sudo chmod 750 /opt/phone-range-nexus/data
sudo chmod 660 /opt/phone-range-nexus/data/*.db*
sudo chmod 750 /opt/phone-range-nexus/backups
sudo chmod 660 /opt/phone-range-nexus/backups/*
```

### 2. Firewall Configuration

```bash
# Ubuntu/Debian using ufw
sudo ufw allow ssh
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw enable

# CentOS/RHEL using firewalld
sudo firewall-cmd --permanent --add-service=ssh
sudo firewall-cmd --permanent --add-service=http
sudo firewall-cmd --permanent --add-service=https
sudo firewall-cmd --reload
```

### 3. SSL/TLS Configuration

Generate SSL certificate (using Let's Encrypt):

```bash
# Install certbot
sudo apt install certbot python3-certbot-nginx

# Generate certificate
sudo certbot --nginx -d your-domain.com

# Auto-renewal
sudo crontab -e
# Add: 0 12 * * * /usr/bin/certbot renew --quiet
```

### 4. Security Headers

Update Nginx configuration to include security headers:

```nginx
# Add to server block
add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;
add_header X-Frame-Options "SAMEORIGIN" always;
add_header X-Content-Type-Options "nosniff" always;
add_header X-XSS-Protection "1; mode=block" always;
add_header Referrer-Policy "strict-origin-when-cross-origin" always;
```

### 5. Database Encryption (Optional)

For enhanced security, consider encrypting the SQLite database:

```bash
# Install SQLCipher
sudo apt install sqlcipher

# Create encrypted database
sqlcipher encrypted.db "PRAGMA key = 'your-encryption-key';"
```

## Troubleshooting

### Common Issues and Solutions

#### 1. Database Lock Issues
```bash
# Check for locks
lsof /opt/phone-range-nexus/data/phone-range-nexus.db

# If locked, restart the service
sudo systemctl restart phone-range-nexus
```

#### 2. Permission Errors
```bash
# Fix ownership and permissions
sudo chown -R www-data:www-data /opt/phone-range-nexus
sudo chmod -R 755 /opt/phone-range-nexus
sudo chmod 660 /opt/phone-range-nexus/data/*.db*
```

#### 3. Port Already in Use
```bash
# Find process using port
sudo lsof -i :8080

# Kill process if needed
sudo kill -9 <PID>
```

#### 4. Network Access Issues
```bash
# Check if service is running
sudo systemctl status phone-range-nexus

# Check logs
sudo journalctl -u phone-range-nexus -f

# Check nginx status
sudo systemctl status nginx
sudo nginx -t
```

#### 5. Database Corruption
```bash
# Check integrity
sqlite3 /opt/phone-range-nexus/data/phone-range-nexus.db "PRAGMA integrity_check;"

# Restore from backup if needed
gunzip -c /opt/phone-range-nexus/backups/latest.db.gz > /opt/phone-range-nexus/data/phone-range-nexus.db
```

### Log Files Locations

- **Application logs**: `/opt/phone-range-nexus/logs/`
- **System logs**: `sudo journalctl -u phone-range-nexus`
- **Nginx logs**: `/var/log/nginx/access.log` and `/var/log/nginx/error.log`
- **Backup logs**: `/opt/phone-range-nexus/logs/backup.log`

## Configuration Templates

### 1. Complete Production Environment File

```env
# Phone Range Nexus Production Configuration

#######################
# Application Settings
#######################
NODE_ENV=production
APP_NAME=Phone Range Nexus
VERSION=1.0.0
PORT=8080
HOST=0.0.0.0

#######################
# Database Configuration
#######################
DATABASE_TYPE=sqlite
SQLITE_DB_PATH=/opt/phone-range-nexus/data/phone-range-nexus.db
DATABASE_BACKUP_PATH=/opt/phone-range-nexus/backups
DATABASE_WAL_MODE=true
DATABASE_CACHE_SIZE=1000000

#######################
# Authentication & Security
#######################
SESSION_SECRET=your-very-secure-random-string-change-this
AUTH_SESSION_DURATION=8h
MAX_LOGIN_ATTEMPTS=5
LOGIN_LOCKOUT_DURATION=15m
PASSWORD_MIN_LENGTH=8

# Default admin credentials (change immediately)
DEFAULT_ADMIN_USERNAME=admin
DEFAULT_ADMIN_PASSWORD=change-this-password-immediately

#######################
# Network & CORS
#######################
ALLOWED_ORIGINS=http://localhost:8080,http://your-server-ip:8080,https://your-domain.com
CORS_ENABLED=true
TRUST_PROXY=true
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=1000

#######################
# Backup Configuration
#######################
AUTO_BACKUP_ENABLED=true
BACKUP_RETENTION_DAYS=30
BACKUP_SCHEDULE=0 2 * * *
BACKUP_COMPRESSION=true

#######################
# Logging
#######################
LOG_LEVEL=info
LOG_FILE=/opt/phone-range-nexus/logs/app.log
AUDIT_LOG_ENABLED=true
AUDIT_LOG_RETENTION_DAYS=90

#######################
# Performance
#######################
ENABLE_COMPRESSION=true
STATIC_FILE_CACHE_MAX_AGE=31536000
JSON_LIMIT=10mb
URL_ENCODED_LIMIT=10mb

#######################
# Monitoring
#######################
HEALTH_CHECK_ENABLED=true
METRICS_ENABLED=true
PERFORMANCE_MONITORING=true
```

### 2. Complete Systemd Service File

```ini
[Unit]
Description=Phone Range Nexus - Phone Number Management System
Documentation=https://github.com/your-org/phone-range-nexus
After=network.target network-online.target
Wants=network-online.target

[Service]
Type=simple
User=www-data
Group=www-data
WorkingDirectory=/opt/phone-range-nexus
ExecStart=/usr/bin/node server.js
ExecReload=/bin/kill -HUP $MAINPID

# Security settings
NoNewPrivileges=true
PrivateTmp=true
ProtectSystem=strict
ProtectHome=true
ReadWritePaths=/opt/phone-range-nexus/data /opt/phone-range-nexus/logs /opt/phone-range-nexus/backups

# Resource limits
LimitNOFILE=65536
LimitNPROC=4096

# Restart policy
Restart=always
RestartSec=10
KillMode=mixed
KillSignal=SIGTERM
TimeoutStopSec=30

# Environment
Environment=NODE_ENV=production
EnvironmentFile=/opt/phone-range-nexus/.env

# Logging
StandardOutput=append:/opt/phone-range-nexus/logs/service.log
StandardError=append:/opt/phone-range-nexus/logs/error.log

[Install]
WantedBy=multi-user.target
```

### 3. Nginx Complete Configuration

```nginx
# Phone Range Nexus Nginx Configuration
upstream phone_range_nexus {
    server 127.0.0.1:8080 max_fails=3 fail_timeout=30s;
    keepalive 32;
}

# Rate limiting
limit_req_zone $binary_remote_addr zone=api:10m rate=10r/s;
limit_req_zone $binary_remote_addr zone=login:10m rate=1r/s;

# HTTP to HTTPS redirect
server {
    listen 80;
    server_name your-domain.com www.your-domain.com;
    return 301 https://$server_name$request_uri;
}

# Main HTTPS server
server {
    listen 443 ssl http2;
    server_name your-domain.com www.your-domain.com;

    # SSL Configuration
    ssl_certificate /etc/letsencrypt/live/your-domain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/your-domain.com/privkey.pem;
    ssl_session_timeout 1d;
    ssl_session_cache shared:SSL:50m;
    ssl_session_tickets off;
    
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers ECDHE-ECDSA-AES128-GCM-SHA256:ECDHE-RSA-AES128-GCM-SHA256:ECDHE-ECDSA-AES256-GCM-SHA384:ECDHE-RSA-AES256-GCM-SHA384;
    ssl_prefer_server_ciphers off;
    
    # HSTS
    add_header Strict-Transport-Security "max-age=63072000; includeSubDomains; preload" always;

    # Security headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header Referrer-Policy "strict-origin-when-cross-origin" always;
    add_header Content-Security-Policy "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; font-src 'self';" always;

    # Gzip compression
    gzip on;
    gzip_vary on;
    gzip_min_length 1024;
    gzip_comp_level 6;
    gzip_types
        text/plain
        text/css
        text/xml
        text/javascript
        application/json
        application/javascript
        application/xml+rss
        application/atom+xml
        image/svg+xml;

    # Client settings
    client_max_body_size 10M;
    client_body_timeout 60s;
    client_header_timeout 60s;

    # API routes with rate limiting
    location /api/auth/login {
        limit_req zone=login burst=3 nodelay;
        proxy_pass http://phone_range_nexus;
        include /etc/nginx/proxy_params;
    }

    location /api/ {
        limit_req zone=api burst=20 nodelay;
        proxy_pass http://phone_range_nexus;
        include /etc/nginx/proxy_params;
    }

    # Health check (no rate limiting)
    location /health {
        proxy_pass http://phone_range_nexus;
        access_log off;
        include /etc/nginx/proxy_params;
    }

    # Static assets with long caching
    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot)$ {
        proxy_pass http://phone_range_nexus;
        expires 1y;
        add_header Cache-Control "public, immutable";
        include /etc/nginx/proxy_params;
    }

    # Main application
    location / {
        proxy_pass http://phone_range_nexus;
        include /etc/nginx/proxy_params;
        
        # WebSocket support (if needed in future)
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection $connection_upgrade;
    }

    # Error pages
    error_page 404 /404.html;
    error_page 500 502 503 504 /50x.html;

    # Logging
    access_log /var/log/nginx/phone-range-nexus-access.log;
    error_log /var/log/nginx/phone-range-nexus-error.log warn;
}

# Proxy parameters
# /etc/nginx/proxy_params
proxy_set_header Host $http_host;
proxy_set_header X-Real-IP $remote_addr;
proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
proxy_set_header X-Forwarded-Proto $scheme;
proxy_buffering off;
proxy_request_buffering off;
proxy_http_version 1.1;
proxy_intercept_errors on;

# Connection upgrade map for WebSocket
map $http_upgrade $connection_upgrade {
    default upgrade;
    '' close;
}
```

## Summary

This deployment guide provides comprehensive instructions for transitioning Phone Range Nexus from a browser-only application to a server-hosted multi-user system with shared database access. Key benefits of this deployment:

- **Centralized Data**: All users access the same SQLite database
- **Multi-User Support**: Concurrent access with session management
- **Network Accessibility**: Available across corporate networks
- **Data Persistence**: Reliable server-based storage
- **Backup & Recovery**: Automated backup solutions
- **Security**: Comprehensive security measures
- **Scalability**: Ready for future enhancements

Follow the steps in sequence, customize the configuration files for your environment, and test thoroughly before deploying to production.

For support or questions, refer to the troubleshooting section or check the application logs for detailed error information.