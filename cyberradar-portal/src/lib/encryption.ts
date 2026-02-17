// © 2025 CyberLage
import { createCipheriv, createDecipheriv, randomBytes } from "crypto";

const ALGORITHM = "aes-256-gcm";

/**
 * Liest den Verschlüsselungsschlüssel aus den Umgebungsvariablen.
 * In Produktion sollte dieser im Azure Key Vault liegen.
 */
function getEncryptionKey(): Buffer {
  const keyHex = process.env.ENCRYPTION_KEY;
  
  if (!keyHex) {
    if (process.env.NODE_ENV === "production") {
      throw new Error("ENCRYPTION_KEY ist in Produktion erforderlich");
    }
    // Entwicklungs-Fallback (NICHT SICHER – nur für lokale Tests)
    console.warn("⚠️ Unsicherer Entwicklungs-Schlüssel aktiv. Nicht in Produktion verwenden!");
    return Buffer.from("0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef", "hex");
  }

  try {
    const key = Buffer.from(keyHex, "hex");
    if (key.length !== 32) {
      throw new Error("ENCRYPTION_KEY muss 32 Bytes (64 Hex-Zeichen) lang sein");
    }
    return key;
  } catch (error) {
    throw new Error(`Ungültiges ENCRYPTION_KEY-Format: ${error}`);
  }
}

/**
 * Verschlüsselt einen Klartext per AES-256-GCM.
 * Format: iv:tag:ciphertext (hex-kodiert)
 */
export function encrypt(plaintext: string): string {
  if (!plaintext) {
    throw new Error("Leerer Text kann nicht verschlüsselt werden");
  }

  const key = getEncryptionKey();
  const iv = randomBytes(16); // 128-bit IV für GCM
  const cipher = createCipheriv(ALGORITHM, key, iv);

  let encrypted = cipher.update(plaintext, "utf8", "hex");
  encrypted += cipher.final("hex");

  const tag = cipher.getAuthTag().toString("hex");

  // Format: iv:tag:ciphertext
  return `${iv.toString("hex")}:${tag}:${encrypted}`;
}

/**
 * Entschlüsselt einen mit encrypt() verschlüsselten Text.
 * Erwartetes Format: iv:tag:ciphertext (hex-kodiert)
 */
export function decrypt(encrypted: string): string {
  if (!encrypted) {
    throw new Error("Leerer Text kann nicht entschlüsselt werden");
  }

  const parts = encrypted.split(":");
  if (parts.length !== 3) {
    throw new Error("Ungültiges Format der verschlüsselten Daten");
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
    throw new Error(`Entschlüsselung fehlgeschlagen: ${error}`);
  }
}

/**
 * Verschlüsselt ein JSON-Objekt und gibt den String zurück.
 */
export function encryptObject<T>(obj: T): string {
  const json = JSON.stringify(obj);
  return encrypt(json);
}

/**
 * Entschlüsselt einen String und parst ihn als JSON.
 */
export function decryptObject<T>(encrypted: string): T {
  const json = decrypt(encrypted);
  return JSON.parse(json);
}

/**
 * Sichere Entschlüsselung: Gibt null zurück, wenn die Entschlüsselung fehlschlägt.
 */
export function decryptSafe(encrypted: string | null | undefined): string | null {
  if (!encrypted) return null;
  try {
    return decrypt(encrypted);
  } catch (error) {
    console.error("Entschlüsselung fehlgeschlagen:", error);
    return null;
  }
}

/**
 * Prüft, ob ein String verschlüsselt ist (einfache Formatprüfung).
 */
export function isEncrypted(value: string): boolean {
  if (!value) return false;
  const parts = value.split(":");
  return parts.length === 3 && /^[0-9a-f]+$/i.test(parts.join(""));
}

/**
 * Verschlüsselt Zugangsdaten vor dem Speichern.
 * Verwendung: tenant.connection.microsoft.accessTokenEncrypted = encryptCredential(rawToken)
 */
export function encryptCredential(credential: string): string {
  return encrypt(credential);
}

/**
 * Entschlüsselt gespeicherte Zugangsdaten.
 * Verwendung: const rawToken = decryptCredential(tenant.connection.microsoft.accessTokenEncrypted)
 */
export function decryptCredential(encryptedCredential: string): string {
  return decrypt(encryptedCredential);
}

/**
 * Generiert einen neuen Verschlüsselungsschlüssel (Setup/Rotation).
 * Gibt einen 32-Byte-HEX-String für ENCRYPTION_KEY zurück.
 */
export function generateEncryptionKey(): string {
  return randomBytes(32).toString("hex");
}

// Abwärtskompatible Aliase für bestehenden Code
// Einige Routen importieren encryptString/decryptString
export const encryptString = encrypt;
export const decryptString = decrypt;


