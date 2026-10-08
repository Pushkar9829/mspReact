import { cloneElement, isValidElement } from "react";
import { useCan } from "../context/AuthContext.jsx";
import { Tooltip } from "../ui/index.js";

function label(perm) {
  return Array.isArray(perm) ? perm.join(" or ") : perm;
}

/**
 * Permission-aware wrapper for a single action control.
 *
 *   <PermissionGate perm="orders.refund"><Button onClick={…}>Refund</Button></PermissionGate>
 *   <PermissionGate perm={["returns.manage", "orders.refund"]} mode="hide">…</PermissionGate>
 *
 * - allowed → renders the child untouched;
 * - mode="disable" (default) → child is disabled and wrapped in a tooltip "Requires <perm>";
 * - mode="hide" → renders nothing.
 * `allowed` overrides the check (e.g. a computed condition), `reason` overrides the tooltip text.
 */
export function PermissionGate({ perm, allowed, mode = "disable", reason, children }) {
  const can = useCan();
  const ok = allowed ?? (perm ? can(perm) : true);
  if (ok) return children;
  if (mode === "hide") return null;
  const child = isValidElement(children) ? cloneElement(children, { disabled: true, "aria-disabled": true, onClick: undefined, to: undefined }) : children;
  return (
    <Tooltip content={reason || `Requires ${label(perm)}`}>
      <span tabIndex={0} className="inline-flex rounded-md outline-none focus-visible:outline-2 focus-visible:outline-ring">
        {child}
      </span>
    </Tooltip>
  );
}

/** Explains a disabled control: wraps it in a focusable span with a tooltip when `reason` is set. */
export function DisabledReason({ reason, children }) {
  if (!reason) return children;
  return (
    <Tooltip content={reason}>
      <span tabIndex={0} className="inline-flex rounded-md outline-none focus-visible:outline-2 focus-visible:outline-ring">
        {children}
      </span>
    </Tooltip>
  );
}

export default PermissionGate;
