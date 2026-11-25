import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState, type FormEvent } from "react";
import { useParams } from "react-router-dom";
import { ApiError } from "../../shared/api/client";
import { Button, EmptyState, ErrorState, InfoBanner, Skeleton, TextArea, useToast } from "../../shared/ui";
import { useAuth } from "../auth/AuthProvider";
import { getEventAnnouncements, getEventFollowUp, getEventRegistrations, getEventTasks, getOrganizationEvent, createEventFollowUp } from "./api";

function parseId(value: string | undefined) { if (!value || !/^\d+$/.test(value)) return null; const id = Number(value); return Number.isSafeInteger(id) && id > 0 ? id : null; }

export function EventFollowUpPage() {
  const { organizationId: rawOrganizationId, eventId: rawEventId } = useParams();
  const organizationId = parseId(rawOrganizationId); const eventId = parseId(rawEventId);
  const { isManagerOf } = useAuth(); const manager = organizationId !== null && isManagerOf(organizationId);
  const queryClient = useQueryClient(); const toast = useToast(); const [content, setContent] = useState(""); const [formError, setFormError] = useState(""); const [contentError, setContentError] = useState("");
  const eventQuery = useQuery({ queryKey: ["organization-event", organizationId, eventId], queryFn: () => getOrganizationEvent(organizationId as number, eventId as number), enabled: organizationId !== null && eventId !== null });
  const followUpQuery = useQuery({ queryKey: ["event-follow-up", organizationId, eventId], queryFn: () => getEventFollowUp(organizationId as number, eventId as number), enabled: organizationId !== null && eventId !== null, retry: (count, error) => !(error instanceof ApiError && error.status === 404) && count < 2 });
  const registrationsQuery = useQuery({ queryKey: ["event-registrations", organizationId, eventId], queryFn: () => getEventRegistrations(organizationId as number, eventId as number), enabled: organizationId !== null && eventId !== null });
  const tasksQuery = useQuery({ queryKey: ["event-tasks", organizationId, eventId], queryFn: () => getEventTasks(organizationId as number, eventId as number), enabled: organizationId !== null && eventId !== null });
  const announcementsQuery = useQuery({ queryKey: ["event-announcements", organizationId, eventId], queryFn: () => getEventAnnouncements(eventId as number), enabled: organizationId !== null && eventId !== null });
  const mutation = useMutation({ mutationFn: () => createEventFollowUp(organizationId as number, eventId as number, content.trim()), onSuccess: async (saved) => { await queryClient.setQueryData(["event-follow-up", organizationId, eventId], saved); setContent(""); setFormError(""); setContentError(""); toast.success("Follow-up saved", "The event follow-up was saved."); }, onError: (error) => { if (error instanceof ApiError) { setFormError(error.message); setContentError(error.fieldErrors.content ?? ""); } else setFormError("Could not save follow-up."); } });

  if (organizationId === null || eventId === null) return <main data-testid="event-follow-up-error" role="alert"><h1>Follow-up unavailable</h1><p>The event link is invalid.</p></main>;
  if (eventQuery.isLoading || followUpQuery.isLoading || registrationsQuery.isLoading || tasksQuery.isLoading || announcementsQuery.isLoading) return <main data-testid="event-follow-up-loading" role="status" aria-busy="true"><Skeleton width="100%" height={100} /><Skeleton width="100%" height={220} /></main>;
  const expected404 = followUpQuery.error instanceof ApiError && followUpQuery.error.status === 404;
  if (eventQuery.isError || registrationsQuery.isError || tasksQuery.isError || announcementsQuery.isError || (followUpQuery.isError && !expected404)) return <main data-testid="event-follow-up-error" role="alert"><ErrorState title="Could not load event follow-up" onRetry={() => { void eventQuery.refetch(); void followUpQuery.refetch(); void registrationsQuery.refetch(); void tasksQuery.refetch(); void announcementsQuery.refetch(); }} /></main>;
  const event = eventQuery.data; if (!event) return <main data-testid="event-follow-up-error" role="alert">Event not found.</main>;
  const ended = Boolean(event.date && event.endTime) && new Date(`${event.date}T${event.endTime}`).getTime() < Date.now(); const saved = expected404 ? undefined : followUpQuery.data; const canCreate = manager && ended && !saved && event.status !== "CANCELED";
  const submit = (e: FormEvent) => { e.preventDefault(); if (!content.trim()) { setFormError("Content is required."); setContentError("Content is required."); return; } setFormError(""); setContentError(""); mutation.mutate(); };
  return <main className="event-follow-up-page" data-testid="event-follow-up-page"><InfoBanner>Share what went well and what should improve after this event.</InfoBanner><div className="event-follow-up-layout"><section><h2>Event follow-up</h2>{saved ? <div data-testid="follow-up-read-view"><p>{saved.content}</p><p role="note">Editing is not available after saving.</p></div> : canCreate ? <form onSubmit={submit}><TextArea data-testid="follow-up-content" id="follow-up-content" label="Follow-up" error={contentError} value={content} onChange={(e) => { setContent(e.target.value); setContentError(""); }} disabled={mutation.isPending} height={180} />{formError && <p role="alert">{formError}</p>}<Button type="submit" loading={mutation.isPending} disabled={mutation.isPending}>Save follow-up</Button></form> : <div data-testid="follow-up-locked"><EmptyState icon="Calendar" title="Follow-up is not available" description={ended ? "Only organization managers can add a follow-up." : "The follow-up form unlocks after the event has ended."} /></div>}</section><aside><h2>Event recap</h2><dl><div><dt>Registered participants</dt><dd data-testid="recap-registrations">{registrationsQuery.data?.length ?? event.registrationCount ?? 0}</dd></div><div><dt>Tasks</dt><dd data-testid="recap-tasks">{tasksQuery.data?.length ?? 0}</dd></div><div><dt>Announcements</dt><dd data-testid="recap-announcements">{announcementsQuery.data?.length ?? 0}</dd></div></dl></aside></div></main>;
}
