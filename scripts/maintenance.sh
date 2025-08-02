#!/bin/bash

# Phone Range Nexus Database Maintenance Script
# This script performs routine database maintenance tasks

set -e

# Configuration from environment variables or defaults
DB_PATH="${SQLITE_DB_PATH:-/opt/phone-range-nexus/data/phone-range-nexus.db}"
BACKUP_DIR="${DATABASE_BACKUP_PATH:-/opt/phone-range-nexus/backups}"
LOG_DIR="${LOG_DIR:-/opt/phone-range-nexus/logs}"
MAINTENANCE_LOG="$LOG_DIR/maintenance.log"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

log_info() {
    local msg="$(date '+%Y-%m-%d %H:%M:%S') - INFO - $1"
    echo -e "${BLUE}ℹ️  $msg${NC}"
    echo "$msg" >> "$MAINTENANCE_LOG"
}

log_success() {
    local msg="$(date '+%Y-%m-%d %H:%M:%S') - SUCCESS - $1"
    echo -e "${GREEN}✅ $msg${NC}"
    echo "$msg" >> "$MAINTENANCE_LOG"
}

log_warning() {
    local msg="$(date '+%Y-%m-%d %H:%M:%S') - WARNING - $1"
    echo -e "${YELLOW}⚠️  $msg${NC}"
    echo "$msg" >> "$MAINTENANCE_LOG"
}

log_error() {
    local msg="$(date '+%Y-%m-%d %H:%M:%S') - ERROR - $1"
    echo -e "${RED}❌ $msg${NC}"
    echo "$msg" >> "$MAINTENANCE_LOG"
}

# Ensure log directory exists
ensure_log_dir() {
    if [ ! -d "$LOG_DIR" ]; then
        mkdir -p "$LOG_DIR"
        if command -v chown >/dev/null 2>&1; then
            chown www-data:www-data "$LOG_DIR" 2>/dev/null || true
        fi
        chmod 755 "$LOG_DIR"
    fi
}

# Check if database exists and is accessible
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

# Create backup before maintenance
create_backup() {
    log_info "Creating backup before maintenance..."
    
    if [ -f "$(dirname "$0")/backup-database.sh" ]; then
        if bash "$(dirname "$0")/backup-database.sh"; then
            log_success "Pre-maintenance backup completed"
            return 0
        else
            log_error "Pre-maintenance backup failed"
            return 1
        fi
    else
        log_warning "Backup script not found, skipping backup"
        return 0
    fi
}

# Check database integrity
check_integrity() {
    log_info "Checking database integrity..."
    
    local integrity_result
    integrity_result=$(sqlite3 "$DB_PATH" "PRAGMA integrity_check;" 2>&1)
    
    if echo "$integrity_result" | grep -q "ok"; then
        log_success "Database integrity check passed"
        return 0
    else
        log_error "Database integrity issues detected:"
        echo "$integrity_result" | while read -r line; do
            log_error "  $line"
        done
        return 1
    fi
}

# Analyze database for query optimization
analyze_database() {
    log_info "Analyzing database for query optimization..."
    
    if sqlite3 "$DB_PATH" "PRAGMA analysis_limit=400; ANALYZE;" 2>/dev/null; then
        log_success "Database analysis completed"
        return 0
    else
        log_error "Database analysis failed"
        return 1
    fi
}

# Optimize database performance
optimize_database() {
    log_info "Optimizing database performance..."
    
    # Get database size before optimization
    local size_before
    if command -v stat >/dev/null 2>&1; then
        size_before=$(stat -f%z "$DB_PATH" 2>/dev/null || stat -c%s "$DB_PATH" 2>/dev/null || echo "0")
    else
        size_before="unknown"
    fi
    
    log_info "Database size before optimization: $size_before bytes"
    
    # Run PRAGMA optimize
    if sqlite3 "$DB_PATH" "PRAGMA optimize;" 2>/dev/null; then
        log_success "PRAGMA optimize completed"
    else
        log_error "PRAGMA optimize failed"
        return 1
    fi
    
    # Run VACUUM to reclaim space
    log_info "Running VACUUM to reclaim space..."
    if sqlite3 "$DB_PATH" "VACUUM;" 2>/dev/null; then
        log_success "VACUUM completed"
        
        # Get database size after optimization
        local size_after
        if command -v stat >/dev/null 2>&1; then
            size_after=$(stat -f%z "$DB_PATH" 2>/dev/null || stat -c%s "$DB_PATH" 2>/dev/null || echo "0")
        else
            size_after="unknown"
        fi
        
        log_info "Database size after optimization: $size_after bytes"
        
        if [ "$size_before" != "unknown" ] && [ "$size_after" != "unknown" ] && [ "$size_before" -gt "$size_after" ]; then
            local saved=$((size_before - size_after))
            log_success "Space reclaimed: $saved bytes"
        fi
    else
        log_error "VACUUM failed"
        return 1
    fi
    
    return 0
}

