import { apiFetch } from "./client";
import type {
  LoginResponse,
  RegisterPayload,
  UserProfileResponse,
  UserResponse,
} from "../../features/auth/types";

export function login(email: string, password: string): Promise<LoginResponse> {
  return apiFetch<LoginResponse>("/api/auth/login", {
    method: "POST",
    body: { email, password },
  });
}

export function register(payload: RegisterPayload): Promise<UserResponse> {
  return apiFetch<UserResponse>("/api/auth/register", {
    method: "POST",
    body: payload,
  });
}

export function getCurrentUser(): Promise<UserProfileResponse> {
  return apiFetch<UserProfileResponse>("/api/users/me");
}
