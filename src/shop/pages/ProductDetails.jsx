import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { discount } from "../data/catalog.js";
import { inr } from "../../shared/lib/format.js";
import { priceForPack, mapLookup } from "../lib/mapProduct.js";
import { qtyRules, stepQty } from "../lib/qtyRules.js";
import { Breadcrumbs, Button, SectionTitle, Skeleton, buttonClass, inputClass } from "../components/shopUi.jsx";
import ProductRail from "../components/ProductRail.jsx";
import { useCart } from "../context/CartContext.jsx";
import { useShopCatalog } from "../context/ShopCatalogContext.jsx";
import { useDeliveryLocation } from "../context/LocationContext.jsx";
import { useAuth } from "../../shared/context/AuthContext.jsx";
import { api } from "../../shared/api.js";
import {
  BadgeCheck,
  Check,
  FileText,
  Heart,
  Loader2,
  MapPin,
  Minus,
  PackageSearch,
  Plus,
  RotateCcw,
  ShieldCheck,
  ShoppingCart,
  Star,
  Store,
  Tag,
  Truck,
  Zap,
} from "lucide-react";

const TABS = [
  { id: "about", label: "About" },
  { id: "specs", label: "Specifications" },
  { id: "ingredients", label: "Ingredients & nutrition" },
  { id: "reviews", label: "Reviews" },
];

