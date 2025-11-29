# Core Service Implementation Plan (feedbackflow-core)

**Status:** Pending
**Priority:** Phase 1 (First)
**Location:** `/Users/nissano/wix-academy/feedbackflow-core`

---

## Overview

The Core Service handles user management, organizations, hierarchy, and role-based permissions. This is the foundational service that other services depend on.

---

## SDL Schema

### users
```
id: UUID (primary key)
wix_user_id: String (unique, from Wix Identity)
email: String (unique, PII)
name: String (PII)
avatar_url: String (nullable)
job_title: String (nullable, PII)
hire_date: Date (nullable, PII)
is_active: Boolean (default: true)
last_login_at: Timestamp (nullable)
created_at: Timestamp
updated_at: Timestamp
```

### organizations
```
id: UUID (primary key)
name: String
slug: String (unique)
settings: JSON
max_users: Integer (default: 100)
subscription_plan: Enum (free, basic, professional, enterprise)
is_active: Boolean (default: true)
created_at: Timestamp
updated_at: Timestamp
```

### departments
```
id: UUID (primary key)
organization_id: UUID (foreign key -> organizations)
name: String
type: Enum (engineering, product, design, marketing, sales, hr, finance, operations, other)
parent_department_id: UUID (nullable, self-reference)
manager_id: UUID (nullable, foreign key -> users)
settings: JSON
created_at: Timestamp
updated_at: Timestamp
```

### teams
```
id: UUID (primary key)
organization_id: UUID (foreign key -> organizations)
department_id: UUID (nullable, foreign key -> departments)
name: String
type: Enum (squad, chapter, guild, workgroup, other)
team_lead_id: UUID (nullable, foreign key -> users)
created_at: Timestamp
updated_at: Timestamp
```

### org_members
```
id: UUID (primary key)
user_id: UUID (foreign key -> users)
organization_id: UUID (foreign key -> organizations)
department_id: UUID (nullable, foreign key -> departments)
team_id: UUID (nullable, foreign key -> teams)
role_id: UUID (foreign key -> roles)
job_title: String (nullable)
hire_date: Date (nullable)
created_at: Timestamp
updated_at: Timestamp
UNIQUE(user_id, organization_id)
```

### hierarchy
```
id: UUID (primary key)
organization_id: UUID (foreign key -> organizations)
manager_id: UUID (foreign key -> users)
employee_id: UUID (foreign key -> users)
level: Integer (1 = direct report)
is_direct_report: Boolean
created_at: Timestamp
UNIQUE(organization_id, manager_id, employee_id)
```

### roles
```
id: UUID (primary key)
organization_id: UUID (nullable, null = system role)
name: String
permissions: JSON (array of permission strings)
is_system_role: Boolean (default: false)
created_at: Timestamp
updated_at: Timestamp
```

---

## API Endpoints

### Users
| Method | Path | Description |
|--------|------|-------------|
| POST | /users | Create user (from Wix Identity) |
| GET | /users | List users (with filters) |
| GET | /users/{id} | Get user by ID |
| GET | /users/wix/{wixUserId} | Get user by Wix Identity ID |
| PUT | /users/{id} | Update user |
| DELETE | /users/{id} | Soft delete user |

### Organizations
| Method | Path | Description |
|--------|------|-------------|
| POST | /organizations | Create organization |
| GET | /organizations | List organizations |
| GET | /organizations/{id} | Get organization by ID |
| GET | /organizations/slug/{slug} | Get organization by slug |
| PUT | /organizations/{id} | Update organization |
| DELETE | /organizations/{id} | Soft delete organization |

### Departments
| Method | Path | Description |
|--------|------|-------------|
| POST | /organizations/{orgId}/departments | Create department |
| GET | /organizations/{orgId}/departments | List departments |
| GET | /organizations/{orgId}/departments/{id} | Get department |
| GET | /organizations/{orgId}/departments/hierarchy | Get department tree |
| PUT | /organizations/{orgId}/departments/{id} | Update department |
| DELETE | /organizations/{orgId}/departments/{id} | Delete department |

### Teams
| Method | Path | Description |
|--------|------|-------------|
| POST | /organizations/{orgId}/teams | Create team |
| GET | /organizations/{orgId}/teams | List teams |
| GET | /organizations/{orgId}/teams/{id} | Get team |
| PUT | /organizations/{orgId}/teams/{id} | Update team |
| DELETE | /organizations/{orgId}/teams/{id} | Delete team |

### Organization Members
| Method | Path | Description |
|--------|------|-------------|
| POST | /organizations/{orgId}/members | Add member |
| GET | /organizations/{orgId}/members | List members |
| GET | /organizations/{orgId}/members/{userId} | Get member |
| PUT | /organizations/{orgId}/members/{userId} | Update member |
| DELETE | /organizations/{orgId}/members/{userId} | Remove member |

### Hierarchy
| Method | Path | Description |
|--------|------|-------------|
| GET | /hierarchy/{orgId} | Get full org hierarchy |
| GET | /hierarchy/manager/{managerId}/reports | Get direct reports |
| GET | /hierarchy/employee/{employeeId}/chain | Get manager chain |
| POST | /hierarchy | Create manager-employee relationship |
| DELETE | /hierarchy/{id} | Remove relationship |

### Roles
| Method | Path | Description |
|--------|------|-------------|
| POST | /organizations/{orgId}/roles | Create custom role |
| GET | /organizations/{orgId}/roles | List roles (includes system roles) |
| PUT | /organizations/{orgId}/roles/{id} | Update role |
| DELETE | /organizations/{orgId}/roles/{id} | Delete custom role |

---

## Implementation Tasks

### Setup
- [ ] Create Ninja project structure in wix-academy
- [ ] Configure Bazel build
- [ ] Setup Loop Prime bootstrap
- [ ] Configure PII settings

### SDL & Data
- [ ] Define SDL schema for all entities
- [ ] Setup database migrations
- [ ] Implement CRUD repositories

### APIs
- [ ] Implement Users API
- [ ] Implement Organizations API
- [ ] Implement Departments API
- [ ] Implement Teams API
- [ ] Implement Org Members API
- [ ] Implement Hierarchy API
- [ ] Implement Roles API

### Business Logic
- [ ] Wix Identity integration
- [ ] Circular hierarchy prevention
- [ ] Permission calculation logic
- [ ] Soft delete handling

### Testing
- [ ] Unit tests for services
- [ ] Integration tests for APIs
- [ ] PII compliance tests

---

## Dependencies

- Wix Identity service (for user authentication)
- No dependencies on other FeedbackFlow services

## Dependents

- Feedback Service (for user/org validation)
- Operations Service (for user/org context)
