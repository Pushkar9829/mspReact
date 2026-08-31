export default function Audit() {
  const rows = [
    { at: "31 Aug 13:12", actor: "admin@msp.local", action: "tenant.suspend", resource: "south-supply" },
    { at: "31 Aug 12:40", actor: "vendor@acme.local", action: "product.publish", resource: "tata-tea-premium" },
    { at: "31 Aug 11:02", actor: "buyer@acme.local", action: "order.create", resource: "MSR10231" },
  ];
  return (
    <div>
      <h1 className="text-2xl font-extrabold">Audit log</h1>
      <div className="mt-5 overflow-x-auto rounded-2xl bg-white shadow-sm">
        <table className="w-full text-left text-sm">
          <thead className="bg-msr-bg text-msr-muted">
            <tr>
              <th className="px-4 py-3">When</th>
              <th>Actor</th>
              <th>Action</th>
              <th>Resource</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.at + r.action} className="border-t border-msr-border">
                <td className="px-4 py-3">{r.at}</td>
                <td>{r.actor}</td>
                <td className="font-mono text-xs">{r.action}</td>
                <td>{r.resource}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
