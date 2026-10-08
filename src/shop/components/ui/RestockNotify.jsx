import { useState } from "react";
import { BellRing } from "lucide-react";
import { useMutation } from "@tanstack/react-query";
import { toast } from "sonner";
import { api } from "../../../shared/api/index.js";
import { useViewer } from "../../hooks/useViewer.js";
import { Button } from "./Button.jsx";
import { Dialog } from "./Overlays.jsx";
import { Field, Input } from "./form.jsx";

/**
 * Restock alert. Signed in: one tap. Guests: asks for an email (double opt-in: the server answers
 * 202 pendingConfirmation and mails a link to /restock/confirm).
 */
export function useRestockAlert(product) {
  return useMutation({
    mutationFn: ({ email, variantId }) => api.notifyRestock(product.slug, { ...(email ? { email } : {}), ...(variantId ? { variantId } : {}) }),
    onSuccess: (res) =>
      res?.pendingConfirmation
        ? toast.success("Check your inbox", { description: "Confirm the email we sent to get the restock alert." })
        : toast.success("We’ll tell you when it’s back", { description: product.name }),
    onError: (err) => toast.error(err?.message || "Could not set the alert"),
  });
}

export function NotifyMeButton({ product, variantId, size = "md", block = true, className }) {
  const { signedIn } = useViewer();
  const alert = useRestockAlert(product);
  const [open, setOpen] = useState(false);
  const [email, setEmail] = useState("");
  const vid = variantId || product?.defaultVariant?.id;
  return (
    <>
      <Button
        variant="secondary"
        size={size}
        block={block}
        className={className}
        leftIcon={BellRing}
        loading={alert.isPending}
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          if (signedIn) alert.mutate({ variantId: vid });
          else setOpen(true);
        }}
      >
        Notify me
      </Button>
      {!signedIn ? (
        <Dialog
          open={open}
          onOpenChange={setOpen}
          title="Get a restock alert"
          description={`We’ll email you once when ${product?.name || "this item"} is back in stock.`}
          busy={alert.isPending}
          footer={
            <>
              <Button variant="ghost" onClick={() => setOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" form="restock-form" loading={alert.isPending}>
                Notify me
              </Button>
            </>
          }
        >
          <form
            id="restock-form"
            onSubmit={(e) => {
              e.preventDefault();
              alert.mutate({ email, variantId: vid }, { onSuccess: () => setOpen(false) });
            }}
          >
            <Field label="Email" error={alert.error?.fieldError?.("email")} required>
              <Input type="email" inputMode="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} />
            </Field>
          </form>
        </Dialog>
      ) : null}
    </>
  );
}
