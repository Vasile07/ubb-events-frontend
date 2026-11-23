import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useMemo, useRef, useState } from "react";
import { useParams } from "react-router-dom";
import { ApiError } from "../../shared/api/client";
import { getOrganizationMembers } from "../../shared/api/organizations";
import type { OrganizationMemberResponse } from "../../shared/api/types";
import { Button, Icon, TextArea } from "../../shared/ui";
import { useAuth } from "../auth/AuthProvider";
import { getEventMessages, getOrganizationEvent, sendEventMessage } from "./api";
import type { EventMessage } from "./types";

function id(value: string | undefined) {
  if (!value || !/^\d+$/.test(value)) return null;
  const result = Number(value);
  return Number.isSafeInteger(result) && result > 0 ? result : null;
}

function initials(member: OrganizationMemberResponse | undefined, senderId: number) {
  if (!member) return `U${senderId}`;
  return `${member.firstName?.[0] ?? ""}${member.lastName?.[0] ?? ""}`.toUpperCase();
}

function displayName(member: OrganizationMemberResponse | undefined, senderId: number) {
  return member ? `${member.firstName} ${member.lastName}` : `User ${senderId}`;
}

function messageTime(value: string | null) {
  if (!value) return "";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "" : new Intl.DateTimeFormat(undefined, { hour: "2-digit", minute: "2-digit" }).format(date);
}

export function EventOrganizerChatPage() {
  const { organizationId: rawOrganizationId, eventId: rawEventId } = useParams();
  const organizationId = id(rawOrganizationId);
  const eventId = id(rawEventId);
  const { user } = useAuth();
  const [draft, setDraft] = useState("");
  const [formError, setFormError] = useState("");
  const viewportRef = useRef<HTMLDivElement>(null);
  const wasNearBottom = useRef(true);
  const queryClient = useQueryClient();
  const eventQuery = useQuery({
    queryKey: ["organization-event", organizationId, eventId],
    queryFn: () => getOrganizationEvent(organizationId as number, eventId as number),
    enabled: organizationId !== null && eventId !== null,
  });
  const messagesQuery = useQuery({
    queryKey: ["event-messages", organizationId, eventId],
    queryFn: () => getEventMessages(organizationId as number, eventId as number),
    enabled: organizationId !== null && eventId !== null,
    refetchInterval: 5000,
  });
  const membersQuery = useQuery({
    queryKey: ["organization-members", organizationId],
    queryFn: () => getOrganizationMembers(organizationId as number),
    enabled: organizationId !== null,
  });
  const memberMap = useMemo(() => new Map((membersQuery.data ?? []).map((member) => [member.id, member])), [membersQuery.data]);
  const canceled = eventQuery.data?.status === "CANCELED";
  const mutation = useMutation({
    mutationFn: (content: string) => sendEventMessage(organizationId as number, eventId as number, content),
    onSuccess: async () => {
      setDraft("");
      setFormError("");
      await queryClient.invalidateQueries({ queryKey: ["event-messages", organizationId, eventId] });
    },
    onError: (error) => setFormError(error instanceof ApiError ? error.message : "Could not send message."),
  });

  useEffect(() => {
    const viewport = viewportRef.current;
    if (!viewport || !wasNearBottom.current) return;
    viewport.scrollTop = viewport.scrollHeight;
  }, [messagesQuery.data]);

  if (organizationId === null || eventId === null) return <main role="alert">Event chat link is invalid.</main>;
  if (messagesQuery.isLoading || eventQuery.isLoading) return <main data-testid="event-organizer-chat-loading" role="status">Loading conversation…</main>;
  if (messagesQuery.isError || eventQuery.isError) return <main data-testid="event-organizer-chat-error" role="alert"><p>Could not load the conversation.</p><button type="button" onClick={() => { void messagesQuery.refetch(); void eventQuery.refetch(); }}>Retry</button></main>;

  const messages = messagesQuery.data ?? [];
  const submit = () => {
    const content = draft.trim();
    if (!content) return setFormError("Message is required.");
    if (content.length > 1000) return setFormError("Message must be at most 1000 characters.");
    mutation.mutate(content);
  };
  return <main className="event-organizer-chat-page" data-testid="page-org-event-chat">
    <section className="event-organizer-chat-card" data-testid="event-organizer-chat" aria-labelledby="organizer-chat-title">
      <header className="event-organizer-chat-header">
        <div><h2 id="organizer-chat-title">Organizer conversation</h2><p>Private to members and managers of the organization</p></div>
        <span className="event-organizer-chat-lock" aria-label="Not visible to participants"><Icon name="lock" /> Not visible to participants</span>
      </header>
      <div className="event-organizer-chat-messages" ref={viewportRef} aria-label="Conversation messages" onScroll={(event) => { const element = event.currentTarget; wasNearBottom.current = element.scrollHeight - element.scrollTop - element.clientHeight < 48; }}>
        {messages.length === 0 ? <p className="event-organizer-chat-empty">No messages yet. Start the conversation with your organizers.</p> : <ul>
          {messages.map((message: EventMessage) => { const member = memberMap.get(message.senderId); const current = message.senderId === user?.id; return <li key={message.id} data-testid={`chat-message-${message.id}`} className={current ? "is-current" : "is-other"}>
            <span className="event-organizer-chat-avatar" aria-hidden="true">{initials(member, message.senderId)}</span>
            <div><p className="event-organizer-chat-meta">{displayName(member, message.senderId)} · {messageTime(message.sentAt)}</p><p className="event-organizer-chat-bubble">{message.content}</p></div>
          </li>; })}
        </ul>}
      </div>
      <form className="event-organizer-chat-composer" data-testid="chat-composer" onSubmit={(event) => { event.preventDefault(); submit(); }}>
        <TextArea id="event-organizer-chat-input" label="Write a message" aria-label="Write a message to the organizers" value={draft} onChange={(event) => { setDraft(event.target.value); if (formError) setFormError(""); }} onKeyDown={(event) => { if (event.key === "Enter" && !event.shiftKey) { event.preventDefault(); submit(); } }} disabled={canceled || mutation.isPending} maxLength={1000} height={88} />
        <div className="event-organizer-chat-composer-footer"><span aria-live="polite" className={draft.length >= 900 ? "is-near-limit" : ""}>{draft.length >= 900 ? `${draft.length}/1000` : ""}</span><Button type="submit" disabled={canceled || mutation.isPending || !draft.trim()} loading={mutation.isPending}>Send</Button></div>
        {canceled && <p role="status">This event is canceled. Messaging is disabled.</p>}
        {formError && <p role="alert">{formError}</p>}
      </form>
    </section>
  </main>;
}
