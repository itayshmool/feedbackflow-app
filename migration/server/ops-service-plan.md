# Operations Service Implementation Plan (feedbackflow-ops)

**Status:** Pending
**Priority:** Phase 4 (Last server component)
**Location:** `/Users/nissano/wix-academy/feedbackflow-ops`

---

## Overview

The Operations Service handles notifications, analytics, and audit logging. This is a supporting service that enhances the user experience but is not critical for core functionality.

**Note:** This service is lower priority. Core and Feedback services should be completed first.

---

## SDL Schema

### notifications
```
id: UUID (primary key)
user_id: UUID (reference to Core service)
organization_id: UUID (reference to Core service)
type: Enum (email, in_app, slack, sms)
category: Enum (feedback_request, feedback_received, cycle_reminder, system)
title: String
message: Text
status: Enum (pending, sent, delivered, failed, read)
priority: Enum (low, normal, high, urgent)
metadata: JSON (additional context like feedback_id, cycle_id)
scheduled_at: Timestamp (nullable, for scheduled notifications)
sent_at: Timestamp (nullable)
read_at: Timestamp (nullable)
created_at: Timestamp
```

### notification_templates
```
id: UUID (primary key)
organization_id: UUID (nullable, null = system template)
name: String
type: Enum (email, in_app, slack, sms)
category: Enum (feedback_request, feedback_received, cycle_reminder, system)
subject: String (for email)
body: Text (with variable placeholders like {{user_name}})
variables: JSON (list of available variables)
is_active: Boolean (default: true)
created_at: Timestamp
updated_at: Timestamp
```

### notification_prefs
```
id: UUID (primary key)
user_id: UUID (reference to Core service)
organization_id: UUID (reference to Core service)
type: Enum (email, in_app, slack, sms)
category: Enum (feedback_request, feedback_received, cycle_reminder, system)
is_enabled: Boolean (default: true)
frequency: Enum (immediate, daily_digest, weekly_digest)
created_at: Timestamp
updated_at: Timestamp
UNIQUE(user_id, organization_id, type, category)
```

### audit_logs
```
id: UUID (primary key)
organization_id: UUID (reference to Core service)
user_id: UUID (reference to Core service)
action: Enum (create, read, update, delete, login, logout, export)
resource_type: String (e.g., 'cycle', 'feedback', 'user')
resource_id: UUID
old_values: JSON (nullable, PII - previous state)
new_values: JSON (nullable, PII - new state)
ip_address: String (nullable)
user_agent: String (nullable)
created_at: Timestamp
```

### analytics_events
```
id: UUID (primary key)
organization_id: UUID (reference to Core service)
user_id: UUID (nullable, reference to Core service)
event_type: String (e.g., 'feedback_submitted', 'cycle_viewed')
event_category: Enum (feedback, cycle, user, system)
properties: JSON (event-specific data)
session_id: String (nullable)
created_at: Timestamp
```

### analytics_metrics
```
id: UUID (primary key)
organization_id: UUID (reference to Core service)
metric_name: String (e.g., 'feedback_completion_rate')
metric_type: Enum (counter, gauge, histogram)
value: Decimal
dimensions: JSON (e.g., {cycle_id: 'xxx', department_id: 'yyy'})
period_start: Timestamp
period_end: Timestamp
created_at: Timestamp
UNIQUE(organization_id, metric_name, dimensions, period_start)
```

---

## API Endpoints

### Notifications
| Method | Path | Description |
|--------|------|-------------|
| POST | /notifications | Create notification (internal/system use) |
| GET | /notifications | List user notifications |
| GET | /notifications/{id} | Get notification |
| PUT | /notifications/{id}/read | Mark as read |
| DELETE | /notifications/{id} | Delete notification |
| GET | /notifications/unread/count | Get unread count |

### Notification Preferences
| Method | Path | Description |
|--------|------|-------------|
| GET | /notifications/preferences | Get user preferences |
| PUT | /notifications/preferences/{category} | Update preference |
| PUT | /notifications/preferences/bulk | Bulk update preferences |

### Notification Templates
| Method | Path | Description |
|--------|------|-------------|
| GET | /notifications/templates | List templates |
| POST | /notifications/templates | Create template (admin) |
| PUT | /notifications/templates/{id} | Update template |
| DELETE | /notifications/templates/{id} | Delete template |

### Analytics
| Method | Path | Description |
|--------|------|-------------|
| GET | /analytics/dashboard | Get dashboard data |
| GET | /analytics/metrics | Get metrics (with filters) |
| GET | /analytics/metrics/{name}/trends | Get metric trends over time |
| GET | /analytics/metrics/{name}/comparison | Compare metrics across dimensions |
| POST | /analytics/events | Track event |
| GET | /analytics/reports | List generated reports |
| POST | /analytics/reports/generate | Generate report (async) |
| GET | /analytics/reports/{id} | Get report |

### Audit Logs
| Method | Path | Description |
|--------|------|-------------|
| GET | /audit/logs | List audit logs (admin) |
| GET | /audit/logs/{resource_type}/{resource_id} | Get logs for resource |
| GET | /audit/logs/user/{userId} | Get logs for user |

---

## Notification Categories & Templates

### System Templates
| Category | Type | Trigger |
|----------|------|---------|
| feedback_request | email, in_app | New feedback request created |
| feedback_received | email, in_app | Feedback submitted for user |
| cycle_reminder | email | Approaching cycle deadline |
| cycle_started | email, in_app | Cycle activated |
| cycle_closed | email, in_app | Cycle closed |

### Template Variables
```
{{user_name}} - Recipient's name
{{giver_name}} - Feedback giver's name (if not anonymous)
{{cycle_name}} - Cycle name
{{due_date}} - Due date formatted
{{feedback_link}} - Link to feedback
{{cycle_link}} - Link to cycle
```

---

## Analytics Metrics

### Pre-defined Metrics
| Metric | Type | Description |
|--------|------|-------------|
| feedback_completion_rate | gauge | % of requested feedback completed |
| average_response_time | gauge | Avg time to submit feedback |
| cycle_participation_rate | gauge | % of participants engaged |
| feedback_quality_score | gauge | Based on feedback length/detail |
| notification_open_rate | gauge | % of notifications read |

### Dimensions for Filtering
- organization_id
- cycle_id
- department_id
- team_id
- time_period (daily, weekly, monthly)

---

## Implementation Tasks

### Setup
- [ ] Create Ninja project structure
- [ ] Configure Bazel build
- [ ] Setup Loop Prime bootstrap
- [ ] Configure PII settings for audit logs

### SDL & Data
- [ ] Define SDL schema for all entities
- [ ] Setup database migrations
- [ ] Implement CRUD repositories

### Notifications
- [ ] Implement Notifications API
- [ ] Implement Preferences API
- [ ] Implement Templates API
- [ ] Email delivery integration (Wix email infra)
- [ ] In-app notification delivery

### Analytics
- [ ] Implement Events tracking API
- [ ] Implement Metrics API
- [ ] Implement Dashboard API
- [ ] Implement Reports API
- [ ] Metrics aggregation jobs

### Audit
- [ ] Implement Audit Logs API
- [ ] Audit log retention policy

### Cross-Service Integration
- [ ] Event listeners for Core service events
- [ ] Event listeners for Feedback service events

### Testing
- [ ] Unit tests for services
- [ ] Integration tests for APIs
- [ ] Notification delivery tests

---

## Dependencies

- Core Service (for user, organization context)
- Feedback Service (for feedback events)
- Wix Email Infrastructure

## Dependents

- Frontend (notification display, analytics dashboards)
