import { useMutation, useQueries, useQueryClient } from "@tanstack/react-query";
import { useState, type KeyboardEvent } from "react";
import { useParams } from "react-router-dom";
import { ApiError } from "../../shared/api/client";
import { decideMembershipRequest, getMembershipRequestDetails } from "../../shared/api/organizations";
import type { MembershipDecision, MembershipRequestDetailsResponse, MembershipRequestDetailsStatus } from "../../shared/api/types";
import { Badge, Button, EmptyState, ErrorState, InfoBanner, PageHeader, Avatar, TableSkeleton, useToast } from "../../shared/ui";
import { invalidateMembershipRequestDetails, invalidateMembershipRequests, invalidateOrganizationMembers, organizationMembershipRequestDetailsKey } from "./membershipRequestQueries";

const statuses: Array<{ value: MembershipRequestDetailsStatus; label: string }> = [
  { value: "PENDING", label: "Pending" },
  { value: "ACCEPTED", label: "Accepted" },
  { value: "DECLINED", label: "Declined" },
];

function parseId(value: string | undefined): number | null {
  if (!value || !/^\d+$/.test(value)) return null;
  const parsed = Number(value);
  return Number.isSafeInteger(parsed) && parsed > 0 ? parsed : null;
}

function formatRequestedAt(value: string | null): string {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return new Intl.DateTimeFormat("en-GB", { day: "2-digit", month: "short", year: "numeric" }).format(date);
}

function tone(status: MembershipRequestDetailsStatus) {
  return status === "PENDING" ? "Warning" : status === "ACCEPTED" ? "Success" : "Danger";
}

