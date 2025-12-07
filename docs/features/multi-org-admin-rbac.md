# Multi-Organization Admin RBAC

> **Feature Specification**: Organization-scoped admin roles with delegation controls

---

## Overview

FeedbackFlow implements a hierarchical Role-Based Access Control (RBAC) system where admin users can be granted management access to one or more organizations, while regular users belong to exactly one organization.

### Role Hierarchy

| Role | Scope | Description |
|------|-------|-------------|
| `super_admin` | Global | Full access to ALL organizations. Can grant admin access to any org. |
| `admin` | Multi-org | Access to ASSIGNED organizations only. Can grant admin access only to orgs they manage. |
| `manager` | Single-org | Team management within their home organization. |
| `employee` | Single-org | Basic access within their home organization. |

---

## Data Model

### User Organization Relationship

```
User ──belongs_to──▶ ONE organization (home org)
     └── organization_id in users table
```

- Every user belongs to exactly ONE organization
- This is their "home" organization
- All non-admin roles operate within this single org

### Admin Organization Management

```
Admin ──manages──▶ MULTIPLE organizations
      └── user_roles table with (role_id=admin, organization_id=X)
```

- Admin role requires organization assignment
- One `user_roles` row per managed organization
- Super admin has no organization_id (null = global access)

### Database Schema

```sql
-- User's home organization (ONE)
users.organization_id UUID NOT NULL

-- Role assignments (can have multiple for admin)
user_roles (
  user_id UUID,
  role_id UUID,
  organization_id UUID,  -- NULL for super_admin
  UNIQUE(user_id, role_id, organization_id)
)
```

### Valid States

| Role | organization_id in user_roles | Meaning |
|------|------------------------------|---------|
| `super_admin` | NULL | Global access, no org restriction |
| `admin` | UUID (required) | Access to specific org, can have multiple rows |
| `manager` | User's home org | Team access in home org |
| `employee` | User's home org | Basic access in home org |

---

## Business Rules

### Rule 1: User Organization Membership

```
A user belongs to exactly ONE organization.
All user activity (feedback, cycles, etc.) is within their home organization.
```

### Rule 2: Admin Organization Scope

```
An admin user:
- Belongs to ONE organization (their home)
- Can MANAGE one or more organizations
- Can see users from ALL orgs they manage
- Can only grant admin access to orgs they manage
```

### Rule 3: Admin Role Requires Organization

```
The admin role MUST have at least one organization assignment.
Admin with 0 organizations is an INVALID state.
```

### Rule 4: Delegation Constraint (No Privilege Escalation)

```
An admin can only delegate admin access to organizations they manage.
- Super admin: Can assign admin to ANY org
- Admin (orgs A, B, C): Can only assign admin to A, B, or C
```

### Rule 5: Super Admin Global Access

```
Super admin has unrestricted access:
- Sees all organizations
- Sees all users
- Can grant any role to any org
- organization_id is NULL (no restriction)
```

---

## API Design

### Authentication Middleware

The auth middleware populates `req.user` with:

```typescript
interface AuthenticatedUser {
  id: string;
  email: string;
  name: string;
  roles: string[];  // ['admin', 'employee']
  organizationId: string;  // User's home org
  
  // For admin/super_admin:
  adminOrganizations: Array<{
    id: string;    // Org UUID
    slug: string;  // Org slug (unique)
    name: string;  // Org display name
  }>;
  isSuperAdmin: boolean;
}
```

### Key Endpoints

#### GET /api/v1/admin/assignable-organizations

Returns organizations the current user can grant admin access to.

```typescript
// Super admin: Returns all organizations
// Admin: Returns only their managed organizations

Response: {
  success: true,
  data: Organization[],
  meta: { isSuperAdmin: boolean, totalAvailable: number }
}
```

#### PUT /api/v1/admin/users/:userId/roles

Syncs role assignments for a user.

```typescript
Request: {
  roleAssignments: [
    { roleName: 'employee', organizationIds: [] },
    { roleName: 'admin', organizationIds: ['org-1', 'org-2'] }
  ]
}

// Backend validates: All org IDs must be in grantor's adminOrganizations
```

#### GET /api/v1/admin/users

Returns users from organizations the admin manages.

```typescript
// Super admin: All users (filterable by org)
// Admin: Users from their managed organizations only
```

---

## Frontend Behavior

### User Management Page

```
Admin sees:
- Users from ALL organizations they manage
- Can filter by organization
- Can create/edit/delete users in managed orgs
```

### Role Assignment Modal

When assigning the `admin` role:

1. Show multi-select organization picker
2. List ONLY organizations the current user manages
3. Require at least one organization selection
4. For super_admin, show all organizations

```
┌──────────────────────────────────────────────────┐
│ Assign Roles                                      │
├──────────────────────────────────────────────────┤
│ ☐ employee                                       │
│ ☐ manager                                        │
│ ☑ admin                                          │
│   ┌────────────────────────────────────────────┐ │
│   │ Select organizations:                      │ │
│   │ ☑ Wix HR (wix-hr)                         │ │
│   │ ☑ Wix Dev (wix-dev)                       │ │
│   │ ☐ Wix UX (wix-ux)                         │ │
│   │ ✓ 2 organizations selected                │ │
│   └────────────────────────────────────────────┘ │
│ ☐ super_admin (requires super_admin to assign)   │
└──────────────────────────────────────────────────┘
```

