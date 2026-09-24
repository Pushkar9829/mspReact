import { useEffect, useRef, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import ProductCard, { ProductCardSkeleton } from "./ProductCard.jsx";

const ITEM = "w-[168px] shrink-0 snap-start sm:w-[200px] lg:w-[calc((100%-4rem)/5)]";

export default function ProductRail({ products, loading = false, empty = null }) {
  const rowRef = useRef(null);
  const [canLeft, setCanLeft] = useState(false);
  const [canRight, setCanRight] = useState(false);

  useEffect(() => {
    const el = rowRef.current;
    if (!el) return undefined;
    function update() {
      setCanLeft(el.scrollLeft > 8);
      setCanRight(el.scrollLeft + el.clientWidth < el.scrollWidth - 8);
    }
    update();
    el.addEventListener("scroll", update, { passive: true });
    window.addEventListener("resize", update);
    return () => {
      el.removeEventListener("scroll", update);
      window.removeEventListener("resize", update);
    };
  }, [products.length, loading]);

  function scroll(dir) {
    const el = rowRef.current;
    if (!el) return;
    el.scrollBy({ left: dir * el.clientWidth * 0.8, behavior: "smooth" });
  }

  if (!loading && !products.length) return empty;

  return (
    <div className="relative">
      <div ref={rowRef} className="no-scrollbar -mx-1 flex snap-x gap-4 overflow-x-auto scroll-smooth px-1 py-1">
        {loading && !products.length
          ? Array.from({ length: 5 }, (_, i) => (
              <div key={i} className={ITEM}>
                <ProductCardSkeleton />
              </div>
            ))
          : products.map((p) => (
              <div key={p.id} className={ITEM}>
                <ProductCard product={p} />
              </div>
            ))}
      </div>
      <RailArrow side="left" show={canLeft} onClick={() => scroll(-1)} />
      <RailArrow side="right" show={canRight} onClick={() => scroll(1)} />
    </div>
  );
}

function RailArrow({ side, show, onClick }) {
  const Icon = side === "left" ? ChevronLeft : ChevronRight;
  return (
    <button
      type="button"
      onClick={onClick}
      tabIndex={show ? 0 : -1}
      aria-hidden={!show}
      className={`absolute top-[38%] z-20 hidden h-10 w-10 -translate-y-1/2 place-items-center rounded-full border border-msr-line bg-white text-msr-ink shadow-lift transition hover:text-msr-primary md:grid ${
        side === "left" ? "-left-4" : "-right-4"
      } ${show ? "opacity-100" : "pointer-events-none opacity-0"}`}
      aria-label={side === "left" ? "Previous products" : "Next products"}
    >
      <Icon className="h-5 w-5" />
    </button>
  );
}
