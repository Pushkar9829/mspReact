import { useState } from "react";
import { Package } from "lucide-react";
import { cn } from "./cn.js";

/**
 * Packshot in a fixed 1:1 well: object-contain with ~12% padding, lazy by default, skeleton while
 * loading, neutral icon tile when the image is missing or fails. Never shows a broken image.
 *
 *   <ImageWithFallback src={product.image} alt={product.name} sizes="(min-width:1024px) 240px, 45vw" />
 *
 * `srcSet` / `sizes` pass through. Set `priority` for the LCP image (eager + fetchpriority=high).
 * `ratio`: "square" (default) | "auto" (the parent sizes it).
 */
export function ImageWithFallback({ src, alt = "", className, imgClassName, srcSet, sizes, priority = false, ratio = "square", padded = true, rounded = true, fit = "contain", fallbackName }) {
  const [state, setState] = useState(src ? "loading" : "error");
  const [lastSrc, setLastSrc] = useState(src);
  if (src !== lastSrc) {
    setLastSrc(src);
    setState(src ? "loading" : "error");
  }
  return (
    <div className={cn("relative overflow-hidden bg-shop-well", ratio === "square" && "aspect-square", rounded && "rounded-well", className)}>
      {state === "loading" ? <div aria-hidden className="shop-skeleton absolute inset-0" /> : null}
      {state === "error" ? (
        fallbackName ? (
          // Tinted monogram: reads as intentional, unlike a generic "missing image" icon.
          <div className={cn("absolute inset-0 grid place-items-center", monoTone(fallbackName))} role={alt ? "img" : undefined} aria-label={alt || undefined}>
            <span aria-hidden className="font-display text-shop-2xl font-bold tracking-tight opacity-80">
              {monoLetters(fallbackName)}
            </span>
          </div>
        ) : (
          <div className="absolute inset-0 grid place-items-center text-shop-subtle" role={alt ? "img" : undefined} aria-label={alt || undefined}>
            <Package className="size-1/4 min-h-6 min-w-6" strokeWidth={1.25} aria-hidden />
          </div>
        )
      ) : (
        <img
          src={src}
          srcSet={srcSet}
          sizes={sizes}
          alt={alt}
          loading={priority ? "eager" : "lazy"}
          fetchPriority={priority ? "high" : undefined}
          decoding="async"
          onLoad={() => setState("ready")}
          onError={() => setState("error")}
          // A cached failure can happen before React attaches onError.
          ref={(img) => {
            if (img && img.complete && img.naturalWidth === 0 && state !== "error") setState("error");
          }}
          className={cn(
            "absolute inset-0 size-full transition-opacity duration-200",
            fit === "cover" ? "object-cover" : "object-contain mix-blend-multiply",
            padded && fit !== "cover" && "p-[12%]",
            state === "ready" ? "opacity-100" : "opacity-0",
            imgClassName
          )}
        />
      )}
    </div>
  );
}

const CARD_TONES = ["bg-gradient-to-br from-[#fbf3dc] to-[#f3e2b3] text-[#7a5600]", "bg-gradient-to-br from-[#e8f4ee] to-[#c9e5d6] text-[#0b5a37]", "bg-gradient-to-br from-[#e7eefc] to-[#cfdcf6] text-[#23468f]", "bg-gradient-to-br from-[#fdeee5] to-[#f6d2bb] text-[#a63c08]", "bg-gradient-to-br from-[#f3ecfb] to-[#e0d0f3] text-[#5b3a8c]"];
function monoTone(name) {
  let h = 0;
  for (const ch of String(name)) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  return CARD_TONES[h % CARD_TONES.length];
}
function monoLetters(name) {
  const words = String(name || "").replace(/[^A-Za-z0-9 ]/g, " ").split(/\s+/).filter((w) => w && !/^\d/.test(w));
  return ((words[0]?.[0] || "") + (words[1]?.[0] || "")).toUpperCase() || "•";
}

const MONO_TONES = ["bg-shop-primary-soft text-shop-primary-ink", "bg-shop-gold-soft text-shop-gold-ink", "bg-shop-info-soft text-shop-info-ink", "bg-shop-saffron-soft text-shop-saffron-ink", "bg-shop-well text-shop-ink"];

/** Brand monogram tile (until real logos exist). Uses the logo when the API has one. */
export function BrandMonogram({ name = "", logo, size = "md", className }) {
  const letters = String(name).trim().split(/\s+/).map((w) => w[0]).join("").slice(0, 2).toUpperCase() || "?";
  const tone = MONO_TONES[[...String(name)].reduce((n, c) => n + c.charCodeAt(0), 0) % MONO_TONES.length];
  const dims = { sm: "size-8 text-shop-xs", md: "size-11 text-shop-sm", lg: "size-16 text-shop-lg" }[size] || size;
  if (logo) {
    return (
      <span className={cn("inline-grid shrink-0 place-items-center overflow-hidden rounded-full border border-shop-line bg-white", dims, className)}>
        <img src={logo} alt={name} loading="lazy" className="size-full object-contain p-1" />
      </span>
    );
  }
  return (
    <span aria-hidden={!name} title={name} className={cn("inline-grid shrink-0 place-items-center rounded-full font-display font-bold", tone, dims, className)}>
      {letters}
    </span>
  );
}
