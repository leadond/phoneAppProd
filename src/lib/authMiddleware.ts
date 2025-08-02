import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { ldapAuth, JWTPayload } from './ldapAuth';
import { authDatabase, User, Permission } from './authDatabase';

// Extend Express Request type to include user information
declare global {
  namespace Express {
    interface Request {
      user?: User;
      session?: {
        sessionId: string;
        permissions: string[];
        groups: string[];
      };
      permissions?: string[];
      clientInfo?: {
        ip: string;
        userAgent: string;
        deviceInfo?: any;
      };
    }
  }
}

// Authentication result interface
interface AuthResult {
  success: boolean;
  user?: User;
  permissions?: string[];
  groups?: string[];
  sessionId?: string;
  error?: string;
  reason?: string;
}

// Middleware options
interface AuthMiddlewareOptions {
  requireAuth?: boolean;
  requiredPermissions?: string[];
  requiredGroups?: string[];
  allowLegacyAuth?: boolean;
  logEvents?: boolean;
}

export class AuthMiddleware {
  private jwtSecret: string;

  constructor(jwtSecret?: string) {
    this.jwtSecret = jwtSecret || process.env.JWT_SECRET || 'default-secret-change-me';
  }

  // Extract client information from request
  private extractClientInfo(req: Request) {
    const ip = req.ip || req.connection.remoteAddress || 'unknown';
    const userAgent = req.get('User-Agent') || 'unknown';
    
    // Basic device detection
    const deviceInfo = {
      isMobile: /Mobile|Android|iPhone|iPad/.test(userAgent),
      isBrowser: /Mozilla/.test(userAgent),
      userAgent: userAgent
    };

    return { ip, userAgent, deviceInfo };
  }

  // Authenticate using JWT token
  private async authenticateJWT(token: string, clientInfo: any): Promise<AuthResult> {
    try {
      // Verify JWT token
      const payload = ldapAuth.verifyToken(token);
      if (!payload) {
        return { success: false, error: 'Invalid token', reason: 'jwt_invalid' };
      }

      // Get user from database
      const user = authDatabase.getUser(payload.sub, 'id');
      if (!user || !user.is_active) {
        return { success: false, error: 'User not found or inactive', reason: 'user_not_found' };
      }

      // Check if session exists and is valid
      const session = await ldapAuth.getSession(payload.sessionId);
      if (!session) {
        return { success: false, error: 'Session not found or expired', reason: 'session_expired' };
      }

      // Update session activity
      await ldapAuth.updateSessionActivity(payload.sessionId);
      authDatabase.updateSessionActivity(payload.sessionId);

      // Get user permissions
      const permissions = authDatabase.getUserPermissions(user.id);
      const permissionNames = permissions.map(p => p.name);

      // Get user groups
      const groups = authDatabase.getUserGroups(user.id);
      const groupNames = groups.map(g => g.name);

      // Log successful authentication
      authDatabase.logAuthEvent({
        user_id: user.id,
        username: user.username,
        event_type: 'login_success',
        auth_method: user.auth_type,
        ip_address: clientInfo.ip,
        user_agent: clientInfo.userAgent,
        device_info: JSON.stringify(clientInfo.deviceInfo),
        success: true,
        session_id: payload.sessionId,
        details: JSON.stringify({ method: 'jwt', permissions: permissionNames.length })
      });

      return {
        success: true,
        user,
        permissions: permissionNames,
        groups: groupNames,
        sessionId: payload.sessionId
      };
    } catch (error) {
      console.error('JWT authentication error:', error);
      return { success: false, error: 'Authentication failed', reason: 'jwt_error' };
    }
  }

