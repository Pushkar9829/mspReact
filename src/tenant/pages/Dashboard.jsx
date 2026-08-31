import { ArrowDownRight, ArrowUpRight } from "lucide-react";
import { inr } from "../../shared/lib/format.js";

const stats = [
  { label: "Total Orders", value: "1,245", change: "+12.4%", up: true },
  { label: "Total Revenue", value: "₹4.8 L", change: "+8.1%", up: true },
  { label: "Total Products", value: "320", change: "+4.0%", up: true },
  { label: "Total Customers", value: "845", change: "-1.2%", up: false },
];

const orders = [
  { id: "MSR10231", customer: "Retail Mart", amount: 12480, status: "Delivered", date: "31 Aug" },
  { id: "MSR10218", customer: "Kirana Plus", amount: 3890, status: "Shipped", date: "30 Aug" },
  { id: "MSR10204", customer: "City Foods", amount: 8720, status: "Confirmed", date: "30 Aug" },
  { id: "MSR10191", customer: "Daily Needs", amount: 2140, status: "Pending", date: "29 Aug" },
];

export default function Dashboard() {
  const points = [40, 55, 48, 70, 64, 88, 76, 95, 82, 110, 98, 120];
  const max = Math.max(...points);
  const path = points
    .map((y, i) => `${i === 0 ? "M" : "L"} ${(i / (points.length - 1)) * 320} ${120 - (y / max) * 100}`)
    .join(" ");

  return (
    <div>
      <h1 className="text-2xl font-extrabold">Dashboard</h1>
      <div className="mt-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {stats.map((s) => (
          <div key={s.label} className="rounded-2xl bg-white p-5 shadow-sm">
            <p className="text-sm text-msr-muted">{s.label}</p>
            <p className="mt-2 text-2xl font-extrabold">{s.value}</p>
            <p className={`mt-2 inline-flex items-center gap-1 text-xs font-semibold ${s.up ? "text-msr-success" : "text-msr-danger"}`}>
              {s.up ? <ArrowUpRight className="h-3 w-3" /> : <ArrowDownRight className="h-3 w-3" />}
              {s.change} vs last month
            </p>
          </div>
        ))}
      </div>
      <div className="mt-6 grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
        <div className="rounded-2xl bg-white p-5 shadow-sm">
          <h2 className="font-bold">Recent Orders</h2>
          <table className="mt-3 w-full text-left text-sm">
            <thead className="text-msr-muted">
              <tr>
                <th className="py-2">Order ID</th>
                <th>Customer</th>
                <th>Amount</th>
                <th>Status</th>
                <th>Date</th>
              </tr>
            </thead>
            <tbody>
              {orders.map((o) => (
                <tr key={o.id} className="border-t border-msr-border">
                  <td className="py-3 font-semibold">{o.id}</td>
                  <td>{o.customer}</td>
                  <td>{inr(o.amount)}</td>
                  <td>
                    <Status status={o.status} />
                  </td>
                  <td className="text-msr-muted">{o.date}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="rounded-2xl bg-white p-5 shadow-sm">
          <h2 className="font-bold">Sales Overview</h2>
          <svg viewBox="0 0 320 140" className="mt-4 w-full">
            <path d={path} fill="none" stroke="#4B46FF" strokeWidth="3" />
            {points.map((y, i) => (
              <circle key={i} cx={(i / (points.length - 1)) * 320} cy={120 - (y / max) * 100} r="3.5" fill="#080A3D" />
            ))}
          </svg>
          <p className="text-xs text-msr-muted">Last 12 weeks · GMV trend</p>
        </div>
      </div>
    </div>
  );
}

export function Status({ status }) {
  const map = {
    Delivered: "bg-green-50 text-msr-success",
    Shipped: "bg-indigo-50 text-msr-purple",
    Confirmed: "bg-sky-50 text-sky-700",
    Pending: "bg-amber-50 text-msr-warning",
    Cancelled: "bg-red-50 text-msr-danger",
  };
  return <span className={`rounded-full px-2 py-0.5 text-xs font-bold ${map[status] || "bg-msr-bg"}`}>{status}</span>;
}
