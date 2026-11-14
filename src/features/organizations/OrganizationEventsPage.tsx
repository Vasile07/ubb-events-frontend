import { useQuery } from "@tanstack/react-query";
import { useState, type KeyboardEvent, type ReactNode } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { useAuth } from "../auth/AuthProvider";
import { getOrganizationEvents } from "../events/api";
import type { OrganizationEvent, OrganizationEventStatus } from "../events/types";
import { formatEventDate } from "../../shared/lib/formatEventDate";
import { Badge, type BadgeTone } from "../../shared/ui/Badge";
import { EmptyState, ErrorState, TableSkeleton } from "../../shared/ui/FeedbackComponents";
import { PageHeader, Table, type TableColumn } from "../../shared/ui/LayoutComponents";

type EventFilter = "ALL" | OrganizationEventStatus;
type EventRow = {
  event: ReactNode;
  date: ReactNode;
  status: ReactNode;
  registrations: ReactNode;
  action: ReactNode;
};

const filters: Array<{ value: EventFilter; label: string }> = [
  { value: "ALL", label: "All" },
  { value: "DRAFT", label: "Drafts" },
  { value: "PUBLISHED", label: "Published" },
  { value: "COMPLETED", label: "Completed" },
  { value: "CANCELED", label: "Canceled" },
];

const statusLabel: Record<OrganizationEventStatus, string> = {
  DRAFT: "Draft",
  PUBLISHED: "Published",
  COMPLETED: "Completed",
  CANCELED: "Canceled",
};

const statusTone: Record<OrganizationEventStatus, BadgeTone> = {
  DRAFT: "Warning",
  PUBLISHED: "Success",
  COMPLETED: "Info",
  CANCELED: "Danger",
};

const columns: TableColumn<EventRow>[] = [
  { key: "event", header: "Event", width: "36%" },
  { key: "date", header: "Date", width: "18%" },
  { key: "status", header: "Status", width: "14%" },
  { key: "registrations", header: "Registrations", width: "18%" },
  { key: "action", header: "", width: "14%" },
];

function parseOrganizationId(value: string | undefined): number | null {
  if (!value || !/^\d+$/.test(value)) return null;
  const parsed = Number(value);
  return Number.isSafeInteger(parsed) && parsed > 0 ? parsed : null;
}

function countFor(events: OrganizationEvent[], filter: EventFilter): number {
  return filter === "ALL"
    ? events.length
    : events.filter((event) => event.status === filter).length;
}

function formatDate(event: OrganizationEvent): string {
  return formatEventDate(`${event.date}T${event.startTime || "00:00:00"}Z`);
}

function EventAction({ event, organizationId, manager }: {
  event: OrganizationEvent;
  organizationId: number;
  manager: boolean;
}) {
  if (event.status === "CANCELED") {
    return <Link className="org-events-view-link" to={`/events/${event.id}`} aria-label={`View ${event.title}`}>View</Link>;
  }

  if (event.status === "COMPLETED" && manager) {
    return <Link className="ui-button ui-button-primary ui-button-sm" to={`/org/${organizationId}/events/${event.id}/follow-up`} aria-label={`Add follow-up for ${event.title}`}>Add follow-up</Link>;
  }

  return <Link className="ui-button ui-button-secondary ui-button-sm" to={`/org/${organizationId}/events/${event.id}/tasks`} aria-label={`Manage ${event.title}`}>Manage</Link>;
}

function EventRowContent({ event, organizationId, manager }: {
  event: OrganizationEvent;
  organizationId: number;
  manager: boolean;
}) {
  return {
    event: <span className="org-events-event-cell"><strong>{event.title}</strong><small>{event.location ?? "—"}</small></span>,
    date: formatDate(event),
    status: <Badge tone={statusTone[event.status]}>{statusLabel[event.status]}</Badge>,
    registrations: event.status === "DRAFT" ? "—" : `${event.registrationCount} / ${event.capacity ?? "—"}`,
    action: <EventAction event={event} organizationId={organizationId} manager={manager} />,
  };
}

