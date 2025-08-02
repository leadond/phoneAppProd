# Phone Range Nexus - Production Deployment Guide

## Overview
This guide provides step-by-step instructions for deploying Phone Range Nexus to a production environment with enhanced security measures.

## Prerequisites

### System Requirements
- Node.js 18+ or Docker
- Web server (Nginx/Apache recommended)
- SSL certificate for HTTPS
- Firewall configuration capability
- Backup storage solution

### Network Requirements
- HTTPS-only access (port 443)
- SSH access (port 22) for administration
- All other ports should be blocked
- Corporate firewall compatibility

## Deployment Steps

### 1. Prepare Production Environment

#### Clone and Setup
```bash
# Clone the repository
git clone <repository-url>
cd phone-range-nexus

# Install dependencies
npm install

# Copy production environment
cp .env.production .env
```

#### Environment Configuration
Edit `.env` file with your specific settings:
```bash
# Update these values for your environment
VITE_ALLOWED_ORIGINS=https://your-domain.com
VITE_SESSION_TIMEOUT=3600000  # Adjust as needed
VITE_MAX_LOGIN_ATTEMPTS=5     # Customize security policy
```

### 2. Build for Production

```bash
# Build the application
npm run build

# Verify build output
ls -la dist/
```

### 3. Web Server Configuration

#### Nginx Configuration
Create `/etc/nginx/sites-available/phone-range-nexus`:

```nginx
# Redirect HTTP to HTTPS
server {
    listen 80;
    server_name your-domain.com www.your-domain.com;
    return 301 https://your-domain.com$request_uri;
}

# Main HTTPS server
server {
    listen 443 ssl http2;
    server_name your-domain.com;
    
    # SSL Configuration
    ssl_certificate /path/to/your/certificate.crt;
    ssl_certificate_key /path/to/your/private.key;
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers ECDHE-RSA-AES256-GCM-SHA512:DHE-RSA-AES256-GCM-SHA512;
    ssl_prefer_server_ciphers off;
    ssl_session_cache shared:SSL:10m;
    ssl_session_timeout 10m;
    
    # Security Headers
    add_header Strict-Transport-Security "max-age=63072000; includeSubDomains; preload" always;
    add_header X-Frame-Options DENY always;
    add_header X-Content-Type-Options nosniff always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header Referrer-Policy "strict-origin-when-cross-origin" always;
    add_header Content-Security-Policy "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; font-src 'self' data:; connect-src 'self'; media-src 'self'; object-src 'none'; child-src 'none'; worker-src 'self'; frame-ancestors 'none'; form-action 'self'; base-uri 'self';" always;
    
    # Application Root
    root /var/www/phone-range-nexus/dist;
    index index.html;
    
    # Gzip Compression
    gzip on;
    gzip_vary on;
    gzip_min_length 1024;
    gzip_types text/plain text/css text/xml text/javascript application/javascript application/xml+rss application/json;
    
    # Cache Control
    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot)$ {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }
    
    # Main application
    location / {
        try_files $uri $uri/ /index.html;
        
        # Additional security for HTML files
        location ~* \.html$ {
            add_header Cache-Control "no-cache, no-store, must-revalidate";
            add_header Pragma "no-cache";
            add_header Expires "0";
        }
    }
    
    # Security: Block access to sensitive files
    location ~ /\. {
        deny all;
    }
    
    location ~* \.(env|log|config)$ {
        deny all;
    }
    
    # Rate limiting for login attempts
    location /api/auth {
        limit_req zone=login burst=5 nodelay;
        proxy_pass http://localhost:3000;
    }
    
    # Access and error logs
    access_log /var/log/nginx/phone-range-nexus.access.log;
    error_log /var/log/nginx/phone-range-nexus.error.log;
}

# Rate limiting configuration (add to http block in nginx.conf)
# limit_req_zone $binary_remote_addr zone=login:10m rate=1r/s;
```

#### Enable the site
```bash
# Create symbolic link
sudo ln -s /etc/nginx/sites-available/phone-range-nexus /etc/nginx/sites-enabled/

# Test configuration
sudo nginx -t

# Reload Nginx
sudo systemctl reload nginx
```

### 4. SSL Certificate Setup

