import express, { Request, Response } from 'express';
import { enhancedAuth } from '../lib/enhancedAuth';
import { authDatabase } from '../lib/authDatabase';
import { authMiddleware, requireAuth, requirePermissions } from '../lib/authMiddleware';
import { ldapAuth } from '../lib/ldapAuth';

const router = express.Router();

// Helper function to extract client info
const getClientInfo = (req: Request) => {
  return {
    ip: req.ip || req.connection.remoteAddress || 'unknown',
    userAgent: req.get('User-Agent') || 'unknown',
    deviceInfo: {
      isMobile: /Mobile|Android|iPhone|iPad/.test(req.get('User-Agent') || ''),
      isBrowser: /Mozilla/.test(req.get('User-Agent') || ''),
      userAgent: req.get('User-Agent') || 'unknown'
    }
  };
};

// POST /api/auth/login - Main authentication endpoint
router.post('/login', async (req: Request, res: Response) => {
  try {
    const { username, password, authMethod, rememberMe } = req.body;

    // Validate input
    if (!username || !password) {
      return res.status(400).json({
        success: false,
        error: 'Username and password are required',
        code: 'MISSING_CREDENTIALS'
      });
    }

    // Get client information
    const clientInfo = getClientInfo(req);

    // Log authentication attempt
    authDatabase.logAuthEvent({
      username,
      event_type: 'login_attempt',
      auth_method: authMethod || 'auto',
      ip_address: clientInfo.ip,
      user_agent: clientInfo.userAgent,
      device_info: JSON.stringify(clientInfo.deviceInfo),
      success: false, // Will be updated if successful
      details: JSON.stringify({ 
        method: authMethod || 'auto',
        rememberMe: !!rememberMe,
        timestamp: new Date().toISOString()
      })
    });

    // Attempt authentication
    const result = await enhancedAuth.signIn(username, password);

    if (result.success && result.user && result.session) {
      // Set secure cookie with session token
      const cookieOptions = {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict' as const,
        maxAge: rememberMe ? 30 * 24 * 60 * 60 * 1000 : 24 * 60 * 60 * 1000 // 30 days or 1 day
      };

      res.cookie('auth_token', result.session.token, cookieOptions);

      // Return success response
      res.json({
        success: true,
        user: {
          id: result.user.id,
          username: result.user.username,
          email: result.user.email,
          displayName: result.user.displayName,
          department: result.user.department,
          authType: result.user.authType,
          permissions: result.session.permissions,
          groups: result.session.groups,
          lastLogin: result.user.lastLogin
        },
        session: {
          sessionId: result.session.sessionId,
          expiresAt: result.session.expiresAt.toISOString(),
          permissions: result.session.permissions,
          groups: result.session.groups
        },
        token: result.session.token
      });
    } else {
      // Authentication failed
      res.status(401).json({
        success: false,
        error: result.error || 'Authentication failed',
        reason: result.reason,
        code: 'AUTH_FAILED'
      });
    }
  } catch (error) {
    console.error('Login endpoint error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      code: 'INTERNAL_ERROR'
    });
  }
});

// POST /api/auth/verify - Token verification endpoint
router.post('/verify', async (req: Request, res: Response) => {
  try {
    const { token } = req.body;
    const tokenToVerify = token || req.cookies.auth_token || req.headers.authorization?.replace('Bearer ', '');

    if (!tokenToVerify) {
      return res.status(401).json({
        success: false,
        error: 'No token provided',
        code: 'NO_TOKEN'
      });
    }

    // Verify token
    const user = await enhancedAuth.verifySession(tokenToVerify);

    if (user) {
      // Get current permissions and groups
      const permissions = authDatabase.getUserPermissions(user.id);
      const groups = authDatabase.getUserGroups(user.id);

      res.json({
        success: true,
        user: {
          id: user.id,
          username: user.username,
          email: user.email,
          displayName: user.displayName,
          department: user.department,
          authType: user.authType,
          permissions: permissions.map(p => p.name),
          groups: groups.map(g => g.name),
          lastLogin: user.lastLogin
        },
        valid: true
      });
    } else {
      res.status(401).json({
        success: false,
        error: 'Invalid or expired token',
        code: 'INVALID_TOKEN',
        valid: false
      });
    }
  } catch (error) {
    console.error('Token verification error:', error);
    res.status(500).json({
      success: false,
      error: 'Token verification failed',
      code: 'VERIFICATION_ERROR'
    });
  }
});

