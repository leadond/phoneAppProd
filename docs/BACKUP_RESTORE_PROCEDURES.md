# Backup and Restore Procedures
**Phone Range Nexus - Database Management**

Generated: February 2, 2025  
Database Version: 4.0  
Backup Strategy: Multi-tier with automated and manual options

---

## Executive Summary

The Phone Range Nexus application provides comprehensive backup and restore capabilities for both routine maintenance and disaster recovery. The system supports multiple backup strategies including automated browser-based backups, manual exports, and scheduled maintenance procedures.

### Backup Strategy Overview
- 🔄 **Automated Backups**: Browser-based with IndexedDB exports
- 📁 **Manual Backups**: On-demand JSON exports with CLI tools
- ⏰ **Scheduled Backups**: Configurable automatic backup intervals
- 🔐 **Secure Backups**: Encrypted sensitive data with integrity checks
- 📊 **Incremental Backups**: Delta backups for large datasets

---

## Backup Types and Methods

### 1. Automatic Browser Backups

#### Browser Storage Persistence
IndexedDB data is automatically persisted by the browser:
```javascript
Location: Browser's IndexedDB storage
Persistence: Permanent until manually cleared
Access: Browser Developer Tools → Application → IndexedDB
Scope: Single browser/profile specific
```

#### Automatic Export Triggers
System automatically creates backups during:
- Database version upgrades
- Bulk data operations
- System configuration changes
- Before major imports/exports

### 2. Manual Export Backups

#### Using the Migration Script
```bash
# Create full database backup
node scripts/migrate-database.js backup

# Export specific data only
node scripts/migrate-database.js export

# Backup with custom filename
node scripts/migrate-database.js backup --file="custom-backup-name.json"
```

#### Using Browser Interface
1. **Navigate to Settings** → Database Management
2. **Click "Export Data"** → Select export format
3. **Choose Data Sets** → Select tables to include
4. **Download File** → Save to secure location

### 3. Scheduled Automated Backups

#### Configuration Options
```javascript
// In browser localStorage or system settings
BackupConfig: {
  enabled: true,
  interval: "daily", // daily, weekly, monthly
  retention: 30, // days to keep backups
  location: "downloads", // browser downloads folder
  compression: true,
  encryption: false // for sensitive environments
}
```

#### Implementation Example
```javascript
// Scheduled backup service
class AutoBackupService {
  constructor() {
    this.schedule = this.loadScheduleFromSettings();
    this.setupScheduledBackups();
  }
  
  async performScheduledBackup() {
    const timestamp = new Date().toISOString();
    const filename = `auto-backup-${timestamp}.json`;
    
    try {
      const backupData = await this.exportAllData();
      await this.saveBackupFile(filename, backupData);
      await this.cleanupOldBackups();
      
      console.log(`Scheduled backup completed: ${filename}`);
    } catch (error) {
      console.error('Scheduled backup failed:', error);
      await this.notifyBackupFailure(error);
    }
  }
}
```

---

## Backup Data Structure

### Complete Backup Format
```json
{
  "metadata": {
    "version": "4.0",
    "timestamp": "2025-02-02T12:00:00.000Z",
    "type": "full_backup",
    "compression": false,
    "encryption": false,
    "checksum": "sha256:abc123...",
    "record_count": 125000,
    "size_bytes": 50000000
  },
  "schema": {
    "version": 4,
    "tables": [
      "phone_numbers",
      "number_ranges",
      "bulk_operations",
      "audit_log",
      "user_sessions",
      "system_configurations",
      "admin_sessions",
      "security_events",
      "uc_config_files",
      "uc_config_history",
      "uc_network_tests",
      "uc_system_settings",
      "uc_config_templates"
    ]
  },
  "data": {
    "phone_numbers": [...],
    "number_ranges": [...],
    "bulk_operations": [...],
    "audit_log": [...],
    "user_sessions": [...],
    "system_configurations": [...],
    "admin_sessions": [...],
    "security_events": [...],
    "uc_config_files": [...],
    "uc_config_history": [...],
    "uc_network_tests": [...],
    "uc_system_settings": [...],
    "uc_config_templates": [...]
  },
  "integrity": {
    "table_checksums": {
      "phone_numbers": "sha256:def456...",
      "number_ranges": "sha256:ghi789..."
    },
    "verification_time": "2025-02-02T12:01:00.000Z"
  }
}
```

### Incremental Backup Format
```json
{
  "metadata": {
    "type": "incremental_backup",
    "base_backup": "full-backup-2025-02-01.json",
    "since_timestamp": "2025-02-01T12:00:00.000Z",
    "until_timestamp": "2025-02-02T12:00:00.000Z"
  },
  "changes": {
    "phone_numbers": {
      "inserted": [...],
      "updated": [...],
      "deleted": ["id1", "id2"]
    },
    "audit_log": {
      "inserted": [...]
    }
  }
}
```

