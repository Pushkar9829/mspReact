import { forwardRef } from "react";
import { DropdownMenu as RMenu, Tooltip as RTooltip, Popover as RPopover } from "radix-ui";
import { Check, ChevronRight } from "lucide-react";
import { Link } from "react-router-dom";
import { cn } from "./cn.js";

const panel = "z-50 min-w-40 overflow-hidden rounded-md border border-border bg-surface p-1 text-fg shadow-lg data-[state=open]:animate-scale-in";
const itemCls =
  "relative flex cursor-default select-none items-center gap-2 rounded-sm px-2 py-1.5 text-ui-sm outline-none data-[disabled]:pointer-events-none data-[disabled]:opacity-50 data-[highlighted]:bg-surface-hover [&_svg]:size-4 [&_svg]:shrink-0 [&_svg]:text-fg-subtle";

/* ------------------------------------------------------------------ DropdownMenu */

/**
 * <DropdownMenu trigger={<IconButton icon={MoreHorizontal} label="Actions" />} align="end">
 *   <MenuItem icon={Pencil} onSelect={edit}>Edit</MenuItem>
 *   <MenuItem to="/x">Open</MenuItem>
 *   <MenuSeparator />
 *   <MenuItem tone="danger" icon={Trash2} onSelect={remove} disabled={!can("x")}>Delete</MenuItem>
 * </DropdownMenu>
 */
export function DropdownMenu({ trigger, children, align = "end", side = "bottom", className, open, onOpenChange, modal }) {
  return (
    <RMenu.Root open={open} onOpenChange={onOpenChange} modal={modal}>
      <RMenu.Trigger asChild>{trigger}</RMenu.Trigger>
      <RMenu.Portal>
        <RMenu.Content align={align} side={side} sideOffset={4} collisionPadding={8} className={cn(panel, className)}>
          {children}
        </RMenu.Content>
      </RMenu.Portal>
    </RMenu.Root>
  );
}

export const MenuItem = forwardRef(function MenuItem({ icon: Icon, tone, children, shortcut, className, to, ...props }, ref) {
  const content = (
    <>
      {Icon ? <Icon aria-hidden /> : null}
      <span className="flex-1 truncate">{children}</span>
      {shortcut ? <span className="ml-4 text-ui-2xs tracking-wider text-fg-subtle">{shortcut}</span> : null}
    </>
  );
  const cls = cn(itemCls, tone === "danger" && "text-danger-fg [&_svg]:text-danger-fg data-[highlighted]:bg-danger-soft", className);
  if (to) {
    return (
      <RMenu.Item ref={ref} asChild className={cls} {...props}>
        <Link to={to}>{content}</Link>
      </RMenu.Item>
    );
  }
  return (
    <RMenu.Item ref={ref} className={cls} {...props}>
      {content}
    </RMenu.Item>
  );
});

export function MenuCheckboxItem({ checked, onCheckedChange, children, ...props }) {
  return (
    <RMenu.CheckboxItem checked={checked} onCheckedChange={onCheckedChange} onSelect={(e) => e.preventDefault()} className={cn(itemCls, "pl-7")} {...props}>
      <RMenu.ItemIndicator className="absolute left-2">
        <Check className="size-3.5" />
      </RMenu.ItemIndicator>
      {children}
    </RMenu.CheckboxItem>
  );
}

export function MenuRadioGroup({ value, onValueChange, options = [] }) {
  return (
    <RMenu.RadioGroup value={value} onValueChange={onValueChange}>
      {options.map((o) => (
        <RMenu.RadioItem key={o.value} value={o.value} className={cn(itemCls, "pl-7")}>
          <RMenu.ItemIndicator className="absolute left-2">
            <Check className="size-3.5" />
          </RMenu.ItemIndicator>
          {o.icon ? <o.icon aria-hidden /> : null}
          {o.label}
        </RMenu.RadioItem>
      ))}
    </RMenu.RadioGroup>
  );
}

export function MenuLabel({ children, className }) {
  return <RMenu.Label className={cn("px-2 py-1.5 text-ui-xs font-medium text-fg-subtle", className)}>{children}</RMenu.Label>;
}

export function MenuSeparator() {
  return <RMenu.Separator className="-mx-1 my-1 h-px bg-border" />;
}

export function SubMenu({ label, icon: Icon, children }) {
  return (
    <RMenu.Sub>
      <RMenu.SubTrigger className={itemCls}>
        {Icon ? <Icon aria-hidden /> : null}
        <span className="flex-1">{label}</span>
        <ChevronRight aria-hidden />
      </RMenu.SubTrigger>
      <RMenu.Portal>
        <RMenu.SubContent sideOffset={6} className={panel}>
          {children}
        </RMenu.SubContent>
      </RMenu.Portal>
    </RMenu.Sub>
  );
}

/* ------------------------------------------------------------------ Tooltip */

export const TooltipProvider = RTooltip.Provider;

/** <Tooltip content="Needs orders.update"><span><Button disabled>…</Button></span></Tooltip> */
export function Tooltip({ content, children, side = "top", align = "center", delay }) {
  if (!content) return children;
  return (
    <RTooltip.Root delayDuration={delay}>
      <RTooltip.Trigger asChild>{children}</RTooltip.Trigger>
      <RTooltip.Portal>
        <RTooltip.Content
          side={side}
          align={align}
          sideOffset={6}
          collisionPadding={8}
          className="z-[60] max-w-xs rounded-md bg-fg px-2 py-1 text-ui-xs text-bg shadow-md data-[state=delayed-open]:animate-fade-in"
        >
          {content}
        </RTooltip.Content>
      </RTooltip.Portal>
    </RTooltip.Root>
  );
}

/* ------------------------------------------------------------------ Popover */

export function Popover({ trigger, children, open, onOpenChange, align = "start", side = "bottom", className, modal }) {
  return (
    <RPopover.Root open={open} onOpenChange={onOpenChange} modal={modal}>
      <RPopover.Trigger asChild>{trigger}</RPopover.Trigger>
      <RPopover.Portal>
        <RPopover.Content
          align={align}
          side={side}
          sideOffset={6}
          collisionPadding={8}
          className={cn("z-50 rounded-lg border border-border bg-surface p-3 text-fg shadow-lg outline-none data-[state=open]:animate-scale-in", className)}
        >
          {children}
        </RPopover.Content>
      </RPopover.Portal>
    </RPopover.Root>
  );
}

export const PopoverClose = RPopover.Close;
export const PopoverAnchor = RPopover.Anchor;