// POST /api/auth/refresh - Token refresh endpoint
router.post('/refresh', requireAuth(), async (req: Request, res: Response) => {
  try {
    const success = await enhancedAuth.refreshSession();

    if (success) {
      const user = enhancedAuth.getCurrentUser();
      const token = enhancedAuth.getSessionToken();

      if (user && token) {
        // Update cookie with new token
        const cookieOptions = {
          httpOnly: true,
          secure: process.env.NODE_ENV === 'production',
          sameSite: 'strict' as const,
          maxAge: 24 * 60 * 60 * 1000 // 1 day
        };

        res.cookie('auth_token', token, cookieOptions);

        res.json({
          success: true,
          token,
          expiresAt: user.sessionExpires,
          user: {
            id: user.id,
            username: user.username,
            email: user.email,
            displayName: user.displayName
          }
        });
      } else {
        res.status(401).json({
          success: false,
          error: 'Session refresh failed',
          code: 'REFRESH_FAILED'
        });
      }
    } else {
      res.status(401).json({
        success: false,
        error: 'Unable to refresh session',
        code: 'REFRESH_FAILED'
      });
    }
  } catch (error) {
    console.error('Token refresh error:', error);
    res.status(500).json({
      success: false,
      error: 'Token refresh failed',
      code: 'REFRESH_ERROR'
    });
  }
});

// POST /api/auth/logout - Session cleanup endpoint
router.post('/logout', requireAuth(), async (req: Request, res: Response) => {
  try {
    // Get current user info for logging
    const user = req.user;
    const sessionId = req.session?.sessionId;

    // Sign out from enhanced auth service
    await enhancedAuth.signOut();

    // Clear auth cookie
    res.clearCookie('auth_token');

    // Log successful logout
    if (user && sessionId) {
      authDatabase.logAuthEvent({
        user_id: user.id,
        username: user.username,
        event_type: 'logout',
        auth_method: user.auth_type,
        ip_address: getClientInfo(req).ip,
        user_agent: getClientInfo(req).userAgent,
        success: true,
        session_id: sessionId,
        details: JSON.stringify({ 
          method: 'api_logout',
          timestamp: new Date().toISOString()
        })
      });
    }

    res.json({
      success: true,
      message: 'Logged out successfully'
    });
  } catch (error) {
    console.error('Logout error:', error);
    res.status(500).json({
      success: false,
      error: 'Logout failed',
      code: 'LOGOUT_ERROR'
    });
  }
});

// GET /api/auth/permissions - User permissions endpoint
router.get('/permissions', requireAuth(), async (req: Request, res: Response) => {
  try {
    const user = req.user;
    
    if (!user) {
      return res.status(401).json({
        success: false,
        error: 'User not authenticated',
        code: 'NOT_AUTHENTICATED'
      });
    }

    // Get user permissions and groups
    const permissions = authDatabase.getUserPermissions(user.id);
    const groups = authDatabase.getUserGroups(user.id);

    res.json({
      success: true,
      permissions: permissions.map(p => ({
        name: p.name,
        description: p.description,
        category: p.category,
        resource: p.resource,
        action: p.action
      })),
      groups: groups.map(g => ({
        name: g.name,
        description: g.description,
        type: g.group_type
      })),
      user: {
        id: user.id,
        username: user.username,
        authType: user.auth_type
      }
    });
  } catch (error) {
    console.error('Permissions endpoint error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve permissions',
      code: 'PERMISSIONS_ERROR'
    });
  }
});

