import { Link } from "react-router-dom";
import { Apple, Baby, Coffee, Cookie, HeartPulse, Home, LayoutGrid, Milk, Sparkles, Wheat } from "lucide-react";
import { cn } from "./cn.js";

const ICONS = {
  staples: Wheat,
  beverages: Coffee,
  snacks: Cookie,
  "personal-care": Sparkles,
  "home-care": Home,
  "baby-care": Baby,
  health: HeartPulse,
  dairy: Milk,
  fruits: Apple,
};

/**
 * Category tile in the single two-tone palette (leaf soft well + the category's own image, or an icon).
 *   <CategoryTile category={c} />   (c from useCategories(): { slug, name, image, children })
 */
export function CategoryTile({ category, className }) {
  const Icon = ICONS[category.slug] || LayoutGrid;
  const img = category.image ? { src: category.image } : null;
  return (
    <Link to={`/category/${category.slug}`} className={cn("group grid justify-items-center gap-2 text-center", className)}>
      <span className="grid aspect-square w-full place-items-center overflow-hidden rounded-card border border-shop-line bg-shop-primary-soft transition-colors group-hover:border-shop-primary">
        {img ? (
          <img src={img.src} alt="" loading="lazy" decoding="async" width="96" height="96" className="size-[72%] object-contain mix-blend-multiply" />
        ) : (
          <Icon className="size-1/3 text-shop-primary-ink" strokeWidth={1.5} aria-hidden />
        )}
      </span>
      <span className="text-shop-sm font-semibold leading-tight text-shop-ink group-hover:text-shop-primary-ink">{category.name}</span>
    </Link>
  );
}

export default CategoryTile;
