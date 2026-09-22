import crypto from "crypto";

/**
 * Standard SHA-256 hex digest
 */
export function sha256(value: string): string {
  return crypto.createHash("sha256").update(value.trim()).digest("hex");
}

/**
 * Normalizes and hashes email for Meta CAPI
 */
export function hashEmail(email?: string | null): string | null {
  if (!email || typeof email !== "string") return null;
  const clean = email.trim().toLowerCase();
  if (!clean.includes("@")) return null;
  return sha256(clean);
}

/**
 * Normalizes and hashes phone number for Meta CAPI (E.164 format without '+')
 * Default country code: 55 (Brazil) if 10-11 digits without DDI
 */
export function hashPhone(phone?: string | null): string | null {
  if (!phone || typeof phone !== "string") return null;
  let digits = phone.replace(/\D/g, "");
  if (!digits) return null;

  // If Brazilian format (10 or 11 digits: DDD + 8 or 9 digits), prepend country code 55
  if (digits.length === 10 || digits.length === 11) {
    digits = "55" + digits;
  }

  return sha256(digits);
}

/**
 * Normalizes and hashes first/last name
 */
export function hashName(name?: string | null): string | null {
  if (!name || typeof name !== "string") return null;
  const clean = name.trim().toLowerCase();
  if (!clean) return null;
  return sha256(clean);
}
