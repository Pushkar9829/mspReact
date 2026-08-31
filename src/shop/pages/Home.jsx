import { useRef } from "react";
import { Link } from "react-router-dom";
import { needs } from "../../shared/data/catalog.js";
import { useShopCatalog } from "../../shared/context/ShopCatalogContext.jsx";
import ProductCard from "../components/ProductCard.jsx";
import Hero from "../components/Hero.jsx";
import { SectionTitle } from "../../shared/components/ui.jsx";
import { ArrowRight, Award, ChevronRight, ShieldCheck, Truck } from "lucide-react";

const TRUST_STRIP = [
  { icon: Award, title: "Trusted by Thousands", text: "of Retailers", to: "/bulk" },
  { icon: ShieldCheck, title: "Genuine Products", text: "100% Original", to: "/help" },
  { icon: Truck, title: "On-Time Delivery", text: "Across India", to: "/help#shipping" },
  { icon: ShieldLockIcon, title: "Secure Payments", text: "Multiple Options", to: "/help" },
];

const BESTSELLER_IDS = [
  "aashirvaad-atta",
  "fortune-sunflower-oil",
  "tata-tea-premium",
  "surf-excel",
  "colgate-maxfresh",
  "dove-body-wash",
];

const CATEGORY_STRIP = [
  { slug: "staples", name: "Staples", image: "/categories/staples.png" },
  { slug: "beverages", name: "Beverages", image: "/categories/beverages.png" },
  { slug: "snacks", name: "Snacks &\nBranded Foods", image: "/categories/snacks.png" },
  { slug: "personal-care", name: "Personal Care", image: "/categories/personal-care.png" },
  { slug: "home-care", name: "Home Care", image: "/categories/home-care.png" },
  { slug: "baby-care", name: "Baby Care", image: "/categories/baby-care.png" },
  { slug: "health", name: "Health &\nWellness", image: "/categories/health.png" },
  { slug: "dairy", name: "Dairy &\nBakery", image: "/categories/dairy.png" },
];

