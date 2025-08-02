#!/bin/bash

# Phone Range Nexus Production Build Script
# This script builds the application for production deployment

set -e  # Exit on any error

echo "🚀 Building Phone Range Nexus for production..."

# Configuration
BUILD_DIR="production-package"
DIST_DIR="dist"
SRC_LIB_DIR="src/lib"
SRC_ROUTES_DIR="src/routes"
SCRIPTS_DIR="scripts"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

log_info() {
    echo -e "${BLUE}ℹ️  $1${NC}"
}

log_success() {
    echo -e "${GREEN}✅ $1${NC}"
}

log_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

log_error() {
    echo -e "${RED}❌ $1${NC}"
}

# Check if Node.js and npm are installed
if ! command -v node &> /dev/null; then
    log_error "Node.js is not installed. Please install Node.js 18+ and try again."
    exit 1
fi

if ! command -v npm &> /dev/null; then
    log_error "npm is not installed. Please install npm and try again."
    exit 1
fi

# Check Node.js version
NODE_VERSION=$(node -v | cut -d'.' -f1 | sed 's/v//')
if [ "$NODE_VERSION" -lt 18 ]; then
    log_error "Node.js version 18 or higher is required. Current version: $(node -v)"
    exit 1
fi

# Set environment
export NODE_ENV=production

log_info "Environment set to: $NODE_ENV"

# Clean previous builds
if [ -d "$BUILD_DIR" ]; then
    log_info "Cleaning previous build..."
    rm -rf "$BUILD_DIR"
fi

if [ -d "$DIST_DIR" ]; then
    log_info "Cleaning previous dist..."
    rm -rf "$DIST_DIR"
fi

# Clean npm cache
log_info "Cleaning npm cache..."
npm cache clean --force

# Install dependencies
log_info "Installing production dependencies..."
npm ci --only=production --silent

# Install additional server dependencies
log_info "Installing server dependencies..."
npm install --no-save express cors helmet compression express-rate-limit bcrypt http-proxy-middleware

# Build the application
log_info "Building client application..."
npm run build

if [ ! -d "$DIST_DIR" ]; then
    log_error "Build failed - dist directory not found"
    exit 1
fi

log_success "Client build completed"

# Create production package structure
log_info "Creating production package..."
mkdir -p "$BUILD_DIR"

# Copy built client files
cp -r "$DIST_DIR"/ "$BUILD_DIR"/
log_success "Copied client files"

# Copy server-side code
if [ -d "$SRC_LIB_DIR" ]; then
    mkdir -p "$BUILD_DIR/src/lib"
    cp -r "$SRC_LIB_DIR"/ "$BUILD_DIR/src/lib/"
    log_success "Copied server libraries"
fi

if [ -d "$SRC_ROUTES_DIR" ]; then
    mkdir -p "$BUILD_DIR/src/routes"
    cp -r "$SRC_ROUTES_DIR"/ "$BUILD_DIR/src/routes/"
    log_success "Copied API routes"
fi

# Copy essential files
cp package.json "$BUILD_DIR"/
cp package-lock.json "$BUILD_DIR"/ 2>/dev/null || log_warning "package-lock.json not found"
cp server.js "$BUILD_DIR"/
log_success "Copied configuration files"