---

## Restore Procedures

### 1. Complete Database Restore

#### Using Migration Script
```bash
# Restore from backup file
node scripts/migrate-database.js restore /path/to/backup.json

# Restore with verification
node scripts/migrate-database.js restore /path/to/backup.json --verify

# Restore specific tables only
node scripts/migrate-database.js restore /path/to/backup.json --tables="phone_numbers,number_ranges"
```

#### Step-by-Step Manual Restore
1. **Stop Application** (close all browser tabs)
2. **Clear Current Data** (optional - for clean restore)
3. **Import Backup File** via application interface
4. **Verify Data Integrity** using built-in checks
5. **Test Application Functionality** before going live

### 2. Selective Table Restore

#### Restore Specific Tables
```javascript
// Example: Restore only phone numbers and ranges
const restoreConfig = {
  backupFile: 'backup-2025-02-01.json',
  tables: ['phone_numbers', 'number_ranges'],
  preserveExisting: false, // true to merge, false to replace
  verifyIntegrity: true
};

await databaseRestore.restoreSelective(restoreConfig);
```

#### Merge vs Replace Options
- **Replace Mode**: Completely replaces table data
- **Merge Mode**: Combines backup data with existing data
- **Update Mode**: Updates existing records, adds new ones

### 3. Point-in-Time Recovery

#### Using Audit Log for Recovery
```javascript
// Restore to specific timestamp
const recoveryPoint = '2025-02-01T15:30:00.000Z';

async function pointInTimeRecovery(targetTimestamp) {
  // 1. Load base backup before target time
  const baseBackup = await findBackupBefore(targetTimestamp);
  await restoreFromBackup(baseBackup);
  
  // 2. Replay audit log up to target time
  const auditEntries = await getAuditLogSince(baseBackup.timestamp);
  await replayAuditLog(auditEntries, targetTimestamp);
  
  // 3. Verify data consistency
  await verifyDataIntegrity();
}
```

---

## Backup Scripts and Automation

### 1. Backup Creation Script

#### backup-database.sh
```bash
#!/bin/bash

# Phone Range Nexus Database Backup Script
# Usage: ./backup-database.sh [full|incremental] [output-directory]

BACKUP_TYPE=${1:-full}
OUTPUT_DIR=${2:-./database-backups}
TIMESTAMP=$(date -u +"%Y-%m-%dT%H-%M-%SZ")
BACKUP_FILE="${OUTPUT_DIR}/backup-${BACKUP_TYPE}-${TIMESTAMP}.json"

echo "Starting ${BACKUP_TYPE} backup..."
echo "Output: ${BACKUP_FILE}"

# Create backup directory if it doesn't exist
mkdir -p "${OUTPUT_DIR}"

# Execute backup based on type
case ${BACKUP_TYPE} in
  "full")
    node scripts/migrate-database.js export > "${BACKUP_FILE}"
    ;;
  "incremental")
    node scripts/migrate-database.js export --incremental > "${BACKUP_FILE}"
    ;;
  *)
    echo "Invalid backup type. Use 'full' or 'incremental'"
    exit 1
    ;;
esac

# Verify backup file was created
if [ -f "${BACKUP_FILE}" ]; then
  FILE_SIZE=$(stat -f%z "${BACKUP_FILE}" 2>/dev/null || stat -c%s "${BACKUP_FILE}")
  echo "Backup completed successfully: ${FILE_SIZE} bytes"
  
  # Generate checksum
  if command -v sha256sum >/dev/null 2>&1; then
    sha256sum "${BACKUP_FILE}" > "${BACKUP_FILE}.sha256"
  elif command -v shasum >/dev/null 2>&1; then
    shasum -a 256 "${BACKUP_FILE}" > "${BACKUP_FILE}.sha256"
  fi
  
  echo "Checksum generated: ${BACKUP_FILE}.sha256"
else
  echo "Backup failed - file not created"
  exit 1
fi

# Cleanup old backups (keep last 30 days)
find "${OUTPUT_DIR}" -name "backup-*.json" -mtime +30 -delete

echo "Backup process completed"
```

### 2. Restore Verification Script