export default function Home() {
  const rowRef = useRef(null);
  const { products, filterProducts } = useShopCatalog();
  const featured = BESTSELLER_IDS.map((id) => products.find((p) => p.id === id)).filter(Boolean);
  const tagged = filterProducts({ bestseller: true });
  const bestsellers = [
    ...featured,
    ...tagged.filter((p) => !BESTSELLER_IDS.includes(p.id)),
    ...products.filter((p) => !BESTSELLER_IDS.includes(p.id) && !tagged.some((t) => t.id === p.id)),
  ];

  function scrollBestsellers() {
    const el = rowRef.current;
    if (!el) return;
    const card = el.querySelector("[data-product-card]");
    const step = card ? card.getBoundingClientRect().width + 16 : 192;
    el.scrollBy({ left: step * 2, behavior: "smooth" });
  }

  return (
    <div>
      <Hero />

      <section className="relative z-10 bg-[#070b2e] pb-10">
        <div className="msr-gutter">
          <div className="flex items-stretch overflow-x-auto rounded-2xl bg-white px-2 py-5 shadow-[0_12px_40px_rgba(8,10,61,0.14)] no-scrollbar sm:px-3">
            {CATEGORY_STRIP.map((c, i) => (
              <Link
                key={c.slug}
                to={`/category/${c.slug}`}
                className="relative flex w-[5.75rem] shrink-0 flex-col items-center px-2 text-center sm:w-auto sm:min-w-0 sm:flex-1"
              >
                {i > 0 ? <span className="absolute left-0 top-[18%] h-[46%] w-px bg-[#e8eaf2]" /> : null}
                <img src={c.image} alt={c.name.replaceAll("\n", " ")} className="h-[72px] w-full object-contain md:h-[84px]" />
                <span className="mt-2.5 whitespace-pre-line text-[12px] font-semibold leading-tight text-[#0b1460]">
                  {c.name}
                </span>
              </Link>
            ))}
            <Link to="/category/all" className="flex w-[5.75rem] shrink-0 flex-col items-center justify-center text-center sm:flex-1 sm:max-w-[5.75rem]">
              <span className="grid h-12 w-12 place-items-center rounded-full border border-[#7b6cff] text-[#4b46ff]">
                <ArrowRight className="h-5 w-5" />
              </span>
              <span className="mt-2.5 text-[12px] font-semibold text-[#0b1460]">View all</span>
            </Link>
          </div>
        </div>
      </section>

      <section className="msr-gutter msr-section">
        <div className="grid items-stretch gap-4 md:grid-cols-3">
          <Promo
            to="/bulk"
            title="Big savings on bulk orders"
            text="Special prices for retailers & businesses"
            cta="Shop Bulk"
            image="/promos/bulk.png"
            imageAlt="Bulk MS₹ shipping boxes"
          />
          <Promo
            to="/deals"
            title="Deal of the day"
            text="Daily deals. Limited time offers."
            offer="50% OFF"
            cta="Shop Now"
            outlined
            image="/promos/deal.png"
            imageAlt="Deal of the day salt pack"
          />
          <Promo
            to="/new"
            title="New launches"
            text="Discover the latest products"
            cta="Explore Now"
            arrow
            image="/promos/new.png"
            imageAlt="New personal care launches"
          />
        </div>
      </section>

      <section className="msr-gutter msr-section">
        <SectionTitle title="Best Selling Products" to="/category/all" action="View All →" />
        <div className="relative">
          <div ref={rowRef} className="flex gap-4 overflow-x-auto scroll-smooth no-scrollbar">
            {bestsellers.map((p) => (
              <div key={p.id} data-product-card className="w-[170px] shrink-0 sm:w-[190px] lg:w-[calc((100%-3rem)/4)]">
                <ProductCard product={p} />
              </div>
            ))}
          </div>
          <button
            type="button"
            onClick={scrollBestsellers}
            className="absolute right-0 top-[46%] z-10 grid h-11 w-11 -translate-y-1/2 place-items-center rounded-full border border-[#eceef4] bg-white text-[#1a1c3d] shadow-[0_8px_24px_rgba(16,24,40,0.12)] hover:bg-[#f7f8fc]"
            aria-label="See more bestselling products"
          >
            <ChevronRight className="h-5 w-5" />
          </button>
        </div>
      </section>

      <section className="msr-gutter msr-section">
        <div className="grid grid-cols-1 overflow-hidden rounded-2xl bg-[#0b1460] sm:grid-cols-2 lg:grid-cols-4">
          {TRUST_STRIP.map(({ icon: Icon, title, text, to }) => (
            <Link
              key={title}
              to={to}
              className="flex items-center gap-3.5 px-6 py-6 text-white transition hover:bg-white/10 lg:justify-center lg:border-l lg:border-white/15 lg:px-5 lg:first:border-l-0"
            >
              <Icon className="h-6 w-6 shrink-0 stroke-[1.6] text-white/95" />
              <p className="text-[14px] font-semibold leading-snug md:text-[15px]">
                {title}
                <span className="block text-[13px] font-medium text-white/80">{text}</span>
              </p>
            </Link>
          ))}
        </div>
      </section>

      <section className="msr-gutter msr-section">
        <SectionTitle title="Shop by Need" to="/category/all" action="View All Categories →" />
        <div className="grid grid-cols-3 gap-3 sm:grid-cols-5 lg:grid-cols-9 lg:gap-4">
          {needs.map((n) => (
            <Link
              key={n.slug}
              to={n.to}
              className="group flex flex-col items-center text-center"
            >
              <span className="grid aspect-square w-full place-items-center rounded-2xl bg-[#eef0ff] text-[#0b1460] transition group-hover:bg-[#e4e6ff]">
                <NeedIcon slug={n.slug} />
              </span>
              <span className="mt-2.5 whitespace-pre-line text-[13px] font-semibold leading-snug text-[#1a1c3d]">
                {n.name}
              </span>
            </Link>
          ))}
          <Link to="/category/all" className="group flex flex-col items-center text-center">
            <span className="grid aspect-square w-full place-items-center rounded-2xl bg-[#eef0ff] text-[#0b1460] transition group-hover:bg-[#e4e6ff]">
              <NeedIcon slug="more" />
            </span>
            <span className="mt-2.5 text-[13px] font-semibold text-[#1a1c3d]">More</span>
          </Link>
        </div>
      </section>

      <section className="msr-gutter msr-section pb-4">
        <div className="overflow-hidden rounded-2xl hero-gradient p-8 text-white md:flex md:items-center md:justify-between md:px-12 md:py-11">
          <div>
            <h2 className="text-[1.75rem] font-extrabold tracking-tight md:text-[2rem]">Buying for your business?</h2>
            <p className="mt-2 max-w-lg text-[15px] leading-relaxed text-white/80">
              Get special prices on bulk FMCG orders with GST invoices and pan-India delivery.
            </p>
            <ul className="mt-4 grid gap-1.5 text-sm text-white/90 sm:grid-cols-2">
              {["Wholesale pricing", "Bulk discounts", "GST invoices", "Reliable supply"].map((t) => (
                <li key={t}>✓ {t}</li>
              ))}
            </ul>
          </div>
          <Link to="/bulk" className="mt-6 inline-flex shrink-0 rounded-full bg-msr-gold px-6 py-3 text-sm font-bold text-msr-navy hover:brightness-95 md:mt-0">
            Start bulk buying →
          </Link>
        </div>
      </section>
    </div>
  );
}

