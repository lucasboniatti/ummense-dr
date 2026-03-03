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
 *
 * ARCHITECTURE NOTE (Quality Gate 3.5.1 — Concern #1 fix):
 * Patterns are stored as definition objects and fresh RegExp instances are created
 * per sanitizeString() call. This avoids the stateful /g bug where test()/replace()
 * advance lastIndex across calls, causing intermittent false negatives.
 *
 * ARCHITECTURE NOTE (Quality Gate 3.5.1 — Concern #2 fix):
 * Patterns with capture groups preserve the label prefix in replacement.
 * e.g., "password=secret" → "password=[REDACTED]" (not just "[REDACTED]")
 * This preserves context for debugging while still removing sensitive data.
 */

interface PatternDef {
  source: string;
  flags: string;
  /** If true, the regex has a $1 capture group for the label prefix to preserve */
  preservePrefix: boolean;
  /** Human-readable comment for the pattern */
  comment: string;
}

export class SanitizationService {
  /**
   * Pattern definitions stored as source strings (NOT compiled regex with /g).
   * Fresh RegExp instances are created per operation via createPatterns().
   */
  private static readonly PATTERN_DEFS: PatternDef[] = [
    // Passwords (case-insensitive) — preserves "password=" prefix
    {
      source: '(\\b[Pp]assword\\s*[=:]\\s*)[\'\\"]?([^\'"\\s,;]+)[\'\\"]?',
      flags: 'g',
      preservePrefix: true,
      comment: 'password',
    },
    // API Keys (multiple formats) — preserves "api_key=" prefix
    {
      source: '([Aa]pi[_-]?[Kk]ey\\s*[=:]\\s*)[\'\\"]?([^\'"\\s,;]+)[\'\\"]?',
      flags: 'g',
      preservePrefix: true,
      comment: 'api_key',
    },
    // Tokens (case-insensitive) — preserves "token=" prefix
    {
      source: '(\\b[Tt]oken\\s*[=:]\\s*)[\'\\"]?([^\'"\\s,;]+)[\'\\"]?',
      flags: 'g',
      preservePrefix: true,
      comment: 'token',
    },
    // Secrets — preserves "secret=" prefix
    {
      source: '([Ss]ecret\\s*[=:]\\s*)[\'\\"]?([^\'"\\s,;]+)[\'\\"]?',
      flags: 'g',
      preservePrefix: true,
      comment: 'secret',
    },
    // Credentials — preserves "credential=" prefix
    {
      source: '([Cc]redential\\s*[=:]\\s*)[\'\\"]?([^\'"\\s,;]+)[\'\\"]?',
      flags: 'g',
      preservePrefix: true,
      comment: 'credential',
    },
    // Bearer tokens (Authorization header format) — preserves "Bearer " prefix
    {
      source: '(Bearer\\s+)[^\\s,;]+',
      flags: 'g',
      preservePrefix: true,
      comment: 'bearer_token',
    },
    // Authorization headers — preserves "Authorization: " prefix
    {
      source: '(Authorization:\\s+)[^\\s,;]+',
      flags: 'g',
      preservePrefix: true,
      comment: 'authorization_header',
    },
    // Email addresses — no prefix to preserve
    {
      source: '\\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\\.[A-Z|a-z]{2,}\\b',
      flags: 'g',
      preservePrefix: false,
      comment: 'email',
    },
    // Phone numbers (multiple formats)
    {
      source: '\\b\\d{3}[-.]?\\d{3}[-.]?\\d{4}\\b',
      flags: 'g',
      preservePrefix: false,
      comment: 'phone',
    },
    // Social Security Numbers
    {
      source: '\\b\\d{3}[-]?\\d{2}[-]?\\d{4}\\b',
      flags: 'g',
      preservePrefix: false,
      comment: 'ssn',
    },
    // AWS Access Key format
    {
      source: 'AKIA[0-9A-Z]{16}',
      flags: 'g',
      preservePrefix: false,
      comment: 'aws_access_key',
    },
    // Database connection strings (basic pattern)
    {
      source: '(postgres|mysql|mongodb|redis):\\/\\/[^\\s,;]+',
      flags: 'g',
      preservePrefix: false,
      comment: 'db_connection_string',
    },
  ];

  /**
   * Create fresh RegExp instances from pattern definitions.
   * Called per sanitizeString() invocation to avoid stateful /g lastIndex bugs.
   */
  private static createPatterns(): Array<{ regex: RegExp; preservePrefix: boolean }> {
    return this.PATTERN_DEFS.map((def) => ({
      regex: new RegExp(def.source, def.flags),
      preservePrefix: def.preservePrefix,
    }));
  }

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
   * Creates fresh regex instances per call to avoid stateful /g lastIndex bugs.
   * Patterns with capture groups preserve the label prefix for better debugging context.
   *
   * @param text - The string to sanitize
   * @returns Sanitized string with sensitive values replaced
   */
  static sanitizeString(text: string): string {
    if (typeof text !== 'string') {
      return text;
    }

    let sanitized = text;

    // Create fresh regex instances each call (avoids /g stateful bug)
    const patterns = this.createPatterns();
    for (const { regex, preservePrefix } of patterns) {
      // $1[REDACTED] preserves "password=", "Bearer ", etc. for context
      const replacement = preservePrefix ? '$1[REDACTED]' : '[REDACTED]';
      sanitized = sanitized.replace(regex, replacement);
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
   * Uses fresh regex instances without /g flag for safe test() calls
   *
   * @param text - The string to check
   * @returns true if sensitive patterns detected
   */
  static containsSensitiveData(text: string): boolean {
    if (typeof text !== 'string') {
      return false;
    }

    // Use fresh regex instances without /g for test() (test with /g is stateful)
    for (const def of this.PATTERN_DEFS) {
      const testRegex = new RegExp(def.source); // No /g flag for test()
      if (testRegex.test(text)) {
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
    if (/\b\d{3}[-.]\d{3}[-.]\d{4}\b/.test(text)) found.push('phone');
    if (/\b\d{3}[-]\d{2}[-]\d{4}\b/.test(text)) found.push('ssn');
    if (/AKIA[0-9A-Z]{16}/.test(text)) found.push('aws_access_key');

    return [...new Set(found)];
  }
}
