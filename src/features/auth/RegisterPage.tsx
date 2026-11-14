import { useState, type FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ApiError } from "../../shared/api/client";
import { AuthLayout, Button, TextField, useToast } from "../../shared/ui";
import { useAuth } from "./AuthProvider";
import { validateRegister, type RegisterErrors, type RegisterValues } from "./registerValidation";

const PASSWORD_HELPER = "Min. 8 characters with upper & lower case, a number and a symbol";
const EMAIL_TAKEN = "This email address is already registered";
const FIELDS: (keyof RegisterValues)[] = ["firstName", "lastName", "email", "password"];

const EMPTY: RegisterValues = { firstName: "", lastName: "", email: "", password: "" };

// Keeps only the backend field errors that belong to a field of this form.
function fieldErrorsFrom(error: ApiError): RegisterErrors {
  const errors: RegisterErrors = {};
  for (const field of FIELDS) {
    if (error.fieldErrors[field]) errors[field] = error.fieldErrors[field];
  }
  return errors;
}

export function RegisterPage() {
  const { register, login } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();
  const [values, setValues] = useState<RegisterValues>(EMPTY);
  const [errors, setErrors] = useState<RegisterErrors>({});
  const [submitting, setSubmitting] = useState(false);

  const update = (field: keyof RegisterValues) => (event: { target: { value: string } }) =>
    setValues((current) => ({ ...current, [field]: event.target.value }));

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (submitting) return;

    const validation = validateRegister(values);
    setErrors(validation);
    if (Object.keys(validation).length > 0) return;

    const email = values.email.trim();
    setSubmitting(true);
    try {
      await register({
        firstName: values.firstName.trim(),
        lastName: values.lastName.trim(),
        email,
        password: values.password,
      });
    } catch (error) {
      if (error instanceof ApiError && error.status === 409) {
        setErrors({ email: EMAIL_TAKEN });
      } else if (error instanceof ApiError && Object.keys(fieldErrorsFrom(error)).length > 0) {
        setErrors(fieldErrorsFrom(error));
      } else if (error instanceof ApiError) {
        toast.error("Couldn't create account", error.message);
      } else {
        toast.error("Couldn't create account", "Check your connection and try again.");
      }
      setSubmitting(false);
      return;
    }

    try {
      // On success the auth status becomes "authenticated" and the route guard redirects to /events.
      await login(email, values.password);
    } catch {
      toast.success("Account created", "Please sign in.");
      navigate("/login", { replace: true });
    }
  }

  return (
    <AuthLayout testId="page-register">
      <div className="auth-form-header">
        <h2>Create your account</h2>
        <p>Join UBB Events to discover and register for events.</p>
      </div>
      <form className="auth-form" aria-label="Create account" noValidate onSubmit={handleSubmit}>
        <div className="auth-form-fields">
          <div className="auth-form-name-row">
            <TextField
              label="First name"
              name="firstName"
              autoComplete="given-name"
              placeholder="Andrei"
              data-testid="register-first-name"
              value={values.firstName}
              onChange={update("firstName")}
              error={errors.firstName}
            />
            <TextField
              label="Last name"
              name="lastName"
              autoComplete="family-name"
              placeholder="Pop"
              data-testid="register-last-name"
              value={values.lastName}
              onChange={update("lastName")}
              error={errors.lastName}
            />
          </div>
          <TextField
            label="Email"
            type="email"
            name="email"
            autoComplete="email"
            placeholder="andrei.pop@stud.ubbcluj.ro"
            data-testid="register-email"
            value={values.email}
            onChange={update("email")}
            error={errors.email}
          />
          <TextField
            label="Password"
            type="password"
            name="password"
            autoComplete="new-password"
            placeholder="••••••••"
            data-testid="register-password"
            value={values.password}
            onChange={update("password")}
            // In the Error state the error text replaces the helper text (Figma).
            helperText={errors.password ? undefined : PASSWORD_HELPER}
            error={errors.password}
          />
        </div>
        <Button type="submit" className="auth-form-submit" loading={submitting} data-testid="register-submit">
          Create account
        </Button>
        <p className="auth-form-switch">
          <span>Already have an account?</span>
          <Link to="/login">Sign in</Link>
        </p>
      </form>
    </AuthLayout>
  );
}
