import { useCallback } from "react";
import { toast } from "sonner";

/**
 * Legacy toast API, now backed by sonner (the <Toaster/> is mounted once at the app root).
 *   const notify = useToast(); notify("Saved"); notify("Failed", "danger");
 * New code: `import { toast } from "shared/ui"; toast.success("Saved")`.
 */
export function ToastProvider({ children }) {
  return children;
}

export function useToast() {
  return useCallback((message, tone = "ok") => {
    if (!message) return;
    if (tone === "danger" || tone === "error") toast.error(message);
    else if (tone === "warning") toast.warning(message);
    else toast.success(message);
  }, []);
}
