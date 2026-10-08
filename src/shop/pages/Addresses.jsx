/**
 * /account/addresses — address cards (default first, with a badge) with edit / make default /
 * remove, an "Add address" tile, the shared AddressForm in a sheet (Indian validation; cleared
 * optional fields are sent as ""), up to 50 addresses. Removing the default refetches the list
 * (the server promotes another address).
 */
import { useState } from "react";
import { Check, MapPin, Pencil, Phone, Plus, Star, Trash2 } from "lucide-react";
import { Button, ConfirmDialog, EmptyState, Notice, ShopPageHeader, Skeleton, toast } from "../components/ui/index.js";
import { cn } from "../components/ui/cn.js";
import { useAddressActions, useAddresses } from "../hooks/index.js";
import { AddressSheet, MAX_ADDRESSES } from "../components/buying/AddressSheet.jsx";
import { normalizeState } from "../lib/indianAddress.js";
import { IconCircle } from "../components/account/AccountKit.jsx";

function AddressTile({ address: a, onEdit, onDelete, onMakeDefault, makingDefault }) {
  return (
    <article
      aria-label={`${a.label ? `${a.label}: ` : ""}${a.contactName || "Address"}`}
      className={cn(
        "flex h-full flex-col overflow-hidden rounded-[1.25rem] border bg-shop-card",
        a.isDefault ? "border-shop-primary shadow-[0_18px_40px_-30px_rgba(11,16,51,0.4)] ring-1 ring-shop-primary" : "border-shop-line"
      )}
    >
      <div className="flex flex-1 gap-3 p-4">
        <IconCircle icon={MapPin} tone={a.isDefault ? "primary" : "neutral"} />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-1.5">
            {a.label ? <span className="rounded-full bg-shop-well px-2.5 py-0.5 text-shop-xs font-semibold text-shop-text">{a.label}</span> : null}
            {a.isDefault ? (
              <span className="inline-flex items-center gap-1 rounded-full bg-shop-primary-soft px-2.5 py-0.5 text-shop-xs font-semibold text-shop-primary-ink">
                <Check className="size-3.5" aria-hidden /> Default
              </span>
            ) : null}
          </div>
          <p className="mt-1.5 font-semibold text-shop-ink">{a.contactName}</p>
          <p className="mt-0.5 text-shop-sm leading-relaxed text-shop-text">
            {[a.addressLine1, a.addressLine2].filter(Boolean).join(", ")}
            <br />
            {[a.city, normalizeState(a.state, a.stateCode)].filter(Boolean).join(", ")} <span className="tabular-nums">{a.postalCode}</span>
          </p>
          {a.phone ? (
            <p className="mt-1.5 flex items-center gap-1 text-shop-xs text-shop-muted">
              <Phone className="size-3.5" aria-hidden /> <span className="tabular-nums">{a.phone}</span>
            </p>
          ) : null}
        </div>
      </div>
      <div className="flex flex-wrap items-center gap-1 border-t border-shop-line bg-shop-page/60 px-2 py-1.5">
        <Button variant="ghost" size="sm" leftIcon={Pencil} onClick={onEdit} aria-label={`Edit ${a.label || a.contactName || "address"}`}>
          Edit
        </Button>
        {!a.isDefault ? (
          <Button variant="ghost" size="sm" leftIcon={Star} loading={makingDefault} onClick={onMakeDefault}>
            Set as default
          </Button>
        ) : null}
        <Button variant="ghost" size="sm" leftIcon={Trash2} className="ml-auto text-shop-danger-ink" onClick={onDelete} aria-label={`Remove ${a.label || a.contactName || "address"}`}>
          Remove
        </Button>
      </div>
    </article>
  );
}

