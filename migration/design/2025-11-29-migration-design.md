# FeedbackFlow Migration to Wix Infrastructure - Design Document

**Date:** 2025-11-29
**Status:** Approved
**Approach:** API-First (Bottom-Up)

---

## Executive Summary

Migrate FeedbackFlow application from Node.js/Express/PostgreSQL stack to Wix infrastructure:
- **Server**: 3 Java Ninja services (Bazel + Loop Prime + SDL)
- **Frontend**: wix-serverless (auth/render) + React BO app (yoshi-library + WDS)

---

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                        WIX INFRASTRUCTURE                        │
├─────────────────────────────────────────────────────────────────┤
│  JAVA NINJA SERVICES (Bazel + Loop Prime + SDL)                 │
│  ┌─────────────────┐ ┌─────────────────┐ ┌─────────────────┐    │
│  │  CORE SERVICE   │ │ FEEDBACK SERVICE│ │  OPS SERVICE    │    │
│  │  - Users        │ │  - Cycles       │ │  - Notifications│    │
│  │  - Organizations│ │  - Feedback     │ │  - Analytics    │    │
│  │  - Hierarchy    │ │  - Reviews      │ │  - Audit        │    │
│  │  - Roles/Perms  │ │  (PII: Feedback)│ │  (PII: Logs)    │    │
│  │  (PII: Full)    │ │                 │ │                 │    │
│  └────────▲────────┘ └────────▲────────┘ └────────▲────────┘    │
│           │                   │                   │              │
│           └───────── HTTP (Ambassador) ──────────┘              │
│                               ▲                                  │
│                               │ Direct HTTP calls                │
│  ┌─────────────────────────────────────────────────────────────┐│
│  │         REACT APP (yoshi-library + WDS components)          ││
│  │                    BO App - VPN only                        ││
│  └─────────────────────────────────────────────────────────────┘│
│                               ▲                                  │
│                               │ Serves/Renders                   │
│  ┌─────────────────────────────────────────────────────────────┐│
│  │    WIX-SERVERLESS (Node.js) - Auth/VPN Gate + App Render    ││
│  └─────────────────────────────────────────────────────────────┘│
└─────────────────────────────────────────────────────────────────┘
```

**Key Architecture Decisions:**
- **wix-serverless**: Auth/VPN gate + renders React app (no API proxy)
- **React app**: Direct HTTP calls to Java services via Ambassador
- **Java services**: Expose HTTP methods via proto definitions
- **Authentication**: Wix Identity + custom hierarchy in Core service

---

## Key Decisions Summary

| Area | Decision |
|------|----------|
| **Service Split** | 3 domain clusters: Core, Feedback, Operations |
| **Data Strategy** | Simplified core schema (focus on core entities) |
| **Auth** | Wix Identity + custom hierarchy |
| **Frontend** | Full feature parity (35+ pages) |
| **Data Migration** | Users/Orgs/Hierarchy only (fresh start for cycles/feedback) |
| **PII** | Full scope (employee data, feedback, ratings) |

---

## Service Designs

### Service 1: Core Service (feedbackflow-core)

**Location:** `/Users/nissano/wix-academy/feedbackflow-core`

#### SDL Schema

| Entity | SDL Table | Key Fields | PII |
|--------|-----------|------------|-----|
| User | `users` | id, wix_user_id, email, name, avatar_url, job_title, hire_date | Yes |
| Organization | `organizations` | id, name, slug, settings (JSON), max_users | Partial |
| Department | `departments` | id, org_id, name, type, parent_id, manager_id | No |
| Team | `teams` | id, org_id, department_id, name, team_lead_id | No |
| OrgMember | `org_members` | user_id, org_id, department_id, team_id, role | No |
| Hierarchy | `hierarchy` | org_id, manager_id, employee_id, level, is_direct | No |
| Role | `roles` | id, org_id, name, permissions (JSON) | No |

#### APIs (HTTP via proto)

```
POST/GET/PUT/DELETE  /users
POST/GET/PUT/DELETE  /organizations
POST/GET/PUT/DELETE  /organizations/{id}/departments
POST/GET/PUT/DELETE  /organizations/{id}/teams
POST/GET/PUT/DELETE  /organizations/{id}/members
GET                  /hierarchy/{org_id}
GET                  /hierarchy/manager/{id}/reports
GET                  /hierarchy/employee/{id}/chain
```

#### Key Logic
- Wix Identity integration (map wix_user_id to internal user)
- Circular hierarchy prevention
- Role-based permissions calculation

---

### Service 2: Feedback Service (feedbackflow-feedback)

**Location:** `/Users/nissano/wix-academy/feedbackflow-feedback`

#### SDL Schema

| Entity | SDL Table | Key Fields | PII |
|--------|-----------|------------|-----|
| Cycle | `cycles` | id, org_id, name, type, status, start_date, end_date, settings | No |
| CycleParticipant | `cycle_participants` | cycle_id, user_id, role, status | No |
| FeedbackRequest | `feedback_requests` | id, cycle_id, requester_id, recipient_id, type, status, due_date | No |
| FeedbackResponse | `feedback_responses` | id, request_id, giver_id, recipient_id, content, rating, is_anonymous | Yes |
| FeedbackTemplate | `feedback_templates` | id, org_id, name, type, questions (JSON), is_default | No |
| FeedbackComment | `feedback_comments` | id, response_id, user_id, content, is_internal | Yes |
| Acknowledgment | `acknowledgments` | response_id, user_id, acknowledged_at | No |

#### APIs (HTTP via proto)

```
# Cycles
POST/GET/PUT/DELETE  /cycles
POST                 /cycles/{id}/activate
POST                 /cycles/{id}/close
GET/POST/DELETE      /cycles/{id}/participants

