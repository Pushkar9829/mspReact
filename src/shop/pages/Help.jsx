import { useEffect } from "react";
import { Link, useLocation } from "react-router-dom";
import { HelpCircle, Mail, Truck } from "lucide-react";
import { AccountCard, AccountHead } from "../components/accountUi.jsx";

const TOPICS = [
  {
    id: "shipping",
    title: "Shipping",
    text: "Orders in metro pincodes typically arrive in 1–3 days. Bulk orders may ship from the nearest warehouse.",
  },
  {
    id: "returns",
    title: "Returns & refunds",
    text: "Unused, sealed packs can be returned within 7 days. Refunds go back to the original payment method.",
  },
  {
    id: "genuine",
    title: "Genuine products",
    text: "We list sealed packs from known FMCG brands. Check the manufacturer on each product page if you need the source.",
  },
  {
    id: "payments",
    title: "Payments",
    text: "Checkout accepts UPI, cards and net banking. Refunds go back to the original payment method.",
  },
];

export default function Help() {
  const { hash, pathname } = useLocation();
  const nested = pathname.startsWith("/account");

  useEffect(() => {
    if (!hash) return;
    document.querySelector(hash)?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, [hash]);

  const body = (
    <div>
      <AccountHead
        kicker={nested ? "My account" : "Support"}
        title="Help"
        subtitle="Shipping, returns, payments and how to reach us."
      />

      <div className="mt-5 flex flex-wrap gap-2">
        {TOPICS.map((t) => (
          <a
            key={t.id}
            href={`#${t.id}`}
            className="rounded-full border border-[#ece6d4] bg-white px-3 py-1.5 text-[12px] font-bold text-msr-navy hover:border-msr-gold"
          >
            {t.title}
          </a>
        ))}
        <a
          href="#contact"
          className="rounded-full border border-[#ece6d4] bg-white px-3 py-1.5 text-[12px] font-bold text-msr-navy hover:border-msr-gold"
        >
          Contact
        </a>
      </div>

      <div className="mt-6 overflow-hidden rounded-2xl bg-msr-navy p-5 text-white">
        <div className="flex items-start gap-3">
          <span className="grid h-10 w-10 place-items-center rounded-xl bg-msr-gold text-msr-navy">
            <Truck className="h-5 w-5" />
          </span>
          <div>
            <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-msr-gold">Need a hand?</p>
            <p className="mt-1 text-sm leading-relaxed text-white/75">
              Most orders ship in 1–3 days in metro cities. Jump to a topic below or write to support.
            </p>
          </div>
        </div>
      </div>

      <div className="mt-4 grid gap-3">
        {TOPICS.map((t) => (
          <section key={t.id} id={t.id} className="scroll-mt-24">
            <AccountCard>
              <div className="flex items-center gap-2">
                <HelpCircle className="h-4 w-4 text-[#8a6a12]" />
                <h2 className="font-bold text-msr-navy">{t.title}</h2>
              </div>
              <p className="mt-2 text-sm leading-relaxed text-msr-muted">{t.text}</p>
            </AccountCard>
          </section>
        ))}
        <section id="contact" className="scroll-mt-24">
          <AccountCard>
            <div className="flex items-center gap-2">
              <Mail className="h-4 w-4 text-[#8a6a12]" />
              <h2 className="font-bold text-msr-navy">Contact</h2>
            </div>
            <p className="mt-2 text-sm text-msr-muted">
              <a href="mailto:support@msrmarket.local" className="font-semibold text-msr-navy hover:underline">
                support@msrmarket.local
              </a>{" "}
              · Mon–Sat, 9am–7pm
            </p>
            <Link to="/category/all" className="mt-4 inline-block text-sm font-bold text-msr-navy">
              Continue shopping →
            </Link>
          </AccountCard>
        </section>
      </div>
    </div>
  );

  if (nested) return body;
  return <div className="msr-gutter py-8 md:py-10">{body}</div>;
}
