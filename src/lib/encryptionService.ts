// Enhanced encryption service for secure credential storage
// Uses Web Crypto API for AES-256-GCM encryption with PBKDF2 key derivation

export interface EncryptedData {
  ciphertext: string;
  iv: string;
  salt: string;
  algorithm: string;
}

export interface DeviceFingerprint {
  userAgent: string;
  screen: string;
  timezone: string;
  language: string;
}

export class EncryptionService {
  private static instance: EncryptionService;
  private readonly ALGORITHM = 'AES-GCM';
  private readonly KEY_LENGTH = 256;
  private readonly IV_LENGTH = 12; // 96 bits for GCM
  private readonly SALT_LENGTH = 32;
  private readonly PBKDF2_ITERATIONS = 100000;

  public static getInstance(): EncryptionService {
    if (!EncryptionService.instance) {
      EncryptionService.instance = new EncryptionService();
    }
    return EncryptionService.instance;
  }

  /**
   * Generate a device fingerprint for key derivation
   */
  private generateDeviceFingerprint(): DeviceFingerprint {
    return {
      userAgent: navigator.userAgent,
      screen: `${screen.width}x${screen.height}x${screen.colorDepth}`,
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      language: navigator.language
    };
  }

  /**
   * Create a context string from session and device info
   */
  private createEncryptionContext(sessionToken: string): string {
    const fingerprint = this.generateDeviceFingerprint();
    return `${sessionToken}:${fingerprint.userAgent}:${fingerprint.screen}:${fingerprint.timezone}:${fingerprint.language}`;
  }

  /**
   * Derive a cryptographic key from session context using PBKDF2
   */
  private async deriveKey(context: string, salt: Uint8Array): Promise<CryptoKey> {
    // Convert context to array buffer
    const encoder = new TextEncoder();
    const contextBuffer = encoder.encode(context);

    // Import the context as key material
    const keyMaterial = await crypto.subtle.importKey(
      'raw',
      contextBuffer,
      'PBKDF2',
      false,
      ['deriveKey']
    );

    // Derive the actual encryption key using PBKDF2
    return crypto.subtle.deriveKey(
      {
        name: 'PBKDF2',
        salt: salt,
        iterations: this.PBKDF2_ITERATIONS,
        hash: 'SHA-256'
      },
      keyMaterial,
      {
        name: this.ALGORITHM,
        length: this.KEY_LENGTH
      },
      false, // Not extractable
      ['encrypt', 'decrypt']
    );
  }

  /**
   * Generate cryptographically secure random bytes
   */
  private generateRandomBytes(length: number): Uint8Array {
    return crypto.getRandomValues(new Uint8Array(length));
  }

