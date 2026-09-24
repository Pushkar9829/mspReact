import { useApi } from "../../shared/hooks/useApi.js";
import { loadTaggedProducts } from "../lib/loadTagged.js";
import ProductCard, { PRODUCT_GRID, ProductCardSkeleton } from "../components/ProductCard.jsx";
import { EmptyState, PageBanner } from "../components/shopUi.jsx";
import { Tag } from "lucide-react";
import { Link } from "react-router-dom";
import { buttonClass } from "../components/shopUi.jsx";

export default function Deals() {
  const { data, error, loading } = useApi(() => loadTaggedProducts("deal"), []);
  const list = data || [];
  return (
    <div className="pb-12">
      <div className="msr-gutter pt-6">
        <PageBanner
          kicker="Limited time"
          title="Best deals"
          text="Fresh daily discounts on fast-moving FMCG brands."
        />
      </div>
      <div className="msr-gutter mt-6">
        {loading ? (
          <div className={PRODUCT_GRID}>
            {Array.from({ length: 8 }, (_, i) => (
              <ProductCardSkeleton key={i} />
            ))}
          </div>
        ) : null}
        {error ? <p className="text-sm text-msr-danger">{error}</p> : null}
        {!loading && !list.length ? (
          <EmptyState icon={Tag} title="No live deals right now" text="Check back later or browse the full catalog.">
            <Link to="/category/all" className={buttonClass()}>
              Browse products
            </Link>
          </EmptyState>
        ) : null}
        {list.length ? (
          <div className={PRODUCT_GRID}>
            {list.map((p) => (
              <ProductCard key={p.id} product={p} />
            ))}
          </div>
        ) : null}
      </div>
    </div>
  );
}
