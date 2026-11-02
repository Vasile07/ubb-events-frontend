import { apiFetch } from "./client";
import type { OrganizationResponse } from "./types";

export function getOrganizations(): Promise<OrganizationResponse[]> {
  return apiFetch<OrganizationResponse[]>("/api/organizations");
}
