import bcrypt from 'bcryptjs';

// Node-only (bcryptjs). Deliberately kept separate from lib/jwt.ts so that
// middleware.ts, which runs on the Edge runtime, never pulls this in.

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
