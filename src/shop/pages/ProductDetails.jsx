import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { discount } from "../../shared/data/catalog.js";
import { inr } from "../../shared/lib/format.js";
import { priceForPack, mapLookup } from "../../shared/lib/mapProduct.js";
import { SectionTitle } from "../../shared/components/ui.jsx";
import ProductCard, { PRODUCT_GRID } from "../components/ProductCard.jsx";
import { useCart } from "../../shared/context/CartContext.jsx";
import { useShopCatalog } from "../../shared/context/ShopCatalogContext.jsx";
import { api } from "../../shared/api.js";
import {
  BadgeCheck,
  ChevronRight,
  FileText,
  Heart,
  RotateCcw,
  ShieldCheck,
  ShoppingCart,
  Star,
  Tag,
  Truck,
} from "lucide-react";

export default function ProductDetails() {
  const { id } = useParams();
  const { getProduct, products, categories, ready } = useShopCatalog();
  const cached = getProduct(id);
  const [fetched, setFetched] = useState(null);
  const product = fetched?.id === id ? fetched : cached;
  const { add, isWished, toggleWish } = useCart();
  const navigate = useNavigate();
  const [pack, setPack] = useState("");
  const [qty, setQty] = useState(1);
  const [photo, setPhoto] = useState(0);

  useEffect(() => {
    if (cached || !ready) return undefined;
    let cancelled = false;
    api
      .lookupProduct(id)
      .then((res) => {
        if (!cancelled) setFetched(mapLookup(res));
      })
      .catch(() => {
        if (!cancelled) setFetched(null);
      });
    return () => {
      cancelled = true;
    };
  }, [id, cached, ready]);

  useEffect(() => {
    if (!product) return;
    setPack(product.weight);
    setQty(1);
    setPhoto(0);
  }, [id, product]);

  const related = useMemo(() => {
    if (!product) return [];
    return products.filter((p) => p.category === product.category && p.id !== product.id).slice(0, 4);
  }, [product, products]);

  if (!product) {
    return (
      <div className="msr-gutter py-20 text-center">
        <p className="text-sm font-semibold uppercase tracking-[0.16em] text-msr-accent">MS₹ catalog</p>
        <h1 className="mt-3 text-3xl font-extrabold tracking-tight text-[#1a1c3d]">
          {ready ? "Product not found" : "Loading product…"}
        </h1>
        <p className="mt-2 text-msr-muted">
          {ready ? "This SKU is unavailable or has been moved." : "Fetching live catalog."}
        </p>
        <Link to="/category/all" className="mt-6 inline-flex rounded-xl bg-msr-navy px-5 py-3 text-sm font-semibold text-white">
          Browse catalog
        </Link>
      </div>
    );
  }

  const priced = priceForPack(product, pack || product.weight);
  const off = discount({ ...product, price: priced.price, mrp: priced.mrp });
  const cat = categories.find((c) => c.slug === product.category);
  const gallery = product.gallery?.length ? product.gallery : [product.image];
  const wished = isWished(product.id);
  const stockLabel = product.stock < 100 ? "Limited stock" : "In stock";
  const badges = [
    product.deal ? "Deal of the day" : null,
    product.newLaunch ? "New launch" : null,
    product.bestseller || product.badge === "Best seller" ? "Bestseller" : null,
  ].filter(Boolean);

  async function addCart() {
    await add(product, qty, pack || product.weight);
  }

  async function buyNow() {
    await addCart();
    navigate("/checkout");
  }

  return (
    <div className="msr-gutter pb-28 pt-6 md:pb-12">
      <nav className="flex flex-wrap items-center gap-1.5 text-[13px] text-[#8b8ea3]">
        <Link to="/" className="hover:text-[#1a1c3d]">
          Home
        </Link>
        <ChevronRight className="h-3.5 w-3.5 shrink-0" />
        <Link to={`/category/${product.category}`} className="hover:text-[#1a1c3d]">
          {cat?.name || "Grocery"}
        </Link>
        <ChevronRight className="h-3.5 w-3.5 shrink-0" />
        <span className="line-clamp-1 font-medium text-[#1a1c3d]">{product.name}</span>
      </nav>

      <div className="mt-6 grid items-start gap-8 lg:grid-cols-[minmax(0,1.08fr)_minmax(0,1fr)] lg:gap-12">
        <Gallery
          product={product}
          gallery={gallery}
          photo={photo}
          setPhoto={setPhoto}
          wished={wished}
          onWish={() => toggleWish(product.id)}
          badges={badges}
        />

        <div>
          <Link
            to={`/category/all?q=${encodeURIComponent(product.brand)}`}
            className="text-[12px] font-bold uppercase tracking-[0.18em] text-msr-accent hover:text-msr-purple"
          >
            {product.brand}
          </Link>
          <h1 className="mt-2 text-[1.75rem] font-extrabold leading-[1.2] tracking-tight text-[#1a1c3d] md:text-[2rem]">
            {product.name}
          </h1>
          <p className="mt-2 max-w-xl text-[15px] leading-relaxed text-[#6b7280]">{product.description}</p>

          <div className="mt-4 flex flex-wrap items-center gap-3">
            <RatingChip rating={product.rating} reviews={product.reviews} />
            <span
              className={`rounded-full px-2.5 py-1 text-[12px] font-semibold ${
                product.stock < 100 ? "bg-amber-50 text-amber-800" : "bg-emerald-50 text-msr-success"
              }`}
            >
              {stockLabel}
            </span>
          </div>

          <div className="mt-6 border-y border-[#eceef4] py-5">
            <div className="flex flex-wrap items-end gap-3">
              <span className="text-[2rem] font-extrabold leading-none tracking-tight text-[#1a1c3d]">{inr(priced.price)}</span>
              <span className="pb-1 text-[15px] text-[#9aa0b5] line-through">{inr(priced.mrp)}</span>
              {off ? (
                <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-[12px] font-bold text-msr-success">{off}% off</span>
              ) : null}
            </div>
            <p className="mt-2 text-[13px] text-[#8b8ea3]">Inclusive of GST · Invoice on checkout · Pack: {pack}</p>
          </div>

          <div className="mt-6">
            <p className="text-[13px] font-bold uppercase tracking-[0.12em] text-[#8b8ea3]">Pack size</p>
            <div className="mt-3 flex flex-wrap gap-2">
              {product.packs?.map((p) => (
                <button
                  key={p}
                  type="button"
                  onClick={() => setPack(p)}
                  className={`min-w-[4.5rem] rounded-xl border px-4 py-2.5 text-sm font-semibold transition ${
                    pack === p
                      ? "border-[#0b1460] bg-[#0b1460] text-white"
                      : "border-[#e8eaef] bg-white text-[#1a1c3d] hover:border-[#cfd3ff]"
                  }`}
                >
                  {p}
                </button>
              ))}
            </div>
          </div>

          <div className="mt-6">
            <p className="text-[13px] font-bold uppercase tracking-[0.12em] text-[#8b8ea3]">Quantity</p>
            <div className="mt-3 flex items-center gap-4">
              <div className="inline-flex items-center overflow-hidden rounded-xl border border-[#e8eaef] bg-white">
                <button
                  type="button"
                  className="grid h-11 w-11 text-lg text-[#6b7280] hover:bg-[#f7f8fc]"
                  onClick={() => setQty((n) => Math.max(1, n - 1))}
                  aria-label="Decrease quantity"
                >
                  −
                </button>
                <span className="min-w-10 text-center text-[15px] font-bold">{qty}</span>
                <button
                  type="button"
                  className="grid h-11 w-11 text-lg text-[#0b1460] hover:bg-[#f7f8fc]"
                  onClick={() => setQty((n) => n + 1)}
                  aria-label="Increase quantity"
                >
                  +
                </button>
              </div>
              <p className="text-[13px] text-[#8b8ea3]">
                {qty} × {pack} · {inr(priced.price * qty)}
              </p>
            </div>
          </div>

          <div className="mt-6 hidden gap-3 md:flex">
            <button
              type="button"
              onClick={addCart}
              className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl bg-[#0b1460] py-3.5 text-sm font-bold text-white hover:bg-[#070b2e]"
            >
              <ShoppingCart className="h-4 w-4" strokeWidth={2} />
              Add to cart
            </button>
            <button
              type="button"
              onClick={buyNow}
              className="inline-flex flex-1 items-center justify-center rounded-xl bg-msr-gold py-3.5 text-sm font-bold text-[#0b1460] hover:brightness-95"
            >
              Buy now
            </button>
            <button
              type="button"
              onClick={() => toggleWish(product.id)}
              className={`grid h-[52px] w-[52px] shrink-0 place-items-center rounded-xl border ${
                wished ? "border-msr-accent text-msr-accent" : "border-[#e8eaef] text-[#1a1c3d]"
              }`}
              aria-label={wished ? "Remove from wishlist" : "Save to wishlist"}
            >
              <Heart className={`h-5 w-5 ${wished ? "fill-msr-accent" : ""}`} />
            </button>
          </div>

          <Offers />

          <div className="mt-5 grid grid-cols-2 gap-3">
            <Trust to="/help" icon={ShieldCheck} title="100% genuine" text="Original brand packs" />
            <Trust to="/help#shipping" icon={Truck} title="1–3 day delivery" text="Metro pincodes" />
            <Trust to="/help#returns" icon={RotateCcw} title="Easy returns" text="7 days, unused packs" />
            <Trust to="/bulk" icon={FileText} title="GST invoice" text="For every order" />
          </div>
        </div>
      </div>

      <section className="mt-14 grid gap-6 lg:grid-cols-[1.4fr_1fr]">
        <div className="rounded-2xl border border-[#eceef4] bg-white p-6 md:p-8">
          <h2 className="text-lg font-bold tracking-tight text-[#1a1c3d]">About this product</h2>
          <p className="mt-3 text-[15px] leading-7 text-[#5b6280]">{product.description}</p>
          <ul className="mt-6 grid gap-3 sm:grid-cols-2">
            {product.features?.map((f) => (
              <li key={f} className="flex items-start gap-2.5 text-[14px] font-medium text-[#1a1c3d]">
                <BadgeCheck className="mt-0.5 h-4 w-4 shrink-0 text-msr-accent" />
                {f}
              </li>
            ))}
          </ul>
        </div>

        <div className="rounded-2xl border border-[#eceef4] bg-white p-6 md:p-8">
          <h2 className="text-lg font-bold tracking-tight text-[#1a1c3d]">Specifications</h2>
          <dl className="mt-4 divide-y border-t border-[#eceef4] text-[14px]">
            <Spec label="Brand" value={product.brand} to={`/category/all?q=${encodeURIComponent(product.brand)}`} />
            <Spec label="Category" value={cat?.name || product.category} to={`/category/${product.category}`} />
            <Spec label="Pack size" value={pack} />
            <Spec label="SKU" value={product.id} />
            <Spec label="Manufacturer" value={product.manufacturer} />
          </dl>
        </div>
      </section>

      <section className="mt-6 grid gap-6 md:grid-cols-2">
        <div className="rounded-2xl border border-[#eceef4] bg-white p-6 md:p-8">
          <h2 className="text-lg font-bold tracking-tight text-[#1a1c3d]">Ingredients</h2>
          <p className="mt-3 text-[15px] leading-7 text-[#5b6280]">{product.ingredients}</p>
        </div>
        <div className="rounded-2xl border border-[#eceef4] bg-white p-6 md:p-8">
          <h2 className="text-lg font-bold tracking-tight text-[#1a1c3d]">Nutritional info</h2>
          <p className="mt-3 text-[15px] leading-7 text-[#5b6280]">{product.nutrition}</p>
        </div>
      </section>

      <section className="mt-6 rounded-2xl border border-[#eceef4] bg-white p-6 md:p-8">
        <div className="flex flex-wrap items-start justify-between gap-6">
          <div>
            <h2 className="text-lg font-bold tracking-tight text-[#1a1c3d]">Customer reviews</h2>
            <p className="mt-1 text-[13px] text-[#8b8ea3]">Verified buyers on MS₹</p>
            <div className="mt-4 flex items-end gap-2">
              <span className="text-[2.5rem] font-extrabold leading-none text-[#1a1c3d]">{(product.rating || 0).toFixed(1)}</span>
              <span className="pb-1 text-sm text-[#8b8ea3]">/ 5</span>
            </div>
            <div className="mt-1 flex items-center gap-1 text-amber-500">
              {Array.from({ length: 5 }).map((_, i) => (
                <Star key={i} className={`h-4 w-4 ${i < Math.round(product.rating) ? "fill-amber-400 text-amber-400" : "text-[#e5e7f0]"}`} />
              ))}
            </div>
            <p className="mt-2 text-[13px] font-medium text-[#6b7280]">{(product.reviews || 0).toLocaleString("en-IN")} ratings</p>
          </div>
          <div className="w-full max-w-sm flex-1 space-y-2">
            {reviewBars(product.rating).map((row) => (
              <div key={row.stars} className="flex items-center gap-3 text-[12px] text-[#6b7280]">
                <span className="w-6 shrink-0">{row.stars}★</span>
                <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-[#eef0f6]">
                  <div className="h-full rounded-full bg-amber-400" style={{ width: `${row.pct}%` }} />
                </div>
                <span className="w-8 text-right">{row.pct}%</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {related.length ? (
        <section className="mt-14">
          <SectionTitle title="You may also like" to={`/category/${product.category}`} action="View All →" />
          <div className={PRODUCT_GRID}>
            {related.map((p) => (
              <ProductCard key={p.id} product={p} />
            ))}
          </div>
        </section>
      ) : null}

      <div className="fixed inset-x-0 bottom-16 z-30 border-t border-[#eceef4] bg-white/95 p-3 backdrop-blur md:hidden">
        <div className="flex items-center gap-2">
          <div className="min-w-0 pr-1">
            <p className="text-[15px] font-extrabold leading-none text-[#1a1c3d]">{inr(priced.price)}</p>
            <p className="mt-1 text-[11px] text-[#8b8ea3]">{pack}</p>
          </div>
          <button type="button" onClick={addCart} className="flex-1 rounded-xl bg-[#0b1460] py-3 text-sm font-bold text-white">
            Add
          </button>
          <button type="button" onClick={buyNow} className="flex-1 rounded-xl bg-msr-gold py-3 text-sm font-bold text-[#0b1460]">
            Buy
          </button>
          <button
            type="button"
            onClick={() => toggleWish(product.id)}
            className={`grid h-12 w-12 shrink-0 place-items-center rounded-xl border ${wished ? "border-msr-accent text-msr-accent" : "border-[#e8eaef]"}`}
            aria-label={wished ? "Remove from wishlist" : "Save to wishlist"}
          >
            <Heart className={`h-5 w-5 ${wished ? "fill-msr-accent" : ""}`} />
          </button>
        </div>
      </div>
    </div>
  );
}

function Gallery({ product, gallery, photo, setPhoto, wished, onWish, badges }) {
  return (
    <div className="lg:sticky lg:top-24 lg:self-start">
      <div className="relative overflow-hidden rounded-2xl border border-[#eceef4] bg-white">
        <div className="absolute left-4 top-4 z-10 flex flex-wrap gap-2">
          {badges.map((b) => (
            <span key={b} className="rounded-full bg-[#0b1460] px-2.5 py-1 text-[11px] font-bold text-white">
              {b}
            </span>
          ))}
        </div>
        <button
          type="button"
          onClick={onWish}
          className={`absolute right-4 top-4 z-10 grid h-11 w-11 place-items-center rounded-full border bg-white shadow-sm ${
            wished ? "border-msr-accent text-msr-accent" : "border-[#eceef4] text-[#1a1c3d]"
          }`}
          aria-label={wished ? "Remove from wishlist" : "Save to wishlist"}
        >
          <Heart className={`h-5 w-5 ${wished ? "fill-msr-accent" : ""}`} />
        </button>
        <div className="grid place-items-center bg-[#f7f8fc] px-8 py-10 sm:px-12 sm:py-14">
          <img
            src={gallery[photo] || product.image}
            alt={product.name}
            className="h-[280px] w-full object-contain sm:h-[340px] lg:h-[380px]"
          />
        </div>
      </div>
      {gallery.length > 1 ? (
        <div className="mt-3 flex gap-2 overflow-x-auto no-scrollbar">
          {gallery.map((src, i) => (
            <button
              key={src + i}
              type="button"
              onClick={() => setPhoto(i)}
              className={`h-16 w-16 shrink-0 overflow-hidden rounded-xl border bg-white p-1 ${
                photo === i ? "border-[#0b1460]" : "border-[#eceef4]"
              }`}
            >
              <img src={src} alt="" className="h-full w-full object-contain" />
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}

function RatingChip({ rating, reviews }) {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full bg-[#fff8e8] px-2.5 py-1 text-[13px] font-semibold text-[#1a1c3d]">
      <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />
      {Number(rating || 0).toFixed(1)}
      <span className="font-medium text-[#8b8ea3]">({Number(reviews || 0).toLocaleString("en-IN")})</span>
    </span>
  );
}

function Offers() {
  return (
    <div className="mt-6 rounded-2xl border border-[#eceef4] bg-[#fafbff] p-4">
      <Link to="/deals" className="flex items-center gap-2 text-[13px] font-bold text-[#1a1c3d] hover:text-msr-accent">
        <Tag className="h-4 w-4 text-msr-accent" /> Available offers
      </Link>
      <ul className="mt-3 space-y-2.5 text-[13px] leading-snug text-[#5b6280]">
        <li className="flex gap-2">
          <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-msr-accent" />
          Extra 10% off with code <span className="font-semibold text-[#1a1c3d]">WELCOME10</span>
        </li>
        <li className="flex gap-2">
          <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-msr-accent" />
          Free delivery on orders above ₹999
        </li>
        <li className="flex gap-2">
          <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-msr-accent" />
          <Link to="/bulk" className="font-semibold text-msr-accent hover:underline">
            Extra bulk discount
          </Link>{" "}
          on 10+ units
        </li>
      </ul>
    </div>
  );
}

function Trust({ to, icon: Icon, title, text }) {
  return (
    <Link to={to} className="flex items-start gap-2.5 rounded-xl border border-[#eceef4] bg-white px-3 py-3 hover:border-[#cfd3ff]">
      <Icon className="mt-0.5 h-4 w-4 shrink-0 text-msr-accent" strokeWidth={1.8} />
      <span>
        <span className="block text-[13px] font-semibold text-[#1a1c3d]">{title}</span>
        <span className="text-[12px] text-[#8b8ea3]">{text}</span>
      </span>
    </Link>
  );
}

function Spec({ label, value, to }) {
  return (
    <div className="flex items-start justify-between gap-4 py-3">
      <dt className="shrink-0 text-[#8b8ea3]">{label}</dt>
      <dd className="text-right font-medium text-[#1a1c3d]">
        {to ? (
          <Link to={to} className="hover:text-msr-accent hover:underline">
            {value}
          </Link>
        ) : (
          value
        )}
      </dd>
    </div>
  );
}

function reviewBars(rating) {
  const five = Math.min(92, Math.round(48 + (rating - 4) * 30));
  const four = Math.max(6, 28 - Math.round((rating - 4) * 8));
  const three = Math.max(3, 12 - Math.round((rating - 4) * 6));
  const two = Math.max(1, 6 - Math.round((rating - 4) * 3));
  const one = Math.max(1, 100 - five - four - three - two);
  return [
    { stars: 5, pct: five },
    { stars: 4, pct: four },
    { stars: 3, pct: three },
    { stars: 2, pct: two },
    { stars: 1, pct: one },
  ];
}
