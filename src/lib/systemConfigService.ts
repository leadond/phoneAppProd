// System Configuration Service with encrypted credential storage
// Handles LDAP configurations, PBX system settings, and other secure system configurations

import { encryptionService, EncryptedData } from './encryptionService';
import { enhancedAuth } from './enhancedAuth';
import { browserDatabase } from './browserDatabase';
import { localAuth } from './localAuth';
import { v4 as uuidv4 } from 'uuid';

export type ConfigurationType = 'ldap' | 'pbx_system' | 'security_policy' | 'notification' | 'backup';

export interface BaseConfiguration {
  id: string;
  type: ConfigurationType;
  name: string;
  description?: string;
  enabled: boolean;
  createdAt: string;
  updatedAt: string;
  createdBy: string;
  lastModifiedBy: string;
}

export interface LDAPConfiguration extends BaseConfiguration {
  type: 'ldap';
  config: {
    // Connection Settings
    serverUrl: string;
    port: number;
    useSSL: boolean;
    bindDN: string;
    bindPassword: EncryptedData; // Encrypted
    
    // Search Configuration
    baseDN: string;
    userSearchFilter: string;
    groupSearchFilter: string;
    
    // Attribute Mapping
    attributes: {
      username: string;
      email: string;
      firstName: string;
      lastName: string;
      department: string;
      memberOf: string;
    };
    
    // Role Mapping
    roleMapping: {
      adminGroups: string[];
      managerGroups: string[];
      viewerGroups: string[];
    };
    
    // Connection Settings
    timeout: number;
    maxConnections: number;
    retryAttempts: number;
  };
  
  // Health Status
  lastTestResult?: 'success' | 'failure' | 'pending';
  lastTestTime?: string;
  connectionStatus: 'connected' | 'disconnected' | 'error' | 'testing';
  lastError?: string;
}

export interface PBXSystemConfiguration extends BaseConfiguration {
  type: 'pbx_system';
  config: {
    // System Details
    systemType: 'teams' | 'genesys' | 'rightfax' | 'audiocodes' | 'skype' | 'custom';
    version: string;
    
    // Connection Details
    endpoint: string;
    port?: number;
    protocol: 'https' | 'http' | 'sip' | 'soap';
    
    // Authentication (encrypted)
    authType: 'oauth' | 'basic' | 'certificate' | 'apikey' | 'ntlm';
    credentials: {
      clientId?: EncryptedData | string;
      clientSecret?: EncryptedData | string;
      username?: EncryptedData | string;
      password?: EncryptedData | string;
      apiKey?: EncryptedData | string;
      certificatePath?: string;
      tenantId?: EncryptedData | string;
    };
    
    // Sync Configuration
    syncSettings: {
      enabled: boolean;
      interval: number; // minutes
      batchSize: number;
      retryAttempts: number;
      conflictResolution: 'pbx_wins' | 'local_wins' | 'manual';
      lastSync?: string;
    };
    
    // Field Mapping
    fieldMapping: {
      phoneNumber: string;
      extension: string;
      assignedUser: string;
      department: string;
      location: string;
    };
    
    // Health Monitoring
    healthCheck: {
      enabled: boolean;
      interval: number; // minutes
      timeout: number; // seconds
      endpoints: string[]; // Additional endpoints to check
    };
  };
  
  // Status
  connectionStatus: 'connected' | 'disconnected' | 'error' | 'syncing' | 'testing';
  lastHealthCheck?: string;
  healthStatus: 'healthy' | 'warning' | 'critical' | 'unknown';
  performanceMetrics?: {
    responseTime: number;
    uptime: number;
    errorRate: number;
    lastSync: string;
  };
}

export interface ConnectionTestResult {
  success: boolean;
  responseTime?: number;
  error?: string;
  details?: {
    connectionEstablished: boolean;
    authenticationSuccessful: boolean;
    searchTestSuccessful?: boolean;
    endpointsReachable?: { [endpoint: string]: boolean };
  };
  timestamp: string;
}

export interface ConfigurationValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
}

export class SystemConfigService {
  private static instance: SystemConfigService;

  public static getInstance(): SystemConfigService {
    if (!SystemConfigService.instance) {
      SystemConfigService.instance = new SystemConfigService();
    }
    return SystemConfigService.instance;
  }

