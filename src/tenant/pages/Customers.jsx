export default function SellerCustomers() {
  const rows = [
    { name: "Retail Mart", city: "Delhi", orders: 42, spend: "₹1.8 L" },
    { name: "Kirana Plus", city: "Mumbai", orders: 28, spend: "₹96,400" },
    { name: "City Foods", city: "Pune", orders: 19, spend: "₹64,200" },
    { name: "Daily Needs", city: "Bengaluru", orders: 11, spend: "₹22,800" },
  ];
  return (
    <div>
      <h1 className="text-2xl font-extrabold">Customers</h1>
      <div className="mt-5 overflow-x-auto rounded-2xl bg-white shadow-sm">
        <table className="w-full text-left text-sm">
          <thead className="bg-msr-bg text-msr-muted">
            <tr>
              <th className="px-4 py-3">Retailer</th>
              <th>City</th>
              <th>Orders</th>
              <th>Lifetime spend</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.name} className="border-t border-msr-border">
                <td className="px-4 py-3 font-semibold">{r.name}</td>
                <td>{r.city}</td>
                <td>{r.orders}</td>
                <td>{r.spend}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
