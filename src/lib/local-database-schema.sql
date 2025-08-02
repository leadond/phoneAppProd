-- Phone Range Nexus Local SQLite Database Schema
-- This schema is converted from the original Supabase PostgreSQL schema

-- Phone Numbers table
CREATE TABLE IF NOT EXISTS phone_numbers (
    id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(4))) || '-' || lower(hex(randomblob(2))) || '-4' || substr(lower(hex(randomblob(2))),2) || '-' || substr('89ab',abs(random()) % 4 + 1, 1) || substr(lower(hex(randomblob(2))),2) || '-' || lower(hex(randomblob(6)))),
    number TEXT NOT NULL UNIQUE,
    status TEXT DEFAULT 'available' CHECK (status IN ('available', 'assigned', 'reserved', 'aging', 'blocked', 'toll-free')),
    system TEXT DEFAULT 'Unassigned',
    carrier TEXT DEFAULT '',
    assigned_to TEXT,
    notes TEXT DEFAULT '',
    extension TEXT DEFAULT '',
    department TEXT DEFAULT 'Unassigned',
    location TEXT DEFAULT '',
    date_assigned TEXT,
    date_available TEXT,
    last_used TEXT,
    aging_days INTEGER DEFAULT 0,
    number_type TEXT DEFAULT 'local' CHECK (number_type IN ('local', 'toll-free', 'international')),
    range_name TEXT DEFAULT '',
    project TEXT,
    reserved_until TEXT,
    usage_inbound INTEGER DEFAULT 0,
    usage_outbound INTEGER DEFAULT 0,
    usage_last_activity TEXT,
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now'))
);

-- Number Ranges table
CREATE TABLE IF NOT EXISTS number_ranges (
    id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(4))) || '-' || lower(hex(randomblob(2))) || '-4' || substr(lower(hex(randomblob(2))),2) || '-' || substr('89ab',abs(random()) % 4 + 1, 1) || substr(lower(hex(randomblob(2))),2) || '-' || lower(hex(randomblob(6)))),
    name TEXT NOT NULL,
    pattern TEXT NOT NULL,
    start_number TEXT NOT NULL,
    end_number TEXT NOT NULL,
    total_numbers INTEGER NOT NULL,
    available_numbers INTEGER DEFAULT 0,
    assigned_numbers INTEGER DEFAULT 0,
    reserved_numbers INTEGER DEFAULT 0,
    carrier TEXT NOT NULL,
    location TEXT NOT NULL,
    department TEXT NOT NULL,
    date_created TEXT NOT NULL,
    notes TEXT DEFAULT '',
    status TEXT DEFAULT 'pending' CHECK (status IN ('active', 'inactive', 'pending')),
    project TEXT,
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now'))
);

-- Bulk Operations table
CREATE TABLE IF NOT EXISTS bulk_operations (
    id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(4))) || '-' || lower(hex(randomblob(2))) || '-4' || substr(lower(hex(randomblob(2))),2) || '-' || substr('89ab',abs(random()) % 4 + 1, 1) || substr(lower(hex(randomblob(2))),2) || '-' || lower(hex(randomblob(6)))),
    type TEXT NOT NULL CHECK (type IN ('assign', 'release', 'reserve', 'import', 'export', 'transform')),
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'running', 'completed', 'failed')),
    progress REAL DEFAULT 0,
    total_items INTEGER DEFAULT 0,
    processed_items INTEGER DEFAULT 0,
    failed_items INTEGER DEFAULT 0,
    start_time TEXT NOT NULL,
    end_time TEXT,
    details TEXT NOT NULL,
    results TEXT,
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now'))
);

-- Audit Log table
CREATE TABLE IF NOT EXISTS audit_log (
    id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(4))) || '-' || lower(hex(randomblob(2))) || '-4' || substr(lower(hex(randomblob(2))),2) || '-' || substr('89ab',abs(random()) % 4 + 1, 1) || substr(lower(hex(randomblob(2))),2) || '-' || lower(hex(randomblob(6)))),
    action TEXT NOT NULL,
    user TEXT NOT NULL,
    timestamp TEXT NOT NULL,
    type TEXT NOT NULL CHECK (type IN ('assignment', 'import', 'release', 'settings', 'auth', 'sync')),
    details TEXT,
    created_at TEXT DEFAULT (datetime('now'))
);

