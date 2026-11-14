export type OrganizationMembershipStatus = "MEMBER" | "PENDING" | "NONE";
export type OrganizationRole = "NONE" | "MEMBER" | "MANAGER";

export interface OrganizationResponse {
  organizationId: number;
  name: string;
  description: string | null;
  status: OrganizationMembershipStatus;
  role: OrganizationRole;
}

export interface OrganizationDetailsResponse {
  organizationId: number;
  name: string;
  description: string | null;
  status: OrganizationMembershipStatus;
}

export interface MembershipRequestResponse {
  id?: number;
  membershipId?: number;
  status?: string;
  [key: string]: unknown;
}
