# End-to-End Tests for FeedbackFlow

This directory contains comprehensive end-to-end tests for the FeedbackFlow application using Playwright.

## 🧪 Test Coverage

### Authentication Flow (`auth.spec.ts`)
- ✅ Login form validation
- ✅ Successful authentication
- ✅ Error handling for invalid credentials
- ✅ Password visibility toggle
- ✅ Authentication state persistence
- ✅ Logout functionality
- ✅ Redirect behavior for unauthenticated users

### Organization Management (`organization.spec.ts`)
- ✅ Organization list display
- ✅ Organization statistics
- ✅ Create new organization
- ✅ Edit existing organization
- ✅ Delete organization with confirmation
- ✅ Search and filter functionality
- ✅ Pagination
- ✅ Bulk operations
- ✅ Import/Export functionality
- ✅ Organization chart visualization

### Admin Dashboard (`admin-dashboard.spec.ts`)
- ✅ Dashboard layout and navigation
- ✅ Tab navigation (Overview, Organizations, Settings)
- ✅ Statistics display
- ✅ Quick actions
- ✅ Responsive design
- ✅ Loading states
- ✅ Error handling
- ✅ Keyboard navigation
- ✅ State persistence

### API Integration (`api-integration.spec.ts`)
- ✅ Authentication token handling
- ✅ API response handling
- ✅ Error response handling (401, 403, 500)
- ✅ Network timeout handling
- ✅ Rate limiting
- ✅ Pagination
- ✅ Search functionality
- ✅ Request headers validation
- ✅ Malformed response handling

## 🚀 Running Tests

### Prerequisites

1. **Start the application services:**
   ```bash
   # Terminal 1: Start backend
   cd backend
   node dist/simple-server.js
   
   # Terminal 2: Start frontend
   cd frontend
   npm run dev
   ```

2. **Verify services are running:**
   - Frontend: http://localhost:3003
   - Backend: http://localhost:5000

### Quick Start

Use the test runner script for easy test execution:

```bash
cd frontend/e2e
./test-runner.sh help
```

### Test Commands

#### Run All Tests
```bash
# Using test runner
./test-runner.sh all

# Using npm directly
npm run test:e2e
```

#### Run Specific Test Suites
```bash
# Authentication tests
./test-runner.sh auth

# Organization management tests
./test-runner.sh organization

# Admin dashboard tests
./test-runner.sh dashboard

# API integration tests
./test-runner.sh api
```

#### Run Specific Test File
```bash
# Run specific test file
./test-runner.sh file auth.spec.ts
```

#### Debug Mode
```bash
# Run tests in debug mode (pauses on failures)
./test-runner.sh debug

# Run tests with visible browser
./test-runner.sh headed

# Run tests with Playwright UI
./test-runner.sh ui
```

#### View Test Results
```bash
# Show test report
./test-runner.sh report
```

### Direct NPM Commands

```bash
# Run all tests
npm run test:e2e

# Run tests in headed mode (visible browser)
npm run test:e2e:headed

# Run tests in debug mode
npm run test:e2e:debug

# Run tests with UI
npm run test:e2e:ui

# Show test report
npm run test:e2e:report
```

## 🔧 Test Configuration

### Playwright Configuration (`playwright.config.ts`)

- **Base URL**: http://localhost:3003
- **Browsers**: Chromium, Firefox, WebKit
- **Mobile Testing**: Mobile Chrome, Mobile Safari
- **Retries**: 2 retries on CI, 0 locally
- **Screenshots**: On failure
- **Videos**: Retained on failure
- **Traces**: On first retry

### Test Environment

- **Frontend**: React + TypeScript + Vite
- **Backend**: Node.js + Express (simple server)
- **Testing**: Playwright
- **Mock Data**: Built-in mock responses

## 📊 Test Data

The tests use mock data provided by the simple backend server:

### Mock User
- **Email**: admin@example.com
- **Password**: password
- **Role**: Admin
- **Permissions**: admin:all

