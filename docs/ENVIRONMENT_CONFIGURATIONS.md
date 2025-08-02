# Environment-Specific Database Configurations
**Phone Range Nexus - Multi-Environment Deployment Guide**

Generated: February 2, 2025  
Database Version: 4.0  
Supported Environments: Development, Staging, Production

---

## Executive Summary

The Phone Range Nexus application supports multiple deployment environments with environment-specific database configurations. This document provides comprehensive guidance for configuring the application across different environments while maintaining data security, performance optimization, and operational consistency.

### Environment Overview
- 🔧 **Development**: Local development with sample data and debugging enabled
- 🧪 **Staging**: Pre-production testing environment with production-like settings
- 🏭 **Production**: Live deployment with optimized performance and security
- 🔒 **Secure**: High-security environment with enhanced encryption and audit logging

---

## Configuration Architecture

### Configuration Hierarchy
```
Environment Configuration Priority:
1. Runtime Environment Variables (.env files)
2. Application Configuration (system_configurations table)
3. UC System Settings (uc_system_settings table)
4. Default Application Settings (code defaults)
```

### Configuration Storage Locations
```javascript
ConfigurationSources: {
  environmentVariables: '.env files',
  systemDatabase: 'system_configurations table',
  ucSettings: 'uc_system_settings table',
  browserStorage: 'localStorage/sessionStorage',
  applicationDefaults: 'embedded in code'
}
```

---

## Development Environment Configuration

### Development .env Configuration
```bash
# Development Environment Configuration
NODE_ENV=development
APP_NAME=Phone Range Nexus - Development

# Database Configuration
LOCAL_DB_PATH=phone-range-nexus-dev.db
DB_VERSION=4

# Authentication Configuration
AUTH_SESSION_DURATION=24h
DEFAULT_ADMIN_USERNAME=admin
DEFAULT_ADMIN_PASSWORD=admin123
ALLOW_WEAK_PASSWORDS=true

# Debug Configuration
DEBUG_MODE=true
VERBOSE_LOGGING=true
ENABLE_CONSOLE_LOGS=true
PERFORMANCE_MONITORING=true

# Development Features
SAMPLE_DATA_ENABLED=true
MOCK_SERVICES_ENABLED=true
AUTO_LOGIN_ENABLED=false
DEVELOPMENT_TOOLS_ENABLED=true

# UC Admin Tools Development Settings
UC_NETWORK_TIMEOUT=10000
UC_DEBUG_NETWORK_TESTS=true
UC_ALLOW_INSECURE_CONNECTIONS=true
UC_CONFIG_VALIDATION_STRICT=false

# Browser Configuration
BROWSER_CACHE_DISABLED=true
BROWSER_STORAGE_PERSISTENCE=false
```

### Development Database Settings
```javascript
// Development system configurations
const developmentConfigs = [
  {
    type: 'application',
    name: 'environment',
    configuration: {
      mode: 'development',
      debug: true,
      verbose_logging: true,
      mock_data: true
    },
    enabled: true
  },
  {
    type: 'security',
    name: 'session_management',
    configuration: {
      timeout: 86400000, // 24 hours
      secure: false,
      httpOnly: false,
      sameSite: 'lax',
      remember_me: true
    },
    enabled: true
  },
  {
    type: 'backup',
    name: 'automatic_backup',
    configuration: {
      enabled: false,
      interval: 'manual',
      retention: 7,
      compression: false
    },
    enabled: false
  },
  {
    type: 'performance',
    name: 'query_optimization',
    configuration: {
      cache_enabled: false,
      batch_size: 100,
      index_optimization: false,
      debug_queries: true
    },
    enabled: true
  }
];
```

### Development UC Settings
```javascript
// Development UC system settings
const developmentUCSettings = [
  { key: 'uc_network_timeout', value: 10000, category: 'network' },
  { key: 'uc_max_config_versions', value: 5, category: 'configuration' },
  { key: 'uc_auto_backup_enabled', value: false, category: 'backup' },
  { key: 'uc_debug_mode', value: true, category: 'debug' },
  { key: 'uc_mock_network_tests', value: true, category: 'testing' }
];
```

---

## Staging Environment Configuration

