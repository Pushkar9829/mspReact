import { useId, useMemo } from "react";
import { keepPreviousData, useQuery, useQueryClient } from "@tanstack/react-query";
import { withRequestContext } from "../api/client.js";

/**
 * Legacy-compatible data hook on top of TanStack Query.
 *
 *   const { data, error, loading, reload, setData } = useApi(() => api.getOrder(id), [id]);
 *
 * - `loader` receives `{ signal }`; every api.* call it starts synchronously is aborted when the
 *   query is cancelled (unmount / deps change).
 * - Cached and deduped per call site + deps; refetches on window focus; previous data is kept
 *   while deps change.
 * - `error` is the message string (legacy); `errorObj` is the ApiError.
 * - options: { enabled, key, staleTime, refetchInterval, keepPrevious (default true) }.
 *   Pass `key` (an array) to share the cache with useQuery / invalidate it with keys.*.
 *
 * New code should prefer `useQuery({ queryKey: keys.x.list(q), queryFn })` directly.
 */
export function useApi(loader, deps = [], options = {}) {
  const site = useId();
  const queryClient = useQueryClient();
  const { enabled = true, key, keepPrevious = true, ...rest } = options;
  const loaderSource = typeof loader === "function" ? loader.toString() : "";
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const queryKey = useMemo(() => key || ["useApi", site, loaderSource, ...deps], [key, site, loaderSource, ...deps]);

  const query = useQuery({
    queryKey,
    queryFn: ({ signal }) => withRequestContext({ signal }, () => Promise.resolve(loader({ signal }))).then((v) => (v === undefined ? null : v)),
    enabled,
    placeholderData: keepPrevious ? keepPreviousData : undefined,
    ...rest,
  });

  return {
    data: query.data ?? null,
    error: query.error ? query.error.message || "Request failed" : "",
    errorObj: query.error || null,
    loading: enabled ? query.isPending : false,
    fetching: query.isFetching,
    isPlaceholderData: query.isPlaceholderData,
    setData: (updater) =>
      queryClient.setQueryData(queryKey, (prev) => (typeof updater === "function" ? updater(prev ?? null) : updater)),
    reload: () => query.refetch(),
    refetch: query.refetch,
    query,
    queryKey,
  };
}

export default useApi;
