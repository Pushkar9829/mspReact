import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { ChevronRight, Search } from "lucide-react";
import { useShopCatalog } from "../context/ShopCatalogContext.jsx";
import BrandLogo from "../components/BrandLogo.jsx";
import { EmptyState, PageBanner, inputClass } from "../components/shopUi.jsx";

export default function Brands() {
  const { brands, products } = useShopCatalog();
  const [q, setQ] = useState("");

  const rows = useMemo(
    () =>
      brands
        .map((b) => ({
          ...b,
          count: products.filter((p) => p.brand.toLowerCase() === b.name.toLowerCase()).length,
        }))
        .sort((a, b) => a.name.localeCompare(b.name)),
    [brands, products],
  );

  const query = q.trim().toLowerCase();
  const list = query ? rows.filter((b) => b.name.toLowerCase().includes(query)) : rows;

  return (
    <div className="pb-12">
      <div className="msr-gutter pt-6">
        <PageBanner kicker="Manufacturers" title="Top brands" text="Trusted FMCG brands stocked on the MS₹ floor." />
        <label className="relative mx-auto mt-6 block max-w-xl">
          <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-msr-subtle" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search brands"
            className={`${inputClass} pl-11`}
          />
        </label>
      </div>

      <div className="msr-gutter mt-8">
        {list.length ? (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {list.map((b) => (
              <Link
                key={b.slug}
                to={`/category/all?q=${encodeURIComponent(b.name)}`}
                className="group flex items-center gap-4 rounded-2xl border border-msr-line bg-white px-4 py-4 transition hover:border-msr-primary/40 hover:shadow-card"
              >
                <BrandLogo className="h-14 w-14" alt="" />
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-[15px] font-bold tracking-tight text-msr-ink group-hover:text-msr-primary">
                    {b.name}
                  </span>
                  <span className="mt-0.5 block text-[12px] font-medium text-msr-subtle">
                    {b.count} {b.count === 1 ? "SKU" : "SKUs"}
                  </span>
                </span>
                <ChevronRight className="h-5 w-5 shrink-0 text-msr-subtle transition group-hover:text-msr-primary" />
              </Link>
            ))}
          </div>
        ) : (
          <EmptyState title={`No brand matches “${q}”`} text="Try another search term." />
        )}
      </div>
    </div>
  );
}
