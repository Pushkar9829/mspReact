import { Dialog as RDialog } from "radix-ui";
import { X } from "lucide-react";
import { cn } from "./cn.js";

/**
 * Shop sheet: a side panel on desktop, a bottom sheet on phones (`side="bottom"`), or always from
 * the right/left. Radix Dialog underneath: focus trap, Escape, aria-labelledby, scroll lock.
 *
 *   <ShopSheet open={open} onOpenChange={setOpen} title="Filters" footer={<Button block>Show 24 products</Button>}>…</ShopSheet>
 *
 * The shared <Dialog>, <ConfirmDialog> and <Sheet> (shared/ui) also work in the shop and pick up the
 * shop tokens; use this one when you need the bottom-sheet behaviour or the shop header style.
 */
export function ShopSheet({ open, onOpenChange, title, description, children, footer, side = "auto", size = "md", className, bodyClassName, hideTitle = false }) {
  const widths = { sm: "sm:max-w-sm", md: "sm:max-w-md", lg: "sm:max-w-lg" };
  const placement =
    side === "left"
      ? "inset-y-0 left-0 h-full w-[min(88vw,24rem)] data-[state=open]:animate-slide-in-left"
      : side === "right"
        ? "inset-y-0 right-0 h-full w-[min(92vw,26rem)] data-[state=open]:animate-slide-in-right"
        : side === "bottom"
          ? "inset-x-0 bottom-0 max-h-[88dvh] w-full rounded-t-[16px]"
          : // auto: bottom sheet on phones, right panel from sm
            cn("inset-x-0 bottom-0 max-h-[88dvh] w-full rounded-t-[16px] sm:inset-x-auto sm:inset-y-0 sm:right-0 sm:h-full sm:max-h-none sm:rounded-none sm:data-[state=open]:animate-slide-in-right", widths[size]);
  return (
    <RDialog.Root open={open} onOpenChange={onOpenChange}>
      <RDialog.Portal>
        <RDialog.Overlay className="fixed inset-0 z-50 bg-[rgb(11_16_51/0.45)] data-[state=open]:animate-fade-in" />
        <RDialog.Content className={cn("fixed z-50 flex flex-col bg-shop-card text-shop-text shadow-shop-pop outline-none", placement, className)}>
          <div className={cn("flex items-center justify-between gap-3 border-b border-shop-line px-4 py-3", hideTitle && "sr-only")}>
            <div className="min-w-0">
              <RDialog.Title className="font-display text-shop-lg font-bold text-shop-ink">{title}</RDialog.Title>
              <RDialog.Description className={cn("text-shop-sm text-shop-muted", !description && "sr-only")}>{description || title}</RDialog.Description>
            </div>
            <RDialog.Close asChild>
              <button type="button" className="grid size-11 shrink-0 place-items-center rounded-control text-shop-muted hover:bg-shop-hover hover:text-shop-ink" aria-label="Close">
                <X className="size-5" aria-hidden />
              </button>
            </RDialog.Close>
          </div>
          <div className={cn("min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 py-4", bodyClassName)}>{children}</div>
          {footer ? <div className="border-t border-shop-line px-4 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">{footer}</div> : null}
        </RDialog.Content>
      </RDialog.Portal>
    </RDialog.Root>
  );
}

export { Dialog, ConfirmDialog, Sheet } from "../../../shared/ui/Dialog.jsx";
