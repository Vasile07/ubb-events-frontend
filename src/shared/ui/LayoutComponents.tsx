import { useEffect, useId, useRef, useState, type HTMLAttributes, type ReactNode } from "react";

export type IconName =
  | "calendar" | "pin" | "clock" | "users" | "building" | "bell" | "check" | "x" | "plus"
  | "send" | "lock" | "trash" | "edit" | "info" | "alert" | "chevrons" | "arrow-left"
  | "search" | "ticket" | "megaphone" | "tasks" | "shield" | "logout";

const iconSources: Partial<Record<IconName, string>> = {
  calendar: "/ui-assets/figma-calendar.svg",
  pin: "/ui-assets/figma-pin.svg",
  clock: "/ui-assets/figma-clock.svg",
  users: "/ui-assets/figma-users.svg",
  building: "/ui-assets/figma-building.svg",
  bell: "/ui-assets/figma-bell.svg",
  trash: "/ui-assets/figma-trash.svg",
  info: "/ui-assets/figma-info.svg",
  "arrow-left": "/ui-assets/figma-arrow-left.svg",
  search: "/ui-assets/search.svg",
  ticket: "/ui-assets/figma-ticket.svg",
};

const iconPaths: Partial<Record<IconName, string>> = {
  check: "M20 6 9 17l-5-5",
  x: "m18 6-12 12M6 6l12 12",
  plus: "M12 5v14M5 12h14",
  send: "m22 2-7 20-4-9-9-4 20-7ZM22 2 11 13",
  lock: "M5 11h14v10H5zM8 11V7a4 4 0 0 1 8 0v4",
  edit: "m16 4 4 4M4 20l4-.8L19 8a2.1 2.1 0 0 0-3-3L5 16z",
  alert: "M12 3 2.5 20h19L12 3ZM12 9v4M12 17h.01",
  chevrons: "m7 10 5-5 5 5M7 14l5 5 5-5",
  megaphone: "m3 11 18-5v12L3 14v-3ZM11 15l2 6H8l-3-7M21 6v12",
  tasks: "M9 6h11M9 12h11M9 18h11M4 6h.01M4 12h.01M4 18h.01",
  shield: "M12 3 20 6v6c0 4.5-3.2 7.4-8 9-4.8-1.6-8-4.5-8-9V6z",
  logout: "M10 17l5-5-5-5M15 12H3M21 3v18",
};

export function Icon({ name, label, ...props }: { name: IconName; label?: string } & HTMLAttributes<HTMLSpanElement>) {
  return (
    <span
      className="ui-icon"
      data-testid={`icon-${name}`}
      role={label ? "img" : undefined}
      aria-label={label}
      aria-hidden={label ? undefined : true}
      {...props}
    >
      {iconSources[name] ? (
        <img src={iconSources[name]} alt="" />
      ) : (
        <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
          <path d={iconPaths[name]} />
        </svg>
      )}
    </span>
  );
}

export type AuthFeature = { icon: IconName; label: string };

const defaultFeatures: AuthFeature[] = [
  { icon: "calendar", label: "Search and filter events by organization and date" },
  { icon: "ticket", label: "Register and manage your places" },
  { icon: "users", label: "Join organizations and coordinate tasks" },
];

export function AuthLayout({
  children,
  brandName = "UBB Events",
  heading = "Every campus event, in one place.",
  description = "Discover what student organizations are planning, register in a tap and keep organizers in sync.",
  features = defaultFeatures,
  footer = "Babeș-Bolyai University · Student organizations",
  testId,
}: {
  children: ReactNode;
  brandName?: string;
  heading?: string;
  description?: string;
  features?: AuthFeature[];
  footer?: ReactNode;
  testId?: string;
}) {
  return (
    <div className="ui-auth-layout" data-testid={testId}>
      <aside className="ui-auth-brand">
        <div className="ui-auth-brand-top">
          <span className="ui-auth-logo-mark" aria-hidden="true">U</span>
          <strong>{brandName}</strong>
        </div>
        <div className="ui-auth-brand-content">
          <h1 className="ui-auth-headline">{heading}</h1>
          <p className="ui-auth-description">{description}</p>
          <ul className="ui-auth-features">
            {features.map((feature) => (
              <li className="ui-auth-feature" data-testid="auth-feature" key={`${feature.icon}-${feature.label}`}>
                <span className="ui-auth-feature-icon" aria-hidden="true"><Icon name={feature.icon} /></span>
                <span>{feature.label}</span>
              </li>
            ))}
          </ul>
        </div>
        <footer className="ui-auth-footer">{footer}</footer>
      </aside>
      <section className="ui-auth-panel" aria-label="Authentication form">
        <div className="ui-auth-form-content">{children}</div>
      </section>
    </div>
  );
}

