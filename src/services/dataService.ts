// Data service for managing phone numbers and related data
// This service uses browser-compatible IndexedDB for persistent data storage

import { browserDatabase } from '../lib/browserDatabase';
import { localAuth } from '../lib/localAuth';
import { apiService, PhoneNumberResponse, StatisticsResponse, WebhookDelivery, PBXSyncRun } from './api';

export interface PhoneNumber {
  id: string;
  number: string;
  status: 'available' | 'assigned' | 'reserved' | 'aging' | 'blocked' | 'toll-free';
  system: string;
  carrier: string;
  assignedTo: string | null;
  notes: string;
  extension: string;
  department: string;
  location: string;
  dateAssigned: string | null;
  dateAvailable: string | null;
  lastUsed: string | null;
  agingDays: number;
  numberType: 'local' | 'toll-free' | 'international';
  range: string;
  project: string | null;
  reservedUntil: string | null;
  usage: {
    inbound: number;
    outbound: number;
    lastActivity: string | null;
  };
}

export interface NumberRange {
  id: string;
  name: string;
  pattern: string;
  startNumber: string;
  endNumber: string;
  totalNumbers: number;
  availableNumbers: number;
  assignedNumbers: number;
  reservedNumbers: number;
  carrier: string;
  location: string;
  department: string;
  dateCreated: string;
  notes: string;
  status: 'active' | 'inactive' | 'pending';
  project: string | null;
}

export interface BulkOperation {
  id: string;
  type: 'assign' | 'release' | 'reserve' | 'import' | 'export' | 'transform';
  status: 'pending' | 'running' | 'completed' | 'failed';
  progress: number;
  totalItems: number;
  processedItems: number;
  failedItems: number;
  startTime: string;
  endTime?: string;
  details: string;
  results?: any;
}

export interface PBXSystem {
  id: string;
  name: string;
  type: 'teams' | 'genesys' | 'rightfax' | 'audiocodes' | 'skype';
  status: 'connected' | 'disconnected' | 'syncing' | 'error';
  lastSync: string;
  numbersManaged: number;
  syncEnabled: boolean;
  endpoint: string;
  version: string;
  health: 'healthy' | 'warning' | 'critical';
}

export interface AuditLogEntry {
  id: string;
  action: string;
  user: string;
  timestamp: string;
  type: 'assignment' | 'import' | 'release' | 'settings' | 'auth' | 'sync';
  details?: any;
}

// Data service using local SQLite database for persistent storage
class DataService {
  // Phone Numbers with pagination support (FastAPI backend)
  async getPhoneNumbers(offset: number = 0, limit?: number, filters: any = {}): Promise<PhoneNumber[]> {
    try {
      // Map offset/limit to page/per_page for FastAPI
      const perPage = limit ?? 1000;
      const page = Math.floor(offset / perPage) + 1;

      const search = filters.search || undefined;
      const status_filter = filters.status || undefined;
      const system_filter = filters.system || undefined;

      const result = await apiService.getPhoneNumbers({
        page,
        per_page: perPage,
        search,
        status_filter,
        system_filter,
      });

      return result.phone_numbers.map(this.mapApiPhoneToPhoneNumber);
    } catch (error) {
      console.error('Error fetching phone numbers from FastAPI:', error);
      return [];
    }
  }

  // Get total count of phone numbers (FastAPI backend)
  async getPhoneNumbersCount(filters: any = {}): Promise<number> {
    try {
      const perPage = 1;
      const page = 1;
      const search = filters.search || undefined;
      const status_filter = filters.status || undefined;
      const system_filter = filters.system || undefined;

      const result = await apiService.getPhoneNumbers({
        page,
        per_page: perPage,
        search,
        status_filter,
        system_filter,
      });

      return result.total_count;
    } catch (error) {
      console.error('Error getting phone numbers count from FastAPI:', error);
      return 0;
    }
  }