export default function ProductDetails() {
  const { id } = useParams();
  const { getProduct, products, categories, ready } = useShopCatalog();
  const cached = getProduct(id);
  const [fetched, setFetched] = useState(null);
  const product = fetched?.id === id ? fetched : cached;
  const { add, isWished, toggleWish, items: cartItems } = useCart();
  const { user } = useAuth();
  const { location } = useDeliveryLocation();
  const navigate = useNavigate();
  const [pack, setPack] = useState("");
  const [qty, setQty] = useState(1);
  const [photo, setPhoto] = useState(0);
  const [packQty, setPackQty] = useState({});
  const [fulfillment, setFulfillment] = useState("delivery_partner");
  const [notifyEmail, setNotifyEmail] = useState("");
  const [notifyMsg, setNotifyMsg] = useState("");
  const [notifyBusy, setNotifyBusy] = useState(false);
  const [cartMsg, setCartMsg] = useState("");
  const [cartBusy, setCartBusy] = useState(false);
  const [added, setAdded] = useState(false);
  const [tab, setTab] = useState("about");

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
    const next = {};
    (product.packPrices || []).forEach((row) => {
      next[row.pack] = 0;
    });
    setPackQty(next);
    const modes = product.deliveryModes?.length ? product.deliveryModes : ["delivery_partner"];
    setFulfillment(modes.includes("delivery_partner") ? "delivery_partner" : modes[0]);
    setNotifyEmail(user?.email || "");
    setNotifyMsg("");
  }, [id, product, user?.email]);

  useEffect(() => {
    setTab("about");
    setAdded(false);
  }, [id]);

  const related = useMemo(() => {
    if (!product) return [];
    return products.filter((p) => p.category === product.category && p.id !== product.id).slice(0, 12);
  }, [product, products]);

  if (!product) {
    return ready ? (
      <div className="msr-gutter py-16">
        <div className="mx-auto max-w-lg rounded-2xl border border-msr-line bg-white px-6 py-14 text-center">
          <div className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-msr-primary-soft text-msr-primary">
            <PackageSearch className="h-7 w-7" strokeWidth={1.6} />
          </div>
          <h1 className="mt-4 text-xl font-extrabold tracking-tight text-msr-ink">Product not found</h1>
          <p className="mt-1 text-sm text-msr-muted">This SKU is unavailable or has been moved.</p>
          <Link to="/category/all" className={buttonClass({ className: "mt-6" })}>
            Browse catalog
          </Link>
        </div>
      </div>
    ) : (
      <div className="msr-gutter grid gap-8 py-8 lg:grid-cols-2">
        <Skeleton className="aspect-square w-full rounded-2xl" />
        <div className="space-y-3">
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-8 w-4/5" />
          <Skeleton className="h-5 w-1/3" />
          <Skeleton className="mt-6 h-32 w-full rounded-2xl" />
          <Skeleton className="h-12 w-full rounded-xl" />
        </div>
      </div>
    );
  }

  const priced = priceForPack(product, pack || product.weight);
  const off = discount({ ...product, price: priced.price, mrp: priced.mrp });
  const saved = Math.max(0, (priced.mrp || 0) - (priced.price || 0));
  const cat = categories.find((c) => c.slug === product.category);
  const gallery = product.gallery?.length ? product.gallery : [product.image];
  const wished = isWished(product.id);
  const outOfStock = Number(product.stock) <= 0;
  const stockLabel = outOfStock ? "Out of stock" : product.stock < 100 ? "Limited stock" : "In stock";
  const badges = [
    product.deal ? "Deal of the day" : null,
    product.newLaunch ? "New launch" : null,
    product.bestseller || product.badge === "Best seller" ? "Bestseller" : null,
  ].filter(Boolean);

  const deliveryModes = product.deliveryModes?.length ? product.deliveryModes : ["delivery_partner"];
  const packRows = product.packPrices?.length
    ? product.packPrices
    : (product.packs || []).map((p) => ({ pack: p, ...priceForPack(product, p) }));
  const selectedUnits = packRows.reduce((n, row) => n + (packQty[row.pack] || 0), 0);

  /** Regular (one-at-a-time) rules for one pack, capped by stock left after every cart line of that pack. */
  function rowRules(row) {
    const packStock = row?.stock != null ? Number(row.stock) : product.stock;
    const inCart = cartItems
      .filter((i) => i.id === product.id && i.pack === row?.pack)
      .reduce((n, i) => n + i.qty, 0);
    return qtyRules(product, { stock: packStock == null ? undefined : packStock - inCart });
  }

  async function addCart() {
    setCartMsg("");
    try {
      const selected = packRows.filter((row) => (packQty[row.pack] || 0) > 0);
      if (!selected.length) {
        const targetPack = pack || product.weight;
        const rules = rowRules(packRows.find((row) => row.pack === targetPack));
        if (rules.max < rules.min) throw new Error("No more stock left for this pack");
        await add(product, Math.max(rules.min, qty || 1), targetPack, fulfillment);
        return;
      }
      for (const row of selected) {
        await add(product, packQty[row.pack], row.pack, fulfillment);
      }
      setPackQty((prev) => Object.fromEntries(Object.keys(prev).map((k) => [k, 0])));
    } catch (err) {
      setCartMsg(err.message || "Could not add to cart");
      throw err;
    }
  }

  async function onAdd() {
    if (cartBusy) return;
    setCartBusy(true);
    try {
      await addCart();
      setAdded(true);
      setTimeout(() => setAdded(false), 2200);
    } catch {
      /* message shown beside the buttons */
    } finally {
      setCartBusy(false);
    }
  }

  async function buyNow() {
    if (cartBusy) return;
    setCartBusy(true);
    try {
      await addCart();
      navigate("/checkout");
    } catch {
      /* message shown beside the buttons */
    } finally {
      setCartBusy(false);
    }
  }

  const addLabel = added ? "Added to cart" : selectedUnits ? `Add ${selectedUnits} to cart` : "Add to cart";

  return (
    <div className="msr-gutter pb-32 pt-5 md:pb-12">
      <Breadcrumbs
        items={[
          { label: "Home", to: "/" },
          { label: cat?.name || "Grocery", to: `/category/${product.category}` },
          { label: product.name },
        ]}
      />

      <div className="mt-4 grid items-start gap-6 lg:grid-cols-[minmax(0,1.05fr)_minmax(0,1fr)] lg:gap-10">
        <Gallery
          product={product}
          gallery={gallery}
          photo={photo}
          setPhoto={setPhoto}
          wished={wished}
          onWish={() => toggleWish(product)}
          badges={badges}
        />

        <div className="min-w-0">
          <Link
            to={`/category/all?q=${encodeURIComponent(product.brand)}`}
            className="text-[12px] font-bold uppercase tracking-[0.14em] text-msr-primary hover:underline"
          >
            {product.brand}
          </Link>
          <h1 className="mt-1.5 text-2xl font-extrabold leading-tight tracking-tight text-msr-ink md:text-[1.9rem]">{product.name}</h1>

          <div className="mt-3 flex flex-wrap items-center gap-2">
            <button type="button" onClick={() => setTab("reviews")} className="inline-flex items-center gap-1.5 text-[13px] text-msr-muted hover:text-msr-ink">
              <span className="inline-flex items-center gap-1 rounded-md bg-msr-success px-1.5 py-0.5 text-[12px] font-bold text-white">
                {Number(product.rating || 0).toFixed(1)}
                <Star className="h-3 w-3 fill-white text-white" />
              </span>
              {Number(product.reviews || 0).toLocaleString("en-IN")} ratings
            </button>
            <span className="h-4 w-px bg-msr-line" aria-hidden />
            <span
              className={`inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-[12px] font-semibold ${
                outOfStock
                  ? "bg-msr-danger-soft text-msr-danger"
                  : product.stock < 100
                    ? "bg-msr-warning-soft text-msr-warning-ink"
                    : "bg-msr-success-soft text-msr-success-ink"
              }`}
            >
              <span className="h-1.5 w-1.5 rounded-full bg-current" />
              {stockLabel}
            </span>
            {product.bulkEligible ? (
              <Link
                to="/bulk#bulk-skus"
                className="rounded-md bg-msr-gold/30 px-2 py-0.5 text-[12px] font-semibold text-msr-ink hover:bg-msr-gold/50"
              >
                Also sold in bulk
              </Link>
            ) : null}
          </div>

          <div className="mt-5 rounded-2xl border border-msr-line bg-white p-5">
            <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
              <span className="text-[2rem] font-extrabold leading-none tracking-tight text-msr-ink">{inr(priced.price)}</span>
              {off ? (
                <>
                  <span className="text-[15px] text-msr-subtle">
                    MRP <span className="line-through">{inr(priced.mrp)}</span>
                  </span>
                  <span className="rounded-md bg-msr-success-soft px-2 py-0.5 text-[13px] font-bold text-msr-success-ink">{off}% off</span>
                </>
              ) : null}
            </div>
            {saved > 0 ? <p className="mt-2 text-[13px] font-semibold text-msr-success">You save {inr(saved)} per unit</p> : null}
            <p className="mt-1.5 text-[12px] text-msr-subtle">Inclusive of all taxes · GST invoice on checkout · Price for {pack || product.weight}</p>

            {product.bulkEligible ? (
              <Link
                to="/bulk#bulk-skus"
                className="mt-4 flex items-center justify-between gap-3 rounded-xl border border-msr-gold/60 bg-msr-gold/10 px-3.5 py-2.5 text-[12.5px] text-msr-ink hover:bg-msr-gold/20"
              >
                <span>
                  <span className="font-bold">Buying for business?</span> Get slab prices on case packs from the bulk screen.
                </span>
                <span className="shrink-0 font-semibold text-msr-primary">Bulk buy →</span>
              </Link>
            ) : null}

            {packRows.length ? (
              <div className="mt-5">
                <div className="flex items-center justify-between">
                  <p className="text-[13px] font-bold text-msr-ink">Choose pack & quantity</p>
                  {selectedUnits ? (
                    <button
                      type="button"
                      className="text-[12px] font-semibold text-msr-primary hover:underline"
                      onClick={() => setPackQty((prev) => Object.fromEntries(Object.keys(prev).map((k) => [k, 0])))}
                    >
                      Reset
                    </button>
                  ) : null}
                </div>
                <div className="mt-2.5 grid gap-2">
                  {packRows.map((row) => {
                    const margin = discount({ price: row.price, mrp: row.mrp });
                    const current = packQty[row.pack] || 0;
                    const packStock = row.stock != null ? Number(row.stock) : product.stock;
                    const rules = rowRules(row);
                    const atCap = stepQty(rules, current, 1) <= current;
                    const packOut = packStock != null && packStock <= 0;
                    const active = current > 0 || row.pack === pack;
                    return (
                      <div
                        key={row.pack}
                        className={`flex items-center gap-3 rounded-xl border px-3.5 py-3 transition-colors ${
                          active ? "border-msr-primary bg-msr-primary-soft/40" : "border-msr-line hover:border-msr-line-strong"
                        }`}
                      >
                        <button type="button" onClick={() => setPack(row.pack)} className="min-w-0 flex-1 text-left">
                          <span className="block text-[14px] font-bold text-msr-ink">{row.pack.replace(/pack/i, "").trim() || row.pack}</span>
                          <span className="mt-0.5 flex flex-wrap items-baseline gap-x-2 text-[12.5px]">
                            <span className="font-bold text-msr-ink">{inr(row.price)}/unit</span>
                            {margin ? <span className="font-semibold text-msr-success">{margin.toFixed(1)}% margin</span> : null}
                          </span>
                        </button>
                        {packOut ? (
                          <span className="text-[12px] font-semibold text-msr-danger">Out of stock</span>
                        ) : (
                          <div className="inline-flex h-9 shrink-0 items-center overflow-hidden rounded-lg border border-msr-line-strong bg-white">
                            <button
                              type="button"
                              className="grid h-full w-9 place-items-center text-msr-muted hover:bg-msr-surface disabled:opacity-40"
                              disabled={!current}
                              onClick={() =>
                                setPackQty((prev) => ({ ...prev, [row.pack]: stepQty(rules, prev[row.pack] || 0, -1) }))
                              }
                              aria-label={`Decrease ${row.pack}`}
                            >
                              <Minus className="h-3.5 w-3.5" />
                            </button>
                            <span className="w-8 text-center text-[14px] font-bold">{current}</span>
                            <button
                              type="button"
                              className="grid h-full w-9 place-items-center text-msr-primary hover:bg-msr-surface disabled:opacity-40"
                              disabled={atCap}
                              title={atCap ? "Maximum quantity reached" : undefined}
                              onClick={() => {
                                setPack(row.pack);
                                setPackQty((prev) => ({ ...prev, [row.pack]: stepQty(rules, prev[row.pack] || 0, 1) }));
                              }}
                              aria-label={`Increase ${row.pack}`}
                            >
                              <Plus className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            ) : null}

            {deliveryModes.length > 1 ? (
              <div className="mt-5">
                <p className="text-[13px] font-bold text-msr-ink">Fulfilment</p>
                <div className="mt-2.5 grid grid-cols-2 gap-2">
                  {deliveryModes.map((mode) => {
                    const on = fulfillment === mode;
                    const Icon = mode === "store_pickup" ? Store : Truck;
                    return (
                      <button
                        key={mode}
                        type="button"
                        onClick={() => setFulfillment(mode)}
                        className={`flex items-center gap-2 rounded-xl border px-3.5 py-3 text-left text-[13px] font-semibold transition-colors ${
                          on ? "border-msr-primary bg-msr-primary-soft text-msr-primary-ink" : "border-msr-line text-msr-ink hover:border-msr-line-strong"
                        }`}
                      >
                        <Icon className="h-4 w-4 shrink-0" />
                        {mode === "store_pickup" ? "Store pickup" : "Home delivery"}
                        {on ? <Check className="ml-auto h-4 w-4" /> : null}
                      </button>
                    );
                  })}
                </div>
              </div>
            ) : null}

            {fulfillment === "store_pickup" && product.pickupAddress?.addressLine1 ? <PickupMap address={product.pickupAddress} /> : null}

            {outOfStock ? (
              <form
                className="mt-5 rounded-xl border border-msr-line bg-msr-surface p-4"
                onSubmit={async (e) => {
                  e.preventDefault();
                  setNotifyBusy(true);
                  setNotifyMsg("");
                  try {
                    await api.notifyRestock(product.id, { email: notifyEmail || undefined });
                    setNotifyMsg("We’ll notify you when this item is restocked.");
                  } catch (err) {
                    setNotifyMsg(err.message || "Could not save alert.");
                  } finally {
                    setNotifyBusy(false);
                  }
                }}
              >
                <p className="text-sm font-bold text-msr-ink">Notify me when restocked</p>
                <p className="mt-1 text-[12px] text-msr-muted">Get an alert so you can buy as soon as stock is back.</p>
                <div className="mt-3 flex flex-col gap-2 sm:flex-row">
                  <input
                    type="email"
                    required={!user?.email}
                    value={notifyEmail}
                    onChange={(e) => setNotifyEmail(e.target.value)}
                    placeholder="Your email"
                    className={`${inputClass} flex-1`}
                  />
                  <Button type="submit" size="lg" disabled={notifyBusy}>
                    {notifyBusy ? "Saving…" : "Notify me"}
                  </Button>
                </div>
                {notifyMsg ? <p className="mt-2 text-[12px] text-msr-muted">{notifyMsg}</p> : null}
              </form>
            ) : null}

            {cartMsg ? <p className="mt-4 rounded-lg bg-msr-danger-soft px-3 py-2 text-[13px] text-msr-danger">{cartMsg}</p> : null}

            <div className="mt-5 hidden gap-2.5 md:flex">
              <Button size="lg" className="flex-1" onClick={onAdd} disabled={outOfStock || cartBusy}>
                {cartBusy ? <Loader2 className="h-4 w-4 animate-spin" /> : added ? <Check className="h-4 w-4" /> : <ShoppingCart className="h-4 w-4" />}
                {addLabel}
              </Button>
              <Button size="lg" variant="dark" className="flex-1" onClick={buyNow} disabled={outOfStock || cartBusy}>
                <Zap className="h-4 w-4 text-msr-gold" />
                Buy now
              </Button>
              <button
                type="button"
                onClick={() => toggleWish(product)}
                className={`grid h-12 w-12 shrink-0 place-items-center rounded-xl border transition-colors ${
                  wished ? "border-msr-danger/40 bg-msr-danger-soft text-msr-danger" : "border-msr-line-strong text-msr-ink hover:border-msr-danger hover:text-msr-danger"
                }`}
                aria-label={wished ? "Remove from wishlist" : "Save to wishlist"}
              >
                <Heart className={`h-5 w-5 ${wished ? "fill-current" : ""}`} />
              </button>
            </div>
          </div>

          <div className="mt-3 flex items-start gap-3 rounded-2xl border border-msr-line bg-white px-4 py-3.5">
            <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-msr-primary-soft text-msr-primary">
              <MapPin className="h-4 w-4" />
            </span>
            <span className="text-[13px] leading-snug">
              <span className="block font-semibold text-msr-ink">
                Delivering to {location.city} {location.postalCode}
              </span>
              <span className="text-msr-muted">Usually arrives in 1–2 days · change city from the header</span>
            </span>
          </div>

          <Offers />

          <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
            <Trust to="/help" icon={ShieldCheck} title="100% genuine" />
            {deliveryModes.includes("delivery_partner") ? (
              <Trust to="/help#shipping" icon={Truck} title="Fast delivery" />
            ) : (
              <Trust to="/help#shipping" icon={Store} title="Store pickup" />
            )}
            {product.easyReturn ? (
              <Trust to="/help#returns" icon={RotateCcw} title="7-day returns" />
            ) : (
              <Trust to="/help#payments" icon={BadgeCheck} title="Secure pay" />
            )}
            <Trust to="/bulk" icon={FileText} title="GST invoice" />
          </div>
        </div>
      </div>

      <section className="mt-10 overflow-hidden rounded-2xl border border-msr-line bg-white">
        <div className="no-scrollbar flex gap-6 overflow-x-auto border-b border-msr-line px-5 md:px-7" role="tablist">
          {TABS.map((t) => (
            <button
              key={t.id}
              type="button"
              role="tab"
              aria-selected={tab === t.id}
              onClick={() => setTab(t.id)}
              className={`relative h-12 shrink-0 text-[13.5px] font-semibold transition-colors ${
                tab === t.id ? "text-msr-primary" : "text-msr-muted hover:text-msr-ink"
              }`}
            >
              {t.label}
              {tab === t.id ? <span className="absolute inset-x-0 bottom-0 h-0.5 rounded-full bg-msr-primary" /> : null}
            </button>
          ))}
        </div>

        <div className="p-5 md:p-7" role="tabpanel">
          {tab === "about" ? (
            <div className="max-w-3xl">
              <p className="text-[14.5px] leading-7 text-msr-ink/80">{product.description || "No description available."}</p>
              {product.features?.length ? (
                <ul className="mt-5 grid gap-2.5 sm:grid-cols-2">
                  {product.features.map((f) => (
                    <li key={f} className="flex items-start gap-2.5 text-[14px] text-msr-ink">
                      <BadgeCheck className="mt-0.5 h-4 w-4 shrink-0 text-msr-primary" />
                      {f}
                    </li>
                  ))}
                </ul>
              ) : null}
            </div>
          ) : null}

          {tab === "specs" ? (
            <dl className="grid max-w-3xl overflow-hidden rounded-xl border border-msr-line text-[14px] sm:grid-cols-2">
              <Spec label="Brand" value={product.brand} to={`/category/all?q=${encodeURIComponent(product.brand)}`} />
              <Spec label="Category" value={cat?.name || product.category} to={`/category/${product.category}`} />
              <Spec label="Pack size" value={pack} />
              <Spec label="SKU" value={product.id} />
              <Spec label="Manufacturer" value={product.manufacturer} />
            </dl>
          ) : null}

          {tab === "ingredients" ? (
            <div className="grid max-w-4xl gap-6 md:grid-cols-2">
              <div>
                <h3 className="text-[14px] font-bold text-msr-ink">Ingredients</h3>
                <p className="mt-2 text-[14px] leading-7 text-msr-ink/80">{product.ingredients || "Not specified."}</p>
              </div>
              <div>
                <h3 className="text-[14px] font-bold text-msr-ink">Nutritional info</h3>
                <p className="mt-2 text-[14px] leading-7 text-msr-ink/80">{product.nutrition || "Not specified."}</p>
              </div>
            </div>
          ) : null}

          {tab === "reviews" ? (
            <div className="flex flex-wrap items-center gap-8">
              <div>
                <div className="flex items-end gap-2">
                  <span className="text-[2.75rem] font-extrabold leading-none text-msr-ink">{(product.rating || 0).toFixed(1)}</span>
                  <span className="pb-1.5 text-sm text-msr-subtle">/ 5</span>
                </div>
                <div className="mt-2 flex items-center gap-0.5">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <Star key={i} className={`h-4 w-4 ${i < Math.round(product.rating) ? "fill-amber-400 text-amber-400" : "text-msr-line-strong"}`} />
                  ))}
                </div>
                <p className="mt-2 text-[13px] text-msr-muted">{(product.reviews || 0).toLocaleString("en-IN")} verified ratings</p>
              </div>
              <div className="w-full max-w-md flex-1 space-y-2">
                {reviewBars(product.rating).map((row) => (
                  <div key={row.stars} className="flex items-center gap-3 text-[12px] text-msr-muted">
                    <span className="w-7 shrink-0 font-semibold">{row.stars} ★</span>
                    <div className="h-2 flex-1 overflow-hidden rounded-full bg-msr-surface">
                      <div className="h-full rounded-full bg-msr-success" style={{ width: `${row.pct}%` }} />
                    </div>
                    <span className="w-9 text-right">{row.pct}%</span>
                  </div>
                ))}
              </div>
            </div>
          ) : null}
        </div>
      </section>

      {related.length ? (
        <section className="mt-10">
          <SectionTitle title="Similar products" subtitle={`More from ${cat?.name || "this category"}`} to={`/category/${product.category}`} />
          <ProductRail products={related} />
        </section>
      ) : null}

      <div className="fixed inset-x-0 bottom-16 z-30 border-t border-msr-line bg-white/95 px-4 py-3 backdrop-blur md:hidden">
        <div className="flex items-center gap-2">
          <div className="min-w-0 flex-1">
            <p className="text-[17px] font-extrabold leading-none text-msr-ink">{inr(priced.price)}</p>
            <p className="mt-1 truncate text-[11px] text-msr-subtle">
              {pack}
              {off ? <span className="ml-1 font-bold text-msr-success">{off}% off</span> : null}
            </p>
          </div>
          <button
            type="button"
            onClick={() => toggleWish(product)}
            className={`grid h-10 w-10 shrink-0 place-items-center rounded-xl border ${wished ? "border-msr-danger/40 text-msr-danger" : "border-msr-line-strong text-msr-ink"}`}
            aria-label={wished ? "Remove from wishlist" : "Save to wishlist"}
          >
            <Heart className={`h-5 w-5 ${wished ? "fill-current" : ""}`} />
          </button>
          <Button size="md" onClick={onAdd} disabled={outOfStock || cartBusy}>
            {cartBusy ? <Loader2 className="h-4 w-4 animate-spin" /> : added ? <Check className="h-4 w-4" /> : <ShoppingCart className="h-4 w-4" />}
            {added ? "Added" : "Add"}
          </Button>
          <Button size="md" variant="dark" onClick={buyNow} disabled={outOfStock || cartBusy}>
            Buy now
          </Button>
        </div>
      </div>
    </div>
  );
}

function Gallery({ product, gallery, photo, setPhoto, wished, onWish, badges }) {
  return (
    <div className="lg:sticky lg:top-32 lg:self-start">
      <div className="flex gap-3 lg:flex-row-reverse">
        <div className="relative min-w-0 flex-1 overflow-hidden rounded-2xl border border-msr-line bg-white">
          <div className="absolute left-4 top-4 z-10 flex flex-wrap gap-1.5">
            {badges.map((b) => (
              <span key={b} className="rounded-md bg-msr-brand px-2 py-1 text-[11px] font-bold text-white">
                {b}
              </span>
            ))}
          </div>
          <button
            type="button"
            onClick={onWish}
            className={`absolute right-4 top-4 z-10 grid h-10 w-10 place-items-center rounded-full bg-white shadow-card transition ${
              wished ? "text-msr-danger" : "text-msr-subtle hover:text-msr-danger"
            }`}
            aria-label={wished ? "Remove from wishlist" : "Save to wishlist"}
          >
            <Heart className={`h-5 w-5 ${wished ? "fill-current" : ""}`} />
          </button>
          <div className="grid aspect-square place-items-center p-8 sm:p-12">
            <img key={photo} src={gallery[photo] || product.image} alt={product.name} className="msr-fade h-full w-full object-contain" />
          </div>
        </div>
        {gallery.length > 1 ? (
          <div className="no-scrollbar hidden max-h-[520px] shrink-0 flex-col gap-2 overflow-y-auto lg:flex">
            {gallery.map((src, i) => (
              <Thumb key={src + i} src={src} active={photo === i} onClick={() => setPhoto(i)} />
            ))}
          </div>
        ) : null}
      </div>
      {gallery.length > 1 ? (
        <div className="no-scrollbar mt-3 flex gap-2 overflow-x-auto lg:hidden">
          {gallery.map((src, i) => (
            <Thumb key={src + i} src={src} active={photo === i} onClick={() => setPhoto(i)} />
          ))}
        </div>
      ) : null}
    </div>
  );
}

function Thumb({ src, active, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`h-16 w-16 shrink-0 overflow-hidden rounded-xl border-2 bg-white p-1 transition ${
        active ? "border-msr-primary" : "border-msr-line hover:border-msr-line-strong"
      }`}
    >
      <img src={src} alt="" className="h-full w-full object-contain" />
    </button>
  );
}

function Offers() {
  const rows = [
    { key: "code", body: <>Extra 10% off with code <span className="rounded bg-white px-1.5 py-0.5 font-mono text-[12px] font-bold text-msr-ink ring-1 ring-msr-line">WELCOME10</span></> },
    { key: "free", body: <>Free delivery on orders above ₹999</> },
    {
      key: "bulk",
      body: (
        <>
          <Link to="/bulk" className="font-semibold text-msr-primary hover:underline">
            Extra bulk discount
          </Link>{" "}
          on 10+ units
        </>
      ),
    },
  ];
  return (
    <div className="mt-3 rounded-2xl border border-msr-line bg-white p-4">
      <p className="flex items-center gap-2 text-[13px] font-bold text-msr-ink">
        <Tag className="h-4 w-4 text-msr-success" /> Available offers
      </p>
      <ul className="mt-3 space-y-2.5 text-[13px] leading-snug text-msr-ink/80">
        {rows.map((row) => (
          <li key={row.key} className="flex items-center gap-2.5">
            <span className="grid h-5 w-5 shrink-0 place-items-center rounded-full bg-msr-success-soft text-msr-success">
              <Check className="h-3 w-3" strokeWidth={3} />
            </span>
            <span>{row.body}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function Trust({ to, icon: Icon, title }) {
  return (
    <Link
      to={to}
      className="flex flex-col items-center gap-1.5 rounded-xl border border-msr-line bg-white px-2 py-3 text-center transition hover:border-msr-primary/40"
    >
      <Icon className="h-5 w-5 text-msr-primary" strokeWidth={1.8} />
      <span className="text-[12px] font-semibold text-msr-ink">{title}</span>
    </Link>
  );
}

function PickupMap({ address }) {
  const q = [address.formatted, address.addressLine1, address.city, address.state, address.postalCode].filter(Boolean).join(", ");
  const src = `https://maps.google.com/maps?q=${encodeURIComponent(q)}&z=16&output=embed`;
  return (
    <div className="mt-4 overflow-hidden rounded-xl border border-msr-line">
      <iframe title="Store pickup on Google Maps" src={src} className="h-48 w-full border-0" loading="lazy" />
      <p className="px-4 py-3 text-[13px] text-msr-muted">Store pickup · {q}</p>
    </div>
  );
}

function Spec({ label, value, to }) {
  return (
    <div className="flex items-start justify-between gap-4 border-b border-msr-line px-4 py-3 sm:odd:border-r">
      <dt className="shrink-0 text-msr-muted">{label}</dt>
      <dd className="text-right font-medium text-msr-ink">
        {to ? (
          <Link to={to} className="hover:text-msr-primary hover:underline">
            {value}
          </Link>
        ) : (
          value || "—"
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
