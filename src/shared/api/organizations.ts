import { apiFetch } from "./client";
import type { MembershipDecision, MembershipRequestDetailsResponse, MembershipRequestDetailsStatus, MembershipRequestResponse, OrganizationDetailsResponse, OrganizationMemberResponse, OrganizationResponse } from "./types";
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

export function getMembershipRequestDetails(organizationId: number, status: MembershipRequestDetailsStatus): Promise<MembershipRequestDetailsResponse[]> {
  return apiFetch<MembershipRequestDetailsResponse[]>(`/api/organizations/${organizationId}/membership-requests/details?status=${status}`);
}

export function decideMembershipRequest(organizationId: number, requestId: number, decision: MembershipDecision): Promise<{ status: string }> {
  return apiFetch<{ status: string }>(`/api/organizations/${organizationId}/membership-requests/${requestId}`, {
    method: "PATCH",
    body: { decision },
  });
}

export function getOrganizationMembers(organizationId: number): Promise<OrganizationMemberResponse[]> {
  return apiFetch<OrganizationMemberResponse[]>(`/api/organizations/${organizationId}/members`);
}

export function requestOrganizationMembership(organizationId: number): Promise<void> {
  return apiFetch<void>(`/api/organizations/${organizationId}/membership-requests`, {
    method: "POST",
  });
}