  async addPhoneNumber(phoneNumber: Omit<PhoneNumber, 'id'>): Promise<PhoneNumber> {
    try {
      const payload: Partial<PhoneNumberResponse> = {
        phone_number: phoneNumber.number,
        status: phoneNumber.status,
        system: phoneNumber.system,
        assigned_to_name: phoneNumber.assignedTo ?? undefined,
        assigned_to_department: phoneNumber.department || undefined,
        notes: phoneNumber.notes || undefined,
      };

      const created = await apiService.createPhoneNumber(payload);
      const newNumber = this.mapApiPhoneToPhoneNumber(created);
      await this.addAuditEntry(`Phone number ${phoneNumber.number} added`, 'system', 'import');
      return newNumber;
    } catch (error) {
      console.error('Error adding phone number (FastAPI):', error);
      throw error;
    }
  }

  async updatePhoneNumber(id: string, updates: Partial<PhoneNumber>): Promise<PhoneNumber | null> {
    try {
      const numericId = Number(id);
      if (Number.isNaN(numericId)) {
        console.error('updatePhoneNumber: invalid id for FastAPI backend', id);
        return null;
      }

      const payload: Partial<PhoneNumberResponse> = {
        phone_number: updates.number,
        status: updates.status,
        system: updates.system,
        assigned_to_name: updates.assignedTo ?? undefined,
        assigned_to_department: updates.department || undefined,
        notes: updates.notes || undefined,
      };

      const updated = await apiService.updatePhoneNumber(numericId, payload);
      const updatedNumber = this.mapApiPhoneToPhoneNumber(updated);
      await this.addAuditEntry(`Phone number ${updatedNumber.number} updated`, 'system', 'assignment');
      return updatedNumber;
    } catch (error) {
      console.error('Error updating phone number (FastAPI):', error);
      return null;
    }
  }

  async deletePhoneNumber(id: string): Promise<boolean> {
    try {
      const numericId = Number(id);
      if (Number.isNaN(numericId)) {
        console.error('deletePhoneNumber: invalid id for FastAPI backend', id);
        return false;
      }

      await apiService.deletePhoneNumber(numericId);
      await this.addAuditEntry(`Phone number ${id} deleted`, 'system', 'release');
      return true;
    } catch (error) {
      console.error('Error deleting phone number (FastAPI):', error);
      return false;
    }
  }

  async bulkImportPhoneNumbers(numbers: Omit<PhoneNumber, 'id'>[]): Promise<{ success: number; failed: number; errors: string[] }> {
    const results = { success: 0, failed: 0, errors: [] as string[] };
    
    try {
      const databaseData = numbers.map(this.mapPhoneNumberToDatabase);
      const result = await browserDatabase.bulkInsertPhoneNumbers(databaseData);
      
      results.success = result.success;
      results.failed = result.failed;
      
      if (result.failed > 0) {
        results.errors.push(`${result.failed} numbers failed to import`);
      }
    } catch (error) {
      results.failed = numbers.length;
      results.errors.push(`Bulk import failed: ${error}`);
    }
    
    await this.addAuditEntry(`Bulk import completed: ${results.success} success, ${results.failed} failed`, 'system', 'import');
    return results;
  }

  async bulkReserveNumbers(numberIds: string[], projectName: string): Promise<{ success: number; failed: number; errors: string[] }> {
    const results = { success: 0, failed: 0, errors: [] as string[] };
    
    try {
      const reservedUntil = new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString(); // 90 days from now
      
      for (const id of numberIds) {
        const phoneNumber = await browserDatabase.getPhoneNumberById(id);
        if (phoneNumber && phoneNumber.status === 'available') {
          const updated = await browserDatabase.updatePhoneNumber(id, {
            status: 'reserved',
            project: projectName,
            reserved_until: reservedUntil
          });
          
          if (updated) {
            results.success++;
          } else {
            results.failed++;
          }
        } else {
          results.failed++;
        }
      }

      await this.addAuditEntry(`Bulk reserved ${results.success} numbers for project: ${projectName}`, 'system', 'assignment');
    } catch (error) {
      results.failed = numberIds.length;
      results.errors.push(`Bulk reservation failed: ${error}`);
    }

    return results;
  }

  // Number Ranges (FastAPI backend)
  async getNumberRanges(): Promise<NumberRange[]> {
    try {
      const { ranges } = await apiService.getNumberRanges();
      return ranges.map(this.mapApiRangeToNumberRange);
    } catch (error) {
      console.error('Error fetching number ranges from FastAPI:', error);
      return [];
    }
  }

