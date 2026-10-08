/**
 * Buyer addresses.
 *   const { addresses, defaultAddress, isPending } = useAddresses();
 *   const { create, update, remove } = useAddressActions();
 *   create.mutateAsync(body)  update.mutateAsync({ id, body })  remove.mutate(id)
 * Bodies are strict (see AddressForm → toAddressBody). Clearing addressLine2 sends "" (not undefined).
 */
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { api } from "../../shared/api/index.js";
import { shopKeys } from "./keys.js";
import { useViewer } from "./useViewer.js";

export function useAddresses({ enabled = true } = {}) {
  const { viewer, signedIn } = useViewer();
  const query = useQuery({
    queryKey: shopKeys.addresses(viewer),
    queryFn: () => api.listAddresses(),
    enabled: signedIn && enabled,
    staleTime: 60_000,
    select: (res) => (Array.isArray(res) ? res : res?.data || []).map((a) => ({ ...a, id: String(a._id || a.id) })),
  });
  const addresses = query.data || [];
  return { ...query, addresses, defaultAddress: addresses.find((a) => a.isDefault) || addresses[0] || null };
}

export function useAddressActions() {
  const qc = useQueryClient();
  const { viewer } = useViewer();
  const key = shopKeys.addresses(viewer);
  const settle = () => {
    qc.invalidateQueries({ queryKey: key });
    qc.invalidateQueries({ queryKey: [...shopKeys.all, "preview", viewer] });
    qc.invalidateQueries({ queryKey: [...shopKeys.all, "payment-options", viewer] });
  };
  const create = useMutation({ mutationFn: (body) => api.createAddress(body), onSuccess: () => toast.success("Address saved"), onSettled: settle });
  const update = useMutation({ mutationFn: ({ id, body }) => api.updateAddress(id, body), onSuccess: () => toast.success("Address updated"), onSettled: settle });
  const remove = useMutation({
    mutationFn: (id) => api.deleteAddress(id),
    onSuccess: () => toast.success("Address removed"),
    onError: (err) => toast.error(err?.message || "Could not remove the address"),
    onSettled: settle,
  });
  return { create, update, remove };
}
