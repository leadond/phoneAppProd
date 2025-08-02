# Phone Range Nexus - Repository Rules

## Testing Framework
**Target Framework**: Playwright

This repository uses Playwright for end-to-end testing of the Phone Manager application.

## Application Overview
The Phone Manager is an internal system for managing phone numbers with the following key features:
- Role-based authentication (admin, manager, viewer)
- Dashboard with phone number statistics  
- Phone numbers table and management
- CSV upload functionality
- Reports and audit logging

## Testing Standards
- Use TypeScript for all test files
- Follow Playwright best practices with Page Object Model pattern
- Place E2E tests in `tests/e2e/` directory
- Use stable selectors (data-testid, ARIA roles, or text-based)
- Ensure tests are deterministic and idempotent