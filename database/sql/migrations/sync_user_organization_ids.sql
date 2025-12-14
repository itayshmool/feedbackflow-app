-- Migration: Sync users.organization_id from organization_members
-- Purpose: Ensure consistency between users.organization_id and organization_members table
-- This prevents 403 errors when JWT tokens have stale organizationId values

-- Step 1: Update users.organization_id from organization_members where users.organization_id is NULL
DO $$
DECLARE
  updated_count INTEGER;
BEGIN
  UPDATE users u
  SET organization_id = om.organization_id, updated_at = NOW()
  FROM organization_members om
  WHERE u.id = om.user_id 
    AND om.is_active = true
    AND u.organization_id IS NULL;
  
  GET DIAGNOSTICS updated_count = ROW_COUNT;
  RAISE NOTICE 'Synced organization_id for % users from organization_members', updated_count;
END $$;

-- Step 2: Also sync from user_roles for any remaining NULL organization_ids
DO $$
DECLARE
  updated_count INTEGER;
BEGIN
  UPDATE users u
  SET organization_id = ur.organization_id, updated_at = NOW()
  FROM user_roles ur
  WHERE u.id = ur.user_id 
    AND ur.is_active = true
    AND ur.organization_id IS NOT NULL
    AND u.organization_id IS NULL;
  
  GET DIAGNOSTICS updated_count = ROW_COUNT;
  RAISE NOTICE 'Synced organization_id for % users from user_roles', updated_count;
END $$;

-- Step 3: Create or replace the trigger function to auto-sync organization_id
CREATE OR REPLACE FUNCTION sync_user_organization_id()
RETURNS TRIGGER AS $$
BEGIN
  -- When a user is added to organization_members, update their users.organization_id
  IF NEW.is_active = true AND NEW.organization_id IS NOT NULL THEN
    UPDATE users 
    SET organization_id = NEW.organization_id, updated_at = NOW()
    WHERE id = NEW.user_id 
      AND (organization_id IS NULL OR organization_id != NEW.organization_id);
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Step 4: Drop trigger if exists and recreate
DROP TRIGGER IF EXISTS trigger_sync_user_organization_id ON organization_members;

CREATE TRIGGER trigger_sync_user_organization_id
AFTER INSERT OR UPDATE ON organization_members
FOR EACH ROW
EXECUTE FUNCTION sync_user_organization_id();

-- Step 5: Add index for performance if not exists
CREATE INDEX IF NOT EXISTS idx_users_organization_id ON users(organization_id);

-- Step 6: Show summary of users with NULL organization_id (for monitoring)
DO $$
DECLARE
  null_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO null_count FROM users WHERE organization_id IS NULL AND is_active = true;
  IF null_count > 0 THEN
    RAISE NOTICE 'WARNING: % active users still have NULL organization_id', null_count;
  ELSE
    RAISE NOTICE 'SUCCESS: All active users have organization_id assigned';
  END IF;
END $$;

