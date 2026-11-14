import {
  Navigate,
  Route,
  Routes,
  useLocation,
  useParams,
} from "react-router-dom";
import type { ReactNode } from "react";
import {
  Badge,
  Button,
  FilterChip,
  FeedbackShowcase,
  SearchField,
  Select,
  TextArea,
  TextField,
  ToastProvider,
  EventCard,
} from "./shared/ui";
import { LayoutShowcase } from "./shared/ui/LayoutComponents";
import { useAuth } from "./features/auth/AuthProvider";
import { AppShell } from "./shared/ui/AppShell";
import { DiscoverEventsPage } from "./features/events/DiscoverEventsPage";
import { LoginPage } from "./features/auth/LoginPage";
import { RegisterPage } from "./features/auth/RegisterPage";
import { OrganizationsListPage } from "./features/organizations/OrganizationsListPage";
import { OrganizationWorkspace } from "./features/organizations/OrganizationWorkspace";

function AuthStatusMarker() {
  const { status, user } = useAuth();
  return (
    <span data-testid="auth-status" hidden>
      {status}
      <span data-testid="auth-user-name">{user?.fullName ?? ""}</span>
    </span>
  );
}

function ComponentsDemo() {
  const tones = [
    "neutral",
    "info",
    "success",
    "warning",
    "danger",
    "brand",
  ] as const;
  const cardEvent = {
    id: "open",
    title: "Campus night",
    organizationName: "UBB Student Union",
    location: "Casa de cultură",
    startsAt: "2026-11-14T18:00:00Z",
    capacity: 60,
    spotsTaken: 42,
    status: "OPEN" as const,
  };
  return (
    <main className="components-page">
      <AuthStatusMarker />
      <h1 className="text-heading-h1">Components</h1>
      <section aria-labelledby="actions">
        <h2 id="actions" className="text-heading-h2">
          Actions
        </h2>
        <div data-testid="button-demo" className="components-row">
          {(["Primary", "Secondary", "Ghost", "Danger"] as const).map(
            (variant) => (
              <Button
                key={variant}
                data-testid={`button-${variant.toLowerCase()}`}
                variant={variant}
              >
                Button
              </Button>
            ),
          )}
          <Button
            data-testid="button-leading-icon"
            leadingIcon={
              <span className="ui-leading-icon" aria-hidden="true">
                ＋
              </span>
            }
          >
            With icon
          </Button>
          <Button size="Sm" variant="Primary">
            Small
          </Button>
          <Button size="Sm" variant="Secondary">
            Small
          </Button>
          <Button size="Sm" variant="Ghost">
            Small
          </Button>
          <Button size="Sm" variant="Danger">
            Small
          </Button>
          <Button data-testid="button-loading" loading>
            Save
          </Button>
          <Button data-testid="button-disabled" disabled>
            Disabled
          </Button>
        </div>
      </section>
      <section aria-labelledby="badges">
        <h2 id="badges" className="text-heading-h2">
          Badges
        </h2>
        <div className="components-row">
          {tones.map((tone) => (
            <Badge
              key={tone}
              data-testid={`badge-${tone}`}
              tone={(tone[0].toUpperCase() + tone.slice(1)) as never}
            >
              Status
            </Badge>
          ))}
        </div>
      </section>
      <section aria-labelledby="fields">
        <h2 id="fields" className="text-heading-h2">
          Form fields
        </h2>
        <div className="components-grid">
          <TextField
            data-testid="text-field-default"
            label="Label"
            placeholder="Placeholder"
            helperText="Helper text"
          />
          <TextField
            data-testid="text-field-error"
            label="Label"
            placeholder="Placeholder"
            error="Invalid value"
          />
          <TextField
            data-testid="text-field-both"
            label="Label"
            placeholder="Placeholder"
            helperText="Helper text"
            error="Invalid value"
          />
          <TextField
            data-testid="text-field-focus"
            label="Label"
            placeholder="Placeholder"
            autoFocus
            helperText="Focus state"
          />
          <TextArea
            data-testid="textarea-demo"
            label="Description"
            placeholder="Placeholder"
            helperText="Helper text"
            height={120}
          />
          <Select
            data-testid="select-demo"
            label="Type"
            defaultValue="event"
            helperText="Choose one"
          >
            <option value="event">Event</option>
            <option value="task">Task</option>
          </Select>
          <SearchField
            data-testid="search-field-demo"
            aria-label="Search"
            placeholder="Search events or organizations"
          />
          <div className="components-row">
            <FilterChip data-testid="filter-chip-default">Filter</FilterChip>
            <FilterChip data-testid="filter-chip-active" active>
              Filter
            </FilterChip>
          </div>
        </div>
      </section>
      <FeedbackShowcase />
      <section aria-labelledby="event-cards">
        <h2 id="event-cards" className="text-heading-h2">Event cards</h2>
        <div className="components-row ui-event-card-showcase">
          <EventCard event={cardEvent} />
          <EventCard event={{ ...cardEvent, id: "full", spotsTaken: 60 }} />
          <EventCard event={{ ...cardEvent, id: "few", spotsTaken: 55 }} />
          <EventCard event={{ ...cardEvent, id: "boundary", capacity: 100, spotsTaken: 90 }} />
          <EventCard event={{ ...cardEvent, id: "registered" }} registrationStatus="REGISTERED" />
          <EventCard event={{ ...cardEvent, id: "completed", status: "COMPLETED" }} />
          <EventCard event={{ ...cardEvent, id: "canceled", status: "CANCELED", spotsTaken: 60 }} />
        </div>
      </section>
    </main>
  );
}

