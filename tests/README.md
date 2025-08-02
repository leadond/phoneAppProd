# E2E Testing with Playwright

This directory contains end-to-end tests for the Phone Manager application using Playwright.

## Test Structure

- **`auth-login.spec.ts`** - Authentication and login flow tests
- **`dashboard.spec.ts`** - Dashboard functionality and statistics
- **`navigation.spec.ts`** - Application navigation and sidebar tests  
- **`phone-numbers.spec.ts`** - Phone numbers management and search functionality
- **`end-to-end-workflow.spec.ts`** - Complete user workflows for different roles

## Running Tests

```bash
# Run all tests
npm run test:e2e

# Run tests with UI
npm run test:e2e:ui

# Show test report
npm run test:e2e:report

# Run specific test file
npx playwright test tests/e2e/auth-login.spec.ts

# Run tests in specific browser
npx playwright test --project=chromium
```

## Test Coverage

The test suite covers:

### Authentication
- Login with different roles (admin, manager, viewer)
- Logout functionality
- Role-based access verification

### Dashboard
- Statistics display
- Recent activity section
- Quick actions (buttons present, functionality coming soon)
- User information persistence

### Navigation
- Sidebar navigation between sections
- Active state management
- Cross-section header/sidebar persistence

### Phone Numbers Management
- Table display and data
- Search functionality (by number, extension, assignee)
- Status filtering
- Edit/Release button presence

### End-to-End Workflows
- Complete admin workflow
- Manager role limitations
- Viewer role access
- Session state management
- Page refresh behavior

## Configuration

Tests are configured to:
- Run against `http://localhost:8080`
- Auto-start dev server before tests
- Run on Chromium, Firefox, and WebKit browsers
- Use TypeScript for type safety
- Follow Playwright best practices

## Best Practices Implemented

- Stable selectors using roles and text content
- Proper waiting strategies (no hard waits)
- Role-based test organization
- Cross-browser compatibility
- Deterministic and idempotent tests