-- UC Admin Tools Database Schema Extensions
-- This file extends the existing database schema to support UC Admin Tools functionality

-- UC Configuration Files table
-- Stores metadata about UC configuration files
CREATE TABLE IF NOT EXISTS uc_config_files (
  id TEXT PRIMARY KEY,
  filename TEXT NOT NULL UNIQUE,
  display_name TEXT NOT NULL,
  file_path TEXT NOT NULL,
  file_size INTEGER DEFAULT 0,
  file_hash TEXT,
  is_active BOOLEAN DEFAULT 0,
  version INTEGER DEFAULT 1,
  description TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  created_by TEXT,
  last_modified_by TEXT
);

-- UC Configuration History table
-- Stores historical versions of configuration changes
CREATE TABLE IF NOT EXISTS uc_config_history (
  id TEXT PRIMARY KEY,
  config_file_id TEXT NOT NULL,
  version INTEGER NOT NULL,
  config_data TEXT NOT NULL, -- JSON representation of the configuration
  change_summary TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  created_by TEXT,
  FOREIGN KEY (config_file_id) REFERENCES uc_config_files(id) ON DELETE CASCADE
);

-- UC Network Test Results table
-- Stores results from network diagnostic tests
CREATE TABLE IF NOT EXISTS uc_network_tests (
  id TEXT PRIMARY KEY,
  test_type TEXT NOT NULL, -- 'port_check', 'dns_lookup', 'public_ip'
  target_host TEXT,
  target_port INTEGER,
  dns_record_type TEXT,
  dns_server TEXT,
  test_result TEXT NOT NULL, -- JSON representation of the test result
  status TEXT NOT NULL, -- 'success', 'failed', 'timeout', 'error'
  response_time INTEGER DEFAULT 0, -- in milliseconds
  error_message TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  created_by TEXT
);

-- UC System Settings table
-- Stores UC-specific system settings and preferences
CREATE TABLE IF NOT EXISTS uc_system_settings (
  id TEXT PRIMARY KEY,
  setting_key TEXT NOT NULL UNIQUE,
  setting_value TEXT NOT NULL,
  setting_type TEXT NOT NULL DEFAULT 'string', -- 'string', 'number', 'boolean', 'json'
  description TEXT,
  is_encrypted BOOLEAN DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_by TEXT
);

-- UC Configuration Templates table
-- Stores predefined configuration templates
CREATE TABLE IF NOT EXISTS uc_config_templates (
  id TEXT PRIMARY KEY,
  template_name TEXT NOT NULL UNIQUE,
  template_description TEXT,
  template_data TEXT NOT NULL, -- JSON representation of the template
  is_default BOOLEAN DEFAULT 0,
  category TEXT DEFAULT 'custom', -- 'default', 'custom', 'imported'
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  created_by TEXT
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_uc_config_files_filename ON uc_config_files(filename);
CREATE INDEX IF NOT EXISTS idx_uc_config_files_active ON uc_config_files(is_active);
CREATE INDEX IF NOT EXISTS idx_uc_config_history_file_id ON uc_config_history(config_file_id);
CREATE INDEX IF NOT EXISTS idx_uc_config_history_version ON uc_config_history(config_file_id, version);
CREATE INDEX IF NOT EXISTS idx_uc_network_tests_type ON uc_network_tests(test_type);
CREATE INDEX IF NOT EXISTS idx_uc_network_tests_created ON uc_network_tests(created_at);
CREATE INDEX IF NOT EXISTS idx_uc_system_settings_key ON uc_system_settings(setting_key);
CREATE INDEX IF NOT EXISTS idx_uc_config_templates_name ON uc_config_templates(template_name);

-- Insert default UC system settings
INSERT OR IGNORE INTO uc_system_settings (id, setting_key, setting_value, setting_type, description) VALUES
  ('uc_default_sip_port', 'default_sip_port', '5061', 'number', 'Default SIP port for UC services'),
  ('uc_default_https_port', 'default_https_port', '443', 'number', 'Default HTTPS port for web conferences'),
  ('uc_config_backup_enabled', 'config_backup_enabled', 'true', 'boolean', 'Enable automatic configuration backups'),
  ('uc_network_test_timeout', 'network_test_timeout', '5000', 'number', 'Network test timeout in milliseconds'),
  ('uc_max_config_history', 'max_config_history', '50', 'number', 'Maximum number of configuration history entries to keep'),
  ('uc_dns_servers', 'default_dns_servers', '["8.8.8.8", "8.8.4.4", "1.1.1.1"]', 'json', 'Default DNS servers for lookups');

-- Insert default configuration template
INSERT OR IGNORE INTO uc_config_templates (id, template_name, template_description, template_data, is_default, category) VALUES
  ('default_uc_template', 'Default UC Configuration', 'Standard UC configuration template with common settings', 
   '{"SIPDomains":["contoso.com"],"LyncPools":["pool1.contoso.com"],"DialInFQDNs":["dialin.contoso.com"],"MeetFQDNs":["meet.contoso.com"],"FrontEndList":["fe1.contoso.com","fe2.contoso.com"],"ExchangeServerList":["exchange1.contoso.com"],"DNSServers":["8.8.8.8","8.8.4.4"],"AccessEdge":"access.contoso.com","WebConfEdge":"webconf.contoso.com","AVEdge":"av.contoso.com","ProxyFQDN":"proxy.contoso.com","SIPPort":5061,"WebConfPort":443,"AVPort":443}',
   1, 'default');

-- Create triggers to automatically update timestamps
CREATE TRIGGER IF NOT EXISTS uc_config_files_updated_at
  AFTER UPDATE ON uc_config_files
  FOR EACH ROW
  BEGIN
    UPDATE uc_config_files SET updated_at = datetime('now') WHERE id = NEW.id;
  END;

CREATE TRIGGER IF NOT EXISTS uc_system_settings_updated_at
  AFTER UPDATE ON uc_system_settings
  FOR EACH ROW
  BEGIN
    UPDATE uc_system_settings SET updated_at = datetime('now') WHERE id = NEW.id;
  END;

CREATE TRIGGER IF NOT EXISTS uc_config_templates_updated_at
  AFTER UPDATE ON uc_config_templates
  FOR EACH ROW
  BEGIN
    UPDATE uc_config_templates SET updated_at = datetime('now') WHERE id = NEW.id;
  END;