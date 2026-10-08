import { useQueryClient } from "@tanstack/react-query";
import { api } from "../../../shared/api/index.js";
import { keys } from "../../../shared/api/keys.js";
import { ConfirmDialog, toast } from "../../../shared/ui/index.js";

/** Admin-settable status changes (users/validators ADMIN_STATUSES: active | pending | suspended). */
export function userStatusActions(user) {
  const s = user?.status;
  if (s === "deleted") return [];
  if (s === "suspended") return [{ to: "active", label: "Reactivate account" }];
  if (s === "pending" || s === "locked") return [{ to: "active", label: "Activate account" }, { to: "suspended", label: "Suspend account", tone: "danger" }];
  return [{ to: "suspended", label: "Suspend account", tone: "danger" }];
}

function copyFor(user, to) {
  const who = user.name || user.email;
  if (to === "suspended")
    return {
      title: `Suspend ${who}?`,
      description: "They are signed out of every device immediately and can’t sign in until reactivated. Their orders and history are kept.",
      confirmLabel: "Suspend account",
      tone: "danger",
    };
  return {
    title: `Activate ${who}?`,
    description: "They can sign in again with their existing password.",
    confirmLabel: "Activate",
  };
}

export function UserStatusDialog({ user, action, onClose }) {
  const qc = useQueryClient();
  const id = user.id || user._id;
  return (
    <ConfirmDialog
      open
      onOpenChange={(o) => !o && onClose()}
      {...copyFor(user, action.to)}
      onConfirm={async () => {
        await api.withTenant(null).updateUser(id, { status: action.to });
        await qc.invalidateQueries({ queryKey: keys.users.all });
        toast.success(action.to === "suspended" ? "Account suspended" : "Account activated");
      }}
    />
  );
}

/** Revoke every session and access token of `user` (POST /users/:id/sign-out-everywhere). */
export function SignOutEverywhereDialog({ user, onClose }) {
  const qc = useQueryClient();
  const id = user.id || user._id;
  const who = user.name || user.email;
  return (
    <ConfirmDialog
      open
      onOpenChange={(o) => !o && onClose()}
      title={`Sign ${who} out everywhere?`}
      description="Every session on every device ends now and their current access tokens stop working. They keep their password and can sign in again straight away."
      confirmLabel="Sign out everywhere"
      tone="danger"
      onConfirm={async () => {
        await api.withTenant(null).signOutUserEverywhere(id);
        await qc.invalidateQueries({ queryKey: keys.users.detail(id) });
        await qc.invalidateQueries({ queryKey: keys.audit.all });
        toast.success(`${who} was signed out of every session`);
      }}
    />
  );
}
