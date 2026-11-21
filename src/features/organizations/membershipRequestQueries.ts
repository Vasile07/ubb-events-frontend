import type { QueryClient } from "@tanstack/react-query";

export const organizationMembershipRequestsKey = (organizationId: number) =>
  ["organization-membership-requests", organizationId] as const;

export const organizationMembershipRequestDetailsKey = (organizationId: number, status: string) =>
  ["organization-membership-request-details", organizationId, status] as const;

export const organizationMembersKey = (organizationId: number) =>
  ["organization-members", organizationId] as const;

export function invalidateMembershipRequests(queryClient: QueryClient, organizationId: number) {
  return queryClient.invalidateQueries({
    queryKey: organizationMembershipRequestsKey(organizationId),
  });
}

export function invalidateMembershipRequestDetails(queryClient: QueryClient, organizationId: number) {
  return queryClient.invalidateQueries({ queryKey: ["organization-membership-request-details", organizationId] });
}

export function invalidateOrganizationMembers(queryClient: QueryClient, organizationId: number) {
  return queryClient.invalidateQueries({ queryKey: organizationMembersKey(organizationId) });
}
