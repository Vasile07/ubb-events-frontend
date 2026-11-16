import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { ApiError } from "../../shared/api/client";
import { Badge, Button, useToast, type BadgeTone } from "../../shared/ui";
import { EventForm } from "./EventForm";
import { getOrganizationEvent, updateOrganizationEvent } from "./api";
import type { EventFormValues } from "./eventFormTypes";

export function EventEditPage() {
  const organizationId = Number(useParams().organizationId); const eventId = Number(useParams().eventId); const navigate = useNavigate(); const toast = useToast(); const client = useQueryClient();
  const query = useQuery({ queryKey: ["organization-event", organizationId, eventId], queryFn: () => getOrganizationEvent(organizationId, eventId), enabled: Number.isSafeInteger(organizationId) && Number.isSafeInteger(eventId) });
  const [error, setError] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  if (query.isLoading) return <main data-testid="event-edit-loading" role="status">Loading event…</main>;
  if (query.isError || !query.data || typeof query.data !== "object" || !("startTime" in query.data)) return <main data-testid="page-org-event-edit" role="alert"><h1>Could not load event</h1><Button onClick={() => query.refetch()}>Retry</Button></main>;
  const event = query.data; const terminal = event.status === "CANCELED" || event.status === "COMPLETED";
  const statusTone: Record<string, BadgeTone> = { DRAFT: "Warning", PUBLISHED: "Success", COMPLETED: "Info", CANCELED: "Danger" };
  const initial: Partial<EventFormValues> = { title: event.title, description: event.description, location: event.location ?? "", startDate: event.date, startTime: event.startTime.slice(0, 5), endDate: event.date, endTime: event.endTime?.slice(0, 5) ?? "", capacity: String(event.capacity ?? ""), activeRegistrations: event.registrationCount, status: event.status, tasks: [] };
  const submit = async (values: EventFormValues) => { setError({}); setSubmitting(true); try { await updateOrganizationEvent(organizationId, eventId, values, event.categoryId); await client.invalidateQueries({ queryKey: ["organization-event", organizationId, eventId] }); await client.invalidateQueries({ queryKey: ["organization-events", organizationId] }); await client.invalidateQueries({ queryKey: ["events", "discover"] }); toast.success("Event updated", "Your changes were saved."); navigate(`/org/${organizationId}/events/${eventId}/tasks`); } catch (e) { if (e instanceof ApiError) { setError(e.fieldErrors); if (!Object.keys(e.fieldErrors).length) toast.error("Could not update event", e.message); } else toast.error("Could not update event", "Please try again."); } finally { setSubmitting(false); } };
  return <main data-testid="event-edit-page" className="event-edit-page"><Link data-testid="event-edit-back" className="event-edit-back" to={`/org/${organizationId}/events/${eventId}/tasks`}>← Back to event</Link><div className="event-edit-heading"><div data-testid="event-edit-heading-row"><h1>Edit event</h1><Badge data-testid="event-edit-status" tone={statusTone[event.status]}>{event.status[0] + event.status.slice(1).toLowerCase()}</Badge></div><p data-testid="event-edit-helper">Changes are visible to participants right after saving.</p></div>{terminal && <p role="alert">This event can no longer be edited.</p>}{!terminal && <EventForm mode="edit" organizationId={organizationId} initialValues={initial} onSubmit={submit} submitting={submitting} fieldErrors={error} submitLabel="Save changes" onCancel={() => navigate(`/org/${organizationId}/events/${eventId}/tasks`)} />}</main>;
}
