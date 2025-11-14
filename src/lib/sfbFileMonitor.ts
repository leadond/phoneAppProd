import fs from 'fs';
import path from 'path';
import { promisify } from 'util';
import { createHash } from 'crypto';
import { EventEmitter } from 'events';
import { localDatabase } from './localDatabase';

const readFile = promisify(fs.readFile);
const readdir = promisify(fs.readdir);
const stat = promisify(fs.stat);
const access = promisify(fs.access);

export interface SfBUser {
  sip_address: string;
  display_name: string;
  first_name?: string;
  last_name?: string;
  user_principal_name?: string;
  line_uri?: string;
  phone_number?: string;
  enterprise_voice_enabled?: boolean;
  hosted_voicemail_enabled?: boolean;
  department?: string;
  title?: string;
  office?: string;
  company?: string;
  manager?: string;
  enabled?: boolean;
  registrar_pool?: string;
  voice_policy?: string;
  dial_plan?: string;
  location_policy?: string;
  conferencing_policy?: string;
  external_access_policy?: string;
  mobility_policy?: string;
  client_policy?: string;
  pin_policy?: string;
  archiving_policy?: string;
  exchange_archiving_policy?: string;
  retention_policy?: string;
  call_via_work_policy?: string;
  client_version_policy?: string;
  hosted_voice_mail_enabled?: boolean;
  private_line?: string;
}

export interface FileMonitorEntry {
  file_path: string;
  file_name: string;
  file_size: number;
  file_hash: string;
  last_modified: string;
  processing_status: 'pending' | 'processing' | 'completed' | 'failed';
  processing_started_at?: string;
  processing_completed_at?: string;
  processing_duration?: number;
  records_processed?: number;
  records_inserted?: number;
  records_updated?: number;
  records_failed?: number;
  error_message?: string;
  error_details?: string;
  is_latest?: boolean;
}

export interface ProcessingResult {
  success: boolean;
  recordsProcessed: number;
  recordsInserted: number;
  recordsUpdated: number;
  recordsFailed: number;
  duration: number;
  errors?: string[];
}

export class SfBFileMonitor extends EventEmitter {
  private static instance: SfBFileMonitor;
  private watchPath: string;
  private filePattern: RegExp;
  private isMonitoring: boolean = false;
  private watchInterval: NodeJS.Timeout | null = null;
  private checkInterval: number = 15 * 60 * 1000; // 15 minutes in milliseconds
  private lastKnownFiles: Map<string, string> = new Map(); // fileName -> hash

  constructor(watchPath: string = 'c:\\sfbenabledobjects') {
    super();
    this.watchPath = watchPath;
    this.filePattern = /^SfbEnabledObjects_.+$/i;
    
    // Load system settings
    this.loadSettings();
  }

  public static getInstance(watchPath?: string): SfBFileMonitor {
    if (!SfBFileMonitor.instance) {
      SfBFileMonitor.instance = new SfBFileMonitor(watchPath);
    }
    return SfBFileMonitor.instance;
  }

  private loadSettings(): void {
    try {
      const pathSetting = localDatabase.getUCSystemSetting('sfb_file_monitor_path');
      if (pathSetting && pathSetting.setting_value) {
        this.watchPath = pathSetting.setting_value;
      }

      const intervalSetting = localDatabase.getUCSystemSetting('sfb_file_monitor_interval');
      if (intervalSetting && intervalSetting.setting_value) {
        this.checkInterval = parseInt(intervalSetting.setting_value, 10);
      }
    } catch (error) {
      console.warn('Failed to load SfB file monitor settings:', error);
    }
  }

  public async startMonitoring(): Promise<void> {
    if (this.isMonitoring) {
      console.log('SfB file monitor is already running');
      return;
    }

    try {
      // Check if directory exists
      await access(this.watchPath, fs.constants.F_OK);
      
      this.isMonitoring = true;
      
      // Initial scan
      await this.scanForFiles();
      
      // Set up periodic monitoring
      this.watchInterval = setInterval(async () => {
        try {
          await this.scanForFiles();
        } catch (error) {
          console.error('Error during file scan:', error);
          this.emit('error', error);
        }
      }, this.checkInterval);

      console.log(`SfB file monitor started, watching: ${this.watchPath}`);
      this.emit('started', { watchPath: this.watchPath, interval: this.checkInterval });
    } catch (error) {
      console.error(`Failed to start SfB file monitor for path: ${this.watchPath}`, error);
      this.emit('error', error);
      throw error;
    }
  }

