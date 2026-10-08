import { useState } from "react";
import { useSearchParams } from "react-router-dom";
import { Download, Plus, SlidersHorizontal } from "lucide-react";
import { api, describeExport } from "../../shared/api/index.js";
import { useCan } from "../../shared/context/AuthContext.jsx";
import { PermissionGate } from "../../shared/components/PermissionGate.jsx";
import { Button, PageHeader, TabPanel, Tabs, Tooltip, toast } from "../../shared/ui/index.js";
import { PREFIX } from "./inventory/lib.js";
import { StockTab } from "./inventory/StockTab.jsx";
import { TransactionsTab } from "./inventory/TransactionsTab.jsx";
import { ReservationsTab } from "./inventory/ReservationsTab.jsx";
import { WarehouseDialog, WarehousesTab } from "./inventory/WarehousesTab.jsx";
import { AdjustDialog } from "./inventory/StockDialogs.jsx";

const EXPORT_NOTE = "Exports up to 1,000 stock rows matching the Stock tab’s search and filters (warehouse, variant, low stock). Archived rows are excluded.";

export default function Inventory() {
  const can = useCan();
  const [params, setParams] = useSearchParams();
  const tab = params.get("tab") || "stock";
  const [exporting, setExporting] = useState(false);
  const [adjustOpen, setAdjustOpen] = useState(false);
  const [whDialog, setWhDialog] = useState({ open: false, warehouse: null });

  const tabs = [
    { value: "stock", label: "Stock" },
    { value: "transactions", label: "Transactions" },
    { value: "reservations", label: "Reservations" },
    ...(can("warehouses.view") ? [{ value: "warehouses", label: "Warehouses" }] : []),
  ];

  /** Jump to another tab with that table's filters replaced (push, so Back returns here). */
  function goTo(nextTab, prefix, filters) {
    setParams((prev) => {
      const p = new URLSearchParams(prev);
      if (nextTab === "stock") p.delete("tab");
      else p.set("tab", nextTab);
      [...p.keys()].filter((k) => prefix && k.startsWith(prefix)).forEach((k) => p.delete(k));
      Object.entries(filters).forEach(([k, v]) => (v ? p.set(`${prefix}${k}`, String(v)) : p.delete(`${prefix}${k}`)));
      p.delete(`${prefix}page`);
      return p;
    });
  }

  async function exportCsv() {
    setExporting(true);
    try {
      const query = {};
      ["warehouseId", "variantId", "lowStock", "q"].forEach((k) => {
        const v = params.get(`${PREFIX.stock}${k}`);
        if (v) query[k] = v;
      });
      const res = await api.exportReport("inventory", query);
      const info = describeExport(res, "Inventory export");
      (info.truncated ? toast.warning : toast.success)(info.title, { description: info.description, duration: info.truncated ? 10_000 : undefined });
    } catch (err) {
      toast.error(err?.message || "Export failed", { description: err?.requestId ? `Reference: ${err.requestId}` : undefined });
    } finally {
      setExporting(false);
    }
  }

  const exportButton = can("reports.export") ? (
    <div className="flex items-center gap-2">
      <Tooltip content={EXPORT_NOTE}>
        <Button leftIcon={Download} onClick={exportCsv} loading={exporting} aria-describedby="inventory-export-note">
          Export
        </Button>
      </Tooltip>
      <span id="inventory-export-note" className="hidden max-w-52 text-ui-2xs leading-tight text-fg-subtle lg:block">
        Uses the stock filters · max 1,000 rows
      </span>
    </div>
  ) : null;

  const primary =
    tab === "warehouses" ? (
      <PermissionGate perm="warehouses.create">
        <Button variant="primary" leftIcon={Plus} onClick={() => setWhDialog({ open: true, warehouse: null })}>
          New warehouse
        </Button>
      </PermissionGate>
    ) : (
      <PermissionGate perm="inventory.adjust">
        <Button variant="primary" leftIcon={SlidersHorizontal} onClick={() => setAdjustOpen(true)}>
          Adjust stock
        </Button>
      </PermissionGate>
    );

  return (
    <>
      <PageHeader
        title="Inventory"
        description="Stock per product variant and warehouse, every movement, and the units held for carts and orders."
        breadcrumbs={[{ label: "Store admin", to: "/tenant" }, { label: "Inventory" }]}
        secondaryActions={exportButton}
        primaryAction={primary}
      />
      <Tabs urlParam="tab" tabs={tabs} aria-label="Inventory sections">
        <TabPanel value="stock">
          <StockTab onViewHistory={({ variantId, warehouseId }) => goTo("transactions", PREFIX.tx, { variantId, warehouseId })} />
        </TabPanel>
        <TabPanel value="transactions">
          <TransactionsTab />
        </TabPanel>
        <TabPanel value="reservations">
          <ReservationsTab onShowStock={(variantId) => goTo("stock", PREFIX.stock, { variantId, warehouseId: "", lowStock: "", q: "" })} />
        </TabPanel>
        {can("warehouses.view") ? (
          <TabPanel value="warehouses">
            <WarehousesTab onEdit={(w) => setWhDialog({ open: true, warehouse: w })} onCreate={() => setWhDialog({ open: true, warehouse: null })} />
          </TabPanel>
        ) : null}
      </Tabs>
      <AdjustDialog open={adjustOpen} onOpenChange={setAdjustOpen} row={null} />
      <WarehouseDialog open={whDialog.open} onOpenChange={(open) => setWhDialog((d) => ({ ...d, open }))} warehouse={whDialog.warehouse} />
    </>
  );
}
