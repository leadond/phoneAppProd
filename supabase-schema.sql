-- Phone Range Nexus Database Schema for Supabase
-- Run this SQL in your Supabase SQL editor to create the required tables

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Phone Numbers table
CREATE TABLE phone_numbers (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    number VARCHAR(20) NOT NULL UNIQUE,
    status VARCHAR(20) DEFAULT 'available' CHECK (status IN ('available', 'assigned', 'reserved', 'aging', 'blocked', 'toll-free')),
    system VARCHAR(100) DEFAULT 'Unassigned',
    carrier VARCHAR(100) DEFAULT '',
    assigned_to VARCHAR(255),
    notes TEXT DEFAULT '',
    extension VARCHAR(20) DEFAULT '',
    department VARCHAR(100) DEFAULT 'Unassigned',
    location VARCHAR(255) DEFAULT '',
    date_assigned DATE,
    date_available DATE,
    last_used TIMESTAMP,
    aging_days INTEGER DEFAULT 0,
    number_type VARCHAR(20) DEFAULT 'local' CHECK (number_type IN ('local', 'toll-free', 'international')),
    range VARCHAR(50) DEFAULT '',
    project VARCHAR(255),
    reserved_until TIMESTAMP,
    usage_inbound INTEGER DEFAULT 0,
    usage_outbound INTEGER DEFAULT 0,
    usage_last_activity TIMESTAMP,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Number Ranges table
CREATE TABLE number_ranges (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    pattern VARCHAR(50) NOT NULL,
    start_number VARCHAR(20) NOT NULL,
    end_number VARCHAR(20) NOT NULL,
    total_numbers INTEGER NOT NULL,
    available_numbers INTEGER DEFAULT 0,
    assigned_numbers INTEGER DEFAULT 0,
    reserved_numbers INTEGER DEFAULT 0,
    carrier VARCHAR(100) NOT NULL,
    location VARCHAR(255) NOT NULL,
    department VARCHAR(100) NOT NULL,
    date_created DATE NOT NULL,
    notes TEXT DEFAULT '',
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('active', 'inactive', 'pending')),
    project VARCHAR(255),
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Bulk Operations table
CREATE TABLE bulk_operations (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    type VARCHAR(20) NOT NULL CHECK (type IN ('assign', 'release', 'reserve', 'import', 'export', 'transform')),
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'running', 'completed', 'failed')),
    progress DECIMAL(5,2) DEFAULT 0,
    total_items INTEGER DEFAULT 0,
    processed_items INTEGER DEFAULT 0,
    failed_items INTEGER DEFAULT 0,
    start_time TIMESTAMP NOT NULL,
    end_time TIMESTAMP,
    details TEXT NOT NULL,
    results JSONB,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Audit Log table
CREATE TABLE audit_log (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    action TEXT NOT NULL,
    user VARCHAR(255) NOT NULL,
    timestamp TIMESTAMP NOT NULL,
    type VARCHAR(20) NOT NULL CHECK (type IN ('assignment', 'import', 'release', 'settings', 'auth', 'sync')),
    details JSONB,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX idx_phone_numbers_status ON phone_numbers(status);
CREATE INDEX idx_phone_numbers_department ON phone_numbers(department);
CREATE INDEX idx_phone_numbers_carrier ON phone_numbers(carrier);
CREATE INDEX idx_phone_numbers_project ON phone_numbers(project);
CREATE INDEX idx_phone_numbers_number ON phone_numbers(number);

CREATE INDEX idx_number_ranges_status ON number_ranges(status);
CREATE INDEX idx_number_ranges_department ON number_ranges(department);

CREATE INDEX idx_bulk_operations_status ON bulk_operations(status);
CREATE INDEX idx_bulk_operations_type ON bulk_operations(type);

CREATE INDEX idx_audit_log_timestamp ON audit_log(timestamp DESC);
CREATE INDEX idx_audit_log_type ON audit_log(type);
CREATE INDEX idx_audit_log_user ON audit_log(user);

-- Create updated_at trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create triggers to automatically update updated_at
CREATE TRIGGER update_phone_numbers_updated_at BEFORE UPDATE ON phone_numbers FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_number_ranges_updated_at BEFORE UPDATE ON number_ranges FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_bulk_operations_updated_at BEFORE UPDATE ON bulk_operations FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Row Level Security (RLS) policies
ALTER TABLE phone_numbers ENABLE ROW LEVEL SECURITY;
ALTER TABLE number_ranges ENABLE ROW LEVEL SECURITY;
ALTER TABLE bulk_operations ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_log ENABLE ROW LEVEL SECURITY;

-- Create policies (adjust based on your authentication needs)
-- For now, allowing all operations for authenticated users
CREATE POLICY "Allow all operations for authenticated users" ON phone_numbers FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "Allow all operations for authenticated users" ON number_ranges FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "Allow all operations for authenticated users" ON bulk_operations FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "Allow all operations for authenticated users" ON audit_log FOR ALL USING (auth.role() = 'authenticated');

-- Insert some sample data for testing (optional)
-- Uncomment the following lines if you want sample data

/*
-- No sample data - database should be empty initially
-- INSERT INTO phone_numbers (number, status, system, carrier, department, location, extension, number_type, range) VALUES
-- Sample data removed per user request - real phone numbers don't start with 0

INSERT INTO number_ranges (name, pattern, start_number, end_number, total_numbers, available_numbers, carrier, location, department, date_created, status) VALUES
('Houston Sales Main', '346-720-XXXX', '346-720-0001', '346-720-0999', 999, 999, 'AT&T', 'Houston, TX', 'Sales', CURRENT_DATE, 'active'),
('Customer Support Toll-Free', '800-555-XXXX', '800-555-0001', '800-555-0100', 100, 100, 'Verizon', 'National', 'Support', CURRENT_DATE, 'active');

INSERT INTO audit_log (action, user, timestamp, type) VALUES
('Database schema created', 'system', NOW(), 'settings'),
('Sample data inserted', 'system', NOW(), 'import');
*/