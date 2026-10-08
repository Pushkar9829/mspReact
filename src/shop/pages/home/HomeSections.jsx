/**
 * Sections directly under the hero:
 *  - TrustRibbon: the trust facts from public settings as one slim, divided strip (2×2 on phones
 *    instead of a tall list).
 *  (The category section lives in CategoryShowcase.jsx.)
 */
import { cn, Skeleton, trustFacts } from "../../components/ui/index.js";
import { usePublicSettings } from "../../hooks/index.js";

/* ------------------------------------------------------------------ trust ribbon */

export function TrustRibbon() {
  const settings = usePublicSettings();
  const facts = trustFacts(settings.data);
  if (settings.isPending) return <Skeleton className="h-[4.5rem] w-full rounded-[1.25rem]" />;
  if (!facts.length) return null;
  return (
    <ul
      aria-label="Why buy here"
      className={cn(
        "grid grid-cols-2 overflow-hidden rounded-[1.25rem] border border-shop-line bg-shop-card",
        facts.length === 3 ? "lg:grid-cols-3" : "lg:grid-cols-4"
      )}
    >
      {facts.map(({ id, icon: Icon, title, text }, n) => (
        <li
          key={id}
          className={cn(
            "flex items-center gap-3 px-4 py-3.5 sm:px-5",
            // dividers: vertical between columns, horizontal between the two phone rows
            n % 2 === 1 && "border-l border-shop-line",
            n >= 2 && "border-t border-shop-line lg:border-t-0",
            n >= 1 && "lg:border-l"
          )}
        >
          <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-shop-primary-soft text-shop-primary-ink sm:size-10">
            <Icon className="size-[18px] sm:size-5" strokeWidth={1.8} aria-hidden />
          </span>
          <span className="min-w-0">
            <span className="block text-shop-sm font-semibold leading-snug text-shop-ink">{title}</span>
            <span className="hidden text-shop-xs text-shop-muted sm:block">{text}</span>
          </span>
        </li>
      ))}
    </ul>
  );
}
