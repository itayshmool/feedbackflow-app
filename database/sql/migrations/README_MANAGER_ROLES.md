# Manager Role Consistency

## Overview

This document explains how to ensure that all managers in the organizational hierarchy have the "manager" role assigned in the database.

## Current Status ✅

As of the latest check:
- **Total managers in hierarchy:** 59
- **Total users with manager role:** 59
- **Consistency:** 100% ✅

All users who appear as managers in the `organizational_hierarchy` table (i.e., have direct reports) have been verified to have the "manager" role in the `user_roles` table.

## How Manager Status is Determined

A user is considered a **manager** if:
1. They appear as `manager_id` in the `organizational_hierarchy` table
2. They have at least one active direct report (where `is_active = true`)

## Database Structure

### Tables Involved

1. **`organizational_hierarchy`** - Stores reporting relationships
   - `manager_id` - References the manager's user ID
   - `employee_id` - References the employee's user ID
   - `is_active` - Whether the relationship is currently active

2. **`user_roles`** - Stores role assignments
   - `user_id` - References the user
   - `role_id` - References the role (e.g., "manager", "employee", "admin")
   - `is_active` - Whether the role assignment is active

3. **`roles`** - Defines available roles
   - Common roles: `employee`, `manager`, `admin`, `super_admin`

## Maintenance Scripts

### 1. Ensure Managers Have Role

**File:** `ensure_managers_have_role.sql`

**Purpose:** Automatically identifies managers in the hierarchy who don't have the "manager" role and assigns it to them.

**Usage:**
```bash
psql -U itays -d feedbackflow -f database/sql/migrations/ensure_managers_have_role.sql
```

**What it does:**
- Finds all users who are managers in the `organizational_hierarchy` table
- Checks if they have the "manager" role in `user_roles`
- Adds the "manager" role to any managers who don't have it
- Also ensures they have the "employee" role (most managers are also employees)
- Outputs a summary report showing the status of all managers

### 2. Manual Verification Query

To manually check the consistency, run:

```sql
-- Find managers without the manager role
WITH managers_in_hierarchy AS (
  SELECT DISTINCT oh.manager_id as user_id
  FROM organizational_hierarchy oh
  WHERE oh.is_active = true
),
users_with_manager_role AS (
  SELECT DISTINCT ur.user_id
  FROM user_roles ur
  JOIN roles r ON ur.role_id = r.id
  WHERE r.name = 'manager' AND ur.is_active = true
)
SELECT 
  u.id,
  u.name,
  u.email,
  COUNT(DISTINCT oh.employee_id) as direct_reports
FROM managers_in_hierarchy mh
JOIN users u ON mh.user_id = u.id
LEFT JOIN organizational_hierarchy oh ON mh.user_id = oh.manager_id
WHERE mh.user_id NOT IN (SELECT user_id FROM users_with_manager_role)
GROUP BY u.id, u.name, u.email;
```

### 3. Comprehensive Report Query

To see all managers with their role status:

```sql
SELECT 
  u.id,
  u.name,
  u.email,
  COUNT(DISTINCT oh.employee_id) as direct_reports,
  COALESCE(array_agg(DISTINCT r.name) FILTER (WHERE r.name IS NOT NULL), '{}') as roles,
  CASE WHEN 'manager' = ANY(array_agg(DISTINCT r.name)) THEN '✅' ELSE '❌' END as has_manager_role
FROM organizational_hierarchy oh
JOIN users u ON oh.manager_id = u.id
LEFT JOIN user_roles ur ON u.id = ur.user_id AND ur.is_active = true
LEFT JOIN roles r ON ur.role_id = r.id
WHERE oh.is_active = true
GROUP BY u.id, u.name, u.email
ORDER BY direct_reports DESC, u.name;
```

## When to Run the Consistency Check

Run the `ensure_managers_have_role.sql` script in the following situations:

1. **After bulk user imports** - When importing many users at once
2. **After organizational restructuring** - When manager-employee relationships change
3. **After role system changes** - If you modify the roles table or user_roles logic
4. **During deployment** - As part of the deployment checklist
5. **Periodic maintenance** - Monthly or quarterly as part of database health checks

## Automated Triggers (Future Enhancement)

Consider creating a database trigger to automatically assign the "manager" role when:
- A user is added as a `manager_id` in `organizational_hierarchy`
- A user becomes a manager for the first time

Example trigger (not yet implemented):

```sql
CREATE OR REPLACE FUNCTION auto_assign_manager_role()
RETURNS TRIGGER AS $$
DECLARE
  v_manager_role_id UUID;
BEGIN
  -- Get manager role ID
  SELECT id INTO v_manager_role_id FROM roles WHERE name = 'manager';
  
  -- Insert manager role for the new manager
  INSERT INTO user_roles (user_id, role_id, is_active)
  VALUES (NEW.manager_id, v_manager_role_id, true)
  ON CONFLICT (user_id, role_id) DO UPDATE SET is_active = true;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER assign_manager_role_on_hierarchy_insert
AFTER INSERT OR UPDATE ON organizational_hierarchy
FOR EACH ROW
WHEN (NEW.is_active = true)
EXECUTE FUNCTION auto_assign_manager_role();
```

## Backend Service Integration

The **HierarchyService** (`backend/src/modules/hierarchy/services/hierarchy.service.ts`) determines manager status based on:
- Whether a user has `children` (direct reports) in the hierarchy tree
- The `employeeCount` field indicates total direct + indirect reports

The frontend displays this information in:
- **Hierarchy Management Page** - Shows "(N)" next to manager names indicating report count
- **Admin Dashboard** - Manager statistics and organizational charts

## Role-Based Access Control (RBAC)

Having the "manager" role enables users to:
- View team feedback
- Access manager-specific dashboards
- See their direct reports' information
- Participate in performance review cycles as a reviewer

## Troubleshooting

### Issue: Manager role missing for a user

**Symptoms:**
- User appears as a manager in the hierarchy tree
- User cannot access manager-specific features
- User doesn't have "manager" in their roles array

**Solution:**
1. Run the `ensure_managers_have_role.sql` script
2. Verify the user appears in `organizational_hierarchy` as a `manager_id`
3. Check if the role assignment is active: `SELECT * FROM user_roles WHERE user_id = '<user_id>'`

### Issue: User has manager role but no direct reports

**Symptoms:**
- User has "manager" role in `user_roles`
- User doesn't appear in `organizational_hierarchy` as a manager

**Solution:**
This is technically valid - users can be promoted to "manager" before being assigned direct reports. However, if this is unintended:

```sql
-- Remove manager role from users with no direct reports
DELETE FROM user_roles
WHERE role_id = (SELECT id FROM roles WHERE name = 'manager')
  AND user_id NOT IN (
    SELECT DISTINCT manager_id 
    FROM organizational_hierarchy 
    WHERE is_active = true
  );
```

## Contact

For questions about manager role consistency, contact the database administration team or refer to:
- **ARCHITECTURE.md** - Overall system design
- **AGENTS.md** - Development guidelines
- **Database Schema Documentation** - `database/setup.sql`

---

**Last Updated:** 2024-11-20  
**Status:** ✅ All managers verified to have correct roles  
**Total Managers:** 59