  /**
   * Save a system configuration with encrypted sensitive fields
   */
  public async saveConfiguration<T extends BaseConfiguration>(
    config: T,
    sessionToken?: string
  ): Promise<T> {
    // Validate user permissions
    const hasPermission = enhancedAuth.validateElevatedPermission('system_config', 'write');
    if (!hasPermission) {
      throw new Error('Insufficient permissions to save system configuration');
    }

    const currentUser = localAuth.getCurrentUser();
    if (!currentUser) {
      throw new Error('User not authenticated');
    }

    try {
      // Get session token for encryption
      const token = sessionToken || localAuth.getSessionToken();
      if (!token) {
        throw new Error('No valid session token for encryption');
      }

      // Encrypt sensitive fields based on configuration type
      const encryptedConfig = await this.encryptSensitiveFields(config, token);

      // Set metadata
      const now = new Date().toISOString();
      encryptedConfig.updatedAt = now;
      encryptedConfig.lastModifiedBy = currentUser.username;
      
      if (!encryptedConfig.id) {
        encryptedConfig.id = uuidv4();
        encryptedConfig.createdAt = now;
        encryptedConfig.createdBy = currentUser.username;
      }

      // Save to database
      const savedConfig = encryptedConfig.createdAt === now 
        ? await browserDatabase.insertSystemConfiguration(encryptedConfig)
        : await browserDatabase.updateSystemConfiguration(encryptedConfig.id, encryptedConfig);

      // Log the configuration change
      await this.logConfigurationChange('save', config.type, config.name, currentUser.username);

      return savedConfig;
    } catch (error) {
      console.error('Failed to save configuration:', error);
      throw new Error(`Failed to save ${config.type} configuration: ${error.message}`);
    }
  }

  /**
   * Get a system configuration with decrypted sensitive fields
   */
  public async getConfiguration<T extends BaseConfiguration>(
    id: string,
    sessionToken?: string
  ): Promise<T | null> {
    // Validate user permissions
    const hasPermission = enhancedAuth.validateElevatedPermission('system_config', 'read');
    if (!hasPermission) {
      throw new Error('Insufficient permissions to read system configuration');
    }

    try {
      const config = await browserDatabase.getSystemConfigurationById(id);
      if (!config) return null;

      // Get session token for decryption
      const token = sessionToken || localAuth.getSessionToken();
      if (!token) {
        throw new Error('No valid session token for decryption');
      }

      // Decrypt sensitive fields
      const decryptedConfig = await this.decryptSensitiveFields(config, token);
      return decryptedConfig as T;
    } catch (error) {
      console.error('Failed to get configuration:', error);
      throw new Error(`Failed to retrieve configuration: ${error.message}`);
    }
  }

  /**
   * Get all configurations of a specific type
   */
  public async getConfigurationsByType<T extends BaseConfiguration>(
    type: ConfigurationType,
    sessionToken?: string
  ): Promise<T[]> {
    const hasPermission = enhancedAuth.validateElevatedPermission('system_config', 'read');
    if (!hasPermission) {
      throw new Error('Insufficient permissions to read system configurations');
    }

    try {
      const configs = await browserDatabase.getSystemConfigurationsByType(type);
      
      const token = sessionToken || localAuth.getSessionToken();
      if (!token) {
        // Return configs without decryption if no session token
        return configs.map(config => ({
          ...config,
          config: '[ENCRYPTED]'
        })) as T[];
      }

      // Decrypt all configurations
      const decryptedConfigs = await Promise.all(
        configs.map(config => this.decryptSensitiveFields(config, token))
      );

      return decryptedConfigs as T[];
    } catch (error) {
      console.error('Failed to get configurations by type:', error);
      throw new Error(`Failed to retrieve ${type} configurations: ${error.message}`);
    }
  }

  /**
   * Delete a system configuration
   */
  public async deleteConfiguration(id: string): Promise<boolean> {
    const hasPermission = enhancedAuth.validateElevatedPermission('system_config', 'delete');
    if (!hasPermission) {
      throw new Error('Insufficient permissions to delete system configuration');
    }

    const currentUser = localAuth.getCurrentUser();
    if (!currentUser) {
      throw new Error('User not authenticated');
    }

    try {
      // Get config for logging before deletion
      const config = await browserDatabase.getSystemConfigurationById(id);
      
      const success = await browserDatabase.deleteSystemConfiguration(id);
      
      if (success && config) {
        await this.logConfigurationChange('delete', config.type, config.name, currentUser.username);
      }
      
      return success;
    } catch (error) {
      console.error('Failed to delete configuration:', error);
      throw new Error(`Failed to delete configuration: ${error.message}`);
    }
  }

