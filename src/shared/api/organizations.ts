import { apiFetch } from "./client";
import type { OrganizationResponse } from "./types";

export function getOrganizations(): Promise<OrganizationResponse[]> {
  return apiFetch<OrganizationResponse[]>("/api/organizations");
}

export function requestOrganizationMembership(organizationId: number): Promise<void> {
  return apiFetch<void>(`/api/organizations/${organizationId}/membership-requests`, {
    method: "POST",
  });
}
