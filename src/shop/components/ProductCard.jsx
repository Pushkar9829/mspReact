import { Link } from "react-router-dom";
import { ShoppingCart } from "lucide-react";
import { inr } from "../../shared/lib/format.js";
import { useCart } from "../../shared/context/CartContext.jsx";

export const PRODUCT_GRID = "grid grid-cols-2 gap-4 md:grid-cols-3 xl:grid-cols-4";

export default function ProductCard({ product }) {
  const { add, items, setQty } = useCart();
  const inCart = items.find((i) => i.id === product.id && i.pack === product.weight);

  return (
    <article className="relative flex h-full flex-col rounded-[14px] border border-[#e8eaef] bg-white p-4 transition hover:border-[#cfd3ff] hover:shadow-[0_8px_24px_rgba(16,24,40,0.08)]">
      <Link to={`/product/${product.id}`} className="absolute inset-0 z-0 rounded-[14px]" aria-label={product.name} />

      <div className="relative z-10 pointer-events-none flex h-[132px] items-center justify-center sm:h-[148px]">
        <img src={product.image} alt="" className="h-full w-full object-contain" />
      </div>

      <div className="relative z-10 mt-3 flex flex-1 flex-col">
        <p className="pointer-events-none line-clamp-2 min-h-[2.7rem] text-[14px] font-bold leading-snug text-[#1a1c3d] md:text-[15px]">
          {product.name}
        </p>
        <p className="mt-1 text-[13px] text-[#6b7280]">{product.weight}</p>

        <div className="mt-auto flex items-center justify-between gap-2 pt-4">
          <span className="text-[16px] font-extrabold leading-none text-[#1a1c3d] md:text-[17px]">{inr(product.price)}</span>
          {inCart ? (
            <div className="relative z-10 inline-flex items-center rounded-full border border-[#0b1460] px-1 py-0.5 text-[#0b1460]">
              <button
                type="button"
                className="grid h-7 w-7 place-items-center text-base font-semibold"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  setQty(product.id, product.weight, inCart.qty - 1);
                }}
                aria-label="Decrease quantity"
              >
                −
              </button>
              <span className="min-w-5 text-center text-sm font-bold">{inCart.qty}</span>
              <button
                type="button"
                className="grid h-7 w-7 place-items-center text-base font-semibold"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  setQty(product.id, product.weight, inCart.qty + 1);
                }}
                aria-label="Increase quantity"
              >
                +
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                add(product, 1, product.weight);
              }}
              className="relative z-10 inline-flex items-center gap-1.5 rounded-full border border-[#0b1460] bg-white px-3 py-1.5 text-[13px] font-semibold text-[#0b1460] hover:bg-[#f7f8fc]"
            >
              <ShoppingCart className="h-3.5 w-3.5" strokeWidth={2} />
              Add
            </button>
          )}
        </div>
      </div>
    </article>
  );
}
