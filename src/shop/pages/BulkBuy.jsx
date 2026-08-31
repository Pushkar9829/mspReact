import { Link } from "react-router-dom";
import { useShopCatalog } from "../../shared/context/ShopCatalogContext.jsx";
import ProductCard, { PRODUCT_GRID } from "../components/ProductCard.jsx";
import { SectionTitle } from "../../shared/components/ui.jsx";

export default function BulkBuy() {
  const { filterProducts } = useShopCatalog();
  const list = filterProducts({ bestseller: true });

  return (
    <div className="msr-gutter py-10">
      <div className="overflow-hidden rounded-3xl hero-gradient p-8 text-white md:p-12">
        <h1 className="text-4xl font-extrabold">Bulk Buy for Business</h1>
        <p className="mt-3 max-w-xl text-white/80">
          Wholesale pricing, GST invoices and reliable supply for kiranas, HORECA and distributors.
        </p>
        <Link to="/register" className="mt-6 inline-flex rounded-full bg-msr-gold px-6 py-3 font-bold text-msr-navy">
          Register as retailer
        </Link>
      </div>
      <div className="mt-8 grid gap-4 md:grid-cols-3">
        {[
          { title: "Case packs & outer units", to: "/category/all" },
          { title: "MOQ-friendly slabs", to: "/category/all" },
          { title: "Dedicated account support", to: "/help#contact" },
        ].map((t) => (
          <Link key={t.title} to={t.to} className="rounded-2xl bg-white p-5 font-semibold shadow-sm hover:border-msr-accent">
            {t.title}
          </Link>
        ))}
      </div>
      {list.length ? (
        <section className="mt-10">
          <SectionTitle title="Popular bulk SKUs" to="/category/all" />
          <div className={PRODUCT_GRID}>
            {list.map((p) => (
              <ProductCard key={p.id} product={p} />
            ))}
          </div>
        </section>
      ) : null}
    </div>
  );
}
