-- Initialize FeedbackFlow Database
-- This script runs when the PostgreSQL container starts for the first time

-- Create extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";
CREATE EXTENSION IF NOT EXISTS "btree_gin";

-- Set timezone
SET timezone = 'UTC';

-- Create database if it doesn't exist (this is handled by POSTGRES_DB)
-- But we can set some initial configurations

-- Create a function to generate UUIDs
CREATE OR REPLACE FUNCTION generate_uuid() RETURNS UUID AS $$
BEGIN
    RETURN uuid_generate_v4();
END;
$$ LANGUAGE plpgsql;

-- Create a function to update the updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Grant permissions to the application user
GRANT ALL PRIVILEGES ON DATABASE feedbackflow TO feedbackflow_app;
GRANT ALL PRIVILEGES ON SCHEMA public TO feedbackflow_app;
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO feedbackflow_app;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO feedbackflow_app;
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public TO feedbackflow_app;

-- Set default privileges for future objects
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO feedbackflow_app;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO feedbackflow_app;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT EXECUTE ON FUNCTIONS TO feedbackflow_app;

-- Log successful initialization
DO $$
BEGIN
    RAISE NOTICE 'FeedbackFlow database initialized successfully!';
    RAISE NOTICE 'Database: feedbackflow';
    RAISE NOTICE 'User: feedbackflow_app';
    RAISE NOTICE 'Extensions: uuid-ossp, pg_trgm, btree_gin';
    RAISE NOTICE 'Timezone: UTC';
END
$$;
