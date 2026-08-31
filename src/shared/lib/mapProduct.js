const CAT_COLORS = {
  staples: "bg-amber-50",
  beverages: "bg-orange-50",
  snacks: "bg-yellow-50",
  "personal-care": "bg-sky-50",
  "home-care": "bg-blue-50",
  "baby-care": "bg-pink-50",
  health: "bg-emerald-50",
  dairy: "bg-lime-50",
};

export function discount(product) {
  if (!product?.mrp || product.mrp <= product.price) return 0;
  return Math.round(((product.mrp - product.price) / product.mrp) * 100);
}

export function packOf(variant) {
  return String(variant?.attributes?.packSize || variant?.attributes?.size || "").trim();
}

export function priceForPack(product, pack) {
  const match = product?.packPrices?.find((row) => row.pack === pack);
  return {
    price: match?.price ?? product?.price ?? 0,
    mrp: match?.mrp ?? product?.mrp ?? 0,
  };
}

export function mapApiProduct(doc) {
  if (!doc) return null;
  const variants = doc.variants || [];
  const spec = doc.specifications || {};
  const packPrices = variants.map((v) => ({
    pack: packOf(v),
    price: v.sellingPrice,
    mrp: v.listPrice,
    variantId: v._id,
  })).filter((row) => row.pack);
  const defaultPack = spec.defaultPack || packPrices[0]?.pack || "";
  const chosen = packPrices.find((row) => row.pack === defaultPack) || packPrices[0];
  const tags = doc.tags || [];
  const images = [...new Set((doc.images || []).filter(Boolean))];
  const categorySlug = doc.categoryId?.slug || "";
  return {
    id: String(doc.sku || "").toLowerCase(),
    productId: doc._id,
    name: doc.name,
    brand: doc.brandId?.name || "",
    category: categorySlug,
    categoryName: doc.categoryId?.name || "",
    weight: defaultPack,
    packs: packPrices.map((row) => row.pack),
    packPrices,
    price: chosen?.price || 0,
    mrp: chosen?.mrp || chosen?.price || 0,
    rating: Number(spec.rating) || 4.5,
    reviews: Number(spec.reviews) || 0,
    image: images[0] || "",
    gallery: images.length ? images : [""],
    stock: 200,
    description: doc.description || "",
    features: spec.features || [],
    ingredients: spec.ingredients || "",
    nutrition: spec.nutrition || "",
    manufacturer: spec.manufacturer || "",
    bestseller: tags.includes("bestseller"),
    deal: tags.includes("deal"),
    newLaunch: tags.includes("new"),
    badge: tags.includes("bestseller") ? "Best seller" : "",
  };
}

export function mapCategory(doc) {
  if (!doc) return null;
  return {
    slug: doc.slug,
    name: doc.name,
    emoji: doc.icon || "",
    color: CAT_COLORS[doc.slug] || "bg-slate-50",
    image: doc.image || `/categories/${doc.slug}.png`,
    parentId: doc.parentId || null,
  };
}

export function mapLookup(res) {
  if (!res?.product) return null;
  const raw = typeof res.product.toObject === "function" ? res.product.toObject() : res.product;
  return mapApiProduct({ ...raw, variants: res.variants || (res.variant ? [res.variant] : []) });
}