function ShieldLockIcon({ className }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <path d="M12 3l8 3.2v6.3c0 4.7-3.4 8.2-8 9.5-4.6-1.3-8-4.8-8-9.5V6.2z" />
      <rect x="9" y="11.2" width="6" height="4.6" rx="1" />
      <path d="M10.6 11.2V9.8a1.4 1.4 0 0 1 2.8 0v1.4" />
    </svg>
  );
}

function Promo({ title, text, cta, to, image, imageAlt, offer, outlined, arrow }) {
  return (
    <Link
      to={to}
      className="flex h-full min-h-[176px] items-center overflow-hidden rounded-2xl bg-[#eef0ff] pl-5 pr-2 transition hover:bg-[#e7e9ff] sm:pl-6"
    >
      <div className="min-w-0 flex-1 py-5">
        <h3 className="text-[15px] font-bold leading-snug text-[#0b1460]">{title}</h3>
        <p className="mt-1.5 text-[13px] leading-relaxed text-[#5b6280]">{text}</p>
        {offer ? (
          <p className="mt-2 text-[13px] text-[#0b1460]">
            Up to <span className="text-lg font-extrabold">{offer}</span>
          </p>
        ) : null}
        <span
          className={`mt-4 inline-flex items-center gap-1 rounded-md px-3.5 py-1.5 text-[13px] font-semibold ${
            outlined ? "border border-[#0b1460] bg-white text-[#0b1460]" : "bg-[#0b1460] text-white"
          }`}
        >
          {cta}
          {arrow ? <span aria-hidden>›</span> : null}
        </span>
      </div>
      <img src={image} alt={imageAlt} className="h-[132px] w-[42%] object-contain sm:h-[148px]" />
    </Link>
  );
}

