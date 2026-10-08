import { useEffect, useId, useState } from "react";
import { Dialog as RDialog, AlertDialog as RAlert } from "radix-ui";
import { X } from "lucide-react";
import { cn } from "./cn.js";
import { Button } from "./Button.jsx";
import { Field, Input, Textarea } from "./form.jsx";

const overlay = "fixed inset-0 z-50 bg-overlay data-[state=open]:animate-fade-in";

const SIZES = { sm: "max-w-sm", md: "max-w-lg", lg: "max-w-2xl", xl: "max-w-4xl" };

/**
 * Accessible modal (focus trap, Escape, aria-labelledby/-describedby).
 *
 *   <Dialog open={open} onOpenChange={setOpen} title="Edit warehouse" description="..."
 *           footer={<><Button onClick={close}>Cancel</Button><Button variant="primary" type="submit" form="wh">Save</Button></>}
 *           dirty={isDirty} busy={mutation.isPending} size="md">
 *     <form id="wh" onSubmit={...}>...</form>
 *   </Dialog>
 *
 * `dirty` or `busy` → clicking the backdrop does not close it (Escape still does unless busy; the
 * close button asks nothing — use useUnsavedChangesGuard for navigation).
 * `trigger` (optional) renders a Radix trigger for uncontrolled use.
 */
export function Dialog({ open, onOpenChange, trigger, title, description, children, footer, size = "md", dirty = false, busy = false, className, hideClose = false, initialFocus }) {
  return (
    <RDialog.Root open={open} onOpenChange={(next) => (!next && busy ? undefined : onOpenChange?.(next))}>
      {trigger ? <RDialog.Trigger asChild>{trigger}</RDialog.Trigger> : null}
      <RDialog.Portal>
        <RDialog.Overlay className={overlay} />
        <RDialog.Content
          className={cn(
            "fixed left-1/2 top-1/2 z-50 grid max-h-[calc(100dvh-2rem)] w-[calc(100vw-2rem)] -translate-x-1/2 -translate-y-1/2 grid-rows-[auto_1fr_auto] rounded-lg border border-border bg-surface text-fg shadow-lg outline-none data-[state=open]:animate-scale-in",
            SIZES[size] || SIZES.md,
            className
          )}
          onPointerDownOutside={(e) => (dirty || busy) && e.preventDefault()}
          onInteractOutside={(e) => (dirty || busy) && e.preventDefault()}
          onEscapeKeyDown={(e) => busy && e.preventDefault()}
          onOpenAutoFocus={initialFocus ? (e) => { e.preventDefault(); initialFocus.current?.focus(); } : undefined}
        >
          <div className="flex items-start justify-between gap-4 px-5 pb-2 pt-5">
            <div className="min-w-0">
              <RDialog.Title className="text-ui-lg font-semibold text-fg">{title}</RDialog.Title>
              {description ? <RDialog.Description className="mt-1 text-ui-sm text-fg-muted">{description}</RDialog.Description> : <RDialog.Description className="sr-only">{typeof title === "string" ? title : "Dialog"}</RDialog.Description>}
            </div>
            {!hideClose ? (
              <RDialog.Close asChild>
                <button type="button" disabled={busy} className="-mr-1 -mt-1 grid size-8 shrink-0 place-items-center rounded-md text-fg-subtle hover:bg-surface-hover hover:text-fg disabled:opacity-50" aria-label="Close">
                  <X className="size-4" />
                </button>
              </RDialog.Close>
            ) : null}
          </div>
          <div className="min-h-0 overflow-y-auto px-5 py-3 text-ui">{children}</div>
          {footer ? <div className="flex flex-wrap items-center justify-end gap-2 border-t border-border px-5 py-3">{footer}</div> : <div className="h-2" />}
        </RDialog.Content>
      </RDialog.Portal>
    </RDialog.Root>
  );
}

export const DialogClose = RDialog.Close;

/**
 * Confirmation for irreversible / destructive actions (role="alertdialog").
 *
 *   <ConfirmDialog open={open} onOpenChange={setOpen}
 *     title="Cancel order MSR10231?" description="Stock is released and the buyer refunded."
 *     confirmLabel="Cancel order" tone="danger"
 *     typedConfirmation="MSR10231"          // user must type this to enable the button
 *     note={{ label: "Reason", required: true }}   // optional textarea; value passed to onConfirm
 *     onConfirm={async (note) => { await mutation.mutateAsync(note); }} />
 *
 * onConfirm may return a promise: the dialog shows a spinner, stays open on error (the error
 * message is shown inline) and closes on success.
 */
