export default function Settings() {
  return (
    <div className="max-w-xl">
      <h1 className="text-2xl font-extrabold">Platform settings</h1>
      <form className="mt-5 space-y-4 rounded-2xl bg-white p-6 shadow-sm">
        <label className="block text-sm font-semibold">
          Marketplace name
          <input defaultValue="MS₹ Market Server Price" className="mt-1 w-full rounded-xl border border-msr-border px-4 py-3 font-normal" />
        </label>
        <label className="block text-sm font-semibold">
          Support email
          <input defaultValue="support@msrmarket.local" className="mt-1 w-full rounded-xl border border-msr-border px-4 py-3 font-normal" />
        </label>
        <label className="block text-sm font-semibold">
          Default reservation (minutes)
          <input defaultValue="15" className="mt-1 w-full rounded-xl border border-msr-border px-4 py-3 font-normal" />
        </label>
        <button type="button" className="rounded-xl bg-msr-navy px-5 py-3 font-bold text-white">
          Save
        </button>
      </form>
    </div>
  );
}
