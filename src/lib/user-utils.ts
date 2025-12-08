/**
 * Get initials from a name for avatar fallback display
 * Handles full name, nickname, and email fallbacks
 */
export function getInitials(
  name: string | null | undefined,
  fallbackOrNickname?: string | null
): string {
  // If second param looks like an email, use it as fallback
  const isEmail = fallbackOrNickname?.includes("@");
  
  // Determine the display name (prefer nickname if provided and not an email)
  const displayName = !isEmail && fallbackOrNickname ? fallbackOrNickname : name;
  
  if (displayName) {
    return displayName
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  }
  
  // Fallback: use email prefix or default
  if (isEmail && fallbackOrNickname) {
    const emailPrefix = fallbackOrNickname.split("@")[0];
    return emailPrefix.slice(0, 2).toUpperCase();
  }
  
  return "U";
}

/**
 * Calculate age from birth date
 * Returns null if birthDate is null or undefined
 */
export function calculateAge(birthDate: string | Date | null | undefined): number | null {
  if (!birthDate) return null;
  const birth = typeof birthDate === "string" ? new Date(birthDate) : birthDate;
  const today = new Date();
  let age = today.getFullYear() - birth.getFullYear();
  const monthDiff = today.getMonth() - birth.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
    age--;
  }
  return age;
}

/**
 * Format distance in kilometers with Czech locale
 */
export function formatDistance(meters: number): string {
  const km = meters / 1000;
  return km.toLocaleString("cs-CZ", { maximumFractionDigits: 0 });
}

/**
 * Format elevation in meters with Czech locale
 */
export function formatElevation(meters: number): string {
  return meters.toLocaleString("cs-CZ", { maximumFractionDigits: 0 });
}
