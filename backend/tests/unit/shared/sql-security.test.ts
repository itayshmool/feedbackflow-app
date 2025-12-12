/**
 * Unit tests for SQL Security Utilities
 * 
 * These tests verify that the SQL injection prevention utilities
 * correctly validate and sanitize user input.
 */

import {
  validateSortColumn,
  validateSortOrder,
  isValidFieldName,
  sanitizeUpdateFields,
  validateWhereColumns,
  buildOrderByClause,
  filterValidFieldNames,
  ALLOWED_SORT_COLUMNS,
  ALLOWED_UPDATE_FIELDS,
} from '../../../src/shared/utils/sql-security';

describe('SQL Security Utilities', () => {
  describe('validateSortColumn', () => {
    describe('valid columns', () => {
      it('should return valid column for users table', () => {
        expect(validateSortColumn('users', 'email')).toBe('email');
        expect(validateSortColumn('users', 'name')).toBe('name');
        expect(validateSortColumn('users', 'created_at')).toBe('created_at');
        expect(validateSortColumn('users', 'is_active')).toBe('is_active');
      });

      it('should return valid column for organizations table', () => {
        expect(validateSortColumn('organizations', 'name')).toBe('name');
        expect(validateSortColumn('organizations', 'slug')).toBe('slug');
        expect(validateSortColumn('organizations', 'status')).toBe('status');
      });

      it('should convert camelCase to snake_case', () => {
        expect(validateSortColumn('users', 'createdAt')).toBe('created_at');
        expect(validateSortColumn('users', 'lastLoginAt')).toBe('last_login_at');
        expect(validateSortColumn('users', 'isActive')).toBe('is_active');
      });
    });

    describe('invalid columns', () => {
      it('should return default for invalid columns', () => {
        expect(validateSortColumn('users', 'password')).toBe('created_at');
        expect(validateSortColumn('users', 'invalid_col')).toBe('created_at');
        expect(validateSortColumn('users', 'secret')).toBe('created_at');
      });

      it('should reject SQL injection attempts', () => {
        expect(validateSortColumn('users', '1; DROP TABLE users;--')).toBe('created_at');
        expect(validateSortColumn('users', 'name OR 1=1')).toBe('created_at');
        expect(validateSortColumn('users', "email' --")).toBe('created_at');
        expect(validateSortColumn('users', 'email; DELETE FROM users')).toBe('created_at');
        expect(validateSortColumn('users', 'UNION SELECT * FROM passwords')).toBe('created_at');
      });

      it('should handle undefined/null/empty gracefully', () => {
        expect(validateSortColumn('users', undefined)).toBe('created_at');
        expect(validateSortColumn('users', '')).toBe('created_at');
      });

      it('should return default for unknown tables', () => {
        expect(validateSortColumn('unknown_table', 'name')).toBe('created_at');
        expect(validateSortColumn('hackers', 'password')).toBe('created_at');
      });
    });

    describe('custom default column', () => {
      it('should use custom default when provided', () => {
        expect(validateSortColumn('users', 'invalid', 'name')).toBe('name');
        expect(validateSortColumn('users', undefined, 'email')).toBe('email');
      });
    });
  });

  describe('validateSortOrder', () => {
    describe('valid orders', () => {
      it('should accept lowercase asc/desc', () => {
        expect(validateSortOrder('asc')).toBe('ASC');
        expect(validateSortOrder('desc')).toBe('DESC');
      });

      it('should accept uppercase ASC/DESC', () => {
        expect(validateSortOrder('ASC')).toBe('ASC');
        expect(validateSortOrder('DESC')).toBe('DESC');
      });

      it('should handle mixed case', () => {
        expect(validateSortOrder('Asc')).toBe('ASC');
        expect(validateSortOrder('Desc')).toBe('DESC');
        expect(validateSortOrder('AsC')).toBe('ASC');
      });

      it('should trim whitespace', () => {
        expect(validateSortOrder('  asc  ')).toBe('ASC');
        expect(validateSortOrder('\tdesc\n')).toBe('DESC');
      });
    });

    describe('invalid orders', () => {
      it('should default to DESC for invalid input', () => {
        expect(validateSortOrder('invalid')).toBe('DESC');
        expect(validateSortOrder('ascending')).toBe('DESC');
        expect(validateSortOrder('up')).toBe('DESC');
        expect(validateSortOrder('down')).toBe('DESC');
      });

      it('should default to DESC for undefined/empty', () => {
        expect(validateSortOrder(undefined)).toBe('DESC');
        expect(validateSortOrder('')).toBe('DESC');
      });

      it('should reject SQL injection attempts', () => {
        expect(validateSortOrder('ASC; DROP TABLE users')).toBe('DESC');
        expect(validateSortOrder('DESC--')).toBe('DESC');
        expect(validateSortOrder('1=1')).toBe('DESC');
      });
    });
  });

  describe('isValidFieldName', () => {
    describe('valid field names', () => {
      it('should accept standard field names', () => {
        expect(isValidFieldName('email')).toBe(true);
        expect(isValidFieldName('name')).toBe(true);
        expect(isValidFieldName('created_at')).toBe(true);
        expect(isValidFieldName('is_active')).toBe(true);
      });

      it('should accept underscores', () => {
        expect(isValidFieldName('_private')).toBe(true);
        expect(isValidFieldName('field_name')).toBe(true);
        expect(isValidFieldName('field__name')).toBe(true);
      });

      it('should accept alphanumeric', () => {
        expect(isValidFieldName('field1')).toBe(true);
        expect(isValidFieldName('field123')).toBe(true);
        expect(isValidFieldName('field_1')).toBe(true);
      });
    });

    describe('invalid field names', () => {
      it('should reject names starting with numbers', () => {
        expect(isValidFieldName('1invalid')).toBe(false);
        expect(isValidFieldName('123field')).toBe(false);
      });

      it('should reject special characters', () => {
        expect(isValidFieldName('field-name')).toBe(false);
        expect(isValidFieldName('field.name')).toBe(false);
        expect(isValidFieldName('field name')).toBe(false);
        expect(isValidFieldName('field@name')).toBe(false);
      });

      it('should reject SQL injection patterns', () => {
        expect(isValidFieldName('field;DROP')).toBe(false);
        expect(isValidFieldName("field'--")).toBe(false);
        expect(isValidFieldName('field=1')).toBe(false);
        expect(isValidFieldName('field OR 1')).toBe(false);
      });

      it('should reject empty string', () => {
        expect(isValidFieldName('')).toBe(false);
      });
    });
  });

  describe('sanitizeUpdateFields', () => {
    describe('filtering', () => {
      it('should filter to allowed fields only', () => {
        const input = {
          name: 'Test User',
          email: 'test@test.com', // Not in allowed update fields
          isActive: true,
          password: 'secret', // Not allowed
        };
        const result = sanitizeUpdateFields(input, 'users');
        
        expect(result).toEqual({
          name: 'Test User',
          is_active: true,
        });
        expect(result).not.toHaveProperty('email');
        expect(result).not.toHaveProperty('password');
      });

      it('should convert camelCase to snake_case', () => {
        const input = { avatarUrl: 'http://example.com/img.png' };
        const result = sanitizeUpdateFields(input, 'users');
        
        expect(result).toEqual({ avatar_url: 'http://example.com/img.png' });
        expect(result).not.toHaveProperty('avatarUrl');
      });

      it('should handle already snake_case fields', () => {
        const input = { avatar_url: 'http://example.com/img.png', name: 'Test' };
        const result = sanitizeUpdateFields(input, 'users');
        
        expect(result).toEqual({
          avatar_url: 'http://example.com/img.png',
          name: 'Test',
        });
      });
    });

    describe('edge cases', () => {
      it('should return empty object for unknown table', () => {
        const input = { name: 'Test' };
        const result = sanitizeUpdateFields(input, 'unknown_table');
        
        expect(result).toEqual({});
      });

      it('should return empty object for empty input', () => {
        const result = sanitizeUpdateFields({}, 'users');
        expect(result).toEqual({});
      });

      it('should filter out SQL injection attempts in keys', () => {
        const input = {
          name: 'Valid',
          "id; DROP TABLE users;--": 'malicious',
        };
        const result = sanitizeUpdateFields(input, 'users');
        
        expect(result).toEqual({ name: 'Valid' });
      });
    });

    describe('organizations table', () => {
      it('should allow organization-specific fields', () => {
        const input = {
          name: 'Acme Corp',
          description: 'A company',
          contactEmail: 'contact@acme.com',
          subscriptionPlan: 'enterprise',
        };
        const result = sanitizeUpdateFields(input, 'organizations');
        
        expect(result).toHaveProperty('name', 'Acme Corp');
        expect(result).toHaveProperty('description', 'A company');
        expect(result).toHaveProperty('contact_email', 'contact@acme.com');
        expect(result).toHaveProperty('subscription_plan', 'enterprise');
      });
    });
  });

  describe('validateWhereColumns', () => {
    it('should return true for valid columns', () => {
      expect(validateWhereColumns({ email: 'test@test.com' }, 'users')).toBe(true);
      expect(validateWhereColumns({ email: 'x', name: 'y' }, 'users')).toBe(true);
      expect(validateWhereColumns({ is_active: true }, 'users')).toBe(true);
    });

    it('should return false for invalid columns', () => {
      expect(validateWhereColumns({ '1; DROP TABLE': 'x' }, 'users')).toBe(false);
      expect(validateWhereColumns({ "email'--": 'x' }, 'users')).toBe(false);
      expect(validateWhereColumns({ 'field name': 'x' }, 'users')).toBe(false);
    });

    it('should return true for empty conditions', () => {
      expect(validateWhereColumns({}, 'users')).toBe(true);
    });

    it('should return false if any column is invalid', () => {
      expect(validateWhereColumns({ 
        email: 'valid', 
        'invalid;DROP': 'malicious' 
      }, 'users')).toBe(false);
    });
  });

  describe('buildOrderByClause', () => {
    it('should build valid ORDER BY clause', () => {
      expect(buildOrderByClause('users', 'email', 'asc')).toBe('ORDER BY email ASC');
      expect(buildOrderByClause('users', 'name', 'desc')).toBe('ORDER BY name DESC');
      expect(buildOrderByClause('users', 'createdAt', 'desc')).toBe('ORDER BY created_at DESC');
    });

    it('should include table alias when provided', () => {
      expect(buildOrderByClause('users', 'email', 'asc', 'u')).toBe('ORDER BY u.email ASC');
      expect(buildOrderByClause('organizations', 'name', 'desc', 'o')).toBe('ORDER BY o.name DESC');
    });

    it('should use defaults for invalid input', () => {
      expect(buildOrderByClause('users', 'invalid', 'invalid')).toBe('ORDER BY created_at DESC');
      expect(buildOrderByClause('users', undefined, undefined)).toBe('ORDER BY created_at DESC');
    });

    it('should handle injection attempts', () => {
      expect(buildOrderByClause('users', '1;DROP TABLE users', 'ASC'))
        .toBe('ORDER BY created_at ASC');
      expect(buildOrderByClause('users', 'email', 'ASC;DELETE'))
        .toBe('ORDER BY email DESC');
    });
  });

  describe('filterValidFieldNames', () => {
    it('should filter to valid field names', () => {
      const input = {
        valid_field: 'value1',
        another_valid: 'value2',
        '1invalid': 'bad',
        'injection;--': 'bad',
      };
      const result = filterValidFieldNames(input);
      
      expect(result).toEqual({
        valid_field: 'value1',
        another_valid: 'value2',
      });
    });

    it('should return empty object if all invalid', () => {
      const input = {
        '1bad': 'x',
        'also;bad': 'y',
      };
      const result = filterValidFieldNames(input);
      expect(result).toEqual({});
    });
  });

  describe('whitelist constants', () => {
    it('should have whitelists for common tables', () => {
      expect(ALLOWED_SORT_COLUMNS.users).toBeDefined();
      expect(ALLOWED_SORT_COLUMNS.organizations).toBeDefined();
      expect(ALLOWED_SORT_COLUMNS.feedback_cycles).toBeDefined();
    });

    it('should have update field whitelists', () => {
      expect(ALLOWED_UPDATE_FIELDS.users).toBeDefined();
      expect(ALLOWED_UPDATE_FIELDS.organizations).toBeDefined();
    });

    it('should not include sensitive fields in sort columns', () => {
      expect(ALLOWED_SORT_COLUMNS.users).not.toContain('password');
      expect(ALLOWED_SORT_COLUMNS.users).not.toContain('password_hash');
    });

    it('should not include id in update fields', () => {
      expect(ALLOWED_UPDATE_FIELDS.users).not.toContain('id');
      expect(ALLOWED_UPDATE_FIELDS.organizations).not.toContain('id');
    });
  });
});

