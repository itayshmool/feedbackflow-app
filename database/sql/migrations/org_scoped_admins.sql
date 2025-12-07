-- Migration: Org-Scoped Admins
-- Description: Migrate existing admins to super_admin role and prepare for org-scoped admin functionality
-- Date: 2024-12-07

-- This migration:
-- 1. Migrates all existing 'admin' role assignments to 'super_admin' (preserving full access)
-- 2. The 'admin' role will now be org-scoped (requires organization_id in user_roles)
-- 3. Adds a view to easily query admin organization assignments

BEGIN;

-- Step 1: Get the role IDs
DO $$
DECLARE
    v_admin_role_id UUID;
    v_super_admin_role_id UUID;
    v_migrated_count INTEGER;
BEGIN
    -- Get role IDs
    SELECT id INTO v_admin_role_id FROM roles WHERE name = 'admin';
    SELECT id INTO v_super_admin_role_id FROM roles WHERE name = 'super_admin';
    
    IF v_admin_role_id IS NULL THEN
        RAISE NOTICE 'Admin role not found, skipping migration';
        RETURN;
    END IF;
    
    IF v_super_admin_role_id IS NULL THEN
        RAISE NOTICE 'Super admin role not found, skipping migration';
        RETURN;
    END IF;
    
    -- Step 2: Migrate existing admin role assignments to super_admin
    -- This ensures existing admins don't lose access
    UPDATE user_roles 
    SET role_id = v_super_admin_role_id,
        updated_at = NOW()
    WHERE role_id = v_admin_role_id
    AND is_active = true;
    
    GET DIAGNOSTICS v_migrated_count = ROW_COUNT;
    
    RAISE NOTICE 'Migrated % admin role assignments to super_admin', v_migrated_count;
END $$;

-- Step 3: Update the admin role description to reflect org-scoping
UPDATE roles 
SET description = 'Organization Administrator - scoped to specific organization',
    permissions = '["admin:org", "organization:read", "user:*", "cycle:*", "feedback:*", "analytics:read"]',
    updated_at = NOW()
WHERE name = 'admin';

-- Step 4: Update super_admin role description for clarity
UPDATE roles 
SET description = 'Super Administrator - full system access across all organizations',
    permissions = '["*"]',
    updated_at = NOW()
WHERE name = 'super_admin';

-- Step 5: Create a view to easily get admin organization assignments
CREATE OR REPLACE VIEW admin_organization_assignments AS
SELECT 
    u.id AS user_id,
    u.email,
    u.name AS user_name,
    r.name AS role_name,
    ur.organization_id,
    o.name AS organization_name,
    o.slug AS organization_slug,
    ur.granted_at,
    ur.expires_at,
    ur.is_active
FROM users u
JOIN user_roles ur ON u.id = ur.user_id
JOIN roles r ON ur.role_id = r.id
LEFT JOIN organizations o ON ur.organization_id = o.id
WHERE r.name IN ('admin', 'super_admin')
AND ur.is_active = true;

-- Step 6: Create index for faster admin organization lookups
CREATE INDEX IF NOT EXISTS idx_user_roles_admin_org 
ON user_roles(user_id, organization_id) 
WHERE is_active = true;

-- Step 7: Add a constraint to ensure org-scoped admin has organization_id
-- Note: This is a soft check - we'll enforce in application layer
-- super_admin can have NULL organization_id, admin should have one
COMMENT ON COLUMN user_roles.organization_id IS 
'Organization scope for the role. NULL for super_admin (global access), required for admin role (org-scoped access)';

COMMIT;

-- Verification query (run after migration to verify)
-- SELECT role_name, COUNT(*) as count FROM admin_organization_assignments GROUP BY role_name;

