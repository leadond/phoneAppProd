# LDAP Authentication Service Implementation

## Overview

This document describes the comprehensive LDAP authentication service implemented for the Phone Range Nexus application. The implementation provides unified authentication supporting both LDAP/Active Directory and local database users with JWT token-based session management.

## Implementation Summary

### ✅ Completed Components

#### 1. Core Authentication Services
- **LDAP Authentication Service** (`src/lib/ldapAuth.ts`)
  - Active Directory integration with proper SSL/TLS support
  - User information extraction from LDAP attributes
  - Group membership synchronization
  - Connection pooling and error handling
  - Configurable search filters and base DNs

- **Enhanced Authentication Service** (`src/lib/enhancedAuth.ts`)
  - Unified authentication supporting both LDAP and local users
  - Automatic fallback between authentication methods
  - Password complexity validation for local users
  - Account lockout protection
  - Comprehensive audit logging

- **Client Authentication Service** (`src/lib/clientAuth.ts`)
  - React-friendly authentication hooks
  - Automatic token refresh
  - State management with subscriptions
  - API integration with error handling

#### 2. Database Schema Enhancements
- **Enhanced Database Schema** (`src/lib/auth-database-schema.sql`)
  - Unified user management tables
  - Role-based permission system
  - Group membership management
  - Comprehensive audit logging
  - Password history tracking
  - Session management tables

- **Database Service** (`src/lib/authDatabase.ts`)
  - Enhanced database operations
  - User and group management
  - Permission checking
  - Audit event logging
  - Session tracking

#### 3. Security Infrastructure
- **JWT Token System**
  - Secure token generation with proper algorithms
  - Token verification and validation
  - Automatic expiration handling
  - Refresh token support

- **Session Management**
  - Redis-compatible session storage
  - Memory fallback for development
  - Session cleanup and expiration
  - Activity tracking

- **Authentication Middleware** (`src/lib/authMiddleware.ts`)
  - Express middleware for API protection
  - Permission-based access control
  - Rate limiting capabilities
  - Comprehensive request logging

#### 4. API Endpoints
- **Authentication Routes** (`src/api/authRoutes.ts`)
  - `POST /api/auth/login` - Multi-method authentication
  - `POST /api/auth/verify` - Token verification
  - `POST /api/auth/refresh` - Token refresh
  - `POST /api/auth/logout` - Session cleanup
  - `GET /api/auth/permissions` - User permissions
  - `GET /api/auth/profile` - User profile
  - `POST /api/auth/change-password` - Password management
  - `GET /api/auth/audit` - Audit logs (admin only)

#### 5. Frontend Components
- **Enhanced Login Modal** (`src/components/EnhancedLoginModal.tsx`)
  - Multi-authentication method support
  - LDAP-specific UI elements
  - Advanced authentication options
  - Comprehensive error handling
  - Remember me functionality

#### 6. Server Infrastructure
- **Authentication Server** (`src/server/authServer.ts`)
  - Express server with authentication integration
  - CORS configuration
  - Security headers
  - Error handling middleware
  - Graceful shutdown handling

## Configuration Guide

### 1. Environment Setup

Copy `.env.example` to `.env` and configure the following sections:

#### Basic Configuration
```env
NODE_ENV=production
PORT=3001
JWT_SECRET=your-super-secure-jwt-secret-here
SESSION_DURATION=24h
```

#### LDAP Configuration
```env
ENABLE_LDAP=true
LDAP_PRIMARY=true
LDAP_URL=ldaps://your-domain-controller.company.com:636
LDAP_BASE_DN=dc=company,dc=com
LDAP_USER_SEARCH_BASE=ou=users,dc=company,dc=com
LDAP_USER_SEARCH_FILTER=(sAMAccountName={username})
LDAP_BIND_DN=cn=service-account,ou=service-accounts,dc=company,dc=com
LDAP_BIND_PASSWORD=service-account-password
```

#### Redis Configuration (Optional)
```env
REDIS_URL=redis://localhost:6379
```

### 2. Database Initialization