  async addNumberRange(range: Omit<NumberRange, 'id'>): Promise<NumberRange> {
    try {
      const payload = {
        name: range.name,
        pattern: range.pattern,
        start_number: range.startNumber,
        end_number: range.endNumber,
        total_numbers: range.totalNumbers,
        available_numbers: range.availableNumbers,
        assigned_numbers: range.assignedNumbers,
        reserved_numbers: range.reservedNumbers,
        carrier: range.carrier,
        location: range.location,
        department: range.department,
        date_created: range.dateCreated,
        notes: range.notes,
        status: range.status,
        project: range.project,
      };
      const created = await apiService.createNumberRange(payload as any);
      const newRange = this.mapApiRangeToNumberRange(created as any);
      await this.addAuditEntry(`Number range ${range.name} created`, 'system', 'settings');
      return newRange;
    } catch (error) {
      console.error('Error adding number range via FastAPI:', error);
      throw error;
    }
  }

  // Bulk Operations
  async getBulkOperations(): Promise<BulkOperation[]> {
    try {
      const data = await browserDatabase.getAllBulkOperations();
      return data.map(this.mapDatabaseToBulkOperation);
    } catch (error) {
      console.error('Error fetching bulk operations:', error);
      return [];
    }
  }

  async addBulkOperation(operation: Omit<BulkOperation, 'id'>): Promise<BulkOperation> {
    try {
      const databaseData = this.mapBulkOperationToDatabase(operation);
      const data = await browserDatabase.insertBulkOperation(databaseData);
      return this.mapDatabaseToBulkOperation(data);
    } catch (error) {
      console.error('Error adding bulk operation:', error);
      throw error;
    }
  }

  // PBX Systems (FastAPI backend)
  private pbxSystems: PBXSystem[] = [];

  async getPBXSystems(): Promise<PBXSystem[]> {
    try {
      const { systems } = await apiService.getPBXSystems();
      this.pbxSystems = systems.map(this.mapApiPBXToPBXSystem);
      return [...this.pbxSystems];
    } catch (error) {
      console.error('Error fetching PBX systems from FastAPI:', error);
      return [];
    }
  }

  async addPBXSystem(system: Omit<PBXSystem, 'id'>): Promise<PBXSystem> {
    try {
      const created = await apiService.createPBXSystem({
        name: system.name,
        type: system.type,
        status: system.status,
        last_sync: system.lastSync,
        numbers_managed: system.numbersManaged,
        sync_enabled: system.syncEnabled,
        endpoint: system.endpoint,
        version: system.version,
        health: system.health,
        auth_type: 'api_key',
        credentials: {},
        connection_settings: {
          timeout: 30,
          retryAttempts: 3,
          validateSsl: true,
        },
        sync_settings: {
          dataMapping: {},
        },
      });
      const mapped = this.mapApiPBXToPBXSystem(created as any);
      this.pbxSystems.push(mapped);
      await this.addAuditEntry(`PBX system ${system.name} connected`, 'system', 'sync');
      return mapped;
    } catch (error) {
      console.error('Error adding PBX system via FastAPI:', error);
      throw error;
    }
  }

  async updatePBXSystem(id: string, updates: Partial<PBXSystem>): Promise<PBXSystem | null> {
    try {
      const numericId = Number(id);
      if (Number.isNaN(numericId)) {
        console.error('updatePBXSystem: invalid id', id);
        return null;
      }
      const payload: any = {
        name: updates.name,
        type: updates.type,
        status: updates.status,
        last_sync: updates.lastSync,
        numbers_managed: updates.numbersManaged,
        sync_enabled: updates.syncEnabled,
        endpoint: updates.endpoint,
        version: updates.version,
        health: updates.health,
      };
      const updated = await apiService.updatePBXSystem(numericId, payload);
      const mapped = this.mapApiPBXToPBXSystem(updated as any);
      const idx = this.pbxSystems.findIndex(s => s.id === String(mapped.id));
      if (idx >= 0) {
        this.pbxSystems[idx] = mapped;
      }
      await this.addAuditEntry(`PBX system ${mapped.name} updated`, 'system', 'sync');
      return mapped;
    } catch (error) {
      console.error('Error updating PBX system via FastAPI:', error);
      return null;
    }
  }