# Copy scripts
if [ -d "$SCRIPTS_DIR" ]; then
    cp -r "$SCRIPTS_DIR"/ "$BUILD_DIR"/
    chmod +x "$BUILD_DIR/scripts"/*.sh 2>/dev/null || true
    log_success "Copied deployment scripts"
fi

# Create production environment template
cat > "$BUILD_DIR/.env.production" << 'EOF'
# Phone Range Nexus Production Configuration
NODE_ENV=production
PORT=8080
HOST=0.0.0.0

# Database Configuration
DATABASE_TYPE=sqlite
SQLITE_DB_PATH=/opt/phone-range-nexus/data/phone-range-nexus.db
DATABASE_BACKUP_PATH=/opt/phone-range-nexus/backups

# Authentication & Security
SESSION_SECRET=CHANGE-THIS-TO-A-SECURE-RANDOM-STRING
AUTH_SESSION_DURATION=8h
DEFAULT_ADMIN_USERNAME=admin
DEFAULT_ADMIN_PASSWORD=CHANGE-THIS-PASSWORD

# Network Configuration
ALLOWED_ORIGINS=http://localhost:8080
CORS_ENABLED=true
TRUST_PROXY=true

# Backup Configuration
AUTO_BACKUP_ENABLED=true
BACKUP_RETENTION_DAYS=30
EOF

log_success "Created production environment template"

# Create systemd service file
cat > "$BUILD_DIR/phone-range-nexus.service" << 'EOF'
[Unit]
Description=Phone Range Nexus Server
After=network.target

[Service]
Type=simple
User=www-data
Group=www-data
WorkingDirectory=/opt/phone-range-nexus
ExecStart=/usr/bin/node server.js
Restart=on-failure
RestartSec=10
Environment=NODE_ENV=production
EnvironmentFile=/opt/phone-range-nexus/.env

# Security settings
NoNewPrivileges=true
PrivateTmp=true
ProtectSystem=strict
ProtectHome=true
ReadWritePaths=/opt/phone-range-nexus/data /opt/phone-range-nexus/logs /opt/phone-range-nexus/backups

# Resource limits
LimitNOFILE=65536
LimitNPROC=4096

[Install]
WantedBy=multi-user.target
EOF

log_success "Created systemd service file"

# Create nginx configuration template
cat > "$BUILD_DIR/nginx-site.conf" << 'EOF'
server {
    listen 80;
    server_name your-server-ip your-domain.com;
    
    # Security headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header Referrer-Policy "no-referrer-when-downgrade" always;
    
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
    }
    
    # Health check
    location /health {
        proxy_pass http://127.0.0.1:8080;
        access_log off;
    }
}
EOF

log_success "Created nginx configuration template"

# Create deployment README
cat > "$BUILD_DIR/DEPLOY.md" << 'EOF'
# Phone Range Nexus Deployment Package

This package contains everything needed to deploy Phone Range Nexus on a server.

## Quick Start

1. Upload this package to your server: `/opt/phone-range-nexus/`
2. Install dependencies: `npm ci --only=production`
3. Configure environment: `cp .env.production .env` and edit
4. Install systemd service: `sudo cp phone-range-nexus.service /etc/systemd/system/`
5. Configure nginx: `sudo cp nginx-site.conf /etc/nginx/sites-available/phone-range-nexus`
6. Start services: `sudo systemctl enable --now phone-range-nexus`

## Files Included

- `server.js` - Main server application
- `dist/` - Built client application
- `src/` - Server-side code (database, routes, etc.)
- `scripts/` - Deployment and maintenance scripts
- `.env.production` - Environment template (rename to `.env`)
- `phone-range-nexus.service` - Systemd service file
- `nginx-site.conf` - Nginx configuration template

For detailed deployment instructions, see README-DEPLOYMENT.md in the source repository.
EOF

log_success "Created deployment README"

# Create installation script
cat > "$BUILD_DIR/install.sh" << 'EOF'
#!/bin/bash

# Phone Range Nexus Installation Script
set -e

INSTALL_DIR="/opt/phone-range-nexus"
SERVICE_NAME="phone-range-nexus"

echo "🚀 Installing Phone Range Nexus..."

# Check if running as root
if [ "$EUID" -ne 0 ]; then
    echo "❌ Please run as root (use sudo)"
    exit 1
fi

# Create directories
mkdir -p $INSTALL_DIR/{data,backups,logs}
chown -R www-data:www-data $INSTALL_DIR

# Install dependencies
cd $INSTALL_DIR
npm ci --only=production

# Install systemd service
cp $SERVICE_NAME.service /etc/systemd/system/
systemctl daemon-reload
systemctl enable $SERVICE_NAME

# Set up environment
if [ ! -f .env ]; then
    cp .env.production .env
    echo "⚠️  Please edit .env file with your configuration"
fi

echo "✅ Installation complete!"
echo "📝 Next steps:"
echo "   1. Edit .env file: nano $INSTALL_DIR/.env"
echo "   2. Configure nginx: cp nginx-site.conf /etc/nginx/sites-available/"
echo "   3. Start service: systemctl start $SERVICE_NAME"
EOF

chmod +x "$BUILD_DIR/install.sh"
log_success "Created installation script"

# Generate build info
BUILD_DATE=$(date -u +"%Y-%m-%dT%H:%M:%SZ")
BUILD_HASH=$(git rev-parse --short HEAD 2>/dev/null || echo "unknown")
BUILD_VERSION=$(node -p "require('./package.json').version" 2>/dev/null || echo "unknown")

cat > "$BUILD_DIR/build-info.json" << EOF
{
  "version": "$BUILD_VERSION",
  "buildDate": "$BUILD_DATE",
  "buildHash": "$BUILD_HASH",
  "nodeVersion": "$(node -v)",
  "environment": "production"
}
EOF

log_success "Generated build information"

# Package summary
PACKAGE_SIZE=$(du -sh "$BUILD_DIR" | cut -f1)
FILE_COUNT=$(find "$BUILD_DIR" -type f | wc -l)

echo ""
log_success "🎉 Production build complete!"
echo ""
echo "📦 Package Information:"
echo "   📁 Location: $BUILD_DIR"
echo "   📏 Size: $PACKAGE_SIZE"
echo "   📄 Files: $FILE_COUNT"
echo "   🏷️  Version: $BUILD_VERSION"
echo "   📅 Built: $BUILD_DATE"
echo ""
echo "📋 Next Steps:"
echo "   1. Test the package locally: cd $BUILD_DIR && npm start"
echo "   2. Upload to server: rsync -avz $BUILD_DIR/ user@server:/opt/phone-range-nexus/"
echo "   3. Run installation: sudo ./install.sh"
echo ""
echo "📚 For detailed deployment instructions, see README-DEPLOYMENT.md"
EOF

# Make the script executable
chmod +x scripts/build-production.sh

log_success "Build script is ready!"