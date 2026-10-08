/**
 * Add / edit an address in a sheet (bottom sheet on phones) with the shared AddressForm.
 *   <AddressSheet open onOpenChange address={editing|null} onSaved={(addr) => …} />
 * On edit, optional fields that were cleared are sent as "" so the API really clears them.
 */
import { AddressForm } from "../ui/Address.jsx";
import { ShopSheet } from "../ui/Overlays.jsx";
import { useAddressActions } from "../../hooks/useAddresses.js";

export const MAX_ADDRESSES = 50;

export function AddressSheet({ open, onOpenChange, address = null, onSaved, showDefault = true, title }) {
  const { create, update } = useAddressActions();
  const editing = Boolean(address?.id || address?._id);
  const m = editing ? update : create;

  async function submit(body) {
    const payload = editing ? { ...body, label: body.label ?? "" } : body;
    try {
      const saved = editing ? await update.mutateAsync({ id: address.id || address._id, body: payload }) : await create.mutateAsync(payload);
      onSaved?.(saved ? { ...saved, id: String(saved._id || saved.id) } : null);
      onOpenChange(false);
    } catch {
      /* the form shows m.error (inline field errors from ApiError.fields) */
    }
  }

  return (
    <ShopSheet
      open={open}
      onOpenChange={(v) => {
        if (!v) m.reset();
        if (!m.isPending) onOpenChange(v);
      }}
      size="lg"
      title={title || (editing ? "Edit address" : "Add a delivery address")}
      description="Used for delivery and printed on the GST invoice."
    >
      <AddressForm key={address?.id || "new"} initial={address || undefined} onSubmit={submit} onCancel={() => onOpenChange(false)} busy={m.isPending} error={m.error} showDefault={showDefault} submitLabel={editing ? "Save changes" : "Save address"} />
    </ShopSheet>
  );
}
