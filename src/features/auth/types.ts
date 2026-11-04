export type AuthStatus = "loading" | "authenticated" | "anonymous";

export type MembershipRole = "MEMBER" | "MANAGER" | string;

export interface AuthMembership {
  organizationId: number;
  role: MembershipRole;
  organizationName?: string;
}

export interface AuthUser {
  id: number;
  firstName: string;
  lastName: string;
  fullName: string;
  email: string;
  memberships: AuthMembership[];
}

export interface UserProfileResponse {
  id: number;
  firstName: string;
  lastName: string;
  email: string;
  memberships: AuthMembership[];
}

export interface LoginResponse {
  token: string;
}

export interface RegisterPayload {
  firstName: string;
  lastName: string;
  email: string;
  password: string;
}

export interface UserResponse {
  id: number;
  firstName: string;
  lastName: string;
  email: string;
}

export function normalizeUser(profile: UserProfileResponse): AuthUser {
  return {
    ...profile,
    fullName: `${profile.firstName} ${profile.lastName}`.trim(),
  };
}
