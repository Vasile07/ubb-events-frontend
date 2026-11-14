import { apiFetch } from "../../shared/api/client";
import type {
  EventDiscoveryFilters,
  EventSummary,
  OrganizationEvent,
} from "./types";

export function getOrganizationEvents(
  organizationId: number,
): Promise<OrganizationEvent[]> {
  return apiFetch<OrganizationEvent[]>(
    `/api/organizations/${organizationId}/events`,
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
