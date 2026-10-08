/**
 * Delivery PIN code for the whole storefront (replaces the cosmetic city picker).
 *
 *   const { pincode, setPincode, clearPincode, state, source, serviceability } = usePincode();
 *   serviceability: { status: "unknown" | "checking" | "serviceable" | "unserviceable", productCount }
 *
 * - Persisted on this device (localStorage "msr-pincode").
 * - Signed in: if the buyer has not picked one manually, the default address's PIN is used; picking a
 *   PIN also saves it to the profile (PUT /location/me) so it follows the account.
 * - Serviceability today = "do any products deliver here" (search with postalCode). Per-product ETA
 *   comes from usePincodeEta(product) (product serviceability endpoint, falling back to the store's zones).
 */
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { api } from "../../shared/api/index.js";
import { shopKeys } from "../hooks/keys.js";
import { useViewer } from "../hooks/useViewer.js";
import { useAddresses } from "../hooks/useAddresses.js";
import { STORAGE, readJson, writeJson } from "../lib/storage.js";
import { isValidPin, stateForPin } from "../lib/indianAddress.js";

const PincodeContext = createContext(null);

export function PincodeProvider({ children }) {
  const { signedIn, user } = useViewer();
  const [saved, setSaved] = useState(() => readJson(STORAGE.pincode, null));
  const { defaultAddress } = useAddresses({ enabled: signedIn });

  // Signed-in default: the default address (unless the buyer picked a PIN by hand), else profile location.
  useEffect(() => {
    if (!signedIn) return;
    if (saved?.source === "manual") return;
    const pin = defaultAddress?.postalCode || user?.profile?.location?.postalCode;
    if (pin && isValidPin(pin) && pin !== saved?.pincode) {
      const next = { pincode: pin, city: defaultAddress?.city || user?.profile?.location?.city || "", state: defaultAddress?.state || stateForPin(pin), source: "address" };
      setSaved(next);
      writeJson(STORAGE.pincode, next);
    }
  }, [signedIn, defaultAddress, user?.profile?.location, saved?.source, saved?.pincode]);

  const setPincode = useCallback(
    (pin, extra = {}) => {
      const p = String(pin || "").trim();
      if (!isValidPin(p)) return false;
      const next = { pincode: p, city: extra.city || "", state: extra.state || stateForPin(p), source: extra.source || "manual" };
      setSaved(next);
      writeJson(STORAGE.pincode, next);
      if (signedIn && next.source === "manual") api.setMyLocation({ postalCode: p, ...(next.state ? { state: next.state } : {}), ...(next.city ? { city: next.city } : {}) }).catch(() => {});
      return true;
    },
    [signedIn]
  );

  const clearPincode = useCallback(() => {
    setSaved(null);
    writeJson(STORAGE.pincode, null);
  }, []);

  const pincode = saved?.pincode || "";
  const check = useQuery({
    queryKey: shopKeys.serviceability("any", pincode),
    queryFn: () => api.searchProducts({ postalCode: pincode, limit: 1 }),
    enabled: Boolean(pincode),
    staleTime: 10 * 60_000,
  });
  const count = check.data?.meta?.total ?? null;
  const serviceability = {
    status: !pincode ? "unknown" : check.isPending ? "checking" : check.error ? "unknown" : count > 0 ? "serviceable" : "unserviceable",
    productCount: count,
  };

  const value = useMemo(
    () => ({ pincode, city: saved?.city || "", state: saved?.state || "", source: saved?.source || null, setPincode, clearPincode, serviceability }),
    [pincode, saved?.city, saved?.state, saved?.source, setPincode, clearPincode, serviceability.status, serviceability.productCount] // eslint-disable-line react-hooks/exhaustive-deps
  );
  return <PincodeContext.Provider value={value}>{children}</PincodeContext.Provider>;
}

export function usePincode() {
  const ctx = useContext(PincodeContext);
  if (!ctx) throw new Error("usePincode must be used inside PincodeProvider (ShopLayout)");
  return ctx;
}

/**
 * Delivery estimate for one product at the current PIN (GET /products/:slug/serviceability).
 * → { status: "unknown" | "checking" | "serviceable" | "unserviceable" | "pickup_only" | "out_of_stock",
 *     etaDaysMin, etaDaysMax, etaFrom, etaTo, fee, codAvailable, pickupAvailable, freeDeliveryAbove, reason }
 */
export function usePincodeEta(product) {
  const { pincode } = usePincode();
  const slug = product?.slug;
  const q = useQuery({
    queryKey: shopKeys.serviceability(slug || "none", pincode),
    queryFn: () => api.productServiceability(slug, pincode),
    enabled: Boolean(pincode && slug),
    staleTime: 10 * 60_000,
    retry: false,
  });
  if (!pincode || !slug) return { status: "unknown" };
  if (q.isPending) return { status: "checking" };
  if (q.error) return { status: "unknown", error: q.error };
  const d = q.data || {};
  const status =
    d.reasonCode === "OUT_OF_STOCK" ? "out_of_stock" : d.reasonCode === "PICKUP_ONLY" ? "pickup_only" : d.deliverable === false ? "unserviceable" : "serviceable";
  return {
    status,
    reason: d.reason || "",
    etaDaysMin: d.etaDaysMin ?? null,
    etaDaysMax: d.etaDaysMax ?? null,
    etaFrom: d.etaFrom || null,
    etaTo: d.etaTo || null,
    fee: d.fee ?? null,
    codAvailable: d.codAvailable ?? null,
    pickupAvailable: Boolean(d.pickupAvailable),
    freeDeliveryAbove: d.freeDeliveryAbove ?? null,
  };
}
