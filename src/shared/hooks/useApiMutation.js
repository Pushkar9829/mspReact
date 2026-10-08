import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { errorMessage } from "../api/client.js";
import { keys as queryKeys } from "../api/keys.js";

/**
 * Mutation with cache invalidation and toasts.
 *
 *   const save = useApiMutation((body) => api.updateOrder(id, body), {
 *     invalidate: [keys.orders.detail(id), keys.orders.lists()],
 *     success: "Notes saved",            // string | (data, vars) => string | false
 *     error: "Could not save notes",     // string | false (false = handle it yourself); defaults to the API message
 *     onSuccess: (data) => ...,
 *   });
 *   save.mutate(body)  /  await save.mutateAsync(body)  /  save.isPending  /  save.error?.fields
 *
 * `invalidate` also accepts a function (data, vars) => keys[]. Legacy useApi() queries are
 * refreshed too (set `legacy: false` to skip).
 */
export function useApiMutation(fn, options = {}) {
  const queryClient = useQueryClient();
  const { invalidate = [], success, error, legacy = true, onSuccess, onError, ...rest } = options;

  return useMutation({
    mutationFn: (vars) => fn(vars),
    ...rest,
    onSuccess: async (data, vars, ctx) => {
      const list = typeof invalidate === "function" ? invalidate(data, vars) : invalidate;
      await Promise.all([
        ...(list || []).filter(Boolean).map((queryKey) => queryClient.invalidateQueries({ queryKey })),
        legacy ? queryClient.invalidateQueries({ queryKey: queryKeys.legacy }) : null,
      ]);
      const msg = typeof success === "function" ? success(data, vars) : success;
      if (msg) toast.success(msg);
      return onSuccess?.(data, vars, ctx);
    },
    onError: (err, vars, ctx) => {
      if (error !== false && err?.name !== "AbortError") {
        const fallback = typeof error === "string" ? error : "Something went wrong";
        // Field errors are shown inline by <Field>; still surface a short toast.
        toast.error(typeof error === "string" ? error : errorMessage(err, fallback), {
          description: err?.requestId ? `Reference: ${err.requestId}` : undefined,
        });
      }
      return onError?.(err, vars, ctx);
    },
  });
}

/** Imperative invalidation helper: `invalidate(keys.orders.all, keys.notifications.unread)`. */
export function useInvalidate() {
  const queryClient = useQueryClient();
  return (...list) => Promise.all(list.map((queryKey) => queryClient.invalidateQueries({ queryKey })));
}

export default useApiMutation;
