# Environment Variables and Configuration Options Reference
**Phone Range Nexus - Complete Configuration Guide**

Generated: February 2, 2025  
Database Version: 4.0  
Application Version: 4.0

---

## Executive Summary

This document provides a comprehensive reference for all environment variables, configuration options, and settings used across the Phone Range Nexus application. It covers application-level settings, database configurations, UC Admin Tools settings, security parameters, and deployment-specific options.

### Configuration Hierarchy
1. **Environment Variables** (`.env` files) - Highest priority
2. **System Configurations** (database `system_configurations` table)
3. **UC System Settings** (database `uc_system_settings` table)
4. **Application Defaults** (hardcoded fallbacks)

---

## Core Application Environment Variables

### Application Configuration
```bash
# Application Identity
APP_NAME=Phone Range Nexus
# Description: Application display name used in UI and logs
# Default: "Phone Range Nexus"
# Environment: All
# Required: No

NODE_ENV=production
# Description: Node.js environment mode
# Values: development | staging | production | test
# Default: development
# Environment: All
# Required: Yes

VERSION=4.0.0
# Description: Application version identifier
# Default: 4.0.0
# Environment: All
# Required: No
```

### Database Configuration
```bash
# Database Settings
LOCAL_DB_PATH=phone-range-nexus.db
# Description: Path to local database file (legacy SQLite reference)
# Default: phone-range-nexus.db
# Environment: All
# Required: No (IndexedDB doesn't use file paths)

DB_VERSION=4
# Description: Database schema version
# Values: 1 | 2 | 3 | 4
# Default: 4
# Environment: All
# Required: Yes

DB_NAME=PhoneRangeNexus
# Description: IndexedDB database name
# Default: PhoneRangeNexus
# Environment: All
# Required: No

DB_ENCRYPTION=false
# Description: Enable database encryption (future feature)
# Values: true | false
# Default: false
# Environment: Production, Secure
# Required: No
```

### Authentication Configuration
```bash
# Authentication Settings
AUTH_SESSION_DURATION=4h
# Description: Session timeout duration
# Values: Time string (e.g., 1h, 30m, 2d)
# Default: 4h (production), 24h (development)
# Environment: All
# Required: Yes

DEFAULT_ADMIN_USERNAME=admin
# Description: Default administrator username
# Default: admin
# Environment: All
# Required: Yes
# Security: Change in production

DEFAULT_ADMIN_PASSWORD=admin123
# Description: Default administrator password
# Default: admin123
# Environment: Development only
# Required: Yes
# Security: MUST change in production

ALLOW_WEAK_PASSWORDS=false
# Description: Allow weak password validation
# Values: true | false
# Default: false (production), true (development)
# Environment: Development
# Required: No

REQUIRE_PASSWORD_CHANGE=true
# Description: Force password change on first login
# Values: true | false
# Default: true (production), false (development)
# Environment: Production
# Required: No

MULTI_FACTOR_AUTH=false
# Description: Enable multi-factor authentication (future feature)
# Values: true | false
# Default: false
# Environment: Secure
# Required: No

SESSION_ROTATION=false
# Description: Enable automatic session rotation
# Values: true | false
# Default: false (development), true (production)
# Environment: Production, Secure
# Required: No

IDLE_TIMEOUT=30m
# Description: Idle timeout before auto-logout
# Values: Time string
# Default: 30m (secure), disabled (development)
# Environment: Secure
# Required: No
```

### Security Configuration
```bash
# Security Settings
ENFORCE_HTTPS=true
# Description: Enforce HTTPS connections
# Values: true | false
# Default: true (production), false (development)
# Environment: Production, Staging, Secure
# Required: No

SECURE_COOKIES=true
# Description: Use secure cookie flags
# Values: true | false
# Default: true (production), false (development)
# Environment: Production, Staging, Secure
# Required: No

CSRF_PROTECTION=true
# Description: Enable CSRF protection
# Values: true | false
# Default: true (production), false (development)
# Environment: Production, Staging, Secure
# Required: No

RATE_LIMITING=true
# Description: Enable rate limiting for API requests
# Values: true | false | aggressive
# Default: true (production), false (development)
# Environment: Production, Staging, Secure
# Required: No

SECURITY_HEADERS=true
# Description: Enable security headers (CSP, HSTS, etc.)
# Values: true | false
# Default: true (production), false (development)
# Environment: Production, Secure
# Required: No

XSS_PROTECTION=true
# Description: Enable XSS protection headers
# Values: true | false
# Default: true (production), false (development)
# Environment: Production, Secure
# Required: No

HSTS_ENABLED=false
# Description: Enable HTTP Strict Transport Security
# Values: true | false
# Default: false (most environments), true (secure)
# Environment: Secure
# Required: No

CONTENT_SECURITY_POLICY=default
# Description: Content Security Policy setting
# Values: default | strict | none
# Default: default (production), none (development)
# Environment: Production, Secure
# Required: No

INTRUSION_DETECTION=false
# Description: Enable intrusion detection monitoring
# Values: true | false
# Default: false (most environments), true (secure)
# Environment: Secure
# Required: No
```

