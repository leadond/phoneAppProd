#!/bin/bash

# Phone Range Nexus Deployment Script
# This script automates deployment to a remote server

set -e

# Default configuration
DEFAULT_SERVER_USER="root"
DEFAULT_DEPLOY_PATH="/opt/phone-range-nexus"
DEFAULT_SERVICE_NAME="phone-range-nexus"

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

# Usage information
show_usage() {
    cat << EOF
Phone Range Nexus Deployment Script

Usage: $0 [OPTIONS] <server-host>

Arguments:
  server-host       IP address or hostname of the target server

Options:
  -u, --user        SSH username (default: $DEFAULT_SERVER_USER)
  -p, --path        Deployment path on server (default: $DEFAULT_DEPLOY_PATH)
  -k, --key         SSH private key file
  -P, --port        SSH port (default: 22)
  --skip-build      Skip the build process (use existing build)
  --skip-backup     Skip creating backup of existing deployment
  --dry-run         Show commands that would be executed without running them
  --help            Show this help message

Examples:
  $0 192.168.1.100
  $0 -u deploy -k ~/.ssh/deploy_key myserver.com
  $0 --user=www-data --port=2222 production.example.com

Environment Variables:
  DEPLOY_SERVER_HOST    Target server hostname/IP
  DEPLOY_SERVER_USER    SSH username
  DEPLOY_SSH_KEY        Path to SSH private key
  DEPLOY_PATH           Target deployment path

The script will:
1. Build the application for production
2. Create a backup of the existing deployment
3. Upload the new build to the server
4. Install dependencies and configure services
5. Start/restart the application
6. Verify the deployment
EOF
}

# Parse command line arguments
parse_args() {
    SERVER_USER="${DEPLOY_SERVER_USER:-$DEFAULT_SERVER_USER}"
    DEPLOY_PATH="${DEPLOY_PATH:-$DEFAULT_DEPLOY_PATH}"
    SSH_KEY="${DEPLOY_SSH_KEY:-}"
    SSH_PORT="22"
    SKIP_BUILD=false
    SKIP_BACKUP=false
    DRY_RUN=false
    
    while [[ $# -gt 0 ]]; do
        case $1 in
            -u|--user)
                SERVER_USER="$2"
                shift 2
                ;;
            --user=*)
                SERVER_USER="${1#*=}"
                shift
                ;;
            -p|--path)
                DEPLOY_PATH="$2"
                shift 2
                ;;
            --path=*)
                DEPLOY_PATH="${1#*=}"
                shift
                ;;
            -k|--key)
                SSH_KEY="$2"
                shift 2
                ;;
            --key=*)
                SSH_KEY="${1#*=}"
                shift
                ;;
            -P|--port)
                SSH_PORT="$2"
                shift 2
                ;;
            --port=*)
                SSH_PORT="${1#*=}"
                shift
                ;;
            --skip-build)
                SKIP_BUILD=true
                shift
                ;;
            --skip-backup)
                SKIP_BACKUP=true
                shift
                ;;
            --dry-run)
                DRY_RUN=true
                shift
                ;;
            --help)
                show_usage
                exit 0
                ;;
            -*)
                log_error "Unknown option: $1"
                show_usage
                exit 1
                ;;
            *)
                if [ -z "${SERVER_HOST:-}" ]; then
                    SERVER_HOST="$1"
                else
                    log_error "Multiple hostnames provided: $SERVER_HOST and $1"
                    exit 1
                fi
                shift
                ;;
        esac
    done
    
    # Use environment variable if no host provided
    SERVER_HOST="${SERVER_HOST:-${DEPLOY_SERVER_HOST:-}}"
    
    if [ -z "$SERVER_HOST" ]; then
        log_error "Server hostname/IP is required"
        show_usage
        exit 1
    fi
}

# Build SSH command with proper options
build_ssh_cmd() {
    local ssh_cmd="ssh"
    
    if [ -n "$SSH_KEY" ]; then
        ssh_cmd="$ssh_cmd -i $SSH_KEY"
    fi
    
    if [ "$SSH_PORT" != "22" ]; then
        ssh_cmd="$ssh_cmd -p $SSH_PORT"
    fi
    
    ssh_cmd="$ssh_cmd -o ConnectTimeout=10 -o StrictHostKeyChecking=no"
    echo "$ssh_cmd"
}

# Build rsync command with proper options
build_rsync_cmd() {
    local rsync_cmd="rsync -avz --delete"
    
    if [ -n "$SSH_KEY" ]; then
        rsync_cmd="$rsync_cmd -e 'ssh -i $SSH_KEY -p $SSH_PORT -o StrictHostKeyChecking=no'"
    else
        rsync_cmd="$rsync_cmd -e 'ssh -p $SSH_PORT -o StrictHostKeyChecking=no'"
    fi
    
    echo "$rsync_cmd"
}

# Execute command (with dry-run support)
execute_cmd() {
    if [ "$DRY_RUN" = true ]; then
        log_info "DRY RUN: $*"
    else
        "$@"
    fi
}