### Staging .env Configuration
```bash
# Staging Environment Configuration
NODE_ENV=staging
APP_NAME=Phone Range Nexus - Staging

# Database Configuration
LOCAL_DB_PATH=phone-range-nexus-staging.db
DB_VERSION=4

# Authentication Configuration
AUTH_SESSION_DURATION=8h
DEFAULT_ADMIN_USERNAME=staging_admin
DEFAULT_ADMIN_PASSWORD=ComplexPassword123!
ALLOW_WEAK_PASSWORDS=false

# Security Configuration
ENFORCE_HTTPS=true
SECURE_COOKIES=true
CSRF_PROTECTION=true
RATE_LIMITING=true

# Monitoring Configuration
ENABLE_METRICS=true
LOG_LEVEL=info
AUDIT_LEVEL=detailed
PERFORMANCE_MONITORING=true

# Staging Features
SAMPLE_DATA_ENABLED=false
MOCK_SERVICES_ENABLED=false
AUTO_LOGIN_ENABLED=false
DEVELOPMENT_TOOLS_ENABLED=false

# UC Admin Tools Staging Settings
UC_NETWORK_TIMEOUT=15000
UC_DEBUG_NETWORK_TESTS=false
UC_ALLOW_INSECURE_CONNECTIONS=false
UC_CONFIG_VALIDATION_STRICT=true

# Browser Configuration
BROWSER_CACHE_ENABLED=true
BROWSER_STORAGE_PERSISTENCE=true
```

### Staging Database Settings
```javascript
// Staging system configurations
const stagingConfigs = [
  {
    type: 'application',
    name: 'environment',
    configuration: {
      mode: 'staging',
      debug: false,
      verbose_logging: false,
      testing_mode: true
    },
    enabled: true
  },
  {
    type: 'security',
    name: 'session_management',
    configuration: {
      timeout: 28800000, // 8 hours
      secure: true,
      httpOnly: true,
      sameSite: 'strict',
      remember_me: false
    },
    enabled: true
  },
  {
    type: 'backup',
    name: 'automatic_backup',
    configuration: {
      enabled: true,
      interval: 'daily',
      retention: 14,
      compression: true
    },
    enabled: true
  },
  {
    type: 'performance',
    name: 'query_optimization',
    configuration: {
      cache_enabled: true,
      batch_size: 500,
      index_optimization: true,
      debug_queries: false
    },
    enabled: true
  },
  {
    type: 'monitoring',
    name: 'metrics_collection',
    configuration: {
      enabled: true,
      sample_rate: 0.1,
      detailed_logging: true,
      performance_tracking: true
    },
    enabled: true
  }
];
```

---

## Production Environment Configuration

### Production .env Configuration
```bash
# Production Environment Configuration
NODE_ENV=production
APP_NAME=Phone Range Nexus

# Database Configuration
LOCAL_DB_PATH=phone-range-nexus-prod.db
DB_VERSION=4

# Authentication Configuration
AUTH_SESSION_DURATION=4h
DEFAULT_ADMIN_USERNAME=admin
# Note: Change default password immediately after deployment
DEFAULT_ADMIN_PASSWORD=CHANGE_ME_IMMEDIATELY
ALLOW_WEAK_PASSWORDS=false
REQUIRE_PASSWORD_CHANGE=true

# Security Configuration
ENFORCE_HTTPS=true
SECURE_COOKIES=true
CSRF_PROTECTION=true
RATE_LIMITING=true
SECURITY_HEADERS=true
XSS_PROTECTION=true

# Performance Configuration
ENABLE_COMPRESSION=true
CACHE_STATIC_ASSETS=true
MINIFY_RESPONSES=true
LAZY_LOADING=true

# Monitoring Configuration
ENABLE_METRICS=true
LOG_LEVEL=warn
AUDIT_LEVEL=comprehensive
PERFORMANCE_MONITORING=true
ERROR_REPORTING=true

# Production Features
SAMPLE_DATA_ENABLED=false
MOCK_SERVICES_ENABLED=false
AUTO_LOGIN_ENABLED=false
DEVELOPMENT_TOOLS_ENABLED=false

# UC Admin Tools Production Settings
UC_NETWORK_TIMEOUT=30000
UC_DEBUG_NETWORK_TESTS=false
UC_ALLOW_INSECURE_CONNECTIONS=false
UC_CONFIG_VALIDATION_STRICT=true
UC_ENCRYPT_SENSITIVE_DATA=true

# Browser Configuration
BROWSER_CACHE_ENABLED=true
BROWSER_STORAGE_PERSISTENCE=true
BROWSER_CACHE_DURATION=7d
```

