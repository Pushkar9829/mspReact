import { useEffect } from "react";
import { useBlocker } from "react-router-dom";

/**
 * Warn before leaving a dirty form.
 *
 *   const blocker = useUnsavedChangesGuard(isDirty && !saving);
 *   <UnsavedChangesDialog blocker={blocker} />      // from shared/ui
 *
 * - In-app navigation is blocked (react-router data-router blocker); the dialog lets the user stay
 *   or discard. Navigations that only change ?search on the same path are allowed.
 * - Reload / tab close shows the browser's native prompt (beforeunload).
 */
export function useUnsavedChangesGuard(when) {
  const blocker = useBlocker(
    ({ currentLocation, nextLocation }) => Boolean(when) && currentLocation.pathname !== nextLocation.pathname
  );

  useEffect(() => {
    if (!when) return undefined;
    const handler = (event) => {
      event.preventDefault();
      event.returnValue = "";
    };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [when]);

  useEffect(() => {
    if (blocker.state === "blocked" && !when) blocker.reset();
  }, [blocker, when]);

  return blocker;
}

export default useUnsavedChangesGuard;
