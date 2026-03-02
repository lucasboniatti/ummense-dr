import { KMS } from 'aws-sdk';

/**
 * Token Encryption/Decryption via AWS KMS
 * Supports key rotation and never exposes plaintext tokens
 */
export class TokenEncryptionService {
  private kms: KMS;

  constructor() {
    this.kms = new KMS({
      region: process.env.AWS_REGION || 'us-east-1',
      accessKeyId: process.env.AWS_ACCESS_KEY_ID,
      secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
    });
  }

  /**
   * Encrypt plaintext token using KMS
   * @param plainToken The token to encrypt
   * @param keyId KMS Key ID or ARN
   * @returns Encrypted token (base64)
   */
  async encryptToken(plainToken: string, keyId: string = process.env.KMS_KEY_ID || ''): Promise<string> {
    if (!keyId) {
      throw new Error('KMS_KEY_ID not configured');
    }

    if (!plainToken || plainToken.trim().length === 0) {
      throw new Error('Cannot encrypt empty token');
    }

    try {
      const result = await this.kms
        .encrypt({
          KeyId: keyId,
          Plaintext: Buffer.from(plainToken),
        })
        .promise();

      // Return as base64 for safe storage
      return Buffer.from(result.CiphertextBlob!).toString('base64');
    } catch (error) {
      throw new Error(`KMS encryption failed: ${(error as Error).message}`);
    }
  }

  /**
   * Decrypt encrypted token using KMS
   * @param encryptedToken Base64-encoded encrypted token
   * @returns Plaintext token
   */
  async decryptToken(encryptedToken: string): Promise<string> {
    if (!encryptedToken || encryptedToken.trim().length === 0) {
      throw new Error('Cannot decrypt empty token');
    }

    try {
      const result = await this.kms
        .decrypt({
          CiphertextBlob: Buffer.from(encryptedToken, 'base64'),
        })
        .promise();

      return Buffer.from(result.Plaintext!).toString('utf-8');
    } catch (error) {
      throw new Error(`KMS decryption failed: ${(error as Error).message}`);
    }
  }

  /**
   * Re-encrypt token with new KMS key (for key rotation)
   * @param encryptedToken Current encrypted token
   * @param newKeyId New KMS Key ID
   * @returns Token encrypted with new key
   */
  async rotateTokenKey(encryptedToken: string, newKeyId: string): Promise<string> {
    // Decrypt with old key, encrypt with new key
    const plainToken = await this.decryptToken(encryptedToken);
    return this.encryptToken(plainToken, newKeyId);
  }

  /**
   * Validate that a token is properly encrypted (KMS format check)
   */
  async validateEncryptedToken(encryptedToken: string): Promise<boolean> {
    try {
      // Attempt to decrypt - if successful, token is valid
      await this.decryptToken(encryptedToken);
      return true;
    } catch {
      return false;
    }
  }
}
