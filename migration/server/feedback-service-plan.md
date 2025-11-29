# Feedback Service Implementation Plan (feedbackflow-feedback)

**Status:** Pending
**Priority:** Phase 2
**Location:** `/Users/nissano/wix-academy/feedbackflow-feedback`

---

## Overview

The Feedback Service handles feedback cycles, feedback requests/responses, templates, and the core feedback workflow. This is the main business logic service.

---

## SDL Schema

### cycles
```
id: UUID (primary key)
organization_id: UUID (reference to Core service)
name: String
type: Enum (quarterly, annual, project, custom)
status: Enum (draft, active, closed, archived)
start_date: Date
end_date: Date
settings: JSON (reminder frequency, anonymity settings, etc.)
created_by: UUID (user reference)
created_at: Timestamp
updated_at: Timestamp
```

### cycle_participants
```
id: UUID (primary key)
cycle_id: UUID (foreign key -> cycles)
user_id: UUID (reference to Core service)
organization_id: UUID (reference to Core service)
role: Enum (participant, manager, admin)
status: Enum (pending, active, completed, opted_out)
participation_type: Enum (give_feedback, receive_feedback, both)
created_at: Timestamp
updated_at: Timestamp
UNIQUE(cycle_id, user_id)
```

### feedback_requests
```
id: UUID (primary key)
cycle_id: UUID (foreign key -> cycles)
requester_id: UUID (user reference - who requested feedback)
recipient_id: UUID (user reference - who feedback is about)
feedback_type: Enum (peer, manager, self, direct_report, 360)
status: Enum (pending, in_progress, completed, cancelled)
due_date: Date
template_id: UUID (nullable, foreign key -> feedback_templates)
created_at: Timestamp
updated_at: Timestamp
UNIQUE(cycle_id, requester_id, recipient_id, feedback_type)
```

### feedback_responses
```
id: UUID (primary key)
request_id: UUID (foreign key -> feedback_requests)
giver_id: UUID (user reference - who gave the feedback)
recipient_id: UUID (user reference - who feedback is about)
cycle_id: UUID (foreign key -> cycles)
content: JSON (PII - structured feedback answers)
rating: Integer (nullable, 1-5)
is_anonymous: Boolean (default: false)
status: Enum (draft, submitted, acknowledged, completed)
submitted_at: Timestamp (nullable)
acknowledged_at: Timestamp (nullable)
created_at: Timestamp
updated_at: Timestamp
```

### feedback_templates
```
id: UUID (primary key)
organization_id: UUID (reference to Core service)
name: String
type: Enum (peer, manager, self, 360, custom)
questions: JSON (array of question objects with type, text, options)
is_default: Boolean (default: false)
is_active: Boolean (default: true)
created_at: Timestamp
updated_at: Timestamp
```

### feedback_comments
```
id: UUID (primary key)
response_id: UUID (foreign key -> feedback_responses)
user_id: UUID (user reference)
content: Text (PII)
is_internal: Boolean (default: false - internal = HR/manager only)
created_at: Timestamp
updated_at: Timestamp
```

### acknowledgments
```
id: UUID (primary key)
response_id: UUID (foreign key -> feedback_responses)
user_id: UUID (user reference)
acknowledged_at: Timestamp
notes: Text (nullable)
UNIQUE(response_id, user_id)
```

---

## API Endpoints

### Cycles
| Method | Path | Description |
|--------|------|-------------|
| POST | /cycles | Create cycle |
| GET | /cycles | List cycles (with filters: org, status, date range) |
| GET | /cycles/{id} | Get cycle details |
| PUT | /cycles/{id} | Update cycle |
| DELETE | /cycles/{id} | Delete cycle (draft only) |
| POST | /cycles/{id}/activate | Activate cycle (draft -> active) |
| POST | /cycles/{id}/close | Close cycle (active -> closed) |

### Cycle Participants
| Method | Path | Description |
|--------|------|-------------|
| GET | /cycles/{id}/participants | List participants |
| POST | /cycles/{id}/participants | Add participants (bulk) |
| PUT | /cycles/{id}/participants/{userId} | Update participant |
| DELETE | /cycles/{id}/participants/{userId} | Remove participant |

