# Frontend Implementation Plan (feedbackflow-bo)

**Status:** Pending
**Priority:** Phase 3 (After server APIs complete)
**Location:** New monorepo (to be generated)

---

## Overview

React-based Back Office application for Wix employees to manage feedback cycles. Served via wix-serverless with VPN/auth protection.

---

## Project Structure

```
feedbackflow-bo/
├── serverless/
│   └── feedbackflow-serve/           # wix-serverless app
│       ├── src/
│       │   └── index.ts              # HTTP endpoint serving React app
│       ├── package.json
│       └── serverless.yml
│
├── packages/
│   └── feedbackflow-backoffice/      # React app (yoshi-library)
│       ├── src/
│       │   ├── components/
│       │   │   ├── common/           # Shared UI components
│       │   │   ├── cycles/           # Cycle-related components
│       │   │   ├── feedback/         # Feedback-related components
│       │   │   ├── admin/            # Admin components
│       │   │   ├── analytics/        # Analytics/charts
│       │   │   └── layout/           # Layout components
│       │   ├── pages/
│       │   │   ├── auth/
│       │   │   ├── dashboard/
│       │   │   ├── cycles/
│       │   │   ├── feedback/
│       │   │   ├── admin/
│       │   │   ├── analytics/
│       │   │   └── settings/
│       │   ├── services/             # Ambassador API calls
│       │   ├── stores/               # State management
│       │   ├── hooks/                # Custom React hooks
│       │   ├── types/                # TypeScript types
│       │   ├── utils/                # Utility functions
│       │   └── App.tsx
│       ├── package.json
│       └── tsconfig.json
│
├── package.json                      # Monorepo root
└── lerna.json (or pnpm-workspace.yaml)
```

---

## Tech Stack

| Component | Technology | Reference |
|-----------|------------|-----------|
| Framework | React 18 | - |
| Build | yoshi-library | premium-purchase-platform |
| Server | wix-serverless | p3-serve |
| UI Components | wix-design-system (WDS) | docs.wixdesignsystem.com |
| API Client | Ambassador | premium-fed-sdk |
| State | TBD (similar to Zustand) | Current app patterns |
| Forms | React Hook Form + validation | Current app patterns |
| Routing | React Router | - |

---

## Pages to Migrate

### Authentication (P0)
| Current Page | New Page | Description |
|--------------|----------|-------------|
| LoginPage.tsx | - | Handled by wix-serverless auth |
| ProfilePage.tsx | /profile | User profile view/edit |

### Dashboard (P0)
| Current Page | New Page | Description |
|--------------|----------|-------------|
| DashboardPage.tsx | / | Main dashboard |
| ManagerDashboard.tsx | /dashboard/manager | Manager view |
| EmployeeDashboard.tsx | /dashboard/employee | Employee view |
| AdminDashboard.tsx | /dashboard/admin | Admin view |

### Cycles (P0)
| Current Page | New Page | Description |
|--------------|----------|-------------|
| CyclesPage.tsx | /cycles | Cycle list |
| CreateCycle.tsx | /cycles/create | Create new cycle |
| CycleDetailPage.tsx | /cycles/:id | Cycle details |
| CycleSettings.tsx | /cycles/:id/settings | Cycle settings |

### Feedback (P0)
| Current Page | New Page | Description |
|--------------|----------|-------------|
| FeedbackPage.tsx | /feedback | Feedback overview |
| GiveFeedback.tsx | /feedback/give | Give feedback form |
| ReceiveFeedback.tsx | /feedback/received | Received feedback |
| FeedbackDetailPage.tsx | /feedback/:id | Feedback detail |
| TeamFeedbackPage.tsx | /feedback/team | Team feedback (manager) |
| FeedbackHistory.tsx | /feedback/history | Historical feedback |
| PeerReviews.tsx | /feedback/peers | Peer reviews |

### Admin (P1)
| Current Page | New Page | Description |
|--------------|----------|-------------|
| AdminPage.tsx | /admin | Admin overview |
| OrganizationManagement.tsx | /admin/organizations | Org management |
| UserManagement.tsx | /admin/users | User management |
| HierarchyManagement.tsx | /admin/hierarchy | Org hierarchy |
| TemplatesManagement.tsx | /admin/templates | Feedback templates |
| SystemSettings.tsx | /admin/settings | System config |
| IntegrationSettings.tsx | /admin/integrations | Integrations |