export default function Addresses() {
  const { addresses, isPending, error, refetch } = useAddresses();
  const { update, remove } = useAddressActions();
  const [editing, setEditing] = useState(null); // null | "new" | address
  const [removing, setRemoving] = useState(null);
  const full = addresses.length >= MAX_ADDRESSES;
  // Default first, then as listed.
  const sorted = [...addresses].sort((x, y) => Number(Boolean(y.isDefault)) - Number(Boolean(x.isDefault)));

  const makeDefault = (a) =>
    update.mutate(
      { id: a.id, body: { isDefault: true } },
      { onError: (err) => toast.error(err?.message || "Could not change the default address") }
    );

  return (
    <div className="grid gap-5">
      <ShopPageHeader
        title="Addresses"
        description="Shops, godowns and branches you order for. The default is pre-selected at checkout."
        meta={addresses.length ? <span className="text-shop-xs text-shop-muted" aria-live="polite">{`${addresses.length} of ${MAX_ADDRESSES} addresses`}</span> : null}
        actions={
          addresses.length ? (
            <Button leftIcon={Plus} onClick={() => setEditing("new")} disabled={full}>
              Add address
            </Button>
          ) : null
        }
      />
      {full ? <Notice tone="info">You have {MAX_ADDRESSES} addresses, the maximum. Remove one to add another.</Notice> : null}
      {error ? (
        <Notice tone="danger" action={<Button variant="secondary" onClick={() => refetch()}>Retry</Button>}>
          {error.message}
        </Notice>
      ) : null}
      {isPending ? (
        <div className="grid gap-4 md:grid-cols-2 2xl:grid-cols-3" role="status" aria-label="Loading addresses">
          <Skeleton className="h-48 rounded-[1.25rem]" />
          <Skeleton className="h-48 rounded-[1.25rem]" />
        </div>
      ) : addresses.length ? (
        <ul className="grid gap-4 md:grid-cols-2 2xl:grid-cols-3">
          {sorted.map((a) => (
            <li key={a.id}>
              <AddressTile
                address={a}
                onEdit={() => setEditing(a)}
                onMakeDefault={() => makeDefault(a)}
                makingDefault={update.isPending && update.variables?.id === a.id}
                onDelete={() => setRemoving(a)}
              />
            </li>
          ))}
          {!full ? (
            <li>
              <button
                type="button"
                onClick={() => setEditing("new")}
                className="flex h-full min-h-48 w-full flex-col items-center justify-center gap-2 rounded-[1.25rem] border-2 border-dashed border-shop-line-strong bg-shop-card/60 p-4 text-center transition-colors hover:border-shop-primary hover:bg-shop-primary-soft/40"
              >
                <span aria-hidden className="grid size-11 place-items-center rounded-full bg-shop-primary-soft text-shop-primary-ink">
                  <Plus className="size-5" />
                </span>
                <span className="font-semibold text-shop-ink">Add a new address</span>
                <span className="text-shop-xs text-shop-muted">Another shop, godown or branch</span>
              </button>
            </li>
          ) : null}
        </ul>
      ) : !error ? (
        <EmptyState icon={MapPin} title="No addresses yet" description="Add your shop or godown address. It goes on the GST invoice too." action={<Button leftIcon={Plus} onClick={() => setEditing("new")}>Add address</Button>} />
      ) : null}

      {editing ? <AddressSheet open address={editing === "new" ? null : editing} onOpenChange={(v) => !v && setEditing(null)} /> : null}

      <ConfirmDialog
        open={Boolean(removing)}
        onOpenChange={(v) => !v && setRemoving(null)}
        title="Remove this address?"
        description={removing ? `${removing.label ? `${removing.label}: ` : ""}${[removing.addressLine1, removing.city, removing.postalCode].filter(Boolean).join(", ")}${removing.isDefault ? ". It is your default; another address becomes the default." : ""}` : ""}
        confirmLabel="Remove"
        tone="danger"
        onConfirm={async () => {
          await remove.mutateAsync(removing.id);
          await refetch();
        }}
      />
    </div>
  );
}
