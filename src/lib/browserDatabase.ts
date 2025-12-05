// Browser-compatible database client using IndexedDB
// This replaces the SQLite implementation for browser compatibility

import { v4 as uuidv4 } from 'uuid';

// Database schema constants
const DB_NAME = 'PhoneRangeNexus';
const DB_VERSION = 4; // Incremented to add UC Admin Tools tables
const DATA_SEEDED_KEY = 'phoneRangeNexus_dataSeedingCompleted';

// Table names
const TABLES = {
  PHONE_NUMBERS: 'phone_numbers',
  NUMBER_RANGES: 'number_ranges',
  BULK_OPERATIONS: 'bulk_operations',
  AUDIT_LOG: 'audit_log',
  USER_SESSIONS: 'user_sessions',
  SYSTEM_CONFIGURATIONS: 'system_configurations',
  ADMIN_SESSIONS: 'admin_sessions',
  SECURITY_EVENTS: 'security_events',
  // UC Admin Tools tables
  UC_CONFIG_FILES: 'uc_config_files',
  UC_CONFIG_HISTORY: 'uc_config_history',
  UC_NETWORK_TESTS: 'uc_network_tests',
  UC_SYSTEM_SETTINGS: 'uc_system_settings',
  UC_CONFIG_TEMPLATES: 'uc_config_templates',
  SAVED_SEARCHES: 'saved_searches',
  TAGS: 'tags',
  PHONE_NUMBER_TAGS: 'phone_number_tags',
  WEBHOOKS: 'webhooks'
};

export class BrowserDatabase {
  private db: IDBDatabase | null = null;
  private static instance: BrowserDatabase;
  private initPromise: Promise<void> | null = null;

  constructor() {
    // Don't call initializeDatabase immediately - use lazy initialization
  }

  // Singleton pattern
  public static getInstance(): BrowserDatabase {
    if (!BrowserDatabase.instance) {
      BrowserDatabase.instance = new BrowserDatabase();
    }
    return BrowserDatabase.instance;
  }

  private async initializeDatabase(): Promise<void> {
    if (this.initPromise) {
      return this.initPromise;
    }

    this.initPromise = new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);

      request.onerror = () => {
        console.error('Failed to initialize IndexedDB:', request.error);
        this.initPromise = null;
        reject(request.error);
      };

      request.onsuccess = () => {
        this.db = request.result;
        console.log('Browser database initialized successfully');
        resolve();
      };

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;
        const transaction = (event.target as IDBOpenDBRequest).transaction!;
        
        this.createObjectStores(db);
        
