import { validatePassword } from '../src/utils/password';

describe('Auth', () => {
  describe('Password Validation', () => {
    test('should accept valid password', () => {
      const result = validatePassword('Test1234');
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    test('should reject password without letter', () => {
      const result = validatePassword('12345678');
      expect(result.valid).toBe(false);
      expect(result.errors).toContain(
        'Password must contain at least one letter'
      );
    });

    test('should reject password without number', () => {
      const result = validatePassword('abcdefgh');
      expect(result.valid).toBe(false);
      expect(result.errors).toContain(
        'Password must contain at least one number'
      );
    });

    test('should reject password shorter than 8 chars', () => {
      const result = validatePassword('Test12');
      expect(result.valid).toBe(false);
      expect(result.errors).toContain(
        'Password must be at least 8 characters'
      );
    });

    test('should accept password with special chars', () => {
      const result = validatePassword('Test!@#$%1234');
      expect(result.valid).toBe(true);
    });
  });

  describe('Email Validation', () => {
    test('should accept valid email format', () => {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      expect(emailRegex.test('user@example.com')).toBe(true);
      expect(emailRegex.test('user.name@example.co.uk')).toBe(true);
    });

    test('should reject invalid email format', () => {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      expect(emailRegex.test('invalid-email')).toBe(false);
      expect(emailRegex.test('user@example')).toBe(false);
    });
  });
});
