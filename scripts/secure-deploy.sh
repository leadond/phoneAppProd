#!/bin/bash

# Phone Range Nexus - Secure Deployment Script
# This script creates a secure deployment package that protects source code from end users

set -e  # Exit on any error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
APP_NAME="phone-range-nexus"
DEPLOYMENT_DIR="deployment"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
PACKAGE_NAME="${APP_NAME}_secure_${TIMESTAMP}"

echo -e "${BLUE}🔒 Phone Range Nexus - Secure Deployment Package Creator${NC}"
echo "=================================================================="
echo ""

# Function to print status
print_status() {
    echo -e "${GREEN}✓${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}⚠${NC} $1"
}

print_error() {
    echo -e "${RED}✗${NC} $1"
}

# Check if we're in the right directory
if [ ! -f "package.json" ] || [ ! -d "src" ]; then
    print_error "This script must be run from the Phone Range Nexus root directory"
    exit 1
fi

# Check if Node.js and npm are available
if ! command -v npm &> /dev/null; then
    print_error "npm is required but not installed"
    exit 1
fi

echo "🏗️  Building production application..."

# Clean previous builds
rm -rf dist/
print_status "Cleaned previous build files"

# Install dependencies (if needed)
if [ ! -d "node_modules" ]; then
    echo "📦 Installing dependencies..."
    npm install
    print_status "Dependencies installed"
fi

# Run security audit
echo "🔍 Running security audit..."
if ! npm audit --audit-level high; then
    print_warning "Security vulnerabilities detected. Run 'npm audit fix' to resolve."
    read -p "Continue anyway? (y/N): " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        exit 1
    fi
fi

# Build the application
echo "🔨 Building production application..."
if ! npm run build:prod; then
    print_error "Production build failed"
    exit 1
fi
print_status "Production build completed"

# Verify build output
if [ ! -d "dist" ] || [ ! -f "dist/index.html" ]; then
    print_error "Build output is incomplete"
    exit 1
fi
print_status "Build output verified"

# Create deployment directory
echo "📁 Creating secure deployment package..."
rm -rf $DEPLOYMENT_DIR
mkdir -p $DEPLOYMENT_DIR/$PACKAGE_NAME

# Create directory structure
mkdir -p $DEPLOYMENT_DIR/$PACKAGE_NAME/public
mkdir -p $DEPLOYMENT_DIR/$PACKAGE_NAME/private
mkdir -p $DEPLOYMENT_DIR/$PACKAGE_NAME/config
mkdir -p $DEPLOYMENT_DIR/$PACKAGE_NAME/scripts

print_status "Created deployment directory structure"