  // Authenticate using legacy session token
  private async authenticateLegacySession(token: string, clientInfo: any): Promise<AuthResult> {
    try {
      // Check legacy session
      const sessionData = authDatabase.getSessionByToken(token);
      if (!sessionData) {
        return { success: false, error: 'Session not found or expired', reason: 'session_expired' };
      }

      // Get user
      const user = authDatabase.getUser(sessionData.username, 'username');
      if (!user || !user.is_active) {
        return { success: false, error: 'User not found or inactive', reason: 'user_not_found' };
      }

      // Get user permissions (for legacy users, assume basic permissions)
      const permissions = authDatabase.getUserPermissions(user.id);
      const permissionNames = permissions.length > 0 
        ? permissions.map(p => p.name)
        : ['read']; // Default permission for legacy users

      // Get user groups
      const groups = authDatabase.getUserGroups(user.id);
      const groupNames = groups.map(g => g.name);

      // Log successful authentication
      authDatabase.logAuthEvent({
        user_id: user.id,
        username: user.username,
        event_type: 'login_success',
        auth_method: 'local',
        ip_address: clientInfo.ip,
        user_agent: clientInfo.userAgent,
        device_info: JSON.stringify(clientInfo.deviceInfo),
        success: true,
        details: JSON.stringify({ method: 'legacy', permissions: permissionNames.length })
      });

      return {
        success: true,
        user,
        permissions: permissionNames,
        groups: groupNames,
        sessionId: token
      };
    } catch (error) {
      console.error('Legacy authentication error:', error);
      return { success: false, error: 'Authentication failed', reason: 'session_error' };
    }
  }

  // Main authentication method
  private async authenticate(req: Request): Promise<AuthResult> {
    const clientInfo = this.extractClientInfo(req);
    req.clientInfo = clientInfo;

    // Extract token from various sources
    let token: string | undefined;

    // Check Authorization header (Bearer token)
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      token = authHeader.substring(7);
    }

    // Check cookies
    if (!token && req.cookies) {
      token = req.cookies.auth_token || req.cookies.session_token;
    }

    // Check query parameter (for backward compatibility)
    if (!token && req.query.token) {
      token = req.query.token as string;
    }

    if (!token) {
      return { success: false, error: 'No authentication token provided', reason: 'no_token' };
    }

    // Try JWT authentication first
    if (token.includes('.')) { // JWT tokens contain dots
      const jwtResult = await this.authenticateJWT(token, clientInfo);
      if (jwtResult.success) {
        return jwtResult;
      }
    }

