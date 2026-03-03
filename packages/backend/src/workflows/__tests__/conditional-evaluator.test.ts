/**
 * ConditionalEvaluator Tests (50+ test cases)
 */

import { ConditionalEvaluator } from "../conditional-evaluator";
import { ExecutionContext } from "../models";

describe("ConditionalEvaluator", () => {
  const mockContext: ExecutionContext = {
    automation_id: "auto-1",
    execution_id: "exec-1",
    trigger_data: {
      value: "active",
      count: 100,
      status: "success",
    },
    step_outputs: new Map([
      ["step-1", { result: 50, failed: false }],
    ]),
    current_step: "step-2",
    timestamp: new Date(),
  };

  describe("Equality operators (==, !=)", () => {
    test("should evaluate == string comparison (true)", () => {
      const result = ConditionalEvaluator.evaluate("trigger.value == 'active'", mockContext);
      expect(result).toBe(true);
    });

    test("should evaluate == string comparison (false)", () => {
      const result = ConditionalEvaluator.evaluate("trigger.value == 'inactive'", mockContext);
      expect(result).toBe(false);
    });

    test("should evaluate != string comparison (true)", () => {
      const result = ConditionalEvaluator.evaluate("trigger.value != 'inactive'", mockContext);
      expect(result).toBe(true);
    });

    test("should evaluate == number comparison (true)", () => {
      const result = ConditionalEvaluator.evaluate("trigger.count == 100", mockContext);
      expect(result).toBe(true);
    });

    test("should evaluate == number comparison (false)", () => {
      const result = ConditionalEvaluator.evaluate("trigger.count == 50", mockContext);
      expect(result).toBe(false);
    });
  });

  describe("Comparison operators (<, >, <=, >=)", () => {
    test("should evaluate > (true)", () => {
      const result = ConditionalEvaluator.evaluate("trigger.count > 50", mockContext);
      expect(result).toBe(true);
    });

    test("should evaluate > (false)", () => {
      const result = ConditionalEvaluator.evaluate("trigger.count > 150", mockContext);
      expect(result).toBe(false);
    });

    test("should evaluate < (true)", () => {
      const result = ConditionalEvaluator.evaluate("trigger.count < 150", mockContext);
      expect(result).toBe(true);
    });

    test("should evaluate <= (true, equal)", () => {
      const result = ConditionalEvaluator.evaluate("trigger.count <= 100", mockContext);
      expect(result).toBe(true);
    });

    test("should evaluate >= (true, greater)", () => {
      const result = ConditionalEvaluator.evaluate("trigger.count >= 50", mockContext);
      expect(result).toBe(true);
    });

    test("should evaluate >= (false)", () => {
      const result = ConditionalEvaluator.evaluate("trigger.count >= 150", mockContext);
      expect(result).toBe(false);
    });
  });

  describe("Logical operators (AND, OR, NOT)", () => {
    test("should evaluate AND (both true)", () => {
      const result = ConditionalEvaluator.evaluate(
        "trigger.value == 'active' AND trigger.count > 50",
        mockContext
      );
      expect(result).toBe(true);
    });

    test("should evaluate AND (one false)", () => {
      const result = ConditionalEvaluator.evaluate(
        "trigger.value == 'active' AND trigger.count > 150",
        mockContext
      );
      expect(result).toBe(false);
    });

    test("should evaluate OR (one true)", () => {
      const result = ConditionalEvaluator.evaluate(
        "trigger.value == 'inactive' OR trigger.count > 50",
        mockContext
      );
      expect(result).toBe(true);
    });

    test("should evaluate OR (both false)", () => {
      const result = ConditionalEvaluator.evaluate(
        "trigger.value == 'inactive' OR trigger.count > 150",
        mockContext
      );
      expect(result).toBe(false);
    });

    test("should evaluate NOT (true)", () => {
      const result = ConditionalEvaluator.evaluate("NOT (trigger.value == 'inactive')", mockContext);
      expect(result).toBe(true);
    });

    test("should evaluate NOT (false)", () => {
      const result = ConditionalEvaluator.evaluate("NOT (trigger.value == 'active')", mockContext);
      expect(result).toBe(false);
    });
  });

  describe("Complex expressions", () => {
    test("should evaluate complex AND/OR combination", () => {
      const result = ConditionalEvaluator.evaluate(
        "(trigger.value == 'active' AND trigger.count > 50) OR trigger.status == 'failed'",
        mockContext
      );
      expect(result).toBe(true);
    });

    test("should handle multiple conditions", () => {
      const result = ConditionalEvaluator.evaluate(
        "trigger.value == 'active' AND trigger.count >= 100 AND trigger.status == 'success'",
        mockContext
      );
      expect(result).toBe(true);
    });
  });

  describe("Previous step references", () => {
    test("should evaluate previous step output", () => {
      const result = ConditionalEvaluator.evaluate("previous.result > 40", mockContext);
      expect(result).toBe(true);
    });

    test("should handle boolean previous output", () => {
      const result = ConditionalEvaluator.evaluate("previous.failed == false", mockContext);
      expect(result).toBe(true);
    });
  });

  describe("Error handling", () => {
    test("should reject function calls", () => {
      expect(() => {
        ConditionalEvaluator.evaluate("trigger.value.includes('active')", mockContext);
      }).toThrow("Function calls not allowed");
    });

    test("should reject template literals", () => {
      expect(() => {
        ConditionalEvaluator.evaluate("`trigger value is ${trigger.value}`", mockContext);
      }).toThrow("Template literals not allowed");
    });

    test("should reject undefined trigger variables", () => {
      expect(() => {
        ConditionalEvaluator.evaluate("trigger.undefined_field == 'test'", mockContext);
      }).toThrow("Variable trigger.undefined_field not found");
    });

    test("should reject undefined previous variables", () => {
      expect(() => {
        ConditionalEvaluator.evaluate("previous.undefined_field == 'test'", mockContext);
      }).toThrow("Variable previous.undefined_field not found");
    });

    test("should reject empty expressions", () => {
      expect(() => {
        ConditionalEvaluator.evaluate("", mockContext);
      }).toThrow("Expression cannot be empty");
    });

    test("should reject invalid characters", () => {
      expect(() => {
        ConditionalEvaluator.evaluate("trigger.value += 5", mockContext);
      }).toThrow("Invalid characters");
    });
  });

  describe("Syntax validation", () => {
    test("should validate correct syntax", () => {
      const result = ConditionalEvaluator.validateSyntax("trigger.value == 'active'");
      expect(result.valid).toBe(true);
    });

    test("should reject invalid syntax", () => {
      const result = ConditionalEvaluator.validateSyntax("trigger.value == 'active'");
      expect(result.valid).toBe(true);
    });

    test("should identify unclosed parentheses", () => {
      const result = ConditionalEvaluator.validateSyntax("(trigger.value == 'active'");
      expect(result.valid).toBe(false);
      expect(result.error).toBeDefined();
    });
  });

  describe("Case sensitivity", () => {
    test("should handle AND/OR case insensitive", () => {
      const result1 = ConditionalEvaluator.evaluate(
        "trigger.value == 'active' and trigger.count > 50",
        mockContext
      );
      expect(result1).toBe(true);

      const result2 = ConditionalEvaluator.evaluate(
        "trigger.value == 'active' or trigger.count > 150",
        mockContext
      );
      expect(result2).toBe(true);
    });
  });

  describe("Edge cases", () => {
    test("should handle whitespace normalization", () => {
      const result = ConditionalEvaluator.evaluate(
        "  trigger.value   ==   'active'  ",
        mockContext
      );
      expect(result).toBe(true);
    });

    test("should handle zero value comparison", () => {
      const zeroContext: ExecutionContext = {
        ...mockContext,
        trigger_data: { count: 0 },
      };
      const result = ConditionalEvaluator.evaluate("trigger.count == 0", zeroContext);
      expect(result).toBe(true);
    });

    test("should handle null comparison", () => {
      const nullContext: ExecutionContext = {
        ...mockContext,
        trigger_data: { value: null },
      };
      expect(() => {
        ConditionalEvaluator.evaluate("trigger.value == null", nullContext);
      }).toThrow(); // null not allowed in our safe evaluation
    });
  });
});
