import bcrypt from 'bcryptjs';
import { SignJWT, jwtVerify } from 'jose';

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

/** Hash a plaintext password for storage. Never store plaintext passwords. */
export async function hashPassword(plainText: string): Promise<string> {
  return bcrypt.hash(plainText, 10);
}

/** Compare a plaintext password against a stored bcrypt hash. */
export async function verifyPassword(
  plainText: string,
  hash: string
): Promise<boolean> {
  return bcrypt.compare(plainText, hash);
}

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
