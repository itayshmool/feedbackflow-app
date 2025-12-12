-- Migration: Add avatar data columns for storing uploaded avatars
-- This migration adds columns to store avatar images directly in the database
-- as base64-encoded data, along with the MIME type

-- Add avatar_data column to store base64-encoded image data
ALTER TABLE users ADD COLUMN IF NOT EXISTS avatar_data TEXT;

-- Add avatar_mime_type column to store the image MIME type (e.g., 'image/jpeg', 'image/png')
ALTER TABLE users ADD COLUMN IF NOT EXISTS avatar_mime_type VARCHAR(50);

-- Add comments for documentation
COMMENT ON COLUMN users.avatar_data IS 'Base64-encoded avatar image data for locally uploaded avatars';
COMMENT ON COLUMN users.avatar_mime_type IS 'MIME type of the stored avatar image (e.g., image/jpeg, image/png)';

-- Note: avatar_url continues to be used for external avatar URLs (e.g., Google profile pictures)
-- The avatar endpoint checks avatar_data first, then falls back to avatar_url or generates initials

