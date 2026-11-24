import React from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useParams } from "react-router-dom";
import { ApiError } from "../../shared/api/client";
import { Button, EmptyState, ErrorState, Skeleton, TextArea, TextField, useToast } from "../../shared/ui";
import { createEventAnnouncement, getEventAnnouncements, getOrganizationEvent } from "./api";
import { AnnouncementItem } from "./AnnouncementItem";
import type { AnnouncementResponse } from "./types";

function parseId(value: string | undefined) {
  if (!value || !/^\d+$/.test(value)) return null;
  const parsed = Number(value);
  return Number.isSafeInteger(parsed) && parsed > 0 ? parsed : null;
}

export function EventAnnouncementsPage() {
  const { organizationId: rawOrganizationId, eventId: rawEventId } = useParams();
  const organizationId = parseId(rawOrganizationId);
  const eventId = parseId(rawEventId);
  const queryClient = useQueryClient();
  const toast = useToast();
  const [title, setTitle] = React.useState("");
  const [content, setContent] = React.useState("");
  const [formError, setFormError] = React.useState("");
  const [fieldErrors, setFieldErrors] = React.useState<{ title?: string; content?: string }>({});

  const eventQuery = useQuery({
    queryKey: ["organization-event", organizationId, eventId],
    queryFn: () => getOrganizationEvent(organizationId as number, eventId as number),
    enabled: organizationId !== null && eventId !== null,
  });
  const announcementsQuery = useQuery({
    queryKey: ["event-announcements", organizationId, eventId],
    queryFn: () => getEventAnnouncements(eventId as number),
    enabled: organizationId !== null && eventId !== null,
  });
  const mutation = useMutation({
    mutationFn: () => createEventAnnouncement(organizationId as number, eventId as number, { title: title.trim(), content: content.trim() }),
    onSuccess: async () => {
      setTitle("");
      setContent("");
      setFormError("");
      setFieldErrors({});
      await queryClient.invalidateQueries({ queryKey: ["event-announcements", organizationId, eventId] });
      toast.success("Announcement published", "The announcement is now visible to participants.");
    },
    onError: (error) => {
      if (error instanceof ApiError) {
        setFormError(error.message);
        setFieldErrors(error.fieldErrors as { title?: string; content?: string });
      } else setFormError("Could not publish announcement.");
    },
  });

  if (organizationId === null || eventId === null) return <main role="alert">Event announcements link is invalid.</main>;
  if (eventQuery.isLoading || announcementsQuery.isLoading) return <main data-testid="event-announcements-loading" role="status">Loading announcements…<Skeleton width="100%" height={80} /></main>;
  if (eventQuery.isError || announcementsQuery.isError) return <main data-testid="event-announcements-error" role="alert"><ErrorState title="Announcements unavailable" /><button type="button" onClick={() => { void eventQuery.refetch(); void announcementsQuery.refetch(); }}>Retry</button></main>;

  const event = eventQuery.data;
  const canceled = event?.status === "CANCELED";
  const announcements = [...(announcementsQuery.data ?? [])].sort((a, b) => b.id - a.id);
  const submit = (event: React.FormEvent) => {
    event.preventDefault();
    const errors: { title?: string; content?: string } = {};
    if (!title.trim()) errors.title = "Title is required.";
    if (!content.trim()) errors.content = "Content is required.";
    setFieldErrors(errors);
    setFormError(Object.keys(errors).length ? "Title and content are required." : "");
    if (!Object.keys(errors).length) mutation.mutate();
  };

  return (
    <main className="event-announcements-page" data-testid="page-org-event-announcements">
      <div data-testid="event-announcements-page">
      <div className="event-announcements-layout">
        <section className="event-announcements-feed" aria-labelledby="event-announcements-title">
          <h2 id="event-announcements-title">Published announcements</h2>
          <p className="event-announcements-helper">Seen by registered participants and organization members.</p>
          {announcements.length === 0 ? <EmptyState icon="Calendar" title="No announcements yet" description="Updates from the organizers will appear here." testId="event-announcements-empty" /> : <div className="event-announcements-list">{announcements.map((announcement: AnnouncementResponse) => <AnnouncementItem key={announcement.id} announcement={announcement} />)}</div>}
        </section>
        <form className="event-announcement-composer" data-testid="announcement-composer" onSubmit={submit}>
          <h2>New announcement</h2>
          <TextField data-testid="announcement-title" id="announcement-title" label="Title" placeholder="e.g. Schedule update" value={title} onChange={(e) => { setTitle(e.target.value); setFieldErrors((current) => ({ ...current, title: undefined })); }} error={fieldErrors.title} disabled={canceled || mutation.isPending} />
          <TextArea data-testid="announcement-content" id="announcement-content" label="Content" placeholder="Write the announcement…" value={content} onChange={(e) => { setContent(e.target.value); setFieldErrors((current) => ({ ...current, content: undefined })); }} error={fieldErrors.content} disabled={canceled || mutation.isPending} height={100} />
          <Button type="submit" disabled={canceled || mutation.isPending} loading={mutation.isPending}>Publish announcement</Button>
          {canceled && <p role="status">This event is canceled. Announcements are disabled.</p>}
          {formError && <p role="alert">{formError}</p>}
        </form>
      </div>
      </div>
    </main>
  );
}
