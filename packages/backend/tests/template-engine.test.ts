import { describe, it, expect } from 'vitest';
import { TemplateEngineService } from '../src/services/template-engine.service';

describe('TemplateEngineService', () => {
  describe('substitute', () => {
    it('should substitute single variable', () => {
      const template = 'Rule {{rule_name}} completed';
      const variables = { rule_name: 'Task Alert' };
      const result = TemplateEngineService.substitute(template, variables);

      expect(result).toBe('Rule Task Alert completed');
    });

    it('should substitute multiple variables', () => {
      const template = 'Rule {{rule_name}} completed in {{duration_ms}}ms with status {{status}}';
      const variables = {
        rule_name: 'High Priority Task',
        duration_ms: 245,
        status: 'success',
      };
      const result = TemplateEngineService.substitute(template, variables);

      expect(result).toBe('Rule High Priority Task completed in 245ms with status success');
    });

    it('should handle missing variables', () => {
      const template = 'Rule {{rule_name}} with {{unknown_var}}';
      const variables = { rule_name: 'Task' };
      const result = TemplateEngineService.substitute(template, variables);

      expect(result).toContain('Rule Task');
      expect(result).toContain('{{unknown_var}}');
    });

    it('should handle empty template', () => {
      const result = TemplateEngineService.substitute('', {});
      expect(result).toBe('');
    });
  });

  describe('validateTemplate', () => {
    it('should validate correct template', () => {
      const template = 'Rule {{rule_name}} completed';
      const { valid, errors } = TemplateEngineService.validateTemplate(template);

      expect(valid).toBe(true);
      expect(errors).toHaveLength(0);
    });

    it('should reject unmatched brackets', () => {
      const template = 'Rule {{rule_name completed';
      const { valid, errors } = TemplateEngineService.validateTemplate(template);

      expect(valid).toBe(false);
      expect(errors.length).toBeGreaterThan(0);
    });

    it('should reject unknown variables', () => {
      const template = 'Rule {{unknown_variable}}';
      const { valid, errors } = TemplateEngineService.validateTemplate(template);

      expect(valid).toBe(false);
      expect(errors.some((e) => e.includes('Unknown variable'))).toBe(true);
    });
  });

  describe('extractVariables', () => {
    it('should extract all variables from template', () => {
      const template = 'Rule {{rule_name}} completed in {{duration_ms}}ms with {{status}}';
      const variables = TemplateEngineService.extractVariables(template);

      expect(variables).toContain('rule_name');
      expect(variables).toContain('duration_ms');
      expect(variables).toContain('status');
      expect(variables.length).toBe(3);
    });

    it('should not include duplicates', () => {
      const template = 'Rule {{rule_name}} with {{rule_name}}';
      const variables = TemplateEngineService.extractVariables(template);

      expect(variables).toEqual(['rule_name']);
    });
  });
});
