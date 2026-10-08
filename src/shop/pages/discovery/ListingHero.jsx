/**
 * Accent strip that sits between a listing's page header and its filters (Deals, New launches):
 * an icon, a one-line value statement, a few short facts and optional next-step links.
 * Facts are fixed copy about how the listing works, never numbers (the live count is in the header).
 *
 *   <ListingHero tone="saffron" icon={Percent} heading="…" points={[{ icon: Receipt, text: "…" }]} actions={…} />
 */
import { cn } from "../../components/ui/index.js";

const TONES = {
  saffron: {
    box: "border-shop-saffron/30 bg-shop-saffron-soft",
    icon: "bg-shop-saffron text-white",
    ink: "text-shop-saffron-ink",
    glow: "bg-[radial-gradient(60%_120%_at_100%_0%,rgba(233,185,73,0.22),transparent_60%)]",
  },
  primary: {
    box: "border-shop-primary/25 bg-shop-primary-soft",
    icon: "bg-shop-primary text-white",
    ink: "text-shop-primary-ink",
    glow: "bg-[radial-gradient(60%_120%_at_100%_0%,rgba(15,122,74,0.18),transparent_60%)]",
  },
};

export function ListingHero({ tone = "primary", icon: Icon, heading, points = [], actions, className }) {
  const t = TONES[tone] || TONES.primary;
  return (
    <section aria-label={typeof heading === "string" ? heading : undefined} className={cn("relative isolate overflow-hidden rounded-[1.25rem] border px-4 py-4 sm:px-5", t.box, className)}>
      <div aria-hidden className={cn("pointer-events-none absolute inset-0 -z-10", t.glow)} />
      <div className="flex flex-wrap items-center gap-x-6 gap-y-3">
        <div className="flex min-w-0 flex-1 basis-72 items-start gap-3">
          {Icon ? (
            <span className={cn("grid size-10 shrink-0 place-items-center rounded-full", t.icon)}>
              <Icon className="size-5" strokeWidth={2} aria-hidden />
            </span>
          ) : null}
          <div className="min-w-0">
            <p className={cn("font-display text-shop-md font-bold", t.ink)}>{heading}</p>
            {points.length ? (
              <ul className="mt-1.5 flex flex-wrap gap-x-4 gap-y-1 text-shop-sm text-shop-text">
                {points.map(({ icon: PIcon, text }) => (
                  <li key={text} className="inline-flex items-center gap-1.5">
                    {PIcon ? <PIcon className={cn("size-4 shrink-0", t.ink)} strokeWidth={1.75} aria-hidden /> : null}
                    {text}
                  </li>
                ))}
              </ul>
            ) : null}
          </div>
        </div>
        {actions ? <div className="flex flex-wrap items-center gap-2">{actions}</div> : null}
      </div>
    </section>
  );
}

export default ListingHero;