export function Tabs({
  items,
  variant = "pill",
  label = "Tabs",
}: {
  items: string[];
  variant?: "pill" | "underline";
  label?: string;
}) {
  const [active, setActive] = useState(0);
  const tabRefs = useRef<Array<HTMLButtonElement | null>>([]);

  function activate(index: number) {
    if (items.length === 0) return;
    const nextIndex = (index + items.length) % items.length;
    setActive(nextIndex);
    tabRefs.current[nextIndex]?.focus();
  }

  return (
    <div className={`ui-tabs ui-tabs-${variant}`} data-testid={`tabs-${variant}`} role="tablist" aria-label={label}>
      {items.map((item, index) => (
        <button
          key={item}
          ref={(element) => { tabRefs.current[index] = element; }}
          type="button"
          role="tab"
          aria-selected={active === index}
          tabIndex={active === index ? 0 : -1}
          className={active === index ? "is-active" : ""}
          onClick={() => setActive(index)}
          onKeyDown={(event) => {
            if (event.key === "ArrowRight") { event.preventDefault(); activate(index + 1); }
            if (event.key === "ArrowLeft") { event.preventDefault(); activate(index - 1); }
            if (event.key === "Home") { event.preventDefault(); activate(0); }
            if (event.key === "End") { event.preventDefault(); activate(items.length - 1); }
          }}
        >
          {item}
        </button>
      ))}
    </div>
  );
}

export type TableColumn<T> = { key: keyof T & string; header: string; width?: string };

export function Table<T extends Record<string, ReactNode>>({
  columns,
  rows,
  empty = "No results",
  testId = "table-demo",
}: {
  columns: TableColumn<T>[];
  rows: T[];
  empty?: ReactNode;
  testId?: string;
}) {
  return (
    <div className="ui-table-wrap">
      <table data-testid={testId}>
        <thead><tr>{columns.map((column) => <th key={column.key} scope="col" style={column.width ? { width: column.width } : undefined}>{column.header}</th>)}</tr></thead>
        <tbody>
          {rows.length ? rows.map((row, index) => <tr key={index}>{columns.map((column) => <td key={column.key}>{row[column.key]}</td>)}</tr>) : (
            <tr><td colSpan={columns.length} className="ui-table-empty">{empty}</td></tr>
          )}
        </tbody>
      </table>
    </div>
  );
}

export function Modal({ open, title, onClose, children }: { open: boolean; title: string; onClose: () => void; children: ReactNode }) {
  const dialogRef = useRef<HTMLDivElement>(null);
  const closeRef = useRef(onClose);
  const titleId = useId();
  closeRef.current = onClose;

  useEffect(() => {
    if (!open) return;
    const previousFocus = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const dialog = dialogRef.current;
    if (!dialog) return;
    const focusableElements = () => [...dialog.querySelectorAll<HTMLElement>(
      "button:not([disabled]), a[href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex='-1'])",
    )].filter((element) => element.getAttribute("aria-hidden") !== "true");
    (focusableElements()[0] ?? dialog).focus();

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") { closeRef.current(); return; }
      if (event.key !== "Tab") return;
      const focusable = focusableElements();
      if (focusable.length === 0) { event.preventDefault(); dialog.focus(); return; }
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
    };
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      previousFocus?.focus();
    };
  }, [open]);

  if (!open) return null;
  return (
    <div className="ui-modal-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}>
      <div className="ui-modal" role="dialog" aria-modal="true" aria-labelledby={titleId} tabIndex={-1} ref={dialogRef}>
        <button className="ui-modal-close" type="button" aria-label="Close" onClick={onClose}><Icon name="x" /></button>
        <h2 id={titleId}>{title}</h2>
        {children}
      </div>
    </div>
  );
}

export function InfoBanner({ tone = "info", children }: { tone?: "info" | "warning"; children: ReactNode }) {
  return (
    <div className={`ui-info-banner ui-info-banner-${tone}`} data-testid={`info-banner-${tone}`} role={tone === "warning" ? "alert" : "status"}>
      <Icon name={tone === "warning" ? "alert" : "info"} />
      <span>{children}</span>
    </div>
  );
}

export function Avatar({
  firstName = "",
  lastName = "",
  size = 48,
  testId,
  ...props
}: { firstName?: string; lastName?: string; size?: 36 | 48 | 80; testId?: string } & HTMLAttributes<HTMLSpanElement>) {
  const initials = `${firstName.trim()[0] ?? ""}${lastName.trim()[0] ?? ""}`.toUpperCase() || "?";
  const name = `${firstName} ${lastName}`.trim() || "Unknown user";
  return <span {...props} className={`ui-avatar ui-avatar-${size} ${props.className ?? ""}`.trim()} data-testid={testId ?? `avatar-${size}`} role="img" aria-label={name}>{initials}</span>;
}

