const rows = [
  { name: "Acme Wholesale", slug: "acme-wholesale", status: "active", city: "Delhi", vendors: 12 },
  { name: "Metro FMCG", slug: "metro-fmcg", status: "active", city: "Mumbai", vendors: 8 },
  { name: "South Supply Co", slug: "south-supply", status: "suspended", city: "Bengaluru", vendors: 3 },
];

export default function Tenants() {
  return (
    <div>
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-extrabold">Tenants</h1>
        <button type="button" className="rounded-xl bg-msr-navy px-4 py-2 text-sm font-semibold text-white">
          New tenant
        </button>
      </div>
      <div className="mt-5 overflow-x-auto rounded-2xl bg-white shadow-sm">
        <table className="w-full text-left text-sm">
          <thead className="bg-msr-bg text-msr-muted">
            <tr>
              <th className="px-4 py-3">Tenant</th>
              <th>Slug</th>
              <th>City</th>
              <th>Staff</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.slug} className="border-t border-msr-border">
                <td className="px-4 py-3 font-semibold">{r.name}</td>
                <td className="font-mono text-xs">{r.slug}</td>
                <td>{r.city}</td>
                <td>{r.vendors}</td>
                <td className={r.status === "active" ? "text-msr-success" : "text-msr-danger"}>{r.status}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