# Clean up temporary files
cleanup_temp_files() {
    log_info "Cleaning up temporary files..."
    
    local cleanup_count=0
    
    # Clean up old SQLite temporary files
    for pattern in "*.db-wal" "*.db-shm" "*-journal"; do
        if ls /tmp/$pattern 2>/dev/null | grep -q "phone-range-nexus"; then
            rm -f /tmp/$pattern 2>/dev/null || true
            cleanup_count=$((cleanup_count + 1))
        fi
    done
    
    # Clean up old log files (older than 90 days)
    if command -v find >/dev/null 2>&1 && [ -d "$LOG_DIR" ]; then
        local old_logs
        old_logs=$(find "$LOG_DIR" -name "*.log.*" -mtime +90 2>/dev/null | wc -l)
        if [ "$old_logs" -gt 0 ]; then
            find "$LOG_DIR" -name "*.log.*" -mtime +90 -delete 2>/dev/null || true
            cleanup_count=$((cleanup_count + old_logs))
            log_info "Removed $old_logs old log files"
        fi
    fi
    
    if [ $cleanup_count -gt 0 ]; then
        log_success "Cleaned up $cleanup_count temporary files"
    else
        log_info "No temporary files to clean up"
    fi
}

# Update database statistics
update_statistics() {
    log_info "Updating database statistics..."
    
    # Get current statistics
    local stats
    stats=$(sqlite3 "$DB_PATH" "
        SELECT 
            'Phone Numbers: ' || COUNT(*) 
        FROM phone_numbers
        UNION ALL
        SELECT 
            'Number Ranges: ' || COUNT(*) 
        FROM number_ranges
        UNION ALL
        SELECT 
            'Audit Entries: ' || COUNT(*) 
        FROM audit_log;
    " 2>/dev/null)
    
    if [ -n "$stats" ]; then
        log_info "Current database statistics:"
        echo "$stats" | while read -r line; do
            log_info "  $line"
        done
    else
        log_warning "Could not retrieve database statistics"
    fi
}

# Check WAL mode status
check_wal_mode() {
    log_info "Checking WAL mode status..."
    
    local journal_mode
    journal_mode=$(sqlite3 "$DB_PATH" "PRAGMA journal_mode;" 2>/dev/null)
    
    if [ "$journal_mode" = "wal" ]; then
        log_success "Database is using WAL mode"
        
        # Check WAL file size
        local wal_file="${DB_PATH}-wal"
        if [ -f "$wal_file" ]; then
            local wal_size
            if command -v stat >/dev/null 2>&1; then
                wal_size=$(stat -f%z "$wal_file" 2>/dev/null || stat -c%s "$wal_file" 2>/dev/null || echo "0")
            else
                wal_size="unknown"
            fi
            log_info "WAL file size: $wal_size bytes"
            
            # If WAL file is large, checkpoint it
            if [ "$wal_size" != "unknown" ] && [ "$wal_size" -gt 10485760 ]; then # 10MB
                log_info "WAL file is large, running checkpoint..."
                if sqlite3 "$DB_PATH" "PRAGMA wal_checkpoint(FULL);" >/dev/null 2>&1; then
                    log_success "WAL checkpoint completed"
                else
                    log_warning "WAL checkpoint failed"
                fi
            fi
        else
            log_info "No WAL file present"
        fi
    else
        log_warning "Database is not using WAL mode (current: $journal_mode)"
        log_info "Consider enabling WAL mode for better concurrency"
    fi
}

# Generate maintenance report
generate_report() {
    local report_file="$LOG_DIR/maintenance_report_$(date +%Y%m%d_%H%M%S).txt"
    
    log_info "Generating maintenance report: $report_file"
    
    cat > "$report_file" << EOF
Phone Range Nexus Database Maintenance Report
Generated: $(date)
Database: $DB_PATH

=== Database Information ===
EOF
    
    # Add database info to report
    if sqlite3 "$DB_PATH" ".schema" >/dev/null 2>&1; then
        echo "Database schema: Valid" >> "$report_file"
        
        # Add table counts
        sqlite3 "$DB_PATH" "
            SELECT 'phone_numbers: ' || COUNT(*) FROM phone_numbers
            UNION ALL
            SELECT 'number_ranges: ' || COUNT(*) FROM number_ranges
            UNION ALL
            SELECT 'audit_log: ' || COUNT(*) FROM audit_log
            UNION ALL
            SELECT 'bulk_operations: ' || COUNT(*) FROM bulk_operations;
        " 2>/dev/null >> "$report_file" || echo "Could not retrieve table counts" >> "$report_file"
        
        # Add database size
        if command -v stat >/dev/null 2>&1; then
            local db_size=$(stat -f%z "$DB_PATH" 2>/dev/null || stat -c%s "$DB_PATH" 2>/dev/null || echo "unknown")
            echo "Database size: $db_size bytes" >> "$report_file"
        fi
    else
        echo "Database schema: ERROR - Could not read schema" >> "$report_file"
    fi
    
    echo "" >> "$report_file"
    echo "=== Maintenance Log ===" >> "$report_file"
    
    # Add recent maintenance log entries
    if [ -f "$MAINTENANCE_LOG" ]; then
        tail -50 "$MAINTENANCE_LOG" >> "$report_file"
    fi
    
    log_success "Maintenance report generated: $report_file"
}

# Main maintenance function
run_maintenance() {
    log_info "Starting database maintenance process..."
    log_info "Database: $DB_PATH"
    log_info "Backup directory: $BACKUP_DIR"
    log_info "Log directory: $LOG_DIR"
    
    local maintenance_failed=false
    
    # Check database accessibility
    if ! check_database; then
        log_error "Database check failed, aborting maintenance"
        return 1
    fi
    
    # Create backup
    if ! create_backup; then
        log_warning "Backup failed, continuing with caution"
    fi
    
    # Check integrity
    if ! check_integrity; then
        log_error "Integrity check failed, aborting optimization"
        maintenance_failed=true
    fi
    
    # Only proceed with optimization if integrity check passed
    if [ "$maintenance_failed" = false ]; then
        # Optimize database
        if ! optimize_database; then
            log_error "Database optimization failed"
            maintenance_failed=true
        fi
        
        # Analyze database
        if ! analyze_database; then
            log_error "Database analysis failed"
            maintenance_failed=true
        fi
    fi
    
    # Check WAL mode (informational only)
    check_wal_mode
    
    # Update statistics
    update_statistics
    
    # Clean up temporary files
    cleanup_temp_files
    
    # Generate report
    generate_report
    
    if [ "$maintenance_failed" = false ]; then
        log_success "Database maintenance completed successfully!"
        return 0
    else
        log_error "Database maintenance completed with errors"
        return 1
    fi
}

# Handle command line arguments
case "${1:-}" in
    --integrity)
        ensure_log_dir
        check_database && check_integrity
        exit $?
        ;;
    --optimize)
        ensure_log_dir
        check_database && optimize_database
        exit $?
        ;;
    --analyze)
        ensure_log_dir
        check_database && analyze_database
        exit $?
        ;;
    --cleanup)
        ensure_log_dir
        cleanup_temp_files
        exit $?
        ;;
    --stats)
        ensure_log_dir
        check_database && update_statistics
        exit $?
        ;;
    --report)
        ensure_log_dir
        generate_report
        exit $?
        ;;
    --wal)
        ensure_log_dir
        check_database && check_wal_mode
        exit $?
        ;;
    --help)
        echo "Phone Range Nexus Database Maintenance Script"
        echo ""
        echo "Usage: $0 [OPTIONS]"
        echo ""
        echo "Options:"
        echo "  (no args)     Run full maintenance process"
        echo "  --integrity   Check database integrity only"
        echo "  --optimize    Optimize database only"
        echo "  --analyze     Analyze database only"
        echo "  --cleanup     Clean up temporary files only"
        echo "  --stats       Show database statistics only"
        echo "  --report      Generate maintenance report only"
        echo "  --wal         Check WAL mode status only"
        echo "  --help        Show this help message"
        echo ""
        echo "Environment Variables:"
        echo "  SQLITE_DB_PATH        Path to database file"
        echo "  DATABASE_BACKUP_PATH  Backup directory"
        echo "  LOG_DIR              Log directory"
        exit 0
        ;;
    "")
        # Run full maintenance
        ensure_log_dir
        run_maintenance
        exit $?
        ;;
    *)
        log_error "Unknown option: $1"
        echo "Use --help for usage information"
        exit 1
        ;;
esac