### Mock Organization
- **Name**: Test Organization
- **Slug**: test-org
- **Email**: test@example.com
- **Status**: Active
- **Plan**: Basic

## 🐛 Debugging Tests

### Common Issues

1. **Services not running:**
   ```bash
   ./test-runner.sh check
   ```

2. **Port conflicts:**
   - Frontend should run on port 3003
   - Backend should run on port 5000

3. **Authentication failures:**
   - Check if backend auth endpoints are working
   - Verify mock user credentials

### Debug Mode

Run tests in debug mode to step through failures:

```bash
./test-runner.sh debug
```

This will:
- Open browser in headed mode
- Pause on test failures
- Allow you to inspect the page state
- Provide step-by-step debugging

### Test Reports

After running tests, view the detailed report:

```bash
./test-runner.sh report
```

The report includes:
- Test results summary
- Screenshots of failures
- Video recordings
- Trace files for debugging

## 🔄 Continuous Integration

### GitHub Actions Example

```yaml
name: E2E Tests
on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '18'
      
      - name: Install dependencies
        run: |
          cd frontend && npm install
          cd ../backend && npm install
      
      - name: Build backend
        run: cd backend && npm run build
      
      - name: Start backend
        run: cd backend && node dist/simple-server.js &
      
      - name: Start frontend
        run: cd frontend && npm run dev &
      
      - name: Wait for services
        run: |
          sleep 10
          curl -f http://localhost:5000/api/v1/health
          curl -f http://localhost:3003
      
      - name: Run E2E tests
        run: cd frontend && npm run test:e2e
      
      - name: Upload test results
        uses: actions/upload-artifact@v3
        if: always()
        with:
          name: playwright-report
          path: frontend/playwright-report/
```

## 📝 Writing New Tests

### Test Structure

```typescript
import { test, expect } from '@playwright/test';

test.describe('Feature Name', () => {
  test.beforeEach(async ({ page }) => {
    // Setup code (e.g., login)
  });

  test('should do something', async ({ page }) => {
    // Test implementation
  });
});
```

### Best Practices

1. **Use data-testid attributes** for reliable element selection
2. **Mock API responses** when testing specific scenarios
3. **Clean up state** between tests
4. **Use meaningful test descriptions**
5. **Group related tests** in describe blocks
6. **Handle async operations** properly with await

### Example Test

```typescript
test('should create new organization', async ({ page }) => {
  // Navigate to organizations
  await page.click('text=Organizations');
  
  // Click create button
  await page.click('button:has-text("Create Organization")');
  
  // Fill form
  await page.fill('input[name="name"]', 'New Organization');
  await page.fill('input[name="contactEmail"]', 'new@example.com');
  
  // Submit
  await page.click('button:has-text("Save")');
  
  // Verify success
  await expect(page.locator('text=Organization created successfully')).toBeVisible();
  await expect(page.locator('text=New Organization')).toBeVisible();
});
```

## 🎯 Test Coverage Goals

- [x] Authentication flow (100%)
- [x] Organization CRUD operations (100%)
- [x] Admin dashboard functionality (100%)
- [x] API integration (100%)
- [ ] User management (planned)
- [ ] Feedback cycles (planned)
- [ ] Analytics and reporting (planned)
- [ ] Integration settings (planned)

## 📞 Support

If you encounter issues with the E2E tests:

1. Check the [Playwright documentation](https://playwright.dev/)
2. Review test logs and screenshots
3. Use debug mode to step through failures
4. Verify that all services are running correctly

## 🔄 Maintenance

### Regular Tasks

1. **Update test data** when mock responses change
2. **Review test coverage** for new features
3. **Update selectors** when UI changes
4. **Clean up old test reports**
5. **Update browser versions** periodically

### Test Maintenance Commands

```bash
# Update Playwright browsers
npx playwright install

# Update dependencies
npm update @playwright/test

# Clean test artifacts
rm -rf playwright-report test-results
```
