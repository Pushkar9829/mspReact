/**
 * Storefront home ("Mandi-modern"). Everything shown is live data: public settings (trust facts),
 * the category tree, server product searches (deals, case-pack slabs, new), stores and brands seen
 * in the catalogue, and — for signed-in buyers — their delivered orders (Buy again). No stock
 * photography, no invented numbers.
 */
import { BadgePercent, Boxes, Sparkles } from "lucide-react";
import { useDocumentTitle } from "../../shared/hooks/useDocumentTitle.js";
import { useProducts, useViewer } from "../hooks/index.js";
import { ProductRail } from "./discovery/Rail.jsx";
import { HeroBanners } from "./home/HeroBanners.jsx";
import { AccountCard, DeliveryCard } from "./home/HeroAside.jsx";
import { TrustRibbon } from "./home/HomeSections.jsx";
import { CategoryShowcase } from "./home/CategoryShowcase.jsx";
import { BuyAgain } from "./home/BuyAgain.jsx";
import { BrandsShowcase, BusinessBand, SellersShowcase } from "./home/HomeExtras.jsx";

const Q_DEALS = { tag: "deal" };
const Q_BULK = { bulk: true, sort: "discount" };
const Q_NEW = { tag: "new" };
const Q_SAMPLE = { facets: true };

/* ------------------------------------------------------------------ page */

export default function Home() {
  useDocumentTitle("Wholesale groceries & FMCG");
  const { signedIn, isBuyer, user } = useViewer();
  const deals = useProducts(Q_DEALS, { limit: 12 });
  const bulk = useProducts(Q_BULK, { limit: 12 });
  const fresh = useProducts(Q_NEW, { limit: 12 });
  const sample = useProducts(Q_SAMPLE, { limit: 1 }); // brand facets only

  return (
    <div className="msr-gutter grid grid-cols-[minmax(0,1fr)] gap-10 py-5 md:gap-12 md:py-6">
      <div className="grid min-w-0 grid-cols-[minmax(0,1fr)] gap-4">
        <div className="grid min-w-0 grid-cols-[minmax(0,1fr)] gap-4 lg:grid-cols-[minmax(0,1fr)_20rem] xl:grid-cols-[minmax(0,1fr)_22rem]">
          <HeroBanners deals={deals} bulk={bulk} fresh={fresh} signedIn={signedIn} />
          <div className="grid min-w-0 content-start gap-4 sm:grid-cols-2 lg:grid-cols-1">
            <DeliveryCard />
            <AccountCard signedIn={signedIn} isBuyer={isBuyer} user={user} />
          </div>
        </div>
        <TrustRibbon />
      </div>

      {signedIn ? <BuyAgain /> : null}

      <CategoryShowcase />
      <ProductRail title="Deals of the week" description="Limited-period prices from sellers — while stocks last" to="/deals" query={deals} icon={BadgePercent} />
      <ProductRail title="Case-pack savings" description="Prices drop as you buy more — each card shows its best case price" to="/bulk" query={bulk} bulk icon={Boxes} />
      <SellersShowcase />
      <ProductRail title="New launches" description="Just listed by sellers" to="/new" query={fresh} icon={Sparkles} />
      <BrandsShowcase sample={sample} />
      <BusinessBand signedIn={signedIn} />
    </div>
  );
}