### Development and Debugging
```bash
# Development Settings
DEBUG_MODE=false
# Description: Enable debug mode with verbose logging
# Values: true | false
# Default: false (production), true (development)
# Environment: Development
# Required: No

VERBOSE_LOGGING=false
# Description: Enable verbose application logging
# Values: true | false
# Default: false (production), true (development)
# Environment: Development
# Required: No

ENABLE_CONSOLE_LOGS=false
# Description: Enable console logging output
# Values: true | false
# Default: false (production), true (development)
# Environment: Development
# Required: No

PERFORMANCE_MONITORING=true
# Description: Enable performance monitoring and metrics
# Values: true | false
# Default: true (production), true (development)
# Environment: All
# Required: No

SAMPLE_DATA_ENABLED=false
# Description: Enable automatic sample data generation
# Values: true | false
# Default: false (production), true (development)
# Environment: Development
# Required: No

MOCK_SERVICES_ENABLED=false
# Description: Enable mock external services
# Values: true | false
# Default: false (production), true (development)
# Environment: Development
# Required: No

AUTO_LOGIN_ENABLED=false
# Description: Enable automatic login for development
# Values: true | false
# Default: false
# Environment: Development
# Required: No

DEVELOPMENT_TOOLS_ENABLED=false
# Description: Enable development tools and debugging features
# Values: true | false
# Default: false (production), true (development)
# Environment: Development
# Required: No
```

### Performance Configuration
```bash
# Performance Settings
ENABLE_COMPRESSION=true
# Description: Enable response compression
# Values: true | false
# Default: true (production), false (development)
# Environment: Production
# Required: No

CACHE_STATIC_ASSETS=true
# Description: Enable static asset caching
# Values: true | false
# Default: true (production), false (development)
# Environment: Production
# Required: No

MINIFY_RESPONSES=true
# Description: Minify HTML/CSS/JS responses
# Values: true | false
# Default: true (production), false (development)
# Environment: Production
# Required: No

LAZY_LOADING=true
# Description: Enable lazy loading for large datasets
# Values: true | false
# Default: true (production), false (development)
# Environment: All
# Required: No

BROWSER_CACHE_ENABLED=true
# Description: Enable browser caching
# Values: true | false
# Default: true (production), false (development)
# Environment: All
# Required: No

BROWSER_STORAGE_PERSISTENCE=true
# Description: Enable persistent browser storage
# Values: true | false
# Default: true (production), false (development)
# Environment: All
# Required: No

BROWSER_CACHE_DURATION=7d
# Description: Browser cache duration
# Values: Time string (e.g., 1h, 1d, 7d)
# Default: 7d (production), 0 (development)
# Environment: Production
# Required: No

BROWSER_CACHE_DISABLED=false
# Description: Disable browser caching completely
# Values: true | false
# Default: false (production), true (development)
# Environment: Development
# Required: No
```

### Monitoring and Logging
```bash
# Monitoring Settings
ENABLE_METRICS=true
# Description: Enable metrics collection
# Values: true | false
# Default: true (production), false (development)
# Environment: Production, Staging
# Required: No

LOG_LEVEL=warn
# Description: Application logging level
# Values: error | warn | info | debug | trace
# Default: warn (production), debug (development)
# Environment: All
# Required: No

AUDIT_LEVEL=comprehensive
# Description: Audit logging detail level
# Values: minimal | standard | detailed | comprehensive
# Default: comprehensive (production), standard (development)
# Environment: All
# Required: No

ERROR_REPORTING=true
# Description: Enable error reporting and tracking
# Values: true | false
# Default: true (production), false (development)
# Environment: Production
# Required: No

COMPREHENSIVE_LOGGING=false
# Description: Enable comprehensive system logging
# Values: true | false
# Default: false (most environments), true (secure)
# Environment: Secure
# Required: No

SECURITY_EVENT_MONITORING=false
# Description: Enable security event monitoring
# Values: true | false
# Default: false (most environments), true (secure)
# Environment: Secure
# Required: No

REAL_TIME_ALERTS=false
# Description: Enable real-time alert notifications
# Values: true | false
# Default: false (most environments), true (secure)
# Environment: Secure
# Required: No

LOG_INTEGRITY_CHECKS=false
# Description: Enable log integrity verification
# Values: true | false
# Default: false (most environments), true (secure)
# Environment: Secure
# Required: No
```

---

## UC Admin Tools Environment Variables