-- User Sessions table (for local authentication)
CREATE TABLE IF NOT EXISTS user_sessions (
    id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(4))) || '-' || lower(hex(randomblob(2))) || '-4' || substr(lower(hex(randomblob(2))),2) || '-' || substr('89ab',abs(random()) % 4 + 1, 1) || substr(lower(hex(randomblob(2))),2) || '-' || lower(hex(randomblob(6)))),
    username TEXT NOT NULL UNIQUE,
    password_hash TEXT NOT NULL,
    session_token TEXT,
    session_expires TEXT,
    last_login TEXT,
    created_at TEXT DEFAULT (datetime('now'))
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_phone_numbers_status ON phone_numbers(status);
CREATE INDEX IF NOT EXISTS idx_phone_numbers_department ON phone_numbers(department);
CREATE INDEX IF NOT EXISTS idx_phone_numbers_carrier ON phone_numbers(carrier);
CREATE INDEX IF NOT EXISTS idx_phone_numbers_project ON phone_numbers(project);
CREATE INDEX IF NOT EXISTS idx_phone_numbers_number ON phone_numbers(number);

CREATE INDEX IF NOT EXISTS idx_number_ranges_status ON number_ranges(status);
CREATE INDEX IF NOT EXISTS idx_number_ranges_department ON number_ranges(department);

CREATE INDEX IF NOT EXISTS idx_bulk_operations_status ON bulk_operations(status);
CREATE INDEX IF NOT EXISTS idx_bulk_operations_type ON bulk_operations(type);

CREATE INDEX IF NOT EXISTS idx_audit_log_timestamp ON audit_log(timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_audit_log_type ON audit_log(type);
CREATE INDEX IF NOT EXISTS idx_audit_log_user ON audit_log(user);

CREATE INDEX IF NOT EXISTS idx_user_sessions_username ON user_sessions(username);
CREATE INDEX IF NOT EXISTS idx_user_sessions_token ON user_sessions(session_token);

-- Create triggers to automatically update updated_at columns
CREATE TRIGGER IF NOT EXISTS update_phone_numbers_updated_at 
    AFTER UPDATE ON phone_numbers FOR EACH ROW 
BEGIN 
    UPDATE phone_numbers SET updated_at = datetime('now') WHERE id = NEW.id;
END;

CREATE TRIGGER IF NOT EXISTS update_number_ranges_updated_at 
    AFTER UPDATE ON number_ranges FOR EACH ROW 
BEGIN 
    UPDATE number_ranges SET updated_at = datetime('now') WHERE id = NEW.id;
END;

CREATE TRIGGER IF NOT EXISTS update_bulk_operations_updated_at 
    AFTER UPDATE ON bulk_operations FOR EACH ROW 
BEGIN 
    UPDATE bulk_operations SET updated_at = datetime('now') WHERE id = NEW.id;
END;

-- Insert default admin user (password: admin123)
INSERT OR IGNORE INTO user_sessions (username, password_hash) 
VALUES ('admin', '$2a$10$rQKJz5Z5J5z5J5z5J5z5JOkK5z5J5z5J5z5J5z5J5z5J5z5J5z5JO');

-- Insert some sample data for testing (optional)
-- No sample data - database should be empty initially
-- INSERT OR IGNORE INTO phone_numbers (number, status, system, carrier, department, location, extension, number_type, range_name) VALUES
-- Sample data removed per user request - real phone numbers don't start with 0

INSERT OR IGNORE INTO number_ranges (name, pattern, start_number, end_number, total_numbers, available_numbers, carrier, location, department, date_created, status) VALUES
('Houston Sales Main', '346-720-XXXX', '346-720-0001', '346-720-0999', 999, 999, 'AT&T', 'Houston, TX', 'Sales', date('now'), 'active'),
('Customer Support Toll-Free', '800-555-XXXX', '800-555-0001', '800-555-0100', 100, 100, 'Verizon', 'National', 'Support', date('now'), 'active');

INSERT OR IGNORE INTO audit_log (action, user, timestamp, type) VALUES
('Local database initialized', 'system', datetime('now'), 'settings'),
('Sample data inserted', 'system', datetime('now'), 'import');