function NeedIcon({ slug }) {
  const svg = {
    viewBox: "0 0 48 48",
    fill: "none",
    className: "h-[3.75rem] w-[3.75rem] sm:h-16 sm:w-16 lg:h-[4.25rem] lg:w-[4.25rem]",
    "aria-hidden": true,
  };
  const s = {
    stroke: "#0B1464",
    strokeWidth: "1.5",
    strokeLinecap: "round",
    strokeLinejoin: "round",
  };

  if (slug === "cooking") {
    return (
      <svg {...svg}>
        <path d="M18 8c0 3 2.2 3.4 2.2 6M24 6.5c0 3.6 2.4 4 2.4 7M30 8c0 3 2.2 3.4 2.2 6" {...s} />
        <path d="M15 18h18" {...s} />
        <path d="M17 16h14v2H17z" {...s} />
        <path d="M12 20h24v9c0 6.5-5.2 11-12 11s-12-4.5-12-11v-9z" {...s} />
        <path d="M12 23H7M36 23h5" {...s} />
      </svg>
    );
  }
  if (slug === "masala") {
    return (
      <svg {...svg}>
        <path d="M17 10h14l-1.4 6H18.4L17 10z" {...s} />
        <path d="M18.2 16h11.6v20.5c0 2.6-2.3 4-5.8 4s-5.8-1.4-5.8-4V16z" {...s} />
        <circle cx="21.5" cy="13" r="0.9" fill="#0B1464" />
        <circle cx="24" cy="13" r="0.9" fill="#0B1464" />
        <circle cx="26.5" cy="13" r="0.9" fill="#0B1464" />
        <path d="M21 23h6M21 28.5h6M21 34h6" {...s} />
      </svg>
    );
  }
  if (slug === "pulses") {
    return (
      <svg {...svg}>
        <path d="M16 16c0-5.5 16-5.5 16 0" {...s} />
        <path d="M16 16c1.8 3.2 13.2 3.2 16 0" {...s} />
        <path d="M16 16v16.5c0 5.2 3.6 8 8 8s8-2.8 8-8V16" {...s} />
        <path d="M22 12.5c.4-2 1.6-3.5 4-3.5" {...s} />
        <circle cx="21" cy="27" r="1.15" fill="#0B1464" />
        <circle cx="25.5" cy="29.5" r="1.15" fill="#0B1464" />
        <circle cx="27.5" cy="24.5" r="1.15" fill="#0B1464" />
      </svg>
    );
  }
  if (slug === "sauces") {
    return (
      <svg {...svg}>
        <path d="M20.5 8h7v5.5" {...s} />
        <path d="M20.5 13.5h7l3 5.5v17c0 2.6-2.4 4-7 4s-7-1.4-7-4v-17l3-5.5z" {...s} />
        <path d="M20.5 13.5h7" {...s} />
        <path d="M19.5 26h9" {...s} />
        <path d="M21.5 29.5h5" {...s} />
      </svg>
    );
  }
  if (slug === "biscuits") {
    return (
      <svg {...svg}>
        <rect x="13" y="8.5" width="22" height="31" rx="3" {...s} />
        <path d="M18 15h12M18 21h12M18 27h12M18 33h8" {...s} />
        <circle cx="32.5" cy="12" r="1.1" fill="#0B1464" />
      </svg>
    );
  }
  if (slug === "chocolates") {
    return (
      <svg {...svg}>
        <rect x="10" y="16" width="28" height="22" rx="3" {...s} />
        <path d="M10 27h28M19.5 16v22M28.5 16v22" {...s} />
        <path d="M15 11h5M29 11h5" {...s} />
        <path d="M17.5 11c0-2.4 2.5-3.5 4.5-2.2M30.5 11c0-2.4 2.5-3.5 4.5-2.2" {...s} />
      </svg>
    );
  }
  if (slug === "cleaning") {
    return (
      <svg {...svg}>
        <path d="M19 14h10l2.5 6v17c0 2.6-2.4 4.2-7.5 4.2s-7.5-1.6-7.5-4.2v-17L19 14z" {...s} />
        <path d="M21 8.5h8v5.5h-10V10c0-.8.7-1.5 2-1.5z" {...s} />
        <path d="M32.5 11c3.2 1.4 5.2 4.6 5.2 8" {...s} />
        <path d="M18.5 24h11" {...s} />
      </svg>
    );
  }
  if (slug === "tissues") {
    return (
      <svg {...svg}>
        <rect x="10.5" y="16" width="27" height="23" rx="3" {...s} />
        <path d="M18 16V11c0-2.2 12-2.2 12 0v5" {...s} />
        <path d="M21 11c1-3.2 6-4 8-1.2" {...s} />
        <path d="M16 23.5h16M16 29h16M16 34.5h10" {...s} />
      </svg>
    );
  }
  return (
    <svg {...svg}>
      <circle cx="24" cy="24" r="14.5" {...s} />
      <circle cx="16.5" cy="24" r="2.2" fill="#0B1464" />
      <circle cx="24" cy="24" r="2.2" fill="#0B1464" />
      <circle cx="31.5" cy="24" r="2.2" fill="#0B1464" />
    </svg>
  );
}
