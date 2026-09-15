import { useShopCatalog } from "../context/ShopCatalogContext.jsx";
import ProductCard, { PRODUCT_GRID } from "../components/ProductCard.jsx";
import { SectionTitle } from "../components/shopUi.jsx";

export default function Deals() {
  const { filterProducts } = useShopCatalog();
  const list = filterProducts({ deal: true });
  return (
    <div className="msr-gutter py-8">
      <SectionTitle title="Best Deals" to="/category/all" action="View All →" />
      <div className={PRODUCT_GRID}>
        {list.map((p) => (
          <ProductCard key={p.id} product={p} />
        ))}
      </div>
    </div>
  );
}
