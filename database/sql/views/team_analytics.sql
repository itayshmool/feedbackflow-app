-- Team Analytics View
-- This view provides comprehensive analytics for teams

CREATE OR REPLACE VIEW team_analytics AS
SELECT 
    t.id as team_id,
    t.organization_id,
    t.name as team_name,
    t.type as team_type,
    t.is_active,
    d.name as department_name,
    d.type as department_type,
    COUNT(DISTINCT om.user_id) as total_members,
    COUNT(DISTINCT CASE WHEN om.is_active = true THEN om.user_id END) as active_members,
    COUNT(DISTINCT fc.id) as total_cycles,
    COUNT(DISTINCT CASE WHEN fc.status = 'active' THEN fc.id END) as active_cycles,
    COUNT(DISTINCT fr.id) as total_feedback_requests,
    COUNT(DISTINCT CASE WHEN fr.status = 'completed' THEN fr.id END) as completed_feedback_requests,
    COUNT(DISTINCT fres.id) as total_feedback_responses,
    CASE 
        WHEN COUNT(DISTINCT fr.id) > 0 
        THEN ROUND(
            (COUNT(DISTINCT CASE WHEN fr.status = 'completed' THEN fr.id END)::DECIMAL / 
             COUNT(DISTINCT fr.id)::DECIMAL) * 100, 2
        )
        ELSE 0 
    END as feedback_completion_rate,
    CASE 
        WHEN COUNT(DISTINCT fres.id) > 0 
        THEN ROUND(AVG(fres.rating), 2)
        ELSE NULL 
    END as average_rating,
    CASE 
        WHEN COUNT(DISTINCT fres.id) > 0 
        THEN COUNT(DISTINCT CASE WHEN fres.rating >= 4 THEN fres.id END)
        ELSE 0 
    END as positive_feedback_count,
    CASE 
        WHEN COUNT(DISTINCT fres.id) > 0 
        THEN ROUND(
            (COUNT(DISTINCT CASE WHEN fres.rating >= 4 THEN fres.id END)::DECIMAL / 
             COUNT(DISTINCT fres.id)::DECIMAL) * 100, 2
        )
        ELSE 0 
    END as positive_feedback_percentage,
    t.created_at,
    t.updated_at
FROM teams t
LEFT JOIN departments d ON t.department_id = d.id
LEFT JOIN organization_members om ON t.id = om.team_id
LEFT JOIN feedback_cycles fc ON t.organization_id = fc.organization_id
LEFT JOIN feedback_requests fr ON fc.id = fr.cycle_id 
    AND (fr.requester_id IN (SELECT user_id FROM organization_members WHERE team_id = t.id)
         OR fr.recipient_id IN (SELECT user_id FROM organization_members WHERE team_id = t.id))
LEFT JOIN feedback_responses fres ON fr.id = fres.request_id
GROUP BY t.id, t.organization_id, t.name, t.type, t.is_active, d.name, d.type, t.created_at, t.updated_at;
