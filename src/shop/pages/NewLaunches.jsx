/**
 * /new — products sellers tagged "new" (server search, tag=new). Sort and filters live in the URL;
 * pick "Newest" in the sort menu for the latest additions first.
 */
import { BellRing, Package, Sparkles } from "lucide-react";
import { Button } from "../components/ui/index.js";
import { ProductListing } from "./discovery/ProductListing.jsx";
import { ListingHero } from "./discovery/ListingHero.jsx";

const FIXED = { tag: "new" };

const INTRO = (
  <ListingHero
    tone="primary"
    icon={Sparkles}
    heading="Fresh on the shelves"
    points={[
      { icon: Package, text: "Pack sizes and bulk slabs are on each product" },
      { icon: BellRing, text: "Out of stock? Ask to be told when it’s back" },
    ]}
    actions={
      <Button to="/deals" variant="secondary" size="sm">
        See today’s deals
      </Button>
    }
  />
);

export default function NewLaunches() {
  return (
    <ProductListing
      fixed={FIXED}
      hide={["category"]}
      title="New launches"
      kicker="Just added"
      description="Products sellers have recently added to the marketplace."
      breadcrumbs={[{ label: "Home", to: "/" }, { label: "New launches" }]}
      intro={INTRO}
      emptyTitle="No new launches right now"
      emptyDescription="Sellers add new products every week. Browse everything in the meantime."
    />
  );
}
