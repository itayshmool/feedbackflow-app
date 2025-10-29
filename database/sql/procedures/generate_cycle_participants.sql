-- Generate Cycle Participants Procedure
-- This procedure automatically generates participants for a feedback cycle

CREATE OR REPLACE FUNCTION generate_cycle_participants(
    cycle_id_param UUID,
    organization_id_param UUID,
    include_managers BOOLEAN DEFAULT true,
    include_peers BOOLEAN DEFAULT true,
    include_self BOOLEAN DEFAULT false
)
RETURNS TABLE(
    user_id UUID,
    participation_type VARCHAR(50),
    role VARCHAR(50)
) AS $$
BEGIN
    -- Insert participants based on criteria
    INSERT INTO cycle_participants (
        cycle_id,
        user_id,
        organization_id,
        department_id,
        team_id,
        role,
        participation_type
    )
    SELECT 
        cycle_id_param,
        om.user_id,
        om.organization_id,
        om.department_id,
        om.team_id,
        CASE 
            WHEN ur.role_id = (SELECT id FROM roles WHERE name = 'manager') THEN 'manager'
            WHEN ur.role_id = (SELECT id FROM roles WHERE name = 'admin') THEN 'admin'
            ELSE 'participant'
        END as role,
        CASE 
            WHEN include_self THEN 'full'
            WHEN ur.role_id = (SELECT id FROM roles WHERE name = 'manager') AND include_managers THEN 'full'
            WHEN ur.role_id != (SELECT id FROM roles WHERE name = 'manager') AND include_peers THEN 'peer_only'
            ELSE 'excluded'
        END as participation_type
    FROM organization_members om
    LEFT JOIN user_roles ur ON om.user_id = ur.user_id AND om.organization_id = ur.organization_id
    WHERE om.organization_id = organization_id_param
    AND om.is_active = true
    AND (
        (include_managers AND ur.role_id = (SELECT id FROM roles WHERE name = 'manager'))
        OR (include_peers AND ur.role_id != (SELECT id FROM roles WHERE name = 'manager'))
        OR (include_self)
    )
    ON CONFLICT (cycle_id, user_id) DO UPDATE SET
        participation_type = EXCLUDED.participation_type,
        role = EXCLUDED.role,
        updated_at = NOW();

    -- Return the generated participants
    RETURN QUERY
    SELECT 
        cp.user_id,
        cp.participation_type,
        cp.role
    FROM cycle_participants cp
    WHERE cp.cycle_id = cycle_id_param;
END;
$$ LANGUAGE plpgsql;

-- Procedure to generate feedback requests for a cycle
CREATE OR REPLACE FUNCTION generate_feedback_requests(
    cycle_id_param UUID,
    allow_self_feedback BOOLEAN DEFAULT false,
    allow_peer_feedback BOOLEAN DEFAULT true,
    allow_manager_feedback BOOLEAN DEFAULT true,
    max_requests_per_person INTEGER DEFAULT 5
)
RETURNS TABLE(
    requester_id UUID,
    recipient_id UUID,
    feedback_type VARCHAR(50),
    total_requests BIGINT
) AS $$
DECLARE
    participant_record RECORD;
    manager_record RECORD;
    peer_record RECORD;
    request_count INTEGER;
BEGIN
    -- Loop through all active participants
    FOR participant_record IN 
        SELECT DISTINCT cp.user_id, cp.organization_id, cp.department_id, cp.team_id
        FROM cycle_participants cp
        WHERE cp.cycle_id = cycle_id_param
        AND cp.status = 'active'
    LOOP
        request_count := 0;
        
        -- Generate self-feedback requests if allowed
        IF allow_self_feedback AND request_count < max_requests_per_person THEN
            INSERT INTO feedback_requests (
                cycle_id,
                requester_id,
                recipient_id,
                feedback_type,
                due_date
            ) VALUES (
                cycle_id_param,
                participant_record.user_id,
                participant_record.user_id,
                'self',
                (SELECT end_date FROM feedback_cycles WHERE id = cycle_id_param)
            )
            ON CONFLICT (cycle_id, requester_id, recipient_id, feedback_type) DO NOTHING;
            
            request_count := request_count + 1;
        END IF;
        
        -- Generate manager feedback requests if allowed
        IF allow_manager_feedback AND request_count < max_requests_per_person THEN
            FOR manager_record IN
                SELECT DISTINCT om.user_id
                FROM organization_members om
                JOIN user_roles ur ON om.user_id = ur.user_id
                JOIN roles r ON ur.role_id = r.id
                WHERE om.organization_id = participant_record.organization_id
                AND r.name = 'manager'
                AND om.is_active = true
                AND om.user_id != participant_record.user_id
                LIMIT (max_requests_per_person - request_count)
            LOOP
                INSERT INTO feedback_requests (
                    cycle_id,
                    requester_id,
                    recipient_id,
                    feedback_type,
                    due_date
                ) VALUES (
                    cycle_id_param,
                    participant_record.user_id,
                    manager_record.user_id,
                    'manager',
                    (SELECT end_date FROM feedback_cycles WHERE id = cycle_id_param)
                )
                ON CONFLICT (cycle_id, requester_id, recipient_id, feedback_type) DO NOTHING;
                
                request_count := request_count + 1;
            END LOOP;
        END IF;
        
        -- Generate peer feedback requests if allowed
        IF allow_peer_feedback AND request_count < max_requests_per_person THEN
            FOR peer_record IN
                SELECT DISTINCT om.user_id
                FROM organization_members om
                JOIN user_roles ur ON om.user_id = ur.user_id
                JOIN roles r ON ur.role_id = r.id
                WHERE om.organization_id = participant_record.organization_id
                AND (om.department_id = participant_record.department_id OR om.team_id = participant_record.team_id)
                AND r.name != 'manager'
                AND om.is_active = true
                AND om.user_id != participant_record.user_id
                ORDER BY RANDOM()
                LIMIT (max_requests_per_person - request_count)
            LOOP
                INSERT INTO feedback_requests (
                    cycle_id,
                    requester_id,
                    recipient_id,
                    feedback_type,
                    due_date
                ) VALUES (
                    cycle_id_param,
                    participant_record.user_id,
                    peer_record.user_id,
                    'peer',
                    (SELECT end_date FROM feedback_cycles WHERE id = cycle_id_param)
                )
                ON CONFLICT (cycle_id, requester_id, recipient_id, feedback_type) DO NOTHING;
                
                request_count := request_count + 1;
            END LOOP;
        END IF;
    END LOOP;
    
    -- Return summary of generated requests
    RETURN QUERY
    SELECT 
        fr.requester_id,
        fr.recipient_id,
        fr.feedback_type,
        COUNT(*) as total_requests
    FROM feedback_requests fr
    WHERE fr.cycle_id = cycle_id_param
    GROUP BY fr.requester_id, fr.recipient_id, fr.feedback_type;
END;
$$ LANGUAGE plpgsql;