### Feedback Requests
| Method | Path | Description |
|--------|------|-------------|
| POST | /feedback/requests | Create feedback request |
| GET | /feedback/requests | List requests (with filters) |
| GET | /feedback/requests/{id} | Get request details |
| PUT | /feedback/requests/{id} | Update request |
| DELETE | /feedback/requests/{id} | Cancel request |

### Feedback Responses
| Method | Path | Description |
|--------|------|-------------|
| POST | /feedback | Create feedback response (draft) |
| GET | /feedback | List feedback (with filters) |
| GET | /feedback/{id} | Get feedback details |
| PUT | /feedback/{id} | Update feedback (draft only) |
| DELETE | /feedback/{id} | Delete feedback (draft only) |
| POST | /feedback/{id}/submit | Submit feedback |
| GET | /feedback/pending | Get pending feedback for current user |
| GET | /feedback/drafts | Get draft feedback for current user |

### Feedback Acknowledgment
| Method | Path | Description |
|--------|------|-------------|
| POST | /feedback/{id}/acknowledge | Acknowledge feedback |
| GET | /feedback/{id}/acknowledgment | Get acknowledgment details |

### Feedback Comments
| Method | Path | Description |
|--------|------|-------------|
| GET | /feedback/{id}/comments | List comments |
| POST | /feedback/{id}/comments | Add comment |
| PUT | /feedback/{id}/comments/{commentId} | Update comment |
| DELETE | /feedback/{id}/comments/{commentId} | Delete comment |

### Templates
| Method | Path | Description |
|--------|------|-------------|
| POST | /templates | Create template |
| GET | /templates | List templates (with filters) |
| GET | /templates/{id} | Get template |
| GET | /templates/type/{type} | Get default template by type |
| PUT | /templates/{id} | Update template |
| DELETE | /templates/{id} | Delete template |

---

## Status Flows

### Cycle Status Flow
```
DRAFT ──[activate]──> ACTIVE ──[close]──> CLOSED ──[archive]──> ARCHIVED
  │                                          │
  └──────────[delete]──────────> (deleted)   └──[reopen]──> ACTIVE
```

### Feedback Status Flow
```
DRAFT ──[submit]──> SUBMITTED ──[acknowledge]──> ACKNOWLEDGED ──[complete]──> COMPLETED
  │                     │
  └──[delete]──> (del)  └──[return for revision]──> DRAFT
```

---

## Business Logic

### Feedback Permission Validation
- Check cycle is active
- Check user is participant in cycle
- Check feedback type allowed (peer can't give manager feedback)
- Check not already submitted for same requester/recipient/type combo

### Duplicate Submission Prevention
- Enforce unique constraint on (cycle_id, giver_id, recipient_id, feedback_type)
- Return existing response if duplicate attempted

### Anonymous Feedback
- When `is_anonymous = true`, giver_id is not exposed to recipient
- HR/Admin can still see giver for audit purposes

### Cycle Date Enforcement
- Cannot submit feedback outside cycle dates
- Warnings for approaching due dates

---

## Implementation Tasks

### Setup
- [ ] Create Ninja project structure
- [ ] Configure Bazel build
- [ ] Setup Loop Prime bootstrap
- [ ] Configure PII settings for feedback content

### SDL & Data
- [ ] Define SDL schema for all entities
- [ ] Setup database migrations
- [ ] Implement CRUD repositories

### APIs
- [ ] Implement Cycles API
- [ ] Implement Cycle Participants API
- [ ] Implement Feedback Requests API
- [ ] Implement Feedback Responses API
- [ ] Implement Acknowledgment API
- [ ] Implement Comments API
- [ ] Implement Templates API

### Business Logic
- [ ] Feedback permission validation
- [ ] Duplicate submission prevention
- [ ] Status transition logic
- [ ] Anonymous feedback handling
- [ ] Cycle date enforcement

### Cross-Service Integration
- [ ] Call Core service for user validation
- [ ] Call Core service for org/hierarchy validation

### Testing
- [ ] Unit tests for services
- [ ] Integration tests for APIs
- [ ] Status flow tests
- [ ] Permission validation tests

---

## Dependencies

- Core Service (for user, organization, hierarchy validation)

## Dependents

- Operations Service (for notifications on feedback events)
- Frontend (primary consumer)
