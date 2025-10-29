-- Calculate Completion Rates Procedure
-- This procedure calculates and updates completion rates for feedback cycles

CREATE OR REPLACE FUNCTION calculate_cycle_completion_rates(cycle_id_param UUID)
RETURNS TABLE(
    cycle_id UUID,
    total_participants BIGINT,
    total_requests BIGINT,
    completed_requests BIGINT,
    completion_rate DECIMAL
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        fc.id as cycle_id,
        COUNT(DISTINCT cp.user_id) as total_participants,
        COUNT(DISTINCT fr.id) as total_requests,
        COUNT(DISTINCT CASE WHEN fr.status = 'completed' THEN fr.id END) as completed_requests,
        CASE 
            WHEN COUNT(DISTINCT fr.id) > 0 
            THEN ROUND(
                (COUNT(DISTINCT CASE WHEN fr.status = 'completed' THEN fr.id END)::DECIMAL / 
                 COUNT(DISTINCT fr.id)::DECIMAL) * 100, 2
            )
            ELSE 0 
        END as completion_rate
    FROM feedback_cycles fc
    LEFT JOIN cycle_participants cp ON fc.id = cp.cycle_id AND cp.status = 'active'
    LEFT JOIN feedback_requests fr ON fc.id = fr.cycle_id
    WHERE fc.id = cycle_id_param
    GROUP BY fc.id;
END;
$$ LANGUAGE plpgsql;

-- Procedure to update cycle statistics
CREATE OR REPLACE FUNCTION update_cycle_statistics(cycle_id_param UUID)
RETURNS VOID AS $$
DECLARE
    stats_record RECORD;
BEGIN
    -- Calculate statistics
    SELECT 
        COUNT(DISTINCT cp.user_id) as total_participants,
        COUNT(DISTINCT fr.id) as total_requests,
        COUNT(DISTINCT CASE WHEN fr.status = 'completed' THEN fr.id END) as completed_requests,
        COUNT(DISTINCT CASE WHEN fr.status = 'pending' THEN fr.id END) as pending_requests,
        COUNT(DISTINCT CASE WHEN fr.status = 'overdue' THEN fr.id END) as overdue_requests,
        CASE 
            WHEN COUNT(DISTINCT fr.id) > 0 
            THEN ROUND(
                (COUNT(DISTINCT CASE WHEN fr.status = 'completed' THEN fr.id END)::DECIMAL / 
                 COUNT(DISTINCT fr.id)::DECIMAL) * 100, 2
            )
            ELSE 0 
        END as completion_rate,
        CASE 
            WHEN COUNT(DISTINCT fres.id) > 0 
            THEN ROUND(AVG(fres.rating), 2)
            ELSE NULL 
        END as average_rating
    INTO stats_record
    FROM feedback_cycles fc
    LEFT JOIN cycle_participants cp ON fc.id = cp.cycle_id AND cp.status = 'active'
    LEFT JOIN feedback_requests fr ON fc.id = fr.cycle_id
    LEFT JOIN feedback_responses fres ON fr.id = fres.request_id
    WHERE fc.id = cycle_id_param
    GROUP BY fc.id;

    -- Insert or update cycle statistics
    INSERT INTO cycle_statistics (
        cycle_id,
        total_participants,
        total_requests,
        completed_requests,
        pending_requests,
        overdue_requests,
        average_rating,
        completion_rate,
        last_calculated_at
    ) VALUES (
        cycle_id_param,
        stats_record.total_participants,
        stats_record.total_requests,
        stats_record.completed_requests,
        stats_record.pending_requests,
        stats_record.overdue_requests,
        stats_record.average_rating,
        stats_record.completion_rate,
        NOW()
    )
    ON CONFLICT (cycle_id) DO UPDATE SET
        total_participants = EXCLUDED.total_participants,
        total_requests = EXCLUDED.total_requests,
        completed_requests = EXCLUDED.completed_requests,
        pending_requests = EXCLUDED.pending_requests,
        overdue_requests = EXCLUDED.overdue_requests,
        average_rating = EXCLUDED.average_rating,
        completion_rate = EXCLUDED.completion_rate,
        last_calculated_at = EXCLUDED.last_calculated_at,
        updated_at = NOW();
END;
$$ LANGUAGE plpgsql;
