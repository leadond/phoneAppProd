#!/usr/bin/env node

/**
 * Database Maintenance and Monitoring Script
 * Phone Range Nexus - Production Database Maintenance
 * 
 * This script handles routine database maintenance tasks including
 * cleanup, optimization, monitoring, and health checks.
 */

import { browserDatabase } from '../src/lib/browserDatabase.js';
import fs from 'fs';
import path from 'path';

const MAINTENANCE_LOG_FILE = 'maintenance.log';
const MONITORING_DATA_DIR = 'monitoring-data';
const ALERT_THRESHOLD_FILE = 'alert-thresholds.json';

class DatabaseMaintenance {
  constructor() {
    this.maintenanceStartTime = Date.now();
    this.alerts = [];
    this.warnings = [];
    this.completed = [];
    this.metrics = {};
    this.thresholds = this.loadAlertThresholds();
  }

  loadAlertThresholds() {
    const defaultThresholds = {
      database_size_mb: 500,
      table_record_count: 100000,
      query_response_time_ms: 1000,
      failed_operations_count: 10,
      disk_usage_percent: 80,
      memory_usage_mb: 512,
      audit_log_age_days: 90,
      backup_age_hours: 25,
      security_events_count: 50
    };

    try {
      if (fs.existsSync(ALERT_THRESHOLD_FILE)) {
        const customThresholds = JSON.parse(fs.readFileSync(ALERT_THRESHOLD_FILE, 'utf8'));
        return { ...defaultThresholds, ...customThresholds };
      }
    } catch (error) {
      console.warn('Failed to load custom thresholds, using defaults:', error.message);
    }

    return defaultThresholds;
  }

  async log(message, level = 'INFO') {
    const timestamp = new Date().toISOString();
    const logEntry = `[${timestamp}] [${level}] ${message}\n`;
    
    console.log(`[${level}] ${message}`);
    
    try {
      if (!fs.existsSync(MAINTENANCE_LOG_FILE)) {
        fs.writeFileSync(MAINTENANCE_LOG_FILE, '');
      }
      fs.appendFileSync(MAINTENANCE_LOG_FILE, logEntry);
    } catch (error) {
      console.error('Failed to write to maintenance log:', error);
    }
  }

  async runMaintenanceTasks() {
    await this.log('Starting database maintenance tasks...');
    await this.log('='.repeat(60));

    try {
      // Initialize monitoring data directory
      this.ensureMonitoringDirectory();

      // Core maintenance tasks
      await this.performHealthCheck();
      await this.cleanupAuditLogs();
      await this.optimizeDatabase();
      await this.validateDataIntegrity();
      await this.cleanupBulkOperations();
      
      // UC Admin Tools maintenance
      await this.maintainUCConfigHistory();
      await this.cleanupNetworkTestResults();
      
      // Monitoring and alerting
      await this.collectPerformanceMetrics();
      await this.checkAlertThresholds();
      await this.generateMaintenanceReport();

      const duration = Math.round((Date.now() - this.maintenanceStartTime) / 1000);
      await this.log(`Database maintenance completed in ${duration} seconds`);

      return {
        success: this.alerts.length === 0,
        duration,
        alerts: this.alerts,
        warnings: this.warnings,
        completed: this.completed,
        metrics: this.metrics
      };

    } catch (error) {
      await this.log(`Maintenance failed: ${error.message}`, 'ERROR');
      return {
        success: false,
        error: error.message,
        alerts: this.alerts,
        warnings: this.warnings,
        completed: this.completed
      };
    }
  }

  ensureMonitoringDirectory() {
    if (!fs.existsSync(MONITORING_DATA_DIR)) {
      fs.mkdirSync(MONITORING_DATA_DIR, { recursive: true });
    }
  }

  async performHealthCheck() {
    await this.log('Performing database health check...');
    
    try {
      // Basic health check
      const isHealthy = browserDatabase.healthCheck();
      if (!isHealthy) {
        this.alerts.push('Database health check failed - database may be corrupted');
        return;
      }

      // Check database version
      const versionInfo = await browserDatabase.checkDatabaseVersion();
      this.metrics.database_version = versionInfo.currentVersion;
      
      if (versionInfo.needsUpgrade) {
        this.warnings.push('Database version upgrade available');
      }

      // Check table accessibility
      const tables = [
        'phone_numbers', 'number_ranges', 'bulk_operations', 'audit_log',
        'user_sessions', 'system_configurations', 'admin_sessions', 'security_events',
        'uc_config_files', 'uc_config_history', 'uc_network_tests', 
        'uc_system_settings', 'uc_config_templates'
      ];

      const tableStatus = {};
      for (const tableName of tables) {
        try {
          const count = await browserDatabase.count(tableName);
          tableStatus[tableName] = { accessible: true, count };
          
          // Check for unusual table sizes
          if (count > this.thresholds.table_record_count) {
            this.warnings.push(`Large table detected: ${tableName} has ${count} records`);
          }
        } catch (error) {
          tableStatus[tableName] = { accessible: false, error: error.message };
          this.alerts.push(`Table ${tableName} is not accessible: ${error.message}`);
        }
      }

      this.metrics.table_status = tableStatus;
      await this.log('Database health check completed');
      this.completed.push('Database health check');

    } catch (error) {
      const errorMsg = `Health check failed: ${error.message}`;
      await this.log(errorMsg, 'ERROR');
      this.alerts.push(errorMsg);
    }
  }

