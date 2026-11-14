import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { ApiError } from "../../shared/api/client";
import { getOrganizations, requestOrganizationMembership } from "../../shared/api/organizations";
import type { OrganizationMembershipStatus, OrganizationResponse } from "../../shared/api/types";
import { Badge, Button, EmptyState, ErrorState, SearchField, Skeleton, useToast } from "../../shared/ui";

function statusLabel(status: OrganizationMembershipStatus): string {
  return status === "MEMBER" ? "Member" : status === "PENDING" ? "Pending" : "Open to join";
}

function statusTone(status: OrganizationMembershipStatus) {
  return status === "MEMBER" ? "Success" : status === "PENDING" ? "Warning" : "Neutral";
}

function OrganizationCard({ organization, onPending }: { organization: OrganizationResponse; onPending: (id: number) => void }) {
  const toast = useToast();
  const [requesting, setRequesting] = useState(false);
  const [status, setStatus] = useState<OrganizationMembershipStatus>(organization.status);

  async function requestMembership() {
    setRequesting(true);
    try {
      await requestOrganizationMembership(organization.organizationId);
      setStatus("PENDING");
      onPending(organization.organizationId);
      toast.success("Request sent", "Your membership request is waiting for approval.");
    } catch (error) {
      if (error instanceof ApiError && error.status === 409) {
        setStatus("PENDING");
        onPending(organization.organizationId);
        toast.success("Request already pending", "Your membership request is waiting for approval.");
      } else {
        toast.error("Request failed", "We couldn't send your membership request. Try again.");
      }
    } finally {
      setRequesting(false);
    }
  }

  return (
    <article className="organization-card" data-testid={`organization-card-${organization.organizationId}`}>
      <div className="organization-card-top">
        <div className="organization-icon-tile" aria-hidden="true"><img src="/ui-assets/figma-building.svg" alt="" /></div>
        <Badge tone={statusTone(status) as "Success" | "Warning" | "Neutral"}>{statusLabel(status)}</Badge>
      </div>
      <div>
        <h2 className="organization-card-name">{organization.name}</h2>
        <p className="organization-card-description">{organization.description || "No description available."}</p>
      </div>
      <div className="organization-card-action">
        {status === "MEMBER" ? (
          <Link className="ui-button ui-button-secondary ui-button-md" to={`/org/${organization.organizationId}/events`}>Open organization</Link>
        ) : status === "PENDING" ? (
          <Button variant="Secondary" disabled>Waiting for approval</Button>
        ) : (
          <Button data-testid={`request-membership-${organization.organizationId}`} loading={requesting} onClick={requestMembership}>Request membership</Button>
        )}
      </div>
    </article>
  );
}

export function OrganizationsListPage() {
  const [search, setSearch] = useState("");
  const [pendingIds, setPendingIds] = useState<Set<number>>(new Set());
  const query = useQuery({ queryKey: ["organizations", "list"], queryFn: getOrganizations });
  const normalizedSearch = search.trim().toLowerCase();
  const organizations = useMemo(() => (query.data ?? []).map((item) => pendingIds.has(item.organizationId) ? { ...item, status: "PENDING" as const } : item).filter((item) => item.name.toLowerCase().includes(normalizedSearch)), [query.data, normalizedSearch, pendingIds]);

  return (
    <main className="organizations-page" data-testid="page-organizations">
      <span data-testid="organizations-page" hidden />
      <header className="organizations-header">
        <div><p className="text-caption-strong text-brand">DISCOVER</p><h1 className="text-heading-h1">Organizations</h1><p className="text-body-large text-secondary">Join a student organization and find your community.</p></div>

      </header>
      <SearchField data-testid="organization-search" aria-label="Search organizations" placeholder="Search organizations" value={search} onChange={(event) => setSearch(event.target.value)} />
      {query.isLoading ? <div className="organizations-grid" aria-busy="true">{[1, 2, 3].map((id) => <div className="organization-card organization-card-skeleton" data-testid="organization-card-skeleton" key={id}><Skeleton height={48} width={48} /><Skeleton height={24} /><Skeleton height={16} /><Skeleton height={44} /></div>)}</div> : query.isError ? <ErrorState title="We couldn’t load organizations" description="Check your connection and try again." onRetry={() => void query.refetch()} /> : organizations.length === 0 ? <EmptyState testId="organizations-empty" title="No organizations match" description="Try a different search." /> : <div className="organizations-grid">{organizations.map((organization) => <OrganizationCard key={organization.organizationId} organization={organization} onPending={(id) => setPendingIds((current) => new Set(current).add(id))} />)}</div>}
    </main>
  );
}
