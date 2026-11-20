import { useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { useParams } from "react-router-dom";
import { ApiError } from "../../shared/api/client";
import { Avatar, EmptyState, ErrorState, InfoBanner, SearchField, Skeleton } from "../../shared/ui";
import { ForbiddenPage } from "../errors/ErrorPages";
import { getEventRegistrations, getOrganizationEvent } from "./api";
import type { EventRegistration } from "./types";

function parseId(value: string | undefined) {
  if (!value || !/^\d+$/.test(value)) return null;
  const id = Number(value);
  return Number.isSafeInteger(id) && id > 0 ? id : null;
}

export function EventRegistrationsPage() {
  const { organizationId: rawOrganizationId, eventId: rawEventId } = useParams();
  const organizationId = parseId(rawOrganizationId);
  const eventId = parseId(rawEventId);
  const [search, setSearch] = useState("");
  const eventQuery = useQuery({ queryKey: ["organization-event", organizationId, eventId], queryFn: () => getOrganizationEvent(organizationId as number, eventId as number), enabled: organizationId !== null && eventId !== null });
  const registrationsQuery = useQuery({ queryKey: ["event-registrations", organizationId, eventId], queryFn: () => getEventRegistrations(organizationId as number, eventId as number), enabled: organizationId !== null && eventId !== null });
  const registrations = registrationsQuery.data ?? [];
  const query = search.trim().toLowerCase();
  const filtered = useMemo(() => registrations.filter((row) => `${row.firstName} ${row.lastName} ${row.email}`.toLowerCase().includes(query)), [registrations, query]);

  if (organizationId === null || eventId === null) return <main className="event-registrations-state" data-testid="event-registrations-error" role="alert"><h1>Registrations unavailable</h1><p>The event link is invalid.</p></main>;
  if (eventQuery.isLoading || registrationsQuery.isLoading) return <main className="event-registrations-state" data-testid="event-registrations-loading" role="status" aria-busy="true"><Skeleton width="100%" height={80} /><Skeleton width="100%" height={240} /></main>;
  if (registrationsQuery.isError && registrationsQuery.error instanceof ApiError && registrationsQuery.error.status === 403) return <ForbiddenPage variant="member" />;
  if (eventQuery.isError || registrationsQuery.isError || !eventQuery.data) return <main className="event-registrations-state" data-testid="event-registrations-error"><ErrorState title="Could not load registrations" onRetry={() => { void eventQuery.refetch(); void registrationsQuery.refetch(); }} testId="event-registrations-error" retryTestId="event-registrations-retry" /></main>;

  const event = eventQuery.data;
  const remaining = Math.max(0, (event.capacity ?? 0) - (event.registrationCount ?? 0));
  return <main className="event-registrations-page" data-testid="page-org-event-registrations">
    <div className="event-registrations-heading"><div><h2>Registrations</h2><p>Participants registered for this event.</p></div><SearchField aria-label="Search registrations" placeholder="Search by name or email" value={search} onChange={(e) => setSearch(e.target.value)} /></div>
    <div className="event-registrations-stats"><div className="event-registrations-stat"><strong>{event.registrationCount ?? registrations.length} / {event.capacity ?? "—"}</strong><span>Active registrations</span></div><div className="event-registrations-stat"><strong>{remaining}</strong><span>Places remaining</span></div></div>
    <InfoBanner>Registration details for this event are shown below.</InfoBanner>
    {filtered.length === 0 ? <div data-testid="event-registrations-empty"><EmptyState icon="Users" title="No registrations yet" description={query ? "Try a different name or email." : "Participants will appear here once they register."} /></div> : <div className="event-registrations-table-wrap"><table className="event-registrations-table" data-testid="event-registrations-table"><thead><tr><th scope="col">Participant</th><th scope="col">Email</th><th scope="col">Status</th></tr></thead><tbody>{filtered.map((row: EventRegistration) => <tr data-testid="event-registration-row" key={row.email}><td><Avatar firstName={row.firstName} lastName={row.lastName} size={48} /><span>{row.firstName} {row.lastName}</span></td><td>{row.email}</td><td><span className="event-registration-status">Active</span></td></tr>)}</tbody></table></div>}
  </main>;
}