# Feedback
POST/GET/PUT/DELETE  /feedback
POST                 /feedback/{id}/submit
GET                  /feedback/pending
GET                  /feedback/drafts
POST                 /feedback/{id}/acknowledge
GET/POST/PUT/DELETE  /feedback/{id}/comments

# Templates
GET/POST/PUT/DELETE  /templates
```

#### Status Flows
- **Cycle:** `DRAFT → ACTIVE → CLOSED → ARCHIVED`
- **Feedback:** `DRAFT → SUBMITTED → ACKNOWLEDGED → COMPLETED`

#### Key Logic
- Validate feedback permissions (who can give feedback to whom)
- Enforce cycle dates and deadlines
- Anonymous feedback handling
- Duplicate submission prevention

---

### Service 3: Operations Service (feedbackflow-ops)

**Location:** `/Users/nissano/wix-academy/feedbackflow-ops`

#### SDL Schema

| Entity | SDL Table | Key Fields | PII |
|--------|-----------|------------|-----|
| Notification | `notifications` | id, user_id, type, category, title, message, status, priority | Partial |
| NotificationTemplate | `notification_templates` | id, org_id, name, type, category, body, variables | No |
| NotificationPreference | `notification_prefs` | user_id, org_id, type, category, is_enabled, frequency | No |
| AuditLog | `audit_logs` | id, org_id, user_id, action, resource_type, resource_id, old_values, new_values | Yes |
| AnalyticsEvent | `analytics_events` | id, org_id, user_id, event_type, category, properties, timestamp | Partial |
| AnalyticsMetric | `analytics_metrics` | id, org_id, metric_name, type, value, dimensions | No |

#### APIs (HTTP via proto)

```
# Notifications
POST/GET/DELETE      /notifications
PUT                  /notifications/{id}/read
GET/PUT              /notifications/preferences
GET/POST/PUT         /notifications/templates

# Analytics
GET                  /analytics/dashboard
GET                  /analytics/metrics
GET                  /analytics/metrics/{name}/trends
POST                 /analytics/events
GET                  /analytics/reports
POST                 /analytics/reports/generate