### Production Database Settings
```javascript
// Production system configurations
const productionConfigs = [
  {
    type: 'application',
    name: 'environment',
    configuration: {
      mode: 'production',
      debug: false,
      verbose_logging: false,
      optimization_enabled: true
    },
    enabled: true
  },
  {
    type: 'security',
    name: 'session_management',
    configuration: {
      timeout: 14400000, // 4 hours
      secure: true,
      httpOnly: true,
      sameSite: 'strict',
      remember_me: false,
      rotation_enabled: true
    },
    enabled: true
  },
  {
    type: 'backup',
    name: 'automatic_backup',
    configuration: {
      enabled: true,
      interval: 'daily',
      retention: 30,
      compression: true,
      encryption: true,
      offsite_backup: true
    },
    enabled: true
  },
  {
    type: 'performance',
    name: 'query_optimization',
    configuration: {
      cache_enabled: true,
      batch_size: 1000,
      index_optimization: true,
      connection_pooling: true,
      query_timeout: 30000
    },
    enabled: true
  },
  {
    type: 'security',
    name: 'audit_configuration',
    configuration: {
      level: 'comprehensive',
      retention_days: 365,
      security_events: true,
      data_changes: true,
      access_logging: true,
      failed_attempts: true
    },
    enabled: true
  }
];
```

---

## Secure Environment Configuration

### High-Security .env Configuration
```bash
# Secure Environment Configuration
NODE_ENV=production
APP_NAME=Phone Range Nexus - Secure
SECURITY_LEVEL=high

# Database Configuration
LOCAL_DB_PATH=phone-range-nexus-secure.db
DB_VERSION=4
DB_ENCRYPTION=true

# Authentication Configuration
AUTH_SESSION_DURATION=2h
MULTI_FACTOR_AUTH=true
PASSWORD_COMPLEXITY=strict
SESSION_ROTATION=true
IDLE_TIMEOUT=30m

# Advanced Security Configuration
ENFORCE_HTTPS=true
HSTS_ENABLED=true
CONTENT_SECURITY_POLICY=strict
SECURE_COOKIES=true
CSRF_PROTECTION=true
RATE_LIMITING=aggressive
INTRUSION_DETECTION=true

# Audit Configuration
COMPREHENSIVE_LOGGING=true
SECURITY_EVENT_MONITORING=true
REAL_TIME_ALERTS=true
LOG_INTEGRITY_CHECKS=true

# UC Admin Tools Secure Settings
UC_NETWORK_TIMEOUT=20000
UC_ENCRYPT_ALL_DATA=true
UC_DIGITAL_SIGNATURES=true
UC_ACCESS_CONTROL=strict
UC_AUDIT_ALL_ACTIONS=true

# Compliance Configuration
GDPR_COMPLIANCE=true
HIPAA_COMPLIANCE=true
SOX_COMPLIANCE=true
```

---

## Environment-Specific Features

### Development Environment Features
- **Sample Data Generation**: Automatic creation of test data
- **Mock Services**: Simulated external service responses
- **Debug Tools**: Enhanced debugging and development tools
- **Hot Reload**: Automatic application reload on code changes
- **Relaxed Security**: Easier development workflow
- **Detailed Logging**: Comprehensive debug information

### Staging Environment Features
- **Production Simulation**: Mirrors production environment closely
- **Load Testing**: Performance and stress testing capabilities
- **Integration Testing**: Full end-to-end testing suite
- **Monitoring**: Performance and error monitoring
- **Security Testing**: Vulnerability and security testing
- **Backup Testing**: Backup and restore procedure validation

### Production Environment Features
- **Optimized Performance**: Maximum performance configurations
- **Security Hardening**: Enhanced security measures
- **Comprehensive Monitoring**: Full system monitoring and alerting
- **Automated Backups**: Scheduled backup procedures
- **Error Tracking**: Production error monitoring and reporting
- **Compliance Logging**: Audit trail for compliance requirements

### Secure Environment Features
- **End-to-End Encryption**: All data encrypted at rest and in transit
- **Multi-Factor Authentication**: Enhanced authentication requirements
- **Comprehensive Auditing**: Detailed audit logging for all actions
- **Real-time Monitoring**: Continuous security monitoring
- **Compliance Controls**: Built-in compliance and regulatory controls
- **Access Controls**: Strict role-based access control

