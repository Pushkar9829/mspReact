import { QueryClient, keepPreviousData } from "@tanstack/react-query";

/** Spread into list queries so paging/filtering keeps the previous page on screen while loading. */
export const listQueryOptions = { placeholderData: keepPreviousData };

function shouldRetry(failureCount, error) {
  const status = error?.status;
  if (error?.name === "AbortError") return false;
  // Never retry client errors (4xx incl. 401 after the refresh retry, 403, 404, 409, 422, 429).
  if (status >= 400 && status < 500) return false;
  return failureCount < 2;
}

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: shouldRetry,
      retryDelay: (attempt) => Math.min(1000 * 2 ** attempt, 8000),
      staleTime: 30_000,
      gcTime: 5 * 60_000,
      refetchOnWindowFocus: true,
      refetchOnReconnect: true,
    },
    mutations: {
      retry: false,
    },
  },
});

export default queryClient;
