import cron from 'node-cron';
import { dataService } from './dataService';
import GenesysCloudApiClient from '../lib/genesysCloudApiClient';

class SyncService {
  private static instance: SyncService;

  private constructor() {
    this.init();
  }

  public static getInstance(): SyncService {
    if (!SyncService.instance) {
      SyncService.instance = new SyncService();
    }
    return SyncService.instance;
  }

  private init() {
    // Schedule a sync job to run every night at midnight
    cron.schedule('0 0 * * *', () => {
      this.runSync();
    });
  }

  public async runSync() {
    console.log('Running scheduled PBX sync...');
    const pbxSystems = await dataService.getPBXSystems();
    for (const system of pbxSystems) {
      if (system.syncEnabled) {
        console.log(`Syncing with ${system.name}...`);
        if (system.type === 'genesys') {
          const { GENESYS_CLIENT_ID, GENESYS_CLIENT_SECRET, GENESYS_API_URL } = process.env;
          if (GENESYS_CLIENT_ID && GENESYS_CLIENT_SECRET && GENESYS_API_URL) {
            const client = new GenesysCloudApiClient(GENESYS_CLIENT_ID, GENESYS_CLIENT_SECRET, GENESYS_API_URL);
            const phoneNumbers = await client.getPhoneNumbers();
            
            const numbers = phoneNumbers.map((p) => ({
              number: p.name,
              status: 'available',
              system: 'Genesys Cloud',
              carrier: '',
              assignedTo: null,
              notes: '',
              extension: '',
              department: '',
              location: '',
              dateAssigned: null,
              dateAvailable: null,
              lastUsed: null,
              agingDays: 0,
              numberType: 'local',
              range: '',
              project: null,
              reservedUntil: null,
              usage: {
                inbound: 0,
                outbound: 0,
                lastActivity: null,
              },
            }));
            await dataService.bulkImportPhoneNumbers(numbers);
          } else {
            console.error('Genesys Cloud credentials are not configured in the environment variables.');
          }
        }
      }
    }
    console.log('Scheduled PBX sync complete.');
  }
}

export const syncService = SyncService.getInstance();