  public stopMonitoring(): void {
    if (!this.isMonitoring) {
      return;
    }

    if (this.watchInterval) {
      clearInterval(this.watchInterval);
      this.watchInterval = null;
    }

    this.isMonitoring = false;
    this.lastKnownFiles.clear();
    
    console.log('SfB file monitor stopped');
    this.emit('stopped');
  }

  public async scanForFiles(): Promise<void> {
    try {
      const files = await readdir(this.watchPath);
      const sfbFiles = files.filter(file => this.filePattern.test(file));

      if (sfbFiles.length === 0) {
        return;
      }

      // Get file stats and sort by modification date (newest first)
      const fileStats = await Promise.all(
        sfbFiles.map(async (fileName) => {
          const filePath = path.join(this.watchPath, fileName);
          const stats = await stat(filePath);
          return {
            name: fileName,
            path: filePath,
            mtime: stats.mtime,
            size: stats.size
          };
        })
      );

      // Sort by modification time (newest first)
      fileStats.sort((a, b) => b.mtime.getTime() - a.mtime.getTime());

      // Check each file for changes
      for (const fileInfo of fileStats) {
        await this.checkFileForChanges(fileInfo);
      }

      // Process the latest file if it hasn't been processed yet
      if (fileStats.length > 0) {
        const latestFile = fileStats[0];
        const monitorEntry = await this.getFileMonitorEntry(latestFile.path);
        
        if (!monitorEntry || monitorEntry.processing_status === 'pending' || monitorEntry.processing_status === 'failed') {
          await this.processFile(latestFile.path, true); // Mark as latest
        }
      }
    } catch (error) {
      console.error('Error scanning for SfB files:', error);
      this.emit('error', error);
    }
  }

  private async checkFileForChanges(fileInfo: { name: string; path: string; mtime: Date; size: number }): Promise<void> {
    try {
      const fileHash = await this.calculateFileHash(fileInfo.path);
      const lastKnownHash = this.lastKnownFiles.get(fileInfo.name);

      if (!lastKnownHash || lastKnownHash !== fileHash) {
        // File is new or has changed
        this.lastKnownFiles.set(fileInfo.name, fileHash);
        
        // Check if we already have this file in our database
        const existing = await this.getFileMonitorEntry(fileInfo.path);
        
        if (!existing || existing.file_hash !== fileHash) {
          console.log(`New or modified SfB file detected: ${fileInfo.name}`);
          this.emit('fileDetected', {
            filePath: fileInfo.path,
            fileName: fileInfo.name,
            fileSize: fileInfo.size,
            lastModified: fileInfo.mtime.toISOString(),
            isNew: !existing
          });
          
          // Add to monitor database
          await this.addFileToMonitor(fileInfo.path, fileInfo.name, fileInfo.size, fileHash, fileInfo.mtime);
        }
      }
    } catch (error) {
      console.error(`Error checking file for changes: ${fileInfo.name}`, error);
    }
  }

  private async calculateFileHash(filePath: string): Promise<string> {
    const fileBuffer = await readFile(filePath);
    return createHash('md5').update(fileBuffer).digest('hex');
  }

  private async getFileMonitorEntry(filePath: string): Promise<any | null> {
    try {
      const entries = localDatabase.getAllSfBFileMonitorEntries();
      return entries.find(entry => entry.file_path === filePath) || null;
    } catch (error) {
      console.error('Error getting file monitor entry:', error);
      return null;
    }
  }

  private async addFileToMonitor(filePath: string, fileName: string, fileSize: number, fileHash: string, lastModified: Date): Promise<void> {
    try {
      const entry: FileMonitorEntry = {
        file_path: filePath,
        file_name: fileName,
        file_size: fileSize,
        file_hash: fileHash,
        last_modified: lastModified.toISOString(),
        processing_status: 'pending'
      };

      localDatabase.insertSfBFileMonitorEntry(entry);
    } catch (error) {
      console.error('Error adding file to monitor:', error);
      throw error;
    }
  }

