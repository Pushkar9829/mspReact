import { useEffect, useState } from "react";
import { Link } from "react-router-dom";

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

export default function Hero() {
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

  return (
    <section
      className="hero-banners relative w-full overflow-hidden"
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
    </section>
  );
}
