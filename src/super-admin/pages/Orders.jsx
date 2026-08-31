export default function Orders() {
  const rows = [
    { id: "MSR10231", tenant: "Acme Wholesale", amount: "₹12,480", status: "Delivered" },
    { id: "MSR10218", tenant: "Metro FMCG", amount: "₹3,890", status: "Shipped" },
    { id: "MSR10204", tenant: "Acme Wholesale", amount: "₹8,720", status: "Confirmed" },
  ];
  return (
    <div>
      <h1 className="text-2xl font-extrabold">Platform orders</h1>
      <div className="mt-5 overflow-x-auto rounded-2xl bg-white shadow-sm">
        <table className="w-full text-left text-sm">
          <thead className="bg-msr-bg text-msr-muted">
            <tr>
              <th className="px-4 py-3">Order</th>
              <th>Tenant</th>
              <th>Amount</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id} className="border-t border-msr-border">
                <td className="px-4 py-3 font-semibold">{r.id}</td>
                <td>{r.tenant}</td>
                <td>{r.amount}</td>
                <td>{r.status}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
