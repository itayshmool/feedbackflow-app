-- Seed Data from Mock Server
-- This script populates the database with initial test data extracted from mock-database-server.ts

-- ===================
-- 1. ORGANIZATION
-- ===================

INSERT INTO organizations (id, name, slug, contact_email, is_active, subscription_plan, created_at, updated_at) VALUES
('00000000-0000-0000-0000-000000000001', 'Wix.com', 'wix', 'admin@wix.com', true, 'enterprise', '2023-01-01T00:00:00Z', NOW())
ON CONFLICT (id) DO UPDATE SET
    name = EXCLUDED.name,
    contact_email = EXCLUDED.contact_email,
    subscription_plan = EXCLUDED.subscription_plan,
    updated_at = NOW();

-- ===================
-- 2. USERS
-- ===================

-- Users already exist in database from CSV import, using their actual UUIDs
-- Itay Sivan: 76c7750b-63ac-4924-a6db-e2d8743e026f
-- Efrat Rozenfeld: 1764d577-3bc6-417b-9d47-e1b6115f09e8
-- Tovah Cohen: 1464816a-75eb-4c4e-9db0-161037cd0b5b

-- ===================
-- 3. ROLES (System Roles)
-- ===================

-- Roles already exist in database from setup.sql, using their actual UUIDs
-- admin: 3881b9c8-8474-44b3-b740-ab4306982d04
-- manager: edde3681-8be2-435d-8cf9-75bcd1cbf864
-- employee: 86ae6865-a67a-42c4-be25-4ac39c66a9e5

-- ===================
-- 4. USER ROLES (Link users to roles and organization)
-- ===================

-- Assign roles to users for Wix.com organization
INSERT INTO user_roles (user_id, role_id, organization_id, granted_at, is_active) VALUES
('76c7750b-63ac-4924-a6db-e2d8743e026f', '3881b9c8-8474-44b3-b740-ab4306982d04', '00000000-0000-0000-0000-000000000001', NOW(), true), -- Itay = admin
('1764d577-3bc6-417b-9d47-e1b6115f09e8', 'edde3681-8be2-435d-8cf9-75bcd1cbf864', '00000000-0000-0000-0000-000000000001', NOW(), true), -- Efrat = manager
('1464816a-75eb-4c4e-9db0-161037cd0b5b', '86ae6865-a67a-42c4-be25-4ac39c66a9e5', '00000000-0000-0000-0000-000000000001', NOW(), true)  -- Tovah = employee
ON CONFLICT (user_id, role_id, organization_id) DO NOTHING;

-- ===================
-- 5. FEEDBACK CYCLES
-- ===================

INSERT INTO feedback_cycles (id, organization_id, name, description, status, start_date, end_date, created_by, created_at, updated_at) VALUES
('00000000-0000-0000-0000-000000000031', '00000000-0000-0000-0000-000000000001', 'Q4 2024 Performance Review', 'End of year performance review cycle', 'active', '2024-10-01', '2024-12-31', '76c7750b-63ac-4924-a6db-e2d8743e026f', '2024-09-15T10:00:00Z', '2024-10-01T08:00:00Z'),
('00000000-0000-0000-0000-000000000032', '00000000-0000-0000-0000-000000000001', 'Q3 2024 Mid-Year Review', 'Mid-year check-in and goal review', 'closed', '2024-07-01', '2024-09-30', '76c7750b-63ac-4924-a6db-e2d8743e026f', '2024-06-15T10:00:00Z', '2024-10-01T08:00:00Z')
ON CONFLICT (id) DO UPDATE SET
    name = EXCLUDED.name,
    description = EXCLUDED.description,
    status = EXCLUDED.status,
    updated_at = NOW();

-- ===================
-- 6. CYCLE PARTICIPANTS
-- ===================

-- Add all users as participants in Q4 2024 cycle
INSERT INTO cycle_participants (cycle_id, user_id, organization_id, role, status, participation_type) VALUES
('00000000-0000-0000-0000-000000000031', '76c7750b-63ac-4924-a6db-e2d8743e026f', '00000000-0000-0000-0000-000000000001', 'admin', 'active', 'full'),
('00000000-0000-0000-0000-000000000031', '1764d577-3bc6-417b-9d47-e1b6115f09e8', '00000000-0000-0000-0000-000000000001', 'manager', 'active', 'full'),
('00000000-0000-0000-0000-000000000031', '1464816a-75eb-4c4e-9db0-161037cd0b5b', '00000000-0000-0000-0000-000000000001', 'participant', 'active', 'full')
ON CONFLICT (cycle_id, user_id) DO NOTHING;

-- ===================
-- 7. FEEDBACK REQUESTS
-- ===================

-- Create feedback requests (Itay requests from Efrat and Tovah)
INSERT INTO feedback_requests (id, cycle_id, requester_id, recipient_id, feedback_type, status, created_at, updated_at) VALUES
('00000000-0000-0000-0000-000000000041', '00000000-0000-0000-0000-000000000031', '76c7750b-63ac-4924-a6db-e2d8743e026f', '1764d577-3bc6-417b-9d47-e1b6115f09e8', 'peer', 'completed', '2024-11-01T10:00:00Z', '2024-11-10T14:30:00Z'),
('00000000-0000-0000-0000-000000000042', '00000000-0000-0000-0000-000000000031', '76c7750b-63ac-4924-a6db-e2d8743e026f', '1464816a-75eb-4c4e-9db0-161037cd0b5b', 'peer', 'in_progress', '2024-11-05T10:00:00Z', NOW())
ON CONFLICT (id) DO NOTHING;

