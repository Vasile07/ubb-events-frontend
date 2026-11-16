import { apiFetch } from "./client";
import type { MembershipRequestResponse, OrganizationDetailsResponse, OrganizationMemberResponse, OrganizationResponse } from "./types";
export { invalidateMembershipRequests, organizationMembershipRequestsKey } from "../../features/organizations/membershipRequestQueries";

export function getOrganizations(): Promise<OrganizationResponse[]> {
  return apiFetch<OrganizationResponse[]>("/api/organizations");
}

export function getOrganization(organizationId: number): Promise<OrganizationDetailsResponse> {
  return apiFetch<OrganizationDetailsResponse>(`/api/organizations/${organizationId}`);
}

export function getMembershipRequests(organizationId: number): Promise<MembershipRequestResponse[]> {
  return apiFetch<MembershipRequestResponse[]>(`/api/organizations/${organizationId}/membership-requests`);
}

export function getOrganizationMembers(organizationId: number): Promise<OrganizationMemberResponse[]> {
  return apiFetch<OrganizationMemberResponse[]>(`/api/organizations/${organizationId}/members`);
}

export function requestOrganizationMembership(organizationId: number): Promise<void> {
  return apiFetch<void>(`/api/organizations/${organizationId}/membership-requests`, {
    method: "POST",
  });
}
