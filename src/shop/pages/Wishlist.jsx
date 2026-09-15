import { Link } from "react-router-dom";
import { Heart } from "lucide-react";
import ProductCard, { PRODUCT_GRID } from "../components/ProductCard.jsx";
import { useCart } from "../context/CartContext.jsx";
import { AccountEmpty, AccountHead } from "../components/accountUi.jsx";

export default function Wishlist() {
  const { wishedProducts } = useCart();
  const count = wishedProducts.length;

  return (
    <div>
      <AccountHead
        title="Wishlist"
        subtitle={
          count
            ? `${count} saved ${count === 1 ? "item" : "items"} on this device.`
            : "Saved items on this device — tap the heart on a product to add it."
        }
      />

      {!count ? (
        <AccountEmpty icon={Heart} title="Wishlist is empty" text="Tap the heart on a product to save it here.">
          <Link to="/category/all" className="inline-flex rounded-full bg-msr-navy px-5 py-2.5 text-sm font-bold text-white">
            Browse products
          </Link>
        </AccountEmpty>
      ) : (
        <div className={`mt-6 ${PRODUCT_GRID}`}>
          {wishedProducts.map((p) => (
            <ProductCard key={p.id} product={p} />
          ))}
        </div>
      )}
    </div>
  );
}
