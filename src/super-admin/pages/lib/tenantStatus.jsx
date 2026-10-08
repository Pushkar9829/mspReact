import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { api } from "../../../shared/api/index.js";
import { keys } from "../../../shared/api/keys.js";
import { ConfirmDialog, toast } from "../../../shared/ui/index.js";

/**
 * Tenant lifecycle actions available from a status (backend accepts any TENANT_STATUSES value via
 * PATCH /tenants/:id; suspended/archived emit TENANT_SUSPENDED and lock staff out immediately).
 */
export function tenantStatusActions(tenant) {
  const s = tenant?.status;
  const out = [];
  if (s === "pending" || s === "trial") out.push({ id: "activate", to: "active", label: "Activate store" });
  if (s === "active" || s === "trial" || s === "pending") out.push({ id: "suspend", to: "suspended", label: "Suspend store", tone: "danger" });
  if (s === "suspended") out.push({ id: "reactivate", to: "active", label: "Reactivate store" });
  if (s === "archived") out.push({ id: "restore", to: "active", label: "Restore store" });
  if (s !== "archived") out.push({ id: "archive", to: "archived", label: "Archive store", tone: "danger" });
  return out;
}

const COPY = {
  activate: (t) => ({
    title: `Activate ${t.name}?`,
    description: "The storefront goes live: published products become visible to buyers and staff keep full access.",
    confirmLabel: "Activate",
  }),
  suspend: (t) => ({
    title: `Suspend ${t.name}?`,
    description:
      "Staff of this store are signed out and blocked immediately (TENANT_SUSPENDED), its catalog is hidden from the storefront and buyers can no longer order from it. Existing orders are kept. You can reactivate it later.",
    confirmLabel: "Suspend store",
    tone: "danger",
    typedConfirmation: t.slug,
  }),
  reactivate: (t) => ({
    title: `Reactivate ${t.name}?`,
    description: "Staff can sign in again and the catalog becomes visible to buyers.",
    confirmLabel: "Reactivate",
  }),
  restore: (t) => ({
    title: `Restore ${t.name} from the archive?`,
    description: "The store becomes active again: staff regain access and published products reappear in the storefront.",
    confirmLabel: "Restore store",
  }),
  archive: (t) => ({
    title: `Archive ${t.name}?`,
    description:
      "Archiving retires the store: staff are blocked immediately, the catalog is hidden and it drops out of active lists. Orders, invoices and audit history are retained (tax law). It can be restored later.",
    confirmLabel: "Archive store",
    tone: "danger",
    typedConfirmation: t.slug,
  }),
};

/** Controlled confirm dialog for a lifecycle action: <TenantStatusDialog tenant action onClose /> */
export function TenantStatusDialog({ tenant, action, onClose, onDone }) {
  const qc = useQueryClient();
  if (!tenant || !action) return null;
  const copy = COPY[action.id]?.(tenant) || { title: action.label, confirmLabel: action.label };
  return (
    <ConfirmDialog
      open
      onOpenChange={(open) => !open && onClose()}
      {...copy}
      onConfirm={async () => {
        const updated = await api.withTenant(null).updateTenant(tenant._id, { status: action.to });
        await Promise.all([qc.invalidateQueries({ queryKey: keys.tenants.all }), qc.invalidateQueries({ queryKey: keys.reports.all })]);
        toast.success(`${tenant.name} is now ${action.to}`);
        onDone?.(updated);
      }}
    />
  );
}

/** Hook: const lifecycle = useTenantLifecycle(); lifecycle.open(tenant, action); {lifecycle.dialog} */
export function useTenantLifecycle(onDone) {
  const [state, setState] = useState(null);
  return {
    open: (tenant, action) => setState({ tenant, action }),
    dialog: state ? <TenantStatusDialog tenant={state.tenant} action={state.action} onClose={() => setState(null)} onDone={onDone} /> : null,
  };
}
