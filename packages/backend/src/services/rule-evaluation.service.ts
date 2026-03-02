/**
 * Rule Evaluation Service
 * Evaluates conditions with support for multiple operators and JSON path syntax
 */
export class RuleEvaluationService {
  /**
   * Supported condition operators
   */
  private readonly operators = {
    equals: (actual: any, expected: any) => actual === expected,
    not_equals: (actual: any, expected: any) => actual !== expected,
    greater_than: (actual: any, expected: any) => actual > expected,
    less_than: (actual: any, expected: any) => actual < expected,
    in: (actual: any, expected: any[]) => expected.includes(actual),
    not_in: (actual: any, expected: any[]) => !expected.includes(actual),
    contains: (actual: string, expected: string) =>
      actual && actual.includes(expected)
  };

  /**
   * Evaluate a single condition
   * @param condition Condition object with field, operator, value
   * @param context Data object to evaluate against
   * @returns true if condition is met, false otherwise
   */
  evaluateCondition(
    condition: {
      field: string;
      operator: keyof typeof this.operators;
      value: any;
    },
    context: Record<string, any>
  ): boolean {
    // Extract field value from context using JSON path
    const actualValue = this.getNestedValue(context, condition.field);

    // Get operator function
    const operatorFn = this.operators[condition.operator];
    if (!operatorFn) {
      throw new Error(`Unsupported operator: ${condition.operator}`);
    }

    // Evaluate condition
    try {
      return operatorFn(actualValue, condition.value);
    } catch (error) {
      console.error(`Error evaluating condition:`, {
        field: condition.field,
        operator: condition.operator,
        actualValue,
        expectedValue: condition.value,
        error
      });
      return false;
    }
  }

  /**
   * Evaluate multiple conditions with AND/OR logic
   * @param conditions Array of conditions
   * @param context Data object
   * @param logic 'AND' or 'OR'
   * @returns true if conditions are met according to logic
   */
  evaluateConditions(
    conditions: Array<{
      field: string;
      operator: keyof typeof this.operators;
      value: any;
    }>,
    context: Record<string, any>,
    logic: 'AND' | 'OR' = 'AND'
  ): boolean {
    if (conditions.length === 0) {
      return true; // No conditions = always true
    }

    const results = conditions.map((condition) =>
      this.evaluateCondition(condition, context)
    );

    if (logic === 'AND') {
      return results.every((result) => result === true);
    } else if (logic === 'OR') {
      return results.some((result) => result === true);
    } else {
      throw new Error(`Unsupported logic: ${logic}`);
    }
  }

  /**
   * Get nested value from object using JSON path
   * Example: "task.priority" → context.task.priority
   * @param obj Object to traverse
   * @param path Dot-separated path
   * @returns Value at path or undefined
   */
  private getNestedValue(obj: Record<string, any>, path: string): any {
    const keys = path.split('.');
    let current = obj;

    for (const key of keys) {
      if (current === null || current === undefined) {
        return undefined;
      }
      current = current[key];
    }

    return current;
  }

  /**
   * Validate condition syntax
   * @param condition Condition to validate
   * @returns true if valid, throws error if invalid
   */
  validateCondition(condition: any): boolean {
    if (!condition.field || typeof condition.field !== 'string') {
      throw new Error('Condition must have field (string)');
    }

    if (!condition.operator || typeof condition.operator !== 'string') {
      throw new Error('Condition must have operator (string)');
    }

    if (!this.operators[condition.operator as keyof typeof this.operators]) {
      throw new Error(`Unknown operator: ${condition.operator}`);
    }

    if (condition.value === undefined) {
      throw new Error('Condition must have value');
    }

    return true;
  }
}

export const ruleEvaluationService = new RuleEvaluationService();
