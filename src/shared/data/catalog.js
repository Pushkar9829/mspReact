export const categories = [
  { slug: "staples", name: "Staples", emoji: "🌾", color: "bg-amber-50" },
  { slug: "beverages", name: "Beverages", emoji: "🍵", color: "bg-orange-50" },
  { slug: "snacks", name: "Snacks", emoji: "🍪", color: "bg-yellow-50" },
  { slug: "personal-care", name: "Personal Care", emoji: "🧴", color: "bg-sky-50" },
  { slug: "home-care", name: "Home Care", emoji: "🫧", color: "bg-blue-50" },
  { slug: "baby-care", name: "Baby Care", emoji: "🍼", color: "bg-pink-50" },
  { slug: "health", name: "Health & Wellness", emoji: "💊", color: "bg-emerald-50" },
  { slug: "dairy", name: "Dairy & Bakery", emoji: "🥛", color: "bg-lime-50" },
];

export const needs = [
  { slug: "cooking", name: "Cooking Essentials", to: "/category/staples" },
  { slug: "masala", name: "Masala & Spices", to: "/category/staples?q=Masala" },
  { slug: "pulses", name: "Pulses & Grains", to: "/category/staples" },
  { slug: "sauces", name: "Sauces & Ketchup", to: "/category/snacks?q=Maggi" },
  { slug: "biscuits", name: "Biscuits & Cookies", to: "/category/snacks?q=Parle" },
  { slug: "chocolates", name: "Chocolates &\nConfectionery", to: "/category/snacks" },
  { slug: "cleaning", name: "Cleaning Essentials", to: "/category/home-care" },
  { slug: "tissues", name: "Tissues & Papers", to: "/category/home-care" },
];

export const brands = [
  { slug: "tata", name: "Tata", letter: "T" },
  { slug: "fortune", name: "Fortune", letter: "F" },
  { slug: "maggi", name: "Maggi", letter: "M" },
  { slug: "surf-excel", name: "Surf Excel", letter: "S" },
  { slug: "aashirvaad", name: "Aashirvaad", letter: "A" },
  { slug: "parle", name: "Parle", letter: "P" },
  { slug: "amul", name: "Amul", letter: "A" },
  { slug: "dove", name: "Dove", letter: "D" },
];

export const locations = [
  { city: "Mumbai", postalCode: "400001" },
  { city: "Delhi", postalCode: "110001" },
  { city: "Bengaluru", postalCode: "560001" },
  { city: "Pune", postalCode: "411001" },
  { city: "Hyderabad", postalCode: "500001" },
];

