import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { ChevronRight, Search } from "lucide-react";
import { useShopCatalog } from "../context/ShopCatalogContext.jsx";
import BrandLogo from "../components/BrandLogo.jsx";

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
    <div className="msr-gutter py-8 md:py-10">
      <h1 className="sr-only">Brands</h1>
      <label className="relative mx-auto block max-w-xl">
        <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-[#8a8e9f]" />
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search brands"
          className="h-12 w-full rounded-full border border-[#ece6d4] bg-white pl-11 pr-4 text-sm text-msr-navy outline-none placeholder:text-[#8a8e9f] focus:border-msr-gold"
        />
      </label>

      {list.length ? (
        <div className="mt-8 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {list.map((b) => (
            <Link
              key={b.slug}
              to={`/category/all?q=${encodeURIComponent(b.name)}`}
              className="group flex items-center gap-4 rounded-2xl bg-white px-4 py-4 ring-1 ring-[#ece6d4] transition hover:ring-[#ead9a0] hover:shadow-[0_10px_24px_rgba(8,10,61,0.08)]"
            >
              <BrandLogo className="h-14 w-14" alt="" />
              <span className="min-w-0 flex-1">
                <span className="block truncate text-[15px] font-bold tracking-tight text-msr-navy">{b.name}</span>
                <span className="mt-0.5 block text-[12px] font-medium text-[#8a8e9f]">
                  {b.count} {b.count === 1 ? "SKU" : "SKUs"}
                </span>
              </span>
              <ChevronRight className="h-5 w-5 shrink-0 text-[#c5c8d4] transition group-hover:text-msr-navy" />
            </Link>
          ))}
        </div>
      ) : (
        <p className="mt-10 text-center text-sm text-msr-muted">No brand matches “{q}”.</p>
      )}
    </div>
  );
}