  async cleanupAuditLogs() {
    await this.log('Cleaning up old audit logs...');
    
    try {
      const auditEntries = await browserDatabase.getAllAuditEntries(10000);
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - this.thresholds.audit_log_age_days);
      
      let deletedCount = 0;
      for (const entry of auditEntries) {
        const entryDate = new Date(entry.timestamp);
        if (entryDate < cutoffDate) {
          try {
            await browserDatabase.delete('audit_log', entry.id);
            deletedCount++;
          } catch (error) {
            await this.log(`Failed to delete audit entry ${entry.id}: ${error.message}`, 'WARN');
          }
        }
      }

      this.metrics.audit_logs_cleaned = deletedCount;
      await this.log(`Cleaned up ${deletedCount} old audit log entries`);
      this.completed.push(`Audit log cleanup (${deletedCount} entries)`);

    } catch (error) {
      const errorMsg = `Audit log cleanup failed: ${error.message}`;
      await this.log(errorMsg, 'WARN');
      this.warnings.push(errorMsg);
    }
  }

  async optimizeDatabase() {
    await this.log('Optimizing database performance...');
    
    try {
      // Performance optimization is handled by IndexedDB internally
      // We can run performance tests to verify optimization
      
      const performanceTests = [
        { name: 'phone_numbers_query', test: () => browserDatabase.getAllPhoneNumbers(0, 100) },
        { name: 'number_ranges_query', test: () => browserDatabase.getAllNumberRanges() },
        { name: 'audit_log_query', test: () => browserDatabase.getAllAuditEntries(50) },
        { name: 'statistics_query', test: () => browserDatabase.getStatistics() }
      ];

      const performanceResults = {};
      for (const test of performanceTests) {
        const startTime = Date.now();
        try {
          await test.test();
          const duration = Date.now() - startTime;
          performanceResults[test.name] = { duration, success: true };
          
          if (duration > this.thresholds.query_response_time_ms) {
            this.warnings.push(`Slow query detected: ${test.name} took ${duration}ms`);
          }
        } catch (error) {
          performanceResults[test.name] = { success: false, error: error.message };
          this.warnings.push(`Performance test failed: ${test.name} - ${error.message}`);
        }
      }

      this.metrics.performance_tests = performanceResults;
      await this.log('Database optimization completed');
      this.completed.push('Database optimization and performance testing');

    } catch (error) {
      const errorMsg = `Database optimization failed: ${error.message}`;
      await this.log(errorMsg, 'WARN');
      this.warnings.push(errorMsg);
    }
  }

  async validateDataIntegrity() {
    await this.log('Validating data integrity...');
    
    try {
      const integrityIssues = [];

      // Check phone number data integrity
      const phoneNumbers = await browserDatabase.getAllPhoneNumbers();
      const invalidPhoneNumbers = phoneNumbers.filter(phone => 
        !phone.number || 
        !phone.status || 
        !['available', 'assigned', 'reserved', 'aging', 'blocked', 'toll-free'].includes(phone.status)
      );

      if (invalidPhoneNumbers.length > 0) {
        integrityIssues.push(`${invalidPhoneNumbers.length} phone numbers have invalid data`);
      }

      // Check number range data integrity
      const numberRanges = await browserDatabase.getAllNumberRanges();
      const invalidRanges = numberRanges.filter(range => 
        !range.name || 
        !range.pattern || 
        range.total_numbers < 0 ||
        range.available_numbers < 0
      );

      if (invalidRanges.length > 0) {
        integrityIssues.push(`${invalidRanges.length} number ranges have invalid data`);
      }

      // Check relationships
      const rangeNames = new Set(numberRanges.map(r => r.name));
      const orphanedNumbers = phoneNumbers.filter(phone => 
        phone.range_name && !rangeNames.has(phone.range_name)
      );

      if (orphanedNumbers.length > 0) {
        integrityIssues.push(`${orphanedNumbers.length} phone numbers reference non-existent ranges`);
      }

      this.metrics.integrity_issues = integrityIssues;
      
      if (integrityIssues.length > 0) {
        integrityIssues.forEach(issue => this.warnings.push(`Data integrity: ${issue}`));
      }

      await this.log(`Data integrity validation completed - ${integrityIssues.length} issues found`);
      this.completed.push(`Data integrity validation (${integrityIssues.length} issues)`);

    } catch (error) {
      const errorMsg = `Data integrity validation failed: ${error.message}`;
      await this.log(errorMsg, 'WARN');
      this.warnings.push(errorMsg);
    }
  }

  async cleanupBulkOperations() {
    await this.log('Cleaning up old bulk operations...');
    
    try {
      const bulkOperations = await browserDatabase.getAllBulkOperations();
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - 30); // Keep 30 days of bulk operations
      
      let deletedCount = 0;
      for (const operation of bulkOperations) {
        const operationDate = new Date(operation.start_time);
        if (operationDate < cutoffDate && operation.status === 'completed') {
          try {
            await browserDatabase.delete('bulk_operations', operation.id);
            deletedCount++;
          } catch (error) {
            await this.log(`Failed to delete bulk operation ${operation.id}: ${error.message}`, 'WARN');
          }
        }
      }

      this.metrics.bulk_operations_cleaned = deletedCount;
      await this.log(`Cleaned up ${deletedCount} old bulk operations`);
      this.completed.push(`Bulk operations cleanup (${deletedCount} operations)`);

    } catch (error) {
      const errorMsg = `Bulk operations cleanup failed: ${error.message}`;
      await this.log(errorMsg, 'WARN');
      this.warnings.push(errorMsg);
    }
  }

  async maintainUCConfigHistory() {
    await this.log('Maintaining UC configuration history...');
    
    try {
      const configFiles = await browserDatabase.getAllUCConfigFiles();
      let totalVersionsCleaned = 0;

      for (const configFile of configFiles) {
        const history = await browserDatabase.getUCConfigHistoryByFileId(configFile.id);
        
        // Keep only the latest N versions based on threshold
        if (history.length > this.thresholds.uc_max_config_versions || 10) {
          const versionsToDelete = history.slice(this.thresholds.uc_max_config_versions || 10);
          
          for (const version of versionsToDelete) {
            try {
              await browserDatabase.delete('uc_config_history', version.id);
              totalVersionsCleaned++;
            } catch (error) {
              await this.log(`Failed to delete config history ${version.id}: ${error.message}`, 'WARN');
            }
          }
        }
      }

      this.metrics.uc_config_versions_cleaned = totalVersionsCleaned;
      await this.log(`Cleaned up ${totalVersionsCleaned} old UC configuration versions`);
      this.completed.push(`UC config history maintenance (${totalVersionsCleaned} versions)`);

    } catch (error) {
      const errorMsg = `UC config history maintenance failed: ${error.message}`;
      await this.log(errorMsg, 'WARN');
      this.warnings.push(errorMsg);
    }
  }

  async cleanupNetworkTestResults() {
    await this.log('Cleaning up old network test results...');
    
    try {
      const networkTests = await browserDatabase.getAllUCNetworkTests(10000);
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - 7); // Keep 7 days of network tests
      
      let deletedCount = 0;
      for (const test of networkTests) {
        const testDate = new Date(test.created_at);
        if (testDate < cutoffDate) {
          try {
            await browserDatabase.delete('uc_network_tests', test.id);
            deletedCount++;
          } catch (error) {
            await this.log(`Failed to delete network test ${test.id}: ${error.message}`, 'WARN');
          }
        }
      }

      this.metrics.network_tests_cleaned = deletedCount;
      await this.log(`Cleaned up ${deletedCount} old network test results`);
      this.completed.push(`Network tests cleanup (${deletedCount} tests)`);

    } catch (error) {
      const errorMsg = `Network tests cleanup failed: ${error.message}`;
      await this.log(errorMsg, 'WARN');
      this.warnings.push(errorMsg);
    }
  }

  async collectPerformanceMetrics() {
    await this.log('Collecting performance metrics...');
    
    try {
      // Collect database statistics
      const stats = await browserDatabase.getStatistics();
      this.metrics.database_stats = stats;

      // Collect table sizes
      const tableSizes = {};
      const tables = ['phone_numbers', 'number_ranges', 'bulk_operations', 'audit_log', 'uc_config_files'];
      
      for (const tableName of tables) {
        try {
          tableSizes[tableName] = await browserDatabase.count(tableName);
        } catch (error) {
          tableSizes[tableName] = -1; // Error indicator
        }
      }
      
      this.metrics.table_sizes = tableSizes;

      // Collect UC system status
      try {
        const ucStatus = await browserDatabase.getUCSystemStatus();
        this.metrics.uc_system_status = ucStatus;
      } catch (error) {
        this.metrics.uc_system_status = { error: error.message };
      }

      // Estimate database size (approximation)
      const totalRecords = Object.values(tableSizes).reduce((sum, count) => sum + (count > 0 ? count : 0), 0);
      const estimatedSizeMB = Math.round((totalRecords * 1024) / (1024 * 1024)); // Rough estimate
      this.metrics.estimated_size_mb = estimatedSizeMB;

      if (estimatedSizeMB > this.thresholds.database_size_mb) {
        this.warnings.push(`Database size (${estimatedSizeMB}MB) exceeds threshold (${this.thresholds.database_size_mb}MB)`);
      }

      // Save metrics to monitoring data
      const metricsFile = path.join(MONITORING_DATA_DIR, `metrics-${new Date().toISOString().split('T')[0]}.json`);
      const metricsData = {
        timestamp: new Date().toISOString(),
        metrics: this.metrics
      };
      
      fs.writeFileSync(metricsFile, JSON.stringify(metricsData, null, 2));

      await this.log('Performance metrics collected and saved');
      this.completed.push('Performance metrics collection');

    } catch (error) {
      const errorMsg = `Performance metrics collection failed: ${error.message}`;
      await this.log(errorMsg, 'WARN');
      this.warnings.push(errorMsg);
    }
  }

  async checkAlertThresholds() {
    await this.log('Checking alert thresholds...');
    
    try {
      // Check database size threshold
      if (this.metrics.estimated_size_mb > this.thresholds.database_size_mb) {
        this.alerts.push(`Database size threshold exceeded: ${this.metrics.estimated_size_mb}MB > ${this.thresholds.database_size_mb}MB`);
      }

      // Check table size thresholds
      for (const [tableName, count] of Object.entries(this.metrics.table_sizes || {})) {
        if (count > this.thresholds.table_record_count) {
          this.alerts.push(`Table ${tableName} record count threshold exceeded: ${count} > ${this.thresholds.table_record_count}`);
        }
      }

      // Check performance thresholds
      if (this.metrics.performance_tests) {
        for (const [testName, result] of Object.entries(this.metrics.performance_tests)) {
          if (result.duration > this.thresholds.query_response_time_ms) {
            this.alerts.push(`Query performance threshold exceeded: ${testName} took ${result.duration}ms > ${this.thresholds.query_response_time_ms}ms`);
          }
        }
      }

      // Check security events
      try {
        const recentSecurityEvents = await browserDatabase.getAllSecurityEvents(100);
        const recentCount = recentSecurityEvents.filter(event => {
          const eventDate = new Date(event.timestamp);
          const dayAgo = new Date();
          dayAgo.setHours(dayAgo.getHours() - 24);
          return eventDate > dayAgo;
        }).length;

        if (recentCount > this.thresholds.security_events_count) {
          this.alerts.push(`High security event count in last 24 hours: ${recentCount} > ${this.thresholds.security_events_count}`);
        }
      } catch (error) {
        this.warnings.push(`Security events check failed: ${error.message}`);
      }

      await this.log(`Alert threshold check completed - ${this.alerts.length} alerts, ${this.warnings.length} warnings`);
      this.completed.push('Alert threshold checking');

    } catch (error) {
      const errorMsg = `Alert threshold checking failed: ${error.message}`;
      await this.log(errorMsg, 'WARN');
      this.warnings.push(errorMsg);
    }
  }

  async generateMaintenanceReport() {
    await this.log('Generating maintenance report...');
    
    const report = {
      timestamp: new Date().toISOString(),
      duration: Math.round((Date.now() - this.maintenanceStartTime) / 1000),
      success: this.alerts.length === 0,
      summary: {
        completed_tasks: this.completed.length,
        warnings: this.warnings.length,
        alerts: this.alerts.length
      },
      metrics: this.metrics,
      details: {
        completed: this.completed,
        warnings: this.warnings,
        alerts: this.alerts
      },
      recommendations: this.generateRecommendations()
    };

    // Save report to file
    const reportFile = path.join(MONITORING_DATA_DIR, `maintenance-report-${new Date().toISOString().replace(/[:.]/g, '-')}.json`);
    try {
      fs.writeFileSync(reportFile, JSON.stringify(report, null, 2));
      await this.log(`Maintenance report saved: ${reportFile}`);
    } catch (error) {
      await this.log(`Failed to save maintenance report: ${error.message}`, 'WARN');
    }

    return report;
  }

  generateRecommendations() {
    const recommendations = [];

    // Database size recommendations
    if (this.metrics.estimated_size_mb > this.thresholds.database_size_mb * 0.8) {
      recommendations.push('Consider implementing data archiving strategies for large tables');
    }

    // Performance recommendations
    if (this.warnings.some(w => w.includes('Slow query'))) {
      recommendations.push('Review and optimize slow-performing queries');
    }

    // Data integrity recommendations
    if (this.metrics.integrity_issues && this.metrics.integrity_issues.length > 0) {
      recommendations.push('Address data integrity issues identified during validation');
    }

    // UC maintenance recommendations
    if (this.metrics.uc_config_versions_cleaned > 50) {
      recommendations.push('Consider reducing UC configuration version retention period');
    }

    // Security recommendations
    if (this.alerts.some(a => a.includes('security'))) {
      recommendations.push('Review security events and implement additional monitoring');
    }

    return recommendations;
  }

  async runMonitoringCheck() {
    await this.log('Running monitoring health check...');
    
    const monitoringResults = {
      timestamp: new Date().toISOString(),
      database_healthy: false,
      performance_acceptable: true,
      alerts: [],
      metrics: {}
    };

    try {
      // Quick health check
      monitoringResults.database_healthy = browserDatabase.healthCheck();
      
      // Quick performance check
      const startTime = Date.now();
      await browserDatabase.getAllPhoneNumbers(0, 10);
      const queryTime = Date.now() - startTime;
      
      monitoringResults.metrics.sample_query_time = queryTime;
      monitoringResults.performance_acceptable = queryTime < this.thresholds.query_response_time_ms;
      
      if (!monitoringResults.performance_acceptable) {
        monitoringResults.alerts.push(`Query performance degraded: ${queryTime}ms`);
      }

      // Check table accessibility
      try {
        const phoneCount = await browserDatabase.count('phone_numbers');
        monitoringResults.metrics.phone_numbers_count = phoneCount;
      } catch (error) {
        monitoringResults.alerts.push(`Phone numbers table inaccessible: ${error.message}`);
      }

      await this.log(`Monitoring check completed - Healthy: ${monitoringResults.database_healthy}, Performance: ${monitoringResults.performance_acceptable}`);
      
    } catch (error) {
      monitoringResults.alerts.push(`Monitoring check failed: ${error.message}`);
      await this.log(`Monitoring check failed: ${error.message}`, 'ERROR');
    }

    return monitoringResults;
  }
}