        // Create default admin user immediately during upgrade
        transaction.oncomplete = async () => {
          await this.seedSampleDataOnce();
        };
      };
    });

    return this.initPromise;
  }

  private createObjectStores(db: IDBDatabase): void {
    // Phone Numbers store
    if (!db.objectStoreNames.contains(TABLES.PHONE_NUMBERS)) {
      const phoneStore = db.createObjectStore(TABLES.PHONE_NUMBERS, { keyPath: 'id' });
      phoneStore.createIndex('number', 'number', { unique: true });
      phoneStore.createIndex('status', 'status');
      phoneStore.createIndex('department', 'department');
      phoneStore.createIndex('carrier', 'carrier');
      phoneStore.createIndex('project', 'project');
    }

    // Number Ranges store
    if (!db.objectStoreNames.contains(TABLES.NUMBER_RANGES)) {
      const rangeStore = db.createObjectStore(TABLES.NUMBER_RANGES, { keyPath: 'id' });
      rangeStore.createIndex('name', 'name');
      rangeStore.createIndex('status', 'status');
      rangeStore.createIndex('department', 'department');
    }

    // Bulk Operations store
    if (!db.objectStoreNames.contains(TABLES.BULK_OPERATIONS)) {
      const operationStore = db.createObjectStore(TABLES.BULK_OPERATIONS, { keyPath: 'id' });
      operationStore.createIndex('type', 'type');
      operationStore.createIndex('status', 'status');
      operationStore.createIndex('start_time', 'start_time');
    }

    // Audit Log store
    if (!db.objectStoreNames.contains(TABLES.AUDIT_LOG)) {
      const auditStore = db.createObjectStore(TABLES.AUDIT_LOG, { keyPath: 'id' });
      auditStore.createIndex('timestamp', 'timestamp');
      auditStore.createIndex('type', 'type');
      auditStore.createIndex('user', 'user');
    }

    // User Sessions store
    if (!db.objectStoreNames.contains(TABLES.USER_SESSIONS)) {
      const sessionStore = db.createObjectStore(TABLES.USER_SESSIONS, { keyPath: 'id' });
      sessionStore.createIndex('username', 'username', { unique: true });
      sessionStore.createIndex('session_token', 'session_token');
    }

    // System Configurations store
    if (!db.objectStoreNames.contains(TABLES.SYSTEM_CONFIGURATIONS)) {
      const configStore = db.createObjectStore(TABLES.SYSTEM_CONFIGURATIONS, { keyPath: 'id' });
      configStore.createIndex('type', 'type');
      configStore.createIndex('name', 'name');
      configStore.createIndex('enabled', 'enabled');
    }

    // Admin Sessions store
    if (!db.objectStoreNames.contains(TABLES.ADMIN_SESSIONS)) {
      const adminSessionStore = db.createObjectStore(TABLES.ADMIN_SESSIONS, { keyPath: 'id' });
      adminSessionStore.createIndex('userId', 'userId');
      adminSessionStore.createIndex('username', 'username');
      adminSessionStore.createIndex('isActive', 'isActive');
      adminSessionStore.createIndex('sessionStart', 'sessionStart');
    }

    // Security Events store
    if (!db.objectStoreNames.contains(TABLES.SECURITY_EVENTS)) {
      const securityEventStore = db.createObjectStore(TABLES.SECURITY_EVENTS, { keyPath: 'id' });
      securityEventStore.createIndex('timestamp', 'timestamp');
      securityEventStore.createIndex('category', 'category');
      securityEventStore.createIndex('severity', 'severity');
      securityEventStore.createIndex('userId', 'userId');
    }

    // UC Config Files store
    if (!db.objectStoreNames.contains(TABLES.UC_CONFIG_FILES)) {
      const ucConfigStore = db.createObjectStore(TABLES.UC_CONFIG_FILES, { keyPath: 'id' });
      ucConfigStore.createIndex('filename', 'filename', { unique: true });
      ucConfigStore.createIndex('is_active', 'is_active');
      ucConfigStore.createIndex('created_at', 'created_at');
    }

    // UC Config History store
    if (!db.objectStoreNames.contains(TABLES.UC_CONFIG_HISTORY)) {
      const ucHistoryStore = db.createObjectStore(TABLES.UC_CONFIG_HISTORY, { keyPath: 'id' });
      ucHistoryStore.createIndex('config_file_id', 'config_file_id');
      ucHistoryStore.createIndex('version', 'version');
      ucHistoryStore.createIndex('created_at', 'created_at');
    }

    // UC Network Tests store
    if (!db.objectStoreNames.contains(TABLES.UC_NETWORK_TESTS)) {
      const ucNetworkStore = db.createObjectStore(TABLES.UC_NETWORK_TESTS, { keyPath: 'id' });
      ucNetworkStore.createIndex('test_type', 'test_type');
      ucNetworkStore.createIndex('target_host', 'target_host');
      ucNetworkStore.createIndex('created_at', 'created_at');
    }

    // UC System Settings store
    if (!db.objectStoreNames.contains(TABLES.UC_SYSTEM_SETTINGS)) {
      const ucSettingsStore = db.createObjectStore(TABLES.UC_SYSTEM_SETTINGS, { keyPath: 'id' });
      ucSettingsStore.createIndex('setting_key', 'setting_key', { unique: true });
      ucSettingsStore.createIndex('category', 'category');
    }

    // UC Config Templates store
    if (!db.objectStoreNames.contains(TABLES.UC_CONFIG_TEMPLATES)) {
      const ucTemplatesStore = db.createObjectStore(TABLES.UC_CONFIG_TEMPLATES, { keyPath: 'id' });
      ucTemplatesStore.createIndex('template_name', 'template_name');
      ucTemplatesStore.createIndex('is_default', 'is_default');
    }

    // Saved Searches store
    if (!db.objectStoreNames.contains(TABLES.SAVED_SEARCHES)) {
      const savedSearchesStore = db.createObjectStore(TABLES.SAVED_SEARCHES, { keyPath: 'id' });
      savedSearchesStore.createIndex('user_id', 'user_id');
      savedSearchesStore.createIndex('name', 'name');
    }

    // Tags store
    if (!db.objectStoreNames.contains(TABLES.TAGS)) {
      const tagsStore = db.createObjectStore(TABLES.TAGS, { keyPath: 'id' });
      tagsStore.createIndex('name', 'name', { unique: true });
    }

    // Phone Number Tags store
    if (!db.objectStoreNames.contains(TABLES.PHONE_NUMBER_TAGS)) {
      const phoneNumberTagsStore = db.createObjectStore(TABLES.PHONE_NUMBER_TAGS, { keyPath: ['phone_number_id', 'tag_id'] });
      phoneNumberTagsStore.createIndex('phone_number_id', 'phone_number_id');
      phoneNumberTagsStore.createIndex('tag_id', 'tag_id');
    }

    // Webhooks store
    if (!db.objectStoreNames.contains(TABLES.WEBHOOKS)) {
      const webhooksStore = db.createObjectStore(TABLES.WEBHOOKS, { keyPath: 'id' });
      webhooksStore.createIndex('name', 'name');
    }
  }

  private async seedSampleDataOnce(): Promise<void> {
    try {
      // Check if data seeding has already been completed
      const seedingCompleted = localStorage.getItem(DATA_SEEDED_KEY);
      if (seedingCompleted === 'true') {
        console.log('Sample data seeding already completed, skipping...');
        // Still ensure admin user exists even if seeding was completed
        await this.ensureDefaultAdminUser();
        return;
      }

      // Wait for db to be ready
      if (!this.db) {
        await this.initializeDatabase();
      }

      // Create default admin user first - this is essential
      await this.ensureDefaultAdminUser();

      // Double-check if data already exists in the database
      const phoneCount = await this.count(TABLES.PHONE_NUMBERS);
      if (phoneCount > 0) {
        console.log(`Database already contains ${phoneCount} phone numbers, skipping sample data seeding`);
        localStorage.setItem(DATA_SEEDED_KEY, 'true');
        return;
      }

      // Sample data seeding disabled - user should import their own data
      console.log('Sample data seeding disabled - user should import their own data');

      // Add initial audit entry for database initialization
      await this.insertAuditEntry({
        action: 'Browser database initialized',
        user: 'system',
        type: 'settings'
      });

      // Mark seeding as completed
      localStorage.setItem(DATA_SEEDED_KEY, 'true');
      console.log('Sample data seeded successfully - seeding marked complete');
    } catch (error) {
      console.error('Failed to seed sample data:', error);
    }
  }

  // Generic CRUD operations
  private async getTransaction(storeName: string, mode: IDBTransactionMode = 'readonly'): Promise<IDBObjectStore> {
    if (!this.db || !this.initPromise) {
      await this.initializeDatabase();
    } else if (this.initPromise) {
      await this.initPromise;
    }
    
    if (!this.db) {
      throw new Error('Database not initialized');
    }
    
    const transaction = this.db.transaction([storeName], mode);
    return transaction.objectStore(storeName);
  }

  public async getAll(storeName: string): Promise<any[]> {
    const store = await this.getTransaction(storeName);
    return new Promise((resolve, reject) => {
      const request = store.getAll();
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  public async getById(storeName: string, id: string): Promise<any | null> {
    const store = await this.getTransaction(storeName);
    return new Promise((resolve, reject) => {
      const request = store.get(id);
      request.onsuccess = () => resolve(request.result || null);
      request.onerror = () => reject(request.error);
    });
  }

  public async insert(storeName: string, data: any): Promise<any> {
    const store = await this.getTransaction(storeName, 'readwrite');
    const id = data.id || uuidv4();
    const now = new Date().toISOString();
    
    const record = {
      ...data,
      id,
      created_at: data.created_at || now,
      updated_at: data.updated_at || now
    };

    return new Promise((resolve, reject) => {
      const request = store.add(record);
      request.onsuccess = () => resolve(record);
      request.onerror = () => reject(request.error);
    });
  }

  public async update(storeName: string, id: string, updates: any): Promise<any | null> {
    const store = await this.getTransaction(storeName, 'readwrite');
    
    return new Promise(async (resolve, reject) => {
      const getRequest = store.get(id);
      getRequest.onsuccess = () => {
        const existing = getRequest.result;
        if (!existing) {
          resolve(null);
          return;
        }

        const updated = {
          ...existing,
          ...updates,
          id, // Ensure ID doesn't change
          updated_at: new Date().toISOString()
        };

        const putRequest = store.put(updated);
        putRequest.onsuccess = () => resolve(updated);
        putRequest.onerror = () => reject(putRequest.error);
      };
      getRequest.onerror = () => reject(getRequest.error);
    });
  }

  public async delete(storeName: string, id: string): Promise<boolean> {
    const store = await this.getTransaction(storeName, 'readwrite');
    return new Promise((resolve, reject) => {
      const request = store.delete(id);
      request.onsuccess = () => resolve(true);
      request.onerror = () => reject(request.error);
    });
  }

  public async bulkInsert(storeName: string, records: any[]): Promise<{ success: number; failed: number }> {
    const store = await this.getTransaction(storeName, 'readwrite');
    let success = 0;
    let failed = 0;
    const now = new Date().toISOString();

    const promises = records.map(record => {
      return new Promise<void>((resolve) => {
        const id = record.id || uuidv4();
        const recordWithMeta = {
          ...record,
          id,
          created_at: record.created_at || now,
          updated_at: record.updated_at || now
        };

        const request = store.add(recordWithMeta);
        request.onsuccess = () => {
          success++;
          resolve();
        };
        request.onerror = () => {
          failed++;
          resolve();
        };
      });
    });

    await Promise.all(promises);
    return { success, failed };
  }

  public async count(storeName: string, filters: any = {}): Promise<number> {
    const store = await this.getTransaction(storeName);
    return new Promise((resolve, reject) => {
      if (Object.keys(filters).length === 0) {
        const request = store.count();
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
      } else {
        const request = store.getAll();
        request.onsuccess = () => {
          let allResults = request.result;

          // Apply filters
          if (filters.status) {
            allResults = allResults.filter(num => num.status === filters.status);
          }
          if (filters.system) {
            allResults = allResults.filter(num => num.system === filters.system);
          }
          if (filters.range) {
            allResults = allResults.filter(num => num.range_name === filters.range);
          }
          resolve(allResults.length);
        };
        request.onerror = () => reject(request.error);
      }
    });
  }

  public async clear(storeName: string): Promise<void> {
    const store = await this.getTransaction(storeName, 'readwrite');
    return new Promise((resolve, reject) => {
      const request = store.clear();
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  // Specific methods for phone numbers
  public async getAllPhoneNumbers(offset: number = 0, limit?: number, filters: any = {}): Promise<any[]> {
    const store = await this.getTransaction(TABLES.PHONE_NUMBERS);
    return new Promise((resolve, reject) => {
      const request = store.getAll();
      request.onsuccess = () => {
        let allResults = request.result;

        // Apply filters
        if (filters.status) {
          allResults = allResults.filter(num => num.status === filters.status);
        }
        if (filters.system) {
          allResults = allResults.filter(num => num.system === filters.system);
        }
        if (filters.range) {
          allResults = allResults.filter(num => num.range_name === filters.range);
        }

        const paginatedResults = limit ? allResults.slice(offset, offset + limit) : allResults;
        resolve(paginatedResults);
      };
      request.onerror = () => reject(request.error);
    });
  }

  public async getPhoneNumberById(id: string): Promise<any | null> {
    return this.getById(TABLES.PHONE_NUMBERS, id);
  }

  public async insertPhoneNumber(phoneNumber: any): Promise<any> {
    return this.insert(TABLES.PHONE_NUMBERS, phoneNumber);
  }

  public async updatePhoneNumber(id: string, updates: any): Promise<any | null> {
    return this.update(TABLES.PHONE_NUMBERS, id, updates);
  }

  public async deletePhoneNumber(id: string): Promise<boolean> {
    return this.delete(TABLES.PHONE_NUMBERS, id);
  }

  public async bulkInsertPhoneNumbers(phoneNumbers: any[]): Promise<{ success: number; failed: number }> {
    return this.bulkInsert(TABLES.PHONE_NUMBERS, phoneNumbers);
  }

  // Specific methods for number ranges
  public async getAllNumberRanges(): Promise<any[]> {
    return this.getAll(TABLES.NUMBER_RANGES);
  }

  public async insertNumberRange(range: any): Promise<any> {
    return this.insert(TABLES.NUMBER_RANGES, range);
  }

  // Specific methods for bulk operations
  public async getAllBulkOperations(): Promise<any[]> {
    return this.getAll(TABLES.BULK_OPERATIONS);
  }

  public async insertBulkOperation(operation: any): Promise<any> {
    return this.insert(TABLES.BULK_OPERATIONS, operation);
  }

  // Specific methods for audit log
  public async getAllAuditEntries(limit: number = 100, filters: any = {}): Promise<any[]> {
    let entries = await this.getAll(TABLES.AUDIT_LOG);

    if (filters.user) {
      entries = entries.filter(entry => entry.user.includes(filters.user));
    }
    if (filters.action) {
      entries = entries.filter(entry => entry.action.includes(filters.action));
    }
    if (filters.date) {
      entries = entries.filter(entry => entry.timestamp.startsWith(filters.date));
    }

    return entries
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
      .slice(0, limit);
  }

  public async insertAuditEntry(entry: any): Promise<void> {
    const auditEntry = {
      id: uuidv4(),
      action: entry.action,
      user: entry.user,
      timestamp: entry.timestamp || new Date().toISOString(),
      type: entry.type,
      details: entry.details ? JSON.stringify(entry.details) : null,
      created_at: new Date().toISOString()
    };
    await this.insert(TABLES.AUDIT_LOG, auditEntry);
  }

  // User session methods
  public async getUserByUsername(username: string): Promise<any | null> {
    const store = await this.getTransaction(TABLES.USER_SESSIONS);
    const index = store.index('username');
    return new Promise((resolve, reject) => {
      const request = index.get(username);
      request.onsuccess = () => resolve(request.result || null);
      request.onerror = () => reject(request.error);
    });
  }

  public async createOrUpdateSession(username: string, sessionToken: string, expiresAt: string): Promise<void> {
    const user = await this.getUserByUsername(username);
    if (user) {
      await this.update(TABLES.USER_SESSIONS, user.id, {
        session_token: sessionToken,
        session_expires: expiresAt,
        last_login: new Date().toISOString()
      });
    }
  }

  public async getSessionByToken(token: string): Promise<any | null> {
    const store = await this.getTransaction(TABLES.USER_SESSIONS);
    const index = store.index('session_token');
    return new Promise((resolve, reject) => {
      const request = index.get(token);
      request.onsuccess = () => {
        const result = request.result;
        if (result && new Date(result.session_expires) > new Date()) {
          resolve(result);
        } else {
          resolve(null);
        }
      };
      request.onerror = () => reject(request.error);
    });
  }

  public async clearSession(username: string): Promise<void> {
    const user = await this.getUserByUsername(username);
    if (user) {
      await this.update(TABLES.USER_SESSIONS, user.id, {
        session_token: null,
        session_expires: null
      });
    }
  }

  // Statistics
  public async getStatistics(): Promise<any> {
    const phoneNumbers = await this.getAllPhoneNumbers();
    const ranges = await this.getAllNumberRanges();

    const stats = phoneNumbers.reduce((acc, phone) => {
      acc.total++;
      switch (phone.status) {
        case 'assigned':
          acc.assigned++;
          break;
        case 'available':
          acc.available++;
          break;
        case 'reserved':
          acc.reserved++;
          break;
        case 'aging':
          acc.aging++;
          break;
        case 'blocked':
          acc.blocked++;
          break;
        case 'toll-free':
          acc.tollFree++;
          break;
      }
      return acc;
    }, {
      total: 0,
      assigned: 0,
      available: 0,
      reserved: 0,
      aging: 0,
      blocked: 0,
      tollFree: 0
    });

    // Calculate aging numbers more accurately
    const now = new Date();
    let actualAgingNumbers = 0;
    
    phoneNumbers.forEach(phone => {
      // Numbers are considered aging if they've been available for more than 30 days
      // or if they have an aging_days value > 30
      if (phone.aging_days > 30 ||
          (phone.status === 'available' && phone.date_available)) {
        const availableDate = new Date(phone.date_available);
        const daysSinceAvailable = Math.floor((now.getTime() - availableDate.getTime()) / (1000 * 60 * 60 * 24));
        if (daysSinceAvailable > 30) {
          actualAgingNumbers++;
        }
      }
    });

    // Calculate active ranges (those with status 'active')
    const activeRanges = ranges.filter(range => range.status === 'active').length;

    return {
      totalNumbers: stats.total,
      assignedNumbers: stats.assigned,
      availableNumbers: stats.available,
      reservedNumbers: stats.reserved,
      agingNumbers: actualAgingNumbers, // Use calculated aging numbers
      blockedNumbers: stats.blocked,
      tollFreeNumbers: stats.tollFree,
      totalRanges: ranges.length,
      activeRanges: activeRanges
    };
  }

  // Clear all data
  public async clearAllData(): Promise<void> {
    const tables = [TABLES.PHONE_NUMBERS, TABLES.NUMBER_RANGES, TABLES.BULK_OPERATIONS, TABLES.AUDIT_LOG];
    
    for (const table of tables) {
      await this.clear(table);
    }

    const users = await this.getAll(TABLES.USER_SESSIONS);
    for (const user of users) {
      if (user.username !== 'admin') {
        await this.update(TABLES.USER_SESSIONS, user.id, {
          session_token: null,
          session_expires: null
        });
      }
    }

    // Clear the seeding flag so data can be seeded again if needed
    localStorage.removeItem(DATA_SEEDED_KEY);

    await this.insertAuditEntry({
      action: 'All data cleared',
      user: 'system',
      type: 'settings'
    });
  }

  // Method to manually initialize database (useful for testing and ensuring readiness)
  public async ensureInitialized(): Promise<void> {
    if (!this.db || !this.initPromise) {
      await this.initializeDatabase();
    } else if (this.initPromise) {
      await this.initPromise;
    }
  }

  // Method to force reseed data (for development/testing)
  public async forceReseedData(): Promise<void> {
    try {
      // Clear existing data
      await this.clearAllData();
      
      // Remove seeding flag
      localStorage.removeItem(DATA_SEEDED_KEY);
      
      // Force reseed
      await this.seedSampleDataOnce();
      
      console.log('Data reseeding completed successfully');
    } catch (error) {
      console.error('Failed to reseed data:', error);
      throw error;
    }
  }

  // Ensure default admin user exists
  private async ensureDefaultAdminUser(): Promise<void> {
    try {
      // Always try to ensure admin user exists, even if we think it should be there
      let existingAdmin = null;
      try {
        existingAdmin = await this.getUserByUsername('admin');
      } catch (error) {
        console.log('Error checking for existing admin, will create new one:', error);
      }
      
      if (!existingAdmin) {
        const adminUser = {
          id: uuidv4(),
          username: 'admin',
          password_hash: '$2a$10$rQKJz5Z5J5z5J5z5J5z5JOkK5z5J5z5J5z5J5z5J5z5J5z5J5z5JO', // Hash for 'admin123'
          session_token: null,
          session_expires: null,
          last_login: null,
          created_at: new Date().toISOString()
        };
        
        try {
          await this.insert(TABLES.USER_SESSIONS, adminUser);
          console.log('Default admin user created successfully');
          
          // Verify it was created
          const verifyUser = await this.getUserByUsername('admin');
          if (verifyUser) {
            console.log('Admin user creation verified');
          } else {
            console.error('Admin user creation failed - could not verify');
          }
        } catch (insertError) {
          console.error('Failed to insert admin user:', insertError);
          // Try with a different approach if needed
        }
      } else {
        console.log('Admin user already exists');
      }
    } catch (error) {
      console.error('Failed to ensure default admin user:', error);
    }
  }

  // Check if database needs upgrade
  public async checkDatabaseVersion(): Promise<{ currentVersion: number; needsUpgrade: boolean }> {
    return new Promise((resolve) => {
      const request = indexedDB.open(DB_NAME);
      
      request.onsuccess = () => {
        const currentVersion = request.result.version;
        request.result.close();
        
        resolve({
          currentVersion,
          needsUpgrade: currentVersion < DB_VERSION
        });
      };
      
      request.onerror = () => {
        resolve({
          currentVersion: 0,
          needsUpgrade: true
        });
      };
    });
  }

  // Health check method for consistency with ServerDatabase
  public healthCheck(): boolean {
    try {
      return this.db !== null;
    } catch {
      return false;
    }
  }

  public close(): void {
    if (this.db) {
      this.db.close();
      this.db = null;
    }
    this.initPromise = null;
  }

  // System Configuration methods
  public async getAllSystemConfigurations(): Promise<any[]> {
    return this.getAll(TABLES.SYSTEM_CONFIGURATIONS);
  }

  public async getSystemConfigurationById(id: string): Promise<any | null> {
    return this.getById(TABLES.SYSTEM_CONFIGURATIONS, id);
  }

  public async getSystemConfigurationsByType(type: string): Promise<any[]> {
    const store = await this.getTransaction(TABLES.SYSTEM_CONFIGURATIONS);
    const index = store.index('type');
    return new Promise((resolve, reject) => {
      const request = index.getAll(type);
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  public async insertSystemConfiguration(config: any): Promise<any> {
    return this.insert(TABLES.SYSTEM_CONFIGURATIONS, config);
  }

  public async updateSystemConfiguration(id: string, updates: any): Promise<any | null> {
    return this.update(TABLES.SYSTEM_CONFIGURATIONS, id, updates);
  }

  public async deleteSystemConfiguration(id: string): Promise<boolean> {
    return this.delete(TABLES.SYSTEM_CONFIGURATIONS, id);
  }

  // Admin Session methods
  public async getAllAdminSessions(): Promise<any[]> {
    return this.getAll(TABLES.ADMIN_SESSIONS);
  }

  public async getAdminSessionById(id: string): Promise<any | null> {
    return this.getById(TABLES.ADMIN_SESSIONS, id);
  }

  public async getActiveAdminSessions(): Promise<any[]> {
    const allSessions = await this.getAll(TABLES.ADMIN_SESSIONS);
    return allSessions.filter(session => session.isActive === true && new Date(session.expiresAt) > new Date());
  }

  public async insertAdminSession(session: any): Promise<any> {
    return this.insert(TABLES.ADMIN_SESSIONS, session);
  }

  public async updateAdminSession(id: string, updates: any): Promise<any | null> {
    return this.update(TABLES.ADMIN_SESSIONS, id, updates);
  }

  public async deleteAdminSession(id: string): Promise<boolean> {
    return this.delete(TABLES.ADMIN_SESSIONS, id);
  }

  // Security Events methods
  public async getAllSecurityEvents(limit: number = 100): Promise<any[]> {
    const events = await this.getAll(TABLES.SECURITY_EVENTS);
    return events
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
      .slice(0, limit);
  }

  public async getSecurityEventById(id: string): Promise<any | null> {
    return this.getById(TABLES.SECURITY_EVENTS, id);
  }

  public async insertSecurityEvent(event: any): Promise<any> {
    const securityEvent = {
      id: uuidv4(),
      timestamp: event.timestamp || new Date().toISOString(),
      category: event.category,
      severity: event.severity || 'medium',
      userId: event.userId,
      username: event.username,
      action: event.action,
      details: event.details ? JSON.stringify(event.details) : null,
      ipAddress: event.ipAddress,
      userAgent: event.userAgent,
      created_at: new Date().toISOString()
    };
    return this.insert(TABLES.SECURITY_EVENTS, securityEvent);
  }

  public async getSecurityEventsByCategory(category: string, limit: number = 50): Promise<any[]> {
    const store = await this.getTransaction(TABLES.SECURITY_EVENTS);
    const index = store.index('category');
    return new Promise((resolve, reject) => {
      const request = index.getAll(category);
      request.onsuccess = () => {
        const results = request.result
          .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
          .slice(0, limit);
        resolve(results);
      };
      request.onerror = () => reject(request.error);
    });
  }

  public async getSecurityEventsBySeverity(severity: string, limit: number = 50): Promise<any[]> {
    const store = await this.getTransaction(TABLES.SECURITY_EVENTS);
    const index = store.index('severity');
    return new Promise((resolve, reject) => {
      const request = index.getAll(severity);
      request.onsuccess = () => {
        const results = request.result
          .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
          .slice(0, limit);
        resolve(results);
      };
      request.onerror = () => reject(request.error);
    });
  }

  // Enhanced clear method to include new tables
  public async clearAllSystemData(): Promise<void> {
    const tables = [
      TABLES.PHONE_NUMBERS,
      TABLES.NUMBER_RANGES,
      TABLES.BULK_OPERATIONS,
      TABLES.AUDIT_LOG,
      TABLES.SYSTEM_CONFIGURATIONS,
      TABLES.ADMIN_SESSIONS,
      TABLES.SECURITY_EVENTS,
      TABLES.UC_CONFIG_FILES,
      TABLES.UC_CONFIG_HISTORY,
      TABLES.UC_NETWORK_TESTS,
      TABLES.UC_SYSTEM_SETTINGS,
      TABLES.UC_CONFIG_TEMPLATES
    ];
    
    for (const table of tables) {
      await this.clear(table);
    }

    // Keep user sessions for admin user
    const users = await this.getAll(TABLES.USER_SESSIONS);
    for (const user of users) {
      if (user.username !== 'admin') {
        await this.update(TABLES.USER_SESSIONS, user.id, {
          session_token: null,
          session_expires: null
        });
      }
    }

    // Clear the seeding flag so data can be seeded again if needed
    localStorage.removeItem(DATA_SEEDED_KEY);

    await this.insertAuditEntry({
      action: 'All system data cleared',
      user: 'system',
      type: 'settings'
    });
  }

  // UC Config Files methods
  public async getAllUCConfigFiles(): Promise<any[]> {
    return this.getAll(TABLES.UC_CONFIG_FILES);
  }

  public async getUCConfigFileById(id: string): Promise<any | null> {
    return this.getById(TABLES.UC_CONFIG_FILES, id);
  }

  public async getUCConfigFileByName(filename: string): Promise<any | null> {
    const store = await this.getTransaction(TABLES.UC_CONFIG_FILES);
    const index = store.index('filename');
    return new Promise((resolve, reject) => {
      const request = index.get(filename);
      request.onsuccess = () => resolve(request.result || null);
      request.onerror = () => reject(request.error);
    });
  }

  public async insertUCConfigFile(config: any): Promise<any> {
    return this.insert(TABLES.UC_CONFIG_FILES, config);
  }

  public async updateUCConfigFile(id: string, updates: any): Promise<any | null> {
    return this.update(TABLES.UC_CONFIG_FILES, id, updates);
  }

  public async deleteUCConfigFile(id: string): Promise<boolean> {
    return this.delete(TABLES.UC_CONFIG_FILES, id);
  }

  // UC Config History methods
  public async insertUCConfigHistory(history: any): Promise<any> {
    return this.insert(TABLES.UC_CONFIG_HISTORY, history);
  }

  public async getUCConfigHistoryByFileId(configFileId: string): Promise<any[]> {
    const store = await this.getTransaction(TABLES.UC_CONFIG_HISTORY);
    const index = store.index('config_file_id');
    return new Promise((resolve, reject) => {
      const request = index.getAll(configFileId);
      request.onsuccess = () => {
        const results = request.result.sort((a, b) => b.version - a.version);
        resolve(results);
      };
      request.onerror = () => reject(request.error);
    });
  }

  // UC Network Tests methods
  public async insertUCNetworkTest(test: any): Promise<any> {
    return this.insert(TABLES.UC_NETWORK_TESTS, test);
  }

  public async getAllUCNetworkTests(limit: number = 100): Promise<any[]> {
    const tests = await this.getAll(TABLES.UC_NETWORK_TESTS);
    return tests
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
      .slice(0, limit);
  }

  public async getUCNetworkTestsByType(testType: string, limit: number = 50): Promise<any[]> {
    const store = await this.getTransaction(TABLES.UC_NETWORK_TESTS);
    const index = store.index('test_type');
    return new Promise((resolve, reject) => {
      const request = index.getAll(testType);
      request.onsuccess = () => {
        const results = request.result
          .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
          .slice(0, limit);
        resolve(results);
      };
      request.onerror = () => reject(request.error);
    });
  }

  // UC System Settings methods
  public async getUCSystemSetting(key: string): Promise<any | null> {
    const store = await this.getTransaction(TABLES.UC_SYSTEM_SETTINGS);
    const index = store.index('setting_key');
    return new Promise((resolve, reject) => {
      const request = index.get(key);
      request.onsuccess = () => resolve(request.result || null);
      request.onerror = () => reject(request.error);
    });
  }

  public async setUCSystemSetting(key: string, value: any, category: string = 'general'): Promise<any> {
    const existing = await this.getUCSystemSetting(key);
    const setting = {
      id: existing?.id || uuidv4(),
      setting_key: key,
      setting_value: JSON.stringify(value),
      category,
      updated_at: new Date().toISOString()
    };
    
    if (existing) {
      return this.update(TABLES.UC_SYSTEM_SETTINGS, existing.id, setting);
    } else {
      return this.insert(TABLES.UC_SYSTEM_SETTINGS, setting);
    }
  }

  public async getAllUCSystemSettings(): Promise<any[]> {
    return this.getAll(TABLES.UC_SYSTEM_SETTINGS);
  }

  // UC Config Templates methods
  public async getAllUCConfigTemplates(): Promise<any[]> {
    return this.getAll(TABLES.UC_CONFIG_TEMPLATES);
  }

  public async getUCConfigTemplate(id: string): Promise<any | null> {
    return this.getById(TABLES.UC_CONFIG_TEMPLATES, id);
  }

  public async insertUCConfigTemplate(template: any): Promise<any> {
    return this.insert(TABLES.UC_CONFIG_TEMPLATES, template);
  }

  public async updateUCConfigTemplate(id: string, updates: any): Promise<any | null> {
    return this.update(TABLES.UC_CONFIG_TEMPLATES, id, updates);
  }

  public async deleteUCConfigTemplate(id: string): Promise<boolean> {
    return this.delete(TABLES.UC_CONFIG_TEMPLATES, id);
  }

  // UC System Status method
  public async getUCSystemStatus(): Promise<any> {
    try {
      const configFiles = await this.getAllUCConfigFiles();
      const networkTests = await this.getAllUCNetworkTests(10);
      const templates = await this.getAllUCConfigTemplates();
      
      return {
        configurationService: {
          status: 'Running',
          configFiles: configFiles.length,
          activeConfigs: configFiles.filter(c => c.is_active).length
        },
        networkTools: {
          status: 'Running',
          recentTests: networkTests.length,
          lastTest: networkTests[0]?.created_at || null
        },
        templates: {
          available: templates.length,
          default: templates.filter(t => t.is_default).length
        }
      };
    } catch (error) {
      console.error('Failed to get UC system status:', error);
      return {
        configurationService: { status: 'Error' },
        networkTools: { status: 'Error' },
        templates: { available: 0, default: 0 }
      };
    }
  }
}

// Export singleton instance
export const browserDatabase = BrowserDatabase.getInstance();