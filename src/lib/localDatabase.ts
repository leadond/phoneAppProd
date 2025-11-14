import Database from 'better-sqlite3';
import { readFileSync } from 'fs';
import { join } from 'path';
import { v4 as uuidv4 } from 'uuid';

// Local database client for SQLite
export class LocalDatabase {
  private db: Database.Database;
  private static instance: LocalDatabase;

  constructor() {
    // Create database file in the root directory
    this.db = new Database('phone-range-nexus.db');
    this.initializeDatabase();
  }

  // Singleton pattern to ensure only one database connection
  public static getInstance(): LocalDatabase {
    if (!LocalDatabase.instance) {
      LocalDatabase.instance = new LocalDatabase();
    }
    return LocalDatabase.instance;
  }

  private initializeDatabase(): void {
    try {
      // Read and execute the main schema SQL file
      const schemaPath = join(process.cwd(), 'src', 'lib', 'local-database-schema.sql');
      const schema = readFileSync(schemaPath, 'utf8');
      
      // Execute the schema creation scripts
      this.db.exec(schema);
      
      // Read and execute the UC Admin Tools schema extensions
      try {
        const ucSchemaPath = join(process.cwd(), 'src', 'lib', 'uc-database-schema.sql');
        const ucSchema = readFileSync(ucSchemaPath, 'utf8');
        this.db.exec(ucSchema);
        console.log('UC Admin Tools database schema loaded successfully');
      } catch (ucError) {
        console.warn('UC Admin Tools schema not found, skipping UC database extensions');
      }
      
      // Read and execute the Skype for Business schema extensions
      try {
        const sfbSchemaPath = join(process.cwd(), 'src', 'lib', 'sfb-database-schema.sql');
        const sfbSchema = readFileSync(sfbSchemaPath, 'utf8');
        this.db.exec(sfbSchema);
        console.log('Skype for Business database schema loaded successfully');
      } catch (sfbError) {
        console.warn('Skype for Business schema not found, skipping SfB database extensions');
      }
      
      console.log('Local database initialized successfully');
    } catch (error) {
      console.error('Failed to initialize database:', error);
      throw error;
    }
  }

  // Generic query methods
  public prepare(sql: string): Database.Statement {
    return this.db.prepare(sql);
  }

  public exec(sql: string): Database.Database {
    return this.db.exec(sql);
  }

  public close(): void {
    this.db.close();
  }

  // Phone Numbers operations
  public getAllPhoneNumbers(): any[] {
    const stmt = this.db.prepare(`
      SELECT * FROM phone_numbers 
      ORDER BY created_at DESC
    `);
    return stmt.all();
  }

  public getPhoneNumberById(id: string): any | null {
    const stmt = this.db.prepare('SELECT * FROM phone_numbers WHERE id = ?');
    return stmt.get(id) || null;
  }

