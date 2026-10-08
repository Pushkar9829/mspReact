import { useEffect, useRef, useState } from "react";
import { Popover as RPopover } from "radix-ui";
import { CheckCircle2, ChevronDown, Loader2, MapPin, Truck, XCircle } from "lucide-react";
import { cn } from "./cn.js";
import { Button } from "./Button.jsx";
import { usePincode, usePincodeEta } from "../../context/PincodeContext.jsx";
import { useAddresses } from "../../hooks/useAddresses.js";
import { useViewer } from "../../hooks/useViewer.js";
import { isValidPin } from "../../lib/indianAddress.js";

function PinForm({ onDone, autoFocus = true }) {
  const { pincode, setPincode } = usePincode();
  const { signedIn } = useViewer();
  const { addresses } = useAddresses({ enabled: signedIn });
  const [value, setValue] = useState(pincode);
  const [error, setError] = useState("");
  const ref = useRef(null);
  useEffect(() => {
    if (autoFocus) ref.current?.focus();
  }, [autoFocus]);

  function submit(e) {
    e.preventDefault();
    if (!isValidPin(value)) {
      setError("Enter a valid 6-digit PIN code");
      return;
    }
    setPincode(value);
    onDone?.();
  }

  return (
    <div className="grid gap-3">
      <form onSubmit={submit} noValidate className="grid gap-1.5">
        <label htmlFor="pin-input" className="text-shop-sm font-semibold text-shop-ink">
          Delivery PIN code
        </label>
        <div className="flex gap-2">
          <input
            ref={ref}
            id="pin-input"
            value={value}
            onChange={(e) => {
              setValue(e.target.value.replace(/\D/g, "").slice(0, 6));
              setError("");
            }}
            inputMode="numeric"
            autoComplete="postal-code"
            pattern="[1-9][0-9]{5}"
            maxLength={6}
            placeholder="e.g. 400001"
            aria-invalid={Boolean(error)}
            aria-describedby={error ? "pin-error" : "pin-hint"}
            className="h-11 min-w-0 flex-1 rounded-control border border-shop-line-strong bg-shop-card px-3 text-shop-md tabular-nums tracking-wider text-shop-ink focus:border-shop-primary focus:outline-none aria-[invalid=true]:border-shop-danger"
          />
          <Button type="submit">Check</Button>
        </div>
        {error ? (
          <p id="pin-error" role="alert" className="text-shop-xs font-medium text-shop-danger-ink">
            {error}
          </p>
        ) : (
          <p id="pin-hint" className="text-shop-xs text-shop-muted">
            Prices, stock and delivery dates depend on where you are.
          </p>
        )}
      </form>
      {addresses.length ? (
        <div className="border-t border-shop-line pt-3">
          <p className="mb-1.5 text-shop-xs font-semibold text-shop-muted">Your addresses</p>
          <ul className="grid gap-1">
            {addresses.slice(0, 4).map((a) => (
              <li key={a.id}>
                <button
                  type="button"
                  onClick={() => {
                    setPincode(a.postalCode, { city: a.city, state: a.state, source: "address" });
                    onDone?.();
                  }}
                  className="flex min-h-11 w-full items-center gap-2 rounded-control px-2 text-left text-shop-sm hover:bg-shop-hover"
                >
                  <MapPin className="size-4 shrink-0 text-shop-muted" aria-hidden />
                  <span className="min-w-0 flex-1 truncate">
                    <span className="font-semibold text-shop-ink">{a.label || a.contactName}</span> · {a.city} {a.postalCode}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </div>
  );
}

function StatusLine({ serviceability }) {
  if (serviceability.status === "checking")
    return (
      <span className="inline-flex items-center gap-1 text-shop-xs text-shop-muted">
        <Loader2 className="size-3.5 animate-spin" aria-hidden /> Checking delivery…
      </span>
    );
  if (serviceability.status === "serviceable")
    return (
      <span className="inline-flex items-center gap-1 text-shop-xs font-medium text-shop-primary-ink">
        <CheckCircle2 className="size-3.5" aria-hidden /> {serviceability.productCount} products deliver here
      </span>
    );
  if (serviceability.status === "unserviceable")
    return (
      <span className="inline-flex items-center gap-1 text-shop-xs font-medium text-shop-danger-ink">
        <XCircle className="size-3.5" aria-hidden /> No sellers deliver here yet
      </span>
    );
  return null;
}

/**
 * Delivery PIN code.
 *   <PincodeCheck variant="header" />   // navy header chip + popover (persisted, synced with the default address)
 *   <PincodeCheck variant="inline" product={p} />  // PDP: ETA / serviceability for this product
 */
export function PincodeCheck({ variant = "header", product, className }) {
  const pin = usePincode();
  const [open, setOpen] = useState(false);

  if (variant === "inline") return <InlinePincode product={product} className={className} />;

  return (
    <RPopover.Root open={open} onOpenChange={setOpen}>
      <RPopover.Trigger asChild>
        <button
          type="button"
          className={cn("flex min-h-11 max-w-48 items-center gap-2 rounded-full px-2.5 text-left text-white transition-colors hover:bg-white/10 data-[state=open]:bg-white/10", className)}
          aria-label={pin.pincode ? `Delivering to PIN ${pin.pincode}. Change` : "Set delivery PIN code"}
        >
          <MapPin className="size-5 shrink-0 text-shop-gold" strokeWidth={1.75} aria-hidden />
          <span className="hidden min-w-0 sm:block">
            <span className="block text-shop-xs leading-none text-shop-on-navy-muted">{pin.pincode ? "Deliver to" : "Set location"}</span>
            <span className="mt-0.5 block truncate text-shop-sm font-semibold leading-tight tabular-nums">
              {pin.pincode ? `${pin.city ? `${pin.city} ` : ""}${pin.pincode}` : "Enter PIN code"}
            </span>
          </span>
          <ChevronDown className="hidden size-4 shrink-0 text-shop-on-navy-muted sm:block" aria-hidden />
        </button>
      </RPopover.Trigger>
      <RPopover.Portal>
        <RPopover.Content align="start" sideOffset={8} className="z-50 w-[min(92vw,22rem)] rounded-card border border-shop-line bg-shop-card p-4 text-shop-text shadow-shop-pop outline-none data-[state=open]:animate-scale-in">
          <PinForm onDone={() => setOpen(false)} />
          {pin.pincode ? (
            <div className="mt-3">
              <StatusLine serviceability={pin.serviceability} />
            </div>
          ) : null}
        </RPopover.Content>
      </RPopover.Portal>
    </RPopover.Root>
  );
}

function InlinePincode({ product, className }) {
  const pin = usePincode();
  const eta = usePincodeEta(product);
  const [editing, setEditing] = useState(false);
  if (!pin.pincode || editing) {
    return (
      <div className={cn("rounded-card border border-shop-line bg-shop-card p-4", className)}>
        <PinForm autoFocus={editing} onDone={() => setEditing(false)} />
      </div>
    );
  }
  return (
    <div className={cn("flex items-start gap-3 rounded-card border border-shop-line bg-shop-card p-4", className)}>
      <Truck className="mt-0.5 size-5 shrink-0 text-shop-muted" strokeWidth={1.75} aria-hidden />
      <div className="min-w-0 flex-1 text-shop-sm">
        <p className="text-shop-muted">
          Delivering to <span className="font-semibold tabular-nums text-shop-ink">{pin.city ? `${pin.city} ` : ""}{pin.pincode}</span>
        </p>
        <p className="mt-0.5" aria-live="polite">
          {eta.status === "checking" ? (
            <span className="text-shop-muted">Checking…</span>
          ) : eta.status === "unserviceable" || eta.status === "pickup_only" ? (
            <span className="font-medium text-shop-danger-ink">{eta.reason || "This seller doesn’t deliver to this PIN yet"}{eta.pickupAvailable ? " · store pickup available" : ""}</span>
          ) : eta.status === "out_of_stock" ? (
            <span className="font-medium text-shop-warning-ink">Delivers here, but out of stock right now</span>
          ) : eta.status === "serviceable" ? (
            <span className="font-medium text-shop-primary-ink">
              {eta.etaDaysMin != null ? `Delivery in ${eta.etaDaysMin === eta.etaDaysMax ? eta.etaDaysMin : `${eta.etaDaysMin}–${eta.etaDaysMax}`} days` : "Delivers to this PIN"}
              {eta.fee != null ? <span className="font-normal text-shop-muted"> · {eta.fee > 0 ? `delivery ₹${eta.fee}` : "free delivery"}</span> : null}
              {eta.codAvailable ? <span className="font-normal text-shop-muted"> · COD available</span> : null}
            </span>
          ) : (
            <span className="text-shop-muted">Delivery date shown at checkout</span>
          )}
        </p>
      </div>
      <button type="button" onClick={() => setEditing(true)} className="min-h-11 shrink-0 px-2 text-shop-sm font-semibold text-shop-primary-ink hover:underline">
        Change
      </button>
    </div>
  );
}

export default PincodeCheck;
