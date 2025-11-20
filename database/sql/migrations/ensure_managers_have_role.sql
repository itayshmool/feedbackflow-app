-- Migration: Ensure all managers in the organizational hierarchy have the "manager" role
-- This script identifies users who are managers (have direct reports) but don't have
-- the "manager" role assigned, and adds the role to them.

-- Step 1: Find the manager role ID
DO $$
DECLARE
  v_manager_role_id UUID;
  v_employee_role_id UUID;
  v_manager_user_id UUID;
  v_inserted_count INT := 0;
  v_manager_name TEXT;
  v_manager_email TEXT;
BEGIN
  -- Get the manager role ID
  SELECT id INTO v_manager_role_id 
  FROM roles 
  WHERE name = 'manager';
  
  IF v_manager_role_id IS NULL THEN
    RAISE EXCEPTION 'Manager role not found in roles table';
  END IF;
  
  -- Get the employee role ID (most managers should also have employee role)
  SELECT id INTO v_employee_role_id 
  FROM roles 
  WHERE name = 'employee';
  
  RAISE NOTICE 'Manager Role ID: %', v_manager_role_id;
  RAISE NOTICE 'Employee Role ID: %', v_employee_role_id;
  
  -- Find all users who are managers in the hierarchy but don't have the manager role
  FOR v_manager_user_id, v_manager_name, v_manager_email IN
    WITH managers_in_hierarchy AS (
      SELECT DISTINCT oh.manager_id as user_id
      FROM organizational_hierarchy oh
      WHERE oh.is_active = true
    ),
    users_with_manager_role AS (
      SELECT DISTINCT ur.user_id
      FROM user_roles ur
      WHERE ur.role_id = v_manager_role_id AND ur.is_active = true
    )
    SELECT 
      mh.user_id,
      u.name,
      u.email
    FROM managers_in_hierarchy mh
    JOIN users u ON mh.user_id = u.id
    WHERE mh.user_id NOT IN (SELECT user_id FROM users_with_manager_role)
  LOOP
    -- Insert manager role for this user
    INSERT INTO user_roles (user_id, role_id, is_active, created_at, updated_at)
    VALUES (v_manager_user_id, v_manager_role_id, true, NOW(), NOW())
    ON CONFLICT (user_id, role_id) 
    DO UPDATE SET 
      is_active = true,
      updated_at = NOW();
    
    v_inserted_count := v_inserted_count + 1;
    RAISE NOTICE 'Added manager role to: % (%) - User ID: %', v_manager_name, v_manager_email, v_manager_user_id;
    
    -- Also ensure they have the employee role (if it exists and they don't have it)
    IF v_employee_role_id IS NOT NULL THEN
      INSERT INTO user_roles (user_id, role_id, is_active, created_at, updated_at)
      VALUES (v_manager_user_id, v_employee_role_id, true, NOW(), NOW())
      ON CONFLICT (user_id, role_id) 
      DO NOTHING;
    END IF;
  END LOOP;
  
  IF v_inserted_count = 0 THEN
    RAISE NOTICE '✅ All managers already have the manager role. No changes needed.';
  ELSE
    RAISE NOTICE '✅ Successfully added manager role to % users.', v_inserted_count;
  END IF;
  
  -- Summary report
  RAISE NOTICE '';
  RAISE NOTICE '=== SUMMARY REPORT ===';
  RAISE NOTICE 'Total managers in hierarchy: %', (
    SELECT COUNT(DISTINCT manager_id) 
    FROM organizational_hierarchy 
    WHERE is_active = true
  );
  RAISE NOTICE 'Total users with manager role: %', (
    SELECT COUNT(DISTINCT user_id) 
    FROM user_roles ur
    JOIN roles r ON ur.role_id = r.id
    WHERE r.name = 'manager' AND ur.is_active = true
  );
  
END $$;

-- Verification query: Show all managers with their role status
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
ORDER BY direct_reports DESC, u.name
LIMIT 20;

-- Comment for documentation
COMMENT ON TABLE user_roles IS 'Stores user role assignments. Managers in organizational_hierarchy should always have the "manager" role.';

