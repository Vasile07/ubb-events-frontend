import { apiFetch } from "../../shared/api/client";
import type {
  AnnouncementResponse,
  EventDetails,
  EventDiscoveryFilters,
  EventSummary,
  OrganizationEvent,
  RegistrationResponse,
  MyRegistration,
} from "./types";
import type { EventFormValues } from "./eventFormTypes";
import type { EventTask, EventTaskRequest } from "./eventTasks";

export type UpdateOrganizationEventRequest = {
  categoryId: number;
  title: string;
  description: string;
  date: string;
  startTime: string;
  endTime: string;
  location: string;
  capacity: number;
};

export type CreateOrganizationEventResponse = { id: number; status: "DRAFT" };

export function createOrganizationEvent(
  organizationId: number,
  values: EventFormValues,
): Promise<CreateOrganizationEventResponse> {
  return apiFetch<CreateOrganizationEventResponse>(
    `/api/organizations/${organizationId}/events`,
    {
      method: "POST",
      body: {
        title: values.title,
        description: values.description,
        date: values.startDate,
        startTime: values.startTime,
        endTime: values.endTime,
        location: values.location,
        capacity: Number(values.capacity),
        tasks: values.tasks.map((task) => ({
          description: task.description,
          assigneeId: task.assigneeId ? Number(task.assigneeId) : null,
        })),
      },
    },
  );
}

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

export function updateOrganizationEvent(organizationId: number, eventId: number, values: EventFormValues, categoryId: number) {
  return apiFetch<OrganizationEvent>(`/api/organizations/${organizationId}/events/${eventId}`, {
    method: "PUT",
    body: { categoryId, title: values.title, description: values.description, date: values.startDate, startTime: values.startTime, endTime: values.endTime, location: values.location, capacity: Number(values.capacity) } satisfies UpdateOrganizationEventRequest,
  });
}

export function publishOrganizationEvent(organizationId: number, eventId: number) {
  return apiFetch<OrganizationEvent>(`/api/organizations/${organizationId}/events/${eventId}/publish`, { method: "PATCH" });
}

export function deleteOrganizationEvent(organizationId: number, eventId: number) {
  return apiFetch<void>(`/api/organizations/${organizationId}/events/${eventId}`, { method: "DELETE" });
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

export function getMyRegistrations(): Promise<MyRegistration[]> {
  return apiFetch<MyRegistration[]>("/api/users/me/registrations");
}

export function getEventAnnouncements(eventId: number): Promise<AnnouncementResponse[]> {
  return apiFetch<AnnouncementResponse[]>(`/api/events/${eventId}/announcements`);
}

export function getEventTasks(organizationId: number, eventId: number): Promise<EventTask[]> {
  return apiFetch<EventTask[]>(`/api/organizations/${organizationId}/events/${eventId}/tasks`);
}

export function createEventTask(organizationId: number, eventId: number, request: EventTaskRequest): Promise<EventTask> {
  return apiFetch<EventTask>(`/api/organizations/${organizationId}/events/${eventId}/tasks`, { method: "POST", body: request });
}

export function updateEventTask(organizationId: number, eventId: number, taskId: number, request: EventTaskRequest): Promise<EventTask> {
  return apiFetch<EventTask>(`/api/organizations/${organizationId}/events/${eventId}/tasks/${taskId}`, { method: "PUT", body: request });
}

export function deleteEventTask(organizationId: number, eventId: number, taskId: number): Promise<void> {
  return apiFetch<void>(`/api/organizations/${organizationId}/events/${eventId}/tasks/${taskId}`, { method: "DELETE" });
}