export function OrganizationEventsPage() {
  const { organizationId: rawOrganizationId } = useParams();
  const organizationId = parseOrganizationId(rawOrganizationId);
  const navigate = useNavigate();
  const { isManagerOf } = useAuth();
  const manager = organizationId !== null && isManagerOf(organizationId);
  const [activeFilter, setActiveFilter] = useState<EventFilter>("ALL");
  const eventsQuery = useQuery({
    queryKey: ["organization-events", organizationId],
    queryFn: () => getOrganizationEvents(organizationId as number),
    enabled: organizationId !== null,
  });

  if (organizationId === null) {
    return <main data-testid="organization-events-invalid" role="alert">Invalid organization.</main>;
  }

  const events = eventsQuery.data ?? [];
  const filteredEvents = events.filter((event) =>
    activeFilter === "ALL" || event.status === activeFilter,
  );
  const rows: EventRow[] = filteredEvents.map((event) =>
    EventRowContent({ event, organizationId, manager }),
  );

  function handleTabKeyDown(event: KeyboardEvent<HTMLButtonElement>, index: number) {
    let nextIndex: number | null = null;
    if (event.key === "ArrowRight") nextIndex = (index + 1) % filters.length;
    if (event.key === "ArrowLeft") nextIndex = (index + filters.length - 1) % filters.length;
    if (event.key === "Home") nextIndex = 0;
    if (event.key === "End") nextIndex = filters.length - 1;
    if (nextIndex === null) return;
    event.preventDefault();
    setActiveFilter(filters[nextIndex].value);
    document.getElementById(`organization-events-tab-${filters[nextIndex].value}`)?.focus();
  }

  return (
    <main className="org-events-page" data-testid="page-org-events">
      <PageHeader
        title="Events"
        subtitle="All events of your organization, including drafts."
        rightSlot={manager ? <Link className="ui-button ui-button-primary ui-button-md" to={`/org/${organizationId}/events/new`}>Create event</Link> : undefined}
      />

      <div className="ui-tabs ui-tabs-pill org-events-tabs" data-testid="organization-events-tabs" role="tablist" aria-label="Organization event status">
        {filters.map((filter, index) => (
          <button
            id={`organization-events-tab-${filter.value}`}
            key={filter.value}
            type="button"
            role="tab"
            aria-selected={activeFilter === filter.value}
            tabIndex={activeFilter === filter.value ? 0 : -1}
            className={activeFilter === filter.value ? "is-active" : ""}
            onClick={() => setActiveFilter(filter.value)}
            onKeyDown={(event) => handleTabKeyDown(event, index)}
          >
            {filter.label}{eventsQuery.isLoading ? "" : ` · ${countFor(events, filter.value)}`}
          </button>
        ))}
      </div>

      {eventsQuery.isLoading && <TableSkeleton rows={6} />}
      {eventsQuery.isError && (
        <ErrorState
          title="We couldn’t load organization events"
          description="Check your connection and try again."
          errorCode="EVENTS_UNAVAILABLE"
          onRetry={() => void eventsQuery.refetch()}
          testId="organization-events-error"
          retryTestId="organization-events-retry"
        />
      )}
      {eventsQuery.isSuccess && events.length === 0 && (
        <EmptyState
          icon="Calendar"
          title="No events yet"
          description="Create an event to start planning with your organization."
          actionLabel={manager ? "Create event" : undefined}
          onAction={manager ? () => navigate(`/org/${organizationId}/events/new`) : undefined}
          testId="empty-state-calendar"
        />
      )}
      {eventsQuery.isSuccess && events.length > 0 && (
        <Table
          columns={columns}
          rows={rows}
          empty="No events in this category."
          testId="organization-events-table"
        />
      )}
    </main>
  );
}