-- ===================
-- 8. FEEDBACK RESPONSES
-- ===================

-- Feedback from Efrat to Itay (submitted)
INSERT INTO feedback_responses (id, request_id, giver_id, recipient_id, cycle_id, content, rating, is_approved, created_at, updated_at) VALUES
('00000000-0000-0000-0000-000000000051', '00000000-0000-0000-0000-000000000041', '1764d577-3bc6-417b-9d47-e1b6115f09e8', '76c7750b-63ac-4924-a6db-e2d8743e026f', '00000000-0000-0000-0000-000000000031', 'Great leadership and technical skills. Always delivers on time.', 5, true, '2024-11-10T14:30:00Z', '2024-11-10T14:30:00Z')
ON CONFLICT (id) DO NOTHING;

-- Note: Tovah's feedback is still a draft (in_progress), so no response yet

-- ===================
-- 9. FEEDBACK TEMPLATES (Documents)
-- ===================

-- Note: The feedback_templates table in schema 03 is for form templates (questions/structure)
-- The template documents from mock server (peer-review.pdf, etc.) would go in a separate documents table if it exists

-- Insert form templates (removed is_system_template column which doesn't exist)
INSERT INTO feedback_templates (id, organization_id, name, description, type, questions, is_default, created_by, created_at, updated_at) VALUES
('00000000-0000-0000-0000-000000000061', '00000000-0000-0000-0000-000000000001', 'Standard Peer Review', 'Comprehensive peer review template with competency assessments', 'peer', 
'[
  {"id": 1, "question": "How well does this person collaborate with the team?", "type": "rating", "required": true},
  {"id": 2, "question": "What are their key strengths?", "type": "text", "required": true},
  {"id": 3, "question": "What areas could they improve?", "type": "text", "required": true},
  {"id": 4, "question": "Overall rating", "type": "rating", "required": true}
]'::jsonb, 
true, '76c7750b-63ac-4924-a6db-e2d8743e026f', '2024-01-15T10:00:00Z', NOW()),
('00000000-0000-0000-0000-000000000062', '00000000-0000-0000-0000-000000000001', 'Manager Review Template', 'Template for manager to review direct reports', 'manager', 
'[
  {"id": 1, "question": "How well does this person meet their goals?", "type": "rating", "required": true},
  {"id": 2, "question": "Leadership and mentorship", "type": "rating", "required": true},
  {"id": 3, "question": "Areas of excellence", "type": "text", "required": true},
  {"id": 4, "question": "Development opportunities", "type": "text", "required": true}
]'::jsonb, 
true, '76c7750b-63ac-4924-a6db-e2d8743e026f', '2024-01-15T10:00:00Z', NOW())
ON CONFLICT (id) DO NOTHING;

-- ===================
-- 10. USER NOTIFICATIONS
-- ===================

-- Note: The table is called user_notifications, not notifications
-- Type must be one of: 'email', 'in_app', 'slack', 'sms'
INSERT INTO user_notifications (id, user_id, organization_id, type, category, title, message, status, created_at) VALUES
('00000000-0000-0000-0000-000000000071', '76c7750b-63ac-4924-a6db-e2d8743e026f', '00000000-0000-0000-0000-000000000001', 'in_app', 'feedback', 'New Feedback Received', 'You received feedback from Efrat Rozenfeld for Q4 2024 Performance Review', 'pending', '2024-11-10T14:35:00Z'),
('00000000-0000-0000-0000-000000000072', '76c7750b-63ac-4924-a6db-e2d8743e026f', '00000000-0000-0000-0000-000000000001', 'in_app', 'feedback', 'Feedback Request Pending', 'Tovah Cohen has not yet submitted feedback for Q4 2024 cycle', 'pending', '2024-11-12T09:00:00Z')
ON CONFLICT (id) DO NOTHING;

-- ===================
-- SUMMARY
-- ===================

DO $$
BEGIN
    RAISE NOTICE '✅ Seed data inserted successfully!';
    RAISE NOTICE '';
    RAISE NOTICE 'Data Summary:';
    RAISE NOTICE '- 1 Organization: Wix.com';
    RAISE NOTICE '- 3 Users: Itay Sivan (admin), Efrat Rozenfeld (manager), Tovah Cohen (employee)';
    RAISE NOTICE '- 2 Feedback Cycles: Q4 2024 (active), Q3 2024 (closed)';
    RAISE NOTICE '- 2 Feedback Requests (1 completed, 1 in progress)';
    RAISE NOTICE '- 1 Feedback Response (Efrat to Itay)';
    RAISE NOTICE '- 2 Feedback Templates';
    RAISE NOTICE '- 2 Notifications';
    RAISE NOTICE '';
    RAISE NOTICE 'Test Credentials:';
    RAISE NOTICE '- Email: itays@wix.com (Admin)';
    RAISE NOTICE '- Email: efratr@wix.com (Manager)';
    RAISE NOTICE '- Email: tovahc@wix.com (Employee)';
    RAISE NOTICE '- Password: any password (mock auth)';
END $$;

