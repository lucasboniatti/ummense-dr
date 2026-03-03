/**
 * Unit Tests: Stack Trace Sanitization
 * Validates that sensitive data is properly detected and redacted
 */

import { describe, it, expect } from '@jest/globals';
import { SanitizationService } from '../automations/history/sanitization.service';

describe('SanitizationService', () => {
  describe('sanitizeString()', () => {
    it('should redact password patterns (password=value format)', () => {
      const input = 'Database connection failed. password=MySecurePassword123';
      const result = SanitizationService.sanitizeString(input);
      expect(result).toBe('Database connection failed. password=[REDACTED]');
      expect(result).not.toContain('MySecurePassword123');
    });

    it('should redact password patterns (password: value format)', () => {
      const input = 'Error: password: "my_secret_password"';
      const result = SanitizationService.sanitizeString(input);
      expect(result).toContain('[REDACTED]');
      expect(result).not.toContain('my_secret_password');
    });

    it('should redact API key patterns', () => {
      const input = 'Request failed. api_key=sk-1234567890abcdef';
      const result = SanitizationService.sanitizeString(input);
      expect(result).toContain('[REDACTED]');
      expect(result).not.toContain('sk-1234567890abcdef');
    });

    it('should redact API key with hyphen format', () => {
      const input = 'Authentication failed: api-key=prod-key-abc123xyz';
      const result = SanitizationService.sanitizeString(input);
      expect(result).toContain('[REDACTED]');
      expect(result).not.toContain('prod-key-abc123xyz');
    });

    it('should redact Bearer token patterns', () => {
      const input = 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIn0...';
      const result = SanitizationService.sanitizeString(input);
      expect(result).toContain('[REDACTED]');
      expect(result).not.toContain('eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9');
    });

    it('should redact secret patterns', () => {
      const input = 'Configuration error. secret=prod_secret_12345';
      const result = SanitizationService.sanitizeString(input);
      expect(result).toContain('[REDACTED]');
      expect(result).not.toContain('prod_secret_12345');
    });

    it('should redact credential patterns', () => {
      const input = 'Credential validation failed: credential=user:pass@host:1234';
      const result = SanitizationService.sanitizeString(input);
      expect(result).toContain('[REDACTED]');
      expect(result).not.toContain('user:pass@host:1234');
    });

    it('should redact Authorization headers', () => {
      const input = 'Request failed: Authorization: Bearer abc123def456ghi789';
      const result = SanitizationService.sanitizeString(input);
      expect(result).toContain('[REDACTED]');
      expect(result).not.toContain('abc123def456ghi789');
    });

    it('should redact email addresses', () => {
      const input = 'User error on account user@example.com: permission denied';
      const result = SanitizationService.sanitizeString(input);
      expect(result).toContain('[REDACTED]');
      expect(result).not.toContain('user@example.com');
    });

    it('should redact phone numbers', () => {
      const input = 'Contact support: 555-123-4567 or 555.123.4567';
      const result = SanitizationService.sanitizeString(input);
      expect(result).not.toContain('555-123-4567');
      expect(result).not.toContain('555.123.4567');
    });

    it('should redact SSN patterns', () => {
      const input = 'SSN verification failed: 123-45-6789';
      const result = SanitizationService.sanitizeString(input);
      expect(result).toContain('[REDACTED]');
      expect(result).not.toContain('123-45-6789');
    });

    it('should redact AWS Access Key patterns', () => {
      const input = 'AWS auth failed with key AKIAIOSFODNN7EXAMPLE';
      const result = SanitizationService.sanitizeString(input);
      expect(result).toContain('[REDACTED]');
      expect(result).not.toContain('AKIAIOSFODNN7EXAMPLE');
    });

    it('should redact database connection strings', () => {
      const input = 'postgres://user:pass@localhost:5432/dbname failed';
      const result = SanitizationService.sanitizeString(input);
      expect(result).toContain('[REDACTED]');
      expect(result).not.toContain('postgres://user:pass@localhost:5432/dbname');
    });

    it('should preserve error context while removing sensitive data', () => {
      const input =
        'Connection timeout after 30s. Server: api.example.com, Port: 443, Password: secret123';
      const result = SanitizationService.sanitizeString(input);
      expect(result).toContain('Connection timeout');
      expect(result).toContain('api.example.com');
      expect(result).toContain('443');
      expect(result).toContain('[REDACTED]');
      expect(result).not.toContain('secret123');
    });

    it('should handle multiple sensitive patterns in same string', () => {
      const input =
        'Error: api_key=sk123 password=pwd456 token=tok789 Authorization: Bearer abc123def456';
      const result = SanitizationService.sanitizeString(input);
      expect(result).not.toContain('sk123');
      expect(result).not.toContain('pwd456');
      expect(result).not.toContain('tok789');
      expect(result).not.toContain('abc123def456');
      expect(result).toContain('[REDACTED]');
    });

    it('should be case insensitive for password patterns', () => {
      const input1 = 'password=secret';
      const input2 = 'PASSWORD=secret';
      const input3 = 'PaSsWoRd=secret';

      expect(SanitizationService.sanitizeString(input1)).toContain('[REDACTED]');
      expect(SanitizationService.sanitizeString(input2)).toContain('[REDACTED]');
      expect(SanitizationService.sanitizeString(input3)).toContain('[REDACTED]');
    });
  });

  describe('sanitizeErrorContext()', () => {
    it('should sanitize stack_trace field', () => {
      const errorContext = {
        stack_trace: 'Error at function() password=secret123\n at line 42',
        error_message: 'Connection failed',
      };

      const result = SanitizationService.sanitizeErrorContext(errorContext);
      expect(result.stack_trace).toContain('[REDACTED]');
      expect(result.stack_trace).not.toContain('secret123');
      expect(result.error_message).toBe('Connection failed');
    });

    it('should sanitize error_message field', () => {
      const errorContext = {
        stack_trace: 'error details',
        error_message: 'Auth failed: token=eyJhbGc...',
      };

      const result = SanitizationService.sanitizeErrorContext(errorContext);
      expect(result.error_message).toContain('[REDACTED]');
      expect(result.error_message).not.toContain('eyJhbGc');
    });

    it('should sanitize state_snapshot object recursively', () => {
      const errorContext = {
        state_snapshot: {
          user: {
            email: 'user@example.com',
            phone: '555-123-4567',
            apiKey: 'sk-abc123def456',
          },
          config: {
            password: 'mypassword',
            endpoint: 'https://api.example.com',
          },
        },
      };

      const result = SanitizationService.sanitizeErrorContext(errorContext);
      expect(result.state_snapshot.user.email).toContain('[REDACTED]');
      expect(result.state_snapshot.user.phone).toContain('[REDACTED]');
      expect(result.state_snapshot.user.apiKey).toContain('[REDACTED]');
      expect(result.state_snapshot.config.password).toContain('[REDACTED]');
      expect(result.state_snapshot.config.endpoint).toBe('https://api.example.com');
    });

    it('should handle null/undefined error_context gracefully', () => {
      expect(SanitizationService.sanitizeErrorContext(null)).toBeNull();
      expect(SanitizationService.sanitizeErrorContext(undefined)).toBeUndefined();
    });

    it('should not mutate original error_context', () => {
      const original = {
        error_message: 'Error: api_key=secret123',
        stack_trace: 'password=mypass',
      };

      const originalStr = JSON.stringify(original);
      SanitizationService.sanitizeErrorContext(original);

      expect(JSON.stringify(original)).toBe(originalStr);
    });

    it('should handle all 6 sensitive data types in error context', () => {
      const errorContext = {
        error_message:
          'Multiple errors: password=pwd123, api_key=key456, token=tok789, secret=sec000, credential=cred111, user@example.com',
        stack_trace: 'Error at line. Authorization: Bearer abc123xyz',
        state_snapshot: {
          phone: '555-123-4567',
          ssn: '123-45-6789',
        },
      };

      const result = SanitizationService.sanitizeErrorContext(errorContext);

      expect(result.error_message).not.toContain('pwd123');
      expect(result.error_message).not.toContain('key456');
      expect(result.error_message).not.toContain('tok789');
      expect(result.error_message).not.toContain('sec000');
      expect(result.error_message).not.toContain('cred111');
      expect(result.error_message).not.toContain('example.com');
      expect(result.stack_trace).not.toContain('abc123xyz');
      expect(result.state_snapshot.phone).toContain('[REDACTED]');
      expect(result.state_snapshot.ssn).toContain('[REDACTED]');
    });
  });

  describe('containsSensitiveData()', () => {
    it('should detect password patterns', () => {
      expect(SanitizationService.containsSensitiveData('password=secret')).toBe(true);
      expect(SanitizationService.containsSensitiveData('no sensitive data')).toBe(false);
    });

    it('should detect multiple sensitive types', () => {
      expect(SanitizationService.containsSensitiveData('api_key=123 and password=456')).toBe(true);
    });

    it('should handle non-string input', () => {
      expect(SanitizationService.containsSensitiveData(null as any)).toBe(false);
      expect(SanitizationService.containsSensitiveData(undefined as any)).toBe(false);
      expect(SanitizationService.containsSensitiveData(123 as any)).toBe(false);
    });
  });

  describe('getSensitiveDataTypes()', () => {
    it('should identify all sensitive data types present', () => {
      const input =
        'password=pwd api_key=key token=tok secret=sec credential=cred user@example.com phone=555-123-4567 ssn=123-45-6789';
      const types = SanitizationService.getSensitiveDataTypes(input);

      expect(types).toContain('password');
      expect(types).toContain('api_key');
      expect(types).toContain('token');
      expect(types).toContain('secret');
      expect(types).toContain('credential');
      expect(types).toContain('email');
      expect(types).toContain('phone');
      expect(types).toContain('ssn');
    });

    it('should return empty array for text without sensitive data', () => {
      const input = 'This is a normal error message with no sensitive data';
      const types = SanitizationService.getSensitiveDataTypes(input);
      expect(types).toEqual([]);
    });

    it('should not return duplicate types', () => {
      const input = 'password=pwd1 password=pwd2 password=pwd3';
      const types = SanitizationService.getSensitiveDataTypes(input);
      expect(types.filter((t) => t === 'password').length).toBe(1);
    });
  });
});
