# Database Schema Documentation
**Phone Range Nexus & UC Admin Tools - Integrated Application**

Generated: February 2, 2025  
Database Version: 4.0  
Database Type: IndexedDB (Browser-based)

---

## Executive Summary

The Phone Range Nexus application has been successfully migrated from Supabase to a local IndexedDB implementation, providing complete offline functionality and corporate firewall compatibility. The database schema includes both the core phone number management system and the integrated UC (Unified Communications) Admin Tools.

### Database Architecture
- **Database Engine**: IndexedDB (Browser-native)
- **Database Name**: `PhoneRangeNexus`
- **Current Version**: 4.0
- **Migration Path**: Supabase → Local SQLite → IndexedDB
- **Total Tables**: 13 tables (8 core + 5 UC tables)

---

## Core Database Tables

### 1. phone_numbers
**Purpose**: Primary table for phone number inventory management

```javascript
Schema: {
  id: string (Primary Key, UUID)
  number: string (Unique, indexed)
  status: enum('available', 'assigned', 'reserved', 'aging', 'blocked', 'toll-free')
  system: string
  carrier: string (indexed)
  assigned_to: string | null
  notes: string
  extension: string
  department: string (indexed)
  location: string
  date_assigned: string | null (ISO date)
  date_available: string | null (ISO date)
  last_used: string | null (ISO date)
  aging_days: number
  number_type: enum('local', 'toll-free', 'international')
  range_name: string
  project: string | null (indexed)
  reserved_until: string | null (ISO date)
  usage_inbound: number
  usage_outbound: number
  usage_last_activity: string | null (ISO date)
  created_at: string (ISO timestamp)
  updated_at: string (ISO timestamp)
}

Indexes:
- number (unique)
- status
- department  
- carrier
- project
```

### 2. number_ranges
**Purpose**: Management of phone number ranges and blocks

```javascript
Schema: {
  id: string (Primary Key, UUID)
  name: string (indexed)
  pattern: string
  start_number: string
  end_number: string
  total_numbers: number
  available_numbers: number
  assigned_numbers: number
  reserved_numbers: number
  carrier: string
  location: string
  department: string (indexed)
  date_created: string (ISO date)
  notes: string
  status: enum('active', 'inactive', 'pending') (indexed)
  project: string | null
  created_at: string (ISO timestamp)
  updated_at: string (ISO timestamp)
}

Indexes:
- name
- status
- department
```

### 3. bulk_operations
**Purpose**: Tracking of bulk operations and batch processes

```javascript
Schema: {
  id: string (Primary Key, UUID)
  type: enum('assign', 'release', 'reserve', 'import', 'export', 'transform') (indexed)
  status: enum('pending', 'running', 'completed', 'failed') (indexed)
  progress: number (0-100)
  total_items: number
  processed_items: number
  failed_items: number
  start_time: string (ISO timestamp, indexed)
  end_time: string | null (ISO timestamp)
  details: string
  results: any | null (JSON)
  created_at: string (ISO timestamp)
  updated_at: string (ISO timestamp)
}

Indexes:
- type
- status
- start_time
```

### 4. audit_log
**Purpose**: System activity auditing and compliance tracking

```javascript
Schema: {
  id: string (Primary Key, UUID)
  action: string
  user: string (indexed)
  timestamp: string (ISO timestamp, indexed)
  type: enum('assignment', 'import', 'release', 'settings', 'auth', 'sync') (indexed)
  details: any | null (JSON)
  created_at: string (ISO timestamp)
}

Indexes:
- timestamp
- type
- user
```

---

## Authentication & Session Tables

### 5. user_sessions
**Purpose**: User authentication and session management

```javascript
Schema: {
  id: string (Primary Key, UUID)
  username: string (Unique, indexed)
  password_hash: string
  session_token: string | null (indexed)
  session_expires: string | null (ISO timestamp)
  last_login: string | null (ISO timestamp)
  created_at: string (ISO timestamp)
  updated_at: string (ISO timestamp)
}

Indexes:
- username (unique)
- session_token
```

### 6. admin_sessions
**Purpose**: Enhanced admin session tracking