export function ConfirmDialog({
  open,
  onOpenChange,
  title,
  description,
  children,
  confirmLabel = "Confirm",
  cancelLabel = "Cancel",
  tone = "primary",
  typedConfirmation,
  note,
  onConfirm,
  busy: busyProp,
}) {
  const [typed, setTyped] = useState("");
  const [noteValue, setNoteValue] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  const id = useId();
  const busy = busyProp ?? pending;

  useEffect(() => {
    if (open) {
      setTyped("");
      setNoteValue("");
      setError("");
    }
  }, [open]);

  const typedOk = !typedConfirmation || typed.trim() === String(typedConfirmation);
  const noteOk = !note?.required || noteValue.trim().length > 0;

  async function run(e) {
    e?.preventDefault();
    if (!typedOk || !noteOk || busy) return;
    setError("");
    setPending(true);
    try {
      await onConfirm?.(note ? noteValue.trim() : undefined);
      onOpenChange?.(false);
    } catch (err) {
      setError(err?.message || "Something went wrong");
    } finally {
      setPending(false);
    }
  }

  return (
    <RAlert.Root open={open} onOpenChange={(next) => (!next && busy ? undefined : onOpenChange?.(next))}>
      <RAlert.Portal>
        <RAlert.Overlay className={overlay} />
        <RAlert.Content className="fixed left-1/2 top-1/2 z-50 grid w-[calc(100vw-2rem)] max-w-md -translate-x-1/2 -translate-y-1/2 gap-4 rounded-lg border border-border bg-surface p-5 text-fg shadow-lg outline-none data-[state=open]:animate-scale-in">
          <form onSubmit={run} className="grid gap-4">
            <div className="grid gap-1.5">
              <RAlert.Title className="text-ui-lg font-semibold">{title}</RAlert.Title>
              <RAlert.Description className={cn("text-ui-sm text-fg-muted", !description && "sr-only")}>{description || title}</RAlert.Description>
            </div>
            {children}
            {note ? (
              <Field label={note.label || "Note"} required={note.required} id={`${id}-note`}>
                <Textarea rows={3} value={noteValue} onChange={(e) => setNoteValue(e.target.value)} maxLength={note.maxLength || 1000} placeholder={note.placeholder} />
              </Field>
            ) : null}
            {typedConfirmation ? (
              <Field label={<>Type <span className="font-mono font-semibold text-fg">{typedConfirmation}</span> to confirm</>} id={`${id}-typed`}>
                <Input value={typed} onChange={(e) => setTyped(e.target.value)} autoComplete="off" spellCheck={false} />
              </Field>
            ) : null}
            {error ? (
              <p role="alert" className="rounded-md bg-danger-soft px-3 py-2 text-ui-sm text-danger-fg">
                {error}
              </p>
            ) : null}
            <div className="flex flex-wrap justify-end gap-2">
              <RAlert.Cancel asChild>
                <Button disabled={busy}>{cancelLabel}</Button>
              </RAlert.Cancel>
              <Button type="submit" variant={tone === "danger" ? "danger" : "primary"} loading={busy} disabled={!typedOk || !noteOk}>
                {confirmLabel}
              </Button>
            </div>
          </form>
        </RAlert.Content>
      </RAlert.Portal>
    </RAlert.Root>
  );
}

/**
 * Side panel (drawer). side: "right" (default) | "left". Same props as Dialog.
 *   <Sheet open onOpenChange title="Audit entry" size="md|lg|xl">...</Sheet>
 */
export function Sheet({ open, onOpenChange, trigger, title, description, children, footer, side = "right", size = "md", dirty = false, busy = false, className, hideHeader }) {
  const width = { sm: "max-w-xs", md: "max-w-md", lg: "max-w-xl", xl: "max-w-3xl" }[size] || "max-w-md";
  return (
    <RDialog.Root open={open} onOpenChange={(next) => (!next && busy ? undefined : onOpenChange?.(next))}>
      {trigger ? <RDialog.Trigger asChild>{trigger}</RDialog.Trigger> : null}
      <RDialog.Portal>
        <RDialog.Overlay className={overlay} />
        <RDialog.Content
          className={cn(
            "fixed inset-y-0 z-50 flex w-full flex-col border-border bg-surface text-fg shadow-lg outline-none",
            side === "left" ? "left-0 border-r data-[state=open]:animate-slide-in-left" : "right-0 border-l data-[state=open]:animate-slide-in-right",
            width,
            className
          )}
          onPointerDownOutside={(e) => (dirty || busy) && e.preventDefault()}
          onInteractOutside={(e) => (dirty || busy) && e.preventDefault()}
        >
          <div className={cn("flex items-start justify-between gap-4 border-b border-border px-5 py-4", hideHeader && "sr-only")}>
            <div className="min-w-0">
              <RDialog.Title className="text-ui-lg font-semibold">{title}</RDialog.Title>
              <RDialog.Description className={cn("mt-1 text-ui-sm text-fg-muted", !description && "sr-only")}>{description || title}</RDialog.Description>
            </div>
            <RDialog.Close asChild>
              <button type="button" className="-mr-1 grid size-8 shrink-0 place-items-center rounded-md text-fg-subtle hover:bg-surface-hover hover:text-fg" aria-label="Close">
                <X className="size-4" />
              </button>
            </RDialog.Close>
          </div>
          <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4">{children}</div>
          {footer ? <div className="flex flex-wrap items-center justify-end gap-2 border-t border-border px-5 py-3">{footer}</div> : null}
        </RDialog.Content>
      </RDialog.Portal>
    </RDialog.Root>
  );
}

export const Drawer = Sheet;

/** Pair with useUnsavedChangesGuard: <UnsavedChangesDialog blocker={blocker} />. */
export function UnsavedChangesDialog({ blocker, title = "Discard unsaved changes?", description = "You have changes that haven’t been saved. If you leave now they will be lost." }) {
  const open = blocker?.state === "blocked";
  return (
    <ConfirmDialog
      open={open}
      onOpenChange={(next) => !next && blocker?.reset?.()}
      title={title}
      description={description}
      confirmLabel="Discard changes"
      cancelLabel="Keep editing"
      tone="danger"
      onConfirm={() => blocker?.proceed?.()}
    />
  );
}
