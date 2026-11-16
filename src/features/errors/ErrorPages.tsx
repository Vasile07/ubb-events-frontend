import type { ReactNode } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { Button } from "../../shared/ui";

// Figma Student Screens > "404 – Page not found" (48:876) and "403 – No access" (48:914).

export type ForbiddenVariant = "manager" | "member";

const DECOR = [
  { size: 120, className: "error-page-decor-small" },
  { size: 260, className: "error-page-decor-left" },
  { size: 320, className: "error-page-decor-large" },
] as const;

function ErrorPageLayout({
  code,
  title,
  description,
  actions,
  testId,
  role,
}: {
  code: string;
  title: string;
  description: string;
  actions: ReactNode;
  testId: string;
  role?: "alert";
}) {
  return (
    <main className="error-page" data-testid={testId} role={role} aria-labelledby={`${testId}-title`}>
      {DECOR.map(({ size, className }) => (
        <img
          key={size}
          className={`error-page-decor ${className}`}
          src={`/ui-assets/error-decor-${size}.svg`}
          width={size}
          height={size}
          alt=""
          aria-hidden="true"
        />
      ))}
      <div className="error-page-message">
        <p className="error-page-code" data-testid="error-code" aria-hidden="true">{code}</p>
        <h1 id={`${testId}-title`}>{title}</h1>
        <p className="error-page-description">{description}</p>
        <div className="error-page-actions">{actions}</div>
      </div>
    </main>
  );
}

export function NotFoundPage() {
  const navigate = useNavigate();
  const location = useLocation();
  // "default" is the key of the first entry the router saw, so there is no in-app page to go back to.
  const goBack = () => (location.key === "default" ? navigate("/events") : navigate(-1));
  return (
    <ErrorPageLayout
      testId="page-not-found"
      code="404"
      title="This page doesn’t exist"
      description="The page you are looking for was moved, deleted or never existed. Check the link or head back to the events."
      actions={
        <>
          <Button type="button" onClick={() => navigate("/events")}>Back to discover</Button>
          <Button type="button" variant="Secondary" onClick={goBack}>Go back</Button>
        </>
      }
    />
  );
}

export function forbiddenDescription(variant: ForbiddenVariant, organizationName?: string): string {
  if (variant === "manager") {
    const organization = organizationName?.trim() || "the organization";
    return `This area is only available to managers of the organization. Ask a manager of ${organization} if you need access.`;
  }
  return "This area is only available to members of the organization. Ask to join it from the Organizations page if you need access.";
}

export function ForbiddenPage({
  variant = "member",
  organizationName,
}: {
  variant?: ForbiddenVariant;
  organizationName?: string;
}) {
  const navigate = useNavigate();
  return (
    <ErrorPageLayout
      testId="page-forbidden"
      role="alert"
      code="403"
      title="You don’t have access to this page"
      description={forbiddenDescription(variant, organizationName)}
      actions={
        <>
          <Button type="button" onClick={() => navigate("/events")}>Back to discover</Button>
          <Button type="button" variant="Secondary" onClick={() => navigate("/organizations")}>My organizations</Button>
        </>
      }
    />
  );
}
