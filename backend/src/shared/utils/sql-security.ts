/**
 * SQL Injection Prevention Utilities
 * 
 * Provides validation and sanitization for dynamic SQL components
 * to prevent SQL injection attacks via ORDER BY, column names, etc.
 * 
 * @security This module is critical for preventing SQL injection attacks.
 * Always use these utilities when building dynamic SQL queries.
 */

/**
 * Whitelist of allowed column names for ORDER BY clauses per table.
 * IMPORTANT: Only add columns that are safe to expose for sorting.
 */
export const ALLOWED_SORT_COLUMNS: Record<string, readonly string[]> = {
  users: ['id', 'email', 'name', 'created_at', 'updated_at', 'last_login_at', 'is_active', 'department', 'position'],
  organizations: ['id', 'name', 'slug', 'created_at', 'updated_at', 'status', 'subscription_plan', 'is_active'],
  feedback_cycles: ['id', 'name', 'created_at', 'updated_at', 'start_date', 'end_date', 'status', 'type'],
  feedback_responses: ['id', 'created_at', 'updated_at', 'status', 'submitted_at'],
  feedback_template_documents: ['id', 'name', 'created_at', 'updated_at', 'download_count'],
  feedback_template_attachments: ['id', 'file_name', 'uploaded_at', 'file_size'],
  departments: ['id', 'name', 'created_at', 'updated_at'],
  teams: ['id', 'name', 'created_at', 'updated_at'],
  roles: ['id', 'name', 'created_at', 'updated_at'],
  notifications: ['id', 'created_at', 'read_at', 'priority'],
} as const;

/**
 * Allowed fields for dynamic UPDATE operations per table.
 * CRITICAL: Never include 'id', 'created_at', or security-sensitive fields.
 */
export const ALLOWED_UPDATE_FIELDS: Record<string, readonly string[]> = {
  users: ['name', 'avatar_url', 'is_active', 'email_verified', 'department', 'position', 'last_login_at'],
  organizations: ['name', 'description', 'contact_email', 'phone', 'address', 'city', 'state', 'zip_code', 
                  'country', 'website', 'logo_url', 'is_active', 'status', 'subscription_plan', 
                  'max_users', 'max_cycles', 'storage_limit_gb', 'feature_flags', 'settings'],
  feedback_cycles: ['name', 'description', 'status', 'type', 'start_date', 'end_date', 'settings'],
  feedback_responses: ['status', 'content', 'submitted_at'],
} as const;

/**
 * Converts camelCase to snake_case.
 * 
 * @param str - The string to convert
 * @returns snake_case version of the string
 */
function toSnakeCase(str: string): string {
  return str
    .replace(/([A-Z])/g, '_$1')
    .toLowerCase()
    .replace(/^_/, ''); // Remove leading underscore if any
}

/**
 * Validates and returns a safe column name for ORDER BY clauses.
 * Returns the default column if validation fails.
 * 
 * @param tableName - The database table name
 * @param columnName - The requested column name (may be camelCase or snake_case)
 * @param defaultColumn - Fallback column if validation fails (default: 'created_at')
 * @returns Safe column name for SQL ORDER BY
 * 
 * @example
 * validateSortColumn('users', 'email') // 'email'
 * validateSortColumn('users', 'createdAt') // 'created_at'
 * validateSortColumn('users', 'password') // 'created_at' (rejected, uses default)
 * validateSortColumn('users', '1; DROP TABLE users;--') // 'created_at' (injection attempt blocked)
 */
export function validateSortColumn(
  tableName: string,
  columnName: string | undefined,
  defaultColumn: string = 'created_at'
): string {
  if (!columnName) {
    return defaultColumn;
  }

  const allowedColumns = ALLOWED_SORT_COLUMNS[tableName];
  if (!allowedColumns) {
    console.warn(`[SQL Security] No sort column whitelist for table: ${tableName}`);
    return defaultColumn;
  }

  // Normalize: convert camelCase to snake_case
  const normalized = toSnakeCase(columnName);

  if (allowedColumns.includes(normalized)) {
    return normalized;
  }

  // Also check if the original (already snake_case) is allowed
  if (allowedColumns.includes(columnName.toLowerCase())) {
    return columnName.toLowerCase();
  }

  console.warn(`[SQL Security] Rejected sort column "${columnName}" for table "${tableName}"`);
  return defaultColumn;
}

/**
 * Validates sort order - only allows 'ASC' or 'DESC'.
 * 
 * @param order - The requested sort order
 * @returns 'ASC' or 'DESC' (defaults to DESC)
 * 
 * @example
 * validateSortOrder('asc') // 'ASC'
 * validateSortOrder('DESC') // 'DESC'
 * validateSortOrder('DROP TABLE') // 'DESC' (uses default)
 */