# Check prerequisites
check_prerequisites() {
    log_info "Checking prerequisites..."
    
    # Check if required commands are available
    for cmd in node npm rsync ssh; do
        if ! command -v $cmd >/dev/null 2>&1; then
            log_error "$cmd is not installed or not in PATH"
            exit 1
        fi
    done
    
    # Check if SSH key exists
    if [ -n "$SSH_KEY" ] && [ ! -f "$SSH_KEY" ]; then
        log_error "SSH key file not found: $SSH_KEY"
        exit 1
    fi
    
    # Test SSH connection
    log_info "Testing SSH connection to $SERVER_HOST..."
    local ssh_cmd=$(build_ssh_cmd)
    
    if [ "$DRY_RUN" = false ]; then
        if ! $ssh_cmd $SERVER_USER@$SERVER_HOST "echo 'SSH connection successful'" >/dev/null 2>&1; then
            log_error "Cannot connect to $SERVER_HOST as $SERVER_USER"
            log_error "Please check your SSH configuration and try again"
            exit 1
        fi
    fi
    
    log_success "Prerequisites check passed"
}

# Build application for production
build_application() {
    if [ "$SKIP_BUILD" = true ]; then
        log_info "Skipping build process (--skip-build specified)"
        
        if [ ! -d "production-package" ]; then
            log_error "Production package not found. Run without --skip-build to create it."
            exit 1
        fi
        
        return 0
    fi
    
    log_info "Building application for production..."
    
    if [ -f "scripts/build-production.sh" ]; then
        execute_cmd bash scripts/build-production.sh
        log_success "Production build completed"
    else
        log_error "Build script not found: scripts/build-production.sh"
        exit 1
    fi
}

# Create backup of existing deployment
create_backup() {
    if [ "$SKIP_BACKUP" = true ]; then
        log_info "Skipping backup creation (--skip-backup specified)"
        return 0
    fi
    
    log_info "Creating backup of existing deployment..."
    local ssh_cmd=$(build_ssh_cmd)
    local timestamp=$(date +"%Y%m%d_%H%M%S")
    local backup_path="${DEPLOY_PATH}.backup-${timestamp}"
    
    execute_cmd $ssh_cmd $SERVER_USER@$SERVER_HOST << EOF
if [ -d "$DEPLOY_PATH" ]; then
    echo "Creating backup: $backup_path"
    cp -r "$DEPLOY_PATH" "$backup_path"
    echo "Backup created successfully"
else
    echo "No existing deployment found, skipping backup"
fi
EOF
    
    log_success "Backup process completed"
}

# Upload application to server
upload_application() {
    log_info "Uploading application to server..."
    
    local rsync_cmd=$(build_rsync_cmd)
    
    # Create target directory
    local ssh_cmd=$(build_ssh_cmd)
    execute_cmd $ssh_cmd $SERVER_USER@$SERVER_HOST "mkdir -p $DEPLOY_PATH"
    
    # Upload files
    execute_cmd eval "$rsync_cmd production-package/ $SERVER_USER@$SERVER_HOST:$DEPLOY_PATH/"
    
    log_success "Application uploaded successfully"
}

