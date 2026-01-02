-- Migration: Add System Settings tables
-- Description: Creates system_settings and system_settings_audit tables for managing system-level configuration
-- Author: System
-- Date: 2026-01-02

-- Create system_settings table
CREATE TABLE IF NOT EXISTS system_settings (
  id SERIAL PRIMARY KEY,
  key VARCHAR(255) UNIQUE NOT NULL,
  value JSONB NOT NULL,
  description TEXT,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_by VARCHAR(255),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create index on key for faster lookups
CREATE INDEX IF NOT EXISTS idx_system_settings_key ON system_settings(key);

-- Insert initial security settings
INSERT INTO system_settings (key, value, description, updated_by)
VALUES (
  'security_settings',
  '{
    "maintenance": {
      "enabled": false,
      "message": "We are currently performing scheduled maintenance. Please check back soon.",
      "allowedUsers": []
    },
    "emailWhitelist": {
      "mode": "disabled",
      "domains": [],
      "emails": []
    },
    "ipWhitelist": {
      "enabled": false,
      "allowedIPs": [],
      "descriptions": {}
    }
  }'::jsonb,
  'System security and access control settings',
  'system'
) ON CONFLICT (key) DO NOTHING;

-- Create system_settings_audit table for tracking changes
CREATE TABLE IF NOT EXISTS system_settings_audit (
  id SERIAL PRIMARY KEY,
  setting_key VARCHAR(255) NOT NULL,
  old_value JSONB,
  new_value JSONB,
  changed_by VARCHAR(255) NOT NULL,
  changed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  change_reason TEXT
);

-- Create indexes for audit table
CREATE INDEX IF NOT EXISTS idx_system_settings_audit_key ON system_settings_audit(setting_key);
CREATE INDEX IF NOT EXISTS idx_system_settings_audit_changed_by ON system_settings_audit(changed_by);
CREATE INDEX IF NOT EXISTS idx_system_settings_audit_changed_at ON system_settings_audit(changed_at);

-- Add comment
COMMENT ON TABLE system_settings IS 'Stores system-level configuration settings managed by system administrators';
COMMENT ON TABLE system_settings_audit IS 'Audit log for tracking all changes to system settings';

