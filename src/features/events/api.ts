import { apiFetch } from "../../shared/api/client";
import type {
  AnnouncementResponse,
  EventDetails,
  EventDiscoveryFilters,
  EventSummary,
  OrganizationEvent,
  RegistrationResponse,
} from "./types";

export function getOrganizationEvents(
  organizationId: number,
): Promise<OrganizationEvent[]> {
  return apiFetch<OrganizationEvent[]>(
    `/api/organizations/${organizationId}/events`,
  );
}

export function getOrganizationEvent(
  organizationId: number,
  eventId: number,
): Promise<OrganizationEvent> {
  return apiFetch<OrganizationEvent>(
    `/api/organizations/${organizationId}/events/${eventId}`,
  );
}

export function getEvents(
  filters: EventDiscoveryFilters = {},
): Promise<EventSummary[]> {
  const params = new URLSearchParams();
  if (filters.search) params.set("search", filters.search);
  if (filters.organizationId !== undefined) {
    params.set("organizationId", String(filters.organizationId));
  }
  if (filters.from) params.set("from", filters.from);
  if (filters.to) params.set("to", filters.to);
  const query = params.toString();
  return apiFetch<EventSummary[]>(`/api/events${query ? `?${query}` : ""}`);
}

export function getEvent(eventId: number): Promise<EventDetails> {
  return apiFetch<EventDetails>(`/api/events/${eventId}`);
}

export function registerForEvent(eventId: number): Promise<RegistrationResponse> {
  return apiFetch<RegistrationResponse>(`/api/events/${eventId}/registrations`, { method: "POST" });
}

export function cancelRegistration(eventId: number): Promise<void> {
  return apiFetch<void>(`/api/events/${eventId}/registrations/me`, { method: "DELETE" });
}

export function getEventAnnouncements(eventId: number): Promise<AnnouncementResponse[]> {
  return apiFetch<AnnouncementResponse[]>(`/api/events/${eventId}/announcements`);
}
