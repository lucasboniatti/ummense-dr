export class ConditionalEvaluator {
  static validateSyntax(expression: string): { valid: boolean; error?: string } {
    const trimmed = expression.trim();
    if (!trimmed) {
      return { valid: false, error: 'Expression cannot be empty' };
    }

    if (/[;{}]/.test(trimmed)) {
      return { valid: false, error: 'Unsupported characters in expression' };
    }

    const validPattern =
      /^[a-zA-Z0-9_\s().,'"=!<>:&|+\-/*%[\]]+$/;
    if (!validPattern.test(trimmed)) {
      return { valid: false, error: 'Invalid expression format' };
    }

    return { valid: true };
  }
}
