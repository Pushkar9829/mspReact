export default function Cms() {
  const pages = [
    { title: "Home", slug: "home", status: "published" },
    { title: "Bulk buy", slug: "bulk-buy", status: "review" },
    { title: "Help", slug: "help", status: "draft" },
  ];
  return (
    <div>
      <h1 className="text-2xl font-extrabold">CMS</h1>
      <div className="mt-5 grid gap-3">
        {pages.map((p) => (
          <div key={p.slug} className="flex items-center justify-between rounded-2xl bg-white p-4 shadow-sm">
            <div>
              <p className="font-bold">{p.title}</p>
              <p className="text-xs text-msr-muted">/{p.slug}</p>
            </div>
            <span className="text-sm font-semibold capitalize">{p.status}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