# Configure server
configure_server() {
    log_info "Configuring server..."
    
    local ssh_cmd=$(build_ssh_cmd)
    
    execute_cmd $ssh_cmd $SERVER_USER@$SERVER_HOST << EOF
set -e

cd "$DEPLOY_PATH"

# Create necessary directories
mkdir -p data backups logs
chown -R www-data:www-data . 2>/dev/null || echo "Warning: Could not change ownership to www-data"

# Install dependencies
echo "Installing production dependencies..."
npm ci --only=production --silent

# Set up environment file
if [ ! -f .env ]; then
    echo "Setting up environment file..."
    cp .env.production .env
    echo "⚠️  IMPORTANT: Edit .env file with your configuration"
fi

# Make scripts executable
chmod +x scripts/*.sh 2>/dev/null || true

# Install systemd service
if [ -f "$DEFAULT_SERVICE_NAME.service" ]; then
    echo "Installing systemd service..."
    cp "$DEFAULT_SERVICE_NAME.service" /etc/systemd/system/
    systemctl daemon-reload
    systemctl enable "$DEFAULT_SERVICE_NAME"
else
    echo "⚠️  Systemd service file not found"
fi

# Configure nginx (if template exists)
if [ -f nginx-site.conf ]; then
    echo "Nginx configuration template available at: nginx-site.conf"
    echo "To install: cp nginx-site.conf /etc/nginx/sites-available/$DEFAULT_SERVICE_NAME"
fi

echo "✅ Server configuration completed"
EOF
    
    log_success "Server configuration completed"
}

# Start/restart services
manage_services() {
    log_info "Starting/restarting services..."
    
    local ssh_cmd=$(build_ssh_cmd)
    
    execute_cmd $ssh_cmd $SERVER_USER@$SERVER_HOST << EOF
set -e

# Stop service if running
if systemctl is-active --quiet "$DEFAULT_SERVICE_NAME"; then
    echo "Stopping existing service..."
    systemctl stop "$DEFAULT_SERVICE_NAME"
fi

# Start service
echo "Starting service..."
systemctl start "$DEFAULT_SERVICE_NAME"

# Check service status
sleep 2
if systemctl is-active --quiet "$DEFAULT_SERVICE_NAME"; then
    echo "✅ Service started successfully"
    systemctl status "$DEFAULT_SERVICE_NAME" --no-pager -l
else
    echo "❌ Service failed to start"
    journalctl -u "$DEFAULT_SERVICE_NAME" --no-pager -l --since "1 minute ago"
    exit 1
fi
EOF
    
    log_success "Services started successfully"
}

# Verify deployment
verify_deployment() {
    log_info "Verifying deployment..."
    
    local ssh_cmd=$(build_ssh_cmd)
    
    # Get server info
    execute_cmd $ssh_cmd $SERVER_USER@$SERVER_HOST << EOF
cd "$DEPLOY_PATH"

echo "=== Deployment Verification ==="
echo "Deployment path: $DEPLOY_PATH"
echo "Service status: \$(systemctl is-active $DEFAULT_SERVICE_NAME 2>/dev/null || echo 'unknown')"
echo "Node.js version: \$(node -v 2>/dev/null || echo 'not found')"
echo "Application version: \$(cat build-info.json 2>/dev/null | grep version || echo 'unknown')"
echo ""

# Test health endpoint
echo "Testing health endpoint..."
if curl -f -s http://localhost:8080/health >/dev/null 2>&1; then
    echo "✅ Health check passed"
    curl -s http://localhost:8080/health | head -10
else
    echo "⚠️  Health check failed - service may still be starting"
fi

echo ""
echo "=== Recent Service Logs ==="
journalctl -u "$DEFAULT_SERVICE_NAME" --no-pager -l --since "5 minutes ago" | tail -20 || echo "Could not retrieve logs"
EOF
    
    log_success "Deployment verification completed"
}

# Generate deployment report
generate_report() {
    local report_file="deployment_report_$(date +%Y%m%d_%H%M%S).txt"
    
    log_info "Generating deployment report: $report_file"
    
    cat > "$report_file" << EOF
Phone Range Nexus Deployment Report
Generated: $(date)
Target Server: $SERVER_HOST
Deploy Path: $DEPLOY_PATH
User: $SERVER_USER

=== Deployment Configuration ===
Skip Build: $SKIP_BUILD
Skip Backup: $SKIP_BACKUP
SSH Key: ${SSH_KEY:-"(default)"}
SSH Port: $SSH_PORT

=== Deployment Status ===
EOF
    
    if [ "$DRY_RUN" = true ]; then
        echo "Status: DRY RUN - No actual deployment performed" >> "$report_file"
    else
        echo "Status: Deployment completed successfully" >> "$report_file"
        echo "Timestamp: $(date)" >> "$report_file"
    fi
    
    echo "" >> "$report_file"
    echo "=== Next Steps ===" >> "$report_file"
    echo "1. Verify the application is accessible at http://$SERVER_HOST:8080" >> "$report_file"
    echo "2. Configure nginx reverse proxy if needed" >> "$report_file"
    echo "3. Set up SSL certificate for production use" >> "$report_file"
    echo "4. Configure firewall rules" >> "$report_file"
    echo "5. Set up monitoring and alerts" >> "$report_file"
    
    log_success "Deployment report generated: $report_file"
}

# Main deployment function
main() {
    log_info "🚀 Starting Phone Range Nexus deployment..."
    log_info "Target: $SERVER_USER@$SERVER_HOST:$DEPLOY_PATH"
    
    if [ "$DRY_RUN" = true ]; then
        log_warning "DRY RUN MODE - No actual changes will be made"
    fi
    
    # Run deployment steps
    check_prerequisites
    build_application
    create_backup
    upload_application
    configure_server
    manage_services
    verify_deployment
    generate_report
    
    echo ""
    log_success "🎉 Deployment completed successfully!"
    echo ""
    log_info "📋 Summary:"
    log_info "  📡 Server: $SERVER_HOST"
    log_info "  📁 Path: $DEPLOY_PATH"
    log_info "  👤 User: $SERVER_USER"
    log_info "  🌐 URL: http://$SERVER_HOST:8080"
    echo ""
    log_info "📚 Next steps:"
    log_info "  1. Access the application at http://$SERVER_HOST:8080"
    log_info "  2. Configure your environment variables in $DEPLOY_PATH/.env"
    log_info "  3. Set up nginx reverse proxy for production"
    log_info "  4. Configure SSL certificate"
    echo ""
}

# Script entry point
if [ "${BASH_SOURCE[0]}" = "${0}" ]; then
    parse_args "$@"
    main
fi