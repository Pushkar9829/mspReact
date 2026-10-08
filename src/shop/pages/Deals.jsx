/**
 * /deals — products the sellers tagged as deals (server search, tag=deal), filters in the URL.
 * A saffron strip under the header explains what a deal is; the live product count is in the header.
 */
import { Layers, Percent, ReceiptText, RefreshCw, Ticket } from "lucide-react";
import { Button } from "../components/ui/index.js";
import { ProductListing } from "./discovery/ProductListing.jsx";
import { ListingHero } from "./discovery/ListingHero.jsx";

const FIXED = { tag: "deal" };

const INTRO = (
  <ListingHero
    tone="saffron"
    icon={Percent}
    heading="Limited-period prices, set by sellers"
    points={[
      { icon: ReceiptText, text: "The price you see is what you pay, incl. GST" },
      { icon: RefreshCw, text: "Prices and stock update live" },
    ]}
    actions={
      <>
        <Button to="/account/coupons" variant="secondary" size="sm" leftIcon={Ticket}>
          Coupons
        </Button>
        <Button to="/bulk" variant="secondary" size="sm" leftIcon={Layers}>
          Bulk prices
        </Button>
      </>
    }
  />
);

export default function Deals() {
  return (
    <ProductListing
      fixed={FIXED}
      hide={["category"]}
      title="Deals"
      kicker="Today on the marketplace"
      description="Deal prices run for a limited period and can end without notice. Bulk slabs on a product can bring the per-unit price lower still."
      breadcrumbs={[{ label: "Home", to: "/" }, { label: "Deals" }]}
      intro={INTRO}
      emptyTitle="No deals running right now"
      emptyDescription="Sellers post new deals often. Check bulk prices meanwhile — they’re usually the best per-unit rates."
    />
  );
}
