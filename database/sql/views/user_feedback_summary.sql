-- User Feedback Summary View
-- This view provides a comprehensive summary of user feedback activity

CREATE OR REPLACE VIEW user_feedback_summary AS
SELECT 
    u.id as user_id,
    u.name as user_name,
    u.email as user_email,
    om.organization_id,
    o.name as organization_name,
    d.name as department_name,
    t.name as team_name,
    COUNT(DISTINCT fr_given.id) as feedback_given_count,
    COUNT(DISTINCT fr_received.id) as feedback_received_count,
    COUNT(DISTINCT fres_given.id) as responses_given_count,
    COUNT(DISTINCT fres_received.id) as responses_received_count,
    CASE 
        WHEN COUNT(DISTINCT fres_received.id) > 0 
        THEN ROUND(AVG(fres_received.rating), 2)
        ELSE NULL 
    END as average_rating_received,
    CASE 
        WHEN COUNT(DISTINCT fres_received.id) > 0 
        THEN COUNT(DISTINCT CASE WHEN fres_received.rating >= 4 THEN fres_received.id END)
        ELSE 0 
    END as positive_feedback_received,
    CASE 
        WHEN COUNT(DISTINCT fres_received.id) > 0 
        THEN ROUND(
            (COUNT(DISTINCT CASE WHEN fres_received.rating >= 4 THEN fres_received.id END)::DECIMAL / 
             COUNT(DISTINCT fres_received.id)::DECIMAL) * 100, 2
        )
        ELSE 0 
    END as positive_feedback_percentage,
    COUNT(DISTINCT fa.id) as feedback_acknowledged_count,
    COUNT(DISTINCT CASE WHEN fa.acknowledged_at IS NOT NULL THEN fa.id END) as feedback_acknowledged_count,
    CASE 
        WHEN COUNT(DISTINCT fres_received.id) > 0 
        THEN ROUND(
            (COUNT(DISTINCT CASE WHEN fa.acknowledged_at IS NOT NULL THEN fa.id END)::DECIMAL / 
             COUNT(DISTINCT fres_received.id)::DECIMAL) * 100, 2
        )
        ELSE 0 
    END as acknowledgment_rate,
    MAX(fres_received.created_at) as last_feedback_received_at,
    MAX(fres_given.created_at) as last_feedback_given_at,
    u.created_at as user_created_at,
    u.last_login_at
FROM users u
LEFT JOIN organization_members om ON u.id = om.user_id AND om.is_active = true
LEFT JOIN organizations o ON om.organization_id = o.id
LEFT JOIN departments d ON om.department_id = d.id
LEFT JOIN teams t ON om.team_id = t.id
LEFT JOIN feedback_requests fr_given ON u.id = fr_given.requester_id
LEFT JOIN feedback_requests fr_received ON u.id = fr_received.recipient_id
LEFT JOIN feedback_responses fres_given ON fr_given.id = fres_given.request_id AND u.id = fres_given.giver_id
LEFT JOIN feedback_responses fres_received ON fr_received.id = fres_received.request_id AND u.id = fres_received.recipient_id
LEFT JOIN feedback_acknowledgments fa ON fres_received.id = fa.response_id AND u.id = fa.user_id
GROUP BY u.id, u.name, u.email, om.organization_id, o.name, d.name, t.name, u.created_at, u.last_login_at;