### Super Admin Indicator

When user is super_admin, show:
- "(Access to ALL organizations)" label
- Disable org selector for admin role (not needed)
- Full organization list everywhere

---

## Security Requirements

### Backend Validation (Defense in Depth)

Even though frontend filters the list, backend MUST validate:

```typescript
// In role assignment endpoint
if (roleName === 'admin') {
  if (!isSuperAdmin) {
    const unauthorized = requestedOrgIds.filter(
      id => !grantorAdminOrgs.includes(id)
    );
    if (unauthorized.length > 0) {
      throw new ForbiddenError('Privilege escalation denied');
    }
  }
  
  if (requestedOrgIds.length === 0) {
    throw new ValidationError('Admin role requires at least one organization');
  }
}
```

### Authorization Middleware

For admin routes, apply in sequence:

```typescript
router.use('/admin/*',
  authenticateToken,     // 1. Valid JWT?
  requireAdmin(),        // 2. Has admin role?
  setOrgScope()         // 3. Set effectiveOrganizationId
);
```

### Query Filtering

All admin queries MUST filter by managed orgs:

```typescript
// In service layer
async getUsers(adminOrgs: string[] | null) {
  if (adminOrgs === null) {
    // Super admin - no filter
    return this.userModel.findAll();
  }
  // Org-scoped admin - filter to managed orgs
  return this.userModel.findByOrganizations(adminOrgs);
}
```

---

## Implementation Checklist

### Database

- [ ] Verify `user_roles.organization_id` allows NULL (for super_admin)
- [ ] Verify unique constraint: `UNIQUE(user_id, role_id, organization_id)`
- [ ] Add index: `idx_user_roles_admin_org ON user_roles(user_id, organization_id)`

### Backend

- [ ] Update auth middleware to load `adminOrganizations` array
- [ ] Create `GET /admin/assignable-organizations` endpoint
- [ ] Update `PUT /admin/users/:id/roles` with validation
- [ ] Add `syncUserRoles()` service method for atomic updates
- [ ] Filter user queries by admin's managed orgs
- [ ] Add privilege escalation check in role assignment

### Frontend

- [ ] Create `AdminRoleOrganizationSelector` component
- [ ] Update `UserForm` to show org selector when admin role selected
- [ ] Fetch assignable orgs from new endpoint
- [ ] Add validation: admin role requires ≥1 org
- [ ] Show appropriate messaging for limited vs super admin

### Testing

- [ ] Test: Admin can assign to managed orgs
- [ ] Test: Admin cannot assign to unmanaged orgs (API level)
- [ ] Test: Super admin can assign to any org
- [ ] Test: Admin role requires organization
- [ ] Test: User list filtered by admin's orgs

---

## Examples

### Example 1: HR Admin Across Regions

```
Sarah (belongs to: wix-global)
├── admin @ wix-us
├── admin @ wix-emea
└── admin @ wix-apac

Sarah can:
✅ See users from wix-us, wix-emea, wix-apac
✅ Grant admin access to wix-us, wix-emea, or wix-apac
❌ Cannot see users from wix-israel
❌ Cannot grant admin access to wix-israel
```

### Example 2: Regional Super Admin

```
David (belongs to: wix-hq)
└── super_admin (no org restriction)

David can:
✅ See ALL users from ALL organizations
✅ Grant admin access to ANY organization
✅ Create new organizations
```

### Example 3: Single-Org Admin

```
Emma (belongs to: wix-uk)
└── admin @ wix-uk

Emma can:
✅ See users from wix-uk only
✅ Grant admin access to wix-uk only
❌ Cannot see users from other orgs
```

---

## Related Files

| File | Purpose |
|------|---------|
| `backend/src/shared/middleware/auth.middleware.ts` | Auth + org loading |
| `backend/src/shared/middleware/rbac.middleware.ts` | Role + org checks |
| `backend/src/modules/admin/services/admin-user.service.ts` | User management |
| `frontend/src/components/admin/user/UserForm.tsx` | User editing UI |
| `frontend/src/components/admin/user/AdminRoleOrganizationSelector.tsx` | Org picker (to be created) |
| `database/sql/schema/01_users_and_auth.sql` | Role schema |
| `database/sql/migrations/org_scoped_admins.sql` | Migration |

---

## Glossary

| Term | Definition |
|------|------------|
| **Home organization** | The single organization a user belongs to |
| **Managed organizations** | Organizations an admin has been granted access to manage |
| **Org-scoped admin** | Admin with access to specific organization(s) |
| **Super admin** | Admin with global access (no org restriction) |
| **Privilege escalation** | Attempting to grant access beyond one's own scope |
| **Delegation chain** | Admins can only delegate permissions they have |

---

**Last Updated**: December 2024  
**Status**: Specification (Implementation Pending)

