/**
 * Stack Trace Sanitization Service
 * Removes sensitive data (API keys, tokens, PII) from error logs before database storage
 *
 * Sensitive patterns detected:
 * 1. Passwords: password=..., password:..., etc.
 * 2. API keys: api_key=..., api-key:..., etc.
 * 3. Tokens: token=..., Bearer eyJ..., etc.
 * 4. Secrets: secret=..., credential=..., etc.
 * 5. Authorization headers: Authorization: Bearer ..., etc.
 * 6. PII: Emails, phone numbers, SSN patterns
 */

export class SanitizationService {
  // Regex patterns for detecting sensitive data
  private static readonly SENSITIVE_PATTERNS = [
    // Passwords (case-insensitive)
    /(\b[Pp]assword\s*[=:]\s*)['\"]?([^'"\s,;]+)['\"]?/g,

    // API Keys (multiple formats)
    /([Aa]pi[_-]?[Kk]ey\s*[=:]\s*)['\"]?([^'"\s,;]+)['\"]?/g,

    // Tokens (case-insensitive)
    /(\b[Tt]oken\s*[=:]\s*)['\"]?([^'"\s,;]+)['\"]?/g,

    // Secrets
    /([Ss]ecret\s*[=:]\s*)['\"]?([^'"\s,;]+)['\"]?/g,

    // Credentials
    /([Cc]redential\s*[=:]\s*)['\"]?([^'"\s,;]+)['\"]?/g,

    // Bearer tokens (Authorization header format)
    /(Bearer\s+)[^\s,;]+/g,

    // Authorization headers
    /(Authorization:\s+)[^\s,;]+/g,

    // Email addresses
    /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g,

    // Phone numbers (multiple formats)
    /\b\d{3}[-.]?\d{3}[-.]?\d{4}\b/g,

    // Social Security Numbers
    /\b\d{3}[-]?\d{2}[-]?\d{4}\b/g,

    // AWS Access Key format
    /AKIA[0-9A-Z]{16}/g,

    // Database connection strings (basic pattern)
    /(postgres|mysql|mongodb|redis):\/\/[^\s,;]+/g,
  ];

  /**
   * Sanitize an error context object by removing sensitive data
   * Applies sanitization to: stack_trace, error_message, and entire context JSON
   *
   * @param errorContext - The error context object to sanitize
   * @returns Sanitized error context with sensitive data replaced with [REDACTED]
   */
  static sanitizeErrorContext(errorContext: any): any {
    if (!errorContext) {
      return errorContext;
    }

    const sanitized = JSON.parse(JSON.stringify(errorContext)); // Deep copy

    // Sanitize stack_trace if present
    if (sanitized.stack_trace && typeof sanitized.stack_trace === 'string') {
      sanitized.stack_trace = this.sanitizeString(sanitized.stack_trace);
    }

    // Sanitize error_message if present
    if (sanitized.error_message && typeof sanitized.error_message === 'string') {
      sanitized.error_message = this.sanitizeString(sanitized.error_message);
    }

    // Sanitize state_snapshot if present (entire JSON)
    if (sanitized.state_snapshot && typeof sanitized.state_snapshot === 'object') {
      sanitized.state_snapshot = this.sanitizeObject(sanitized.state_snapshot);
    }

    // Recursively sanitize all string values
    sanitized.details = this.sanitizeObject(sanitized.details || {});

    return sanitized;
  }

  /**
   * Sanitize a string by replacing all sensitive patterns with [REDACTED]
   *
   * @param text - The string to sanitize
   * @returns Sanitized string
   */
  static sanitizeString(text: string): string {
    if (typeof text !== 'string') {
      return text;
    }

    let sanitized = text;

    // Apply each sensitive pattern
    for (const pattern of this.SENSITIVE_PATTERNS) {
      sanitized = sanitized.replace(pattern, '[REDACTED]');
    }

    return sanitized;
  }

  /**
   * Recursively sanitize an object by sanitizing all string values
   *
   * @param obj - The object to sanitize
   * @returns Sanitized object
   */
  static sanitizeObject(obj: any): any {
    if (!obj || typeof obj !== 'object') {
      return typeof obj === 'string' ? this.sanitizeString(obj) : obj;
    }

    if (Array.isArray(obj)) {
      return obj.map((item) => this.sanitizeObject(item));
    }

    const sanitized: any = {};
    for (const key in obj) {
      if (Object.prototype.hasOwnProperty.call(obj, key)) {
        const value = obj[key];
        if (typeof value === 'string') {
          sanitized[key] = this.sanitizeString(value);
        } else if (typeof value === 'object' && value !== null) {
          sanitized[key] = this.sanitizeObject(value);
        } else {
          sanitized[key] = value;
        }
      }
    }
    return sanitized;
  }

  /**
   * Check if a string contains sensitive data patterns
   * Useful for logging/auditing purposes
   *
   * @param text - The string to check
   * @returns true if sensitive patterns detected
   */
  static containsSensitiveData(text: string): boolean {
    if (typeof text !== 'string') {
      return false;
    }

    for (const pattern of this.SENSITIVE_PATTERNS) {
      if (pattern.test(text)) {
        // Reset regex state
        pattern.lastIndex = 0;
        return true;
      }
    }

    return false;
  }

  /**
   * Get list of sensitive data types found in text
   * Useful for auditing which types of sensitive data were sanitized
   *
   * @param text - The string to check
   * @returns Array of sensitive data types found
   */
  static getSensitiveDataTypes(text: string): string[] {
    const found: string[] = [];

    if (!text || typeof text !== 'string') {
      return found;
    }

    if (/(password|passwd)/i.test(text)) found.push('password');
    if (/(api[_-]?key|apikey)/i.test(text)) found.push('api_key');
    if (/(token|bearer)/i.test(text)) found.push('token');
    if (/(secret)/i.test(text)) found.push('secret');
    if (/(credential)/i.test(text)) found.push('credential');
    if (/authorization:/i.test(text)) found.push('authorization_header');
    if (/\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/.test(text)) found.push('email');
    if (/\b\d{3}[-.]?\d{3}[-.]?\d{4}\b/.test(text)) found.push('phone');
    if (/\b\d{3}[-]?\d{2}[-]?\d{4}\b/.test(text)) found.push('ssn');
    if (/AKIA[0-9A-Z]{16}/.test(text)) found.push('aws_access_key');

    return [...new Set(found)];
  }
}
