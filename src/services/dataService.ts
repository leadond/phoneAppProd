// Data service for managing phone numbers and related data
// This service uses browser-compatible IndexedDB for persistent data storage

import { browserDatabase } from '../lib/browserDatabase';
import { localAuth } from '../lib/localAuth';

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
  // Phone Numbers with pagination support
  async getPhoneNumbers(offset: number = 0, limit?: number): Promise<PhoneNumber[]> {
    try {
      const data = await browserDatabase.getAllPhoneNumbers(offset, limit);
      return data.map(this.mapDatabaseToPhoneNumber);
    } catch (error) {
      console.error('Error fetching phone numbers:', error);
      return [];
    }
  }

  // Get total count of phone numbers
  async getPhoneNumbersCount(): Promise<number> {
    try {
      return await browserDatabase.count('phone_numbers');
    } catch (error) {
      console.error('Error getting phone numbers count:', error);
      return 0;
    }
  }

  async addPhoneNumber(phoneNumber: Omit<PhoneNumber, 'id'>): Promise<PhoneNumber> {
    try {
      const databaseData = this.mapPhoneNumberToDatabase(phoneNumber);
      const data = await browserDatabase.insertPhoneNumber(databaseData);
      
      const newNumber = this.mapDatabaseToPhoneNumber(data);
      await this.addAuditEntry(`Phone number ${phoneNumber.number} added`, 'system', 'import');
      return newNumber;
    } catch (error) {
      console.error('Error adding phone number:', error);
      throw error;
    }
  }

  async updatePhoneNumber(id: string, updates: Partial<PhoneNumber>): Promise<PhoneNumber | null> {
    try {
      const databaseUpdates = this.mapPhoneNumberToDatabase(updates);
      const data = await browserDatabase.updatePhoneNumber(id, databaseUpdates);
      
      if (!data) return null;
      
      const updatedNumber = this.mapDatabaseToPhoneNumber(data);
      await this.addAuditEntry(`Phone number ${updatedNumber.number} updated`, 'system', 'assignment');
      return updatedNumber;
    } catch (error) {
      console.error('Error updating phone number:', error);
      return null;
    }
  }

  async deletePhoneNumber(id: string): Promise<boolean> {
    try {
      const phoneNumber = await browserDatabase.getPhoneNumberById(id);
      const success = await browserDatabase.deletePhoneNumber(id);
      
      if (success && phoneNumber) {
        await this.addAuditEntry(`Phone number ${phoneNumber.number} deleted`, 'system', 'release');
      }
      return success;
    } catch (error) {
      console.error('Error deleting phone number:', error);
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

  // Number Ranges
  async getNumberRanges(): Promise<NumberRange[]> {
    try {
      const data = await browserDatabase.getAllNumberRanges();
      return data.map(this.mapDatabaseToNumberRange);
    } catch (error) {
      console.error('Error fetching number ranges:', error);
      return [];
    }
  }

  async addNumberRange(range: Omit<NumberRange, 'id'>): Promise<NumberRange> {
    try {
      const databaseData = this.mapNumberRangeToDatabase(range);
      const data = await browserDatabase.insertNumberRange(databaseData);
      
      const newRange = this.mapDatabaseToNumberRange(data);
      await this.addAuditEntry(`Number range ${range.name} created`, 'system', 'settings');
      return newRange;
    } catch (error) {
      console.error('Error adding number range:', error);
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

  // PBX Systems (keeping in-memory for now as these are typically configuration)
  private pbxSystems: PBXSystem[] = [];

  async getPBXSystems(): Promise<PBXSystem[]> {
    return [...this.pbxSystems];
  }

  async addPBXSystem(system: Omit<PBXSystem, 'id'>): Promise<PBXSystem> {
    const newSystem: PBXSystem = {
      ...system,
      id: Date.now().toString()
    };
    this.pbxSystems.push(newSystem);
    await this.addAuditEntry(`PBX system ${system.name} connected`, 'system', 'sync');
    return newSystem;
  }

  // Audit Log
  async getAuditLog(): Promise<AuditLogEntry[]> {
    try {
      const data = await browserDatabase.getAllAuditEntries(100);
      return data.map(this.mapDatabaseToAuditEntry);
    } catch (error) {
      console.error('Error fetching audit log:', error);
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

  // Statistics
  async getStatistics(): Promise<{
    totalNumbers: number;
    assignedNumbers: number;
    availableNumbers: number;
    agingNumbers: number;
    totalRanges: number;
    activeSystems: number;
  }> {
    try {
      const stats = await browserDatabase.getStatistics();
      const pbxSystems = await this.getPBXSystems();
      
      return {
        ...stats,
        activeSystems: pbxSystems.filter(s => s.status === 'connected').length
      };
    } catch (error) {
      console.error('Error getting statistics:', error);
      return {
        totalNumbers: 0,
        assignedNumbers: 0,
        availableNumbers: 0,
        agingNumbers: 0,
        totalRanges: 0,
        activeSystems: 0
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
        lastActivity: data.usage_last_activity
      }
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