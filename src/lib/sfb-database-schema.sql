-- Skype for Business Database Schema Extensions
-- This file extends the existing UC database schema to support SfB user management functionality

-- SfB Users table
-- Stores cached SfB user data from offline files or online database
CREATE TABLE IF NOT EXISTS sfb_users (
  id TEXT PRIMARY KEY,
  sip_address TEXT NOT NULL UNIQUE, -- Primary SIP address (e.g., user@domain.com)
  display_name TEXT NOT NULL,
  first_name TEXT,
  last_name TEXT,
  user_principal_name TEXT, -- UPN for AD integration
  line_uri TEXT, -- Tel URI (e.g., tel:+15551234567)
  phone_number TEXT, -- Extracted phone number from line_uri
  enterprise_voice_enabled BOOLEAN DEFAULT 0,
  hosted_voicemail_enabled BOOLEAN DEFAULT 0,
  department TEXT,
  title TEXT,
  office TEXT,
  company TEXT,
  manager TEXT,
  enabled BOOLEAN DEFAULT 1,
  registrar_pool TEXT, -- Lync/SfB pool where user is homed
  voice_policy TEXT,
  dial_plan TEXT,
  location_policy TEXT,
  conferencing_policy TEXT,
  external_access_policy TEXT,
  mobility_policy TEXT,
  client_policy TEXT,
  pin_policy TEXT,
  archiving_policy TEXT,
  exchange_archiving_policy TEXT,
  retention_policy TEXT,
  call_via_work_policy TEXT,
  client_version_policy TEXT,
  hosted_voice_mail_enabled BOOLEAN DEFAULT 0,
  private_line TEXT, -- Private line number if assigned
  data_source TEXT NOT NULL DEFAULT 'offline', -- 'offline' or 'online'
  last_sync_time TEXT NOT NULL DEFAULT (datetime('now')),
  file_source TEXT, -- Name of source file for offline data
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- SfB Phone Correlations table
-- Maps SfB line URIs to phone numbers in the phone-range-nexus database
CREATE TABLE IF NOT EXISTS sfb_phone_correlations (
  id TEXT PRIMARY KEY,
  phone_number_id TEXT, -- FK to phone_numbers.id (nullable for unmatched SfB users)
  phone_number TEXT NOT NULL, -- The actual phone number
  sfb_user_id TEXT NOT NULL, -- FK to sfb_users.id
  line_uri TEXT NOT NULL, -- The line URI from SfB
  correlation_type TEXT NOT NULL DEFAULT 'automatic', -- 'automatic', 'manual', 'verified'
  confidence_score REAL DEFAULT 1.0, -- Confidence in the correlation (0.0-1.0)
  correlation_method TEXT, -- How the correlation was established
  notes TEXT,
  verified_by TEXT, -- User who verified the correlation
  verified_at TEXT, -- When the correlation was verified
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (phone_number_id) REFERENCES phone_numbers(id) ON DELETE SET NULL,
  FOREIGN KEY (sfb_user_id) REFERENCES sfb_users(id) ON DELETE CASCADE
);

-- SfB File Monitor table
-- Tracks monitored SfbEnabledObjects files and their processing status
CREATE TABLE IF NOT EXISTS sfb_file_monitor (
  id TEXT PRIMARY KEY,
  file_path TEXT NOT NULL UNIQUE, -- Full path to the file
  file_name TEXT NOT NULL, -- Just the filename
  file_size INTEGER DEFAULT 0,
  file_hash TEXT, -- Hash for change detection
  last_modified TEXT NOT NULL, -- File modification timestamp
  processing_status TEXT NOT NULL DEFAULT 'pending', -- 'pending', 'processing', 'completed', 'failed'
  processing_started_at TEXT,
  processing_completed_at TEXT,
  processing_duration INTEGER DEFAULT 0, -- Processing time in milliseconds
  records_processed INTEGER DEFAULT 0,
  records_inserted INTEGER DEFAULT 0,
  records_updated INTEGER DEFAULT 0,
  records_failed INTEGER DEFAULT 0,
  error_message TEXT,
  error_details TEXT, -- JSON with detailed error information
  is_latest BOOLEAN DEFAULT 0, -- Mark the most recent file
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- SfB Sync History table
-- Tracks synchronization operations between offline files and online database
CREATE TABLE IF NOT EXISTS sfb_sync_history (
  id TEXT PRIMARY KEY,
  sync_type TEXT NOT NULL, -- 'file_to_db', 'db_to_cache', 'correlation_update'
  sync_source TEXT NOT NULL, -- Source of the sync (file path, API endpoint, etc.)
  sync_target TEXT NOT NULL, -- Target of the sync
  sync_status TEXT NOT NULL DEFAULT 'started', -- 'started', 'completed', 'failed', 'partial'
  total_records INTEGER DEFAULT 0,
  processed_records INTEGER DEFAULT 0,
  successful_records INTEGER DEFAULT 0,
  failed_records INTEGER DEFAULT 0,
  skipped_records INTEGER DEFAULT 0,
  sync_duration INTEGER DEFAULT 0, -- Duration in milliseconds
  sync_summary TEXT, -- JSON with detailed sync results
  error_message TEXT,
  triggered_by TEXT, -- What triggered this sync (file_watcher, manual, scheduled)
  started_at TEXT NOT NULL DEFAULT (datetime('now')),
  completed_at TEXT,
  created_by TEXT DEFAULT 'system'
);

-- SfB Search Cache table
-- Caches search results for performance optimization
CREATE TABLE IF NOT EXISTS sfb_search_cache (
  id TEXT PRIMARY KEY,
  search_query TEXT NOT NULL,
  search_type TEXT NOT NULL, -- 'user', 'phone', 'sip', 'correlation'
  search_params TEXT, -- JSON with search parameters
  result_count INTEGER DEFAULT 0,
  result_data TEXT, -- JSON with cached results
  data_source TEXT NOT NULL, -- 'offline', 'online', 'mixed'
  cache_expires_at TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- SfB Online Database Config table
-- Stores configuration for online SfB database connections
CREATE TABLE IF NOT EXISTS sfb_online_config (
  id TEXT PRIMARY KEY,
  config_name TEXT NOT NULL UNIQUE,
  server_address TEXT NOT NULL,
  database_name TEXT NOT NULL,
  connection_type TEXT NOT NULL DEFAULT 'sql_server', -- 'sql_server', 'oracle', 'mysql'
  authentication_method TEXT NOT NULL DEFAULT 'windows', -- 'windows', 'sql', 'certificate'
  connection_string TEXT, -- Encrypted connection string
  test_query TEXT DEFAULT 'SELECT COUNT(*) FROM rtc.dbo.Resource',
  is_active BOOLEAN DEFAULT 0,
  last_test_result TEXT, -- Result of last connection test
  last_test_time TEXT,
  connection_timeout INTEGER DEFAULT 30,
  query_timeout INTEGER DEFAULT 60,
  max_records_per_query INTEGER DEFAULT 1000,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  created_by TEXT
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_sfb_users_sip_address ON sfb_users(sip_address);
CREATE INDEX IF NOT EXISTS idx_sfb_users_line_uri ON sfb_users(line_uri);
CREATE INDEX IF NOT EXISTS idx_sfb_users_phone_number ON sfb_users(phone_number);
CREATE INDEX IF NOT EXISTS idx_sfb_users_display_name ON sfb_users(display_name);
CREATE INDEX IF NOT EXISTS idx_sfb_users_data_source ON sfb_users(data_source);
CREATE INDEX IF NOT EXISTS idx_sfb_users_enabled ON sfb_users(enabled);
CREATE INDEX IF NOT EXISTS idx_sfb_users_last_sync ON sfb_users(last_sync_time);

CREATE INDEX IF NOT EXISTS idx_sfb_correlations_phone_number ON sfb_phone_correlations(phone_number);
CREATE INDEX IF NOT EXISTS idx_sfb_correlations_sfb_user ON sfb_phone_correlations(sfb_user_id);
CREATE INDEX IF NOT EXISTS idx_sfb_correlations_type ON sfb_phone_correlations(correlation_type);
CREATE INDEX IF NOT EXISTS idx_sfb_correlations_confidence ON sfb_phone_correlations(confidence_score);

CREATE INDEX IF NOT EXISTS idx_sfb_file_monitor_path ON sfb_file_monitor(file_path);
CREATE INDEX IF NOT EXISTS idx_sfb_file_monitor_status ON sfb_file_monitor(processing_status);
CREATE INDEX IF NOT EXISTS idx_sfb_file_monitor_latest ON sfb_file_monitor(is_latest);
CREATE INDEX IF NOT EXISTS idx_sfb_file_monitor_modified ON sfb_file_monitor(last_modified);

CREATE INDEX IF NOT EXISTS idx_sfb_sync_history_type ON sfb_sync_history(sync_type);
CREATE INDEX IF NOT EXISTS idx_sfb_sync_history_status ON sfb_sync_history(sync_status);
CREATE INDEX IF NOT EXISTS idx_sfb_sync_history_started ON sfb_sync_history(started_at);

CREATE INDEX IF NOT EXISTS idx_sfb_search_cache_query ON sfb_search_cache(search_query);
CREATE INDEX IF NOT EXISTS idx_sfb_search_cache_type ON sfb_search_cache(search_type);
CREATE INDEX IF NOT EXISTS idx_sfb_search_cache_expires ON sfb_search_cache(cache_expires_at);

CREATE INDEX IF NOT EXISTS idx_sfb_online_config_active ON sfb_online_config(is_active);

-- Insert default SfB system settings
INSERT OR IGNORE INTO uc_system_settings (id, setting_key, setting_value, setting_type, description) VALUES
  ('sfb_file_monitor_enabled', 'sfb_file_monitor_enabled', 'true', 'boolean', 'Enable SfB file monitoring service'),
  ('sfb_file_monitor_path', 'sfb_file_monitor_path', 'c:\sfbenabledobjects', 'string', 'Path to monitor for SfbEnabledObjects files'),
  ('sfb_file_monitor_interval', 'sfb_file_monitor_interval', '900000', 'number', 'File monitor check interval in milliseconds (15 minutes)'),
  ('sfb_auto_correlation_enabled', 'sfb_auto_correlation_enabled', 'true', 'boolean', 'Enable automatic phone number correlation'),
  ('sfb_correlation_confidence_threshold', 'sfb_correlation_confidence_threshold', '0.8', 'number', 'Minimum confidence score for automatic correlations'),
  ('sfb_cache_expiry_hours', 'sfb_cache_expiry_hours', '24', 'number', 'Search cache expiry time in hours'),
  ('sfb_max_search_results', 'sfb_max_search_results', '500', 'number', 'Maximum number of search results to return'),
  ('sfb_online_query_timeout', 'sfb_online_query_timeout', '30000', 'number', 'Online database query timeout in milliseconds'),
  ('sfb_sync_batch_size', 'sfb_sync_batch_size', '100', 'number', 'Number of records to process in each sync batch');

-- Create triggers to automatically update timestamps
CREATE TRIGGER IF NOT EXISTS sfb_users_updated_at
  AFTER UPDATE ON sfb_users
  FOR EACH ROW
  BEGIN
    UPDATE sfb_users SET updated_at = datetime('now') WHERE id = NEW.id;
  END;

CREATE TRIGGER IF NOT EXISTS sfb_phone_correlations_updated_at
  AFTER UPDATE ON sfb_phone_correlations
  FOR EACH ROW
  BEGIN
    UPDATE sfb_phone_correlations SET updated_at = datetime('now') WHERE id = NEW.id;
  END;

CREATE TRIGGER IF NOT EXISTS sfb_file_monitor_updated_at
  AFTER UPDATE ON sfb_file_monitor
  FOR EACH ROW
  BEGIN
    UPDATE sfb_file_monitor SET updated_at = datetime('now') WHERE id = NEW.id;
  END;

CREATE TRIGGER IF NOT EXISTS sfb_online_config_updated_at
  AFTER UPDATE ON sfb_online_config
  FOR EACH ROW
  BEGIN
    UPDATE sfb_online_config SET updated_at = datetime('now') WHERE id = NEW.id;
  END;

-- Trigger to mark only one file as latest when a new file is processed
CREATE TRIGGER IF NOT EXISTS sfb_file_monitor_latest_trigger
  AFTER UPDATE OF is_latest ON sfb_file_monitor
  FOR EACH ROW WHEN NEW.is_latest = 1 AND OLD.is_latest = 0
  BEGIN
    UPDATE sfb_file_monitor SET is_latest = 0 WHERE id != NEW.id;
  END;

-- Trigger to automatically create correlations when SfB users are inserted/updated
CREATE TRIGGER IF NOT EXISTS sfb_auto_correlation_trigger
  AFTER INSERT ON sfb_users
  FOR EACH ROW WHEN NEW.phone_number IS NOT NULL
  BEGIN
    INSERT OR IGNORE INTO sfb_phone_correlations (
      id, phone_number, sfb_user_id, line_uri, correlation_type, 
      correlation_method, confidence_score, created_at, updated_at
    )
    SELECT 
      lower(hex(randomblob(16))),
      NEW.phone_number,
      NEW.id,
      NEW.line_uri,
      'automatic',
      'trigger_on_insert',
      1.0,
      datetime('now'),
      datetime('now')
    WHERE NOT EXISTS (
      SELECT 1 FROM sfb_phone_correlations 
      WHERE sfb_user_id = NEW.id AND phone_number = NEW.phone_number
    );
  END;

-- Trigger to clean up expired search cache entries
CREATE TRIGGER IF NOT EXISTS sfb_search_cache_cleanup
  AFTER INSERT ON sfb_search_cache
  FOR EACH ROW
  BEGIN
    DELETE FROM sfb_search_cache 
    WHERE cache_expires_at < datetime('now') 
    AND id != NEW.id;
  END;