#### Using Let's Encrypt (Recommended)
```bash
# Install Certbot
sudo apt install certbot python3-certbot-nginx

# Obtain certificate
sudo certbot --nginx -d your-domain.com

# Test auto-renewal
sudo certbot renew --dry-run
```

#### Using Custom Certificate
```bash
# Copy your certificate files
sudo cp your-certificate.crt /etc/ssl/certs/
sudo cp your-private.key /etc/ssl/private/
sudo chmod 600 /etc/ssl/private/your-private.key
```

### 5. Firewall Configuration

#### UFW (Ubuntu)
```bash
# Reset firewall
sudo ufw --force reset

# Default policies
sudo ufw default deny incoming
sudo ufw default allow outgoing

# Allow SSH (change port if different)
sudo ufw allow 22/tcp

# Allow HTTP/HTTPS
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp

# Enable firewall
sudo ufw enable

# Check status
sudo ufw status verbose
```

#### iptables (CentOS/RHEL)
```bash
# Save current rules
iptables-save > /tmp/iptables.backup

# Flush existing rules
iptables -F
iptables -X
iptables -t nat -F
iptables -t nat -X

# Set default policies
iptables -P INPUT DROP
iptables -P FORWARD DROP
iptables -P OUTPUT ACCEPT

# Allow loopback
iptables -A INPUT -i lo -j ACCEPT

# Allow established connections
iptables -A INPUT -m state --state ESTABLISHED,RELATED -j ACCEPT

# Allow SSH
iptables -A INPUT -p tcp --dport 22 -j ACCEPT

# Allow HTTP/HTTPS
iptables -A INPUT -p tcp --dport 80 -j ACCEPT
iptables -A INPUT -p tcp --dport 443 -j ACCEPT

# Save rules
service iptables save
```

### 6. System Service Setup (Optional)

#### Systemd service for application monitoring
Create `/etc/systemd/system/phone-range-nexus.service`:

```ini
[Unit]
Description=Phone Range Nexus Application
After=network.target

[Service]
Type=simple
User=www-data
Group=www-data
WorkingDirectory=/var/www/phone-range-nexus
ExecStart=/usr/bin/python3 -m http.server 8080 --directory dist
ExecReload=/bin/kill -HUP $MAINPID
Restart=always
RestartSec=10

[Install]
WantedBy=multi-user.target
```

```bash
# Enable and start service
sudo systemctl enable phone-range-nexus
sudo systemctl start phone-range-nexus
sudo systemctl status phone-range-nexus
```

### 7. Monitoring Setup

#### Log Monitoring
```bash
# Monitor Nginx logs
sudo tail -f /var/log/nginx/phone-range-nexus.access.log
sudo tail -f /var/log/nginx/phone-range-nexus.error.log

# Monitor system logs
sudo journalctl -f -u nginx
sudo journalctl -f -u phone-range-nexus
```

#### Security Monitoring Script
Create `/usr/local/bin/security-monitor.sh`:

```bash
#!/bin/bash
# Security monitoring script for Phone Range Nexus

LOG_FILE="/var/log/phone-range-nexus-security.log"
ALERT_EMAIL="admin@your-domain.com"

# Check for suspicious login attempts
suspicious_logins=$(grep -c "failed login" /var/log/nginx/phone-range-nexus.access.log | tail -100)
if [ "$suspicious_logins" -gt 10 ]; then
    echo "$(date): High number of failed login attempts detected: $suspicious_logins" >> $LOG_FILE
    # Send alert email (configure mail system)
    # echo "Security Alert: High failed login attempts" | mail -s "Security Alert" $ALERT_EMAIL
fi

# Check for unusual access patterns
unusual_access=$(grep -c "404\|403\|500" /var/log/nginx/phone-range-nexus.access.log | tail -100)
if [ "$unusual_access" -gt 50 ]; then
    echo "$(date): Unusual access patterns detected: $unusual_access errors" >> $LOG_FILE
fi

# Check disk space
disk_usage=$(df /var/www/phone-range-nexus | awk 'NR==2 {print $5}' | sed 's/%//')
if [ "$disk_usage" -gt 80 ]; then
    echo "$(date): High disk usage: ${disk_usage}%" >> $LOG_FILE
fi

# Rotate logs if they get too large
find /var/log/nginx/ -name "phone-range-nexus*.log" -size +100M -exec logrotate -f /etc/logrotate.d/nginx {} \;
```

### 8. Backup Configuration

