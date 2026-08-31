export default function SellerAnalytics() {
  const events = [
    { name: "ORDER_CREATED", count: 86, importance: "high" },
    { name: "ORDER_CONFIRMED", count: 71, importance: "high" },
    { name: "LOW_STOCK", count: 9, importance: "critical" },
    { name: "ACCOUNT_LOGIN", count: 140, importance: "low" },
  ];
  return (
    <div>
      <h1 className="text-2xl font-extrabold">Analytics</h1>
      <div className="mt-5 grid gap-4 md:grid-cols-2">
        {events.map((e) => (
          <div key={e.name} className="rounded-2xl bg-white p-5 shadow-sm">
            <p className="text-xs uppercase tracking-wide text-msr-muted">{e.importance}</p>
            <h2 className="mt-1 font-bold">{e.name}</h2>
            <p className="mt-2 text-3xl font-extrabold text-msr-navy">{e.count}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
