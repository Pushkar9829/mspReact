import { Link } from "react-router-dom";
import { useShopCatalog } from "../../shared/context/ShopCatalogContext.jsx";

export default function Brands() {
  const { brands } = useShopCatalog();
  return (
    <div className="msr-gutter py-8">
      <h1 className="text-2xl font-extrabold">Top Brands</h1>
      <div className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-4">
        {brands.map((b) => (
          <Link
            key={b.slug}
            to={`/category/all?q=${encodeURIComponent(b.name)}`}
            className="flex items-center gap-3 rounded-2xl bg-white p-5 shadow-sm"
          >
            <span className="grid h-12 w-12 place-items-center rounded-full bg-msr-navy font-extrabold text-white">{b.letter}</span>
            <span className="font-bold">{b.name}</span>
          </Link>
        ))}
      </div>
    </div>
  );
}
