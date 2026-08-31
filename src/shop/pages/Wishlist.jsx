import ProductCard, { PRODUCT_GRID } from "../components/ProductCard.jsx";
import { useCart } from "../../shared/context/CartContext.jsx";
import { Link } from "react-router-dom";
import { SectionTitle } from "../../shared/components/ui.jsx";

export default function Wishlist() {
  const { wishedProducts } = useCart();
  if (!wishedProducts.length) {
    return (
      <div className="mx-auto max-w-lg px-4 py-16 text-center">
        <h1 className="text-2xl font-extrabold">Wishlist is empty</h1>
        <Link to="/category/all" className="mt-4 inline-block text-msr-purple">
          Browse products
        </Link>
      </div>
    );
  }
  return (
    <div className="msr-gutter py-8">
      <SectionTitle title="Saved items" to="/category/all" action="View All →" />
      <div className={PRODUCT_GRID}>
        {wishedProducts.map((p) => (
          <ProductCard key={p.id} product={p} />
        ))}
      </div>
    </div>
  );
}
