export default function Legal() {
  return (
    <div className="msr-gutter py-10">
      <h1 className="text-3xl font-extrabold">Legal</h1>
      <div className="mt-6 space-y-4 text-sm leading-6 text-msr-muted">
        <section className="rounded-2xl bg-white p-6 shadow-sm">
          <h2 className="font-bold text-msr-text">Privacy policy</h2>
          <p className="mt-2">We store only what is needed to fulfil orders, authenticate users and improve the marketplace experience.</p>
        </section>
        <section className="rounded-2xl bg-white p-6 shadow-sm">
          <h2 className="font-bold text-msr-text">Terms & conditions</h2>
          <p className="mt-2">By using MS₹ you agree to accurate listings, lawful use and our seller/buyer marketplace rules.</p>
        </section>
        <section className="rounded-2xl bg-white p-6 shadow-sm">
          <h2 className="font-bold text-msr-text">Seller terms</h2>
          <p className="mt-2">Sellers must keep inventory truthful, honour GST invoices and dispatch within committed SLAs.</p>
        </section>
      </div>
    </div>
  );
}