export const products = [
  {
    id: "tata-tea-premium",
    name: "Tata Tea Premium",
    brand: "Tata",
    category: "beverages",
    weight: "1 kg",
    packs: ["250g", "500g", "1 kg", "2 kg"],
    price: 245,
    mrp: 280,
    rating: 4.6,
    reviews: 1284,
    image: "/products/tea.png",
    gallery: ["/products/tea.png"],
    badge: "Best seller",
    stock: 240,
    description:
      "A rich, fragrant blend of quality tea leaves for everyday chai. Ideal for households, offices and bulk retail orders.",
    features: ["Strong aroma", "Consistent brew", "Pan-India favourite", "Retailer-friendly packs"],
    ingredients: "Tea leaves, natural flavours.",
    nutrition: "Energy 0 kcal per cup without milk/sugar.",
    manufacturer: "Tata Consumer Products Ltd.",
    bestseller: true,
    deal: true,
  },
  {
    id: "fortune-sunflower-oil",
    name: "Fortune Sunlite Refined Sunflower Oil",
    brand: "Fortune",
    category: "staples",
    weight: "1 L",
    packs: ["1 L", "5 L", "15 L"],
    price: 135,
    mrp: 158,
    rating: 4.5,
    reviews: 890,
    image: "/products/oil.png",
    gallery: ["/products/oil.png"],
    stock: 120,
    description: "Light, healthy sunflower oil for everyday cooking and bulk kitchen use.",
    features: ["Light taste", "Vitamin A & D", "Sealed pack"],
    ingredients: "Refined sunflower oil.",
    nutrition: "900 kcal per 100 ml.",
    manufacturer: "Adani Wilmar Ltd.",
    bestseller: true,
  },
  {
    id: "aashirvaad-atta",
    name: "Aashirvaad Atta",
    brand: "Aashirvaad",
    category: "staples",
    weight: "5 kg",
    packs: ["5 kg", "10 kg"],
    price: 265,
    mrp: 310,
    rating: 4.7,
    reviews: 2102,
    image: "/products/atta.png",
    gallery: ["/products/atta.png"],
    stock: 80,
    description: "100% whole wheat atta with a lock of freshness for soft rotis.",
    features: ["Chakki fresh", "Soft rotis", "Bulk packs"],
    ingredients: "Whole wheat.",
    nutrition: "Carbs 69g / 100g.",
    manufacturer: "ITC Ltd.",
    bestseller: true,
  },
  {
    id: "maggi-masala",
    name: "Maggi 2-Minute Masala Noodles",
    brand: "Maggi",
    category: "snacks",
    weight: "12 pack",
    packs: ["8 pack", "12 pack", "24 pack"],
    price: 138,
    mrp: 168,
    rating: 4.4,
    reviews: 3401,
    image:
      "https://images.unsplash.com/photo-1612929633738-8fe44f7ec841?auto=format&fit=crop&w=640&q=80",
    gallery: [
      "https://images.unsplash.com/photo-1612929633738-8fe44f7ec841?auto=format&fit=crop&w=800&q=80",
    ],
    stock: 500,
    description: "India’s favourite instant noodles. Fast-moving SKU for kirana and bulk buyers.",
    features: ["Ready in 2 minutes", "Masala taste", "High velocity SKU"],
    ingredients: "Wheat flour, palm oil, spices.",
    nutrition: "Energy 401 kcal / 100g.",
    manufacturer: "Nestlé India.",
    deal: true,
  },
  {
    id: "surf-excel",
    name: "Surf Excel Matic Top Load",
    brand: "Surf Excel",
    category: "home-care",
    weight: "2 kg",
    packs: ["1 kg", "2 kg", "4 kg"],
    price: 255,
    mrp: 299,
    rating: 4.6,
    reviews: 760,
    image: "/products/detergent.png",
    gallery: ["/products/detergent.png"],
    stock: 90,
    description: "Removes tough stains with less effort. Popular home-care staple.",
    features: ["Stain removal", "Value pack", "Retail favourite"],
    ingredients: "Anionic surfactants, enzymes.",
    nutrition: "Not a food product.",
    manufacturer: "Hindustan Unilever Ltd.",
    bestseller: true,
  },
  {
    id: "parle-g",
    name: "Parle-G Glucose Biscuits",
    brand: "Parle",
    category: "snacks",
    weight: "800 g",
    packs: ["250 g", "800 g", "1.5 kg"],
    price: 70,
    mrp: 80,
    rating: 4.8,
    reviews: 5200,
    image:
      "https://images.unsplash.com/photo-1558961363-fa8fdf82db35?auto=format&fit=crop&w=640&q=80",
    gallery: [
      "https://images.unsplash.com/photo-1558961363-fa8fdf82db35?auto=format&fit=crop&w=800&q=80",
    ],
    stock: 800,
    description: "The world’s largest selling biscuit. Perfect for bulk kirana orders.",
    features: ["Everyday snack", "Long shelf life", "High repeat"],
    ingredients: "Wheat flour, sugar, edible vegetable oil.",
    nutrition: "Energy 453 kcal / 100g.",
    manufacturer: "Parle Products Pvt. Ltd.",
    newLaunch: false,
  },
  {
    id: "amul-butter",
    name: "Amul Pasteurised Butter",
    brand: "Amul",
    category: "dairy",
    weight: "500 g",
    packs: ["100 g", "500 g"],
    price: 275,
    mrp: 285,
    rating: 4.7,
    reviews: 1900,
    image:
      "https://images.unsplash.com/photo-1589985270826-4dfd61180d4c?auto=format&fit=crop&w=640&q=80",
    gallery: [
      "https://images.unsplash.com/photo-1589985270826-4dfd61180d4c?auto=format&fit=crop&w=800&q=80",
    ],
    stock: 60,
    description: "Fresh, creamy Amul butter. Keep refrigerated.",
    features: ["Pasteurised", "No added colour", "Trusted dairy"],
    ingredients: "Pasteurised cream, salt.",
    nutrition: "Fat 80g / 100g.",
    manufacturer: "GCMMF (Amul).",
    newLaunch: true,
  },
  {
    id: "dove-shampoo",
    name: "Dove Intense Repair Shampoo",
    brand: "Dove",
    category: "personal-care",
    weight: "650 ml",
    packs: ["340 ml", "650 ml"],
    price: 365,
    mrp: 420,
    rating: 4.5,
    reviews: 640,
    image:
      "https://images.unsplash.com/photo-1556228720-195a672e8a03?auto=format&fit=crop&w=640&q=80",
    gallery: [
      "https://images.unsplash.com/photo-1556228720-195a672e8a03?auto=format&fit=crop&w=800&q=80",
    ],
    stock: 150,
    description: "Nourishing shampoo for damaged hair. Fast mover in personal care.",
    features: ["Repair care", "Family pack", "HUL brand"],
    ingredients: "Aqua, surfactants, conditioning agents.",
    nutrition: "Not a food product.",
    manufacturer: "Hindustan Unilever Ltd.",
    newLaunch: true,
  },
  {
    id: "red-label",
    name: "Brooke Bond Red Label",
    brand: "HUL",
    category: "beverages",
    weight: "1 kg",
    packs: ["250g", "500g", "1 kg"],
    price: 230,
    mrp: 260,
    rating: 4.4,
    reviews: 980,
    image:
      "https://images.unsplash.com/photo-1544787219-7f47ccb76574?auto=format&fit=crop&w=640&q=80",
    gallery: [
      "https://images.unsplash.com/photo-1544787219-7f47ccb76574?auto=format&fit=crop&w=800&q=80",
    ],
    stock: 210,
    description: "A strong cup of tea with a rich colour and aroma.",
    features: ["Strong brew", "Family pack"],
    ingredients: "Tea leaves.",
    nutrition: "0 kcal per cup.",
    manufacturer: "Hindustan Unilever Ltd.",
    deal: true,
  },
  {
    id: "colgate-strong",
    name: "Colgate Strong Teeth",
    brand: "Colgate",
    category: "personal-care",
    weight: "200 g",
    packs: ["100 g", "200 g", "300 g"],
    price: 98,
    mrp: 120,
    rating: 4.6,
    reviews: 1500,
    image:
      "https://images.unsplash.com/photo-1559591935-c6c92c6c2c8e?auto=format&fit=crop&w=640&q=80",
    gallery: [
      "https://images.unsplash.com/photo-1559591935-c6c92c6c2c8e?auto=format&fit=crop&w=800&q=80",
    ],
    stock: 400,
    description: "Calcium-rich toothpaste for everyday oral care.",
    features: ["Calcium boost", "Family SKU"],
    ingredients: "Calcium carbonate, fluoride.",
    nutrition: "Not a food product.",
    manufacturer: "Colgate-Palmolive India.",
    newLaunch: true,
  },
  {
    id: "colgate-maxfresh",
    name: "Colgate MaxFresh Cooling Crystals",
    brand: "Colgate",
    category: "personal-care",
    weight: "150 g",
    packs: ["80 g", "150 g", "300 g"],
    price: 75,
    mrp: 99,
    rating: 4.6,
    reviews: 1840,
    image: "/products/toothpaste.png",
    gallery: ["/products/toothpaste.png"],
    badge: "Best seller",
    stock: 360,
    description: "Cooling crystals toothpaste for a burst of freshness. Fast-moving personal care SKU.",
    features: ["Cooling crystals", "Family SKU", "Retail favourite"],
    ingredients: "Calcium carbonate, fluoride, cooling crystals.",
    nutrition: "Not a food product.",
    manufacturer: "Colgate-Palmolive India.",
    bestseller: true,
  },
  {
    id: "dove-body-wash",
    name: "Dove Deeply Nourishing Body Wash",
    brand: "Dove",
    category: "personal-care",
    weight: "400 ml",
    packs: ["250 ml", "400 ml", "750 ml"],
    price: 199,
    mrp: 249,
    rating: 4.5,
    reviews: 920,
    image: "/products/bodywash.png",
    gallery: ["/products/bodywash.png"],
    badge: "Best seller",
    stock: 210,
    description: "Moisturising body wash for deeply nourished skin. Popular HUL personal care SKU.",
    features: ["Deeply nourishing", "Family pack", "HUL brand"],
    ingredients: "Aqua, surfactants, moisturising cream.",
    nutrition: "Not a food product.",
    manufacturer: "Hindustan Unilever Ltd.",
    bestseller: true,
  },
  {
    id: "dettol-soap",
    name: "Dettol Original Soap",
    brand: "Dettol",
    category: "personal-care",
    weight: "4 x 125 g",
    packs: ["1 bar", "4 x 125 g"],
    price: 165,
    mrp: 198,
    rating: 4.5,
    reviews: 870,
    image:
      "https://images.unsplash.com/photo-1584305574647-0cc949a2bb9f?auto=format&fit=crop&w=640&q=80",
    gallery: [
      "https://images.unsplash.com/photo-1584305574647-0cc949a2bb9f?auto=format&fit=crop&w=800&q=80",
    ],
    stock: 260,
    description: "Trusted germ-protection soap in a value multipack.",
    features: ["Germ protection", "Value pack"],
    ingredients: "Soap noodles, triclocarban.",
    nutrition: "Not a food product.",
    manufacturer: "Reckitt.",
    deal: true,
  },
  {
    id: "mdh-kitchen-king",
    name: "MDH Kitchen King Masala",
    brand: "MDH",
    category: "staples",
    weight: "500 g",
    packs: ["100 g", "500 g"],
    price: 210,
    mrp: 240,
    rating: 4.6,
    reviews: 430,
    image:
      "https://images.unsplash.com/photo-1596040033229-a9821ebd058d?auto=format&fit=crop&w=640&q=80",
    gallery: [
      "https://images.unsplash.com/photo-1596040033229-a9821ebd058d?auto=format&fit=crop&w=800&q=80",
    ],
    stock: 140,
    description: "Aromatic blend for gravies, sabzis and bulk kitchen use.",
    features: ["Authentic blend", "Airtight pack"],
    ingredients: "Coriander, chilli, turmeric, spices.",
    nutrition: "Use as seasoning.",
    manufacturer: "Mahashian Di Hatti Pvt. Ltd.",
    newLaunch: true,
  },
];

