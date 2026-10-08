/**
 * Visual identity for categories (icon + tint), matched on the category's name/slug, and product
 * counts rolled up from search facets. Shared by the home "Shop by category" grid and the header
 * mega-menu so a category looks the same everywhere.
 */
import {
  Apple,
  Baby,
  Coffee,
  Cookie,
  CookingPot,
  HeartPulse,
  Leaf,
  Milk,
  Package,
  PenLine,
  Plug,
  Shirt,
  ShoppingBasket,
  Sparkles,
  SprayCan,
  Wheat,
} from "lucide-react";

export const CATEGORY_LOOKS = [
  { test: /staple|atta|flour|rice|grain|pulse|dal|cooking|masala|spice/i, icon: Wheat, tint: "from-[#fbf3dc] to-[#f3e2b3]", ink: "text-[#7a5600]", soft: "bg-[#fbf3dc]" },
  { test: /beverage|drink|tea|coffee|juice/i, icon: Coffee, tint: "from-[#f6ebe2] to-[#e9d2bd]", ink: "text-[#6b3f1d]", soft: "bg-[#f6ebe2]" },
  { test: /snack|biscuit|cookie|namkeen|chocolate|sweet/i, icon: Cookie, tint: "from-[#fdeee5] to-[#f6d2bb]", ink: "text-[#a63c08]", soft: "bg-[#fdeee5]" },
  { test: /personal|beauty|soap|shampoo|skin|hair/i, icon: Sparkles, tint: "from-[#f3ecfb] to-[#e0d0f3]", ink: "text-[#5b3a8c]", soft: "bg-[#f3ecfb]" },
  { test: /home care|clean|detergent|household|tissue|laundry/i, icon: SprayCan, tint: "from-[#e7eefc] to-[#cfdcf6]", ink: "text-[#23468f]", soft: "bg-[#e7eefc]" },
  { test: /baby|kid/i, icon: Baby, tint: "from-[#fdeef3] to-[#f5d2de]", ink: "text-[#9a2c56]", soft: "bg-[#fdeef3]" },
  { test: /health|wellness|pharma|medic/i, icon: HeartPulse, tint: "from-[#e8f4ee] to-[#c9e5d6]", ink: "text-[#0b5a37]", soft: "bg-[#e8f4ee]" },
  { test: /dairy|milk|bakery|bread|butter|cheese/i, icon: Milk, tint: "from-[#eef6fb] to-[#d4e7f3]", ink: "text-[#1f5a7a]", soft: "bg-[#eef6fb]" },
  { test: /fruit|vegetable|fresh|produce/i, icon: Apple, tint: "from-[#eef7e6] to-[#d3ebbf]", ink: "text-[#3d6b12]", soft: "bg-[#eef7e6]" },
  { test: /fashion|fasion|apparel|cloth|garment|readymade|wear/i, icon: Shirt, tint: "from-[#f3ecfb] to-[#e2d6f6]", ink: "text-[#4c2f86]", soft: "bg-[#f3ecfb]" },
  { test: /pan|paan|tobacco|mukhwas|supari/i, icon: Leaf, tint: "from-[#eef7e6] to-[#d3ebbf]", ink: "text-[#3d6b12]", soft: "bg-[#eef7e6]" },
  { test: /kitchen|utensil|cookware/i, icon: CookingPot, tint: "from-[#f2f0ea] to-[#e0dbcd]", ink: "text-[#4b4636]", soft: "bg-[#f2f0ea]" },
  { test: /stationer|office|school/i, icon: PenLine, tint: "from-[#e7eefc] to-[#cfdcf6]", ink: "text-[#23468f]", soft: "bg-[#e7eefc]" },
  { test: /electric|electronic|battery|bulb/i, icon: Plug, tint: "from-[#fff4d6] to-[#f6e2a8]", ink: "text-[#6e4f00]", soft: "bg-[#fff4d6]" },
  { test: /packag|disposable|carton/i, icon: Package, tint: "from-[#f2f0ea] to-[#e0dbcd]", ink: "text-[#4b4636]", soft: "bg-[#f2f0ea]" },
];
export const DEFAULT_CATEGORY_LOOK = { icon: ShoppingBasket, tint: "from-[#f2f0ea] to-[#e6e3da]", ink: "text-shop-ink", soft: "bg-shop-well" };

export function lookFor(c) {
  const key = `${c?.slug || ""} ${c?.name || ""}`;
  return CATEGORY_LOOKS.find((l) => l.test.test(key)) || DEFAULT_CATEGORY_LOOK;
}

/**
 * Product counts per category id from search facets (`facets.categories`, counted on each product's
 * own category), rolled up so a parent includes its sub-categories.
 *   const countOf = categoryCounter(facetRows);  countOf(category) → number
 */
export function categoryCounter(facetRows = []) {
  const byId = new Map(facetRows.map((f) => [String(f.id), f.count || 0]));
  const countOf = (c) => (byId.get(String(c.id)) || 0) + (c.children || []).reduce((n, ch) => n + countOf(ch), 0);
  return countOf;
}
