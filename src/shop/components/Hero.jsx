import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { ChevronLeft, ChevronRight } from "lucide-react";

const BANNERS = [
  {
    id: "fresh-finds",
    src: encodeURI("/ChatGPT Image Sep 2, 2026, 10_23_32 PM.png"),
    alt: "Your one-stop grocery store — fresh groceries and everyday essentials",
    to: "/category/staples",
  },
  {
    id: "grocery-general",
    src: encodeURI("/ChatGPT Image Sep 2, 2026, 10_26_06 PM.png"),
    alt: "Grocery and general store — wide range, best quality, fast delivery",
    to: "/category/all",
  },
  {
    id: "groceries-more",
    src: encodeURI("/ChatGPT Image Sep 2, 2026, 10_27_36 PM.png"),
    alt: "Groceries and more — fresh products, best quality, lowest prices",
    to: "/deals",
  },
  {
    id: "shop-fresh",
    src: encodeURI("/ChatGPT Image Sep 2, 2026, 10_29_07 PM.png"),
    alt: "Shop fresh, live better — groceries and daily essentials",
    to: "/new",
  },
];

export default function Hero({ className = "" }) {
  const [index, setIndex] = useState(0);
  const [hover, setHover] = useState(false);
  const [reduceMotion, setReduceMotion] = useState(false);

  useEffect(() => {
    const media = window.matchMedia("(prefers-reduced-motion: reduce)");
    const sync = () => setReduceMotion(media.matches);
    sync();
    media.addEventListener("change", sync);
    return () => media.removeEventListener("change", sync);
  }, []);

  const paused = hover || reduceMotion;

  useEffect(() => {
    if (paused) return undefined;
    const timer = setInterval(() => setIndex((i) => (i + 1) % BANNERS.length), 5000);
    return () => clearInterval(timer);
  }, [paused]);

  function go(step) {
    setIndex((i) => (i + step + BANNERS.length) % BANNERS.length);
  }

  return (
    <section
      className={`group relative isolate overflow-hidden rounded-2xl bg-msr-brand ${className}`}
      aria-roledescription="carousel"
      aria-label="Promotional banners"
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
    >
      <p className="sr-only" aria-live="polite">
        Slide {index + 1} of {BANNERS.length}
      </p>
      {BANNERS.map((banner, i) => (
        <Link
          key={banner.id}
          to={banner.to}
          className={`absolute inset-0 block transition-opacity duration-700 ease-out ${
            i === index ? "z-10 opacity-100" : "pointer-events-none z-0 opacity-0"
          }`}
          tabIndex={i === index ? 0 : -1}
          aria-hidden={i !== index}
        >
          <img src={banner.src} alt={banner.alt} className="h-full w-full object-cover object-center" />
        </Link>
      ))}

      <button
        type="button"
        onClick={() => go(-1)}
        className="absolute left-3 top-1/2 z-20 hidden h-10 w-10 -translate-y-1/2 place-items-center rounded-full bg-white/85 text-msr-ink opacity-0 shadow-lift backdrop-blur transition hover:bg-white group-hover:opacity-100 md:grid"
        aria-label="Previous banner"
      >
        <ChevronLeft className="h-5 w-5" />
      </button>
      <button
        type="button"
        onClick={() => go(1)}
        className="absolute right-3 top-1/2 z-20 hidden h-10 w-10 -translate-y-1/2 place-items-center rounded-full bg-white/85 text-msr-ink opacity-0 shadow-lift backdrop-blur transition hover:bg-white group-hover:opacity-100 md:grid"
        aria-label="Next banner"
      >
        <ChevronRight className="h-5 w-5" />
      </button>

      <div className="absolute inset-x-0 bottom-3 z-20 flex justify-center gap-1.5">
        {BANNERS.map((b, i) => (
          <button
            key={b.id}
            type="button"
            onClick={() => setIndex(i)}
            className={`h-1.5 rounded-full transition-all ${i === index ? "w-6 bg-white" : "w-1.5 bg-white/55 hover:bg-white/80"}`}
            aria-label={`Show banner ${i + 1}`}
            aria-current={i === index}
          />
        ))}
      </div>
    </section>
  );
}
