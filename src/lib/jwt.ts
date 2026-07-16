import { SignJWT, jwtVerify } from 'jose';

// jose is edge-runtime compatible, which matters because this module is
// imported by middleware.ts (runs on the Edge runtime) as well as regular
// Node.js Route Handlers. Keep this file free of Node-only dependencies
// (like bcryptjs, which lives in lib/password.ts instead) so the edge
// bundle stays lean and doesn't pull in code it will never use.

const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET) {
  // Fail loudly at boot rather than silently signing tokens with `undefined`.
  throw new Error('JWT_SECRET is not set. Add it to your .env file.');
}
const secretKey = new TextEncoder().encode(JWT_SECRET);

const TOKEN_EXPIRY = '7d';
export const SESSION_COOKIE_NAME = 'session_token';

export type SessionPayload = {
  userId: string;
  email: string;
};

/** Sign a short-lived session JWT for the given user. */
export async function signSessionToken(payload: SessionPayload): Promise<string> {
  return new SignJWT(payload)
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime(TOKEN_EXPIRY)
    .sign(secretKey);
}

/**
 * Verify a session JWT and return its payload, or null if invalid/expired.
 * Never throws — callers treat null as "not authenticated".
 */
export async function verifySessionToken(
  token: string
): Promise<SessionPayload | null> {
  try {
    const { payload } = await jwtVerify(token, secretKey);
    if (typeof payload.userId !== 'string' || typeof payload.email !== 'string') {
      return null;
    }
    return { userId: payload.userId, email: payload.email };
  } catch {
    return null;
  }
}