### Analytics (P2)
| Current Page | New Page | Description |
|--------------|----------|-------------|
| AnalyticsPage.tsx | /analytics | Analytics dashboard |
| OrganizationInsights.tsx | /analytics/org | Org insights |
| TeamAnalytics.tsx | /analytics/team | Team analytics |
| Reports.tsx | /analytics/reports | Reports |

### Settings (P2)
| Current Page | New Page | Description |
|--------------|----------|-------------|
| SettingsPage.tsx | /settings | User settings |
| NotificationsPage.tsx | /settings/notifications | Notification prefs |

---

## API Services

### Pattern (from premium-fed-sdk)

```typescript
// services/api.ts
import { Ambassador } from '@wix/ambassador';

const coreService = Ambassador.create('feedbackflow-core');
const feedbackService = Ambassador.create('feedbackflow-feedback');
const opsService = Ambassador.create('feedbackflow-ops');

export { coreService, feedbackService, opsService };
```

### Service Files
```
services/
├── api.ts                # Ambassador setup
├── users.service.ts      # User API calls
├── organizations.service.ts
├── hierarchy.service.ts
├── cycles.service.ts
├── feedback.service.ts
├── templates.service.ts
├── notifications.service.ts
└── analytics.service.ts
```

---

## State Management

### Stores (similar to current Zustand stores)
```
stores/
├── authStore.ts          # Current user, auth state
├── cyclesStore.ts        # Cycles list and filters
├── cycleStore.ts         # Single cycle details
├── feedbackStore.ts      # Feedback list and management
├── organizationStore.ts  # Organizations, departments, teams
├── hierarchyStore.ts     # Org hierarchy
├── notificationStore.ts  # Notifications
├── analyticsStore.ts     # Analytics data
└── settingsStore.ts      # User settings
```

---

## Component Mapping (Current -> WDS)

| Current Component | WDS Component |
|-------------------|---------------|
| Button | `<Button>` |
| Input | `<Input>`, `<FormField>` |
| Select | `<Dropdown>` |
| Modal | `<Modal>`, `<CustomModalLayout>` |
| Table | `<Table>`, `<TableToolbar>` |
| Card | `<Card>` |
| Tabs | `<Tabs>` |
| Badge | `<Badge>` |
| Avatar | `<Avatar>` |
| Loading | `<Loader>` |
| Toast | `<Notification>` |
| DatePicker | `<DatePicker>` |

---

## Implementation Tasks

### Setup
- [ ] Generate monorepo structure
- [ ] Setup wix-serverless project
- [ ] Setup yoshi-library React app
- [ ] Configure Ambassador client
- [ ] Setup routing

### Core Components
- [ ] Layout component (header, sidebar, main)
- [ ] Error boundary
- [ ] Loading states
- [ ] Empty states
- [ ] Form components (reusable)

### Pages - P0
- [ ] Dashboard pages (4)
- [ ] Cycles pages (4)
- [ ] Feedback pages (7)

### Pages - P1
- [ ] Admin pages (7)

### Pages - P2
- [ ] Analytics pages (4)
- [ ] Settings pages (2)

### State & Services
- [ ] All API service files
- [ ] All store files
- [ ] Custom hooks

### Testing
- [ ] Unit tests for components
- [ ] Integration tests for pages
- [ ] E2E tests for critical flows

---

## Design Patterns to Follow

### From premium-purchase-platform
- Page layout structure
- Error handling with modals
- Form validation patterns
- Table with pagination
- Search and filter patterns

### From current app
- Feedback form wizard
- Cycle status indicators
- Hierarchy tree visualization
- Dashboard card layout

---

## Dependencies

- Core Service APIs (must be complete)
- Feedback Service APIs (must be complete)
- Operations Service APIs (for notifications/analytics)

## References

- premium-purchase-platform: `/Users/nissano/premium-purchase-platform`
- p3-serve: `/Users/nissano/premium-purchase-platform/serverless/p3-serve`
- p3-backoffice: `/Users/nissano/premium-purchase-platform/packages/p3-backoffice`
- WDS docs: https://www.docs.wixdesignsystem.com/
