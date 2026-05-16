/**
 * Input Sanitizer Service Tests
 * اختبارات خدمة تنظيف المدخلات
 * @version 1.0.0
 */

import { describe, it, expect } from 'vitest';
import { inputSanitizer } from '../InputSanitizerService';

describe('InputSanitizerService', () => {
  describe('HTML Sanitization', () => {
    it('should remove script tags', () => {
      const malicious = '<script>alert("XSS")</script>Hello';
      const sanitized = inputSanitizer.sanitizeHTML(malicious);
      
      expect(sanitized).not.toContain('<script>');
    });

    it('should remove javascript: protocol', () => {
      const malicious = '<a href="javascript:alert(1)">Click</a>';
      const sanitized = inputSanitizer.sanitizeHTML(malicious);
      
      expect(sanitized).not.toContain('javascript:');
    });

    it('should remove event handlers', () => {
      const malicious = '<div onclick="alert(1)">Click</div>';
      const sanitized = inputSanitizer.sanitizeHTML(malicious);
      
      expect(sanitized).not.toContain('onclick');
    });

    it('should escape HTML entities', () => {
      const input = '<div>Test & "Quote"</div>';
      const sanitized = inputSanitizer.sanitizeHTML(input);
      
      expect(sanitized).toContain('&lt;');
      expect(sanitized).toContain('&gt;');
      expect(sanitized).toContain('&amp;');
      expect(sanitized).toContain('&quot;');
    });

    it('should handle empty input', () => {
      expect(inputSanitizer.sanitizeHTML('')).toBe('');
    });
  });

  describe('SQL Sanitization', () => {
    it('should remove quotes', () => {
      const malicious = "'; DROP TABLE users; --";
      const sanitized = inputSanitizer.sanitizeSQL(malicious);
      
      expect(sanitized).not.toContain("'");
      expect(sanitized).not.toContain(';');
      expect(sanitized).not.toContain('--');
    });

    it('should remove SQL comments', () => {
      const malicious = 'test /* comment */ data';
      const sanitized = inputSanitizer.sanitizeSQL(malicious);
      
      expect(sanitized).not.toContain('/*');
      expect(sanitized).not.toContain('*/');
    });

    it('should remove dangerous SQL commands', () => {
      const malicious = 'xp_cmdshell sp_executesql';
      const sanitized = inputSanitizer.sanitizeSQL(malicious);
      
      expect(sanitized).not.toContain('xp_');
      expect(sanitized).not.toContain('sp_');
    });
  });

  describe('Path Sanitization', () => {
    it('should remove directory traversal', () => {
      const malicious = '../../etc/passwd';
      const sanitized = inputSanitizer.sanitizePath(malicious);
      
      expect(sanitized).not.toContain('..');
    });

    it('should normalize slashes', () => {
      const path = 'folder\\subfolder//file.txt';
      const sanitized = inputSanitizer.sanitizePath(path);
      
      expect(sanitized).toBe('folder/subfolder/file.txt');
    });

    it('should remove leading slash', () => {
      const path = '/absolute/path';
      const sanitized = inputSanitizer.sanitizePath(path);
      
      expect(sanitized).toBe('absolute/path');
    });
  });

  describe('Email Validation', () => {
    it('should validate correct emails', () => {
      expect(inputSanitizer.validateEmail('user@example.com')).toBe(true);
      expect(inputSanitizer.validateEmail('test.user@domain.co.uk')).toBe(true);
    });

    it('should reject invalid emails', () => {
      expect(inputSanitizer.validateEmail('invalid')).toBe(false);
      expect(inputSanitizer.validateEmail('user@')).toBe(false);
      expect(inputSanitizer.validateEmail('@example.com')).toBe(false);
    });

    it('should handle empty email', () => {
      expect(inputSanitizer.validateEmail('')).toBe(false);
    });
  });

  describe('Iraqi Phone Validation', () => {
    it('should validate correct Iraqi phones', () => {
      expect(inputSanitizer.validateIraqiPhone('07901234567')).toBe(true);
      expect(inputSanitizer.validateIraqiPhone('7701234567')).toBe(true);
    });

    it('should reject invalid Iraqi phones', () => {
      expect(inputSanitizer.validateIraqiPhone('123456')).toBe(false);
      expect(inputSanitizer.validateIraqiPhone('06901234567')).toBe(false);
    });

    it('should handle spaces in phone number', () => {
      expect(inputSanitizer.validateIraqiPhone('079 0123 4567')).toBe(true);
    });
  });

  describe('Text Sanitization', () => {
    it('should trim whitespace', () => {
      const text = '  Hello World  ';
      const sanitized = inputSanitizer.sanitizeText(text);
      
      expect(sanitized).toBe('Hello World');
    });

    it('should remove dangerous characters', () => {
      const text = 'Hello <World>';
      const sanitized = inputSanitizer.sanitizeText(text);
      
      expect(sanitized).not.toContain('<');
      expect(sanitized).not.toContain('>');
    });

    it('should respect max length', () => {
      const text = 'Hello World';
      const sanitized = inputSanitizer.sanitizeText(text, 5);
      
      expect(sanitized.length).toBe(5);
      expect(sanitized).toBe('Hello');
    });
  });

  describe('Number Validation', () => {
    it('should validate numbers', () => {
      expect(inputSanitizer.validateNumber(123)).toBe(true);
      expect(inputSanitizer.validateNumber('456')).toBe(true);
    });

    it('should validate range', () => {
      expect(inputSanitizer.validateNumber(50, 0, 100)).toBe(true);
      expect(inputSanitizer.validateNumber(150, 0, 100)).toBe(false);
      expect(inputSanitizer.validateNumber(-10, 0, 100)).toBe(false);
    });

    it('should reject invalid numbers', () => {
      expect(inputSanitizer.validateNumber('abc')).toBe(false);
      expect(inputSanitizer.validateNumber(NaN)).toBe(false);
    });
  });

  describe('Case Number Validation', () => {
    it('should validate Iraqi case numbers', () => {
      expect(inputSanitizer.validateCaseNumber('2024/123')).toBe(true);
      expect(inputSanitizer.validateCaseNumber('2023/456')).toBe(true);
    });

    it('should reject invalid case numbers', () => {
      expect(inputSanitizer.validateCaseNumber('123')).toBe(false);
      expect(inputSanitizer.validateCaseNumber('ABC/123')).toBe(false);
      expect(inputSanitizer.validateCaseNumber('2024-123')).toBe(false);
    });
  });

  describe('File Name Sanitization', () => {
    it('should sanitize file names', () => {
      const dangerous = 'my../../../file<>.txt';
      const sanitized = inputSanitizer.sanitizeFileName(dangerous);
      
      expect(sanitized).not.toContain('../');
      expect(sanitized).not.toContain('<');
      expect(sanitized).not.toContain('>');
    });

    it('should preserve Arabic characters', () => {
      const arabic = 'ملف_عربي.pdf';
      const sanitized = inputSanitizer.sanitizeFileName(arabic);
      
      expect(sanitized).toContain('ملف');
      expect(sanitized).toContain('عربي');
    });

    it('should limit file name length', () => {
      const longName = 'a'.repeat(300) + '.txt';
      const sanitized = inputSanitizer.sanitizeFileName(longName);
      
      expect(sanitized.length).toBeLessThanOrEqual(255);
    });
  });

  describe('URL Validation', () => {
    it('should validate HTTP/HTTPS URLs', () => {
      expect(inputSanitizer.validateURL('https://example.com')).toBe(true);
      expect(inputSanitizer.validateURL('http://example.com')).toBe(true);
    });

    it('should reject invalid URLs', () => {
      expect(inputSanitizer.validateURL('javascript:alert(1)')).toBe(false);
      expect(inputSanitizer.validateURL('file:///etc/passwd')).toBe(false);
      expect(inputSanitizer.validateURL('not-a-url')).toBe(false);
    });
  });

  describe('Object Sanitization', () => {
    it('should sanitize nested objects', () => {
      const obj = {
        name: '<script>alert</script>Test',
        nested: {
          value: 'Hello<World>',
        },
        array: ['<test>', 'normal'],
      };

      const sanitized = inputSanitizer.sanitizeObject(obj);

      expect(sanitized.name).not.toContain('<script>');
      expect(sanitized.nested.value).not.toContain('<');
      expect(sanitized.array[0]).not.toContain('<');
    });

    it('should preserve structure', () => {
      const obj = {
        string: 'test',
        number: 123,
        boolean: true,
        null: null,
      };

      const sanitized = inputSanitizer.sanitizeObject(obj);

      expect(typeof sanitized.string).toBe('string');
      expect(typeof sanitized.number).toBe('number');
      expect(typeof sanitized.boolean).toBe('boolean');
      expect(sanitized.null).toBe(null);
    });
  });

  describe('Date Validation', () => {
    it('should validate dates', () => {
      expect(inputSanitizer.validateDate('2024-01-01')).toBe(true);
      expect(inputSanitizer.validateDate('2024-12-31T23:59:59')).toBe(true);
    });

    it('should reject invalid dates', () => {
      expect(inputSanitizer.validateDate('invalid')).toBe(false);
      expect(inputSanitizer.validateDate('2024-13-01')).toBe(false);
    });
  });

  describe('Invisible Characters', () => {
    it('should remove invisible characters', () => {
      const text = 'Hello\u200BWorld\uFEFF';
      const sanitized = inputSanitizer.removeInvisibleChars(text);
      
      expect(sanitized).toBe('HelloWorld');
    });

    it('should remove control characters', () => {
      const text = 'Test\x00\x1FData';
      const sanitized = inputSanitizer.removeInvisibleChars(text);
      
      expect(sanitized).toBe('TestData');
    });
  });

  describe('JSON Sanitization', () => {
    it('should sanitize valid JSON', () => {
      const json = '{"name": "test"}';
      const sanitized = inputSanitizer.sanitizeJSON(json);
      
      expect(sanitized).toBe('{"name":"test"}');
    });

    it('should return null for invalid JSON', () => {
      const invalid = '{name: test}';
      const sanitized = inputSanitizer.sanitizeJSON(invalid);
      
      expect(sanitized).toBe(null);
    });
  });
});