### UC Network Configuration
```bash
# UC Network Settings
UC_NETWORK_TIMEOUT=30000
# Description: Network operation timeout in milliseconds
# Values: Number (milliseconds)
# Default: 30000 (production), 10000 (development)
# Environment: All
# Required: No

UC_DEBUG_NETWORK_TESTS=false
# Description: Enable debug output for network tests
# Values: true | false
# Default: false (production), true (development)
# Environment: Development
# Required: No

UC_ALLOW_INSECURE_CONNECTIONS=false
# Description: Allow insecure network connections for testing
# Values: true | false
# Default: false (production), true (development)
# Environment: Development
# Required: No

UC_DEFAULT_DNS_SERVERS=8.8.8.8,1.1.1.1
# Description: Comma-separated list of default DNS servers
# Values: IP addresses separated by commas
# Default: 8.8.8.8,1.1.1.1
# Environment: All
# Required: No

UC_PORT_CHECK_TIMEOUT=5000
# Description: Port connectivity check timeout in milliseconds
# Values: Number (milliseconds)
# Default: 5000
# Environment: All
# Required: No

UC_MAX_CONCURRENT_TESTS=5
# Description: Maximum concurrent network tests
# Values: Number
# Default: 5
# Environment: All
# Required: No
```

### UC Configuration Management
```bash
# UC Configuration Settings
UC_CONFIG_VALIDATION_STRICT=true
# Description: Enable strict configuration validation
# Values: true | false
# Default: true (production), false (development)
# Environment: All
# Required: No

UC_MAX_CONFIG_VERSIONS=10
# Description: Maximum configuration versions to retain
# Values: Number
# Default: 10 (production), 5 (development)
# Environment: All
# Required: No

UC_CONFIG_FILE_MAX_SIZE=10485760
# Description: Maximum configuration file size in bytes (10MB)
# Values: Number (bytes)
# Default: 10485760 (10MB)
# Environment: All
# Required: No

UC_AUTO_BACKUP_ENABLED=true
# Description: Enable automatic configuration backups
# Values: true | false
# Default: true (production), false (development)
# Environment: All
# Required: No

UC_ENCRYPT_SENSITIVE_DATA=false
# Description: Encrypt sensitive configuration data
# Values: true | false
# Default: false (most environments), true (secure)
# Environment: Secure
# Required: No

UC_DIGITAL_SIGNATURES=false
# Description: Enable digital signatures for configurations
# Values: true | false
# Default: false (most environments), true (secure)
# Environment: Secure
# Required: No

UC_ACCESS_CONTROL=standard
# Description: Access control level for UC tools
# Values: standard | strict
# Default: standard (most environments), strict (secure)
# Environment: All
# Required: No

UC_AUDIT_ALL_ACTIONS=false
# Description: Audit all UC administration actions
# Values: true | false
# Default: false (most environments), true (secure)
# Environment: Secure
# Required: No
```

### UC Development Settings
```bash
# UC Development Settings
UC_DEBUG_MODE=false
# Description: Enable UC debug mode
# Values: true | false
# Default: false (production), true (development)
# Environment: Development
# Required: No

UC_MOCK_NETWORK_TESTS=false
# Description: Use mock data for network tests
# Values: true | false
# Default: false (production), true (development)
# Environment: Development
# Required: No

UC_DEVELOPMENT_TOOLS=false
# Description: Enable UC development tools
# Values: true | false
# Default: false (production), true (development)
# Environment: Development
# Required: No

UC_VERBOSE_DIAGNOSTICS=false
# Description: Enable verbose diagnostic output
# Values: true | false
# Default: false (production), true (development)
# Environment: Development
# Required: No
```

---

## System Configuration Options (Database)

### Application Configuration
```javascript
// System configurations stored in system_configurations table
const applicationConfigurations = {
  // Environment Configuration
  environment: {
    type: 'application',
    name: 'environment',
    configuration: {
      mode: 'production',           // development | staging | production
      debug: false,                 // Enable debug features
      verbose_logging: false,       // Enable verbose logging
      optimization_enabled: true    // Enable performance optimizations
    },
    enabled: true,
    description: 'Application environment settings'
  },
  
  // Feature Flags
  features: {
    type: 'application',
    name: 'feature_flags',
    configuration: {
      bulk_operations: true,        // Enable bulk operations
      analytics_dashboard: true,    // Enable analytics dashboard
      csv_import_export: true,      // Enable CSV import/export
      audit_logging: true,          // Enable audit logging
      uc_admin_tools: true,         // Enable UC Admin Tools
      pbx_integration: true,        // Enable PBX integration
      advanced_search: true,        // Enable advanced search features
      real_time_updates: false      // Enable real-time data updates
    },
    enabled: true,
    description: 'Feature flag configuration'
  },
  
  // UI Configuration
  ui_settings: {
    type: 'application',
    name: 'ui_settings',
    configuration: {
      theme: 'default',             // default | dark | light
      page_size: 50,                // Default page size for tables
      auto_refresh: 300000,         // Auto-refresh interval (5 minutes)
      show_tooltips: true,          // Show help tooltips
      compact_view: false,          // Use compact table view
      enable_shortcuts: true,       // Enable keyboard shortcuts
      notification_duration: 5000   // Notification display duration
    },
    enabled: true,
    description: 'User interface configuration'
  }
};
```

