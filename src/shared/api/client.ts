import { apiUrl } from "../lib/env";
import { getToken } from "../lib/tokenStorage";

export interface ApiErrorDetail {
  field: string;
  message: string;
}

export class ApiError extends Error {
  readonly status: number;
  readonly fieldErrors: Record<string, string>;

  constructor(
    status: number,
    message: string,
    fieldErrors: Record<string, string> = {},
  ) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.fieldErrors = fieldErrors;
  }
}

export type UnauthorizedHandler = () => void;

let unauthorizedHandler: UnauthorizedHandler = () => {};

export function setUnauthorizedHandler(handler: UnauthorizedHandler): void {
  unauthorizedHandler = handler;
}

export type ApiRequestInit = Omit<RequestInit, "body"> & { body?: unknown };

interface BackendErrorResponse {
  message?: unknown;
  errors?: unknown;
}

function isRawBody(body: unknown): body is BodyInit {
  if (typeof body === "string") return true;
  if (typeof Blob !== "undefined" && body instanceof Blob) return true;
  if (typeof FormData !== "undefined" && body instanceof FormData) return true;
  if (
    typeof URLSearchParams !== "undefined" &&
    body instanceof URLSearchParams
  ) {
    return true;
  }
  if (typeof ArrayBuffer !== "undefined" && body instanceof ArrayBuffer)
    return true;
  return false;
}

function makeRequestInit(init: ApiRequestInit = {}): RequestInit {
  const headers = new Headers(init.headers);
  const token = getToken();
  if (token) headers.set("Authorization", `Bearer ${token}`);

  const body = init.body;
  let requestBody: BodyInit | null | undefined;
  if (body === undefined || body === null) {
    requestBody = body;
  } else if (isRawBody(body)) {
    requestBody = body;
  } else {
    requestBody = JSON.stringify(body);
    if (!headers.has("Content-Type")) {
      headers.set("Content-Type", "application/json");
    }
  }

  return { ...init, headers, body: requestBody };
}

function isLoginOrRegisterRequest(path: string): boolean {
  const pathname = path.split("?")[0].replace(/\/+$/, "");
  return pathname === "/api/auth/login" || pathname === "/api/auth/register";
}

function toFieldErrors(errors: unknown): Record<string, string> {
  if (!Array.isArray(errors)) return {};

  const fieldErrors: Record<string, string> = {};
  for (const item of errors) {
    if (
      typeof item === "object" &&
      item !== null &&
      "field" in item &&
      typeof item.field === "string" &&
      "message" in item &&
      typeof item.message === "string"
    ) {
      fieldErrors[item.field] = item.message;
    }
  }
  return fieldErrors;
}

async function readJson(response: Response): Promise<unknown> {
  if (response.status === 204) return undefined;
  try {
    return await response.json();
  } catch {
    return undefined;
  }
}

export async function apiFetch<T>(
  path: string,
  init?: ApiRequestInit,
): Promise<T> {
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  const response = await fetch(
    `${apiUrl}${normalizedPath}`,
    makeRequestInit(init),
  );

  if (response.status === 401 && !isLoginOrRegisterRequest(normalizedPath)) {
    unauthorizedHandler();
  }

  const payload = await readJson(response);
  if (!response.ok) {
    const errorPayload =
      typeof payload === "object" && payload !== null
        ? (payload as BackendErrorResponse)
        : {};
    const message =
      typeof errorPayload.message === "string"
        ? errorPayload.message
        : response.statusText || "API request failed";
    throw new ApiError(
      response.status,
      message,
      toFieldErrors(errorPayload.errors),
    );
  }

  return payload as T;
}
