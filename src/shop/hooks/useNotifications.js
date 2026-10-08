/**
 * Buyer notifications.
 *   const { unread } = useUnreadCount();              // polled every 60 s while signed in
 *   const list = useNotificationList({ page, limit }); // { data, meta }
 *   const { readOne, readAll } = useNotificationActions();
 *   const prefs = useNotificationPreferences();         // { data, save.mutate({ [category]: { inApp, email, sms } }) }
 */
import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { api } from "../../shared/api/index.js";
import { keys, shopKeys } from "./keys.js";
import { useViewer } from "./useViewer.js";

export function useUnreadCount() {
  const { viewer, signedIn } = useViewer();
  const q = useQuery({
    queryKey: shopKeys.notificationUnread(viewer),
    queryFn: () => api.notificationsUnreadCount(),
    enabled: signedIn,
    refetchInterval: 60_000,
    refetchIntervalInBackground: false,
    staleTime: 15_000,
  });
  return { ...q, unread: Number(q.data?.unread) || 0 };
}

export function useNotificationList(query = { limit: 10 }, { enabled = true } = {}) {
  const { viewer, signedIn } = useViewer();
  return useQuery({
    queryKey: shopKeys.notificationList(viewer, query),
    queryFn: () => api.listNotifications(query),
    enabled: signedIn && enabled,
    placeholderData: keepPreviousData,
  });
}

export function useNotificationActions() {
  const qc = useQueryClient();
  const { viewer } = useViewer();
  const settle = () => {
    qc.invalidateQueries({ queryKey: shopKeys.notifications(viewer) });
    qc.invalidateQueries({ queryKey: keys.notifications.all });
  };
  const readOne = useMutation({ mutationFn: (id) => api.markNotificationRead(id), onSettled: settle });
  const readAll = useMutation({
    mutationFn: () => api.markAllNotificationsRead(),
    onSuccess: () => toast.success("All notifications marked as read"),
    onError: (err) => toast.error(err?.message || "Could not update notifications"),
    onSettled: settle,
  });
  return { readOne, readAll };
}

export function useNotificationPreferences() {
  const qc = useQueryClient();
  const { viewer, signedIn } = useViewer();
  const key = shopKeys.notificationPrefs(viewer);
  const q = useQuery({ queryKey: key, queryFn: () => api.getNotificationPreferences(), enabled: signedIn });
  const save = useMutation({
    mutationFn: (body) => api.updateNotificationPreferences(body),
    onSuccess: (data) => {
      if (data) qc.setQueryData(key, data);
      toast.success("Preferences saved");
    },
    onError: (err) => toast.error(err?.message || "Could not save preferences"),
  });
  return { ...q, save };
}
