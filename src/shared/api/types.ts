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

export type MembershipRequestDetailsStatus = "PENDING" | "ACCEPTED" | "DECLINED";
export type MembershipDecision = "ACCEPTED" | "DECLINED";

export interface MembershipRequestDetailsResponse {
  requestId: number;
  firstName: string;
  lastName: string;
  email: string;
  requestedAt: string | null;
  status: MembershipRequestDetailsStatus;
}

export interface OrganizationMemberResponse {
  id: number;
  fullName?: string;
  firstName?: string;
  lastName?: string;
  email?: string;
  role?: "MANAGER" | "MEMBER";
}
