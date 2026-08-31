export default function SellerReports() {
  return (
    <div>
      <h1 className="text-2xl font-extrabold">Reports</h1>
      <div className="mt-5 grid gap-4 md:grid-cols-3">
        {["Sales by day", "Top SKUs", "Fill rate"].map((t) => (
          <div key={t} className="rounded-2xl bg-white p-5 shadow-sm">
            <h2 className="font-bold">{t}</h2>
            <p className="mt-2 text-sm text-msr-muted">CSV export and date filters are available from the live reports API.</p>
            <button type="button" className="mt-4 rounded-lg border border-msr-border px-3 py-2 text-sm font-semibold">
              Export CSV
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
