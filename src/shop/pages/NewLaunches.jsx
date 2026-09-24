import { useApi } from "../../shared/hooks/useApi.js";
import { loadTaggedProducts } from "../lib/loadTagged.js";
import ProductCard, { PRODUCT_GRID, ProductCardSkeleton } from "../components/ProductCard.jsx";
import { EmptyState, PageBanner, buttonClass } from "../components/shopUi.jsx";
import { Sparkles } from "lucide-react";
import { Link } from "react-router-dom";

export default function NewLaunches() {
  const { data, error, loading } = useApi(() => loadTaggedProducts("new"), []);
  const list = data || [];
  return (
    <div className="pb-12">
      <div className="msr-gutter pt-6">
        <PageBanner
          kicker="Just in"
          title="New launches"
          text="Discover the latest products from trusted brands."
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
          <EmptyState icon={Sparkles} title="No new launches right now" text="Browse the floor for everyday essentials.">
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