// GET /api/auth/profile - User profile endpoint
router.get('/profile', requireAuth(), async (req: Request, res: Response) => {
  try {
    const user = req.user;
    
    if (!user) {
      return res.status(401).json({
        success: false,
        error: 'User not authenticated',
        code: 'NOT_AUTHENTICATED'
      });
    }

    // Get detailed user information
    const permissions = authDatabase.getUserPermissions(user.id);
    const groups = authDatabase.getUserGroups(user.id);
    const recentEvents = authDatabase.getAuthEvents(10, user.id);

    res.json({
      success: true,
      profile: {
        id: user.id,
        username: user.username,
        email: user.email,
        displayName: user.display_name,
        firstName: user.first_name,
        lastName: user.last_name,
        department: user.department,
        title: user.title,
        authType: user.auth_type,
        lastLogin: user.last_login,
        createdAt: user.created_at,
        isActive: user.is_active,
        isVerified: user.is_verified
      },
      permissions: permissions.map(p => p.name),
      groups: groups.map(g => g.name),
      recentActivity: recentEvents.map(event => ({
        type: event.event_type,
        timestamp: event.created_at,
        success: event.success,
        ipAddress: event.ip_address
      }))
    });
  } catch (error) {
    console.error('Profile endpoint error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve profile',
      code: 'PROFILE_ERROR'
    });
  }
});

// POST /api/auth/change-password - Password change endpoint (local users only)
router.post('/change-password', requireAuth(), async (req: Request, res: Response) => {
  try {
    const user = req.user;
    const { currentPassword, newPassword } = req.body;

    if (!user) {
      return res.status(401).json({
        success: false,
        error: 'User not authenticated',
        code: 'NOT_AUTHENTICATED'
      });
    }

    if (user.auth_type !== 'local') {
      return res.status(400).json({
        success: false,
        error: 'Password change not available for LDAP users',
        code: 'LDAP_USER'
      });
    }

    if (!currentPassword || !newPassword) {
      return res.status(400).json({
        success: false,
        error: 'Current and new passwords are required',
        code: 'MISSING_PASSWORDS'
      });
    }

    if (newPassword.length < 8) {
      return res.status(400).json({
        success: false,
        error: 'New password must be at least 8 characters long',
        code: 'PASSWORD_TOO_SHORT'
      });
    }

    // Verify current password
    const bcrypt = require('bcrypt');
    const isCurrentValid = await bcrypt.compare(currentPassword, user.password_hash);
    
    if (!isCurrentValid) {
      // Log failed attempt
      authDatabase.logAuthEvent({
        user_id: user.id,
        username: user.username,
        event_type: 'password_change',
        auth_method: 'local',
        ip_address: getClientInfo(req).ip,
        success: false,
        failure_reason: 'invalid_current_password'
      });

      return res.status(400).json({
        success: false,
        error: 'Current password is incorrect',
        code: 'INVALID_CURRENT_PASSWORD'
      });
    }

    // Hash new password
    const newPasswordHash = await bcrypt.hash(newPassword, 12);

    // Update password in database
    authDatabase.updatePassword(user.id, newPasswordHash);

    // Log successful password change
    authDatabase.logAuthEvent({
      user_id: user.id,
      username: user.username,
      event_type: 'password_change',
      auth_method: 'local',
      ip_address: getClientInfo(req).ip,
      success: true,
      details: JSON.stringify({ 
        timestamp: new Date().toISOString()
      })
    });

    res.json({
      success: true,
      message: 'Password changed successfully'
    });
  } catch (error) {
    console.error('Password change error:', error);
    res.status(500).json({
      success: false,
      error: 'Password change failed',
      code: 'PASSWORD_CHANGE_ERROR'
    });
  }
});

// GET /api/auth/audit - Audit log endpoint (admin only)
router.get('/audit', requirePermissions('admin', 'view-audit'), async (req: Request, res: Response) => {
  try {
    const { limit = 100, userId, eventType } = req.query;
    
    let events;
    if (userId) {
      events = authDatabase.getAuthEvents(Number(limit), userId as string);
    } else {
      events = authDatabase.getAuthEvents(Number(limit));
    }

    // Filter by event type if specified
    if (eventType) {
      events = events.filter(event => event.event_type === eventType);
    }

    res.json({
      success: true,
      events: events.map(event => ({
        id: event.id,
        userId: event.user_id,
        username: event.username,
        eventType: event.event_type,
        authMethod: event.auth_method,
        success: event.success,
        failureReason: event.failure_reason,
        ipAddress: event.ip_address,
        userAgent: event.user_agent,
        location: event.location,
        isSuspicious: event.is_suspicious,
        riskScore: event.risk_score,
        timestamp: event.created_at,
        details: event.details ? JSON.parse(event.details) : null
      })),
      total: events.length
    });
  } catch (error) {
    console.error('Audit endpoint error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve audit logs',
      code: 'AUDIT_ERROR'
    });
  }
});

export default router;