  /**
   * Convert Uint8Array to base64 string
   */
  private arrayBufferToBase64(buffer: ArrayBuffer): string {
    const bytes = new Uint8Array(buffer);
    let binary = '';
    for (let i = 0; i < bytes.byteLength; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    return btoa(binary);
  }

  /**
   * Convert base64 string to Uint8Array
   */
  private base64ToArrayBuffer(base64: string): ArrayBuffer {
    const binary = atob(base64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
      bytes[i] = binary.charCodeAt(i);
    }
    return bytes.buffer;
  }

  /**
   * Encrypt sensitive data using AES-256-GCM
   */
  public async encrypt(plaintext: string, sessionToken: string): Promise<EncryptedData> {
    try {
      // Create encryption context from session and device info
      const context = this.createEncryptionContext(sessionToken);
      
      // Generate random salt and IV
      const salt = this.generateRandomBytes(this.SALT_LENGTH);
      const iv = this.generateRandomBytes(this.IV_LENGTH);
      
      // Derive encryption key
      const key = await this.deriveKey(context, salt);
      
      // Encrypt the plaintext
      const encoder = new TextEncoder();
      const plaintextBuffer = encoder.encode(plaintext);
      
      const cipherBuffer = await crypto.subtle.encrypt(
        {
          name: this.ALGORITHM,
          iv: iv
        },
        key,
        plaintextBuffer
      );

      // Return encrypted data with metadata
      return {
        ciphertext: this.arrayBufferToBase64(cipherBuffer),
        iv: this.arrayBufferToBase64(iv),
        salt: this.arrayBufferToBase64(salt),
        algorithm: `${this.ALGORITHM}-${this.KEY_LENGTH}`
      };
    } catch (error) {
      console.error('Encryption failed:', error);
      throw new Error('Failed to encrypt data');
    }
  }

  /**
   * Decrypt sensitive data using AES-256-GCM
   */
  public async decrypt(encryptedData: EncryptedData, sessionToken: string): Promise<string> {
    try {
      // Validate encrypted data structure
      if (!encryptedData.ciphertext || !encryptedData.iv || !encryptedData.salt) {
        throw new Error('Invalid encrypted data structure');
      }

      // Create decryption context (must match encryption context)
      const context = this.createEncryptionContext(sessionToken);
      
      // Convert base64 back to array buffers
      const cipherBuffer = this.base64ToArrayBuffer(encryptedData.ciphertext);
      const iv = new Uint8Array(this.base64ToArrayBuffer(encryptedData.iv));
      const salt = new Uint8Array(this.base64ToArrayBuffer(encryptedData.salt));
      
      // Derive decryption key (same process as encryption)
      const key = await this.deriveKey(context, salt);
      
      // Decrypt the data
      const plaintextBuffer = await crypto.subtle.decrypt(
        {
          name: this.ALGORITHM,
          iv: iv
        },
        key,
        cipherBuffer
      );

      // Convert decrypted buffer back to string
      const decoder = new TextDecoder();
      return decoder.decode(plaintextBuffer);
    } catch (error) {
      console.error('Decryption failed:', error);
      throw new Error('Failed to decrypt data - invalid key or corrupted data');
    }
  }

  /**
   * Validate if data can be decrypted without actually decrypting it
   * Useful for checking if session context is valid
   */
  public async validateEncryptedData(encryptedData: EncryptedData, sessionToken: string): Promise<boolean> {
    try {
      // Try to decrypt a small test to see if the context is valid
      await this.decrypt(encryptedData, sessionToken);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Check if the Web Crypto API is available
   */
  public isSupported(): boolean {
    return !!(crypto && crypto.subtle && crypto.getRandomValues);
  }

  /**
   * Generate a secure random token for sessions or IDs
   */
  public generateSecureToken(length: number = 32): string {
    const bytes = this.generateRandomBytes(length);
    return this.arrayBufferToBase64(bytes)
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=/g, ''); // Remove padding
  }

  /**
   * Hash a password using PBKDF2 (for storing password hashes)
   */
  public async hashPassword(password: string, salt?: string): Promise<{ hash: string; salt: string }> {
    const encoder = new TextEncoder();
    const passwordBuffer = encoder.encode(password);
    
    // Generate salt if not provided
    const saltBytes = salt ? 
      new Uint8Array(this.base64ToArrayBuffer(salt)) : 
      this.generateRandomBytes(this.SALT_LENGTH);

    // Import password as key material
    const keyMaterial = await crypto.subtle.importKey(
      'raw',
      passwordBuffer,
      'PBKDF2',
      false,
      ['deriveBits']
    );

    // Derive hash using PBKDF2
    const hashBuffer = await crypto.subtle.deriveBits(
      {
        name: 'PBKDF2',
        salt: saltBytes,
        iterations: this.PBKDF2_ITERATIONS,
        hash: 'SHA-256'
      },
      keyMaterial,
      256 // 32 bytes
    );

    return {
      hash: this.arrayBufferToBase64(hashBuffer),
      salt: this.arrayBufferToBase64(saltBytes)
    };
  }

  /**
   * Verify a password against a stored hash
   */
  public async verifyPassword(password: string, storedHash: string, salt: string): Promise<boolean> {
    try {
      const { hash } = await this.hashPassword(password, salt);
      return hash === storedHash;
    } catch {
      return false;
    }
  }
}

// Export singleton instance
export const encryptionService = EncryptionService.getInstance();