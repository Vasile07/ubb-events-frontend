import { useState, type FormEvent } from "react";
import { Link, useLocation } from "react-router-dom";
import { ApiError } from "../../shared/api/client";
import { AuthLayout, Button, TextField, useToast } from "../../shared/ui";
import { useAuth } from "./AuthProvider";

type LoginErrors = { email?: string; password?: string };

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Login only checks that the password is present: complexity rules belong to registration.
export function validateLogin(email: string, password: string): LoginErrors {
  const errors: LoginErrors = {};
  if (!email.trim()) {
    errors.email = "Email is required";
  } else if (!EMAIL_PATTERN.test(email.trim())) {
    errors.email = "Enter a valid email address";
  }
  if (!password) {
    errors.password = "Password is required";
  }
  return errors;
}

export function LoginPage() {
  const { login } = useAuth();
  const toast = useToast();
  const location = useLocation();
  const from = (location.state as { from?: string } | null)?.from;
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [errors, setErrors] = useState<LoginErrors>({});
  const [credentialsError, setCredentialsError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (submitting) return;

    const validation = validateLogin(email, password);
    setErrors(validation);
    setCredentialsError(null);
    if (validation.email || validation.password) return;

    setSubmitting(true);
    try {
      // On success the auth status becomes "authenticated" and the route guard redirects to `from`.
      await login(email.trim(), password);
    } catch (error) {
      if (error instanceof ApiError) {
        setCredentialsError(error.message);
      } else {
        toast.error("Couldn't sign in", "Check your connection and try again.");
      }
      setSubmitting(false);
    }
  }

  return (
    <AuthLayout testId="page-login">
      <span data-testid="login-from" data-from={from ?? ""} hidden />
      <div className="auth-form-header">
        <h2>Welcome back</h2>
        <p>Sign in to see your events and organizations.</p>
      </div>
      <form className="auth-form" aria-label="Sign in" noValidate onSubmit={handleSubmit}>
        <div className="auth-form-fields">
          <TextField
            label="Email"
            type="email"
            name="email"
            autoComplete="email"
            placeholder="you@stud.ubbcluj.ro"
            data-testid="login-email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            error={errors.email}
            {...(credentialsError ? { "aria-invalid": true } : {})}
          />
          <TextField
            label="Password"
            type="password"
            name="password"
            autoComplete="current-password"
            placeholder="••••••••"
            data-testid="login-password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            error={errors.password ?? credentialsError ?? undefined}
          />
        </div>
        <Button type="submit" className="auth-form-submit" loading={submitting} data-testid="login-submit">
          Sign in
        </Button>
        <p className="auth-form-switch">
          <span>New to UBB Events?</span>
          <Link to="/register">Create an account</Link>
        </p>
      </form>
    </AuthLayout>
  );
}