  async deletePBXSystem(id: string): Promise<boolean> {
    try {
      const numericId = Number(id);
      if (Number.isNaN(numericId)) {
        console.error('deletePBXSystem: invalid id', id);
        return false;
      }
      await apiService.deletePBXSystem(numericId);
      this.pbxSystems = this.pbxSystems.filter(s => s.id !== id);
      await this.addAuditEntry(`PBX system ${id} deleted`, 'system', 'sync');
      return true;
    } catch (error) {
      console.error('Error deleting PBX system via FastAPI:', error);
      return false;
    }
  }

  async runPBXSync(systemId: string, type: 'full' | 'incremental' | 'validation' = 'incremental') {
    const numericId = Number(systemId);
    if (Number.isNaN(numericId)) {
      console.error('runPBXSync: invalid id', systemId);
      throw new Error('Invalid PBX system id');
    }
    const result = await apiService.runPBXSync(numericId, type);
    // Refresh local cache of systems to reflect updated last_sync, numbers_managed, status, health
    const { systems } = await apiService.getPBXSystems();
    this.pbxSystems = systems.map(this.mapApiPBXToPBXSystem);
    return result;
  }

  async getPBXSyncRuns(systemId: string, limit?: number): Promise<PBXSyncRun[]> {
    const numericId = Number(systemId);
    if (Number.isNaN(numericId)) {
      console.error('getPBXSyncRuns: invalid id', systemId);
      return [];
    }
    const { runs } = await apiService.getPBXSyncRuns(numericId, limit);
    return runs;
  }

  // Audit Log (FastAPI backend)
  async getAuditLog(filters: any = {}): Promise<AuditLogEntry[]> {
    try {
      const params: any = {};
      if (filters.user) params.user = filters.user;
      if (filters.action) params.action = filters.action;
      if (filters.date) params.date = filters.date;

      const { events } = await apiService.getAuditLog(params);
      return events.map(this.mapDatabaseToAuditEntry);
    } catch (error) {
      console.error('Error fetching audit log (FastAPI):', error);
      return [];
    }
  }

  private async addAuditEntry(action: string, user: string, type: AuditLogEntry['type'], details?: any): Promise<void> {
    try {
      await browserDatabase.insertAuditEntry({
        action,
        user,
        timestamp: new Date().toISOString(),
        type,
        details
      });
    } catch (error) {
      console.error('Error adding audit entry:', error);
    }
  }

  // Webhooks (FastAPI backend)
  async getWebhooks(): Promise<any[]> {
    try {
      const { webhooks } = await apiService.getWebhooks();
      return webhooks;
    } catch (error) {
      console.error('Error fetching webhooks from FastAPI:', error);
      return [];
    }
  }

  async createWebhook(name: string, url: string, event_types: string[]): Promise<any> {
    try {
      const webhook = await apiService.createWebhook(name, url, event_types);
      return webhook;
    } catch (error) {
      console.error('Error creating webhook via FastAPI:', error);
      throw error;
    }
  }

  async updateWebhook(id: string, updates: any): Promise<any | null> {
    try {
      const updated = await apiService.updateWebhook(Number(id), updates);
      return updated;
    } catch (error) {
      console.error('Error updating webhook via FastAPI:', error);
      return null;
    }
  }

  async deleteWebhook(id: string): Promise<boolean> {
    try {
      await apiService.deleteWebhook(Number(id));
      return true;
    } catch (error) {
      console.error('Error deleting webhook via FastAPI:', error);
      return false;
    }
  }

  async getWebhookDeliveries(
    filters: { limit?: number; webhookId?: string; eventType?: string; importId?: string } = {}
  ): Promise<WebhookDelivery[]> {
    try {
      const params: any = {};
      if (filters.limit) params.limit = filters.limit;
      if (filters.webhookId) params.webhook_id = Number(filters.webhookId);
      if (filters.eventType) params.event_type = filters.eventType;
      if (filters.importId) params.import_id = filters.importId;
      const { deliveries } = await apiService.getWebhookDeliveries(params);
      return deliveries;
    } catch (error) {
      console.error('Error fetching webhook deliveries (FastAPI):', error);
      return [];
    }
  }