```javascript
Schema: {
  id: string (Primary Key, UUID)
  userId: string (indexed)
  username: string (indexed)
  sessionToken: string
  isActive: boolean (indexed)
  sessionStart: string (ISO timestamp, indexed)
  sessionEnd: string | null (ISO timestamp)
  expiresAt: string (ISO timestamp)
  ipAddress: string | null
  userAgent: string | null
  created_at: string (ISO timestamp)
  updated_at: string (ISO timestamp)
}

Indexes:
- userId
- username
- isActive
- sessionStart
```

---

## System Configuration Tables

### 7. system_configurations
**Purpose**: Application configuration and settings storage

```javascript
Schema: {
  id: string (Primary Key, UUID)
  type: string (indexed)
  name: string (indexed)
  configuration: any (JSON)
  enabled: boolean (indexed)
  description: string | null
  created_at: string (ISO timestamp)
  updated_at: string (ISO timestamp)
}

Indexes:
- type
- name
- enabled
```

### 8. security_events
**Purpose**: Security event logging and monitoring

```javascript
Schema: {
  id: string (Primary Key, UUID)
  timestamp: string (ISO timestamp, indexed)
  category: string (indexed)
  severity: enum('low', 'medium', 'high', 'critical') (indexed)
  userId: string | null (indexed)
  username: string | null
  action: string
  details: any | null (JSON)
  ipAddress: string | null
  userAgent: string | null
  created_at: string (ISO timestamp)
}

Indexes:
- timestamp
- category
- severity
- userId
```

---

## UC Admin Tools Tables (Database Version 4.0)

### 9. uc_config_files
**Purpose**: UC configuration file management

```javascript
Schema: {
  id: string (Primary Key, UUID)
  filename: string (Unique, indexed)
  file_type: string
  file_size: number
  content: string (Base64 or text)
  checksum: string
  is_active: boolean (indexed)
  description: string | null
  tags: string[] | null
  created_at: string (ISO timestamp, indexed)
  updated_at: string (ISO timestamp)
}

Indexes:
- filename (unique)
- is_active
- created_at
```

### 10. uc_config_history
**Purpose**: Version control for UC configuration files

```javascript
Schema: {
  id: string (Primary Key, UUID)
  config_file_id: string (indexed, FK to uc_config_files)
  version: number (indexed)
  content: string
  checksum: string
  change_description: string | null
  changed_by: string
  created_at: string (ISO timestamp, indexed)
}

Indexes:
- config_file_id
- version
- created_at
```

### 11. uc_network_tests
**Purpose**: Network diagnostic test results storage

```javascript
Schema: {
  id: string (Primary Key, UUID)
  test_type: enum('dns_lookup', 'port_check', 'ping', 'traceroute') (indexed)
  target_host: string (indexed)
  target_port: number | null
  result_status: enum('success', 'failed', 'timeout', 'error')
  result_data: any (JSON)
  response_time: number | null
  error_message: string | null
  performed_by: string
  created_at: string (ISO timestamp, indexed)
}

Indexes:
- test_type
- target_host
- created_at
```

### 12. uc_system_settings
**Purpose**: UC system configuration settings

```javascript
Schema: {
  id: string (Primary Key, UUID)
  setting_key: string (Unique, indexed)
  setting_value: string (JSON)
  category: string (indexed)
  description: string | null
  is_encrypted: boolean
  created_at: string (ISO timestamp)
  updated_at: string (ISO timestamp)
}

Indexes:
- setting_key (unique)
- category
```

### 13. uc_config_templates
**Purpose**: UC configuration templates and presets

```javascript
Schema: {
  id: string (Primary Key, UUID)
  template_name: string (indexed)
  template_type: string
  template_content: string
  description: string | null
  is_default: boolean (indexed)
  tags: string[] | null
  created_by: string
  created_at: string (ISO timestamp)
  updated_at: string (ISO timestamp)
}

Indexes:
- template_name
- is_default
```

---

## Database Relationships

### Core Relationships
1. **phone_numbers → number_ranges**: `range_name` field links to range `name`
2. **bulk_operations → phone_numbers**: Operations target phone number records
3. **audit_log**: References all tables for activity tracking
4. **user_sessions → admin_sessions**: Extended session tracking