export function validateSortOrder(order: string | undefined): 'ASC' | 'DESC' {
  if (!order) {
    return 'DESC';
  }
  const normalized = order.toUpperCase().trim();
  return normalized === 'ASC' ? 'ASC' : 'DESC';
}

/**
 * Validates that a field name contains only safe characters.
 * Prevents SQL injection via object keys.
 * 
 * @param fieldName - The field name to validate
 * @returns true if the field name is safe
 * 
 * @example
 * isValidFieldName('email') // true
 * isValidFieldName('created_at') // true
 * isValidFieldName('1;DROP TABLE') // false
 */
export function isValidFieldName(fieldName: string): boolean {
  // Only allow: starts with letter or underscore, followed by alphanumeric or underscore
  return /^[a-zA-Z_][a-zA-Z0-9_]*$/.test(fieldName);
}

/**
 * Filters object keys to only include whitelisted, valid field names.
 * Use this before building dynamic UPDATE or INSERT queries.
 * 
 * @param obj - The object with fields to filter
 * @param tableName - The table name for whitelist lookup
 * @returns Object containing only safe, allowed fields (with snake_case keys)
 * 
 * @example
 * sanitizeUpdateFields({ name: 'Test', password: 'secret' }, 'users')
 * // Returns: { name: 'Test' } - password is filtered out
 */
export function sanitizeUpdateFields<T extends Record<string, unknown>>(
  obj: T,
  tableName: string
): Record<string, unknown> {
  const allowedFields = ALLOWED_UPDATE_FIELDS[tableName];
  if (!allowedFields) {
    console.warn(`[SQL Security] No update field whitelist for table: ${tableName}`);
    return {};
  }

  const result: Record<string, unknown> = {};
  
  for (const key of Object.keys(obj)) {
    // Convert camelCase to snake_case for comparison
    const snakeKey = toSnakeCase(key);
    
    if (allowedFields.includes(snakeKey) && isValidFieldName(snakeKey)) {
      // Store with snake_case key for SQL
      result[snakeKey] = obj[key];
    }
  }

  return result;
}

/**
 * Validates column names for WHERE clause conditions.
 * 
 * @param conditions - Object with column names as keys
 * @param tableName - The table name for context (used for logging)
 * @returns true if all column names are valid identifiers
 * 
 * @example
 * validateWhereColumns({ email: 'test@test.com' }, 'users') // true
 * validateWhereColumns({ '1; DROP TABLE': 'x' }, 'users') // false
 */
export function validateWhereColumns(
  conditions: Record<string, unknown>,
  tableName: string
): boolean {
  for (const key of Object.keys(conditions)) {
    if (!isValidFieldName(key)) {
      console.warn(`[SQL Security] Invalid WHERE column "${key}" for table "${tableName}"`);
      return false;
    }
  }
  return true;
}

/**
 * Builds a safe ORDER BY clause.
 * 
 * @param tableName - The table name
 * @param sortBy - Requested sort column
 * @param sortOrder - Requested sort order
 * @param tableAlias - Optional table alias (e.g., 'u' for 'u.created_at')
 * @returns Safe ORDER BY clause string
 * 
 * @example
 * buildOrderByClause('users', 'email', 'asc') // 'ORDER BY email ASC'
 * buildOrderByClause('users', 'email', 'asc', 'u') // 'ORDER BY u.email ASC'
 */
export function buildOrderByClause(
  tableName: string,
  sortBy: string | undefined,
  sortOrder: string | undefined,
  tableAlias?: string
): string {
  const safeColumn = validateSortColumn(tableName, sortBy);
  const safeOrder = validateSortOrder(sortOrder);
  const prefix = tableAlias ? `${tableAlias}.` : '';
  return `ORDER BY ${prefix}${safeColumn} ${safeOrder}`;
}

/**
 * Filters object to only include valid field names (for dynamic queries).
 * Does NOT check against a whitelist - only validates syntax.
 * Use sanitizeUpdateFields() for stricter filtering.
 * 
 * @param obj - Object to filter
 * @returns Object with only syntactically valid field names
 */
export function filterValidFieldNames<T extends Record<string, unknown>>(
  obj: T
): Partial<T> {
  const result: Partial<T> = {};
  for (const key of Object.keys(obj)) {
    if (isValidFieldName(key)) {
      (result as Record<string, unknown>)[key] = obj[key];
    }
  }
  return result;
}

