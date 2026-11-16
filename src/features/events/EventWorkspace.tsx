import { useQuery } from "@tanstack/react-query";
import { Link, useLocation, useParams } from "react-router-dom";
import { ApiError } from "../../shared/api/client";
import { ForbiddenPage } from "../errors/ErrorPages";
import { Badge, type BadgeTone } from "../../shared/ui/Badge";
import { getOrganizationEvent } from "./api";
import type { OrganizationEvent, OrganizationEventStatus } from "./types";
import type { ReactNode } from "react";

const statusLabel: Record<OrganizationEventStatus, string> = { DRAFT: "Draft", PUBLISHED: "Published", COMPLETED: "Completed", CANCELED: "Canceled" };
const statusTone: Record<OrganizationEventStatus, BadgeTone> = { DRAFT: "Warning", PUBLISHED: "Success", COMPLETED: "Info", CANCELED: "Danger" };
function parseId(value: string | undefined): number | null { if (!value || !/^\d+$/.test(value)) return null; const id = Number(value); return Number.isSafeInteger(id) && id > 0 ? id : null; }
function formatDate(value: string) { const date = new Date(`${value}T00:00:00`); return Number.isNaN(date.getTime()) ? value : new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short", year: "numeric" }).format(date); }
function formatTime(value: string | null) { return value ? value.slice(0, 5) : "—"; }

export function EventWorkspace({ children }: { children: ReactNode }) {
  const { organizationId: rawOrganizationId, eventId: rawEventId } = useParams();
  const organizationId = parseId(rawOrganizationId); const eventId = parseId(rawEventId); const location = useLocation();
  const query = useQuery({ queryKey: ["organization-event", organizationId, eventId], queryFn: () => getOrganizationEvent(organizationId as number, eventId as number), enabled: organizationId !== null && eventId !== null });
  if (organizationId === null || eventId === null) return <main className="event-workspace-state" data-testid="event-workspace-not-found" role="alert"><h1>Event not found</h1><p>The event link is invalid.</p></main>;
  if (query.isLoading) return <main className="event-workspace-state" data-testid="event-workspace-loading" role="status" aria-busy="true">Loading event…</main>;
  if (query.isError && query.error instanceof ApiError && query.error.status === 403) return <ForbiddenPage variant="member" />;
  if (query.isError || !query.data) { const notFound = query.error instanceof ApiError && query.error.status === 404; return <main className="event-workspace-state" data-testid={notFound ? "event-workspace-not-found" : "event-workspace-error"} role="alert"><h1>{notFound ? "Event not found" : "Could not load event"}</h1><p>We could not load this event workspace.</p><button type="button" onClick={() => void query.refetch()}>Retry</button></main>; }
  const event: OrganizationEvent = query.data; const base = `/org/${organizationId}/events/${eventId}`;
  const tabs = [["Tasks", `${base}/tasks`, "tasks"], ["Registrations", `${base}/registrations`, "registrations"], ["Organizer chat", `${base}/chat`, "chat"], ["Announcements", `${base}/announcements`, "announcements"], ["Follow-up", `${base}/follow-up`, "follow-up"]] as const;
  return <div className="event-workspace" data-testid="event-workspace"><header className="event-workspace-header"><Link className="event-workspace-back" to={`/org/${organizationId}/events`}>← Back to events</Link><div className="event-workspace-title-row"><div><h1 data-testid="event-workspace-title">{event.title}</h1><Badge tone={statusTone[event.status]} data-testid="event-workspace-status">{statusLabel[event.status]}</Badge></div><div data-testid="event-workspace-actions" /></div><div className="event-workspace-meta"><span>{formatDate(event.date)}</span><span>{formatTime(event.startTime)} – {formatTime(event.endTime)}</span><span data-testid="event-workspace-location">{event.location ?? "Location to be announced"}</span><span>{event.capacity ?? "—"} places</span></div>{event.status === "CANCELED" && <div className="event-workspace-canceled" data-testid="event-workspace-canceled" role="status">This event is canceled and read-only.</div>}<nav className="event-workspace-tabs" data-testid="event-workspace-tabs" aria-label="Event navigation">{tabs.map(([label, href, key]) => <Link key={href} to={href} data-testid={`event-workspace-tab-${key}`} aria-current={location.pathname === href ? "page" : undefined} className={location.pathname === href ? "is-active" : undefined}>{label}</Link>)}</nav></header><div className="event-workspace-content">{children}</div></div>;
}