### Security Configuration
```javascript
// Security configurations
const securityConfigurations = {
  // Session Management
  session_management: {
    type: 'security',
    name: 'session_management',
    configuration: {
      timeout: 14400000,            // 4 hours in milliseconds
      secure: true,                 // Use secure cookies
      httpOnly: true,               // HTTP-only cookies
      sameSite: 'strict',           // SameSite cookie setting
      remember_me: false,           // Enable remember me option
      rotation_enabled: true,       // Enable session rotation
      max_concurrent: 3             // Maximum concurrent sessions
    },
    enabled: true,
    description: 'Session security configuration'
  },
  
  // Password Policy
  password_policy: {
    type: 'security',
    name: 'password_policy',
    configuration: {
      min_length: 8,                // Minimum password length
      require_uppercase: true,      // Require uppercase letters
      require_lowercase: true,      // Require lowercase letters
      require_numbers: true,        // Require numbers
      require_symbols: false,       // Require special symbols
      max_age_days: 90,            // Password expiration (days)
      history_count: 5,            // Password history to check
      lockout_attempts: 5,         // Lockout after failed attempts
      lockout_duration: 900000     // Lockout duration (15 minutes)
    },
    enabled: true,
    description: 'Password security policy'
  },
  
  // Audit Configuration
  audit_configuration: {
    type: 'security',
    name: 'audit_configuration',
    configuration: {
      level: 'comprehensive',       // minimal | standard | detailed | comprehensive
      retention_days: 365,          // Audit log retention period
      security_events: true,        // Log security events
      data_changes: true,           // Log data modifications
      access_logging: true,         // Log access attempts
      failed_attempts: true,        // Log failed operations
      export_operations: true,      // Log export operations
      admin_actions: true           // Log administrative actions
    },
    enabled: true,
    description: 'Audit logging configuration'
  }
};
```

### Performance Configuration
```javascript
// Performance configurations
const performanceConfigurations = {
  // Query Optimization
  query_optimization: {
    type: 'performance',
    name: 'query_optimization',
    configuration: {
      cache_enabled: true,          // Enable query result caching
      batch_size: 1000,            // Batch size for bulk operations
      index_optimization: true,     // Enable index optimization
      connection_pooling: true,     // Enable connection pooling
      query_timeout: 30000,        // Query timeout (30 seconds)
      max_concurrent: 10,          // Maximum concurrent queries
      pagination_size: 100,        // Default pagination size
      cache_ttl: 300000           // Cache TTL (5 minutes)
    },
    enabled: true,
    description: 'Database query optimization settings'
  },
  
  // Memory Management
  memory_management: {
    type: 'performance',
    name: 'memory_management',
    configuration: {
      max_memory_mb: 500,          // Maximum memory usage
      gc_threshold: 100,            // Garbage collection threshold
      object_pooling: true,         // Enable object pooling
      lazy_loading: true,           // Enable lazy loading
      cache_cleanup_interval: 600000, // Cache cleanup interval (10 minutes)
      memory_monitoring: true       // Enable memory monitoring
    },
    enabled: true,
    description: 'Memory management configuration'
  }
};
```

### Backup Configuration
```javascript
// Backup configurations
const backupConfigurations = {
  // Automatic Backup
  automatic_backup: {
    type: 'backup',
    name: 'automatic_backup',
    configuration: {
      enabled: true,                // Enable automatic backups
      interval: 'daily',            // daily | weekly | monthly
      retention: 30,                // Retention period (days)
      compression: true,            // Enable backup compression
      encryption: false,            // Enable backup encryption
      offsite_backup: false,        // Enable offsite backup
      incremental: true,            // Enable incremental backups
      verify_integrity: true        // Verify backup integrity
    },
    enabled: true,
    description: 'Automatic backup configuration'
  },
  
  // Backup Storage
  backup_storage: {
    type: 'backup',
    name: 'backup_storage',
    configuration: {
      location: 'local',            // local | cloud | network
      max_size_mb: 1000,           // Maximum backup size
      cleanup_old: true,           // Cleanup old backups
      notification: true,           // Backup completion notifications
      error_alerts: true           // Backup error alerts
    },
    enabled: true,
    description: 'Backup storage configuration'
  }
};
```

---

## UC System Settings (Database)

