#!/bin/bash

# Phone Range Nexus Database Backup Script
# This script creates automated backups of the SQLite database

set -e

# Configuration from environment variables or defaults
DB_PATH="${SQLITE_DB_PATH:-/opt/phone-range-nexus/data/phone-range-nexus.db}"
BACKUP_DIR="${DATABASE_BACKUP_PATH:-/opt/phone-range-nexus/backups}"
RETENTION_DAYS="${BACKUP_RETENTION_DAYS:-30}"
COMPRESSION="${BACKUP_COMPRESSION:-true}"
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

log_info() {
    echo -e "${BLUE}ℹ️  $(date '+%Y-%m-%d %H:%M:%S') - $1${NC}"
}

log_success() {
    echo -e "${GREEN}✅ $(date '+%Y-%m-%d %H:%M:%S') - $1${NC}"
}

log_warning() {
    echo -e "${YELLOW}⚠️  $(date '+%Y-%m-%d %H:%M:%S') - $1${NC}"
}

log_error() {
    echo -e "${RED}❌ $(date '+%Y-%m-%d %H:%M:%S') - $1${NC}"
}

# Function to check if database is accessible
check_database() {
    if [ ! -f "$DB_PATH" ]; then
        log_error "Database file not found: $DB_PATH"
        return 1
    fi
    
    if ! sqlite3 "$DB_PATH" "SELECT 1;" >/dev/null 2>&1; then
        log_error "Database is corrupted or inaccessible: $DB_PATH"
        return 1
    fi
    
    return 0
}

# Function to create backup directory
ensure_backup_dir() {
    if [ ! -d "$BACKUP_DIR" ]; then
        log_info "Creating backup directory: $BACKUP_DIR"
        mkdir -p "$BACKUP_DIR"
        
        # Set appropriate permissions
        if command -v chown >/dev/null 2>&1; then
            chown www-data:www-data "$BACKUP_DIR" 2>/dev/null || true
        fi
        chmod 755 "$BACKUP_DIR"
    fi
}

# Function to get database size
get_db_size() {
    if [ -f "$DB_PATH" ]; then
        if command -v stat >/dev/null 2>&1; then
            # Try different stat formats (GNU vs BSD)
            stat -f%z "$DB_PATH" 2>/dev/null || stat -c%s "$DB_PATH" 2>/dev/null || echo "unknown"
        else
            echo "unknown"
        fi
    else
        echo "0"
    fi
}

# Function to create backup
create_backup() {
    local backup_file="$BACKUP_DIR/phone-range-nexus_$TIMESTAMP.db"
    local temp_backup="/tmp/phone-range-nexus_backup_$$.db"
    
    log_info "Creating database backup..."
    
    # Use SQLite .backup command for consistent backup
    if sqlite3 "$DB_PATH" ".backup '$temp_backup'"; then
        log_info "Database backup created: $temp_backup"
        
        # Move to final location
        mv "$temp_backup" "$backup_file"
        
        # Compress backup if enabled
        if [ "$COMPRESSION" = "true" ]; then
            log_info "Compressing backup..."
            if command -v gzip >/dev/null 2>&1; then
                gzip "$backup_file"
                backup_file="$backup_file.gz"
                log_success "Backup compressed: $backup_file"
            else
                log_warning "gzip not available, backup not compressed"
            fi
        fi
        
        # Verify backup
        if [ -f "$backup_file" ]; then
            local backup_size
            if command -v stat >/dev/null 2>&1; then
                backup_size=$(stat -f%z "$backup_file" 2>/dev/null || stat -c%s "$backup_file" 2>/dev/null || echo "unknown")
            else
                backup_size="unknown"
            fi
            
            log_success "Backup created successfully: $backup_file"
            log_info "Backup size: $backup_size bytes"
            
            # Create latest symlink
            local latest_link="$BACKUP_DIR/latest.db"
            if [ "$COMPRESSION" = "true" ]; then
                latest_link="$latest_link.gz"
            fi
            
            ln -sf "$(basename "$backup_file")" "$latest_link"
            log_info "Latest backup symlink updated: $latest_link"
            
            # Log backup creation
            echo "$(date '+%Y-%m-%d %H:%M:%S') - Backup created: $backup_file (size: $backup_size bytes)" >> "$BACKUP_DIR/backup.log"
            
            return 0
        else
            log_error "Backup file not found after creation"
            return 1
        fi
    else
        log_error "Failed to create database backup"
        
        # Clean up temp file if it exists
        [ -f "$temp_backup" ] && rm -f "$temp_backup"
        return 1
    fi
}

# Function to cleanup old backups
cleanup_old_backups() {
    log_info "Cleaning up old backups (older than $RETENTION_DAYS days)..."
    
    local cleanup_count=0
    local pattern
    
    if [ "$COMPRESSION" = "true" ]; then
        pattern="phone-range-nexus_*.db.gz"
    else
        pattern="phone-range-nexus_*.db"
    fi
    
    # Find and delete old backups
    if command -v find >/dev/null 2>&1; then
        while IFS= read -r -d '' file; do
            rm -f "$file"
            cleanup_count=$((cleanup_count + 1))
            log_info "Removed old backup: $(basename "$file")"
        done < <(find "$BACKUP_DIR" -name "$pattern" -mtime +$RETENTION_DAYS -print0 2>/dev/null)
    else
        log_warning "find command not available, skipping cleanup"
        return 0
    fi
    
    if [ $cleanup_count -gt 0 ]; then
        log_success "Cleaned up $cleanup_count old backup(s)"
        echo "$(date '+%Y-%m-%d %H:%M:%S') - Cleaned up $cleanup_count old backups" >> "$BACKUP_DIR/backup.log"
    else
        log_info "No old backups to clean up"
    fi
}

