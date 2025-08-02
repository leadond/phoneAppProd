import Database from 'better-sqlite3';
import { readFileSync, existsSync, mkdirSync } from 'fs';
import { join, dirname } from 'path';
import { v4 as uuidv4 } from 'uuid';

export class ServerDatabase {
  private db: Database.Database;
  private static instance: ServerDatabase;
  private dbPath: string;

  constructor(dbPath?: string) {
    this.dbPath = dbPath || process.env.SQLITE_DB_PATH || './data/phone-range-nexus.db';
    
    // Ensure directory exists
    const dir = dirname(this.dbPath);
    if (!existsSync(dir)) {
      mkdirSync(dir, { recursive: true });
    }

    // Initialize database with WAL mode for concurrent access
    this.db = new Database(this.dbPath);
    this.db.pragma('journal_mode = WAL');
    this.db.pragma('synchronous = NORMAL');
    this.db.pragma('cache_size = 1000000');
    this.db.pragma('temp_store = MEMORY');
    this.db.pragma('mmap_size = 268435456'); // 256MB
    
    this.initializeDatabase();
  }

  public static getInstance(dbPath?: string): ServerDatabase {
    if (!ServerDatabase.instance) {
      ServerDatabase.instance = new ServerDatabase(dbPath);
    }
    return ServerDatabase.instance;
  }

  private initializeDatabase(): void {
    try {
      const schemaPath = join(process.cwd(), 'src', 'lib', 'local-database-schema.sql');
      const schema = readFileSync(schemaPath, 'utf8');
      this.db.exec(schema);
      console.log('Server database initialized successfully');
    } catch (error) {
      console.error('Failed to initialize server database:', error);
      throw error;
    }
  }

  // Generic CRUD operations with improved concurrency
  public prepare(sql: string): Database.Statement {
    return this.db.prepare(sql);
  }

  public exec(sql: string): Database.Database {
    return this.db.exec(sql);
  }

  public transaction<T>(fn: (db: Database.Database) => T): T {
    const txn = this.db.transaction(fn);
    return txn(this.db);
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
    const id = phoneNumber.id || uuidv4();
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
      phoneNumber.created_at || now,
      phoneNumber.updated_at || now
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
          const id = phoneNumber.id || uuidv4();
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
            phoneNumber.created_at || now,
            phoneNumber.updated_at || now
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
    const id = range.id || uuidv4();
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
      range.created_at || now,
      range.updated_at || now
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
    const id = operation.id || uuidv4();
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
      operation.created_at || now,
      operation.updated_at || now
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
    const id = entry.id || uuidv4();
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
      entry.created_at || now
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
        SUM(CASE WHEN status = 'reserved' THEN 1 ELSE 0 END) as reserved,
        SUM(CASE WHEN status = 'aging' THEN 1 ELSE 0 END) as aging,
        SUM(CASE WHEN status = 'blocked' THEN 1 ELSE 0 END) as blocked,
        SUM(CASE WHEN number_type = 'toll-free' THEN 1 ELSE 0 END) as tollFree
      FROM phone_numbers
    `).get() as any;

    const rangeStats = this.db.prepare(`
      SELECT 
        COUNT(*) as total,
        SUM(CASE WHEN status = 'active' THEN 1 ELSE 0 END) as active
      FROM number_ranges
    `).get() as any;

    return {
      totalNumbers: phoneNumberStats?.total || 0,
      assignedNumbers: phoneNumberStats?.assigned || 0,
      availableNumbers: phoneNumberStats?.available || 0,
      reservedNumbers: phoneNumberStats?.reserved || 0,
      agingNumbers: phoneNumberStats?.aging || 0,
      blockedNumbers: phoneNumberStats?.blocked || 0,
      tollFreeNumbers: phoneNumberStats?.tollFree || 0,
      totalRanges: rangeStats?.total || 0,
      activeRanges: rangeStats?.active || 0
    };
  }

  // Clear all data
  public clearAllData(): void {
    const tables = ['phone_numbers', 'number_ranges', 'bulk_operations', 'audit_log'];
    
    const transaction = this.db.transaction(() => {
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
    });

    transaction();

    this.insertAuditEntry({
      action: 'All data cleared',
      user: 'system',
      type: 'settings'
    });
  }

  // Health check method
  public healthCheck(): boolean {
    try {
      const result = this.db.prepare('SELECT 1 as health').get() as { health: number };
      return result.health === 1;
    } catch {
      return false;
    }
  }

  // Database maintenance
  public optimize(): void {
    this.db.pragma('optimize');
    this.db.exec('VACUUM');
    this.db.exec('ANALYZE');
  }

  public close(): void {
    this.db.close();
  }

  // Backup method
  public backup(backupPath: string): void {
    this.db.backup(backupPath);
  }
}

// Export singleton instance
export const serverDatabase = ServerDatabase.getInstance();