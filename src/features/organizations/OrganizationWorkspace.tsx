import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Link, useLocation, useParams } from "react-router-dom";
import { useAuth } from "../auth/AuthProvider";
import { getMembershipRequests, getOrganization } from "../../shared/api/organizations";
import { organizationMembershipRequestsKey } from "./membershipRequestQueries";
import { ApiError } from "../../shared/api/client";
import { Badge } from "../../shared/ui/Badge";
import type { ReactNode } from "react";

function parseId(value: string | undefined): number | null {
  if (!value || !/^\d+$/.test(value)) return null;
  const id = Number(value);
  return Number.isSafeInteger(id) && id > 0 ? id : null;
}

function active(pathname: string, segment: string) {
  return pathname.includes(`/org/`) && pathname.includes(segment);
}

function WorkspaceIcon({ src }: { src: string }) {
  return <img className="workspace-nav-icon" src={src} alt="" aria-hidden="true" />;
}

export function invalidateOrganizationMembershipRequests(queryClient: ReturnType<typeof useQueryClient>, organizationId: number) {
  return queryClient.invalidateQueries({ queryKey: organizationMembershipRequestsKey(organizationId) });
}

export function OrganizationWorkspace({ children }: { children: ReactNode }) {
  const { organizationId: rawId } = useParams();
  const organizationId = parseId(rawId);
  const location = useLocation();
  const { isManagerOf, user } = useAuth();
  const manager = organizationId !== null && isManagerOf(organizationId);
  const organization = useQuery({
    queryKey: ["organization", organizationId],
    queryFn: () => getOrganization(organizationId as number),
    enabled: organizationId !== null,
  });
  const requests = useQuery({
    queryKey: organizationId === null ? ["organization-membership-requests", "invalid"] : organizationMembershipRequestsKey(organizationId),
    queryFn: () => getMembershipRequests(organizationId as number),
    enabled: manager && organizationId !== null,
  });

  if (organizationId === null) return <main data-testid="workspace-error" role="alert">Invalid organization.</main>;
  if (organization.isLoading) return <main className="organization-workspace-state" data-testid="workspace-loading" role="status" aria-busy="true">Loading organization…</main>;
  if (organization.isError) {
    const notFound = organization.error instanceof ApiError && organization.error.status === 404;
    return <main className="organization-workspace-state" data-testid="workspace-error" role="alert"><h1>{notFound ? "Organization not found" : "Could not load organization"}</h1><p>We could not load this organization workspace.</p><button type="button" data-testid="workspace-retry" onClick={() => void organization.refetch()}>Retry</button></main>;
  }

  const data = organization.data ?? {
    organizationId,
    name: `Organization ${organizationId}`,
    description: null,
    role: "MEMBER" as const,
    status: "MEMBER" as const,
  };
  const role = user?.memberships.find((membership) => membership.organizationId === organizationId)?.role ?? "MEMBER";
  const pendingCount = manager && requests.isSuccess ? requests.data.length : 0;
  const links = [
    { label: "Events", href: `/org/${organizationId}/events`, icon: "calendar", testId: "workspace-nav-events", isActive: active(location.pathname, "/events") },
    ...(manager ? [{ label: "Membership requests", href: `/org/${organizationId}/requests`, icon: "user-plus", testId: "workspace-membership-requests", isActive: active(location.pathname, "/requests") }] : []),
    { label: "Members", href: `/org/${organizationId}/members`, icon: "users", testId: "workspace-nav-members", isActive: active(location.pathname, "/members") },
  ];

  return <div className="organization-workspace" data-testid="organization-workspace">
    <aside className="organization-workspace-sidebar" aria-label={`${data.name} workspace`}>
      <div className="workspace-org-header">
        <div className="workspace-org-icon"><img src="/ui-assets/workspace-building.svg" alt="" aria-hidden="true" /></div>
        <div><strong data-testid="workspace-organization-name">{data.name}</strong><span>{data.description ?? "Organization"}</span></div>
      </div>
      <Badge tone="Brand" data-testid="workspace-role-badge">{role === "MANAGER" ? "Manager" : "Member"}</Badge>
      <div className="workspace-divider" />
      <nav className="workspace-nav" aria-label="Organization navigation">
        {links.map((link) => {
          const iconAsset = `/ui-assets/workspace-${link.icon}${link.isActive ? "-active" : "-inactive"}.svg`;
          return <Link key={link.href} to={link.href} data-testid={link.testId} className={link.isActive ? "is-active" : undefined} aria-current={link.isActive ? "page" : undefined}><WorkspaceIcon src={iconAsset} /><span>{link.label}</span>{link.label === "Membership requests" && <span className="workspace-count" aria-label={`${pendingCount} pending membership requests`}>{requests.isError ? "—" : pendingCount}</span>}</Link>;
        })}
      </nav>
      <div className="workspace-spacer" />
      <Link to="/events" data-testid="workspace-back-discover"><WorkspaceIcon src="/ui-assets/workspace-arrow-left.svg" /><span>Back to discover</span></Link>
    </aside>
    <main className="organization-workspace-main" data-testid="workspace-main">{children}</main>
  </div>;
}