export function ProgressBar({ value, max = 100, label = "Capacity", testId = "progress-bar" }: { value: number; max?: number; label?: string; testId?: string }) {
  const safeMax = Number.isFinite(max) ? Math.max(0, max) : 0;
  const safeValue = Number.isFinite(value) ? Math.max(0, value) : 0;
  const normalized = Math.min(safeValue, safeMax);
  const percent = safeMax === 0 ? 0 : (normalized / safeMax) * 100;
  return <div className="ui-progress" data-testid={testId} role="progressbar" aria-label={label} aria-valuemin={0} aria-valuemax={safeMax} aria-valuenow={normalized}><span style={{ width: `${percent}%` }} /></div>;
}

export function DateBlock({ month, day }: { month: string; day: string | number }) {
  return <div className="ui-date-block" data-testid="date-block" role="group" aria-label={`${month} ${day}`}><span>{month.slice(0, 3).toUpperCase()}</span><strong>{day}</strong></div>;
}

export function InfoTile({ icon, label, value }: { icon: ReactNode; label: string; value: ReactNode }) {
  return <div className="ui-info-tile" data-testid="info-tile"><span className="ui-info-tile-icon" aria-hidden="true">{icon}</span><span><small>{label}</small><strong>{value}</strong></span></div>;
}

export function PageHeader({ title, subtitle, rightSlot }: { title: string; subtitle?: string; rightSlot?: ReactNode }) {
  return <header className="ui-page-header" data-testid="page-header"><div><h1>{title}</h1>{subtitle && <p>{subtitle}</p>}</div>{rightSlot && <div className="ui-page-header-actions">{rightSlot}</div>}</header>;
}

export function LayoutShowcase() {
  const [open, setOpen] = useState(false);
  const columns: TableColumn<{ name: string; status: string }>[] = [
    { key: "name", header: "Event" },
    { key: "status", header: "Status", width: "160px" },
  ];
  const icons: IconName[] = ["calendar", "pin", "clock", "users", "building", "bell", "check", "x", "plus", "send", "lock", "trash", "edit", "info", "alert", "chevrons", "arrow-left", "search", "ticket", "megaphone", "tasks", "shield", "logout"];

  return (
    <>
      <AuthLayout testId="auth-layout-demo">
        <h2>Welcome back</h2>
        <p>Sign in to see your events and organizations.</p>
      </AuthLayout>
      <main className="components-page">
        <h1 className="text-heading-h1">Base UI components</h1>
      <section><h2>Tabs</h2><Tabs items={["Upcoming", "Past"]} /><Tabs variant="underline" items={["Overview", "Tasks", "Members"]} /></section>
      <section><h2>Table</h2><Table columns={columns} rows={[{ name: "Campus night", status: "Published" }]} /><Table testId="table-empty-demo" columns={columns} rows={[]} empty="No registrations" /></section>
      <section>
        <h2>Feedback and data</h2>
        <InfoBanner>Registration is open.</InfoBanner>
        <InfoBanner tone="warning">Only a few spots remain.</InfoBanner>
        <div className="components-row">
          <Avatar firstName="Irimies" lastName="Vasile" size={36} /><Avatar firstName="Irimies" lastName="Vasile" size={48} /><Avatar firstName="Irimies" lastName="Vasile" size={80} /><Avatar testId="avatar-fallback" />
          <ProgressBar value={42} max={60} /><ProgressBar value={80} max={60} testId="progress-over-capacity" />
          <DateBlock month="November" day={12} /><InfoTile icon={<Icon name="calendar" />} label="Date" value="12 Nov" />
        </div>
      </section>
      <PageHeader title="Events" subtitle="Manage your organization events" rightSlot={<button type="button">Create event</button>} />
      <section data-testid="modal-demo">
        <button className="ui-button ui-button-primary ui-button-md" data-testid="open-modal" type="button" onClick={() => setOpen(true)}>Open modal</button>
        <Modal open={open} title="Delete event" onClose={() => setOpen(false)}>
          <p>Are you sure?</p>
          <button type="button" data-testid="confirm-modal-action">Delete event</button>
        </Modal>
      </section>
      <div className="components-row" aria-label="Icons" data-testid="icon-showcase">{icons.map((name) => <Icon key={name} name={name} label={name} />)}</div>
      </main>
    </>
  );
}
