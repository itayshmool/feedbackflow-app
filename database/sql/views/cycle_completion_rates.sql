-- Cycle Completion Rates View
-- This view provides real-time completion rates for feedback cycles

CREATE OR REPLACE VIEW cycle_completion_rates AS
SELECT 
    fc.id as cycle_id,
    fc.organization_id,
    fc.name as cycle_name,
    fc.status as cycle_status,
    fc.start_date,
    fc.end_date,
    COUNT(DISTINCT cp.user_id) as total_participants,
    COUNT(DISTINCT fr.id) as total_requests,
    COUNT(DISTINCT CASE WHEN fr.status = 'completed' THEN fr.id END) as completed_requests,
    COUNT(DISTINCT CASE WHEN fr.status = 'pending' THEN fr.id END) as pending_requests,
    COUNT(DISTINCT CASE WHEN fr.status = 'in_progress' THEN fr.id END) as in_progress_requests,
    COUNT(DISTINCT CASE WHEN fr.status = 'overdue' THEN fr.id END) as overdue_requests,
    CASE 
        WHEN COUNT(DISTINCT fr.id) > 0 
        THEN ROUND(
            (COUNT(DISTINCT CASE WHEN fr.status = 'completed' THEN fr.id END)::DECIMAL / 
             COUNT(DISTINCT fr.id)::DECIMAL) * 100, 2
        )
        ELSE 0 
    END as completion_percentage,
    CASE 
        WHEN COUNT(DISTINCT fr.id) > 0 
        THEN ROUND(
            AVG(CASE WHEN fr.status = 'completed' THEN 
                EXTRACT(EPOCH FROM (fr.completed_at - fr.created_at)) / 86400 
            END), 2
        )
        ELSE NULL 
    END as avg_completion_days,
    fc.created_at,
    fc.updated_at
FROM feedback_cycles fc
LEFT JOIN cycle_participants cp ON fc.id = cp.cycle_id AND cp.status = 'active'
LEFT JOIN feedback_requests fr ON fc.id = fr.cycle_id
GROUP BY fc.id, fc.organization_id, fc.name, fc.status, fc.start_date, fc.end_date, fc.created_at, fc.updated_at;
