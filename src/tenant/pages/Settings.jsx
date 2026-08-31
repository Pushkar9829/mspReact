export default function SellerSettings() {
  return (
    <div className="max-w-xl">
      <h1 className="text-2xl font-extrabold">Settings</h1>
      <form className="mt-5 space-y-4 rounded-2xl bg-white p-6 shadow-sm">
        <label className="block text-sm font-semibold">
          Store name
          <input defaultValue="Acme Wholesale" className="mt-1 w-full rounded-xl border border-msr-border px-4 py-3 font-normal" />
        </label>
        <label className="block text-sm font-semibold">
          GSTIN
          <input defaultValue="07AABCU9603R1ZM" className="mt-1 w-full rounded-xl border border-msr-border px-4 py-3 font-normal" />
        </label>
        <label className="block text-sm font-semibold">
          Support phone
          <input defaultValue="9999999999" className="mt-1 w-full rounded-xl border border-msr-border px-4 py-3 font-normal" />
        </label>
        <button type="button" className="rounded-xl bg-msr-navy px-5 py-3 font-bold text-white">
          Save changes
        </button>
      </form>
    </div>
  );
}
