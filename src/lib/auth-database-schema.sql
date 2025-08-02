-- Phone Range Nexus Enhanced Authentication Database Schema
-- This extends the existing schema with unified authentication support for LDAP/Local users

-- Users table - Unified user management for both LDAP and local users
CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(4))) || '-' || lower(hex(randomblob(2))) || '-4' || substr(lower(hex(randomblob(2))),2) || '-' || substr('89ab',abs(random()) % 4 + 1, 1) || substr(lower(hex(randomblob(2))),2) || '-' || lower(hex(randomblob(6)))),
    username TEXT NOT NULL UNIQUE,
    email TEXT UNIQUE,
    display_name TEXT,
    first_name TEXT,
    last_name TEXT,
    department TEXT,
    title TEXT,
    auth_type TEXT NOT NULL CHECK (auth_type IN ('local', 'ldap')) DEFAULT 'local',
    
    -- LDAP specific fields
    ldap_dn TEXT, -- Distinguished Name for LDAP users
    ldap_guid TEXT, -- LDAP GUID for user identification
    
    -- Local auth specific fields
    password_hash TEXT, -- Only for local users
    salt TEXT, -- Salt for local password hashing
    
    -- User status and metadata
    is_active BOOLEAN DEFAULT 1,
    is_verified BOOLEAN DEFAULT 0,
    failed_login_attempts INTEGER DEFAULT 0,
    locked_until TEXT,
    password_reset_token TEXT,
    password_reset_expires TEXT,
    
    -- Timestamps
    last_login TEXT,
    last_password_change TEXT,
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now'))
);

-- User Groups table - For organizing users into groups (from LDAP or manually assigned)
CREATE TABLE IF NOT EXISTS user_groups (
    id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(4))) || '-' || lower(hex(randomblob(2))) || '-4' || substr(lower(hex(randomblob(2))),2) || '-' || substr('89ab',abs(random()) % 4 + 1, 1) || substr(lower(hex(randomblob(2))),2) || '-' || lower(hex(randomblob(6)))),
    name TEXT NOT NULL UNIQUE,
    description TEXT,
    group_type TEXT CHECK (group_type IN ('ldap', 'local', 'system')) DEFAULT 'local',
    ldap_dn TEXT, -- For LDAP groups
    is_active BOOLEAN DEFAULT 1,
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now'))
);

-- User Group Memberships - Many-to-many relationship between users and groups
CREATE TABLE IF NOT EXISTS user_group_memberships (
    id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(4))) || '-' || lower(hex(randomblob(2))) || '-4' || substr(lower(hex(randomblob(2))),2) || '-' || substr('89ab',abs(random()) % 4 + 1, 1) || substr(lower(hex(randomblob(2))),2) || '-' || lower(hex(randomblob(6)))),
    user_id TEXT NOT NULL,
    group_id TEXT NOT NULL,
    assigned_by TEXT, -- Who assigned this membership
    assigned_at TEXT DEFAULT (datetime('now')),
    expires_at TEXT, -- Optional expiration
    is_active BOOLEAN DEFAULT 1,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (group_id) REFERENCES user_groups(id) ON DELETE CASCADE,
    UNIQUE(user_id, group_id)
);

-- Permissions table - Define available permissions in the system
CREATE TABLE IF NOT EXISTS permissions (
    id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(4))) || '-' || lower(hex(randomblob(2))) || '-4' || substr(lower(hex(randomblob(2))),2) || '-' || substr('89ab',abs(random()) % 4 + 1, 1) || substr(lower(hex(randomblob(2))),2) || '-' || lower(hex(randomblob(6)))),
    name TEXT NOT NULL UNIQUE,
    description TEXT,
    category TEXT, -- e.g., 'phones', 'users', 'system', 'reports'
    resource TEXT, -- What resource this permission applies to
    action TEXT, -- What action is allowed (read, write, delete, etc.)
    is_active BOOLEAN DEFAULT 1,
    created_at TEXT DEFAULT (datetime('now'))
);

-- Group Permissions - Assign permissions to groups
CREATE TABLE IF NOT EXISTS group_permissions (
    id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(4))) || '-' || lower(hex(randomblob(2))) || '-4' || substr(lower(hex(randomblob(2))),2) || '-' || substr('89ab',abs(random()) % 4 + 1, 1) || substr(lower(hex(randomblob(2))),2) || '-' || lower(hex(randomblob(6)))),
    group_id TEXT NOT NULL,
    permission_id TEXT NOT NULL,
    granted_by TEXT, -- Who granted this permission
    granted_at TEXT DEFAULT (datetime('now')),
    expires_at TEXT, -- Optional expiration
    is_active BOOLEAN DEFAULT 1,
    FOREIGN KEY (group_id) REFERENCES user_groups(id) ON DELETE CASCADE,
    FOREIGN KEY (permission_id) REFERENCES permissions(id) ON DELETE CASCADE,
    UNIQUE(group_id, permission_id)
);