### Network Settings
```javascript
// UC system settings stored in uc_system_settings table
const ucNetworkSettings = [
  {
    setting_key: 'uc_network_timeout',
    setting_value: '30000',
    category: 'network',
    description: 'Network test timeout in milliseconds'
  },
  {
    setting_key: 'uc_default_dns_servers',
    setting_value: '["8.8.8.8", "1.1.1.1", "208.67.222.222"]',
    category: 'network',
    description: 'Default DNS servers for network tests'
  },
  {
    setting_key: 'uc_port_check_timeout',
    setting_value: '5000',
    category: 'network',
    description: 'Port check timeout in milliseconds'
  },
  {
    setting_key: 'uc_max_concurrent_tests',
    setting_value: '5',
    category: 'network',
    description: 'Maximum concurrent network tests'
  },
  {
    setting_key: 'uc_test_retry_count',
    setting_value: '3',
    category: 'network',
    description: 'Number of retries for failed network tests'
  },
  {
    setting_key: 'uc_test_interval',
    setting_value: '1000',
    category: 'network',
    description: 'Interval between network tests in milliseconds'
  }
];
```

### Configuration Management Settings
```javascript
const ucConfigurationSettings = [
  {
    setting_key: 'uc_max_config_versions',
    setting_value: '10',
    category: 'configuration',
    description: 'Maximum number of configuration versions to keep'
  },
  {
    setting_key: 'uc_config_file_max_size',
    setting_value: '10485760',
    category: 'configuration',
    description: 'Maximum configuration file size in bytes'
  },
  {
    setting_key: 'uc_config_validation_strict',
    setting_value: 'true',
    category: 'configuration',
    description: 'Enable strict configuration validation'
  },
  {
    setting_key: 'uc_config_auto_save',
    setting_value: 'true',
    category: 'configuration',
    description: 'Enable automatic configuration saving'
  },
  {
    setting_key: 'uc_config_backup_on_change',
    setting_value: 'true',
    category: 'configuration',
    description: 'Create backup when configuration changes'
  },
  {
    setting_key: 'uc_config_diff_tracking',
    setting_value: 'true',
    category: 'configuration',
    description: 'Track configuration differences'
  }
];
```

### Backup Settings
```javascript
const ucBackupSettings = [
  {
    setting_key: 'uc_auto_backup_enabled',
    setting_value: 'true',
    category: 'backup',
    description: 'Enable automatic configuration backups'
  },
  {
    setting_key: 'uc_backup_interval',
    setting_value: 'daily',
    category: 'backup',
    description: 'Backup interval (daily, weekly, monthly)'
  },
  {
    setting_key: 'uc_backup_retention_days',
    setting_value: '30',
    category: 'backup',
    description: 'Number of days to retain backups'
  },
  {
    setting_key: 'uc_backup_compression',
    setting_value: 'true',
    category: 'backup',
    description: 'Enable backup compression'
  },
  {
    setting_key: 'uc_backup_verification',
    setting_value: 'true',
    category: 'backup',
    description: 'Verify backup integrity after creation'
  }
];
```

### Security Settings
```javascript
const ucSecuritySettings = [
  {
    setting_key: 'uc_access_control_level',
    setting_value: 'standard',
    category: 'security',
    description: 'Access control level (standard, strict)'
  },
  {
    setting_key: 'uc_audit_all_actions',
    setting_value: 'false',
    category: 'security',
    description: 'Audit all UC administration actions'
  },
  {
    setting_key: 'uc_encrypt_sensitive_data',
    setting_value: 'false',
    category: 'security',
    description: 'Encrypt sensitive configuration data'
  },
  {
    setting_key: 'uc_session_timeout',
    setting_value: '3600000',
    category: 'security',
    description: 'UC session timeout in milliseconds'
  },
  {
    setting_key: 'uc_failed_login_lockout',
    setting_value: '5',
    category: 'security',
    description: 'Number of failed logins before lockout'
  }
];
```

---

## Configuration Validation Rules

### Environment Variable Validation
```javascript
// Validation rules for environment variables
const environmentValidationRules = {
  NODE_ENV: {
    required: true,
    type: 'string',
    values: ['development', 'staging', 'production', 'test'],
    default: 'development'
  },
  
  AUTH_SESSION_DURATION: {
    required: true,
    type: 'duration',
    min: '5m',
    max: '24h',
    default: '4h'
  },
  
  DEFAULT_ADMIN_PASSWORD: {
    required: true,
    type: 'string',
    minLength: 8,
    validation: (value, env) => {
      if (env === 'production' && ['admin123', 'password', 'CHANGE_ME_IMMEDIATELY'].includes(value)) {
        throw new Error('Default password must be changed in production');
      }
    }
  },
  
  UC_NETWORK_TIMEOUT: {
    required: false,
    type: 'number',
    min: 1000,
    max: 300000,
    default: 30000
  },
  
  LOG_LEVEL: {
    required: false,
    type: 'string',
    values: ['error', 'warn', 'info', 'debug', 'trace'],
    default: 'warn'
  }
};
```

