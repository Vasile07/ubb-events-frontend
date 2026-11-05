import { useEffect, useRef, useState, type ReactNode } from "react";
import { Link, useLocation } from "react-router-dom";
import { useAuth } from "../../features/auth/AuthProvider";
import { Avatar, Icon } from "./LayoutComponents";

function isPathActive(pathname: string, href: string) {
  if (href === "/events") return pathname === "/events" || pathname.startsWith("/events/");
  if (href === "/organizations") return pathname === "/organizations" || pathname.startsWith("/organizations/");
  return pathname === href;
}

export function AppShell({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const { pathname } = useLocation();
  const [workspaceOpen, setWorkspaceOpen] = useState(false);
  const workspaceRef = useRef<HTMLDivElement>(null);
  const workspaceTriggerRef = useRef<HTMLButtonElement>(null);
  const workspaceItemRefs = useRef<Array<HTMLAnchorElement | null>>([]);
  const memberships = user?.memberships ?? [];
  const navItems = [
    { label: "Discover", href: "/events", testId: "nav-events" },
    { label: "My registrations", href: "/my-registrations", testId: "nav-my-registrations" },
    { label: "My tasks", href: "/my-tasks", testId: "nav-my-tasks" },
    { label: "Organizations", href: "/organizations", testId: "nav-organizations" },
  ];

  useEffect(() => {
    if (!workspaceOpen) return;
    workspaceItemRefs.current[0]?.focus();
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setWorkspaceOpen(false);
    };
    const onPointerDown = (event: PointerEvent) => {
      if (workspaceRef.current && !workspaceRef.current.contains(event.target as Node)) setWorkspaceOpen(false);
    };
    document.addEventListener("keydown", onKeyDown);
    document.addEventListener("pointerdown", onPointerDown);
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.removeEventListener("pointerdown", onPointerDown);
    };
  }, [workspaceOpen]);

  function closeWorkspace(restoreFocus = true) {
    setWorkspaceOpen(false);
    if (restoreFocus) workspaceTriggerRef.current?.focus();
  }

  function moveWorkspaceFocus(index: number) {
    const count = memberships.length;
    if (!count) return;
    const next = (index + count) % count;
    workspaceItemRefs.current[next]?.focus();
  }

  const workspaceLabel = (organizationId: number, organizationName?: string) => organizationName || `Organization ${organizationId}`;
  const profileActive = pathname === "/profile";

  return (
    <div className="app-shell" data-testid="app-shell">
      <header className="app-shell-header">
        <Link to="/events" className="app-logo" data-testid="app-logo" aria-label="UBB Events home">
          <span className="app-logo-mark" aria-hidden="true">U</span>
          <span>UBB Events</span>
        </Link>
        <nav className="app-nav" data-testid="app-nav" aria-label="Primary navigation">
          {navItems.map((item) => (
            <Link key={item.href} to={item.href} data-testid={item.testId} className={isPathActive(pathname, item.href) ? "is-active" : undefined} aria-current={isPathActive(pathname, item.href) ? "page" : undefined}>
              {item.label}
            </Link>
          ))}
          {memberships.length === 1 && (
            <Link data-testid="workspace-nav" to={`/org/${memberships[0].organizationId}/events`} className={`app-nav-workspace${pathname.startsWith("/org/") ? " is-active" : ""}`} aria-current={pathname.startsWith("/org/") ? "page" : undefined}>Workspace</Link>
          )}
          {memberships.length > 1 && (
            <div className="workspace-picker-wrap" ref={workspaceRef} onBlur={(event) => { if (!event.currentTarget.contains(event.relatedTarget as Node | null)) closeWorkspace(false); }}>
              <button ref={workspaceTriggerRef} type="button" data-testid="workspace-nav" className={`app-nav-button${pathname.startsWith("/org/") ? " is-active" : ""}`} aria-expanded={workspaceOpen} aria-haspopup="menu" onClick={() => setWorkspaceOpen((open) => !open)} onKeyDown={(event) => { if (event.key === "ArrowDown" || event.key === "Enter" || event.key === " ") { event.preventDefault(); setWorkspaceOpen(true); } }}>Workspace <span aria-hidden="true">⌄</span></button>
              {workspaceOpen && (
                <div className="workspace-picker" data-testid="workspace-picker" role="menu" aria-label="Choose a workspace" onKeyDown={(event) => { const current = workspaceItemRefs.current.indexOf(document.activeElement as HTMLAnchorElement); if (event.key === "ArrowDown") { event.preventDefault(); moveWorkspaceFocus(current + 1); } else if (event.key === "ArrowUp") { event.preventDefault(); moveWorkspaceFocus(current - 1); } else if (event.key === "Home") { event.preventDefault(); moveWorkspaceFocus(0); } else if (event.key === "End") { event.preventDefault(); moveWorkspaceFocus(memberships.length - 1); } else if (event.key === "Escape") { event.preventDefault(); closeWorkspace(); } }}>
                  {memberships.map((membership, index) => (
                    <Link ref={(element) => { workspaceItemRefs.current[index] = element; }} key={membership.organizationId} id={`workspace-picker-link-${membership.organizationId}`} data-testid={`workspace-picker-link-${membership.organizationId}`} role="menuitem" to={`/org/${membership.organizationId}/events`} onClick={() => closeWorkspace(false)}>
                      {workspaceLabel(membership.organizationId, membership.organizationName)}
                    </Link>
                  ))}
                </div>
              )}
            </div>
          )}
        </nav>
        <div className="app-shell-actions">
          <button type="button" data-testid="notification-button" className="app-icon-button" aria-label="Notifications"><Icon name="bell" /></button>
          <Link to="/profile" data-testid="profile-link" className={profileActive ? "app-profile is-active" : "app-profile"}>
            <Avatar firstName={user?.firstName ?? ""} lastName={user?.lastName ?? ""} size={36} />
            <span>{user?.fullName}</span>
          </Link>
          {profileActive && <span data-testid="nav-profile-state" data-variant="None" hidden />}
        </div>
      </header>
      <main className="app-shell-content">{children}</main>
    </div>
  );
}