-- User Permissions - Direct permissions assigned to users (overrides group permissions)
CREATE TABLE IF NOT EXISTS user_permissions (
    id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(4))) || '-' || lower(hex(randomblob(2))) || '-4' || substr(lower(hex(randomblob(2))),2) || '-' || substr('89ab',abs(random()) % 4 + 1, 1) || substr(lower(hex(randomblob(2))),2) || '-' || lower(hex(randomblob(6)))),
    user_id TEXT NOT NULL,
    permission_id TEXT NOT NULL,
    granted_by TEXT, -- Who granted this permission
    granted_at TEXT DEFAULT (datetime('now')),
    expires_at TEXT, -- Optional expiration
    is_active BOOLEAN DEFAULT 1,
    is_denied BOOLEAN DEFAULT 0, -- If true, this permission is explicitly denied
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (permission_id) REFERENCES permissions(id) ON DELETE CASCADE,
    UNIQUE(user_id, permission_id)
);

-- Enhanced Sessions table - For JWT and session management
CREATE TABLE IF NOT EXISTS auth_sessions (
    id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(4))) || '-' || lower(hex(randomblob(2))) || '-4' || substr(lower(hex(randomblob(2))),2) || '-' || substr('89ab',abs(random()) % 4 + 1, 1) || substr(lower(hex(randomblob(2))),2) || '-' || lower(hex(randomblob(6)))),
    session_id TEXT NOT NULL UNIQUE,
    user_id TEXT NOT NULL,
    token_hash TEXT, -- Hash of the JWT token for revocation
    ip_address TEXT,
    user_agent TEXT,
    device_info TEXT, -- JSON string with device information
    login_method TEXT CHECK (login_method IN ('local', 'ldap', 'sso')) DEFAULT 'local',
    
    -- Session status and timing
    is_active BOOLEAN DEFAULT 1,
    created_at TEXT DEFAULT (datetime('now')),
    expires_at TEXT NOT NULL,
    last_activity TEXT DEFAULT (datetime('now')),
    
    -- Security flags
    is_suspicious BOOLEAN DEFAULT 0,
    login_location TEXT, -- Approximate geographic location
    
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Authentication Events - Enhanced audit logging for authentication events
CREATE TABLE IF NOT EXISTS auth_events (
    id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(4))) || '-' || lower(hex(randomblob(2))) || '-4' || substr(lower(hex(randomblob(2))),2) || '-' || substr('89ab',abs(random()) % 4 + 1, 1) || substr(lower(hex(randomblob(2))),2) || '-' || lower(hex(randomblob(6)))),
    user_id TEXT, -- NULL for failed login attempts where user doesn't exist
    username TEXT NOT NULL,
    event_type TEXT NOT NULL CHECK (event_type IN (
        'login_success', 
        'login_failed', 
        'logout', 
        'password_change', 
        'password_reset_request', 
        'password_reset_success',
        'account_locked', 
        'account_unlocked',
        'permission_granted',
        'permission_revoked',
        'group_assigned',
        'group_removed',
        'session_expired',
        'suspicious_activity'
    )),
    auth_method TEXT CHECK (auth_method IN ('local', 'ldap', 'sso')) DEFAULT 'local',
    
    -- Event context
    ip_address TEXT,
    user_agent TEXT,
    device_info TEXT,
    location TEXT,
    
    -- Event details
    success BOOLEAN,
    failure_reason TEXT,
    details TEXT, -- JSON string with additional event details
    
    -- Security flags
    is_suspicious BOOLEAN DEFAULT 0,
    risk_score INTEGER DEFAULT 0, -- 0-100 risk score
    
    -- Metadata
    session_id TEXT,
    related_user_id TEXT, -- For admin actions affecting other users
    created_at TEXT DEFAULT (datetime('now')),
    
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL,
    FOREIGN KEY (related_user_id) REFERENCES users(id) ON DELETE SET NULL
);