### Configuration Dependencies
```javascript
// Configuration dependencies and conflicts
const configurationDependencies = {
  // HTTPS-related dependencies
  ENFORCE_HTTPS: {
    requires: ['SECURE_COOKIES'],
    conflicts: [],
    implies: {
      SECURE_COOKIES: true
    }
  },
  
  // Debug mode implications
  DEBUG_MODE: {
    requires: [],
    conflicts: ['MINIFY_RESPONSES', 'ENABLE_COMPRESSION'],
    implies: {
      VERBOSE_LOGGING: true,
      ENABLE_CONSOLE_LOGS: true,
      PERFORMANCE_MONITORING: true
    }
  },
  
  // Production environment requirements
  NODE_ENV_PRODUCTION: {
    requires: ['ENFORCE_HTTPS', 'SECURE_COOKIES', 'CSRF_PROTECTION'],
    conflicts: ['DEBUG_MODE', 'SAMPLE_DATA_ENABLED', 'AUTO_LOGIN_ENABLED'],
    implies: {
      RATE_LIMITING: true,
      AUDIT_LEVEL: 'comprehensive',
      ENABLE_METRICS: true
    }
  }
};
```

---

## Environment-Specific Configuration Templates

### Development Template
```bash
# Development Environment Template
NODE_ENV=development
APP_NAME=Phone Range Nexus - Development
DEBUG_MODE=true
VERBOSE_LOGGING=true
ENABLE_CONSOLE_LOGS=true
PERFORMANCE_MONITORING=true
SAMPLE_DATA_ENABLED=true
MOCK_SERVICES_ENABLED=true
DEVELOPMENT_TOOLS_ENABLED=true

# Relaxed security for development
AUTH_SESSION_DURATION=24h
DEFAULT_ADMIN_PASSWORD=admin123
ALLOW_WEAK_PASSWORDS=true
ENFORCE_HTTPS=false
SECURE_COOKIES=false
CSRF_PROTECTION=false

# UC Development Settings
UC_NETWORK_TIMEOUT=10000
UC_DEBUG_NETWORK_TESTS=true
UC_ALLOW_INSECURE_CONNECTIONS=true
UC_CONFIG_VALIDATION_STRICT=false
UC_DEBUG_MODE=true
UC_MOCK_NETWORK_TESTS=true

# Browser Settings
BROWSER_CACHE_DISABLED=true
BROWSER_STORAGE_PERSISTENCE=false
```

### Production Template
```bash
# Production Environment Template
NODE_ENV=production
APP_NAME=Phone Range Nexus
DEBUG_MODE=false
VERBOSE_LOGGING=false
ENABLE_CONSOLE_LOGS=false
PERFORMANCE_MONITORING=true

# Security hardening
AUTH_SESSION_DURATION=4h
DEFAULT_ADMIN_PASSWORD=CHANGE_ME_IMMEDIATELY
REQUIRE_PASSWORD_CHANGE=true
ALLOW_WEAK_PASSWORDS=false
ENFORCE_HTTPS=true
SECURE_COOKIES=true
CSRF_PROTECTION=true
RATE_LIMITING=true
SECURITY_HEADERS=true
XSS_PROTECTION=true

# Performance optimization
ENABLE_COMPRESSION=true
CACHE_STATIC_ASSETS=true
MINIFY_RESPONSES=true
LAZY_LOADING=true
BROWSER_CACHE_ENABLED=true
BROWSER_STORAGE_PERSISTENCE=true
BROWSER_CACHE_DURATION=7d

# Monitoring
ENABLE_METRICS=true
LOG_LEVEL=warn
AUDIT_LEVEL=comprehensive
ERROR_REPORTING=true

# UC Production Settings
UC_NETWORK_TIMEOUT=30000
UC_DEBUG_NETWORK_TESTS=false
UC_ALLOW_INSECURE_CONNECTIONS=false
UC_CONFIG_VALIDATION_STRICT=true
UC_AUTO_BACKUP_ENABLED=true
UC_MAX_CONFIG_VERSIONS=10
```