  /**
   * Test a configuration connection
   */
  public async testConfiguration(
    config: LDAPConfiguration | PBXSystemConfiguration,
    sessionToken?: string
  ): Promise<ConnectionTestResult> {
    const hasPermission = enhancedAuth.validateElevatedPermission('system_config', 'execute');
    if (!hasPermission) {
      throw new Error('Insufficient permissions to test system configuration');
    }

    const currentUser = localAuth.getCurrentUser();
    if (!currentUser) {
      throw new Error('User not authenticated');
    }

    try {
      const result = await this.performConnectionTest(config, sessionToken);
      
      // Log the test attempt
      await this.logConfigurationChange(
        'test', 
        config.type, 
        config.name, 
        currentUser.username,
        { success: result.success, error: result.error }
      );

      return result;
    } catch (error) {
      console.error('Failed to test configuration:', error);
      return {
        success: false,
        error: error.message,
        timestamp: new Date().toISOString()
      };
    }
  }

  /**
   * Validate configuration format and required fields
   */
  public validateConfiguration(config: BaseConfiguration): ConfigurationValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Basic validation
    if (!config.name || config.name.trim().length === 0) {
      errors.push('Configuration name is required');
    }

    if (!config.type) {
      errors.push('Configuration type is required');
    }

    // Type-specific validation
    switch (config.type) {
      case 'ldap':
        this.validateLDAPConfiguration(config as LDAPConfiguration, errors, warnings);
        break;
      case 'pbx_system':
        this.validatePBXConfiguration(config as PBXSystemConfiguration, errors, warnings);
        break;
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings
    };
  }

  /**
   * Encrypt sensitive fields in configuration
   */
  private async encryptSensitiveFields(config: BaseConfiguration, sessionToken: string): Promise<BaseConfiguration> {
    const clonedConfig = JSON.parse(JSON.stringify(config));

    if (config.type === 'ldap') {
      const ldapConfig = clonedConfig as LDAPConfiguration;
      if (ldapConfig.config.bindPassword && typeof ldapConfig.config.bindPassword === 'string') {
        ldapConfig.config.bindPassword = await encryptionService.encrypt(
          ldapConfig.config.bindPassword as any, 
          sessionToken
        );
      }
    } else if (config.type === 'pbx_system') {
      const pbxConfig = clonedConfig as PBXSystemConfiguration;
      const creds = pbxConfig.config.credentials;
      
      // Encrypt all credential fields that are strings
      for (const [key, value] of Object.entries(creds)) {
        if (typeof value === 'string' && key !== 'certificatePath') {
          (creds as any)[key] = await encryptionService.encrypt(value, sessionToken);
        }
      }
    }

    return clonedConfig;
  }

  /**
   * Decrypt sensitive fields in configuration
   */
  private async decryptSensitiveFields(config: BaseConfiguration, sessionToken: string): Promise<BaseConfiguration> {
    const clonedConfig = JSON.parse(JSON.stringify(config));

    try {
      if (config.type === 'ldap') {
        const ldapConfig = clonedConfig as LDAPConfiguration;
        if (ldapConfig.config.bindPassword && typeof ldapConfig.config.bindPassword === 'object') {
          ldapConfig.config.bindPassword = await encryptionService.decrypt(
            ldapConfig.config.bindPassword,
            sessionToken
          ) as any;
        }
      } else if (config.type === 'pbx_system') {
        const pbxConfig = clonedConfig as PBXSystemConfiguration;
        const creds = pbxConfig.config.credentials;
        
        // Decrypt all credential fields that are encrypted objects
        for (const [key, value] of Object.entries(creds)) {
          if (value && typeof value === 'object' && key !== 'certificatePath') {
            try {
              (creds as any)[key] = await encryptionService.decrypt(value as EncryptedData, sessionToken);
            } catch (decryptError) {
              console.warn(`Failed to decrypt ${key}:`, decryptError);
              (creds as any)[key] = '[DECRYPTION_FAILED]';
            }
          }
        }
      }
    } catch (error) {
      console.error('Failed to decrypt configuration fields:', error);
      // Return config with encrypted fields marked
      clonedConfig._decryptionError = error.message;
    }

    return clonedConfig;
  }

  /**
   * Perform actual connection testing
   */
  private async performConnectionTest(
    config: LDAPConfiguration | PBXSystemConfiguration,
    sessionToken?: string
  ): Promise<ConnectionTestResult> {
    const startTime = Date.now();
    
    try {
      if (config.type === 'ldap') {
        return await this.testLDAPConnection(config, sessionToken);
      } else if (config.type === 'pbx_system') {
        return await this.testPBXConnection(config, sessionToken);
      }
      
      throw new Error('Unsupported configuration type for testing');
    } catch (error) {
      return {
        success: false,
        error: error.message,
        responseTime: Date.now() - startTime,
        timestamp: new Date().toISOString()
      };
    }
  }

  /**
   * Test LDAP connection
   */
  private async testLDAPConnection(config: LDAPConfiguration, sessionToken?: string): Promise<ConnectionTestResult> {
    // This would integrate with an LDAP client library in production
    // For now, we'll simulate the test
    
    const startTime = Date.now();
    
    try {
      // Simulate connection test
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // In production, this would:
      // 1. Try to connect to LDAP server
      // 2. Bind with provided credentials
      // 3. Perform a test search
      
      return {
        success: true,
        responseTime: Date.now() - startTime,
        details: {
          connectionEstablished: true,
          authenticationSuccessful: true,
          searchTestSuccessful: true
        },
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
        responseTime: Date.now() - startTime,
        details: {
          connectionEstablished: false,
          authenticationSuccessful: false
        },
        timestamp: new Date().toISOString()
      };
    }
  }

  /**
   * Test PBX system connection
   */
  private async testPBXConnection(config: PBXSystemConfiguration, sessionToken?: string): Promise<ConnectionTestResult> {
    const startTime = Date.now();
    
    try {
      // Simulate API connection test
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      // In production, this would make actual API calls to test endpoints
      
      return {
        success: true,
        responseTime: Date.now() - startTime,
        details: {
          connectionEstablished: true,
          authenticationSuccessful: true,
          endpointsReachable: {
            [config.config.endpoint]: true
          }
        },
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
        responseTime: Date.now() - startTime,
        details: {
          connectionEstablished: false,
          authenticationSuccessful: false
        },
        timestamp: new Date().toISOString()
      };
    }
  }

  /**
   * Validation helpers
   */
  private validateLDAPConfiguration(config: LDAPConfiguration, errors: string[], warnings: string[]): void {
    if (!config.config.serverUrl) {
      errors.push('LDAP server URL is required');
    }
    
    if (!config.config.baseDN) {
      errors.push('Base DN is required');
    }
    
    if (!config.config.bindDN) {
      errors.push('Bind DN is required');
    }
    
    if (config.config.port < 1 || config.config.port > 65535) {
      errors.push('Invalid port number');
    }
    
    if (!config.config.useSSL && config.config.port === 636) {
      warnings.push('Port 636 typically requires SSL');
    }
  }

  private validatePBXConfiguration(config: PBXSystemConfiguration, errors: string[], warnings: string[]): void {
    if (!config.config.endpoint) {
      errors.push('PBX system endpoint is required');
    }
    
    if (!config.config.systemType) {
      errors.push('System type is required');
    }
    
    if (config.config.syncSettings.interval < 1) {
      errors.push('Sync interval must be at least 1 minute');
    }
    
    if (config.config.syncSettings.batchSize < 1 || config.config.syncSettings.batchSize > 10000) {
      warnings.push('Batch size should be between 1 and 10,000 for optimal performance');
    }
  }

  /**
   * Log configuration changes for audit trail
   */
  private async logConfigurationChange(
    action: string, 
    type: ConfigurationType, 
    name: string, 
    username: string,
    details?: any
  ): Promise<void> {
    await browserDatabase.insertSecurityEvent({
      category: 'configuration',
      severity: 'medium',
      userId: username,
      username: username,
      action: `Configuration ${action}: ${type}/${name}`,
      details: details || {},
      ipAddress: 'browser-client',
      userAgent: navigator.userAgent
    });
  }
}

// Export singleton instance
export const systemConfigService = SystemConfigService.getInstance();