  public insertPhoneNumber(phoneNumber: any): any {
    const id = uuidv4();
    const now = new Date().toISOString();
    
    const stmt = this.db.prepare(`
      INSERT INTO phone_numbers (
        id, number, status, system, carrier, assigned_to, notes, extension,
        department, location, date_assigned, date_available, last_used, aging_days,
        number_type, range_name, project, reserved_until, usage_inbound, usage_outbound,
        usage_last_activity, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const result = stmt.run(
      id,
      phoneNumber.number,
      phoneNumber.status || 'available',
      phoneNumber.system || 'Unassigned',
      phoneNumber.carrier || '',
      phoneNumber.assigned_to || null,
      phoneNumber.notes || '',
      phoneNumber.extension || '',
      phoneNumber.department || 'Unassigned',
      phoneNumber.location || '',
      phoneNumber.date_assigned || null,
      phoneNumber.date_available || null,
      phoneNumber.last_used || null,
      phoneNumber.aging_days || 0,
      phoneNumber.number_type || 'local',
      phoneNumber.range_name || '',
      phoneNumber.project || null,
      phoneNumber.reserved_until || null,
      phoneNumber.usage_inbound || 0,
      phoneNumber.usage_outbound || 0,
      phoneNumber.usage_last_activity || null,
      now,
      now
    );

    return this.getPhoneNumberById(id);
  }

  public updatePhoneNumber(id: string, updates: any): any | null {
    const now = new Date().toISOString();
    
    // Build dynamic update query
    const updateFields: string[] = [];
    const values: any[] = [];
    
    Object.keys(updates).forEach(key => {
      if (updates[key] !== undefined && key !== 'id') {
        updateFields.push(`${key} = ?`);
        values.push(updates[key]);
      }
    });
    
    if (updateFields.length === 0) {
      return this.getPhoneNumberById(id);
    }
    
    updateFields.push('updated_at = ?');
    values.push(now, id);
    
    const stmt = this.db.prepare(`
      UPDATE phone_numbers 
      SET ${updateFields.join(', ')} 
      WHERE id = ?
    `);
    
    stmt.run(...values);
    return this.getPhoneNumberById(id);
  }

  public deletePhoneNumber(id: string): boolean {
    const stmt = this.db.prepare('DELETE FROM phone_numbers WHERE id = ?');
    const result = stmt.run(id);
    return result.changes > 0;
  }

  public bulkInsertPhoneNumbers(phoneNumbers: any[]): { success: number; failed: number } {
    const stmt = this.db.prepare(`
      INSERT INTO phone_numbers (
        id, number, status, system, carrier, assigned_to, notes, extension,
        department, location, date_assigned, date_available, last_used, aging_days,
        number_type, range_name, project, reserved_until, usage_inbound, usage_outbound,
        usage_last_activity, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    let success = 0;
    let failed = 0;
    const now = new Date().toISOString();

    const transaction = this.db.transaction((numbers: any[]) => {
      for (const phoneNumber of numbers) {
        try {
          const id = uuidv4();
          stmt.run(
            id,
            phoneNumber.number,
            phoneNumber.status || 'available',
            phoneNumber.system || 'Unassigned',
            phoneNumber.carrier || '',
            phoneNumber.assigned_to || null,
            phoneNumber.notes || '',
            phoneNumber.extension || '',
            phoneNumber.department || 'Unassigned',
            phoneNumber.location || '',
            phoneNumber.date_assigned || null,
            phoneNumber.date_available || null,
            phoneNumber.last_used || null,
            phoneNumber.aging_days || 0,
            phoneNumber.number_type || 'local',
            phoneNumber.range_name || '',
            phoneNumber.project || null,
            phoneNumber.reserved_until || null,
            phoneNumber.usage_inbound || 0,
            phoneNumber.usage_outbound || 0,
            phoneNumber.usage_last_activity || null,
            now,
            now
          );
          success++;
        } catch (error) {
          console.error('Failed to insert phone number:', error);
          failed++;
        }
      }
    });

    transaction(phoneNumbers);
    return { success, failed };
  }

  // Number Ranges operations
  public getAllNumberRanges(): any[] {
    const stmt = this.db.prepare(`
      SELECT * FROM number_ranges 
      ORDER BY created_at DESC
    `);
    return stmt.all();
  }

  public insertNumberRange(range: any): any {
    const id = uuidv4();
    const now = new Date().toISOString();
    
    const stmt = this.db.prepare(`
      INSERT INTO number_ranges (
        id, name, pattern, start_number, end_number, total_numbers, available_numbers,
        assigned_numbers, reserved_numbers, carrier, location, department, date_created,
        notes, status, project, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    stmt.run(
      id,
      range.name,
      range.pattern,
      range.start_number,
      range.end_number,
      range.total_numbers,
      range.available_numbers || 0,
      range.assigned_numbers || 0,
      range.reserved_numbers || 0,
      range.carrier,
      range.location,
      range.department,
      range.date_created,
      range.notes || '',
      range.status || 'pending',
      range.project || null,
      now,
      now
    );

    const getStmt = this.db.prepare('SELECT * FROM number_ranges WHERE id = ?');
    return getStmt.get(id);
  }

  // Bulk Operations operations
  public getAllBulkOperations(): any[] {
    const stmt = this.db.prepare(`
      SELECT * FROM bulk_operations 
      ORDER BY created_at DESC
    `);
    return stmt.all();
  }

  public insertBulkOperation(operation: any): any {
    const id = uuidv4();
    const now = new Date().toISOString();
    
    const stmt = this.db.prepare(`
      INSERT INTO bulk_operations (
        id, type, status, progress, total_items, processed_items, failed_items,
        start_time, end_time, details, results, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    stmt.run(
      id,
      operation.type,
      operation.status || 'pending',
      operation.progress || 0,
      operation.total_items || 0,
      operation.processed_items || 0,
      operation.failed_items || 0,
      operation.start_time,
      operation.end_time || null,
      operation.details,
      operation.results ? JSON.stringify(operation.results) : null,
      now,
      now
    );

    const getStmt = this.db.prepare('SELECT * FROM bulk_operations WHERE id = ?');
    return getStmt.get(id);
  }

  // Audit Log operations
  public getAllAuditEntries(limit: number = 100): any[] {
    const stmt = this.db.prepare(`
      SELECT * FROM audit_log 
      ORDER BY timestamp DESC 
      LIMIT ?
    `);
    return stmt.all(limit);
  }

  public insertAuditEntry(entry: any): void {
    const id = uuidv4();
    const now = new Date().toISOString();
    
    const stmt = this.db.prepare(`
      INSERT INTO audit_log (id, action, user, timestamp, type, details, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `);

    stmt.run(
      id,
      entry.action,
      entry.user,
      entry.timestamp || now,
      entry.type,
      entry.details ? JSON.stringify(entry.details) : null,
      now
    );
  }

  // Authentication operations
  public getUserByUsername(username: string): any | null {
    const stmt = this.db.prepare('SELECT * FROM user_sessions WHERE username = ?');
    return stmt.get(username) || null;
  }

  public createOrUpdateSession(username: string, sessionToken: string, expiresAt: string): void {
    const now = new Date().toISOString();
    const stmt = this.db.prepare(`
      UPDATE user_sessions 
      SET session_token = ?, session_expires = ?, last_login = ?
      WHERE username = ?
    `);
    stmt.run(sessionToken, expiresAt, now, username);
  }

  public getSessionByToken(token: string): any | null {
    const stmt = this.db.prepare(`
      SELECT * FROM user_sessions 
      WHERE session_token = ? AND session_expires > datetime('now')
    `);
    return stmt.get(token) || null;
  }

  public clearSession(username: string): void {
    const stmt = this.db.prepare(`
      UPDATE user_sessions 
      SET session_token = NULL, session_expires = NULL
      WHERE username = ?
    `);
    stmt.run(username);
  }

  // Statistics
  public getStatistics(): any {
    const phoneNumberStats = this.db.prepare(`
      SELECT
        COUNT(*) as total,
        SUM(CASE WHEN status = 'assigned' THEN 1 ELSE 0 END) as assigned,
        SUM(CASE WHEN status = 'available' THEN 1 ELSE 0 END) as available,
        SUM(CASE WHEN status = 'aging' THEN 1 ELSE 0 END) as aging
      FROM phone_numbers
    `).get() as any;

    const rangeStats = this.db.prepare('SELECT COUNT(*) as total FROM number_ranges').get() as any;

    return {
      totalNumbers: phoneNumberStats?.total || 0,
      assignedNumbers: phoneNumberStats?.assigned || 0,
      availableNumbers: phoneNumberStats?.available || 0,
      agingNumbers: phoneNumberStats?.aging || 0,
      totalRanges: rangeStats?.total || 0,
      activeSystems: 0 // PBX systems are kept in-memory
    };
  }

  // Clear all data
  public clearAllData(): void {
    const tables = ['phone_numbers', 'number_ranges', 'bulk_operations', 'audit_log'];
    
    tables.forEach(table => {
      const stmt = this.db.prepare(`DELETE FROM ${table}`);
      stmt.run();
    });

    // Clear sessions except admin
    const clearSessions = this.db.prepare(`
      UPDATE user_sessions
      SET session_token = NULL, session_expires = NULL
      WHERE username != 'admin'
    `);
    clearSessions.run();

    this.insertAuditEntry({
      action: 'All data cleared',
      user: 'system',
      type: 'settings'
    });
  }

  // UC Admin Tools Database Methods

  // UC Configuration Files operations
  public getAllUCConfigFiles(): any[] {
    const stmt = this.db.prepare(`
      SELECT * FROM uc_config_files
      ORDER BY is_active DESC, display_name ASC
    `);
    return stmt.all();
  }

  public getUCConfigFileById(id: string): any | null {
    const stmt = this.db.prepare('SELECT * FROM uc_config_files WHERE id = ?');
    return stmt.get(id) || null;
  }

  public getUCConfigFileByName(filename: string): any | null {
    const stmt = this.db.prepare('SELECT * FROM uc_config_files WHERE filename = ?');
    return stmt.get(filename) || null;
  }

  public insertUCConfigFile(configFile: any): any {
    const id = uuidv4();
    const now = new Date().toISOString();
    
    const stmt = this.db.prepare(`
      INSERT INTO uc_config_files (
        id, filename, display_name, file_path, file_size, file_hash, is_active,
        version, description, created_at, updated_at, created_by, last_modified_by
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    stmt.run(
      id,
      configFile.filename,
      configFile.display_name || configFile.filename,
      configFile.file_path,
      configFile.file_size || 0,
      configFile.file_hash || null,
      configFile.is_active || 0,
      configFile.version || 1,
      configFile.description || '',
      now,
      now,
      configFile.created_by || 'system',
      configFile.last_modified_by || 'system'
    );

    return this.getUCConfigFileById(id);
  }

  public updateUCConfigFile(id: string, updates: any): any | null {
    const now = new Date().toISOString();
    
    const updateFields: string[] = [];
    const values: any[] = [];
    
    Object.keys(updates).forEach(key => {
      if (updates[key] !== undefined && key !== 'id') {
        updateFields.push(`${key} = ?`);
        values.push(updates[key]);
      }
    });
    
    if (updateFields.length === 0) {
      return this.getUCConfigFileById(id);
    }
    
    updateFields.push('updated_at = ?');
    values.push(now, id);
    
    const stmt = this.db.prepare(`
      UPDATE uc_config_files
      SET ${updateFields.join(', ')}
      WHERE id = ?
    `);
    
    stmt.run(...values);
    return this.getUCConfigFileById(id);
  }

  // UC Configuration History operations
  public insertUCConfigHistory(configFileId: string, configData: any, changeSummary: string, createdBy: string): void {
    const id = uuidv4();
    const now = new Date().toISOString();
    
    // Get current version number
    const versionStmt = this.db.prepare(`
      SELECT MAX(version) as max_version FROM uc_config_history
      WHERE config_file_id = ?
    `);
    const result = versionStmt.get(configFileId) as any;
    const version = (result?.max_version || 0) + 1;
    
    const stmt = this.db.prepare(`
      INSERT INTO uc_config_history (
        id, config_file_id, version, config_data, change_summary, created_at, created_by
      ) VALUES (?, ?, ?, ?, ?, ?, ?)
    `);

    stmt.run(
      id,
      configFileId,
      version,
      JSON.stringify(configData),
      changeSummary,
      now,
      createdBy
    );
  }

  public getUCConfigHistory(configFileId: string, limit: number = 10): any[] {
    const stmt = this.db.prepare(`
      SELECT * FROM uc_config_history
      WHERE config_file_id = ?
      ORDER BY version DESC
      LIMIT ?
    `);
    return stmt.all(configFileId, limit);
  }

  // UC Network Tests operations
  public insertUCNetworkTest(testData: any): any {
    const id = uuidv4();
    const now = new Date().toISOString();
    
    const stmt = this.db.prepare(`
      INSERT INTO uc_network_tests (
        id, test_type, target_host, target_port, dns_record_type, dns_server,
        test_result, status, response_time, error_message, created_at, created_by
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    stmt.run(
      id,
      testData.test_type,
      testData.target_host || null,
      testData.target_port || null,
      testData.dns_record_type || null,
      testData.dns_server || null,
      JSON.stringify(testData.test_result),
      testData.status,
      testData.response_time || 0,
      testData.error_message || null,
      now,
      testData.created_by || 'system'
    );

    const getStmt = this.db.prepare('SELECT * FROM uc_network_tests WHERE id = ?');
    return getStmt.get(id);
  }

  public getUCNetworkTests(limit: number = 50): any[] {
    const stmt = this.db.prepare(`
      SELECT * FROM uc_network_tests
      ORDER BY created_at DESC
      LIMIT ?
    `);
    return stmt.all(limit);
  }

  public getUCNetworkTestsByType(testType: string, limit: number = 20): any[] {
    const stmt = this.db.prepare(`
      SELECT * FROM uc_network_tests
      WHERE test_type = ?
      ORDER BY created_at DESC
      LIMIT ?
    `);
    return stmt.all(testType, limit);
  }

  // UC System Settings operations
  public getUCSystemSetting(key: string): any | null {
    const stmt = this.db.prepare('SELECT * FROM uc_system_settings WHERE setting_key = ?');
    return stmt.get(key) || null;
  }

  public setUCSystemSetting(key: string, value: string, type: string = 'string', updatedBy: string = 'system'): void {
    const id = uuidv4();
    const now = new Date().toISOString();
    
    const stmt = this.db.prepare(`
      INSERT OR REPLACE INTO uc_system_settings (
        id, setting_key, setting_value, setting_type, updated_at, updated_by
      ) VALUES (?, ?, ?, ?, ?, ?)
    `);

    stmt.run(id, key, value, type, now, updatedBy);
  }

  public getAllUCSystemSettings(): any[] {
    const stmt = this.db.prepare('SELECT * FROM uc_system_settings ORDER BY setting_key');
    return stmt.all();
  }

  // UC Configuration Templates operations
  public getAllUCConfigTemplates(): any[] {
    const stmt = this.db.prepare(`
      SELECT * FROM uc_config_templates
      ORDER BY is_default DESC, template_name ASC
    `);
    return stmt.all();
  }

  public getUCConfigTemplate(id: string): any | null {
    const stmt = this.db.prepare('SELECT * FROM uc_config_templates WHERE id = ?');
    return stmt.get(id) || null;
  }

  public insertUCConfigTemplate(template: any): any {
    const id = uuidv4();
    const now = new Date().toISOString();
    
    const stmt = this.db.prepare(`
      INSERT INTO uc_config_templates (
        id, template_name, template_description, template_data, is_default,
        category, created_at, updated_at, created_by
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    stmt.run(
      id,
      template.template_name,
      template.template_description || '',
      JSON.stringify(template.template_data),
      template.is_default || 0,
      template.category || 'custom',
      now,
      now,
      template.created_by || 'system'
    );

    return this.getUCConfigTemplate(id);
  }

  // Health check with UC tables
  public healthCheck(): boolean {
    try {
      // Test basic database operations
      const stmt = this.db.prepare('SELECT COUNT(*) as count FROM phone_numbers');
      stmt.get();

      // Test UC tables if they exist
      try {
        const ucStmt = this.db.prepare('SELECT COUNT(*) as count FROM uc_config_files');
        ucStmt.get();
      } catch (error) {
        console.warn('UC tables not available:', error);
      }

      return true;
    } catch (error) {
      console.error('Database health check failed:', error);
      return false;
    }
  }

  // Skype for Business Database Methods

  // SfB Users operations
  public getAllSfBUsers(): any[] {
    const stmt = this.db.prepare(`
      SELECT * FROM sfb_users
      ORDER BY display_name ASC
    `);
    return stmt.all();
  }

  public getSfBUserById(id: string): any | null {
    const stmt = this.db.prepare('SELECT * FROM sfb_users WHERE id = ?');
    return stmt.get(id) || null;
  }

  public getSfBUserBySipAddress(sipAddress: string): any | null {
    const stmt = this.db.prepare('SELECT * FROM sfb_users WHERE sip_address = ?');
    return stmt.get(sipAddress) || null;
  }

  public getSfBUsersByPhoneNumber(phoneNumber: string): any[] {
    const stmt = this.db.prepare('SELECT * FROM sfb_users WHERE phone_number = ?');
    return stmt.all(phoneNumber);
  }

  public searchSfBUsers(query: string, dataSource?: string): any[] {
    let sql = `
      SELECT * FROM sfb_users
      WHERE (
        display_name LIKE ? OR
        first_name LIKE ? OR
        last_name LIKE ? OR
        sip_address LIKE ? OR
        phone_number LIKE ? OR
        department LIKE ? OR
        title LIKE ?
      )
    `;
    
    const params = Array(7).fill(`%${query}%`);
    
    if (dataSource) {
      sql += ' AND data_source = ?';
      params.push(dataSource);
    }
    
    sql += ' ORDER BY display_name ASC LIMIT 100';
    
    const stmt = this.db.prepare(sql);
    return stmt.all(...params);
  }

  public insertSfBUser(user: any): any {
    const id = uuidv4();
    const now = new Date().toISOString();
    
    const stmt = this.db.prepare(`
      INSERT INTO sfb_users (
        id, sip_address, display_name, first_name, last_name, user_principal_name,
        line_uri, phone_number, enterprise_voice_enabled, hosted_voicemail_enabled,
        department, title, office, company, manager, enabled, registrar_pool,
        voice_policy, dial_plan, location_policy, conferencing_policy,
        external_access_policy, mobility_policy, client_policy, pin_policy,
        archiving_policy, exchange_archiving_policy, retention_policy,
        call_via_work_policy, client_version_policy, hosted_voice_mail_enabled,
        private_line, data_source, last_sync_time, file_source, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    stmt.run(
      id,
      user.sip_address,
      user.display_name,
      user.first_name || null,
      user.last_name || null,
      user.user_principal_name || null,
      user.line_uri || null,
      user.phone_number || null,
      user.enterprise_voice_enabled || 0,
      user.hosted_voicemail_enabled || 0,
      user.department || null,
      user.title || null,
      user.office || null,
      user.company || null,
      user.manager || null,
      user.enabled !== undefined ? user.enabled : 1,
      user.registrar_pool || null,
      user.voice_policy || null,
      user.dial_plan || null,
      user.location_policy || null,
      user.conferencing_policy || null,
      user.external_access_policy || null,
      user.mobility_policy || null,
      user.client_policy || null,
      user.pin_policy || null,
      user.archiving_policy || null,
      user.exchange_archiving_policy || null,
      user.retention_policy || null,
      user.call_via_work_policy || null,
      user.client_version_policy || null,
      user.hosted_voice_mail_enabled || 0,
      user.private_line || null,
      user.data_source || 'offline',
      user.last_sync_time || now,
      user.file_source || null,
      now,
      now
    );

    return this.getSfBUserById(id);
  }

  public updateSfBUser(id: string, updates: any): any | null {
    const now = new Date().toISOString();
    
    const updateFields: string[] = [];
    const values: any[] = [];
    
    Object.keys(updates).forEach(key => {
      if (updates[key] !== undefined && key !== 'id') {
        updateFields.push(`${key} = ?`);
        values.push(updates[key]);
      }
    });
    
    if (updateFields.length === 0) {
      return this.getSfBUserById(id);
    }
    
    updateFields.push('updated_at = ?');
    values.push(now, id);
    
    const stmt = this.db.prepare(`
      UPDATE sfb_users
      SET ${updateFields.join(', ')}
      WHERE id = ?
    `);
    
    stmt.run(...values);
    return this.getSfBUserById(id);
  }

  public deleteSfBUser(id: string): boolean {
    const stmt = this.db.prepare('DELETE FROM sfb_users WHERE id = ?');
    const result = stmt.run(id);
    return result.changes > 0;
  }

  public bulkInsertSfBUsers(users: any[]): { success: number; failed: number } {
    const stmt = this.db.prepare(`
      INSERT OR REPLACE INTO sfb_users (
        id, sip_address, display_name, first_name, last_name, user_principal_name,
        line_uri, phone_number, enterprise_voice_enabled, hosted_voicemail_enabled,
        department, title, office, company, manager, enabled, registrar_pool,
        voice_policy, dial_plan, location_policy, conferencing_policy,
        external_access_policy, mobility_policy, client_policy, pin_policy,
        archiving_policy, exchange_archiving_policy, retention_policy,
        call_via_work_policy, client_version_policy, hosted_voice_mail_enabled,
        private_line, data_source, last_sync_time, file_source, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    let success = 0;
    let failed = 0;
    const now = new Date().toISOString();

    const transaction = this.db.transaction((userList: any[]) => {
      for (const user of userList) {
        try {
          const id = uuidv4();
          stmt.run(
            id,
            user.sip_address,
            user.display_name,
            user.first_name || null,
            user.last_name || null,
            user.user_principal_name || null,
            user.line_uri || null,
            user.phone_number || null,
            user.enterprise_voice_enabled || 0,
            user.hosted_voicemail_enabled || 0,
            user.department || null,
            user.title || null,
            user.office || null,
            user.company || null,
            user.manager || null,
            user.enabled !== undefined ? user.enabled : 1,
            user.registrar_pool || null,
            user.voice_policy || null,
            user.dial_plan || null,
            user.location_policy || null,
            user.conferencing_policy || null,
            user.external_access_policy || null,
            user.mobility_policy || null,
            user.client_policy || null,
            user.pin_policy || null,
            user.archiving_policy || null,
            user.exchange_archiving_policy || null,
            user.retention_policy || null,
            user.call_via_work_policy || null,
            user.client_version_policy || null,
            user.hosted_voice_mail_enabled || 0,
            user.private_line || null,
            user.data_source || 'offline',
            user.last_sync_time || now,
            user.file_source || null,
            now,
            now
          );
          success++;
        } catch (error) {
          console.error('Failed to insert SfB user:', error);
          failed++;
        }
      }
    });

    transaction(users);
    return { success, failed };
  }

  // SfB Phone Correlations operations
  public getAllSfBPhoneCorrelations(): any[] {
    const stmt = this.db.prepare(`
      SELECT c.*, u.display_name, u.sip_address, p.assigned_to, p.status as phone_status
      FROM sfb_phone_correlations c
      LEFT JOIN sfb_users u ON c.sfb_user_id = u.id
      LEFT JOIN phone_numbers p ON c.phone_number_id = p.id
      ORDER BY c.confidence_score DESC, c.created_at DESC
    `);
    return stmt.all();
  }

  public getSfBPhoneCorrelationsByUserId(userId: string): any[] {
    const stmt = this.db.prepare(`
      SELECT c.*, p.assigned_to, p.status as phone_status
      FROM sfb_phone_correlations c
      LEFT JOIN phone_numbers p ON c.phone_number_id = p.id
      WHERE c.sfb_user_id = ?
      ORDER BY c.confidence_score DESC
    `);
    return stmt.all(userId);
  }

  public getSfBPhoneCorrelationsByPhoneNumber(phoneNumber: string): any[] {
    const stmt = this.db.prepare(`
      SELECT c.*, u.display_name, u.sip_address
      FROM sfb_phone_correlations c
      LEFT JOIN sfb_users u ON c.sfb_user_id = u.id
      WHERE c.phone_number = ?
      ORDER BY c.confidence_score DESC
    `);
    return stmt.all(phoneNumber);
  }

  public insertSfBPhoneCorrelation(correlation: any): any {
    const id = uuidv4();
    const now = new Date().toISOString();
    
    const stmt = this.db.prepare(`
      INSERT INTO sfb_phone_correlations (
        id, phone_number_id, phone_number, sfb_user_id, line_uri,
        correlation_type, confidence_score, correlation_method, notes,
        verified_by, verified_at, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    stmt.run(
      id,
      correlation.phone_number_id || null,
      correlation.phone_number,
      correlation.sfb_user_id,
      correlation.line_uri,
      correlation.correlation_type || 'automatic',
      correlation.confidence_score || 1.0,
      correlation.correlation_method || null,
      correlation.notes || null,
      correlation.verified_by || null,
      correlation.verified_at || null,
      now,
      now
    );

    const getStmt = this.db.prepare('SELECT * FROM sfb_phone_correlations WHERE id = ?');
    return getStmt.get(id);
  }

  public updateSfBPhoneCorrelation(id: string, updates: any): any | null {
    const now = new Date().toISOString();
    
    const updateFields: string[] = [];
    const values: any[] = [];
    
    Object.keys(updates).forEach(key => {
      if (updates[key] !== undefined && key !== 'id') {
        updateFields.push(`${key} = ?`);
        values.push(updates[key]);
      }
    });
    
    if (updateFields.length === 0) {
      const getStmt = this.db.prepare('SELECT * FROM sfb_phone_correlations WHERE id = ?');
      return getStmt.get(id);
    }
    
    updateFields.push('updated_at = ?');
    values.push(now, id);
    
    const stmt = this.db.prepare(`
      UPDATE sfb_phone_correlations
      SET ${updateFields.join(', ')}
      WHERE id = ?
    `);
    
    stmt.run(...values);
    
    const getStmt = this.db.prepare('SELECT * FROM sfb_phone_correlations WHERE id = ?');
    return getStmt.get(id);
  }

  // SfB File Monitor operations
  public getAllSfBFileMonitorEntries(): any[] {
    const stmt = this.db.prepare(`
      SELECT * FROM sfb_file_monitor
      ORDER BY last_modified DESC
    `);
    return stmt.all();
  }

  public getLatestSfBFile(): any | null {
    const stmt = this.db.prepare(`
      SELECT * FROM sfb_file_monitor
      WHERE is_latest = 1
      ORDER BY last_modified DESC
      LIMIT 1
    `);
    return stmt.get() || null;
  }

  public insertSfBFileMonitorEntry(fileEntry: any): any {
    const id = uuidv4();
    const now = new Date().toISOString();
    
    const stmt = this.db.prepare(`
      INSERT INTO sfb_file_monitor (
        id, file_path, file_name, file_size, file_hash, last_modified,
        processing_status, processing_started_at, processing_completed_at,
        processing_duration, records_processed, records_inserted, records_updated,
        records_failed, error_message, error_details, is_latest, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    stmt.run(
      id,
      fileEntry.file_path,
      fileEntry.file_name,
      fileEntry.file_size || 0,
      fileEntry.file_hash || null,
      fileEntry.last_modified,
      fileEntry.processing_status || 'pending',
      fileEntry.processing_started_at || null,
      fileEntry.processing_completed_at || null,
      fileEntry.processing_duration || 0,
      fileEntry.records_processed || 0,
      fileEntry.records_inserted || 0,
      fileEntry.records_updated || 0,
      fileEntry.records_failed || 0,
      fileEntry.error_message || null,
      fileEntry.error_details || null,
      fileEntry.is_latest || 0,
      now,
      now
    );

    const getStmt = this.db.prepare('SELECT * FROM sfb_file_monitor WHERE id = ?');
    return getStmt.get(id);
  }

  // SfB Sync History operations
  public insertSfBSyncHistory(syncData: any): any {
    const id = uuidv4();
    const now = new Date().toISOString();
    
    const stmt = this.db.prepare(`
      INSERT INTO sfb_sync_history (
        id, sync_type, sync_source, sync_target, sync_status, total_records,
        processed_records, successful_records, failed_records, skipped_records,
        sync_duration, sync_summary, error_message, triggered_by, started_at,
        completed_at, created_by
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    stmt.run(
      id,
      syncData.sync_type,
      syncData.sync_source,
      syncData.sync_target,
      syncData.sync_status || 'started',
      syncData.total_records || 0,
      syncData.processed_records || 0,
      syncData.successful_records || 0,
      syncData.failed_records || 0,
      syncData.skipped_records || 0,
      syncData.sync_duration || 0,
      syncData.sync_summary ? JSON.stringify(syncData.sync_summary) : null,
      syncData.error_message || null,
      syncData.triggered_by || 'manual',
      syncData.started_at || now,
      syncData.completed_at || null,
      syncData.created_by || 'system'
    );

    const getStmt = this.db.prepare('SELECT * FROM sfb_sync_history WHERE id = ?');
    return getStmt.get(id);
  }

  public getSfBSyncHistory(limit: number = 50): any[] {
    const stmt = this.db.prepare(`
      SELECT * FROM sfb_sync_history
      ORDER BY started_at DESC
      LIMIT ?
    `);
    return stmt.all(limit);
  }

  // SfB Statistics
  public getSfBStatistics(): any {
    const userStats = this.db.prepare(`
      SELECT
        COUNT(*) as total_users,
        SUM(CASE WHEN enabled = 1 THEN 1 ELSE 0 END) as enabled_users,
        SUM(CASE WHEN enterprise_voice_enabled = 1 THEN 1 ELSE 0 END) as voice_enabled_users,
        SUM(CASE WHEN phone_number IS NOT NULL THEN 1 ELSE 0 END) as users_with_phones,
        SUM(CASE WHEN data_source = 'offline' THEN 1 ELSE 0 END) as offline_users,
        SUM(CASE WHEN data_source = 'online' THEN 1 ELSE 0 END) as online_users
      FROM sfb_users
    `).get() as any;

    const correlationStats = this.db.prepare(`
      SELECT
        COUNT(*) as total_correlations,
        SUM(CASE WHEN correlation_type = 'automatic' THEN 1 ELSE 0 END) as automatic_correlations,
        SUM(CASE WHEN correlation_type = 'manual' THEN 1 ELSE 0 END) as manual_correlations,
        SUM(CASE WHEN correlation_type = 'verified' THEN 1 ELSE 0 END) as verified_correlations,
        AVG(confidence_score) as avg_confidence_score
      FROM sfb_phone_correlations
    `).get() as any;

    const fileStats = this.db.prepare(`
      SELECT
        COUNT(*) as total_files,
        SUM(CASE WHEN processing_status = 'completed' THEN 1 ELSE 0 END) as processed_files,
        SUM(CASE WHEN processing_status = 'failed' THEN 1 ELSE 0 END) as failed_files,
        MAX(last_modified) as latest_file_date
      FROM sfb_file_monitor
    `).get() as any;

    return {
      users: {
        total: userStats?.total_users || 0,
        enabled: userStats?.enabled_users || 0,
        voiceEnabled: userStats?.voice_enabled_users || 0,
        withPhones: userStats?.users_with_phones || 0,
        offline: userStats?.offline_users || 0,
        online: userStats?.online_users || 0
      },
      correlations: {
        total: correlationStats?.total_correlations || 0,
        automatic: correlationStats?.automatic_correlations || 0,
        manual: correlationStats?.manual_correlations || 0,
        verified: correlationStats?.verified_correlations || 0,
        avgConfidence: correlationStats?.avg_confidence_score || 0
      },
      files: {
        total: fileStats?.total_files || 0,
        processed: fileStats?.processed_files || 0,
        failed: fileStats?.failed_files || 0,
        latestDate: fileStats?.latest_file_date || null
      }
    };
  }
}

// Export singleton instance
export const localDatabase = LocalDatabase.getInstance();