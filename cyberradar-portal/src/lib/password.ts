// © 2025 CyberLage
import bcrypt from "bcryptjs";

export type PasswordPolicyResult = { ok: true } | { ok: false; errors: string[] };

export const PASSWORD_MIN_LENGTH = 10;
export const BCRYPT_COST = 12;

export function validatePasswordPolicy(password: string): PasswordPolicyResult {
  const p = String(password || "");
  const errors: string[] = [];

  if (p.length < PASSWORD_MIN_LENGTH) errors.push(`Password must be at least ${PASSWORD_MIN_LENGTH} characters.`);
  if (!/[A-Z]/.test(p)) errors.push("Password must contain at least 1 uppercase letter.");
  if (!/[0-9]/.test(p)) errors.push("Password must contain at least 1 number.");
  if (!/[^A-Za-z0-9]/.test(p)) errors.push("Password must contain at least 1 special character.");

  if (errors.length > 0) return { ok: false, errors };
  return { ok: true };
}

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, BCRYPT_COST);
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

export async function isPasswordReused(password: string, previousHashes: string[]): Promise<boolean> {
  for (const h of previousHashes || []) {
    try {
      if (await bcrypt.compare(password, h)) return true;
    } catch {
      // Ignore bad hashes.
    }
  }
  return false;
}



