-- Organizational Hierarchy Schema
-- This file contains tables for managing organizational hierarchy and reporting relationships

-- Organizational hierarchy table
CREATE TABLE IF NOT EXISTS organizational_hierarchy (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    manager_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    employee_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    level INTEGER DEFAULT 1,
    is_direct_report BOOLEAN DEFAULT true,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(organization_id, manager_id, employee_id)
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_organizational_hierarchy_organization_id ON organizational_hierarchy(organization_id);
CREATE INDEX IF NOT EXISTS idx_organizational_hierarchy_manager_id ON organizational_hierarchy(manager_id);
CREATE INDEX IF NOT EXISTS idx_organizational_hierarchy_employee_id ON organizational_hierarchy(employee_id);
CREATE INDEX IF NOT EXISTS idx_organizational_hierarchy_active ON organizational_hierarchy(is_active);
CREATE INDEX IF NOT EXISTS idx_organizational_hierarchy_level ON organizational_hierarchy(level);

-- Create a function to prevent circular references
CREATE OR REPLACE FUNCTION check_hierarchy_circular_reference()
RETURNS TRIGGER AS $$
BEGIN
    -- Check if the employee is already a manager of the manager (circular reference)
    IF EXISTS (
        SELECT 1 FROM organizational_hierarchy 
        WHERE organization_id = NEW.organization_id 
        AND manager_id = NEW.employee_id 
        AND employee_id = NEW.manager_id 
        AND is_active = true
    ) THEN
        RAISE EXCEPTION 'Circular reference detected: % cannot be both manager and employee of %', 
            NEW.employee_id, NEW.manager_id;
    END IF;
    
    -- Check if the employee is already a manager of someone who manages the new manager
    IF EXISTS (
        WITH RECURSIVE hierarchy_path AS (
            SELECT manager_id, employee_id, 1 as depth
            FROM organizational_hierarchy 
            WHERE organization_id = NEW.organization_id 
            AND employee_id = NEW.manager_id 
            AND is_active = true
            
            UNION ALL
            
            SELECT h.manager_id, h.employee_id, hp.depth + 1
            FROM organizational_hierarchy h
            JOIN hierarchy_path hp ON h.employee_id = hp.manager_id
            WHERE h.organization_id = NEW.organization_id 
            AND h.is_active = true
            AND hp.depth < 10 -- Prevent infinite recursion
        )
        SELECT 1 FROM hierarchy_path 
        WHERE manager_id = NEW.employee_id
    ) THEN
        RAISE EXCEPTION 'Circular reference detected: % would create a circular management chain', NEW.employee_id;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to prevent circular references
CREATE TRIGGER prevent_circular_hierarchy
    BEFORE INSERT OR UPDATE ON organizational_hierarchy
    FOR EACH ROW
    EXECUTE FUNCTION check_hierarchy_circular_reference();

-- Create a function to get hierarchy statistics
CREATE OR REPLACE FUNCTION get_hierarchy_stats(org_id UUID)
RETURNS TABLE (
    total_relationships INTEGER,
    max_depth INTEGER,
    average_span_of_control NUMERIC,
    orphaned_employees INTEGER
) AS $$
BEGIN
    RETURN QUERY
    WITH RECURSIVE hierarchy_depth AS (
        -- Find root managers (managers who are not employees)
        SELECT 
            h.manager_id,
            h.employee_id,
            1 as depth
        FROM organizational_hierarchy h
        WHERE h.organization_id = org_id 
        AND h.is_active = true
        AND h.manager_id NOT IN (
            SELECT employee_id 
            FROM organizational_hierarchy 
            WHERE organization_id = org_id AND is_active = true
        )
        
        UNION ALL
        
        SELECT 
            h.manager_id,
            h.employee_id,
            hd.depth + 1
        FROM organizational_hierarchy h
        JOIN hierarchy_depth hd ON h.manager_id = hd.employee_id
        WHERE h.organization_id = org_id 
        AND h.is_active = true
        AND hd.depth < 20 -- Prevent infinite recursion
    ),
    span_of_control AS (
        SELECT 
            manager_id,
            COUNT(employee_id) as direct_reports
        FROM organizational_hierarchy
        WHERE organization_id = org_id 
        AND is_active = true
        GROUP BY manager_id
    )
    SELECT 
        (SELECT COUNT(*)::INTEGER FROM organizational_hierarchy WHERE organization_id = org_id AND is_active = true) as total_relationships,
        (SELECT COALESCE(MAX(depth), 0)::INTEGER FROM hierarchy_depth) as max_depth,
        (SELECT COALESCE(AVG(direct_reports), 0) FROM span_of_control) as average_span_of_control,
        (SELECT COUNT(*)::INTEGER 
         FROM users u 
         WHERE u.organization_id = org_id 
         AND u.is_active = true
         AND u.id NOT IN (
             SELECT employee_id FROM organizational_hierarchy WHERE organization_id = org_id AND is_active = true
         )
         AND u.id NOT IN (
             SELECT manager_id FROM organizational_hierarchy WHERE organization_id = org_id AND is_active = true
         )
        ) as orphaned_employees;
END;
$$ LANGUAGE plpgsql;




