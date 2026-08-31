export default function SellerOffers() {
  const rows = [
    { code: "WELCOME10", type: "Coupon", value: "10%", status: "Live" },
    { code: "BULK5", type: "Slab", value: "5% above ₹5,000", status: "Live" },
    { code: "TEA12", type: "SKU offer", value: "12% on tea", status: "Scheduled" },
  ];
  return (
    <div>
      <h1 className="text-2xl font-extrabold">Offers</h1>
      <div className="mt-5 overflow-x-auto rounded-2xl bg-white shadow-sm">
        <table className="w-full text-left text-sm">
          <thead className="bg-msr-bg text-msr-muted">
            <tr>
              <th className="px-4 py-3">Code</th>
              <th>Type</th>
              <th>Value</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.code} className="border-t border-msr-border">
                <td className="px-4 py-3 font-semibold">{r.code}</td>
                <td>{r.type}</td>
                <td>{r.value}</td>
                <td>{r.status}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