-- Password History - Track password changes for security
CREATE TABLE IF NOT EXISTS password_history (
    id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(4))) || '-' || lower(hex(randomblob(2))) || '-4' || substr(lower(hex(randomblob(2))),2) || '-' || substr('89ab',abs(random()) % 4 + 1, 1) || substr(lower(hex(randomblob(2))),2) || '-' || lower(hex(randomblob(6)))),
    user_id TEXT NOT NULL,
    password_hash TEXT NOT NULL,
    salt TEXT,
    created_at TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_auth_type ON users(auth_type);
CREATE INDEX IF NOT EXISTS idx_users_is_active ON users(is_active);
CREATE INDEX IF NOT EXISTS idx_users_ldap_dn ON users(ldap_dn);
CREATE INDEX IF NOT EXISTS idx_users_department ON users(department);

CREATE INDEX IF NOT EXISTS idx_user_groups_name ON user_groups(name);
CREATE INDEX IF NOT EXISTS idx_user_groups_type ON user_groups(group_type);
CREATE INDEX IF NOT EXISTS idx_user_groups_active ON user_groups(is_active);

CREATE INDEX IF NOT EXISTS idx_user_group_memberships_user ON user_group_memberships(user_id);
CREATE INDEX IF NOT EXISTS idx_user_group_memberships_group ON user_group_memberships(group_id);
CREATE INDEX IF NOT EXISTS idx_user_group_memberships_active ON user_group_memberships(is_active);

CREATE INDEX IF NOT EXISTS idx_permissions_name ON permissions(name);
CREATE INDEX IF NOT EXISTS idx_permissions_category ON permissions(category);
CREATE INDEX IF NOT EXISTS idx_permissions_active ON permissions(is_active);

CREATE INDEX IF NOT EXISTS idx_group_permissions_group ON group_permissions(group_id);
CREATE INDEX IF NOT EXISTS idx_group_permissions_permission ON group_permissions(permission_id);
CREATE INDEX IF NOT EXISTS idx_group_permissions_active ON group_permissions(is_active);

CREATE INDEX IF NOT EXISTS idx_user_permissions_user ON user_permissions(user_id);
CREATE INDEX IF NOT EXISTS idx_user_permissions_permission ON user_permissions(permission_id);
CREATE INDEX IF NOT EXISTS idx_user_permissions_active ON user_permissions(is_active);

CREATE INDEX IF NOT EXISTS idx_auth_sessions_session_id ON auth_sessions(session_id);
CREATE INDEX IF NOT EXISTS idx_auth_sessions_user_id ON auth_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_auth_sessions_active ON auth_sessions(is_active);
CREATE INDEX IF NOT EXISTS idx_auth_sessions_expires ON auth_sessions(expires_at);
CREATE INDEX IF NOT EXISTS idx_auth_sessions_ip ON auth_sessions(ip_address);

