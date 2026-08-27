export const USERNAME_PATTERN = /^[a-z0-9_]{3,20}$/;

export function normalizeUsername(username: string): string {
  return username.trim().toLowerCase();
}

export function isValidUsername(username: string): boolean {
  return USERNAME_PATTERN.test(normalizeUsername(username));
}

export function getPasswordStrength(password: string): { score: number; label: 'Weak' | 'Fair' | 'Good' | 'Strong' } {
  const score = [
    password.length >= 10,
    /[a-z]/.test(password),
    /[A-Z]/.test(password),
    /\d/.test(password),
    /[^A-Za-z0-9]/.test(password),
  ].filter(Boolean).length;
  const label = score <= 1 ? 'Weak' : score <= 3 ? 'Fair' : score === 4 ? 'Good' : 'Strong';
  return { score, label };
}

export function usernameLoginEmail(username: string): string {
  return `${normalizeUsername(username)}@users.onemovechess.local`;
}