### Secure Environment Template
```bash
# Secure Environment Template
NODE_ENV=production
APP_NAME=Phone Range Nexus - Secure
SECURITY_LEVEL=high

# Enhanced Authentication
AUTH_SESSION_DURATION=2h
MULTI_FACTOR_AUTH=true
SESSION_ROTATION=true
IDLE_TIMEOUT=30m
REQUIRE_PASSWORD_CHANGE=true

# Maximum Security
ENFORCE_HTTPS=true
HSTS_ENABLED=true
CONTENT_SECURITY_POLICY=strict
SECURE_COOKIES=true
CSRF_PROTECTION=true
RATE_LIMITING=aggressive
INTRUSION_DETECTION=true

# Comprehensive Logging
COMPREHENSIVE_LOGGING=true
SECURITY_EVENT_MONITORING=true
REAL_TIME_ALERTS=true
LOG_INTEGRITY_CHECKS=true
AUDIT_LEVEL=comprehensive

# UC Secure Settings
UC_ENCRYPT_SENSITIVE_DATA=true
UC_DIGITAL_SIGNATURES=true
UC_ACCESS_CONTROL=strict
UC_AUDIT_ALL_ACTIONS=true

# Compliance
GDPR_COMPLIANCE=true
HIPAA_COMPLIANCE=true
SOX_COMPLIANCE=true
```

---

## Configuration Management Tools

### Environment Configuration Validator
```bash
#!/bin/bash
# validate-environment.sh
# Usage: ./validate-environment.sh [environment]

ENVIRONMENT=${1:-development}
ENV_FILE=".env.${ENVIRONMENT}"

echo "Validating ${ENVIRONMENT} environment configuration..."

# Check if environment file exists
if [ ! -f "${ENV_FILE}" ]; then
  echo "❌ Environment file ${ENV_FILE} not found"
  exit 1
fi

# Source the environment file
source "${ENV_FILE}"

# Validate required variables
REQUIRED_VARS=("NODE_ENV" "APP_NAME" "AUTH_SESSION_DURATION")
MISSING_VARS=()

for var in "${REQUIRED_VARS[@]}"; do
  if [ -z "${!var}" ]; then
    MISSING_VARS+=("$var")
  fi
done

if [ ${#MISSING_VARS[@]} -ne 0 ]; then
  echo "❌ Missing required variables: ${MISSING_VARS[*]}"
  exit 1
fi

# Environment-specific validations
case ${ENVIRONMENT} in
  "production")
    if [ "${DEFAULT_ADMIN_PASSWORD}" = "admin123" ] || [ "${DEFAULT_ADMIN_PASSWORD}" = "CHANGE_ME_IMMEDIATELY" ]; then
      echo "❌ Default admin password must be changed in production"
      exit 1
    fi
    
    if [ "${DEBUG_MODE}" = "true" ]; then
      echo "❌ Debug mode should not be enabled in production"
      exit 1
    fi
    ;;
  "development")
    if [ "${ENFORCE_HTTPS}" = "true" ]; then
      echo "⚠️  HTTPS enforcement enabled in development (may cause issues)"
    fi
    ;;
esac

echo "✅ Environment configuration validation passed"
```