CREATE INDEX IF NOT EXISTS idx_auth_events_user_id ON auth_events(user_id);
CREATE INDEX IF NOT EXISTS idx_auth_events_username ON auth_events(username);
CREATE INDEX IF NOT EXISTS idx_auth_events_type ON auth_events(event_type);
CREATE INDEX IF NOT EXISTS idx_auth_events_timestamp ON auth_events(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_auth_events_ip ON auth_events(ip_address);
CREATE INDEX IF NOT EXISTS idx_auth_events_suspicious ON auth_events(is_suspicious);

CREATE INDEX IF NOT EXISTS idx_password_history_user ON password_history(user_id);
CREATE INDEX IF NOT EXISTS idx_password_history_created ON password_history(created_at DESC);

-- Create triggers to automatically update updated_at columns
CREATE TRIGGER IF NOT EXISTS update_users_updated_at 
    AFTER UPDATE ON users FOR EACH ROW 
BEGIN 
    UPDATE users SET updated_at = datetime('now') WHERE id = NEW.id;
END;

CREATE TRIGGER IF NOT EXISTS update_user_groups_updated_at 
    AFTER UPDATE ON user_groups FOR EACH ROW 
BEGIN 
    UPDATE user_groups SET updated_at = datetime('now') WHERE id = NEW.id;
END;

CREATE TRIGGER IF NOT EXISTS update_auth_sessions_activity 
    AFTER UPDATE ON auth_sessions FOR EACH ROW 
    WHEN NEW.is_active = 1 AND OLD.last_activity != NEW.last_activity
BEGIN 
    UPDATE auth_sessions SET last_activity = datetime('now') WHERE id = NEW.id;
END;

-- Insert default permissions
INSERT OR IGNORE INTO permissions (name, description, category, resource, action) VALUES
-- System permissions
('admin', 'Full system administration access', 'system', '*', '*'),
('read', 'Read access to resources', 'system', '*', 'read'),
('write', 'Write access to resources', 'system', '*', 'write'),
('delete', 'Delete access to resources', 'system', '*', 'delete'),

-- User management permissions
('manage-users', 'Manage user accounts and permissions', 'users', 'users', '*'),
('view-users', 'View user accounts', 'users', 'users', 'read'),
('create-users', 'Create new user accounts', 'users', 'users', 'create'),
('edit-users', 'Edit user accounts', 'users', 'users', 'update'),
('delete-users', 'Delete user accounts', 'users', 'users', 'delete'),

-- Phone management permissions
('manage-phones', 'Full phone number management', 'phones', 'phone_numbers', '*'),
('view-phones', 'View phone numbers', 'phones', 'phone_numbers', 'read'),
('assign-phones', 'Assign phone numbers', 'phones', 'phone_numbers', 'assign'),
('release-phones', 'Release phone numbers', 'phones', 'phone_numbers', 'release'),
('import-phones', 'Import phone number data', 'phones', 'phone_numbers', 'import'),
('export-phones', 'Export phone number data', 'phones', 'phone_numbers', 'export'),

-- Range management permissions
('manage-ranges', 'Manage number ranges', 'ranges', 'number_ranges', '*'),
('view-ranges', 'View number ranges', 'ranges', 'number_ranges', 'read'),
('create-ranges', 'Create number ranges', 'ranges', 'number_ranges', 'create'),

-- Reporting permissions
('view-reports', 'View system reports', 'reports', 'reports', 'read'),
('export-reports', 'Export reports', 'reports', 'reports', 'export'),

-- Audit permissions
('view-audit', 'View audit logs', 'audit', 'audit_log', 'read'),
('export-audit', 'Export audit logs', 'audit', 'audit_log', 'export');

-- Insert default groups
INSERT OR IGNORE INTO user_groups (name, description, group_type) VALUES
('Administrators', 'Full system administrators', 'system'),
('Phone Managers', 'Phone number management staff', 'local'),
('Phone Users', 'Regular phone system users', 'local'),
('Viewers', 'Read-only access users', 'local'),
('IT Support', 'IT support staff', 'local');

-- Assign permissions to default groups
INSERT OR IGNORE INTO group_permissions (group_id, permission_id, granted_by) 
SELECT g.id, p.id, 'system'
FROM user_groups g, permissions p 
WHERE g.name = 'Administrators' AND p.name = 'admin';

INSERT OR IGNORE INTO group_permissions (group_id, permission_id, granted_by)
SELECT g.id, p.id, 'system'
FROM user_groups g, permissions p 
WHERE g.name = 'Phone Managers' AND p.name IN ('manage-phones', 'view-ranges', 'view-reports');

INSERT OR IGNORE INTO group_permissions (group_id, permission_id, granted_by)
SELECT g.id, p.id, 'system'
FROM user_groups g, permissions p 
WHERE g.name = 'Phone Users' AND p.name IN ('view-phones', 'view-ranges');

INSERT OR IGNORE INTO group_permissions (group_id, permission_id, granted_by)
SELECT g.id, p.id, 'system'
FROM user_groups g, permissions p 
WHERE g.name = 'Viewers' AND p.name IN ('read', 'view-phones', 'view-ranges', 'view-reports');

-- Create default admin user in the new users table
INSERT OR IGNORE INTO users (
    username, 
    email, 
    display_name, 
    auth_type, 
    password_hash, 
    is_active, 
    is_verified
) VALUES (
    'admin', 
    'admin@localhost', 
    'Administrator', 
    'local', 
    '$2a$10$rQKJz5Z5J5z5J5z5J5z5JOkK5z5J5z5J5z5J5z5J5z5J5z5J5z5JO', 
    1, 
    1
);

-- Assign admin user to Administrators group
INSERT OR IGNORE INTO user_group_memberships (user_id, group_id, assigned_by)
SELECT u.id, g.id, 'system'
FROM users u, user_groups g 
WHERE u.username = 'admin' AND g.name = 'Administrators';

-- Insert initial auth event
INSERT OR IGNORE INTO auth_events (
    username, 
    event_type, 
    auth_method, 
    success, 
    details
) VALUES (
    'system', 
    'login_success', 
    'local', 
    1, 
    '{"message": "Authentication system initialized", "version": "1.0.0"}'
);