const MT5_INTERNAL_DOMAIN = "mt5-user.pnldiary.app";
const MT5_EMAIL_PATTERN = /^mt5\.(\d{4,16})@mt5-user\.pnldiary\.app$/i;

/**
 * Validates and normalizes an MT5 account login number (4-16 digits).
 */
export function normalizeMt5AccountNumber(raw: string): string | null {
  const cleaned = raw.replace(/\s+/g, "").trim();
  if (!/^\d{4,16}$/.test(cleaned)) {
    return null;
  }
  return cleaned;
}

/**
 * Maps an MT5 account number to a deterministic internal email for Supabase/local auth.
 */
export function mt5AccountToEmail(accountNumber: string): string {
  return `mt5.${accountNumber}@${MT5_INTERNAL_DOMAIN}`;
}

/**
 * Extracts the MT5 account number if an email belongs to the MT5-only auth flow.
 */
export function extractMt5AccountFromEmail(email: string): string | null {
  const match = email.trim().match(MT5_EMAIL_PATTERN);
  return match ? match[1] : null;
}

/**
 * Formats an authenticated user's display label for sidebar/profile UI.
 */
export function formatAccountLabel(email: string): string {
  const mt5Account = extractMt5AccountFromEmail(email);
  if (mt5Account) {
    return `MT5 #${mt5Account}`;
  }
  return email;
}

