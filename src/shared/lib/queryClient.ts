import { QueryClient } from "@tanstack/react-query";

export const API_QUERY_STALE_TIME_MS = 60_000;

export function createQueryClient(): QueryClient {
  return new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: API_QUERY_STALE_TIME_MS,
        retry: (failureCount, error) => {
          const status =
            typeof error === "object" &&
            error !== null &&
            "status" in error &&
            typeof error.status === "number"
              ? error.status
              : undefined;
          if (status !== undefined && status >= 400 && status < 500) {
            return false;
          }
          return failureCount < 1;
        },
      },
    },
  });
}