### Configuration Generator Script
```javascript
#!/usr/bin/env node
/**
 * Configuration Generator Script
 * Generates environment-specific configuration files
 */

import fs from 'fs';

class ConfigurationGenerator {
  constructor() {
    this.templates = {
      development: this.getDevelopmentTemplate(),
      staging: this.getStagingTemplate(),
      production: this.getProductionTemplate(),
      secure: this.getSecureTemplate()
    };
  }
  
  generateConfiguration(environment, customOptions = {}) {
    const template = this.templates[environment];
    if (!template) {
      throw new Error(`Unknown environment: ${environment}`);
    }
    
    // Apply custom options
    const config = { ...template, ...customOptions };
    
    // Generate .env file content
    const envContent = this.generateEnvContent(config);
    
    // Write to file
    const filename = `.env.${environment}`;
    fs.writeFileSync(filename, envContent);
    
    console.log(`✅ Generated configuration file: ${filename}`);
    
    return { filename, config };
  }
  
  generateEnvContent(config) {
    let content = `# ${config.APP_NAME} - ${config.NODE_ENV.toUpperCase()} Environment\n`;
    content += `# Generated: ${new Date().toISOString()}\n\n`;
    
    const sections = {
      'Application': ['NODE_ENV', 'APP_NAME', 'VERSION'],
      'Authentication': ['AUTH_SESSION_DURATION', 'DEFAULT_ADMIN_USERNAME', 'DEFAULT_ADMIN_PASSWORD'],
      'Security': ['ENFORCE_HTTPS', 'SECURE_COOKIES', 'CSRF_PROTECTION'],
      'Performance': ['ENABLE_COMPRESSION', 'CACHE_STATIC_ASSETS', 'LAZY_LOADING'],
      'UC Admin Tools': ['UC_NETWORK_TIMEOUT', 'UC_CONFIG_VALIDATION_STRICT', 'UC_AUTO_BACKUP_ENABLED'],
      'Development': ['DEBUG_MODE', 'VERBOSE_LOGGING', 'SAMPLE_DATA_ENABLED']
    };
    
    for (const [sectionName, keys] of Object.entries(sections)) {
      const sectionVars = keys.filter(key => config.hasOwnProperty(key));
      
      if (sectionVars.length > 0) {
        content += `# ${sectionName}\n`;
        
        for (const key of sectionVars) {
          content += `${key}=${config[key]}\n`;
        }
        
        content += '\n';
      }
    }
    
    return content;
  }
  
  getDevelopmentTemplate() {
    return {
      NODE_ENV: 'development',
      APP_NAME: 'Phone Range Nexus - Development',
      DEBUG_MODE: true,
      VERBOSE_LOGGING: true,
      ENABLE_CONSOLE_LOGS: true,
      AUTH_SESSION_DURATION: '24h',
      DEFAULT_ADMIN_USERNAME: 'admin',
      DEFAULT_ADMIN_PASSWORD: 'admin123',
      ALLOW_WEAK_PASSWORDS: true,
      SAMPLE_DATA_ENABLED: true,
      UC_NETWORK_TIMEOUT: 10000,
      UC_DEBUG_NETWORK_TESTS: true,
      UC_DEBUG_MODE: true
    };
  }
  
  getProductionTemplate() {
    return {
      NODE_ENV: 'production',
      APP_NAME: 'Phone Range Nexus',
      DEBUG_MODE: false,
      VERBOSE_LOGGING: false,
      AUTH_SESSION_DURATION: '4h',
      DEFAULT_ADMIN_USERNAME: 'admin',
      DEFAULT_ADMIN_PASSWORD: 'CHANGE_ME_IMMEDIATELY',
      REQUIRE_PASSWORD_CHANGE: true,
      ENFORCE_HTTPS: true,
      SECURE_COOKIES: true,
      CSRF_PROTECTION: true,
      RATE_LIMITING: true,
      ENABLE_COMPRESSION: true,
      CACHE_STATIC_ASSETS: true,
      ENABLE_METRICS: true,
      UC_NETWORK_TIMEOUT: 30000,
      UC_CONFIG_VALIDATION_STRICT: true,
      UC_AUTO_BACKUP_ENABLED: true
    };
  }
  
  getStagingTemplate() {
    const production = this.getProductionTemplate();
    return {
      ...production,
      NODE_ENV: 'staging',
      APP_NAME: 'Phone Range Nexus - Staging',
      AUTH_SESSION_DURATION: '8h',
      DEFAULT_ADMIN_PASSWORD: 'ComplexPassword123!'
    };
  }
  
  getSecureTemplate() {
    const production = this.getProductionTemplate();
    return {
      ...production,
      APP_NAME: 'Phone Range Nexus - Secure',
      SECURITY_LEVEL: 'high',
      AUTH_SESSION_DURATION: '2h',
      MULTI_FACTOR_AUTH: true,
      SESSION_ROTATION: true,
      IDLE_TIMEOUT: '30m',
      HSTS_ENABLED: true,
      CONTENT_SECURITY_POLICY: 'strict',
      INTRUSION_DETECTION: true,
      COMPREHENSIVE_LOGGING: true,
      UC_ENCRYPT_SENSITIVE_DATA: true,
      UC_ACCESS_CONTROL: 'strict',
      UC_AUDIT_ALL_ACTIONS: true
    };
  }
}

// CLI interface
if (import.meta.url === `file://${process.argv[1]}`) {
  const environment = process.argv[2];
  
  if (!environment) {
    console.log(`
Configuration Generator

Usage:
  node generate-config.js <environment>

Environments:
  development  Generate development configuration
  staging      Generate staging configuration  
  production   Generate production configuration
  secure       Generate secure environment configuration

Examples:
  node generate-config.js development
  node generate-config.js production
    `);
    process.exit(1);
  }
  
  try {
    const generator = new ConfigurationGenerator();
    generator.generateConfiguration(environment);
  } catch (error) {
    console.error('❌ Configuration generation failed:', error.message);
    process.exit(1);
  }
}

export { ConfigurationGenerator };
```

---

## Best Practices and Security Considerations

### Environment Variable Security
1. **Never commit sensitive values** to version control
2. **Use different passwords** for each environment
3. **Rotate secrets regularly** in production environments
4. **Validate configuration** before deployment
5. **Monitor configuration changes** through audit logs
6. **Use environment-specific encryption** for sensitive data

### Configuration Management
1. **Version control configuration templates** (without secrets)
2. **Document all configuration options** and their purposes
3. **Validate configurations** automatically during deployment
4. **Test configuration changes** in staging before production
5. **Backup configurations** before making changes
6. **Monitor configuration drift** between environments

---

**Documentation Version**: 1.0  
**Last Updated**: February 2, 2025  
**Total Configuration Options**: 150+  
**Environment Support**: Development, Staging, Production, Secure