# Function to get backup statistics
get_backup_stats() {
    local total_backups=0
    local total_size=0
    local pattern
    
    if [ "$COMPRESSION" = "true" ]; then
        pattern="phone-range-nexus_*.db.gz"
    else
        pattern="phone-range-nexus_*.db"
    fi
    
    log_info "Backup statistics:"
    
    if command -v find >/dev/null 2>&1; then
        while IFS= read -r -d '' file; do
            total_backups=$((total_backups + 1))
            if command -v stat >/dev/null 2>&1; then
                local size=$(stat -f%z "$file" 2>/dev/null || stat -c%s "$file" 2>/dev/null || echo "0")
                total_size=$((total_size + size))
            fi
        done < <(find "$BACKUP_DIR" -name "$pattern" -print0 2>/dev/null)
    fi
    
    log_info "Total backups: $total_backups"
    
    if [ $total_size -gt 0 ]; then
        if [ $total_size -gt 1048576 ]; then
            # Convert to MB
            local size_mb=$((total_size / 1048576))
            log_info "Total size: ${size_mb}MB"
        else
            # Show in KB
            local size_kb=$((total_size / 1024))
            log_info "Total size: ${size_kb}KB"
        fi
    fi
}

# Function to verify backup integrity
verify_backup() {
    local backup_file="$1"
    
    if [ -z "$backup_file" ]; then
        backup_file="$BACKUP_DIR/latest.db"
        if [ "$COMPRESSION" = "true" ]; then
            backup_file="$backup_file.gz"
        fi
    fi
    
    if [ ! -f "$backup_file" ]; then
        log_error "Backup file not found: $backup_file"
        return 1
    fi
    
    log_info "Verifying backup integrity: $backup_file"
    
    local temp_file="/tmp/verify_backup_$$.db"
    
    # Decompress if needed
    if [[ "$backup_file" == *.gz ]]; then
        if ! gunzip -c "$backup_file" > "$temp_file"; then
            log_error "Failed to decompress backup for verification"
            return 1
        fi
    else
        cp "$backup_file" "$temp_file"
    fi
    
    # Check database integrity
    if sqlite3 "$temp_file" "PRAGMA integrity_check;" | grep -q "ok"; then
        log_success "Backup integrity verified successfully"
        rm -f "$temp_file"
        return 0
    else
        log_error "Backup integrity check failed"
        rm -f "$temp_file"
        return 1
    fi
}

# Main execution
main() {
    log_info "Starting database backup process..."
    log_info "Database: $DB_PATH"
    log_info "Backup directory: $BACKUP_DIR"
    log_info "Retention: $RETENTION_DAYS days"
    log_info "Compression: $COMPRESSION"
    
    # Check if database exists and is accessible
    if ! check_database; then
        exit 1
    fi
    
    # Get original database size
    local original_size=$(get_db_size)
    log_info "Original database size: $original_size bytes"
    
    # Ensure backup directory exists
    ensure_backup_dir
    
    # Create backup
    if create_backup; then
        log_success "Backup creation completed successfully"
        
        # Verify the backup
        if verify_backup; then
            log_success "Backup verification passed"
        else
            log_warning "Backup verification failed, but backup was created"
        fi
        
        # Cleanup old backups
        cleanup_old_backups
        
        # Show statistics
        get_backup_stats
        
        log_success "Database backup process completed successfully!"
        exit 0
    else
        log_error "Backup creation failed"
        exit 1
    fi
}

# Handle command line arguments
case "${1:-}" in
    --verify)
        verify_backup "$2"
        exit $?
        ;;
    --stats)
        ensure_backup_dir
        get_backup_stats
        exit 0
        ;;
    --cleanup)
        ensure_backup_dir
        cleanup_old_backups
        exit 0
        ;;
    --help)
        echo "Phone Range Nexus Database Backup Script"
        echo ""
        echo "Usage: $0 [OPTIONS]"
        echo ""
        echo "Options:"
        echo "  (no args)     Create database backup"
        echo "  --verify [file] Verify backup integrity (latest if no file specified)"
        echo "  --stats       Show backup statistics"
        echo "  --cleanup     Clean up old backups only"
        echo "  --help        Show this help message"
        echo ""
        echo "Environment Variables:"
        echo "  SQLITE_DB_PATH        Path to database file"
        echo "  DATABASE_BACKUP_PATH  Backup directory"
        echo "  BACKUP_RETENTION_DAYS Number of days to keep backups"
        echo "  BACKUP_COMPRESSION    Enable/disable compression (true/false)"
        exit 0
        ;;
    "")
        # Run main backup process
        main
        ;;
    *)
        log_error "Unknown option: $1"
        echo "Use --help for usage information"
        exit 1
        ;;
esac