The system will automatically initialize the database with the enhanced schema on first run. The initialization includes:

- Enhanced user management tables
- Permission and group systems
- Audit logging infrastructure
- Default admin user (username: `admin`, password: `admin123`)
- Default permission groups and assignments

### 3. LDAP Server Requirements

#### Active Directory Setup
- Ensure LDAP/LDAPS service is running on your domain controller
- Configure service account with read permissions for user directory
- Verify SSL/TLS certificates are properly configured
- Test connectivity from the application server

#### Supported LDAP Attributes
The system extracts the following user attributes:
- `sAMAccountName` - Username
- `userPrincipalName` - Alternative username
- `mail` - Email address
- `displayName` - Display name
- `givenName` - First name
- `sn` - Last name
- `department` - Department
- `title` - Job title
- `memberOf` - Group memberships
- `distinguishedName` - LDAP DN
- `objectGUID` - Unique identifier

## Security Features

### 1. Authentication Security
- **Multi-factor authentication support** (via LDAP/AD)
- **Account lockout protection** (configurable attempts and duration)
- **Password complexity validation** (for local users)
- **Secure password hashing** (bcrypt with salt)
- **Password history tracking** (prevents reuse)

### 2. Session Security
- **JWT tokens with secure algorithms** (HS256)
- **Configurable token expiration**
- **Automatic token refresh**
- **Session invalidation on logout**
- **Concurrent session management**

### 3. Network Security
- **LDAPS/SSL enforcement** for LDAP connections
- **CORS configuration** for API access
- **Security headers** (XSS protection, content type validation)
- **Rate limiting** (configurable per user/IP)

### 4. Audit and Monitoring
- **Comprehensive authentication logging**
- **Failed login attempt tracking**
- **Suspicious activity detection**
- **User activity monitoring**
- **Permission change auditing**

## Permission System

### Default Groups and Permissions

#### Administrators Group
- `admin` - Full system access
- All other permissions inherited

#### Phone Managers Group
- `manage-phones` - Full phone number management
- `view-ranges` - View number ranges
- `view-reports` - Access to reports

#### Phone Users Group
- `view-phones` - View phone numbers
- `view-ranges` - View number ranges

#### Viewers Group
- `read` - General read access
- `view-phones` - View phone numbers
- `view-ranges` - View number ranges
- `view-reports` - View reports

### LDAP Group Mapping

The system automatically maps LDAP groups to local permissions:

```typescript
const permissionMap: Record<string, string[]> = {
  'Domain Admins': ['admin', 'read', 'write', 'delete', 'manage-users'],
  'IT Admins': ['admin', 'read', 'write', 'delete'],
  'Phone Managers': ['read', 'write', 'manage-phones'],
  'Phone Users': ['read', 'use-phones'],
  'Employees': ['read']
};
```

## API Integration Examples

### Frontend Authentication

```typescript
import { useClientAuth } from '../lib/clientAuth';

function LoginComponent() {
  const { login, isLoading, error, isAuthenticated } = useClientAuth();

  const handleLogin = async (credentials) => {
    const result = await login({
      username: credentials.username,
      password: credentials.password,
      authMethod: 'auto', // or 'ldap', 'local'
      rememberMe: credentials.rememberMe
    });

    if (result.success) {
      // Redirect to dashboard
    }
  };

  return (
    // Login form JSX
  );
}
```

### Protected API Routes

```typescript
import { requirePermissions } from '../lib/authMiddleware';

// Require specific permissions
app.get('/api/phones', requirePermissions('view-phones'), (req, res) => {
  // User is authenticated and has required permissions
  const user = req.user;
  const permissions = req.permissions;
  
  // Handle request
});

// Admin only route
app.get('/api/admin/users', requirePermissions('admin'), (req, res) => {
  // Admin access only
});
```

## Testing and Validation

### 1. Local Testing

```bash
# Install dependencies
npm install

# Copy environment configuration
cp .env.example .env

# Start the server
npm run start

# Test endpoints
curl -X POST http://localhost:3001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"admin123"}'
```