#### Automated Backup Script
Create `/usr/local/bin/backup-phone-range-nexus.sh`:

```bash
#!/bin/bash
# Backup script for Phone Range Nexus

BACKUP_DIR="/backup/phone-range-nexus"
APP_DIR="/var/www/phone-range-nexus"
DATE=$(date +%Y%m%d_%H%M%S)

# Create backup directory
mkdir -p $BACKUP_DIR

# Backup application files
tar -czf $BACKUP_DIR/app_$DATE.tar.gz -C $APP_DIR .

# Backup Nginx configuration
tar -czf $BACKUP_DIR/nginx_$DATE.tar.gz /etc/nginx/sites-available/phone-range-nexus

# Backup SSL certificates
tar -czf $BACKUP_DIR/ssl_$DATE.tar.gz /etc/ssl/certs/ /etc/ssl/private/

# Clean old backups (keep 30 days)
find $BACKUP_DIR -name "*.tar.gz" -mtime +30 -delete

# Log backup completion
echo "$(date): Backup completed successfully" >> /var/log/phone-range-nexus-backup.log
```

#### Setup Cron Jobs
```bash
# Edit crontab
sudo crontab -e

# Add these lines:
# Daily backup at 2 AM
0 2 * * * /usr/local/bin/backup-phone-range-nexus.sh

# Security monitoring every hour
0 * * * * /usr/local/bin/security-monitor.sh

# SSL certificate renewal check (twice daily)
0 0,12 * * * /usr/bin/certbot renew --quiet
```

### 9. Health Checks

#### Application Health Check
Create a simple health check script:

```bash
#!/bin/bash
# Health check script

DOMAIN="your-domain.com"
EXPECTED_STATUS=200

# Check HTTPS response
status=$(curl -s -o /dev/null -w "%{http_code}" https://$DOMAIN)

if [ "$status" -eq "$EXPECTED_STATUS" ]; then
    echo "$(date): Application is healthy (HTTP $status)"
    exit 0
else
    echo "$(date): Application health check failed (HTTP $status)"
    # Restart services if needed
    sudo systemctl restart nginx
    exit 1
fi
```

### 10. Post-Deployment Verification

#### Security Checklist
- [ ] HTTPS enforced (HTTP redirects to HTTPS)
- [ ] Security headers present
- [ ] SSL certificate valid and trusted
- [ ] Firewall rules active
- [ ] Access logs enabled
- [ ] Backup system functional
- [ ] Monitoring alerts configured
- [ ] Default credentials changed
- [ ] File permissions secure
- [ ] Unnecessary services disabled

#### Performance Testing
```bash
# Test SSL configuration
openssl s_client -connect your-domain.com:443 -servername your-domain.com

# Test security headers
curl -I https://your-domain.com

# Load testing (optional)
# Use tools like Apache Bench, wrk, or k6 for load testing
```

### 11. Maintenance Procedures

#### Regular Updates
```bash
# Update system packages
sudo apt update && sudo apt upgrade

# Update Node.js dependencies (test in staging first)
npm update
npm audit fix

# Rebuild application
npm run build

# Restart services
sudo systemctl restart nginx
```

#### Security Audits
- Monthly dependency vulnerability scans
- Quarterly SSL certificate checks
- Annual penetration testing
- Regular log analysis
- Access control reviews

### 12. Troubleshooting

#### Common Issues

**Issue: 502 Bad Gateway**
- Check if application service is running
- Verify Nginx proxy configuration
- Check firewall rules

**Issue: SSL Certificate Errors**
- Verify certificate validity and expiration
- Check certificate chain completeness
- Ensure proper file permissions

**Issue: Performance Issues**
- Monitor system resources
- Check log files for errors
- Analyze access patterns
- Consider CDN implementation

#### Log Locations
- Application logs: `/var/log/phone-range-nexus/`
- Nginx logs: `/var/log/nginx/`
- System logs: `/var/log/syslog`
- Security logs: `/var/log/auth.log`

## Support and Maintenance

### Contact Information
- System Administrator: [Your Contact]
- Security Team: [Security Contact]
- Emergency Contact: [24/7 Contact]

### Documentation
- Security Configuration: `SECURITY-CONFIGURATION.md`
- User Manual: `README.md`
- API Documentation: `docs/api.md`

---
*This deployment guide should be customized for your specific environment and security requirements.*