  public async processFile(filePath: string, markAsLatest: boolean = false): Promise<ProcessingResult> {
    const startTime = Date.now();
    let recordsProcessed = 0;
    let recordsInserted = 0;
    let recordsUpdated = 0;
    let recordsFailed = 0;
    const errors: string[] = [];

    try {
      // Update processing status
      const monitorEntry = await this.getFileMonitorEntry(filePath);
      if (monitorEntry) {
        localDatabase.updateSfBUser(monitorEntry.id, {
          processing_status: 'processing',
          processing_started_at: new Date().toISOString()
        });
      }

      console.log(`Processing SfB file: ${path.basename(filePath)}`);
      this.emit('processingStarted', { filePath, markAsLatest });

      // Read and parse the file
      const fileContent = await readFile(filePath, 'utf8');
      const users = await this.parseFile(fileContent, path.basename(filePath));

      // Process users in batches
      const batchSize = 100;
      for (let i = 0; i < users.length; i += batchSize) {
        const batch = users.slice(i, i + batchSize);
        
        for (const user of batch) {
          try {
            recordsProcessed++;
            
            // Check if user already exists
            const existing = localDatabase.getSfBUserBySipAddress(user.sip_address);
            
            if (existing) {
              // Update existing user
              localDatabase.updateSfBUser(existing.id, {
                ...user,
                data_source: 'offline',
                last_sync_time: new Date().toISOString(),
                file_source: path.basename(filePath)
              });
              recordsUpdated++;
            } else {
              // Insert new user
              localDatabase.insertSfBUser({
                ...user,
                data_source: 'offline',
                last_sync_time: new Date().toISOString(),
                file_source: path.basename(filePath)
              });
              recordsInserted++;
            }
          } catch (userError) {
            recordsFailed++;
            const errorMsg = `Failed to process user ${user.sip_address}: ${userError instanceof Error ? userError.message : String(userError)}`;
            errors.push(errorMsg);
            console.error(errorMsg);
          }
        }
      }

      const duration = Date.now() - startTime;

      // Update processing status
      if (monitorEntry) {
        localDatabase.updateSfBUser(monitorEntry.id, {
          processing_status: 'completed',
          processing_completed_at: new Date().toISOString(),
          processing_duration: duration,
          records_processed: recordsProcessed,
          records_inserted: recordsInserted,
          records_updated: recordsUpdated,
          records_failed: recordsFailed,
          error_details: errors.length > 0 ? JSON.stringify(errors) : null,
          is_latest: markAsLatest ? 1 : 0
        });
      }

      // Record sync history
      localDatabase.insertSfBSyncHistory({
        sync_type: 'file_to_db',
        sync_source: filePath,
        sync_target: 'sfb_users_table',
        sync_status: 'completed',
        total_records: users.length,
        processed_records: recordsProcessed,
        successful_records: recordsInserted + recordsUpdated,
        failed_records: recordsFailed,
        sync_duration: duration,
        sync_summary: {
          inserted: recordsInserted,
          updated: recordsUpdated,
          failed: recordsFailed,
          errors: errors
        },
        triggered_by: 'file_monitor'
      });

      const result: ProcessingResult = {
        success: true,
        recordsProcessed,
        recordsInserted,
        recordsUpdated,
        recordsFailed,
        duration,
        errors: errors.length > 0 ? errors : undefined
      };

      console.log(`SfB file processing completed: ${recordsProcessed} processed, ${recordsInserted} inserted, ${recordsUpdated} updated, ${recordsFailed} failed`);
      this.emit('processingCompleted', { filePath, result });

      return result;
    } catch (error) {
      const duration = Date.now() - startTime;
      const errorMsg = error instanceof Error ? error.message : String(error);
      
      // Update processing status
      const monitorEntry = await this.getFileMonitorEntry(filePath);
      if (monitorEntry) {
        localDatabase.updateSfBUser(monitorEntry.id, {
          processing_status: 'failed',
          processing_completed_at: new Date().toISOString(),
          processing_duration: duration,
          error_message: errorMsg,
          error_details: JSON.stringify([errorMsg])
        });
      }

      // Record sync history
      localDatabase.insertSfBSyncHistory({
        sync_type: 'file_to_db',
        sync_source: filePath,
        sync_target: 'sfb_users_table',
        sync_status: 'failed',
        total_records: 0,
        processed_records: recordsProcessed,
        successful_records: recordsInserted + recordsUpdated,
        failed_records: recordsFailed,
        sync_duration: duration,
        error_message: errorMsg,
        triggered_by: 'file_monitor'
      });

      console.error(`Failed to process SfB file: ${filePath}`, error);
      this.emit('processingFailed', { filePath, error: errorMsg });

      return {
        success: false,
        recordsProcessed,
        recordsInserted,
        recordsUpdated,
        recordsFailed,
        duration,
        errors: [errorMsg]
      };
    }
  }

