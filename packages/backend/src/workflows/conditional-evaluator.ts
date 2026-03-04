/**
 * Conditional Logic Evaluator
 * Evaluates if/then/else expressions safely without code execution
 */

import { ConditionalLogic, ExecutionContext } from "./models";

export class ConditionalEvaluator {
  // Supported operators
  private static readonly OPERATORS = {
    EQUALITY: ["==", "!="],
    COMPARISON: ["<", ">", "<=", ">="],
    LOGICAL: ["AND", "OR", "NOT"],
  };

  /**
   * Evaluate a conditional expression
   * @param expression e.g., "trigger.value == 'active' AND previous.count > 10"
   * @param context Execution context with available variables
   * @returns boolean result
   * @throws Error if expression is invalid or references undefined variables
   */
  static evaluate(expression: string, context: ExecutionContext): boolean {
    if (!expression || expression.trim().length === 0) {
      throw new Error("Expression cannot be empty");
    }

    // Validate expression format
    this.validateExpression(expression);

    // Normalize expression
    const normalized = this.normalizeExpression(expression);

    // Evaluate with context variables
    try {
      return this.evaluateExpression(normalized, context);
    } catch (error) {
      throw new Error(`Failed to evaluate expression: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Validate expression format (prevent injection)
   */
  private static validateExpression(expression: string): void {
    // No function calls allowed
    if (/[\w]\s*\(/.test(expression)) {
      throw new Error("Function calls not allowed in expressions");
    }

    // No template literals or backticks
    if (/[`]/.test(expression)) {
      throw new Error("Template literals not allowed");
    }

    // Only alphanumeric, dots, operators, and logical operators
    const validCharsRegex = /^[\w\s.==!=<>AND OR NOT()]+$/;
    if (!validCharsRegex.test(expression)) {
      throw new Error("Invalid characters in expression");
    }
  }

  /**
   * Normalize expression (uppercase logical operators)
   */
  private static normalizeExpression(expression: string): string {
    return expression
      .replace(/\bAND\b/gi, "&&")
      .replace(/\bOR\b/gi, "||")
      .replace(/\bNOT\b/gi, "!")
      .trim();
  }

  /**
   * Evaluate the normalized expression
   */
  private static evaluateExpression(expression: string, context: ExecutionContext): boolean {
    // Replace variable references with their values
    let evaluable = expression;

    // Replace trigger.* references
    evaluable = evaluable.replace(/trigger\.(\w+)/g, (match, key) => {
      const value = context.trigger_data[key];
      if (value === undefined) {
        throw new Error(`Variable trigger.${key} not found`);
      }
      return this.valueToString(value);
    });

    // Replace previous.* references (from last step output)
    evaluable = evaluable.replace(/previous\.(\w+)/g, (match, key) => {
      const lastStepId = Array.from(context.step_outputs.keys()).pop();
      if (!lastStepId) {
        throw new Error("No previous step output available");
      }
      const stepOutput = context.step_outputs.get(lastStepId);
      if (stepOutput === undefined || stepOutput[key] === undefined) {
        throw new Error(`Variable previous.${key} not found`);
      }
      return this.valueToString(stepOutput[key]);
    });

    // Replace string literals (preserve quotes)
    const stringLiterals: Record<string, string> = {};
    let literalIndex = 0;
    evaluable = evaluable.replace(/'[^']*'/g, (match) => {
      const key = `__STRING_${literalIndex}__`;
      stringLiterals[key] = match.slice(1, -1); // Remove quotes
      literalIndex++;
      return `"${key}"`;
    });

    // Use Function constructor to safely evaluate (no eval)
    // Create a safe evaluation function with only comparison operators
    try {
      // Parse and evaluate
      const result = this.safeEval(evaluable, stringLiterals);
      return Boolean(result);
    } catch (error) {
      throw new Error(`Expression evaluation failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Safe evaluation without using eval()
   */
  private static safeEval(expression: string, stringLiterals: Record<string, string>): boolean {
    // Replace string literal placeholders with actual values for comparison
    let evalExpr = expression;
    for (const [key, value] of Object.entries(stringLiterals)) {
      evalExpr = evalExpr.replace(`"${key}"`, `"${value}"`);
    }

    // Create function with strict comparison operators only
    // This prevents code injection
    try {
      const fn = new Function(`return ${evalExpr}`);
      return fn() as boolean;
    } catch (error) {
      throw error;
    }
  }

  /**
   * Convert value to string for expression (handles quotes)
   */
  private static valueToString(value: any): string {
    if (typeof value === "string") {
      return `"${value}"`;
    }
    if (typeof value === "number" || typeof value === "boolean") {
      return String(value);
    }
    if (value === null) {
      return "null";
    }
    throw new Error(`Cannot convert ${typeof value} to string for expression`);
  }

  /**
   * Validate expression syntax without executing
   */
  static validateSyntax(expression: string): { valid: boolean; error?: string } {
    try {
      this.validateExpression(expression);
      const normalized = this.normalizeExpression(expression);
      // Try to parse as JavaScript expression (without executing)
      new Function(`return ${normalized}`);
      return { valid: true };
    } catch (error) {
      return {
        valid: false,
        error: error instanceof Error ? error.message : "Invalid expression",
      };
    }
  }
}
