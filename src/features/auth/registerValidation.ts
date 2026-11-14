// Pure validation helpers for the Create account form (no React, unit tested directly).

export type PasswordRule = "length" | "lowercase" | "uppercase" | "number" | "symbol";

export type RegisterValues = {
  firstName: string;
  lastName: string;
  email: string;
  password: string;
};

export type RegisterErrors = Partial<Record<keyof RegisterValues, string>>;

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Same rules as the backend RegisterUserRequest; "symbol" is any character that is not a letter or a digit.
const PASSWORD_RULES: { rule: PasswordRule; label: string; isMet: (password: string) => boolean }[] = [
  { rule: "length", label: "at least 8 characters", isMet: (password) => password.length >= 8 },
  { rule: "lowercase", label: "a lowercase letter", isMet: (password) => /[a-z]/.test(password) },
  { rule: "uppercase", label: "an uppercase letter", isMet: (password) => /[A-Z]/.test(password) },
  { rule: "number", label: "a number", isMet: (password) => /[0-9]/.test(password) },
  { rule: "symbol", label: "a symbol", isMet: (password) => /[^A-Za-z0-9]/.test(password) },
];

/** Returns the unmet password rules, in a fixed order. */
export function validatePassword(password: string): PasswordRule[] {
  return PASSWORD_RULES.filter(({ isMet }) => !isMet(password)).map(({ rule }) => rule);
}

/** Builds the field error text, e.g. "Password needs an uppercase letter and a number." */
export function describeMissingRules(rules: PasswordRule[]): string {
  const labels = PASSWORD_RULES.filter(({ rule }) => rules.includes(rule)).map(({ label }) => label);
  if (labels.length === 0) return "";
  const list =
    labels.length === 1 ? labels[0] : `${labels.slice(0, -1).join(", ")} and ${labels[labels.length - 1]}`;
  return `Password needs ${list}.`;
}

export function validateRegister(values: RegisterValues): RegisterErrors {
  const errors: RegisterErrors = {};
  if (!values.firstName.trim()) errors.firstName = "First name is required";
  if (!values.lastName.trim()) errors.lastName = "Last name is required";

  const email = values.email.trim();
  if (!email) {
    errors.email = "Email is required";
  } else if (!EMAIL_PATTERN.test(email)) {
    errors.email = "Enter a valid email address";
  }

  if (!values.password) {
    errors.password = "Password is required";
  } else {
    const missing = validatePassword(values.password);
    if (missing.length > 0) errors.password = describeMissingRules(missing);
  }
  return errors;
}
