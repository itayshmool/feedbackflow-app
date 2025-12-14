-- Migration: Create triggers to keep organization_id synced across tables
-- Tables affected: users, organization_members, user_roles
-- Purpose: Ensure data consistency when organization_id changes in any table

-- ============================================================================
-- 1. First, run a one-time sync to fix any existing inconsistencies
-- ============================================================================

-- Sync users.organization_id from organization_members where missing
UPDATE users u
SET organization_id = om.organization_id
FROM organization_members om
WHERE u.id = om.user_id 
  AND om.is_active = true
  AND u.organization_id IS NULL;

-- Sync user_roles.organization_id from users.organization_id where missing
UPDATE user_roles ur
SET organization_id = u.organization_id
FROM users u
WHERE ur.user_id = u.id
  AND ur.organization_id IS NULL
  AND u.organization_id IS NOT NULL;

-- Log sync results
DO $$
DECLARE
  users_synced INTEGER;
  roles_synced INTEGER;
BEGIN
  GET DIAGNOSTICS users_synced = ROW_COUNT;
  RAISE NOTICE 'Initial sync completed';
END $$;

-- ============================================================================
-- 2. Trigger: When users.organization_id changes → update user_roles
-- ============================================================================

CREATE OR REPLACE FUNCTION sync_user_roles_org_id()
RETURNS TRIGGER AS $$
BEGIN
  -- When user's organization changes, update their roles that have no org or had the old org
  IF NEW.organization_id IS DISTINCT FROM OLD.organization_id THEN
    UPDATE user_roles 
    SET organization_id = NEW.organization_id 
    WHERE user_id = NEW.id 
      AND (organization_id IS NULL OR organization_id = OLD.organization_id);
    
    RAISE NOTICE 'Synced user_roles.organization_id for user % to %', NEW.id, NEW.organization_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_sync_user_roles_org ON users;
CREATE TRIGGER trigger_sync_user_roles_org
AFTER UPDATE OF organization_id ON users
FOR EACH ROW
EXECUTE FUNCTION sync_user_roles_org_id();

-- ============================================================================
-- 3. Trigger: When organization_members is added/updated → sync users and user_roles
-- ============================================================================

CREATE OR REPLACE FUNCTION sync_all_org_ids_from_membership()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.is_active = true THEN
    -- Update users.organization_id if null or different
    UPDATE users 
    SET organization_id = NEW.organization_id 
    WHERE id = NEW.user_id 
      AND (organization_id IS NULL OR organization_id != NEW.organization_id);
    
    -- Update user_roles.organization_id for roles without org
    UPDATE user_roles 
    SET organization_id = NEW.organization_id 
    WHERE user_id = NEW.user_id 
      AND organization_id IS NULL;
    
    RAISE NOTICE 'Synced organization_id for user % to % from organization_members', NEW.user_id, NEW.organization_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop the old trigger if exists (we created one earlier with different name)
DROP TRIGGER IF EXISTS trigger_sync_user_organization_id ON organization_members;
DROP TRIGGER IF EXISTS trigger_sync_all_org_ids ON organization_members;

CREATE TRIGGER trigger_sync_all_org_ids
AFTER INSERT OR UPDATE ON organization_members
FOR EACH ROW
EXECUTE FUNCTION sync_all_org_ids_from_membership();

-- ============================================================================
-- 4. Verification: Check for any remaining inconsistencies
-- ============================================================================

DO $$
DECLARE
  users_without_org INTEGER;
  roles_without_org INTEGER;
  mismatched_count INTEGER;
BEGIN
  -- Count users with membership but no organization_id
  SELECT COUNT(*) INTO users_without_org
  FROM users u
  WHERE u.organization_id IS NULL
    AND EXISTS (
      SELECT 1 FROM organization_members om 
      WHERE om.user_id = u.id AND om.is_active = true
    );
  
  -- Count user_roles without organization_id but user has one
  SELECT COUNT(*) INTO roles_without_org
  FROM user_roles ur
  JOIN users u ON ur.user_id = u.id
  WHERE ur.organization_id IS NULL
    AND u.organization_id IS NOT NULL
    AND ur.is_active = true;
  
  IF users_without_org > 0 THEN
    RAISE WARNING 'Found % users with membership but NULL organization_id', users_without_org;
  END IF;
  
  IF roles_without_org > 0 THEN
    RAISE WARNING 'Found % user_roles with NULL organization_id where user has one', roles_without_org;
  END IF;
  
  IF users_without_org = 0 AND roles_without_org = 0 THEN
    RAISE NOTICE 'All organization_ids are in sync!';
  END IF;
END $$;

-- ============================================================================
-- Summary of triggers created:
-- 1. trigger_sync_user_roles_org: users → user_roles
-- 2. trigger_sync_all_org_ids: organization_members → users, user_roles
-- ============================================================================