  // Tags
  async getTags(): Promise<any[]> {
    try {
      const { tags } = await apiService.getTags();
      return tags;
    } catch (error) {
      console.error('Error fetching tags (FastAPI):', error);
      return [];
    }
  }

  async createTag(name: string, color: string): Promise<any> {
    try {
      const tag = await apiService.createTag(name, color);
      return tag;
    } catch (error) {
      console.error('Error creating tag (FastAPI):', error);
      throw error;
    }
  }

  async updateTag(id: string, updates: any): Promise<any | null> {
    // FastAPI backend does not yet support tag update; emulate by delete+create is unsafe.
    // For now, just return null to indicate no-op.
    console.warn('updateTag is not implemented against FastAPI backend');
    return null;
  }

  async deleteTag(id: string): Promise<boolean> {
    try {
      await apiService.deleteTag(Number(id));
      return true;
    } catch (error) {
      console.error('Error deleting tag (FastAPI):', error);
      return false;
    }
  }

  async addTagToPhoneNumber(phoneNumberId: string, tagId: string): Promise<void> {
    try {
      await apiService.addTagToPhoneNumber(Number(phoneNumberId), Number(tagId));
    } catch (error) {
      console.error('Error adding tag to phone number (FastAPI):', error);
      throw error;
    }
  }

  async removeTagFromPhoneNumber(phoneNumberId: string, tagId: string): Promise<void> {
    try {
      await apiService.removeTagFromPhoneNumber(Number(phoneNumberId), Number(tagId));
    } catch (error) {
      console.error('Error removing tag from phone number (FastAPI):', error);
      throw error;
    }
  }

  // Saved Searches
  async getSavedSearches(): Promise<any[]> {
    try {
      const { saved_searches } = await apiService.getSavedSearches();
      return saved_searches;
    } catch (error) {
      console.error('Error fetching saved searches (FastAPI):', error);
      return [];
    }
  }

  async saveSearch(name: string, filters: any): Promise<any> {
    try {
      const saved = await apiService.saveSearch(name, filters);
      return saved;
    } catch (error) {
      console.error('Error saving search (FastAPI):', error);
      throw error;
    }
  }

  async deleteSearch(id: string): Promise<boolean> {
    try {
      await apiService.deleteSavedSearch(Number(id));
      return true;
    } catch (error) {
      console.error('Error deleting search (FastAPI):', error);
      return false;
    }
  }

  // Data Import/Export
  async exportAllData(): Promise<{
    phoneNumbers: PhoneNumber[];
    numberRanges: NumberRange[];
    pbxSystems: PBXSystem[];
    auditLog: AuditLogEntry[];
  }> {
    await this.addAuditEntry('Data export initiated', 'system', 'settings');
    return {
      phoneNumbers: await this.getPhoneNumbers(),
      numberRanges: await this.getNumberRanges(),
      pbxSystems: await this.getPBXSystems(),
      auditLog: await this.getAuditLog()
    };
  }

  async importData(data: {
    phoneNumbers?: PhoneNumber[];
    numberRanges?: NumberRange[];
    pbxSystems?: PBXSystem[];
  }): Promise<{ success: boolean; message: string }> {
    try {
      if (data.phoneNumbers) {
        const databaseData = data.phoneNumbers.map(this.mapPhoneNumberToDatabase);
        await browserDatabase.bulkInsertPhoneNumbers(databaseData);
      }
      if (data.numberRanges) {
        for (const range of data.numberRanges) {
          const databaseData = this.mapNumberRangeToDatabase(range);
          await browserDatabase.insertNumberRange(databaseData);
        }
      }
      if (data.pbxSystems) {
        this.pbxSystems = data.pbxSystems;
      }
      
      await this.addAuditEntry('Data import completed successfully', 'system', 'import');
      return { success: true, message: 'Data imported successfully' };
    } catch (error) {
      await this.addAuditEntry(`Data import failed: ${error}`, 'system', 'import');
      return { success: false, message: `Import failed: ${error}` };
    }
  }

