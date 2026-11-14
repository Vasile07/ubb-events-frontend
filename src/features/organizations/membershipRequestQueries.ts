import type { QueryClient } from "@tanstack/react-query";

export const organizationMembershipRequestsKey = (organizationId: number) =>
  ["organization-membership-requests", organizationId] as const;

export function invalidateMembershipRequests(queryClient: QueryClient, organizationId: number) {
  return queryClient.invalidateQueries({
    queryKey: organizationMembershipRequestsKey(organizationId),
  });
}