---

## Configuration Management Scripts

### Environment Setup Script
```bash
#!/bin/bash
# setup-environment.sh
# Usage: ./setup-environment.sh [development|staging|production|secure]

ENVIRONMENT=${1:-development}
ENV_FILE=".env.${ENVIRONMENT}"
TARGET_ENV_FILE=".env"

echo "Setting up ${ENVIRONMENT} environment..."

# Copy environment-specific configuration
if [ -f "${ENV_FILE}" ]; then
  cp "${ENV_FILE}" "${TARGET_ENV_FILE}"
  echo "✅ Environment configuration copied from ${ENV_FILE}"
else
  echo "❌ Environment file ${ENV_FILE} not found"
  exit 1
fi

# Run environment-specific initialization
case ${ENVIRONMENT} in
  "development")
    echo "🔧 Setting up development environment..."
    npm run setup:dev
    ;;
  "staging")
    echo "🧪 Setting up staging environment..."
    npm run setup:staging
    ;;
  "production")
    echo "🏭 Setting up production environment..."
    npm run setup:production
    ;;
  "secure")
    echo "🔒 Setting up secure environment..."
    npm run setup:secure
    ;;
  *)
    echo "❌ Unknown environment: ${ENVIRONMENT}"
    exit 1
    ;;
esac

# Initialize database for environment
echo "Initializing database for ${ENVIRONMENT}..."
node scripts/init-production-database.js init

# Verify environment setup
echo "Verifying environment setup..."
node scripts/init-production-database.js validate

echo "✅ ${ENVIRONMENT} environment setup completed"
```