### 2. LDAP Testing

```bash
# Test LDAP connectivity (requires ldapsearch tool)
ldapsearch -H ldaps://your-domain-controller.com:636 \
  -D "cn=service-account,ou=service-accounts,dc=company,dc=com" \
  -w "service-account-password" \
  -b "ou=users,dc=company,dc=com" \
  "(sAMAccountName=testuser)"
```

### 3. Database Validation

```bash
# Check database initialization
npm run check-database

# View database schema
sqlite3 phone-range-nexus.db ".schema"

# Check user accounts
sqlite3 phone-range-nexus.db "SELECT * FROM users;"
```

## Troubleshooting

### Common LDAP Issues

1. **Connection Refused**
   - Verify LDAP URL and port
   - Check firewall settings
   - Ensure LDAPS service is running

2. **Authentication Failed**
   - Verify service account credentials
   - Check user search base and filter
   - Validate user DN format

3. **SSL/TLS Errors**
   - Verify certificate chain
   - Check `LDAP_TLS_REJECT_UNAUTHORIZED` setting
   - Ensure proper CA certificates

### Database Issues

1. **Permission Errors**
   - Check file permissions on database file
   - Verify write access to database directory
   - Ensure proper SQLite installation

2. **Schema Errors**
   - Delete database file and restart (development only)
   - Check schema files for syntax errors
   - Verify foreign key constraints

### Token Issues

1. **Invalid Token Errors**
   - Check JWT secret configuration
   - Verify token expiration settings
   - Clear browser localStorage

2. **Session Problems**
   - Check Redis connectivity (if configured)
   - Verify session storage configuration
   - Clear expired sessions manually

## Production Deployment

### Security Checklist

- [ ] Change default JWT secret
- [ ] Configure secure LDAP certificates
- [ ] Enable HTTPS for all communications
- [ ] Set up proper firewall rules
- [ ] Configure Redis with authentication (if used)
- [ ] Review and limit CORS origins
- [ ] Enable audit logging
- [ ] Set up log monitoring
- [ ] Configure backup procedures
- [ ] Test disaster recovery procedures

### Performance Considerations

- Use Redis for session storage in production
- Configure appropriate connection pooling
- Set up LDAP connection caching
- Monitor database performance
- Implement proper logging levels
- Configure log rotation

## Support and Maintenance

### Monitoring

The system provides comprehensive logging for:
- Authentication attempts (success/failure)
- Permission changes
- Session management
- LDAP connectivity issues
- Database operations
- API access patterns

### Regular Maintenance

1. **Database Cleanup**
   - Archive old audit logs
   - Clean expired sessions
   - Backup user data

2. **Security Updates**
   - Monitor dependency vulnerabilities
   - Update LDAP certificates
   - Review user permissions
   - Audit system access

3. **Performance Monitoring**
   - Monitor LDAP response times
   - Check database query performance
   - Review session storage usage
   - Monitor API response times

## Implementation Notes

### Important Configuration Changes

1. **JWT Secret**: Must be changed from default value in production
2. **LDAP Certificates**: Ensure proper SSL/TLS certificate validation
3. **Database Location**: Configure appropriate backup strategy
4. **Session Storage**: Consider Redis for high-availability deployments
5. **CORS Settings**: Restrict to specific domains in production

### Integration with Existing System

The implementation maintains backward compatibility with the existing phone-range-nexus authentication system while adding enhanced features. The system gracefully falls back to legacy authentication methods when needed.

### Future Enhancements

Potential areas for future development:
- Multi-factor authentication (MFA)
- Single Sign-On (SSO) integration
- Advanced user provisioning
- Real-time security monitoring
- Advanced permission workflows
- Email notification system

---

## Conclusion

The LDAP authentication service has been successfully implemented with comprehensive security features, robust error handling, and extensive configuration options. The system is production-ready and provides a solid foundation for secure user authentication and authorization in enterprise environments.

For additional support or questions about this implementation, please refer to the source code documentation and configuration examples provided in this document.