function PlaceholderPage({ testId, title }: { testId: string; title: string }) {
  return (
    <main data-testid={testId}>
      <AuthStatusMarker />
      <h1>{title}</h1>
      <p>This screen is ready for the next feature task.</p>
    </main>
  );
}

function RequireAuth({ children }: { children: ReactNode }) {
  const { status } = useAuth();
  const location = useLocation();
  if (status === "authenticated") return <>{children}</>;
  return (
    <Navigate
      to="/login"
      replace
      state={{
        from: `${location.pathname}${location.search}${location.hash}`,
      }}
    />
  );
}

// Only same-app paths are followed ("/x", not "//host" or absolute URLs), so the redirect can't leave the app.
function safeRedirectTarget(from: unknown): string {
  return typeof from === "string" && from.startsWith("/") && !from.startsWith("//") ? from : "/events";
}

function RedirectIfAuthenticated({ children }: { children: ReactNode }) {
  const { status } = useAuth();
  const location = useLocation();
  const from = (location.state as { from?: unknown } | null)?.from;
  return status === "authenticated" ? (
    <Navigate to={safeRedirectTarget(from)} replace />
  ) : (
    <>{children}</>
  );
}

function ForbiddenPage() {
  return (
    <main data-testid="page-forbidden" role="alert">
      <h1>403 — Access denied</h1>
      <p>You do not have permission to view this page.</p>
    </main>
  );
}

function parseOrganizationId(value: string | undefined): number | null {
  if (!value || !/^\d+$/.test(value)) return null;
  const parsed = Number(value);
  return Number.isSafeInteger(parsed) && parsed > 0 ? parsed : null;
}

function RequireOrgMember({ children }: { children: ReactNode }) {
  const { organizationId } = useParams();
  const { isMemberOf } = useAuth();
  const parsedId = parseOrganizationId(organizationId);
  return parsedId !== null && isMemberOf(parsedId) ? (
    <>{children}</>
  ) : (
    <ForbiddenPage />
  );
}

function RequireOrgManager({ children }: { children: ReactNode }) {
  const { organizationId } = useParams();
  const { isManagerOf } = useAuth();
  const parsedId = parseOrganizationId(organizationId);
  return parsedId !== null && isManagerOf(parsedId) ? (
    <>{children}</>
  ) : (
    <ForbiddenPage />
  );
}

const authPage = (testId: string, title: string) => (
  <RequireAuth>
    <AppShell>
      <PlaceholderPage testId={testId} title={title} />
    </AppShell>
  </RequireAuth>
);

const memberPage = (testId: string, title: string) => (
  <RequireAuth>
    <RequireOrgMember>
      <AppShell>
        <OrganizationWorkspace>
          <PlaceholderPage testId={testId} title={title} />
        </OrganizationWorkspace>
      </AppShell>
    </RequireOrgMember>
  </RequireAuth>
);

const managerPage = (testId: string, title: string) => (
  <RequireAuth>
    <RequireOrgManager>
      <AppShell>
        <OrganizationWorkspace>
          <PlaceholderPage testId={testId} title={title} />
        </OrganizationWorkspace>
      </AppShell>
    </RequireOrgManager>
  </RequireAuth>
);

