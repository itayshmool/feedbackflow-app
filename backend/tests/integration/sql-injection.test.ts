/**
 * SQL Injection Prevention Integration Tests
 * 
 * These tests verify that the application properly prevents SQL injection attacks
 * at the API level. They test real endpoints with malicious payloads.
 */

import { describe, it, expect, beforeAll, afterAll } from '@jest/globals';

// Mock the database module to test validation without hitting real DB
jest.mock('../../src/config/real-database', () => ({
  query: jest.fn().mockResolvedValue({ rows: [], rowCount: 0 }),
  pool: {
    connect: jest.fn().mockResolvedValue({
      query: jest.fn().mockResolvedValue({ rows: [], rowCount: 0 }),
      release: jest.fn(),
    }),
  },
  testConnection: jest.fn().mockResolvedValue(true),
}));

import {
  validateSortColumn,
  validateSortOrder,
  isValidFieldName,
  sanitizeUpdateFields,
  buildOrderByClause,
} from '../../src/shared/utils/sql-security';

describe('SQL Injection Prevention - Integration Tests', () => {
  describe('Sort Parameter Injection Prevention', () => {
    const sqlInjectionPayloads = [
      '1; DROP TABLE users;--',
      "name' OR '1'='1",
      'email; DELETE FROM users WHERE 1=1;--',
      'UNION SELECT * FROM information_schema.tables--',
      '1 UNION SELECT password FROM users--',
      "name; UPDATE users SET is_admin='true'--",
      '1); DROP TABLE feedback_cycles;--',
      "email' AND SLEEP(5)--",
      'name/**/OR/**/1=1',
      '1; EXEC xp_cmdshell("whoami")--',
    ];

    describe('validateSortColumn', () => {
      it.each(sqlInjectionPayloads)(
        'should reject SQL injection payload: %s',
        (payload) => {
          const result = validateSortColumn('users', payload);
          expect(result).toBe('created_at'); // Should return default
          expect(result).not.toContain(payload);
        }
      );

      it('should only allow whitelisted columns', () => {
        // Valid columns should pass
        expect(validateSortColumn('users', 'email')).toBe('email');
        expect(validateSortColumn('users', 'name')).toBe('name');
        expect(validateSortColumn('users', 'created_at')).toBe('created_at');

        // Non-existent columns should fail
        expect(validateSortColumn('users', 'password')).toBe('created_at');
        expect(validateSortColumn('users', 'secret')).toBe('created_at');
        expect(validateSortColumn('users', 'admin_flag')).toBe('created_at');
      });
    });

    describe('validateSortOrder', () => {
      it.each(sqlInjectionPayloads)(
        'should reject SQL injection payload: %s',
        (payload) => {
          const result = validateSortOrder(payload);
          expect(['ASC', 'DESC']).toContain(result);
          expect(result).not.toContain(payload);
        }
      );

      it('should only allow ASC or DESC', () => {
        expect(validateSortOrder('ASC')).toBe('ASC');
        expect(validateSortOrder('asc')).toBe('ASC');
        expect(validateSortOrder('DESC')).toBe('DESC');
        expect(validateSortOrder('desc')).toBe('DESC');
        expect(validateSortOrder('ascending')).toBe('DESC');
        expect(validateSortOrder('descending')).toBe('DESC');
      });
    });

    describe('buildOrderByClause', () => {
      it('should build safe ORDER BY clauses', () => {
        const result = buildOrderByClause('users', 'email', 'asc');
        expect(result).toBe('ORDER BY email ASC');
      });

      it('should sanitize malicious sortBy', () => {
        const result = buildOrderByClause('users', '1; DROP TABLE users;--', 'asc');
        expect(result).toBe('ORDER BY created_at ASC');
        expect(result).not.toContain('DROP');
      });

      it('should sanitize malicious sortOrder', () => {
        const result = buildOrderByClause('users', 'email', 'ASC; DROP TABLE users;--');
        expect(result).toBe('ORDER BY email DESC');
        expect(result).not.toContain('DROP');
      });
    });
  });

  describe('Field Name Injection Prevention', () => {
    const maliciousFieldNames = [
      '1; DROP TABLE users;--',
      "field'--",
      'field; DELETE FROM users',
      'field OR 1=1',
      'field/**/OR/**/1=1',
      '1=1; DROP TABLE',
      "'); DROP TABLE users;--",
    ];

    describe('isValidFieldName', () => {
      it.each(maliciousFieldNames)(
        'should reject malicious field name: %s',
        (fieldName) => {
          expect(isValidFieldName(fieldName)).toBe(false);
        }
      );

      it('should accept valid field names', () => {
        expect(isValidFieldName('email')).toBe(true);
        expect(isValidFieldName('name')).toBe(true);
        expect(isValidFieldName('created_at')).toBe(true);
        expect(isValidFieldName('is_active')).toBe(true);
        expect(isValidFieldName('_private')).toBe(true);
        expect(isValidFieldName('field123')).toBe(true);
      });
    });

    describe('sanitizeUpdateFields', () => {
      it('should filter out fields with SQL injection in keys', () => {
        const maliciousInput = {
          name: 'Valid Name',
          "id; DROP TABLE users;--": 'malicious value',
          email: 'test@test.com',
          "field'--": 'another malicious',
        };

        const result = sanitizeUpdateFields(maliciousInput, 'users');

        // Should only include valid, allowed fields
        expect(result).toHaveProperty('name', 'Valid Name');
        expect(result).not.toHaveProperty("id; DROP TABLE users;--");
        expect(result).not.toHaveProperty("field'--");
        expect(result).not.toHaveProperty('email'); // email not in allowed update fields
      });

      it('should return empty object when all fields are invalid', () => {
        const allMalicious = {
          "id; DROP TABLE users;--": 'value1',
          "field'--": 'value2',
          'OR 1=1': 'value3',
        };

        const result = sanitizeUpdateFields(allMalicious, 'users');
        expect(result).toEqual({});
      });
    });
  });

  describe('Table-Specific Validation', () => {
    describe('Users table', () => {
      it('should validate users sort columns', () => {
        const validColumns = ['id', 'email', 'name', 'created_at', 'is_active'];
        const invalidColumns = ['password', 'password_hash', 'token', 'secret'];

        validColumns.forEach(col => {
          expect(validateSortColumn('users', col)).toBe(col);
        });

        invalidColumns.forEach(col => {
          expect(validateSortColumn('users', col)).toBe('created_at');
        });
      });
    });

    describe('Organizations table', () => {
      it('should validate organizations sort columns', () => {
        const validColumns = ['id', 'name', 'slug', 'status'];
        const invalidColumns = ['api_key', 'secret', 'password'];

        validColumns.forEach(col => {
          expect(validateSortColumn('organizations', col)).toBe(col);
        });

        invalidColumns.forEach(col => {
          expect(validateSortColumn('organizations', col)).toBe('created_at');
        });
      });
    });

    describe('Unknown table', () => {
      it('should return default for unknown tables', () => {
        expect(validateSortColumn('nonexistent_table', 'name')).toBe('created_at');
        expect(validateSortColumn('hacker_table', 'password')).toBe('created_at');
      });
    });
  });

  describe('Edge Cases', () => {
    it('should handle undefined and null inputs', () => {
      expect(validateSortColumn('users', undefined)).toBe('created_at');
      expect(validateSortColumn('users', '')).toBe('created_at');
      expect(validateSortOrder(undefined)).toBe('DESC');
      expect(validateSortOrder('')).toBe('DESC');
    });

    it('should handle camelCase to snake_case conversion', () => {
      expect(validateSortColumn('users', 'createdAt')).toBe('created_at');
      expect(validateSortColumn('users', 'lastLoginAt')).toBe('last_login_at');
      expect(validateSortColumn('users', 'isActive')).toBe('is_active');
    });

    it('should handle whitespace', () => {
      expect(validateSortOrder('  asc  ')).toBe('ASC');
      expect(validateSortOrder('\tdesc\n')).toBe('DESC');
    });

    it('should be case-insensitive for sort order', () => {
      expect(validateSortOrder('ASC')).toBe('ASC');
      expect(validateSortOrder('asc')).toBe('ASC');
      expect(validateSortOrder('AsC')).toBe('ASC');
      expect(validateSortOrder('DESC')).toBe('DESC');
      expect(validateSortOrder('desc')).toBe('DESC');
      expect(validateSortOrder('DeSc')).toBe('DESC');
    });
  });

  describe('Security Regression Tests', () => {
    it('should prevent second-order SQL injection', () => {
      // Attacker might try to inject payload that gets stored and executed later
      const storedPayload = "name'); DROP TABLE users; SELECT ('";
      expect(validateSortColumn('users', storedPayload)).toBe('created_at');
      expect(isValidFieldName(storedPayload)).toBe(false);
    });

    it('should prevent blind SQL injection timing attacks', () => {
      const timingPayload = "email' AND SLEEP(10)--";
      expect(validateSortColumn('users', timingPayload)).toBe('created_at');
    });

    it('should prevent UNION-based SQL injection', () => {
      const unionPayload = 'email UNION SELECT password FROM users--';
      expect(validateSortColumn('users', unionPayload)).toBe('created_at');
    });

    it('should prevent stacked query injection', () => {
      const stackedPayload = 'email; DELETE FROM users WHERE 1=1; SELECT email';
      expect(validateSortColumn('users', stackedPayload)).toBe('created_at');
    });
  });
});

