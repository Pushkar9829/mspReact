const rows = [
  { name: "Super Admin", scope: "platform", perms: "*" },
  { name: "Vendor Admin", scope: "tenant", perms: "catalog, inventory, orders" },
  { name: "Buyer", scope: "tenant", perms: "catalog.view, orders.create" },
];

export default function Roles() {
  return (
    <div>
      <h1 className="text-2xl font-extrabold">Roles & permissions</h1>
      <div className="mt-5 grid gap-4 md:grid-cols-3">
        {rows.map((r) => (
          <div key={r.name} className="rounded-2xl bg-white p-5 shadow-sm">
            <p className="text-xs uppercase tracking-wide text-msr-muted">{r.scope}</p>
            <h2 className="mt-1 font-bold">{r.name}</h2>
            <p className="mt-2 text-sm text-msr-muted">{r.perms}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