const palette = [
  ["Blue 900", "#223A5E", "Text, nav, strong surfaces", "blue-900"],
  ["Blue 800", "#355982", "Primary buttons, headings", "blue-800"],
  ["Blue 700", "#4D79A8", "Accent, focus, icons", "blue-700"],
  ["Blue 600", "#6E9ECC", "Highlights, charts", "blue-600"],
  ["Blue 400", "#9FC0E3", "Strong borders", "blue-400"],
  ["Blue 200", "#D0E1F2", "Borders, soft fills", "blue-200"],
  ["Blue 50", "#F3F8FD", "Page background", "blue-50"],
] as const;
const statuses = [
  ["Success fg", "#2B7A57", "var(--status-success-fg)"],
  ["Success bg", "#E2F3EA", "var(--status-success-bg)"],
  ["Warning fg", "#9A6410", "var(--status-warning-fg)"],
  ["Warning bg", "#FBF0DA", "var(--status-warning-bg)"],
  ["Danger fg", "#B23A48", "var(--status-danger-fg)"],
  ["Danger bg", "#FBE5E8", "var(--status-danger-bg)"],
] as const;
const typeStyles = [
  [
    "Display/Hero",
    "44 / 52 · ExtraBold",
    "text-display-hero",
    "Discover what’s on campus",
  ],
  ["Heading/H1", "32 / 40 · Bold", "text-heading-h1", "Events this month"],
  ["Heading/H2", "24 / 32 · Bold", "text-heading-h2", "Registration list"],
  [
    "Heading/H3",
    "18 / 26 · SemiBold",
    "text-heading-h3",
    "Career Fair: Meet Cluj Tech Companies",
  ],
  [
    "Body/Large",
    "16 / 24 · Regular",
    "text-body-large",
    "Join student organizations and never miss an event.",
  ],
  [
    "Body/Default",
    "14 / 22 · Regular",
    "text-body-default",
    "Registration closes on 12 November at 23:59.",
  ],
  [
    "Body/Strong",
    "14 / 22 · SemiBold",
    "text-body-strong",
    "Societatea Hermes",
  ],
  [
    "Caption/Default",
    "12 / 16 · Medium",
    "text-caption-default",
    "42 of 60 spots taken",
  ],
  ["Caption/Strong", "12 / 16 · SemiBold", "text-caption-strong", "PUBLISHED"],
  [
    "Label/Button",
    "14 / 20 · SemiBold",
    "text-label-button",
    "Register for event",
  ],
] as const;

function Foundations() {
  return (
    <main className="foundations-page">
      <AuthStatusMarker />
      <header className="foundations-header">
        <h1 className="text-heading-h1">Foundations</h1>
        <p className="text-body-large text-secondary">
          Palette-driven tokens, bound to Figma variables. Primitives → Semantic
          aliases.
        </p>
      </header>
      <section className="section" aria-labelledby="brand-palette">
        <h2 id="brand-palette" className="text-heading-h2">
          Brand palette
        </h2>
        <div className="palette-row">
          {palette.map(([name, hex, description, token]) => (
            <div className="swatch" key={name}>
              <div
                className="swatch-color"
                data-token={token}
                style={{ backgroundColor: `var(--color-${token})` }}
                aria-label={`${name} ${hex}`}
              />
              <p className="text-body-strong">{name}</p>
              <p className="text-caption-default text-muted">{hex}</p>
              <p className="text-caption-default text-secondary">
                {description}
              </p>
            </div>
          ))}
        </div>
      </section>
      <section className="section" aria-labelledby="status-colors">
        <h2 id="status-colors" className="text-heading-h2">
          Status colors
        </h2>
        <p className="text-body-default text-secondary">
          Muted, palette-harmonised tones used only for feedback states
          (published, pending, canceled).
        </p>
        <div className="status-row">
          {statuses.map(([name, hex, token]) => (
            <div className="status-card" key={name}>
              <div
                className="status-color"
                style={{ backgroundColor: token }}
                aria-label={`${name} ${hex}`}
              />
              <p className="text-body-strong">{name}</p>
              <p className="text-caption-default text-muted">{hex}</p>
            </div>
          ))}
        </div>
      </section>
      <section className="section" aria-labelledby="typography">
        <h2 id="typography" className="text-heading-h2">
          Typography — Plus Jakarta Sans
        </h2>
        <div className="type-card">
          {typeStyles.map(([name, meta, className, sample]) => (
            <div
              className="type-row"
              key={name}
              data-type-style={className.replace("text-", "")}
            >
              <div className="type-label">
                <p className="text-body-strong">{name}</p>
                <p className="text-caption-default text-muted">{meta}</p>
              </div>
              <p className={className}>{sample}</p>
            </div>
          ))}
        </div>
      </section>
      <section className="section" aria-labelledby="elevation-radius">
        <h2 id="elevation-radius" className="text-heading-h2">
          Elevation &amp; radius
        </h2>
        <div className="elevation-radius-row">
          <div className="elevation-row">
            <div
              className="elevation-demo"
              style={{ boxShadow: "var(--shadow-card)" }}
            >
              <span className="text-body-strong">Shadow/Card</span>
              <span className="text-caption-default text-muted">
                Cards, menus, dialogs
              </span>
            </div>
            <div
              className="elevation-demo"
              style={{ boxShadow: "var(--shadow-raised)" }}
            >
              <span className="text-body-strong">Shadow/Raised</span>
              <span className="text-caption-default text-muted">
                Cards, menus, dialogs
              </span>
            </div>
          </div>
          <div className="radius-row">
            {[
              ["radius/sm", "var(--radius-sm)"],
              ["radius/md", "var(--radius-md)"],
              ["radius/lg", "var(--radius-lg)"],
              ["radius/xl", "var(--radius-xl)"],
              ["radius/pill", "var(--radius-pill)"],
            ].map(([name, radius]) => (
              <div
                className="radius-demo text-caption-default"
                key={name}
                style={{ borderRadius: radius }}
              >
                {name}
              </div>
            ))}
          </div>
        </div>
      </section>
      <section className="section spacing-section" aria-labelledby="spacing">
        <h2 id="spacing" className="text-heading-h2">
          Spacing
        </h2>
        <div className="spacing-row">
          {Array.from({ length: 12 }, (_, index) => index + 1).map((step) => (
            <div className="spacing-demo" key={step}>
              <span style={{ width: `var(--space-${step})` }} />
              <small>{step * 4}px</small>
            </div>
          ))}
        </div>
      </section>
    </main>
  );
}