    // Fallback to legacy session authentication
    return await this.authenticateLegacySession(token, clientInfo);
  }

  // Check if user has required permissions
  private checkPermissions(userPermissions: string[], requiredPermissions: string[]): boolean {
    if (!requiredPermissions || requiredPermissions.length === 0) {
      return true;
    }

    // Check for admin permission (grants everything)
    if (userPermissions.includes('admin')) {
      return true;
    }

    // Check if user has all required permissions
    return requiredPermissions.every(permission => userPermissions.includes(permission));
  }

  // Check if user belongs to required groups
  private checkGroups(userGroups: string[], requiredGroups: string[]): boolean {
    if (!requiredGroups || requiredGroups.length === 0) {
      return true;
    }

    // Check if user belongs to at least one required group
    return requiredGroups.some(group => userGroups.includes(group));
  }

  // Log authentication failure
  private logAuthFailure(req: Request, reason: string, username?: string) {
    const clientInfo = req.clientInfo || this.extractClientInfo(req);
    
    authDatabase.logAuthEvent({
      username: username || 'unknown',
      event_type: 'login_failed',
      auth_method: 'local',
      ip_address: clientInfo.ip,
      user_agent: clientInfo.userAgent,
      device_info: JSON.stringify(clientInfo.deviceInfo),
      success: false,
      failure_reason: reason,
      details: JSON.stringify({ 
        url: req.originalUrl, 
        method: req.method,
        reason 
      })
    });
  }

  // Main middleware factory
  public createMiddleware(options: AuthMiddlewareOptions = {}) {
    const {
      requireAuth = true,
      requiredPermissions = [],
      requiredGroups = [],
      allowLegacyAuth = true,
      logEvents = true
    } = options;

    return async (req: Request, res: Response, next: NextFunction) => {
      try {
        // If authentication is not required, continue
        if (!requireAuth) {
          return next();
        }

        // Authenticate user
        const authResult = await this.authenticate(req);

        if (!authResult.success) {
          if (logEvents) {
            this.logAuthFailure(req, authResult.reason || 'unknown');
          }

          return res.status(401).json({
            error: 'Authentication failed',
            message: authResult.error,
            reason: authResult.reason
          });
        }

        // Check permissions
        if (!this.checkPermissions(authResult.permissions || [], requiredPermissions)) {
          if (logEvents) {
            this.logAuthFailure(req, 'insufficient_permissions', authResult.user?.username);
          }

          return res.status(403).json({
            error: 'Insufficient permissions',
            message: 'You do not have the required permissions to access this resource',
            required: requiredPermissions,
            current: authResult.permissions
          });
        }

        // Check groups
        if (!this.checkGroups(authResult.groups || [], requiredGroups)) {
          if (logEvents) {
            this.logAuthFailure(req, 'insufficient_groups', authResult.user?.username);
          }

          return res.status(403).json({
            error: 'Insufficient group membership',
            message: 'You do not belong to the required groups to access this resource',
            required: requiredGroups,
            current: authResult.groups
          });
        }

        // Attach user information to request
        req.user = authResult.user;
        req.session = {
          sessionId: authResult.sessionId || '',
          permissions: authResult.permissions || [],
          groups: authResult.groups || []
        };
        req.permissions = authResult.permissions || [];

        next();
      } catch (error) {
        console.error('Authentication middleware error:', error);
        
        if (logEvents) {
          this.logAuthFailure(req, 'middleware_error');
        }

        res.status(500).json({
          error: 'Internal authentication error',
          message: 'An error occurred during authentication'
        });
      }
    };
  }

  // Convenience methods for common authentication scenarios
  public requireAuth() {
    return this.createMiddleware({ requireAuth: true });
  }

  public requirePermissions(...permissions: string[]) {
    return this.createMiddleware({ 
      requireAuth: true, 
      requiredPermissions: permissions 
    });
  }

  public requireGroups(...groups: string[]) {
    return this.createMiddleware({ 
      requireAuth: true, 
      requiredGroups: groups 
    });
  }

  public requireAdmin() {
    return this.createMiddleware({ 
      requireAuth: true, 
      requiredPermissions: ['admin'] 
    });
  }

  public optional() {
    return this.createMiddleware({ requireAuth: false });
  }

  // User information extraction middleware (doesn't require auth but extracts if present)
  public extractUser() {
    return async (req: Request, res: Response, next: NextFunction) => {
      try {
        const authResult = await this.authenticate(req);
        if (authResult.success) {
          req.user = authResult.user;
          req.session = {
            sessionId: authResult.sessionId || '',
            permissions: authResult.permissions || [],
            groups: authResult.groups || []
          };
          req.permissions = authResult.permissions || [];
        }
        next();
      } catch (error) {
        // Don't fail if user extraction fails, just continue without user
        next();
      }
    };
  }

  // Rate limiting helper (can be enhanced with Redis)
  public rateLimitByUser(maxRequests: number = 100, windowMs: number = 15 * 60 * 1000) {
    const requests = new Map<string, { count: number; resetTime: number }>();

    return (req: Request, res: Response, next: NextFunction) => {
      const identifier = req.user?.id || req.clientInfo?.ip || 'anonymous';
      const now = Date.now();
      
      const userRequests = requests.get(identifier);
      
      if (!userRequests || now > userRequests.resetTime) {
        requests.set(identifier, { count: 1, resetTime: now + windowMs });
        return next();
      }
      
      if (userRequests.count >= maxRequests) {
        return res.status(429).json({
          error: 'Too many requests',
          message: 'Rate limit exceeded. Please try again later.',
          resetTime: new Date(userRequests.resetTime).toISOString()
        });
      }
      
      userRequests.count++;
      next();
    };
  }
}

// Export singleton instance
export const authMiddleware = new AuthMiddleware();

// Export convenience functions
export const requireAuth = () => authMiddleware.requireAuth();
export const requirePermissions = (...permissions: string[]) => authMiddleware.requirePermissions(...permissions);
export const requireGroups = (...groups: string[]) => authMiddleware.requireGroups(...groups);
export const requireAdmin = () => authMiddleware.requireAdmin();
export const optionalAuth = () => authMiddleware.optional();
export const extractUser = () => authMiddleware.extractUser();