  // Clear all data (for testing/reset)
  async clearAllData(): Promise<void> {
    try {
      await browserDatabase.clearAllData();
      this.pbxSystems = [];
      await this.addAuditEntry('All data cleared', 'system', 'settings');
    } catch (error) {
      console.error('Error clearing data:', error);
    }
  }

  // Statistics (FastAPI backend)
  async getStatistics(): Promise<{
    totalNumbers: number;
    assignedNumbers: number;
    availableNumbers: number;
    agingNumbers: number;
    totalRanges: number;
    activeSystems: number;
  }> {
    try {
      const stats: StatisticsResponse = await apiService.getStatistics();

      return {
        totalNumbers: stats.total_phone_numbers,
        assignedNumbers: stats.assigned_numbers,
        availableNumbers: stats.available_numbers,
        agingNumbers: 0, // Backend does not yet expose aging separately
        totalRanges: stats.total_ranges,
        activeSystems: stats.systems_count,
      };
    } catch (error) {
      console.error('Error getting statistics from FastAPI:', error);
      return {
        totalNumbers: 0,
        assignedNumbers: 0,
        availableNumbers: 0,
        agingNumbers: 0,
        totalRanges: 0,
        activeSystems: 0,
      };
    }
  }

  // Mapping functions between our interfaces and database schema
  private mapPhoneNumberToDatabase(phoneNumber: Partial<PhoneNumber>): any {
    return {
      number: phoneNumber.number,
      status: phoneNumber.status,
      system: phoneNumber.system,
      carrier: phoneNumber.carrier,
      assigned_to: phoneNumber.assignedTo,
      notes: phoneNumber.notes,
      extension: phoneNumber.extension,
      department: phoneNumber.department,
      location: phoneNumber.location,
      date_assigned: phoneNumber.dateAssigned,
      date_available: phoneNumber.dateAvailable,
      last_used: phoneNumber.lastUsed,
      aging_days: phoneNumber.agingDays,
      number_type: phoneNumber.numberType,
      range_name: phoneNumber.range,
      project: phoneNumber.project,
      reserved_until: phoneNumber.reservedUntil,
      usage_inbound: phoneNumber.usage?.inbound,
      usage_outbound: phoneNumber.usage?.outbound,
      usage_last_activity: phoneNumber.usage?.lastActivity
    };
  }

  private mapDatabaseToPhoneNumber(data: any): PhoneNumber {
    return {
      id: data.id,
      number: data.number,
      status: data.status,
      system: data.system,
      carrier: data.carrier,
      assignedTo: data.assigned_to,
      notes: data.notes,
      extension: data.extension,
      department: data.department,
      location: data.location,
      dateAssigned: data.date_assigned,
      dateAvailable: data.date_available,
      lastUsed: data.last_used,
      agingDays: data.aging_days,
      numberType: data.number_type,
      range: data.range_name,
      project: data.project,
      reservedUntil: data.reserved_until,
      usage: {
        inbound: data.usage_inbound || 0,
        outbound: data.usage_outbound || 0,
        lastActivity: data.usage_last_activity,
      },
    };
  }

  // Map FastAPI phone number response to local PhoneNumber model
  private mapApiPhoneToPhoneNumber(api: PhoneNumberResponse): PhoneNumber {
    return {
      id: String(api.id),
      number: api.phone_number,
      status: (api.status as any) || 'available',
      system: api.system || 'Unassigned',
      carrier: '',
      assignedTo: api.assigned_to_name ?? null,
      notes: api.notes || '',
      extension: api.extension || '',
      department: api.assigned_to_department || '',
      location: '',
      dateAssigned: api.assigned_date || null,
      dateAvailable: null,
      lastUsed: null,
      agingDays: 0,
      numberType: 'local',
      range: '',
      project: api.assigned_to_project || null,
      reservedUntil: null,
      usage: {
        inbound: 0,
        outbound: 0,
        lastActivity: null,
      },
    };
  }