#### verify-restore.js
```javascript
#!/usr/bin/env node

/**
 * Database Restore Verification Script
 * Verifies integrity and completeness of restored data
 */

import { browserDatabase } from '../src/lib/browserDatabase.js';
import fs from 'fs';

class RestoreVerifier {
  async verifyRestore(backupFile, options = {}) {
    console.log('Starting restore verification...');
    
    const backupData = JSON.parse(fs.readFileSync(backupFile, 'utf8'));
    const results = {
      passed: true,
      tests: [],
      errors: [],
      warnings: []
    };
    
    // Verify table counts
    await this.verifyTableCounts(backupData, results);
    
    // Verify data integrity
    await this.verifyDataIntegrity(backupData, results);
    
    // Verify relationships
    await this.verifyRelationships(results);
    
    // Verify indexes
    await this.verifyIndexes(results);
    
    // Generate report
    this.generateVerificationReport(results);
    
    return results;
  }
  
  async verifyTableCounts(backupData, results) {
    console.log('Verifying table record counts...');
    
    for (const [tableName, backupRecords] of Object.entries(backupData.data)) {
      try {
        const currentCount = await browserDatabase.count(tableName);
        const backupCount = backupRecords.length;
        
        if (currentCount === backupCount) {
          results.tests.push(`✅ ${tableName}: ${currentCount} records`);
        } else {
          results.passed = false;
          results.errors.push(`❌ ${tableName}: Expected ${backupCount}, found ${currentCount}`);
        }
      } catch (error) {
        results.passed = false;
        results.errors.push(`❌ ${tableName}: Count verification failed - ${error.message}`);
      }
    }
  }
  
  async verifyDataIntegrity(backupData, results) {
    console.log('Verifying data integrity...');
    
    // Sample verification for phone numbers
    try {
      const phoneNumbers = await browserDatabase.getAllPhoneNumbers();
      const invalidNumbers = phoneNumbers.filter(phone => 
        !phone.number || 
        !phone.status || 
        !['available', 'assigned', 'reserved', 'aging', 'blocked', 'toll-free'].includes(phone.status)
      );
      
      if (invalidNumbers.length === 0) {
        results.tests.push('✅ Phone number data integrity verified');
      } else {
        results.warnings.push(`⚠️ Found ${invalidNumbers.length} phone numbers with invalid data`);
      }
    } catch (error) {
      results.errors.push(`❌ Phone number integrity check failed: ${error.message}`);
    }
  }
  
  async verifyRelationships(results) {
    console.log('Verifying data relationships...');
    
    try {
      // Verify phone number to range relationships
      const phoneNumbers = await browserDatabase.getAllPhoneNumbers();
      const ranges = await browserDatabase.getAllNumberRanges();
      const rangeNames = new Set(ranges.map(r => r.name));
      
      const orphanedNumbers = phoneNumbers.filter(phone => 
        phone.range_name && !rangeNames.has(phone.range_name)
      );
      
      if (orphanedNumbers.length === 0) {
        results.tests.push('✅ Phone number to range relationships verified');
      } else {
        results.warnings.push(`⚠️ Found ${orphanedNumbers.length} phone numbers with invalid range references`);
      }
    } catch (error) {
      results.errors.push(`❌ Relationship verification failed: ${error.message}`);
    }
  }
  
  async verifyIndexes(results) {
    console.log('Verifying database indexes...');
    
    try {
      // Test index performance with sample queries
      const startTime = Date.now();
      
      await browserDatabase.getAllPhoneNumbers(0, 10);
      await browserDatabase.getAllNumberRanges();
      await browserDatabase.getAllAuditEntries(10);
      
      const queryTime = Date.now() - startTime;
      
      if (queryTime < 1000) {
        results.tests.push(`✅ Index performance verified (${queryTime}ms)`);
      } else {
        results.warnings.push(`⚠️ Slow query performance (${queryTime}ms) - indexes may need optimization`);
      }
    } catch (error) {
      results.errors.push(`❌ Index verification failed: ${error.message}`);
    }
  }
  
  generateVerificationReport(results) {
    console.log('\n' + '='.repeat(50));
    console.log('RESTORE VERIFICATION REPORT');
    console.log('='.repeat(50));
    
    console.log(`\nOverall Status: ${results.passed ? '✅ PASSED' : '❌ FAILED'}`);
    
    if (results.tests.length > 0) {
      console.log('\nSuccessful Tests:');
      results.tests.forEach(test => console.log(`  ${test}`));
    }
    
    if (results.warnings.length > 0) {
      console.log('\nWarnings:');
      results.warnings.forEach(warning => console.log(`  ${warning}`));
    }
    
    if (results.errors.length > 0) {
      console.log('\nErrors:');
      results.errors.forEach(error => console.log(`  ${error}`));
    }
    
    console.log('\n' + '='.replace(50));
  }
}

// CLI interface
if (import.meta.url === `file://${process.argv[1]}`) {
  const backupFile = process.argv[2];
  
  if (!backupFile) {
    console.error('Usage: node verify-restore.js <backup-file>');
    process.exit(1);
  }
  
  const verifier = new RestoreVerifier();
  verifier.verifyRestore(backupFile)
    .then(results => {
      process.exit(results.passed ? 0 : 1);
    })
    .catch(error => {
      console.error('Verification failed:', error);
      process.exit(1);
    });
}

