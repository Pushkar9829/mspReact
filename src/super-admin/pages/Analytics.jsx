export default function Analytics() {
  const events = [
    { name: "ORDER_CREATED", count: 412 },
    { name: "TENANT_SUSPENDED", count: 1 },
    { name: "ACCOUNT_LOCKED", count: 4 },
    { name: "PRODUCT_PUBLISHED", count: 66 },
  ];
  return (
    <div>
      <h1 className="text-2xl font-extrabold">Platform analytics</h1>
      <div className="mt-5 grid gap-4 md:grid-cols-2">
        {events.map((e) => (
          <div key={e.name} className="rounded-2xl bg-white p-5 shadow-sm">
            <h2 className="font-bold">{e.name}</h2>
            <p className="mt-2 text-3xl font-extrabold text-msr-navy">{e.count}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
