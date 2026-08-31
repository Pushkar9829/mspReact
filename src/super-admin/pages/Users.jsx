const rows = [
  { name: "Platform Admin", email: "admin@msp.local", role: "super_admin", tenant: "—" },
  { name: "Acme Vendor", email: "vendor@acme.local", role: "vendor", tenant: "Acme Wholesale" },
  { name: "Demo Buyer", email: "buyer@acme.local", role: "buyer", tenant: "Acme Wholesale" },
];

export default function Users() {
  return (
    <div>
      <h1 className="text-2xl font-extrabold">Users</h1>
      <div className="mt-5 overflow-x-auto rounded-2xl bg-white shadow-sm">
        <table className="w-full text-left text-sm">
          <thead className="bg-msr-bg text-msr-muted">
            <tr>
              <th className="px-4 py-3">Name</th>
              <th>Email</th>
              <th>Role</th>
              <th>Tenant</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.email} className="border-t border-msr-border">
                <td className="px-4 py-3 font-semibold">{r.name}</td>
                <td>{r.email}</td>
                <td>{r.role}</td>
                <td>{r.tenant}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