export function discount(product) {
  if (!product?.mrp || product.mrp <= product.price) return 0;
  return Math.round(((product.mrp - product.price) / product.mrp) * 100);
}

let liveProducts = null;

export function setLiveCatalog(rows) {
  liveProducts = Array.isArray(rows) && rows.length ? rows : null;
}

export function getProduct(id) {
  const pool = liveProducts || products;
  return pool.find((p) => p.id === id);
}

export function getCatalogProducts() {
  return liveProducts || products;
}

export const heroSlides = [
  {
    id: "everyday",
    kicker: "Wholesale FMCG",
    title: "Everything you need,\neveryday.",
    sub: "Your trusted marketplace for quality products at the best prices — for homes, kiranas and businesses.",
    cta: "Shop now",
    to: "/category/all",
    image: "/hero-crate.png",
    imageAlt: "MS₹ crate of everyday FMCG brands",
  },
  {
    id: "bulk",
    kicker: "For retailers",
    title: "Bulk prices.\nEvery order.",
    sub: "Special wholesale rates, GST invoices and pan-India delivery for kiranas, offices and businesses.",
    cta: "Shop bulk",
    to: "/bulk",
    image: "/promos/bulk.png",
    imageAlt: "Bulk MS₹ shipping boxes",
  },
  {
    id: "deal",
    kicker: "Deal of the day",
    title: "Daily deals.\nLimited time.",
    sub: "Save on fast-moving FMCG staples. Fresh offers, genuine brands, ready to stock.",
    cta: "View deals",
    to: "/deals",
    image: "/promos/deal.png",
    imageAlt: "Deal of the day product",
  },
  {
    id: "new",
    kicker: "Just in",
    title: "New launches.\nEvery week.",
    sub: "Discover the latest arrivals from India’s most trusted FMCG brands.",
    cta: "Explore new",
    to: "/new",
    image: "/promos/new.png",
    imageAlt: "New personal care launches",
  },
].map((slide) => {
  if (slide.id === "deal") {
    const p = getProduct("tata-tea-premium") || products.find((x) => x.deal);
    if (p) {
      return {
        ...slide,
        sub: `${p.name} · ${p.weight}. ${p.description}`,
        image: p.image,
        imageAlt: p.name,
        price: p.price,
        weight: p.weight,
        to: `/product/${p.id}`,
        cta: "Shop this deal",
      };
    }
  }
  if (slide.id === "new") {
    const p = getProduct("dove-body-wash") || products.find((x) => x.newLaunch);
    if (p) {
      return {
        ...slide,
        sub: `${p.name} · ${p.weight}. ${p.description}`,
        image: p.image,
        imageAlt: p.name,
        price: p.price,
        weight: p.weight,
        to: `/product/${p.id}`,
      };
    }
  }
  return slide;
});

export function filterProducts({ category, brand, q, deal, newLaunch, bestseller, maxPrice } = {}) {
  return products.filter((p) => {
    if (category && category !== "all" && p.category !== category) return false;
    if (brand && p.brand.toLowerCase() !== String(brand).toLowerCase()) return false;
    if (deal && !p.deal) return false;
    if (newLaunch && !p.newLaunch) return false;
    if (bestseller && !p.bestseller) return false;
    if (maxPrice && p.price > maxPrice) return false;
    if (q) {
      const hay = `${p.name} ${p.brand} ${p.category}`.toLowerCase();
      if (!hay.includes(String(q).toLowerCase())) return false;
    }
    return true;
  });
}