### UC Admin Tools Relationships
1. **uc_config_files → uc_config_history**: One-to-many version history
2. **uc_network_tests**: Standalone diagnostic records
3. **uc_system_settings**: Global configuration storage
4. **uc_config_templates**: Template library for configurations

---

## Data Constraints & Validation

### Enum Constraints
- `phone_numbers.status`: 'available', 'assigned', 'reserved', 'aging', 'blocked', 'toll-free'
- `phone_numbers.number_type`: 'local', 'toll-free', 'international'
- `number_ranges.status`: 'active', 'inactive', 'pending'
- `bulk_operations.type`: 'assign', 'release', 'reserve', 'import', 'export', 'transform'
- `bulk_operations.status`: 'pending', 'running', 'completed', 'failed'
- `audit_log.type`: 'assignment', 'import', 'release', 'settings', 'auth', 'sync'
- `security_events.severity`: 'low', 'medium', 'high', 'critical'
- `uc_network_tests.test_type`: 'dns_lookup', 'port_check', 'ping', 'traceroute'
- `uc_network_tests.result_status`: 'success', 'failed', 'timeout', 'error'

### Unique Constraints
- `phone_numbers.number`: Ensures no duplicate phone numbers
- `user_sessions.username`: One record per user
- `uc_config_files.filename`: Unique configuration file names
- `uc_system_settings.setting_key`: Unique setting keys

### Business Logic Constraints
- Phone numbers must have valid status transitions
- Bulk operations track progress from 0-100
- Session tokens expire based on configuration
- UC config files maintain version history

---

## Performance Optimizations

### Indexing Strategy
- **Primary Keys**: All tables use UUID primary keys
- **Search Indexes**: Status, department, carrier fields for fast filtering
- **Temporal Indexes**: Created_at, timestamp fields for chronological queries
- **Foreign Key Indexes**: Reference fields for join operations

### Query Optimization
- Pagination implemented for large datasets
- Limited result sets for audit logs and network tests
- Status-based filtering for active records
- Date range queries optimized with temporal indexes

---

## Database Size Estimates

### Core Tables (Typical Corporate Deployment)
- **phone_numbers**: ~100MB (100,000 records)
- **number_ranges**: ~1MB (1,000 ranges)
- **bulk_operations**: ~10MB (10,000 operations)
- **audit_log**: ~50MB (100,000 entries)

### UC Admin Tools Tables
- **uc_config_files**: ~20MB (configuration files)
- **uc_config_history**: ~100MB (version history)
- **uc_network_tests**: ~25MB (diagnostic results)
- **uc_system_settings**: ~1MB (settings)
- **uc_config_templates**: ~5MB (templates)

**Total Estimated Size**: ~312MB for typical deployment

---

## Security Considerations

### Data Protection
- Password hashes use bcrypt with salt rounds
- Session tokens are cryptographically secure
- Sensitive configuration data can be encrypted
- Audit logging tracks all data access

### Access Control
- Admin-only access to system configurations
- User session validation for all operations
- Security event logging for compliance
- UC tools require elevated permissions

---

## Backup & Recovery Strategy

### Browser Database Backup
- IndexedDB data persists in browser storage
- Export functionality for data migration
- JSON format for cross-platform compatibility
- Automated backup scheduling through browser APIs

### Recovery Procedures
- Import from JSON backup files
- Reset to factory defaults option
- Selective table restoration
- Data validation on restore

---

## Version History

### Database Version 4.0 (Current)
- Added UC Admin Tools tables
- Enhanced security event logging
- Improved session management
- Added configuration templates

### Database Version 3.0
- Migration from SQLite to IndexedDB
- Enhanced audit logging
- Added system configurations

### Database Version 2.0
- Migration from Supabase
- Local authentication implementation
- Offline functionality

### Database Version 1.0
- Initial Supabase implementation
- Basic phone number management
- Cloud-based architecture

---

**Document Last Updated**: February 2, 2025  
**Schema Version**: 4.0  
**Compatibility**: Chrome 80+, Firefox 76+, Safari 13.1+, Edge 80+