  private mapNumberRangeToDatabase(range: Partial<NumberRange>): any {
    return {
      name: range.name,
      pattern: range.pattern,
      start_number: range.startNumber,
      end_number: range.endNumber,
      total_numbers: range.totalNumbers,
      available_numbers: range.availableNumbers,
      assigned_numbers: range.assignedNumbers,
      reserved_numbers: range.reservedNumbers,
      carrier: range.carrier,
      location: range.location,
      department: range.department,
      date_created: range.dateCreated,
      notes: range.notes,
      status: range.status,
      project: range.project
    };
  }

  private mapDatabaseToNumberRange(data: any): NumberRange {
    return {
      id: data.id,
      name: data.name,
      pattern: data.pattern,
      startNumber: data.start_number,
      endNumber: data.end_number,
      totalNumbers: data.total_numbers,
      availableNumbers: data.available_numbers,
      assignedNumbers: data.assigned_numbers,
      reservedNumbers: data.reserved_numbers,
      carrier: data.carrier,
      location: data.location,
      department: data.department,
      dateCreated: data.date_created,
      notes: data.notes,
      status: data.status,
      project: data.project
    };
  }

  private mapApiRangeToNumberRange(api: any): NumberRange {
    return {
      id: String(api.id),
      name: api.name,
      pattern: api.pattern,
      startNumber: api.start_number,
      endNumber: api.end_number,
      totalNumbers: api.total_numbers,
      availableNumbers: api.available_numbers,
      assignedNumbers: api.assigned_numbers,
      reservedNumbers: api.reserved_numbers,
      carrier: api.carrier,
      location: api.location,
      department: api.department,
      dateCreated: api.date_created,
      notes: api.notes || '',
      status: api.status as any,
      project: api.project ?? null,
    };
  }

  private mapApiPBXToPBXSystem(api: any): PBXSystem {
    return {
      id: String(api.id),
      name: api.name,
      type: api.type,
      status: api.status as any,
      lastSync: api.last_sync || new Date().toISOString(),
      numbersManaged: api.numbers_managed ?? 0,
      syncEnabled: !!api.sync_enabled,
      endpoint: api.endpoint,
      version: api.version || 'Unknown',
      health: api.health as any,
    };
  }

  private mapBulkOperationToDatabase(operation: Partial<BulkOperation>): any {
    return {
      type: operation.type,
      status: operation.status,
      progress: operation.progress,
      total_items: operation.totalItems,
      processed_items: operation.processedItems,
      failed_items: operation.failedItems,
      start_time: operation.startTime,
      end_time: operation.endTime,
      details: operation.details,
      results: operation.results
    };
  }

  private mapDatabaseToBulkOperation(data: any): BulkOperation {
    return {
      id: data.id,
      type: data.type,
      status: data.status,
      progress: data.progress,
      totalItems: data.total_items,
      processedItems: data.processed_items,
      failedItems: data.failed_items,
      startTime: data.start_time,
      endTime: data.end_time,
      details: data.details,
      results: data.results ? JSON.parse(data.results) : undefined
    };
  }

  private mapDatabaseToAuditEntry(data: any): AuditLogEntry {
    return {
      id: data.id,
      action: data.action,
      user: data.user,
      timestamp: data.timestamp,
      type: data.type,
      details: data.details ? JSON.parse(data.details) : undefined
    };
  }
}

// Export singleton instance
export const dataService = new DataService();

// Helper functions for CSV import/export
export const parseCSV = (csvContent: string): any[] => {
  const lines = csvContent.split('\n');
  const headers = lines[0].split(',').map(h => h.trim());
  const data = [];

  for (let i = 1; i < lines.length; i++) {
    if (lines[i].trim()) {
      const values = lines[i].split(',').map(v => v.trim());
      const row: any = {};
      headers.forEach((header, index) => {
        row[header] = values[index] || '';
      });
      data.push(row);
    }
  }

  return data;
};

export const generateCSV = (data: any[]): string => {
  if (data.length === 0) return '';
  
  const headers = Object.keys(data[0]);
  const csvContent = [
    headers.join(','),
    ...data.map(row => headers.map(header => row[header] || '').join(','))
  ].join('\n');
  
  return csvContent;
};