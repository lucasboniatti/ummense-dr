/**
 * Message Template Engine
 * Handles {{variable}} substitution for webhook messages
 */
export class TemplateEngineService {
  /**
   * Substitute variables in template string
   * Supports: {{rule_name}}, {{status}}, {{error}}, {{duration_ms}}, {{executed_at}}
   *
   * @example
   * const template = "Rule {{rule_name}} completed in {{duration_ms}}ms with status {{status}}";
   * const result = substitute(template, {
   *   rule_name: "High Priority Task",
   *   duration_ms: 245,
   *   status: "success"
   * });
   * // Result: "Rule High Priority Task completed in 245ms with status success"
   */
  static substitute(template: string, variables: Record<string, any>): string {
    if (!template) return '';

    return template.replace(/\{\{(\w+)\}\}/g, (match, key) => {
      const value = variables[key];

      // Handle different types
      if (value === undefined || value === null) {
        return match; // Return original placeholder if variable not found
      }

      if (typeof value === 'object') {
        return JSON.stringify(value);
      }

      return String(value);
    });
  }

  /**
   * Validate template syntax
   * Check for unmatched brackets and valid variable names
   */
  static validateTemplate(template: string): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (!template || template.trim().length === 0) {
      return { valid: true, errors: [] }; // Empty template is valid
    }

    // Check for unmatched brackets
    const openCount = (template.match(/\{\{/g) || []).length;
    const closeCount = (template.match(/\}\}/g) || []).length;

    if (openCount !== closeCount) {
      errors.push(`Unmatched brackets: ${openCount} {{ vs ${closeCount} }}`);
    }

    // Check for valid variable names (alphanumeric + underscore)
    const variableRegex = /\{\{(\w+)\}\}/g;
    let match;
    const validVariables = [
      'rule_name',
      'status',
      'error',
      'error_message',
      'duration_ms',
      'executed_at',
    ];

    while ((match = variableRegex.exec(template)) !== null) {
      const varName = match[1];
      if (!validVariables.includes(varName)) {
        errors.push(`Unknown variable: {{${varName}}}`);
      }
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }

  /**
   * Get list of variables in template
   */
  static extractVariables(template: string): string[] {
    if (!template) return [];

    const variableRegex = /\{\{(\w+)\}\}/g;
    const variables: string[] = [];
    let match;

    while ((match = variableRegex.exec(template)) !== null) {
      if (!variables.includes(match[1])) {
        variables.push(match[1]);
      }
    }

    return variables;
  }

  /**
   * Build template from user input with escaping
   * Prevents injection attacks
   */
  static buildTemplate(
    baseTemplate: string,
    customVariables: Record<string, string> = {}
  ): string {
    // Escape any user-provided variable values
    const escaped = Object.fromEntries(
      Object.entries(customVariables).map(([key, value]) => [
        key,
        String(value)
          .replace(/&/g, '&amp;')
          .replace(/</g, '&lt;')
          .replace(/>/g, '&gt;')
          .replace(/"/g, '&quot;')
          .replace(/'/g, '&#x27;'),
      ])
    );

    return this.substitute(baseTemplate, escaped);
  }
}
