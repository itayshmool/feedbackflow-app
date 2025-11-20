-- Migration: Add user profile fields and settings
-- This migration adds missing profile fields to the users table
-- and a JSONB settings column for user preferences

-- Add organization_id if it doesn't exist (may already exist)
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'users' AND column_name = 'organization_id'
    ) THEN
        ALTER TABLE users ADD COLUMN organization_id UUID REFERENCES organizations(id);
        CREATE INDEX IF NOT EXISTS idx_users_organization_id ON users(organization_id);
    END IF;
END $$;

-- Add profile fields
ALTER TABLE users ADD COLUMN IF NOT EXISTS department VARCHAR(255);
ALTER TABLE users ADD COLUMN IF NOT EXISTS position VARCHAR(255);
ALTER TABLE users ADD COLUMN IF NOT EXISTS phone VARCHAR(50);
ALTER TABLE users ADD COLUMN IF NOT EXISTS bio TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS location VARCHAR(255);
ALTER TABLE users ADD COLUMN IF NOT EXISTS timezone VARCHAR(100) DEFAULT 'UTC';

-- Add settings JSONB column with comprehensive defaults
ALTER TABLE users ADD COLUMN IF NOT EXISTS settings JSONB DEFAULT '{
  "emailNotifications": true,
  "pushNotifications": true,
  "feedbackNotifications": true,
  "cycleNotifications": true,
  "reminderNotifications": true,
  "weeklyDigest": false,
  "profileVisibility": "organization",
  "showEmail": false,
  "showPhone": false,
  "showDepartment": true,
  "showPosition": true,
  "theme": "system",
  "language": "en",
  "dateFormat": "MM/DD/YYYY",
  "timeFormat": "12h",
  "autoSaveDrafts": true,
  "draftSaveInterval": 5,
  "feedbackReminders": true,
  "reminderFrequency": "weekly",
  "twoFactorEnabled": false,
  "sessionTimeout": 60,
  "loginNotifications": true,
  "dataRetention": 24,
  "analyticsOptIn": true,
  "marketingEmails": false
}'::jsonb;

-- Update existing users with default settings if settings is NULL
UPDATE users 
SET settings = '{
  "emailNotifications": true,
  "pushNotifications": true,
  "feedbackNotifications": true,
  "cycleNotifications": true,
  "reminderNotifications": true,
  "weeklyDigest": false,
  "profileVisibility": "organization",
  "showEmail": false,
  "showPhone": false,
  "showDepartment": true,
  "showPosition": true,
  "theme": "system",
  "language": "en",
  "dateFormat": "MM/DD/YYYY",
  "timeFormat": "12h",
  "autoSaveDrafts": true,
  "draftSaveInterval": 5,
  "feedbackReminders": true,
  "reminderFrequency": "weekly",
  "twoFactorEnabled": false,
  "sessionTimeout": 60,
  "loginNotifications": true,
  "dataRetention": 24,
  "analyticsOptIn": true,
  "marketingEmails": false
}'::jsonb
WHERE settings IS NULL;

-- Create GIN index on settings for efficient JSONB queries
CREATE INDEX IF NOT EXISTS idx_users_settings ON users USING GIN (settings);

-- Add comments for documentation
COMMENT ON COLUMN users.department IS 'User department within organization';
COMMENT ON COLUMN users.position IS 'User job title/position';
COMMENT ON COLUMN users.phone IS 'User phone number';
COMMENT ON COLUMN users.bio IS 'User biography/description';
COMMENT ON COLUMN users.location IS 'User physical location';
COMMENT ON COLUMN users.timezone IS 'User preferred timezone';
COMMENT ON COLUMN users.settings IS 'User preferences and application settings stored as JSONB';

