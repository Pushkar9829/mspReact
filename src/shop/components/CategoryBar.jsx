import { useEffect, useState } from "react";
import { NavLink } from "react-router-dom";
import { useShopCatalog } from "../context/ShopCatalogContext.jsx";

const EXTRA = [
  { to: "/deals", label: "Deals" },
  { to: "/new", label: "New" },
  { to: "/brands", label: "Brands" },
  { to: "/bulk", label: "Bulk" },
];

export default function CategoryBar() {
  const { categories } = useShopCatalog();
  const [hidden, setHidden] = useState(false);

  useEffect(() => {
    let last = window.scrollY;
    function onScroll() {
      const y = window.scrollY;
      if (window.innerWidth >= 768) {
        setHidden(false);
        last = y;
        return;
      }
      setHidden(y > last && y > 80);
      last = y;
    }
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const links = [
    { to: "/category/all", label: "All" },
    ...categories.slice(0, 10).map((c) => ({ to: `/category/${c.slug}`, label: c.name })),
    ...EXTRA,
  ];

  return (
    <div
      className={`border-b border-msr-line bg-white transition-transform duration-200 ${
        hidden ? "-translate-y-full md:translate-y-0" : ""
      }`}
    >
      <nav className="msr-gutter flex gap-1 overflow-x-auto no-scrollbar py-0" aria-label="Shop categories">
        {links.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            className={({ isActive }) =>
              `relative shrink-0 px-3 py-2.5 text-[13px] font-semibold whitespace-nowrap transition-colors ${
                isActive ? "text-msr-primary" : "text-msr-ink/80 hover:text-msr-ink"
              }`
            }
          >
            {({ isActive }) => (
              <>
                {item.label}
                {isActive ? <span className="absolute inset-x-2 bottom-0 h-0.5 rounded-full bg-msr-primary" /> : null}
              </>
            )}
          </NavLink>
        ))}
      </nav>
    </div>
  );
}
