// © 2025 CyberLage
import { createCipheriv, createDecipheriv, randomBytes } from "crypto";

const ALGORITHM = "aes-256-gcm";

/**
 * Reads the encryption key from environment variables.
 * In production, this should be stored in Azure Key Vault.
 */
function getEncryptionKey(): Buffer {
  const keyHex = process.env.ENCRYPTION_KEY;
  
  if (!keyHex) {
    if (process.env.NODE_ENV === "production") {
      throw new Error("ENCRYPTION_KEY is required in production");
    }
    // Development fallback (NOT SECURE - local testing only)
    console.warn("Insecure development key is active. Do not use in production.");
    return Buffer.from("0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef", "hex");
  }

  try {
    const key = Buffer.from(keyHex, "hex");
    if (key.length !== 32) {
      throw new Error("ENCRYPTION_KEY must be 32 bytes (64 hex characters)");
    }
    return key;
  } catch (error) {
    throw new Error(`Invalid ENCRYPTION_KEY format: ${error}`);
  }
}

/**
 * Encrypts plaintext using AES-256-GCM.
 * Format: iv:tag:ciphertext (hex encoded)
 */
export function encrypt(plaintext: string): string {
  if (!plaintext) {
    throw new Error("Empty text cannot be encrypted");
  }

  const key = getEncryptionKey();
  const iv = randomBytes(16); // 128-bit IV for GCM
  const cipher = createCipheriv(ALGORITHM, key, iv);

  let encrypted = cipher.update(plaintext, "utf8", "hex");
  encrypted += cipher.final("hex");

  const tag = cipher.getAuthTag().toString("hex");

  // Format: iv:tag:ciphertext
  return `${iv.toString("hex")}:${tag}:${encrypted}`;
}

/**
 * Decrypts text encrypted by encrypt().
 * Expected format: iv:tag:ciphertext (hex encoded)
 */
export function decrypt(encrypted: string): string {
  if (!encrypted) {
    throw new Error("Empty text cannot be decrypted");
  }

  const parts = encrypted.split(":");
  if (parts.length !== 3) {
    throw new Error("Invalid encrypted payload format");
  }

  const [ivHex, tagHex, ciphertext] = parts;

  try {
    const key = getEncryptionKey();
    const iv = Buffer.from(ivHex, "hex");
    const tag = Buffer.from(tagHex, "hex");

    const decipher = createDecipheriv(ALGORITHM, key, iv);
    decipher.setAuthTag(tag);

    let decrypted = decipher.update(ciphertext, "hex", "utf8");
    decrypted += decipher.final("utf8");

    return decrypted;
  } catch (error) {
    throw new Error(`Decryption failed: ${error}`);
  }
}

/**
 * Encrypts a JSON object and returns the encrypted string.
 */
export function encryptObject<T>(obj: T): string {
  const json = JSON.stringify(obj);
  return encrypt(json);
}

/**
 * Decrypts a string and parses it as JSON.
 */
export function decryptObject<T>(encrypted: string): T {
  const json = decrypt(encrypted);
  return JSON.parse(json);
}

/**
 * Safe decryption: returns null when decryption fails.
 */
export function decryptSafe(encrypted: string | null | undefined): string | null {
  if (!encrypted) return null;
  try {
    return decrypt(encrypted);
  } catch (error) {
    console.error("Decryption failed:", error);
    return null;
  }
}

/**
 * Checks whether a string looks encrypted (basic format check).
 */
export function isEncrypted(value: string): boolean {
  if (!value) return false;
  const parts = value.split(":");
  return parts.length === 3 && /^[0-9a-f]+$/i.test(parts.join(""));
}

/**
 * Encrypts credentials before save.
 * Usage: tenant.connection.microsoft.accessTokenEncrypted = encryptCredential(rawToken)
 */
export function encryptCredential(credential: string): string {
  return encrypt(credential);
}

/**
 * Decrypts stored credentials.
 * Usage: const rawToken = decryptCredential(tenant.connection.microsoft.accessTokenEncrypted)
 */
export function decryptCredential(encryptedCredential: string): string {
  return decrypt(encryptedCredential);
}

/**
 * Generates a new encryption key (setup/rotation).
 * Returns a 32-byte hex string for ENCRYPTION_KEY.
 */
export function generateEncryptionKey(): string {
  return randomBytes(32).toString("hex");
}

// Backward-compatible aliases for existing code
// Some routes import encryptString/decryptString
export const encryptString = encrypt;
export const decryptString = decrypt;



