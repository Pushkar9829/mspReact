import { clsx } from "clsx";
import { extendTailwindMerge } from "tailwind-merge";

/**
 * className helper for the shop: conditional classes + Tailwind conflict resolution (later wins).
 * Knows the shop type scale (text-shop-*), radii (rounded-card|control|well) and shadows, so
 * `text-shop-sm text-shop-ink` keeps both (size + colour).
 */
const merge = extendTailwindMerge({
  extend: {
    theme: {
      text: ["shop-xs", "shop-sm", "shop-base", "shop-md", "shop-lg", "shop-xl", "shop-2xl", "shop-3xl", "ui-2xs", "ui-xs", "ui-sm", "ui", "ui-lg", "title", "display", "hero"],
      radius: ["card", "control", "well"],
      shadow: ["shop-hover", "shop-pop", "card", "lift", "pop"],
    },
  },
});

export function cn(...inputs) {
  return merge(clsx(inputs));
}

export default cn;