# Audit
GET                  /audit/logs
GET                  /audit/logs/{resource_type}/{resource_id}
```

#### Key Logic
- Notification delivery (in-app, email via Wix infra)
- User preference filtering
- Metrics aggregation and trend calculation
- Audit log retention policies

**Note:** This service is lower priority - Core and Feedback services are the critical path.

---

## Frontend Design

**Location:** New monorepo (to be generated)

### Structure (following premium-purchase-platform patterns)

```
feedbackflow-bo/
├── serverless/
│   └── feedbackflow-serve/        # wix-serverless - auth/VPN + renders app
│       ├── src/
│       │   └── index.ts           # HTTP endpoint serving React app
│       └── package.json
│
└── packages/
    └── feedbackflow-backoffice/   # React app (yoshi-library)
        ├── src/
        │   ├── components/        # WDS components + custom
        │   ├── pages/             # 35+ pages (matching current app)
        │   ├── services/          # Ambassador HTTP calls to Java
        │   ├── stores/            # State management
        │   ├── hooks/             # Custom React hooks
        │   └── types/             # TypeScript types (from proto definitions)
        └── package.json
```

### Key Patterns (from premium-fed-sdk)
- **API calls**: Ambassador client for HTTP calls to Java services
- **Error handling**: Centralized error handling with modals
- **Forms**: Same validation patterns as current app
- **UI**: wix-design-system components (WDS)

### Page Migration Priority

| Group | Pages | Priority |
|-------|-------|----------|
| Auth | Login, Profile | P0 |
| Cycles | List, Create, Detail, Settings | P0 |
| Feedback | Give, Receive, Detail, History, Team | P0 |
| Admin | Org Mgmt, User Mgmt, Hierarchy | P1 |
| Analytics | Dashboard, Reports, Insights | P2 |
| Settings | User Settings, Notifications | P2 |

---

## Migration Execution Plan

### Phase 1: Core Service

- Setup Ninja project in wix-academy
- SDL schema: users, organizations, departments, teams, roles
- CRUD APIs + hierarchy APIs
- PII configuration
- Wix Identity integration

**Deliverable:** Working Core APIs

### Phase 2: Feedback Service

- Setup second Ninja project
- SDL schema: cycles, feedback, templates
- CRUD APIs + status transitions
- Cross-service calls to Core (user validation)

**Deliverable:** Working Feedback APIs

### Phase 3: Frontend

- Setup monorepo (serverless + packages)
- wix-serverless auth/render setup
- React app with Ambassador calls
- Migrate all 35+ pages with WDS components

**Deliverable:** Full BO app connected to Java services

### Phase 4: Operations Service + Data Migration

- Operations service (notifications, analytics, audit)
- Data migration scripts (users, orgs, hierarchy)
- Testing and cutover

**Deliverable:** Production-ready system

---

## Data Migration Strategy

### What to Migrate
- Users (map to Wix Identity)
- Organizations
- Departments
- Teams
- Org hierarchy relationships

### Fresh Start (No Migration)
- Cycles
- Feedback responses
- Notifications
- Analytics data
- Audit logs

### Migration Approach
- Bulk API scripts to import data
- Validate data integrity post-migration
- Run in parallel during transition if needed

---

## References

### Ninja Onboarding
`/Users/nissano/wix-academy/server-onboarding/guides/rendered/java/stp`

### Example Java Services
- subscription-change-product: `/Users/nissano/premium/premium-server/premium-subscriptions-product-change`
- premium-invoices: `/Users/nissano/premium-billing/premium-invoices`

### Frontend Examples
- Server renderer: `/Users/nissano/premium-purchase-platform/serverless/p3-serve`
- React app: `/Users/nissano/premium-purchase-platform/packages/p3-backoffice`

### Documentation
- wix-serverless: https://dev.wix.com/docs/server-guild/serverless/serverless/expose-http-endpoint
- wix-design-system: https://www.docs.wixdesignsystem.com/

---

## Related Documents

- [Core Service Plan](../server/core-service-plan.md)
- [Feedback Service Plan](../server/feedback-service-plan.md)
- [Operations Service Plan](../server/ops-service-plan.md)
- [Frontend Plan](../client/frontend-plan.md)
