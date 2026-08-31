const stats = [
  { label: "Active tenants", value: "1" },
  { label: "Users", value: "6" },
  { label: "Published products", value: "12" },
  { label: "Open orders", value: "5+" },
];

export default function SuperAdminOverview() {
  return (
    <div>
      <h1 className="text-2xl font-extrabold">Platform overview</h1>
      <p className="mt-1 text-sm text-msr-muted">MS₹ Wholesale Marketplace console</p>
      <div className="mt-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {stats.map((s) => (
          <div key={s.label} className="rounded-2xl bg-white p-5 shadow-sm">
            <p className="text-sm text-msr-muted">{s.label}</p>
            <p className="mt-2 text-2xl font-extrabold">{s.value}</p>
          </div>
        ))}
      </div>
      <div className="mt-6 rounded-2xl bg-white p-5 shadow-sm">
        <h2 className="font-bold">Demo accounts</h2>
        <ul className="mt-3 grid gap-2 text-sm text-msr-muted">
          <li>Super admin · admin@msp.local / ChangeMe123!</li>
          <li>Tenant · vendor@acme.local / Vendor123!</li>
          <li>Buyer · buyer@acme.local / Buyer123!</li>
        </ul>
      </div>
    </div>
  );
}
