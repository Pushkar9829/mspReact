import { useEffect } from "react";
import { Link, useLocation } from "react-router-dom";

export default function Help() {
  const { hash } = useLocation();

  useEffect(() => {
    if (!hash) return;
    document.querySelector(hash)?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, [hash]);

  return (
    <div className="msr-gutter py-10">
      <h1 className="text-3xl font-extrabold">Help Centre</h1>
      <div className="mt-4 flex flex-wrap gap-3 text-sm font-semibold text-msr-purple">
        <a href="#shipping">Shipping</a>
        <a href="#returns">Returns</a>
        <a href="#contact">Contact</a>
      </div>
      <section id="shipping" className="mt-8 scroll-mt-24 rounded-2xl bg-white p-6 shadow-sm">
        <h2 className="font-bold">Shipping</h2>
        <p className="mt-2 text-sm text-msr-muted">
          Orders in metro pincodes typically arrive in 1–3 days. Bulk orders may ship from the nearest warehouse.
        </p>
      </section>
      <section id="returns" className="mt-4 scroll-mt-24 rounded-2xl bg-white p-6 shadow-sm">
        <h2 className="font-bold">Returns & refunds</h2>
        <p className="mt-2 text-sm text-msr-muted">
          Unused, sealed packs can be returned within 7 days. Refunds are processed to the original payment method.
        </p>
      </section>
      <section id="contact" className="mt-4 scroll-mt-24 rounded-2xl bg-white p-6 shadow-sm">
        <h2 className="font-bold">Contact</h2>
        <p className="mt-2 text-sm text-msr-muted">
          <a href="mailto:support@msrmarket.local" className="text-msr-purple hover:underline">
            support@msrmarket.local
          </a>{" "}
          · Mon–Sat, 9am–7pm
        </p>
        <Link to="/category/all" className="mt-4 inline-block text-sm font-semibold text-msr-purple">
          Continue shopping →
        </Link>
      </section>
    </div>
  );
}