export function MembershipRequestsPage() {
  const organizationId = parseId(useParams().organizationId);
  const [activeStatus, setActiveStatus] = useState<MembershipRequestDetailsStatus>("PENDING");
  const [busyRequestId, setBusyRequestId] = useState<number | null>(null);
  const queryClient = useQueryClient();
  const toast = useToast();
  const queries = useQueries({
    queries: statuses.map(({ value }) => ({
      queryKey: organizationId === null ? ["organization-membership-request-details", "invalid", value] : organizationMembershipRequestDetailsKey(organizationId, value),
      queryFn: () => getMembershipRequestDetails(organizationId as number, value),
      enabled: organizationId !== null,
    })),
  });
  const activeIndex = statuses.findIndex(({ value }) => value === activeStatus);
  const activeQuery = queries[activeIndex];
  const rows = (activeQuery?.data ?? []) as MembershipRequestDetailsResponse[];

  const mutation = useMutation({
    mutationFn: ({ requestId, decision }: { requestId: number; decision: MembershipDecision }) => decideMembershipRequest(organizationId as number, requestId, decision),
    onMutate: ({ requestId }) => setBusyRequestId(requestId),
    onSuccess: (_result, { decision }) => {
      void invalidateMembershipRequestDetails(queryClient, organizationId as number);
      void invalidateMembershipRequests(queryClient, organizationId as number);
      void invalidateOrganizationMembers(queryClient, organizationId as number);
      toast.success(decision === "ACCEPTED" ? "Request accepted" : "Request declined", decision === "ACCEPTED" ? "The student is now a member." : "The membership request was declined.");
    },
    onError: (error) => toast.error("Could not update request", error instanceof ApiError ? error.message : "Please try again."),
    onSettled: () => setBusyRequestId(null),
  });

  function handleTabKeyDown(event: KeyboardEvent<HTMLButtonElement>, index: number) {
    let next: number | null = null;
    if (event.key === "ArrowRight") next = (index + 1) % statuses.length;
    if (event.key === "ArrowLeft") next = (index + statuses.length - 1) % statuses.length;
    if (event.key === "Home") next = 0;
    if (event.key === "End") next = statuses.length - 1;
    if (next === null) return;
    event.preventDefault();
    setActiveStatus(statuses[next].value);
    document.getElementById(`membership-requests-tab-${statuses[next].value}`)?.focus();
  }

  if (organizationId === null) return <div data-testid="membership-requests-invalid" role="alert">Invalid organization.</div>;
  if (queries.some((query) => query.isLoading)) return <div className="membership-requests-page" data-testid="page-membership-requests" aria-busy="true"><PageHeader title="Membership requests" subtitle="Review students who want to join Societatea Hermes." /><TableSkeleton rows={3} /></div>;
  if (activeQuery?.isError) return <div className="membership-requests-page" data-testid="page-membership-requests"><PageHeader title="Membership requests" subtitle="Review students who want to join Societatea Hermes." /><ErrorState title="We couldn’t load membership requests" description="Check your connection and try again." testId="membership-requests-error" retryTestId="membership-requests-retry" onRetry={() => void activeQuery.refetch()} /></div>;

  const tabs = (
    <div className="ui-tabs ui-tabs-pill membership-requests-tabs" role="tablist" aria-label="Membership request status">
      {statuses.map(({ value, label }, index) => (
        <button key={value} id={`membership-requests-tab-${value}`} type="button" role="tab" aria-selected={activeStatus === value} aria-controls={`membership-requests-panel-${value}`} tabIndex={activeStatus === value ? 0 : -1} className={activeStatus === value ? "is-active" : ""} onClick={() => setActiveStatus(value)} onKeyDown={(event) => handleTabKeyDown(event, index)}>{label} · {queries[index]?.isError ? "—" : ((queries[index]?.data ?? []) as unknown[]).length}</button>
      ))}
    </div>
  );

  return (
    <div className="membership-requests-page" data-testid="page-membership-requests">
      <PageHeader title="Membership requests" subtitle="Review students who want to join Societatea Hermes." rightSlot={tabs} />
      <section id={`membership-requests-panel-${activeStatus}`} role="tabpanel" aria-labelledby={`membership-requests-tab-${activeStatus}`}>
        {rows.length === 0 ? <EmptyState icon="Users" title={`No ${activeStatus.toLowerCase()} requests`} description="Requests will appear here when they are available." testId="membership-requests-empty" /> : (
          <div className="ui-table-wrap membership-requests-table-wrap"><table className="membership-requests-table"><thead><tr><th scope="col">Applicant</th><th scope="col">Requested</th><th scope="col">Status</th><th scope="col" aria-label="Actions"></th></tr></thead><tbody>
            {rows.map((row) => <tr data-testid="membership-request-row" key={row.requestId}><td><div className="membership-request-applicant"><Avatar firstName={row.firstName} lastName={row.lastName} size={36} /><span><strong>{row.firstName} {row.lastName}</strong><small>{row.email}</small></span></div></td><td data-testid="membership-request-date">{formatRequestedAt(row.requestedAt)}</td><td><Badge tone={tone(row.status) as never}>{row.status[0] + row.status.slice(1).toLowerCase()}</Badge></td><td><div className="membership-request-actions">{row.status === "PENDING" && <><Button aria-label={`Accept ${row.firstName} ${row.lastName}`} data-testid="membership-request-accept" size="Sm" loading={busyRequestId === row.requestId && mutation.variables?.decision === "ACCEPTED"} disabled={busyRequestId !== null} onClick={() => mutation.mutate({ requestId: row.requestId, decision: "ACCEPTED" })}>Accept</Button><Button aria-label={`Decline ${row.firstName} ${row.lastName}`} data-testid="membership-request-decline" size="Sm" variant="Secondary" loading={busyRequestId === row.requestId && mutation.variables?.decision === "DECLINED"} disabled={busyRequestId !== null} onClick={() => mutation.mutate({ requestId: row.requestId, decision: "DECLINED" })}>Decline</Button></>}</div></td></tr>)}
          </tbody></table></div>
        )}
      </section>
      <InfoBanner>Accepting a request adds the student as a member. Declined students can request to join again later.</InfoBanner>
    </div>
  );
}