export default function App() {
  return (
    <Routes>
      <Route
        path="/components"
        element={
          <ToastProvider>
            <>
              <ComponentsDemo />
              <LayoutShowcase />
            </>
          </ToastProvider>
        }
      />
      <Route path="/foundations" element={<Foundations />} />
      <Route
        path="/login"
        element={
          <RedirectIfAuthenticated>
            <LoginPage />
          </RedirectIfAuthenticated>
        }
      />
      <Route
        path="/register"
        element={
          <RedirectIfAuthenticated>
            <RegisterPage />
          </RedirectIfAuthenticated>
        }
      />
      <Route path="/" element={<Navigate to="/events" replace />} />
      <Route
        path="/events"
        element={
          <RequireAuth>
            <AppShell>
              <DiscoverEventsPage />
            </AppShell>
          </RequireAuth>
        }
      />
      <Route
        path="/events/:eventId"
        element={authPage("page-event-details", "Event details")}
      />
      <Route
        path="/my-registrations"
        element={authPage("page-my-registrations", "My registrations")}
      />
      <Route path="/my-tasks" element={authPage("page-my-tasks", "My tasks")} />
      <Route
        path="/organizations"
        element={<RequireAuth><AppShell><OrganizationsListPage /></AppShell></RequireAuth>}
      />
      <Route
        path="/organizations/:organizationId"
        element={authPage("page-organization-details", "Organization details")}
      />
      <Route path="/profile" element={authPage("page-profile", "Profile")} />
      <Route
        path="/org/:organizationId/events"
        element={memberPage("page-org-events", "Organization events")}
      />
      <Route
        path="/org/:organizationId/events/new"
        element={managerPage("page-org-event-new", "Create event")}
      />
      <Route
        path="/org/:organizationId/events/:eventId/edit"
        element={managerPage("page-org-event-edit", "Edit event")}
      />
      <Route
        path="/org/:organizationId/events/:eventId/tasks"
        element={memberPage("page-org-event-tasks", "Event tasks")}
      />
      <Route
        path="/org/:organizationId/events/:eventId/registrations"
        element={memberPage("page-org-event-registrations", "Event registrations")}
      />
      <Route
        path="/org/:organizationId/events/:eventId/chat"
        element={memberPage("page-org-event-chat", "Event chat")}
      />
      <Route
        path="/org/:organizationId/events/:eventId/announcements"
        element={memberPage("page-org-event-announcements", "Event announcements")}
      />
      <Route
        path="/org/:organizationId/events/:eventId/follow-up"
        element={managerPage("page-org-event-follow-up", "Event follow-up")}
      />
      <Route
        path="/org/:organizationId/requests"
        element={managerPage("page-org-requests", "Membership requests")}
      />
      <Route
        path="/org/:organizationId/members"
        element={memberPage("page-org-members", "Organization members")}
      />
      <Route path="*" element={<Navigate to="/events" replace />} />
    </Routes>
  );
}
