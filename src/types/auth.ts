/**
 * Auth types for session and user shapes.
 * Mirrors the Better Auth session/user structure used in this app.
 */

export interface AuthUser {
  id: string;
  name: string | null;
  email: string;
  image: string | null;
  emailVerified: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface AuthSession {
  id: string;
  userId: string;
  expiresAt: Date;
  createdAt: Date;
  updatedAt: Date;
  token: string;
  ipAddress?: string | null;
  userAgent?: string | null;
}

export interface SessionWithUser {
  session: AuthSession;
  user: AuthUser;
}
