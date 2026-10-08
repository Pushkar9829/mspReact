import { useCallback, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { BadgePercent, ListChecks, Plus, TicketPercent } from "lucide-react";
import { useCan } from "../../shared/context/AuthContext.jsx";
import { PermissionGate } from "../../shared/components/PermissionGate.jsx";
import { Button, PageHeader, TabPanel, Tabs } from "../../shared/ui/index.js";
import { OfferForm, OffersTab } from "./offers/OffersTab.jsx";
import { CouponForm, CouponsTab } from "./offers/CouponsTab.jsx";
import { PriceListForm, PriceListsTab } from "./offers/PriceListsTab.jsx";

const TABS = [
  { value: "offers", label: "Offers", icon: BadgePercent },
  { value: "coupons", label: "Coupons", icon: TicketPercent },
  { value: "price-lists", label: "Price lists", icon: ListChecks },
];

const CREATE = {
  offers: { label: "Create offer", perm: "offers.create", kind: "offer" },
  coupons: { label: "Create coupon", perm: "coupons.create", kind: "coupon" },
  "price-lists": { label: "Create price list", perm: "pricing.create", kind: "priceList" },
};

export default function Offers() {
  const can = useCan();
  const [params] = useSearchParams();
  const tab = TABS.some((t) => t.value === params.get("tab")) ? params.get("tab") : "offers";
  const create = CREATE[tab];
  // { kind: "offer" | "coupon" | "priceList", row: object | null, n: number } — `n` remounts the form per open.
  const [editor, setEditor] = useState(null);

  const open = useCallback((kind, row = null) => setEditor((e) => ({ kind, row, n: (e?.n || 0) + 1 })), []);
  const close = useCallback(() => setEditor(null), []);
  const onEditOffer = useCallback((row) => open("offer", row), [open]);
  const onEditCoupon = useCallback((row) => open("coupon", row), [open]);
  const onEditPriceList = useCallback((row) => open("priceList", row), [open]);
  const onCreateOffer = useCallback(() => open("offer"), [open]);
  const onCreateCoupon = useCallback(() => open("coupon"), [open]);
  const onCreatePriceList = useCallback(() => open("priceList"), [open]);

  return (
    <>
      <PageHeader
        title="Offers & coupons"
        description={
          can("pricing.approve")
            ? "Automatic offers, checkout coupons and B2B contract prices for your store."
            : "Automatic offers, checkout coupons and B2B contract prices. Offers and price lists you activate are sent for approval."
        }
        breadcrumbs={[{ label: "Store admin", to: "/tenant" }, { label: "Offers & coupons" }]}
        primaryAction={
          <PermissionGate perm={create.perm}>
            <Button variant="primary" leftIcon={Plus} onClick={() => open(create.kind)}>
              {create.label}
            </Button>
          </PermissionGate>
        }
      />

      <Tabs urlParam="tab" tabs={TABS} aria-label="Offers, coupons and price lists">
        <TabPanel value="offers">
          <OffersTab onCreate={onCreateOffer} onEdit={onEditOffer} />
        </TabPanel>
        <TabPanel value="coupons">
          <CouponsTab onCreate={onCreateCoupon} onEdit={onEditCoupon} />
        </TabPanel>
        <TabPanel value="price-lists">
          <PriceListsTab onCreate={onCreatePriceList} onEdit={onEditPriceList} />
        </TabPanel>
      </Tabs>

      {editor?.kind === "offer" ? <OfferForm key={editor.n} open offer={editor.row} onClose={close} /> : null}
      {editor?.kind === "coupon" ? <CouponForm key={editor.n} open coupon={editor.row} onClose={close} /> : null}
      {editor?.kind === "priceList" ? <PriceListForm key={editor.n} open priceList={editor.row} onClose={close} /> : null}
    </>
  );
}
