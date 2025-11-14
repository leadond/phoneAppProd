# WARP.md

This file provides guidance to WARP (warp.dev) when working with code in this repository.

## Project Overview

Phone Range Nexus is an enterprise-grade phone number management system designed for corporate environments behind firewalls. It operates completely offline with a local SQLite database, supporting multi-user access, PBX integrations, and comprehensive audit logging.

**Tech Stack:**
- Frontend: React 18.3, TypeScript, Vite, Tailwind CSS, Shadcn UI
- Backend: Express.js, Node.js
- Database: SQLite (better-sqlite3) for server, IndexedDB for browser
- Authentication: Local auth + LDAP/AD integration + JWT
- Testing: Playwright E2E

## Common Commands

### Development
```bash
npm run dev                    # Start development server (localhost:5173)
npm run dev -- --host 0.0.0.0  # Dev server accessible on network
npm run dev -- --port 3000     # Use different port
```

### Building
```bash
npm run build                  # Production build
npm run build:dev              # Development build
npm run build:prod             # Production build with optimizations
npm run preview                # Preview production build
```

### Code Quality
```bash
npm run lint                   # Run ESLint
npm run lint:fix               # Auto-fix ESLint issues
```

### Testing
```bash
npm run test:e2e               # Run Playwright E2E tests
npm run test:e2e:ui            # Interactive test UI
npm run test:e2e:report        # View test report
```

### Security & Maintenance
```bash
npm run security:audit         # Check for vulnerabilities
npm run security:fix           # Auto-fix vulnerabilities
npm run security:headers       # Test security headers (requires running server)
```

### Database Operations
```bash
npm run migrate                # Run database migrations
npm run backup                 # Backup database (runs scripts/backup-database.sh)
npm run maintenance            # Run maintenance tasks
```

### Deployment
```bash
npm start                      # Start production server (Node.js)
npm run start:production       # Start with NODE_ENV=production
npm run build:production       # Lint, audit, and build for production
npm run deploy                 # Run deployment script
```

### Utilities
```bash
npm run clean                  # Remove dist and vite cache
npm run clean:all              # Remove all generated files and reinstall
```

## Architecture Overview

### Dual Database Strategy

This application uses **two database implementations** depending on the runtime environment:

1. **Server-side (Node.js)**: SQLite via `better-sqlite3`
   - Located in: `src/lib/localDatabase.ts`
   - Database file: `phone-range-nexus.db` (root directory)
   - Used by: Express server, backend operations
   
2. **Client-side (Browser)**: IndexedDB
   - Located in: `src/lib/browserDatabase.ts`
   - Used by: React components, frontend operations
   - Provides offline capability

**Important:** When modifying database operations, consider which environment the code runs in. The `dataService.ts` abstracts these differences and should be used for most operations.

### Key Directories

```
src/
├── api/                    # API route handlers
├── components/             # React components (23 major components)
│   ├── SystemSetup/        # System configuration components
│   └── uc/                 # Unified Communications components
├── hooks/                  # React custom hooks
├── lib/                    # Core libraries and utilities
│   ├── localDatabase.ts    # SQLite operations (server-side)
│   ├── browserDatabase.ts  # IndexedDB operations (browser-side)
│   ├── localAuth.ts        # Local authentication
│   ├── ldapAuth.ts         # LDAP/AD authentication
│   ├── enhancedAuth.ts     # Unified auth layer
│   └── *-schema.sql        # Database schemas
├── pages/                  # Page components
├── routes/                 # Client-side routing
├── server/                 # Server-side utilities
├── services/               # Business logic layer
│   └── dataService.ts      # Main data abstraction layer
└── styles/                 # Global styles

scripts/                    # Deployment and maintenance scripts
tests/                      # Playwright E2E tests
```

### Authentication Flow

The application supports multiple authentication methods:

1. **Local Authentication**: Default admin/admin123 credentials
2. **LDAP/Active Directory**: Corporate directory integration
3. **JWT Tokens**: Session management

Authentication is handled through a layered approach:
- `enhancedAuth.ts` → Unified auth interface
- `localAuth.ts` → Local user/password auth
- `ldapAuth.ts` → LDAP/AD integration
- `clientAuth.ts` → React hooks for components

### Data Service Layer

**Always use `dataService.ts` for data operations.** This service abstracts database differences and provides consistent interfaces:

- `getPhoneNumbers()`, `addPhoneNumber()`, `updatePhoneNumber()`, `deletePhoneNumber()`
- `getBulkOperations()`, `bulkImportPhoneNumbers()`, `bulkReserveNumbers()`
- `getNumberRanges()`, `addNumberRange()`, `updateNumberRange()`
- `getAuditLog()`, `addAuditEntry()`
- `getPBXSystems()`, `addPBXSystem()`, `updatePBXSystem()`

### PBX/UC System Integration

The application integrates with multiple PBX/UC platforms:
- Microsoft Teams
- Skype for Business
- Cisco CUCM
- Genesys Cloud
- Avaya Aura
- RightFax
- Custom APIs

Each system supports multiple authentication types (OAuth 2.0, API Key, Basic Auth, Certificate).

