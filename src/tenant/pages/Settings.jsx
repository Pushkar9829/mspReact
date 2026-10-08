import { useCallback, useMemo, useState } from "react";
import { Bell, CreditCard, Palette, Receipt, Store, Truck } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { api } from "../../shared/api/index.js";
import { keys } from "../../shared/api/keys.js";
import { useCan } from "../../shared/context/AuthContext.jsx";
import { useUnsavedChangesGuard } from "../../shared/hooks/useUnsavedChangesGuard.js";
import { Alert, ErrorState, PageHeader, PageSkeleton, TabPanel, Tabs, UnsavedChangesDialog } from "../../shared/ui/index.js";
import { SettingsContext } from "./settings/shared.jsx";
import { StoreProfileSection } from "./settings/StoreProfileSection.jsx";
import { BrandingSection } from "./settings/BrandingSection.jsx";
import { TaxOrdersSection } from "./settings/TaxOrdersSection.jsx";
import { PartnersSection, PickupSection, ZonesSection } from "./settings/DeliverySections.jsx";
import { FeesSection } from "./settings/FeesSection.jsx";
import { PersonalNotificationsSection, StoreNotificationsSection } from "./settings/NotificationsSections.jsx";

const TABS = [
  { value: "profile", label: "Store profile", icon: Store, sections: ["profile"] },
  { value: "branding", label: "Branding", icon: Palette, sections: ["branding"] },
  { value: "tax", label: "Tax & orders", icon: Receipt, sections: ["tax"] },
  { value: "delivery", label: "Delivery", icon: Truck, sections: ["pickup", "zones", "partners"] },
  { value: "fees", label: "Fees & payments", icon: CreditCard, sections: ["fees"] },
  { value: "notifications", label: "Notifications", icon: Bell, sections: ["store-notifications", "personal-notifications"] },
];

const BREADCRUMBS = [{ label: "Store admin", to: "/tenant" }, { label: "Settings" }];
const SETTINGS_QUERY = {};
const COMMERCE_KEY = keys.settings.custom("commerce");

export default function Settings() {
  const can = useCan();
  const canEdit = can("settings.edit");
  const tenantQ = useQuery({ queryKey: keys.myTenant, queryFn: () => api.getMyTenant() });
  const settingsQ = useQuery({ queryKey: keys.settings.list(SETTINGS_QUERY), queryFn: () => api.listSettings(SETTINGS_QUERY) });
  const commerceQ = useQuery({ queryKey: COMMERCE_KEY, queryFn: () => api.getCommerce() });

  const [dirtyMap, setDirtyMap] = useState({});
  const reportDirty = useCallback((id, dirty) => {
    setDirtyMap((m) => (Boolean(m[id]) === Boolean(dirty) ? m : { ...m, [id]: Boolean(dirty) }));
  }, []);
  const anyDirty = Object.values(dirtyMap).some(Boolean);
  const blocker = useUnsavedChangesGuard(anyDirty);

  const settings = useMemo(() => {
    const rows = Array.isArray(settingsQ.data) ? settingsQ.data : settingsQ.data?.data;
    if (!Array.isArray(rows)) return null;
    return Object.fromEntries(rows.map((r) => [r.key, r.value]));
  }, [settingsQ.data]);

  const ctx = useMemo(
    () => ({ canEdit, tenant: tenantQ.data, settings, commerce: commerceQ.data, commerceQuery: commerceQ, reportDirty }),
    [canEdit, tenantQ.data, settings, commerceQ, reportDirty]
  );

  const header = (
    <PageHeader
      title="Settings"
      description="Store profile, branding, delivery, fees and notifications. Each section saves on its own."
      breadcrumbs={BREADCRUMBS}
    />
  );

  if (tenantQ.isPending) {
    return (
      <>
        {header}
        <PageSkeleton />
      </>
    );
  }
  if (tenantQ.error) {
    return (
      <>
        {header}
        <ErrorState error={tenantQ.error} onRetry={tenantQ.refetch} title="Couldn’t load your store settings" />
      </>
    );
  }

  const tabs = TABS.map((t) => ({
    value: t.value,
    icon: t.icon,
    label: (
      <>
        {t.label}
        {t.sections.some((s) => dirtyMap[s]) ? <span aria-label="unsaved changes" className="size-1.5 rounded-full bg-warning" /> : null}
      </>
    ),
  }));

  // Panels stay mounted so unsaved edits survive switching tabs.
  const panel = "data-[state=inactive]:hidden";

  return (
    <SettingsContext.Provider value={ctx}>
      {header}
      <div className="grid gap-4">
        {!canEdit ? (
          <Alert tone="info" title="View only — requires settings.edit">
            You can see your store’s settings but not change them. Your personal notification preferences are still editable.
          </Alert>
        ) : null}
        {settingsQ.error ? (
          <Alert tone="warning" title="Couldn’t tell which values your store overrides">
            {settingsQ.error.message}. Values shown are still the ones in effect.
          </Alert>
        ) : null}
        <Tabs urlParam="tab" tabs={tabs} aria-label="Settings sections">
          <TabPanel value="profile" forceMount className={panel}>
            <StoreProfileSection />
          </TabPanel>
          <TabPanel value="branding" forceMount className={panel}>
            <BrandingSection />
          </TabPanel>
          <TabPanel value="tax" forceMount className={panel}>
            <TaxOrdersSection />
          </TabPanel>
          <TabPanel value="delivery" forceMount className={panel}>
            <div className="grid gap-6">
              <PickupSection />
              <ZonesSection />
              <PartnersSection />
            </div>
          </TabPanel>
          <TabPanel value="fees" forceMount className={panel}>
            <FeesSection />
          </TabPanel>
          <TabPanel value="notifications" forceMount className={panel}>
            <div className="grid gap-6">
              <StoreNotificationsSection />
              <PersonalNotificationsSection />
            </div>
          </TabPanel>
        </Tabs>
      </div>
      <UnsavedChangesDialog blocker={blocker} />
    </SettingsContext.Provider>
  );
}