# Copy PUBLIC files (what users CAN access)
echo "📋 Copying public files (user-accessible)..."
cp -r dist/* $DEPLOYMENT_DIR/$PACKAGE_NAME/public/
print_status "Copied application files to public directory"

# Copy PRIVATE files (what users CANNOT access)
echo "🔒 Copying private files (admin-only)..."
cp -r src/ $DEPLOYMENT_DIR/$PACKAGE_NAME/private/
cp package.json $DEPLOYMENT_DIR/$PACKAGE_NAME/private/
cp *.md $DEPLOYMENT_DIR/$PACKAGE_NAME/private/ 2>/dev/null || true
cp .env* $DEPLOYMENT_DIR/$PACKAGE_NAME/private/ 2>/dev/null || true
cp -r scripts/ $DEPLOYMENT_DIR/$PACKAGE_NAME/private/ 2>/dev/null || true
cp -r tests/ $DEPLOYMENT_DIR/$PACKAGE_NAME/private/ 2>/dev/null || true
print_status "Copied private files to secure directory"

# Create configuration files
echo "⚙️  Creating deployment configuration files..."

# Create Nginx configuration
cat > $DEPLOYMENT_DIR/$PACKAGE_NAME/config/nginx-site.conf << 'EOF'
# Phone Range Nexus - Secure Nginx Configuration
# This configuration ensures users can only access the application, not source code

server {
    listen 443 ssl http2;
    server_name YOUR_DOMAIN_HERE;
    
    # SSL Configuration (update paths)
    ssl_certificate /path/to/your/certificate.crt;
    ssl_certificate_key /path/to/your/private.key;
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers ECDHE-RSA-AES256-GCM-SHA512:DHE-RSA-AES256-GCM-SHA512;
    ssl_prefer_server_ciphers off;
    
    # Security Headers
    add_header Strict-Transport-Security "max-age=63072000; includeSubDomains; preload" always;
    add_header X-Frame-Options DENY always;
    add_header X-Content-Type-Options nosniff always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header Referrer-Policy "strict-origin-when-cross-origin" always;
    add_header Content-Security-Policy "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; font-src 'self' data:; connect-src 'self'; media-src 'self'; object-src 'none'; child-src 'none'; worker-src 'self'; frame-ancestors 'none'; form-action 'self'; base-uri 'self';" always;
    
    # PUBLIC: Application files (users can access)
    root /var/www/html/phone-range-nexus;
    index index.html;
    
    # Serve the application
    location / {
        try_files $uri $uri/ /index.html;
        
        # Cache static assets
        location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot)$ {
            expires 1y;
            add_header Cache-Control "public, immutable";
        }
        
        # Security for HTML files
        location ~* \.html$ {
            add_header Cache-Control "no-cache, no-store, must-revalidate";
            expires 0;
        }
    }
    
    # SECURITY: Block access to sensitive files/directories
    
    # Block access to source code and config files
    location ~ /\.(env|git|config) {
        deny all;
        return 404;
    }
    
    # Block access to common sensitive files
    location ~* \.(md|json|yml|yaml|lock|log)$ {
        deny all;
        return 404;
    }
    
    # Block access to directories that shouldn't be public
    location ~ ^/(src|scripts|node_modules|tests?|docs?|\.git|private) {
        deny all;
        return 404;
    }
    
    # Block access to backup files
    location ~* \.(bak|backup|old|orig|save|swp|tmp)$ {
        deny all;
        return 404;
    }
    
    # Block access to hidden files
    location ~ /\. {
        deny all;
        return 404;
    }
}

# Redirect HTTP to HTTPS
server {
    listen 80;
    server_name YOUR_DOMAIN_HERE;
    return 301 https://$server_name$request_uri;
}
EOF

# Create Apache configuration
cat > $DEPLOYMENT_DIR/$PACKAGE_NAME/config/apache-site.conf << 'EOF'
# Phone Range Nexus - Secure Apache Configuration

<VirtualHost *:443>
    ServerName YOUR_DOMAIN_HERE
    DocumentRoot /var/www/html/phone-range-nexus
    
    # SSL Configuration
    SSLEngine on
    SSLCertificateFile /path/to/your/certificate.crt
    SSLCertificateKeyFile /path/to/your/private.key
    
    # Security Headers
    Header always set X-Frame-Options DENY
    Header always set X-Content-Type-Options nosniff
    Header always set X-XSS-Protection "1; mode=block"
    Header always set Strict-Transport-Security "max-age=31536000; includeSubDomains"
    Header always set Referrer-Policy "strict-origin-when-cross-origin"
    
    # Serve React app
    <Directory /var/www/html/phone-range-nexus>
        Options -Indexes
        AllowOverride None
        Require all granted
        
        # Handle React Router
        RewriteEngine On
        RewriteBase /
        RewriteRule ^index\.html$ - [L]
        RewriteCond %{REQUEST_FILENAME} !-f
        RewriteCond %{REQUEST_FILENAME} !-d
        RewriteRule . /index.html [L]
    </Directory>
    
    # SECURITY: Block access to sensitive files
    
    # Block source code and config files
    <LocationMatch "^/(src|scripts|node_modules|tests?|docs?|private)">
        Require all denied
    </LocationMatch>
    
    # Block sensitive file types
    <FilesMatch "\.(env|md|json|yml|yaml|lock|log|bak|backup|old|orig|save|swp|tmp)$">
        Require all denied
    </FilesMatch>
    
    # Block hidden files and directories
    <FilesMatch "^\.">
        Require all denied
    </FilesMatch>
</VirtualHost>

# Redirect HTTP to HTTPS
<VirtualHost *:80>
    ServerName YOUR_DOMAIN_HERE
    Redirect permanent / https://YOUR_DOMAIN_HERE/
</VirtualHost>
EOF

# Create deployment script
cat > $DEPLOYMENT_DIR/$PACKAGE_NAME/scripts/deploy-to-server.sh << 'EOF'
#!/bin/bash

# Phone Range Nexus - Server Deployment Script
# Run this script on your server to deploy the application securely

set -e

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

print_status() {
    echo -e "${GREEN}✓${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}⚠${NC} $1"
}

print_error() {
    echo -e "${RED}✗${NC} $1"
}

echo "🚀 Deploying Phone Range Nexus to server..."

# Check if running as root or with sudo
if [ "$EUID" -ne 0 ]; then
    print_error "This script must be run as root or with sudo"
    exit 1
fi

# Create directory structure
echo "📁 Creating secure directory structure..."
mkdir -p /var/www/html/phone-range-nexus
mkdir -p /var/www/phone-range-nexus-private
print_status "Directory structure created"

# Copy public files (web accessible)
echo "📋 Copying public files..."
cp -r public/* /var/www/html/phone-range-nexus/
print_status "Public files copied"

# Copy private files (not web accessible)
echo "🔒 Copying private files to secure location..."
cp -r private/* /var/www/phone-range-nexus-private/
print_status "Private files secured"

# Set proper permissions
echo "🔐 Setting secure file permissions..."

# Public files: readable by web server
find /var/www/html/phone-range-nexus -type f -exec chmod 644 {} \;
find /var/www/html/phone-range-nexus -type d -exec chmod 755 {} \;
chown -R www-data:www-data /var/www/html/phone-range-nexus

# Private files: not accessible by web server
find /var/www/phone-range-nexus-private -type f -exec chmod 640 {} \;
find /var/www/phone-range-nexus-private -type d -exec chmod 750 {} \;
chown -R root:root /var/www/phone-range-nexus-private

# Extra security for sensitive files
chmod 600 /var/www/phone-range-nexus-private/.env* 2>/dev/null || true
chmod 600 /var/www/phone-range-nexus-private/package.json 2>/dev/null || true

print_status "File permissions set securely"

echo ""
echo "🎉 Deployment completed successfully!"
echo ""
echo "Next steps:"
echo "1. Configure your web server (Nginx/Apache) using the provided config files"
echo "2. Update the server name in the configuration"
echo "3. Install SSL certificate"
echo "4. Test that source files are blocked from web access"
echo ""
echo "Web accessible files: /var/www/html/phone-range-nexus"
echo "Private files: /var/www/phone-range-nexus-private"
EOF

chmod +x $DEPLOYMENT_DIR/$PACKAGE_NAME/scripts/deploy-to-server.sh

# Create verification script
cat > $DEPLOYMENT_DIR/$PACKAGE_NAME/scripts/verify-security.sh << 'EOF'
#!/bin/bash

# Phone Range Nexus - Security Verification Script
# Tests that source code is properly protected from web access

DOMAIN="$1"
if [ -z "$DOMAIN" ]; then
    echo "Usage: $0 <your-domain.com>"
    exit 1
fi

RED='\033[0;31m'
GREEN='\033[0;32m'
NC='\033[0m'

test_blocked() {
    local url="$1"
    local description="$2"
    
    response=$(curl -s -o /dev/null -w "%{http_code}" "https://$DOMAIN$url" 2>/dev/null || echo "000")
    
    if [ "$response" = "404" ] || [ "$response" = "403" ]; then
        echo -e "${GREEN}✓ SECURE${NC}: $description (HTTP $response)"
        return 0
    else
        echo -e "${RED}✗ EXPOSED${NC}: $description (HTTP $response)"
        return 1
    fi
}

test_accessible() {
    local url="$1"
    local description="$2"
    
    response=$(curl -s -o /dev/null -w "%{http_code}" "https://$DOMAIN$url" 2>/dev/null || echo "000")
    
    if [ "$response" = "200" ]; then
        echo -e "${GREEN}✓ ACCESSIBLE${NC}: $description (HTTP $response)"
        return 0
    else
        echo -e "${RED}✗ BLOCKED${NC}: $description (HTTP $response)"
        return 1
    fi
}

echo "🔍 Testing security for https://$DOMAIN"
echo "============================================"

# Test that these should be BLOCKED (return 404/403)
echo ""
echo "Testing protected files (these should be BLOCKED):"
test_blocked "/src/" "Source code directory"
test_blocked "/package.json" "Package configuration"
test_blocked "/.env" "Environment variables"
test_blocked "/scripts/" "Scripts directory"
test_blocked "/node_modules/" "Node modules"
test_blocked "/private/" "Private directory"
test_blocked "/.git/" "Git repository"
test_blocked "/README.md" "Documentation"

# Test that these should be ACCESSIBLE (return 200)
echo ""
echo "Testing public files (these should be ACCESSIBLE):"
test_accessible "/" "Application homepage"
test_accessible "/assets/" "Assets directory"

echo ""
echo "Security test completed."
EOF

chmod +x $DEPLOYMENT_DIR/$PACKAGE_NAME/scripts/verify-security.sh

print_status "Created deployment and verification scripts"

# Create README for deployment
cat > $DEPLOYMENT_DIR/$PACKAGE_NAME/README-DEPLOYMENT.md << 'EOF'
# Phone Range Nexus - Secure Deployment Package

## 🔒 Security Overview

This deployment package ensures that:
- ✅ Users can access the application interface
- ❌ Users CANNOT access source code, configuration, or sensitive files

## 📁 Directory Structure

```
phone-range-nexus_secure_[timestamp]/
├── public/                    # ✅ Web accessible files
│   ├── index.html            # Application interface
│   └── assets/               # Compiled CSS/JS/Images
├── private/                  # ❌ NOT web accessible
│   ├── src/                  # Source code
│   ├── package.json          # Configuration
│   ├── .env                  # Environment variables
│   └── scripts/              # Build scripts
├── config/                   # Web server configurations
│   ├── nginx-site.conf       # Nginx configuration
│   └── apache-site.conf      # Apache configuration
└── scripts/                  # Deployment scripts
    ├── deploy-to-server.sh   # Server deployment
    └── verify-security.sh    # Security testing
```

## 🚀 Deployment Steps

### 1. Upload to Server
```bash
# Copy the entire package to your server
scp -r phone-range-nexus_secure_[timestamp] user@your-server:/tmp/
```

### 2. Run Deployment Script
```bash
# On your server, run the deployment script as root
cd /tmp/phone-range-nexus_secure_[timestamp]
sudo ./scripts/deploy-to-server.sh
```

### 3. Configure Web Server

#### For Nginx:
```bash
# Copy and edit the configuration
sudo cp config/nginx-site.conf /etc/nginx/sites-available/phone-range-nexus
sudo nano /etc/nginx/sites-available/phone-range-nexus
# Update YOUR_DOMAIN_HERE and SSL certificate paths

# Enable the site
sudo ln -s /etc/nginx/sites-available/phone-range-nexus /etc/nginx/sites-enabled/
sudo nginx -t && sudo systemctl reload nginx
```

#### For Apache:
```bash
# Copy and edit the configuration
sudo cp config/apache-site.conf /etc/apache2/sites-available/phone-range-nexus.conf
sudo nano /etc/apache2/sites-available/phone-range-nexus.conf
# Update YOUR_DOMAIN_HERE and SSL certificate paths

# Enable the site
sudo a2ensite phone-range-nexus
sudo apache2ctl configtest && sudo systemctl reload apache2
```

### 4. Install SSL Certificate
- Use Let's Encrypt: `sudo certbot --nginx` or `sudo certbot --apache`
- Or install your custom certificate

### 5. Verify Security
```bash
# Test that source code is properly protected
./scripts/verify-security.sh your-domain.com
```

## 🔐 Security Features

- **Source Code Protected**: All TypeScript/React source files are in `/var/www/phone-range-nexus-private/`
- **Web Server Blocks**: Nginx/Apache configurations block access to sensitive files
- **File Permissions**: Private files have restricted permissions
- **HTTPS Enforced**: All traffic redirected to secure connections
- **Security Headers**: XSS, CSP, HSTS protections enabled

## ✅ What Users Can Access
- `https://your-domain.com/` - Application interface
- `https://your-domain.com/assets/` - Compiled CSS/JS/Images

## ❌ What Users CANNOT Access
- `https://your-domain.com/src/` - 404 Error
- `https://your-domain.com/package.json` - 404 Error  
- `https://your-domain.com/.env` - 404 Error
- `https://your-domain.com/private/` - 404 Error

## 🧪 Testing

After deployment, verify security by trying to access:
- Source files should return 404/403 errors
- Application should work normally at your domain
- All functionality should be preserved

## 📞 Support

- Application login: admin / admin123
- Documentation: See private/README.md after deployment
- Security issues: Review verification script output

Your source code remains completely secure and inaccessible to end users!
EOF

print_status "Created deployment documentation"

# Create deployment info file
cat > $DEPLOYMENT_DIR/$PACKAGE_NAME/DEPLOYMENT-INFO.txt << EOF
Phone Range Nexus - Secure Deployment Package
===========================================

Package Created: $(date)
Build Version: Production
Security Level: High (Source code protected)

Files Included:
- public/: Web accessible application files ($(du -sh $DEPLOYMENT_DIR/$PACKAGE_NAME/public | cut -f1))
- private/: Source code and configuration ($(du -sh $DEPLOYMENT_DIR/$PACKAGE_NAME/private | cut -f1))
- config/: Web server configurations
- scripts/: Deployment and verification tools

Total Package Size: $(du -sh $DEPLOYMENT_DIR/$PACKAGE_NAME | cut -f1)

Next Steps:
1. Upload package to your server
2. Run deployment script as root
3. Configure web server (Nginx/Apache)
4. Install SSL certificate
5. Verify security with testing script

Login Credentials:
Username: admin
Password: admin123

Security Status: ✅ SECURE
- Source code protected from web access
- Environment variables secured
- Configuration files blocked
- Security headers configured
EOF

# Create compressed package
echo "📦 Creating compressed deployment package..."
cd $DEPLOYMENT_DIR
tar -czf ${PACKAGE_NAME}.tar.gz $PACKAGE_NAME/
cd ..

print_status "Created compressed package: $DEPLOYMENT_DIR/${PACKAGE_NAME}.tar.gz"

# Display summary
echo ""
echo -e "${GREEN}🎉 Secure deployment package created successfully!${NC}"
echo ""
echo "📦 Package location: $DEPLOYMENT_DIR/${PACKAGE_NAME}/"
echo "🗜️  Compressed: $DEPLOYMENT_DIR/${PACKAGE_NAME}.tar.gz"
echo ""
echo -e "${BLUE}Security Features:${NC}"
echo "✅ Source code protected from web access"
echo "✅ Configuration files secured"
echo "✅ Environment variables blocked"
echo "✅ Web server configurations included"
echo "✅ Deployment scripts provided"
echo "✅ Security verification tools included"
echo ""
echo -e "${YELLOW}Next Steps:${NC}"
echo "1. Upload package to your server"
echo "2. Extract: tar -xzf ${PACKAGE_NAME}.tar.gz"
echo "3. Run: sudo ./scripts/deploy-to-server.sh"
echo "4. Configure web server with provided configs"
echo "5. Test security: ./scripts/verify-security.sh your-domain.com"
echo ""
echo -e "${GREEN}Your application source code will remain completely secure!${NC}"