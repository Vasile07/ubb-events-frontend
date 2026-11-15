import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useParams } from "react-router-dom";
import { ApiError } from "../../shared/api/client";
import { Badge, Button, EmptyState, ErrorState, Skeleton, useToast } from "../../shared/ui";
import { Icon, Modal, ProgressBar } from "../../shared/ui/LayoutComponents";
import { getEventBadge } from "../../shared/lib/eventStatus";
import { cancelRegistration, getEvent, getEventAnnouncements, registerForEvent } from "./api";
import type { EventDetails } from "./types";

function formatDate(date: string, startTime: string) {
  const value = new Date(`${date}T${startTime}`);
  return value.toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short" }) + ` · ${startTime.slice(0, 5)}`;
}

function eventStart(event: EventDetails) { return new Date(`${event.date}T${event.startTime}`).getTime(); }
function eventEnd(event: EventDetails) { return new Date(`${event.date}T${event.endTime ?? event.startTime}`).getTime(); }

function actionState(event: EventDetails) {
  if (event.status === "CANCELED") return { label: "Registration unavailable", disabled: true, reason: "This event was canceled." };
  if (eventEnd(event) <= Date.now()) return { label: "Registration unavailable", disabled: true, reason: "This event is completed." };
  if (eventStart(event) <= Date.now()) return { label: "Registration unavailable", disabled: true, reason: "This event has already started." };
  if (event.registrationStatus === "REGISTERED") return { label: "Cancel registration", disabled: false, reason: "" };
  if (!event.registrationAvailable) return { label: "Registration unavailable", disabled: true, reason: "This event is full." };
  return { label: "Register for event", disabled: false, reason: "" };
}

