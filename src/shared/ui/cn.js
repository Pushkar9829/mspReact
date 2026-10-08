import { clsx } from "clsx";
import { extendTailwindMerge } from "tailwind-merge";

const merge = extendTailwindMerge({
  extend: { theme: { text: ["ui-2xs", "ui-xs", "ui-sm", "ui", "ui-lg", "title", "display", "hero"] } },
});

/** className helper: conditional classes + Tailwind conflict resolution (later wins). */
export function cn(...inputs) {
  return merge(clsx(inputs));
}

export default cn;