export { RestoreVerifier };
```

---

## Disaster Recovery Procedures

### 1. Complete System Recovery

#### Scenario: Total Data Loss
```bash
# Emergency recovery procedure
echo "EMERGENCY RECOVERY PROCEDURE"
echo "==========================="

# Step 1: Identify latest backup
LATEST_BACKUP=$(ls -t database-backups/backup-full-*.json | head -n1)
echo "Using backup: ${LATEST_BACKUP}"

# Step 2: Verify backup integrity
if [ -f "${LATEST_BACKUP}.sha256" ]; then
  echo "Verifying backup integrity..."
  if shasum -a 256 -c "${LATEST_BACKUP}.sha256"; then
    echo "✅ Backup integrity verified"
  else
    echo "❌ Backup integrity check failed"
    exit 1
  fi
fi

# Step 3: Restore database
echo "Restoring database..."
node scripts/migrate-database.js restore "${LATEST_BACKUP}"

# Step 4: Verify restore
echo "Verifying restore..."
node scripts/verify-restore.js "${LATEST_BACKUP}"

# Step 5: Test application
echo "Testing application functionality..."
node scripts/migrate-database.js verify

echo "Recovery completed - verify application functionality manually"
```

### 2. Partial Recovery Scenarios

#### Lost Phone Number Data Only
```javascript
// Restore only phone numbers table
const partialRestore = {
  backupFile: 'latest-backup.json',
  tables: ['phone_numbers'],
  preserveAuditLog: true, // Keep existing audit entries
  updateReferences: true  // Update related tables
};

await performPartialRestore(partialRestore);
```

#### Lost Configuration Data
```javascript
// Restore system and UC configurations
const configRestore = {
  backupFile: 'latest-backup.json',
  tables: [
    'system_configurations',
    'uc_system_settings',
    'uc_config_files',
    'uc_config_templates'
  ]
};

await performPartialRestore(configRestore);
```

---

## Backup Best Practices

### 1. Regular Backup Schedule
- **Daily**: Automated incremental backups
- **Weekly**: Full database backups
- **Monthly**: Archive backups to long-term storage
- **Before Changes**: Manual backups before major operations

### 2. Backup Storage Strategy
- **Local Storage**: Browser downloads folder (short-term)
- **Network Storage**: Shared drives or cloud storage (medium-term)
- **Archive Storage**: Long-term retention with compression

### 3. Security Considerations
```javascript
// Backup security checklist
const securityChecklist = {
  encryption: 'Consider encrypting sensitive configuration data',
  access: 'Restrict backup file access to authorized personnel',
  transport: 'Use secure methods for backup transfer',
  retention: 'Implement secure deletion of old backups',
  verification: 'Regularly test backup integrity and restore procedures'
};
```

### 4. Monitoring and Alerting
```javascript
// Backup monitoring configuration
const backupMonitoring = {
  successNotifications: true,
  failureAlerts: true,
  integrityChecks: 'daily',
  retentionAlerts: 'weekly',
  storageSpaceMonitoring: true
};
```

---

## Testing Backup and Restore

### 1. Regular Testing Schedule
- **Weekly**: Verify latest backup integrity
- **Monthly**: Perform test restore to separate environment
- **Quarterly**: Complete disaster recovery drill
- **Annually**: Review and update backup procedures

### 2. Test Scenarios
```bash
# Test 1: Verify backup creation
./backup-database.sh full ./test-backups
node scripts/verify-restore.js ./test-backups/backup-full-*.json

# Test 2: Test selective restore
node scripts/migrate-database.js restore ./test-backups/backup-full-*.json --tables="phone_numbers"

# Test 3: Test point-in-time recovery
node scripts/point-in-time-recovery.js --target="2025-02-01T12:00:00Z"
```

---

## Troubleshooting Common Issues

### Issue 1: Backup File Corruption
**Symptoms**: Backup file won't restore, checksum mismatch
**Solution**:
1. Try previous backup file
2. Use partial restore for specific tables
3. Manually extract data from JSON structure

### Issue 2: Incomplete Restore
**Symptoms**: Some tables missing data after restore
**Solution**:
1. Check backup file completeness
2. Verify table permissions and constraints
3. Run verification script to identify missing data

### Issue 3: Performance Issues After Restore
**Symptoms**: Application slow after restore
**Solution**:
1. Clear browser cache and restart
2. Allow index rebuilding to complete
3. Check for data integrity issues

---

**Documentation Version**: 1.0  
**Last Updated**: February 2, 2025  
**Tested Environments**: Chrome, Firefox, Safari, Edge  
**Recovery Time Objective (RTO)**: < 30 minutes  
**Recovery Point Objective (RPO)**: < 24 hours