### Configuration Validation Script
```javascript
#!/usr/bin/env node
/**
 * Environment Configuration Validation Script
 */

import fs from 'fs';
import { browserDatabase } from '../src/lib/browserDatabase.js';

class EnvironmentValidator {
  constructor() {
    this.environment = process.env.NODE_ENV || 'development';
    this.errors = [];
    this.warnings = [];
  }

  async validateEnvironment() {
    console.log(`Validating ${this.environment} environment configuration...`);
    
    // Validate environment variables
    await this.validateEnvironmentVariables();
    
    // Validate database configuration
    await this.validateDatabaseConfiguration();
    
    // Validate security settings
    await this.validateSecuritySettings();
    
    // Validate UC settings
    await this.validateUCSettings();
    
    // Generate validation report
    this.generateValidationReport();
    
    return {
      valid: this.errors.length === 0,
      errors: this.errors,
      warnings: this.warnings
    };
  }

  validateEnvironmentVariables() {
    const requiredVars = [
      'NODE_ENV',
      'APP_NAME',
      'LOCAL_DB_PATH',
      'AUTH_SESSION_DURATION'
    ];

    const secureVars = [
      'DEFAULT_ADMIN_PASSWORD'
    ];

    // Check required variables
    for (const varName of requiredVars) {
      if (!process.env[varName]) {
        this.errors.push(`Missing required environment variable: ${varName}`);
      }
    }

    // Check secure variables
    for (const varName of secureVars) {
      const value = process.env[varName];
      if (value && (value === 'admin123' || value === 'CHANGE_ME_IMMEDIATELY')) {
        if (this.environment === 'production') {
          this.errors.push(`Insecure default password in production: ${varName}`);
        } else {
          this.warnings.push(`Default password should be changed: ${varName}`);
        }
      }
    }
  }

  async validateDatabaseConfiguration() {
    try {
      // Check database health
      const isHealthy = browserDatabase.healthCheck();
      if (!isHealthy) {
        this.errors.push('Database health check failed');
      }

      // Check database version
      const versionInfo = await browserDatabase.checkDatabaseVersion();
      if (versionInfo.needsUpgrade) {
        this.warnings.push('Database version upgrade available');
      }

      // Environment-specific checks
      if (this.environment === 'production') {
        // Production should have backups enabled
        const configs = await browserDatabase.getSystemConfigurationsByType('backup');
        const backupConfig = configs.find(c => c.name === 'automatic_backup');
        if (!backupConfig || !backupConfig.configuration.enabled) {
          this.errors.push('Automatic backups not enabled in production');
        }
      }

    } catch (error) {
      this.errors.push(`Database validation failed: ${error.message}`);
    }
  }

  validateSecuritySettings() {
    const securityChecks = {
      development: {
        allowWeakPasswords: true,
        enforceHttps: false,
        secureCookies: false
      },
      staging: {
        allowWeakPasswords: false,
        enforceHttps: true,
        secureCookies: true
      },
      production: {
        allowWeakPasswords: false,
        enforceHttps: true,
        secureCookies: true,
        requirePasswordChange: true
      }
    };

    const expectedSettings = securityChecks[this.environment];
    if (expectedSettings) {
      // Validate security settings based on environment
      if (this.environment === 'production') {
        if (process.env.ALLOW_WEAK_PASSWORDS === 'true') {
          this.errors.push('Weak passwords should not be allowed in production');
        }
        if (process.env.ENFORCE_HTTPS !== 'true') {
          this.errors.push('HTTPS should be enforced in production');
        }
      }
    }
  }

  async validateUCSettings() {
    try {
      const ucStatus = await browserDatabase.getUCSystemStatus();
      
      if (ucStatus.configurationService.status !== 'Running') {
        this.warnings.push('UC Configuration Service is not running');
      }
      
      if (ucStatus.networkTools.status !== 'Running') {
        this.warnings.push('UC Network Tools are not running');
      }

      // Environment-specific UC validation
      if (this.environment === 'production') {
        const networkTimeout = await browserDatabase.getUCSystemSetting('uc_network_timeout');
        if (networkTimeout && parseInt(networkTimeout.setting_value) < 20000) {
          this.warnings.push('UC network timeout should be at least 20 seconds in production');
        }
      }

    } catch (error) {
      this.warnings.push(`UC settings validation failed: ${error.message}`);
    }
  }

  generateValidationReport() {
    console.log('\n' + '='.repeat(50));
    console.log('ENVIRONMENT VALIDATION REPORT');
    console.log('='.repeat(50));
    
    console.log(`Environment: ${this.environment}`);
    console.log(`Status: ${this.errors.length === 0 ? '✅ VALID' : '❌ INVALID'}`);
    
    if (this.errors.length > 0) {
      console.log('\nErrors:');
      this.errors.forEach(error => console.log(`  ❌ ${error}`));
    }
    
    if (this.warnings.length > 0) {
      console.log('\nWarnings:');
      this.warnings.forEach(warning => console.log(`  ⚠️  ${warning}`));
    }
    
    if (this.errors.length === 0 && this.warnings.length === 0) {
      console.log('\n✅ All validation checks passed');
    }
    
    console.log('='.repeat(50));
  }
}

// CLI interface
if (import.meta.url === `file://${process.argv[1]}`) {
  const validator = new EnvironmentValidator();
  validator.validateEnvironment()
    .then(result => {
      process.exit(result.valid ? 0 : 1);
    })
    .catch(error => {
      console.error('Validation failed:', error);
      process.exit(1);
    });
}

export { EnvironmentValidator };
```

---

## Environment Migration Procedures

### Development to Staging Migration
1. **Export Development Data** (selective export)
2. **Sanitize Sensitive Information**
3. **Import to Staging Environment**
4. **Update Configuration Settings**
5. **Run Staging Validation**

### Staging to Production Migration
1. **Final Testing Validation**
2. **Create Production Backup Point**
3. **Deploy Production Configuration**
4. **Migrate Verified Data**
5. **Run Production Validation**
6. **Monitor Initial Production Run**

---

## Best Practices by Environment

### Development Best Practices
- Use sample data, not production data
- Enable all debugging and logging
- Regular code commits and testing
- Document configuration changes
- Test backup and restore procedures

### Staging Best Practices
- Mirror production environment closely
- Regular integration testing
- Performance testing and optimization
- Security vulnerability scanning
- Backup procedure validation

### Production Best Practices
- Minimal necessary features enabled
- Comprehensive monitoring and alerting
- Regular security audits
- Automated backup procedures
- Change management processes
- Incident response procedures

### Secure Environment Best Practices
- Defense in depth security approach
- Regular security assessments
- Compliance audit trails
- Encrypted data at rest and in transit
- Multi-factor authentication
- Real-time security monitoring

---

**Documentation Version**: 1.0  
**Last Updated**: February 2, 2025  
**Compatibility**: All supported environments  
**Configuration Management**: Version controlled with environment branches