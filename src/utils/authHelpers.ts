/**
 * Authentication Helper Functions
 * Utility functions for email validation, role detection, and form validation
 */

export function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

export function isValidPhone(phone: string): boolean {
  // Remove spaces, dashes, and plus signs for validation
  const cleaned = phone.replace(/[\s\-+]/g, "");
  // Check if it's at least 10 digits
  return /^\d{10,}$/.test(cleaned);
}

export function isValidPassword(password: string): boolean {
  // At least 6 characters
  return password.length >= 6;
}

/**
 * Detect user role from email domain
 * @param email - User's email address
 * @returns Detected role or null if cannot be determined
 */
export function detectRoleFromEmail(email: string): "patient" | "doctor" | null {
  if (!email) return null;
  
  const emailLower = email.toLowerCase();
  
  // Doctor emails: @hpr.abdm or contains "hpr"
  if (emailLower.includes("@hpr.abdm") || emailLower.includes("hpr@")) {
    return "doctor";
  }
  
  // Patient emails: @abdm (but not hpr.abdm)
  if (emailLower.includes("@abdm") && !emailLower.includes("hpr")) {
    return "patient";
  }
  
  // Default: cannot determine from email alone
  return null;
}

/**
 * Get human-readable label for role
 */
export function getRoleLabel(role: "patient" | "doctor" | "admin"): string {
  switch (role) {
    case "patient":
      return "Patient";
    case "doctor":
      return "Doctor";
    case "admin":
      return "Administrator";
    default:
      return "User";
  }
}

