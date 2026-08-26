export const USERNAME_PATTERN = /^[a-z0-9_]{3,20}$/;

export const passwordRequirementLabels = [
  'At least 10 characters',
  'One lowercase letter',
  'One uppercase letter',
  'One number',
  'One symbol',
] as const;

export function normalizeUsername(username: string): string {
  return username.trim().toLowerCase();
}

export function isValidUsername(username: string): boolean {
  return USERNAME_PATTERN.test(normalizeUsername(username));
}

export function isStrongPassword(password: string): boolean {
  return password.length >= 10
    && /[a-z]/.test(password)
    && /[A-Z]/.test(password)
    && /\d/.test(password)
    && /[^A-Za-z0-9]/.test(password);
}

export function usernameLoginEmail(username: string): string {
  return `${normalizeUsername(username)}@users.onemovechess.local`;
}