Configuration components:
- `PBXSyncManager.tsx` - General PBX sync management
- `SkypeForBusinessManager.tsx` - SfB-specific operations
- `uc/` components - Unified Communications tools

## Development Guidelines

### Database Changes

When modifying the database schema:

1. Update the appropriate schema file:
   - `local-database-schema.sql` - Core tables
   - `uc-database-schema.sql` - UC Admin Tools tables
   - `sfb-database-schema.sql` - Skype for Business tables
   - `auth-database-schema.sql` - Authentication tables

2. Update both implementations if needed:
   - `localDatabase.ts` (SQLite/server-side)
   - `browserDatabase.ts` (IndexedDB/browser-side)

3. Update `dataService.ts` to reflect new operations

4. Run migrations: `npm run migrate`

### Adding New Phone Number Fields

1. Add to TypeScript interface in `services/dataService.ts`:
   ```typescript
   export interface PhoneNumber {
     // ... existing fields
     newField: string;
   }
   ```

2. Update database schema in `local-database-schema.sql`

3. Add to CRUD operations in `localDatabase.ts` and `browserDatabase.ts`

4. Update UI components that display/edit phone numbers

### Authentication Integration

To add a new authentication provider:

1. Create provider file in `src/lib/` (e.g., `samlAuth.ts`)
2. Implement authentication interface matching `localAuth.ts` pattern
3. Add to `enhancedAuth.ts` authentication chain
4. Update `.env.example` with configuration variables
5. Add UI components in `components/SystemSetup/` if needed

### Testing New Features

Write E2E tests in `tests/` directory:

```bash
# Create new test file
touch tests/my-feature.spec.ts

# Run specific test
npx playwright test tests/my-feature.spec.ts

# Run with UI
npm run test:e2e:ui
```

### Security Considerations

- All sensitive credentials must be stored encrypted using `encryptionService.ts`
- Never commit `.env` files (only `.env.example`)
- Always use parameterized queries to prevent SQL injection
- Validate and sanitize all user inputs
- Use `authMiddleware.ts` for protecting API routes
- Test security headers after changes: `npm run security:headers`

### Performance Optimization

- Database uses 40+ indexes defined in schema files
- Use pagination for large datasets (built into `dataService`)
- Bulk operations use transactions for atomicity
- Vite build config includes code splitting and chunking
- Static assets are fingerprinted for cache optimization

## Environment Configuration

The application uses different configurations per environment:

- `.env` - Local development (git-ignored)
- `.env.example` - Template with all variables
- `.env.production` - Production settings template

Key environment variables:
```bash
NODE_ENV=development|production
PORT=3001
DATABASE_PATH=./phone-range-nexus.db
JWT_SECRET=your-secret-key
ENABLE_LDAP=true|false
LDAP_URL=ldaps://your-domain-controller
```

## Deployment

See `DEPLOYMENT-GUIDE.md` for comprehensive deployment instructions.

Quick production deployment:
```bash
npm run build:production  # Lint, audit, build
npm run deploy            # Deploy to server
```

The application requires:
- Node.js 18+
- SQLite support
- HTTPS/SSL certificate
- Web server (Nginx/Apache recommended)

## Troubleshooting

### Database Issues

If database is not initializing:
```bash
# Check database structure
node check-database-structure.js

# Manual table creation
node create-tables-manual.js

# Test database connection
node test-database.js
```

### Authentication Problems

Default credentials: `admin` / `admin123`

Check:
1. User exists in `user_sessions` table
2. Session not expired
3. JWT_SECRET is set in environment
4. LDAP configuration if enabled

### Port Conflicts

Change dev server port:
```bash
npm run dev -- --port 3000
```

For production, set PORT environment variable.

### Build Errors

Clear cache and rebuild:
```bash
npm run clean:all
npm install
npm run build
```

## API Design Patterns

When adding new API endpoints:

1. Create route handler in `src/api/`
2. Add route to Express server in `server.js`
3. Use `authMiddleware.ts` for protected routes
4. Apply appropriate rate limiting (see `server.js` examples)
5. Return consistent JSON responses
6. Log all operations to audit log

Example endpoint structure:
```typescript
router.post('/api/resource', authMiddleware, async (req, res) => {
  try {
    // Validate input
    // Perform operation
    // Log to audit
    // Return response
    res.json({ success: true, data });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});
```

## Component Patterns

Major components follow these patterns:

1. **Table Components** (e.g., `EnhancedPhoneNumbersTable`)
   - Use `dataService` for data fetching
   - Implement pagination
   - Include filtering and search
   - Use Shadcn UI components

2. **Manager Components** (e.g., `NumberRangeManager`)
   - Modal-based dialogs
   - Form validation with React Hook Form
   - Optimistic UI updates
   - Error boundaries

3. **Dashboard Components** (e.g., `AnalyticsDashboard`)
   - Real-time data updates
   - Recharts for visualizations
   - Responsive layouts

## Code Style

- TypeScript strict mode enabled
- ESLint configured (extends recommended)
- React hooks linting enabled
- Unused vars linting disabled (configured in `eslint.config.js`)
- Use Tailwind CSS for styling
- Component naming: PascalCase
- File naming: PascalCase for components, camelCase for utilities