  private async parseFile(content: string, fileName: string): Promise<SfBUser[]> {
    const users: SfBUser[] = [];
    
    try {
      // Detect file format (CSV, JSON, XML, or custom)
      const trimmedContent = content.trim();
      
      if (trimmedContent.startsWith('[') || trimmedContent.startsWith('{')) {
        // JSON format
        return this.parseJsonFile(content);
      } else if (trimmedContent.includes(',') && trimmedContent.includes('\n')) {
        // CSV format
        return this.parseCsvFile(content);
      } else if (trimmedContent.startsWith('<')) {
        // XML format
        return this.parseXmlFile(content);
      } else {
        // Try to parse as tab-delimited or pipe-delimited
        return this.parseDelimitedFile(content);
      }
    } catch (error) {
      console.error(`Failed to parse SfB file ${fileName}:`, error);
      throw new Error(`Unsupported file format or corrupted file: ${fileName}`);
    }
  }

  private parseJsonFile(content: string): SfBUser[] {
    try {
      const data = JSON.parse(content);
      const users: SfBUser[] = [];
      
      // Handle different JSON structures
      const userArray = Array.isArray(data) ? data : (data.users || data.SfBUsers || [data]);
      
      for (const item of userArray) {
        if (item.SipAddress || item.sip_address) {
          const user = this.normalizeUserData(item);
          users.push(user);
        }
      }
      
      return users;
    } catch (error) {
      throw new Error(`Invalid JSON format: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  private parseCsvFile(content: string): SfBUser[] {
    const lines = content.split('\n');
    if (lines.length < 2) {
      throw new Error('CSV file must have at least a header and one data row');
    }

    const headers = lines[0].split(',').map(h => h.trim().replace(/"/g, ''));
    const users: SfBUser[] = [];

    for (let i = 1; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line) continue;

      const values = this.parseCsvLine(line);
      if (values.length !== headers.length) {
        console.warn(`Skipping line ${i + 1}: column count mismatch`);
        continue;
      }

      const userObj: any = {};
      headers.forEach((header, index) => {
        userObj[header] = values[index];
      });

      if (userObj.SipAddress || userObj.sip_address) {
        const user = this.normalizeUserData(userObj);
        users.push(user);
      }
    }

    return users;
  }

  private parseCsvLine(line: string): string[] {
    const values: string[] = [];
    let current = '';
    let inQuotes = false;
    
    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      
      if (char === '"') {
        inQuotes = !inQuotes;
      } else if (char === ',' && !inQuotes) {
        values.push(current.trim());
        current = '';
      } else {
        current += char;
      }
    }
    
    values.push(current.trim());
    return values;
  }

  private parseXmlFile(content: string): SfBUser[] {
    // Basic XML parsing - could be enhanced with a proper XML parser
    throw new Error('XML parsing not yet implemented. Please convert to JSON or CSV format.');
  }

  private parseDelimitedFile(content: string): SfBUser[] {
    // Try tab-delimited first, then pipe-delimited
    const lines = content.split('\n');
    if (lines.length < 2) {
      throw new Error('File must have at least a header and one data row');
    }

    let delimiter = '\t';
    if (!lines[0].includes('\t') && lines[0].includes('|')) {
      delimiter = '|';
    }

    const headers = lines[0].split(delimiter).map(h => h.trim());
    const users: SfBUser[] = [];

    for (let i = 1; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line) continue;

      const values = line.split(delimiter).map(v => v.trim());
      if (values.length !== headers.length) {
        console.warn(`Skipping line ${i + 1}: column count mismatch`);
        continue;
      }

      const userObj: any = {};
      headers.forEach((header, index) => {
        userObj[header] = values[index];
      });

      if (userObj.SipAddress || userObj.sip_address) {
        const user = this.normalizeUserData(userObj);
        users.push(user);
      }
    }

    return users;
  }

  private normalizeUserData(rawUser: any): SfBUser {
    // Extract phone number from LineURI
    const lineUri = rawUser.LineURI || rawUser.line_uri || '';
    const phoneNumber = this.extractPhoneNumber(lineUri);

    return {
      sip_address: rawUser.SipAddress || rawUser.sip_address || '',
      display_name: rawUser.DisplayName || rawUser.display_name || rawUser.Name || '',
      first_name: rawUser.FirstName || rawUser.first_name || rawUser.GivenName || null,
      last_name: rawUser.LastName || rawUser.last_name || rawUser.Surname || null,
      user_principal_name: rawUser.UserPrincipalName || rawUser.user_principal_name || rawUser.UPN || null,
      line_uri: lineUri || null,
      phone_number: phoneNumber || null,
      enterprise_voice_enabled: this.parseBoolean(rawUser.EnterpriseVoiceEnabled || rawUser.enterprise_voice_enabled),
      hosted_voicemail_enabled: this.parseBoolean(rawUser.HostedVoicemailEnabled || rawUser.hosted_voicemail_enabled),
      department: rawUser.Department || rawUser.department || null,
      title: rawUser.Title || rawUser.title || rawUser.JobTitle || null,
      office: rawUser.Office || rawUser.office || rawUser.OfficeLocation || null,
      company: rawUser.Company || rawUser.company || rawUser.Organization || null,
      manager: rawUser.Manager || rawUser.manager || null,
      enabled: this.parseBoolean(rawUser.Enabled || rawUser.enabled, true),
      registrar_pool: rawUser.RegistrarPool || rawUser.registrar_pool || rawUser.Pool || null,
      voice_policy: rawUser.VoicePolicy || rawUser.voice_policy || null,
      dial_plan: rawUser.DialPlan || rawUser.dial_plan || null,
      location_policy: rawUser.LocationPolicy || rawUser.location_policy || null,
      conferencing_policy: rawUser.ConferencingPolicy || rawUser.conferencing_policy || null,
      external_access_policy: rawUser.ExternalAccessPolicy || rawUser.external_access_policy || null,
      mobility_policy: rawUser.MobilityPolicy || rawUser.mobility_policy || null,
      client_policy: rawUser.ClientPolicy || rawUser.client_policy || null,
      pin_policy: rawUser.PinPolicy || rawUser.pin_policy || null,
      archiving_policy: rawUser.ArchivingPolicy || rawUser.archiving_policy || null,
      exchange_archiving_policy: rawUser.ExchangeArchivingPolicy || rawUser.exchange_archiving_policy || null,
      retention_policy: rawUser.RetentionPolicy || rawUser.retention_policy || null,
      call_via_work_policy: rawUser.CallViaWorkPolicy || rawUser.call_via_work_policy || null,
      client_version_policy: rawUser.ClientVersionPolicy || rawUser.client_version_policy || null,
      hosted_voice_mail_enabled: this.parseBoolean(rawUser.HostedVoiceMailEnabled || rawUser.hosted_voice_mail_enabled),
      private_line: rawUser.PrivateLine || rawUser.private_line || null
    };
  }

  private extractPhoneNumber(lineUri: string): string | null {
    if (!lineUri) return null;
    
    // Extract number from tel: URI format (e.g., "tel:+15551234567")
    const telMatch = lineUri.match(/tel:([+]?[\d\-\(\)\s]+)/i);
    if (telMatch) {
      // Clean up the phone number (remove non-digit characters except +)
      return telMatch[1].replace(/[^\d+]/g, '');
    }
    
    // If it's just a phone number
    const phoneMatch = lineUri.match(/([+]?[\d\-\(\)\s]{10,})/);
    if (phoneMatch) {
      return phoneMatch[1].replace(/[^\d+]/g, '');
    }
    
    return null;
  }

  private parseBoolean(value: any, defaultValue: boolean = false): boolean {
    if (typeof value === 'boolean') return value;
    if (typeof value === 'string') {
      const lower = value.toLowerCase();
      return lower === 'true' || lower === 'yes' || lower === '1' || lower === 'enabled';
    }
    if (typeof value === 'number') return value !== 0;
    return defaultValue;
  }

  public async getLatestFile(): Promise<any | null> {
    return localDatabase.getLatestSfBFile();
  }

  public async getFileHistory(): Promise<any[]> {
    return localDatabase.getAllSfBFileMonitorEntries();
  }

  public async getSyncHistory(): Promise<any[]> {
    return localDatabase.getSfBSyncHistory(50);
  }

  public getStatus(): { isMonitoring: boolean; watchPath: string; checkInterval: number } {
    return {
      isMonitoring: this.isMonitoring,
      watchPath: this.watchPath,
      checkInterval: this.checkInterval
    };
  }

  public async forceSync(): Promise<ProcessingResult> {
    const latestFile = await this.getLatestFile();
    if (!latestFile) {
      throw new Error('No SfB files found to process');
    }
    
    return this.processFile(latestFile.file_path, true);
  }
  }
}

// Export singleton instance
export const sfbFileMonitor = SfBFileMonitor.getInstance();