import { Status } from "./Dashboard.jsx";
import { inr } from "../../shared/lib/format.js";

const rows = [
  { id: "MSR10231", customer: "Retail Mart", items: 14, amount: 12480, status: "Delivered" },
  { id: "MSR10218", customer: "Kirana Plus", items: 6, amount: 3890, status: "Shipped" },
  { id: "MSR10204", customer: "City Foods", items: 9, amount: 8720, status: "Confirmed" },
  { id: "MSR10191", customer: "Daily Needs", items: 3, amount: 2140, status: "Pending" },
  { id: "MSR10170", customer: "Metro Mart", items: 11, amount: 6400, status: "Cancelled" },
];

export default function SellerOrders() {
  return (
    <div>
      <h1 className="text-2xl font-extrabold">Orders</h1>
      <div className="mt-5 overflow-x-auto rounded-2xl bg-white shadow-sm">
        <table className="w-full text-left text-sm">
          <thead className="bg-msr-bg text-msr-muted">
            <tr>
              <th className="px-4 py-3">Order</th>
              <th>Customer</th>
              <th>Items</th>
              <th>Amount</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id} className="border-t border-msr-border">
                <td className="px-4 py-3 font-semibold">{r.id}</td>
                <td>{r.customer}</td>
                <td>{r.items}</td>
                <td>{inr(r.amount)}</td>
                <td>
                  <Status status={r.status} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