// CLI Interface
async function main() {
  const args = process.argv.slice(2);
  const command = args[0] || 'maintenance';
  
  const maintenance = new DatabaseMaintenance();
  
  switch (command) {
    case 'maintenance':
    case 'full':
      console.log('Running full database maintenance...');
      const result = await maintenance.runMaintenanceTasks();
      console.log('\nMaintenance Result:', {
        success: result.success,
        duration: result.duration,
        completed: result.completed.length,
        warnings: result.warnings.length,
        alerts: result.alerts.length
      });
      
      if (result.alerts.length > 0) {
        console.log('\nAlerts:');
        result.alerts.forEach(alert => console.log(`  🚨 ${alert}`));
      }
      
      if (result.warnings.length > 0) {
        console.log('\nWarnings:');
        result.warnings.forEach(warning => console.log(`  ⚠️  ${warning}`));
      }
      
      process.exit(result.success ? 0 : 1);
      
    case 'monitor':
    case 'check':
      console.log('Running monitoring check...');
      const monitorResult = await maintenance.runMonitoringCheck();
      console.log('\nMonitoring Result:', monitorResult);
      process.exit(monitorResult.database_healthy && monitorResult.performance_acceptable ? 0 : 1);
      
    case 'metrics':
      console.log('Collecting performance metrics...');
      await maintenance.collectPerformanceMetrics();
      console.log('Metrics collected and saved to monitoring data directory');
      process.exit(0);
      
    default:
      console.log(`
Database Maintenance and Monitoring Tool

Usage:
  node maintenance.js <command>

Commands:
  maintenance    Run full database maintenance (default)
  full           Run full database maintenance
  monitor        Run quick monitoring health check
  check          Run quick monitoring health check  
  metrics        Collect and save performance metrics

Examples:
  node maintenance.js maintenance
  node maintenance.js monitor
  node maintenance.js metrics
      `);
      process.exit(1);
  }
}

// Export for programmatic use
export { DatabaseMaintenance };

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch(console.error);
}