export function EventDetailsPage() {
  const eventId = Number(useParams().eventId);
  const queryClient = useQueryClient();
  const toast = useToast();
  const [confirming, setConfirming] = useState(false);
  useEffect(() => { if (!confirming) return; const onKeyDown = (event: KeyboardEvent) => { if (event.key === "Escape") setConfirming(false); }; window.addEventListener("keydown", onKeyDown); return () => window.removeEventListener("keydown", onKeyDown); }, [confirming]);
  const eventQuery = useQuery({ queryKey: ["event", eventId], queryFn: () => getEvent(eventId), enabled: Number.isSafeInteger(eventId) });
  const event = eventQuery.data;
  const announcementsQuery = useQuery({ queryKey: ["announcements", eventId], queryFn: () => getEventAnnouncements(eventId), enabled: Boolean(event && event.registrationStatus === "REGISTERED"), retry: false });

  const mutation = useMutation<unknown, unknown, boolean, { previous?: EventDetails }>({
    mutationFn: async (cancel) => { if (cancel) await cancelRegistration(eventId); else await registerForEvent(eventId); },
    onMutate: async (cancel) => {
      await queryClient.cancelQueries({ queryKey: ["event", eventId] });
      const previous = queryClient.getQueryData<EventDetails>(["event", eventId]);
      if (previous) queryClient.setQueryData<EventDetails>(["event", eventId], { ...previous, registrationStatus: cancel ? "NOT_REGISTERED" : "REGISTERED", registrationCount: Math.max(0, previous.registrationCount + (cancel ? -1 : 1)), registrationAvailable: cancel || previous.registrationCount + 1 < previous.capacity });
      return { previous };
    },
    onError: (error, _cancel, context) => {
      if (context?.previous) queryClient.setQueryData(["event", eventId], context.previous);
      if (error instanceof ApiError && error.status === 409) void eventQuery.refetch();
      toast.error("Couldn’t update registration", error instanceof Error ? error.message : "Please try again.");
    },
    onSuccess: (_data, cancel) => { toast.success(cancel ? "Registration canceled" : "Registration confirmed", cancel ? "Your place has been released." : "Your place is reserved."); },
    onSettled: () => { void queryClient.invalidateQueries({ queryKey: ["event", eventId] }); void queryClient.invalidateQueries({ queryKey: ["my-registrations"] }); void queryClient.invalidateQueries({ queryKey: ["events", "discover"] }); },
  });

  if (eventQuery.isLoading) return <main className="event-details-page" data-testid="event-details-page"><span data-testid="page-event-details">Event details</span><Skeleton width="60%" height={36} /><Skeleton width="100%" height={260} /></main>;
  if (eventQuery.isError || !event || !event.organization) return <main className="event-details-page" data-testid="event-details-page"><span data-testid="page-event-details">Event details</span><ErrorState title="We couldn’t load this event" onRetry={() => void eventQuery.refetch()} /></main>;
  const lifecycleStatus = event.status === "CANCELED" ? "CANCELED" : eventEnd(event) <= Date.now() ? "COMPLETED" : "OPEN";
  const badge = getEventBadge({ status: lifecycleStatus, capacity: event.capacity, spotsTaken: event.registrationCount }, event.registrationStatus === "REGISTERED" ? "REGISTERED" : "NONE");
  const action = actionState(event);
  const registered = event.registrationStatus === "REGISTERED";
  return <main className="event-details-page" data-testid="event-details-page"><span data-testid="page-event-details">Event details</span>
    <section className="event-details-hero"><div><Badge tone={badge.tone}>{badge.label}</Badge><p className="event-details-org">{event.organization.name}</p><h1>{event.title}</h1></div></section>
    <div className="event-details-layout"><div className="event-details-main">
      <div className="event-details-tiles"><div className="ui-info-tile"><Icon name="calendar" /><span><small>Date &amp; time</small><strong>{formatDate(event.date, event.startTime)}</strong></span></div><div className="ui-info-tile"><Icon name="pin" /><span><small>Location</small><strong>{event.location ?? "Location to be announced"}</strong></span></div></div>
      <section className="event-details-about"><h2>About this event</h2><p>{event.description}</p><div className="event-registration-info"><Icon name="info" /><span>Registration is available while places remain.</span></div></section>
      {registered && announcementsQuery.isLoading && <section data-testid="announcements-card"><h2>Announcements</h2><Skeleton width="100%" height={80} /></section>}
      {registered && announcementsQuery.isSuccess && announcementsQuery.data.length === 0 && <section data-testid="announcements-card"><h2>Announcements</h2><EmptyState icon="Calendar" title="No announcements yet" description="Updates from the organizers will appear here." /></section>}
      {registered && announcementsQuery.isSuccess && announcementsQuery.data.length > 0 && <section className="event-announcements-card" data-testid="announcements-card"><h2>Announcements</h2><div className="event-announcements-list">{announcementsQuery.data.map((announcement) => <article className="event-announcement" key={announcement.id}><h3>{announcement.title}</h3><p>{announcement.content}</p></article>)}</div></section>}
      {registered && announcementsQuery.isError && (announcementsQuery.error instanceof ApiError && announcementsQuery.error.status === 403 ? null : <section data-testid="announcements-card"><ErrorState title="Announcements unavailable" /></section>)}
    </div><aside className="event-details-sidebar">
      <section className="event-registration-card" data-testid="registration-card"><h2>{registered ? "You’re registered" : "Register for this event"}</h2><p className="event-places">{event.registrationCount} of {event.capacity} places taken</p><ProgressBar value={event.registrationCount} max={event.capacity} label="Places taken" testId="registration-progress" />{action.reason && <p className="event-action-reason">{action.reason}</p>}<Button data-testid={registered ? "cancel-registration" : "register-event"} variant={registered ? "Danger" : "Primary"} disabled={action.disabled || mutation.isPending} onClick={() => registered ? setConfirming(true) : mutation.mutate(false)}>{action.label}</Button></section>
      <section className="event-organizer-card"><h2>Organizer</h2><p>{event.organization.name}</p><a href={`/organizations/${event.organization.id}`}>View organization</a></section>
    </aside></div>
    <Modal open={confirming} title="Cancel registration?" onClose={() => setConfirming(false)}><p>Your place will be released.</p><Button variant="Danger" onClick={() => { setConfirming(false); mutation.mutate(true); }}>Cancel registration</Button><Button variant="Secondary" onClick={() => setConfirming(false)}>Keep registration</Button></Modal>
  </main>;
}
