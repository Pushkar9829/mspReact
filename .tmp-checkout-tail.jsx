  const steps = [
    { id: "address", label: "Address", done: Boolean(selected) },
    ...(hasDelivery && partnerChoice && partners.length ? [{ id: "partner", label: "Delivery", done: Boolean(partnerId || preview?.deliveryPartner?.id) }] : []),
    { id: "payment", label: "Payment", done: Boolean(pay) && (pay !== "purchase_order" || Boolean(poNumber.trim())) },
    { id: "review", label: "Place order", done: false },
  ];
  let stepNo = 0;

  return (
    <div className="msr-gutter pb-40 pt-6 md:pb-12 md:pt-8">
      <header className="mb-6">
        <Link to="/cart" className="inline-flex items-center gap-1.5 text-[12.5px] font-semibold text-msr-muted transition hover:text-msr-primary">
          <ArrowLeft className="h-3.5 w-3.5" />
          Back to cart
        </Link>
        <div className="mt-3 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <h1 className="text-2xl font-extrabold tracking-tight text-msr-ink">Checkout</h1>
            <p className="mt-1 flex items-center gap-1.5 text-sm text-msr-muted">
              <ShieldCheck className="h-4 w-4 text-msr-success" />
              Secure, encrypted checkout
            </p>
          </div>
          <ol className="no-scrollbar flex items-center gap-2 overflow-x-auto">
            {steps.map((step, i) => (
              <li key={step.id} className="flex shrink-0 items-center gap-2">
                <span
                  className={`grid h-7 w-7 place-items-center rounded-full text-[12px] font-bold ${
                    step.done ? "bg-msr-success text-white" : "border-2 border-msr-line-strong bg-white text-msr-muted"
                  }`}
                >
                  {step.done ? <Check className="h-3.5 w-3.5" strokeWidth={3} /> : i + 1}
                </span>
                <span className={`text-[13px] font-semibold ${step.done ? "text-msr-ink" : "text-msr-muted"}`}>{step.label}</span>
                {i < steps.length - 1 ? <span className={`h-px w-6 sm:w-10 ${step.done ? "bg-msr-success" : "bg-msr-line-strong"}`} /> : null}
              </li>
            ))}
          </ol>
        </div>
      </header>

      {error ? (
        <div className="mb-5 flex items-start gap-3 rounded-xl border border-msr-danger/20 bg-msr-danger-soft px-4 py-3 text-sm text-msr-danger">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
          <p>{error}</p>
        </div>
      ) : null}

      <div className="grid items-start gap-5 lg:grid-cols-[minmax(0,1fr)_380px]">
        <div className="space-y-4">
          <section className="overflow-hidden rounded-2xl border border-msr-line bg-white">
            <SectionHeader number={++stepNo} title="Delivery address" description="Where should we deliver your order?" icon={MapPin} done={Boolean(selected)} />
            <div className="p-4 sm:p-5">
              {addresses.length ? (
                <div className="grid gap-2.5 sm:grid-cols-2">
                  {addresses.map((address) => {
                    const active = String(selected?._id) === String(address._id);
                    return (
                      <button
                        key={address._id}
                        type="button"
                        onClick={() => setAddressId(address._id)}
                        className={`relative rounded-xl border p-3.5 text-left transition ${
                          active ? "border-msr-primary bg-msr-primary-soft/50 ring-1 ring-msr-primary" : "border-msr-line hover:border-msr-line-strong"
                        }`}
                      >
                        <span className="flex items-center gap-2">
                          <span className="rounded-md bg-msr-surface px-1.5 py-0.5 text-[10.5px] font-bold uppercase tracking-wide text-msr-muted">
                            {address.label || "Address"}
                          </span>
                          {address.isDefault ? <span className="text-[11px] font-semibold text-msr-primary">Default</span> : null}
                          {active ? (
                            <span className="ml-auto grid h-5 w-5 place-items-center rounded-full bg-msr-primary text-white">
                              <Check className="h-3 w-3" strokeWidth={3} />
                            </span>
                          ) : null}
                        </span>
                        <span className="mt-2 block text-[13px] font-semibold text-msr-ink">
                          {address.contactName}
                          {address.phone ? <span className="font-normal text-msr-muted"> · {address.phone}</span> : null}
                        </span>
                        <span className="mt-0.5 block text-[12.5px] leading-5 text-msr-muted">
                          {address.addressLine1}
                          {address.addressLine2 ? `, ${address.addressLine2}` : ""}, {address.city}, {address.state} {address.postalCode}
                        </span>
                      </button>
                    );
                  })}
                </div>
              ) : (
                <div className="rounded-xl border border-dashed border-msr-line-strong bg-msr-surface px-5 py-8 text-center">
                  <MapPin className="mx-auto h-6 w-6 text-msr-subtle" />
                  <p className="mt-2 text-sm font-bold text-msr-ink">No saved addresses</p>
                  <p className="mt-1 text-[12.5px] text-msr-muted">Add an address to continue.</p>
                </div>
              )}

              {!adding ? (
                <button
                  type="button"
                  onClick={() => setAdding(true)}
                  className="mt-4 inline-flex items-center gap-1.5 text-[13px] font-semibold text-msr-primary hover:underline"
                >
                  <Plus className="h-4 w-4" />
                  Add new address
                </button>
              ) : (
                <form onSubmit={saveAddress} className="mt-4 rounded-xl border border-msr-line bg-msr-surface p-4">
                  <div className="mb-3 flex items-center justify-between">
                    <h3 className="text-sm font-bold text-msr-ink">Add delivery address</h3>
                    <button type="button" onClick={() => setAdding(false)} className="text-[12px] font-semibold text-msr-muted hover:text-msr-ink">
                      Cancel
                    </button>
                  </div>
                  <div className="grid gap-2.5 sm:grid-cols-2">
                    <Field value={draft.contactName} onChange={(value) => setDraft((d) => ({ ...d, contactName: value }))} placeholder="Full name" required />
                    <Field value={draft.phone} onChange={(value) => setDraft((d) => ({ ...d, phone: value }))} placeholder="Phone number" required />
                  </div>
                  <div className="mt-2.5">
                    <Field value={draft.addressLine1} onChange={(value) => setDraft((d) => ({ ...d, addressLine1: value }))} placeholder="Street address" required />
                  </div>
                  <div className="mt-2.5 grid gap-2.5 sm:grid-cols-3">
                    <Field value={draft.city} onChange={(value) => setDraft((d) => ({ ...d, city: value }))} placeholder="City" required />
                    <Field value={draft.state} onChange={(value) => setDraft((d) => ({ ...d, state: value }))} placeholder="State" required />
                    <Field value={draft.postalCode} onChange={(value) => setDraft((d) => ({ ...d, postalCode: value }))} placeholder="Pincode" required />
                  </div>
                  <Button type="submit" className="mt-3">
                    Save address
                  </Button>
                </form>
              )}
            </div>
          </section>

          {hasDelivery && partnerChoice && partners.length ? (
            <section className="overflow-hidden rounded-2xl border border-msr-line bg-white">
              <SectionHeader
                number={++stepNo}
                title="Delivery partner"
                description="Optional. If you skip this, we use our default partner."
                icon={Truck}
                done={Boolean(partnerId || preview?.deliveryPartner?.id)}
              />
              <div className="grid gap-2.5 p-4 sm:grid-cols-2 sm:p-5">
                {partners.map((partner) => {
                  const active = (partnerId || preview?.deliveryPartner?.id) === partner.id;
                  return (
                    <button
                      key={partner.id}
                      type="button"
                      onClick={() => setPartnerId(partner.id)}
                      className={`flex items-start gap-3 rounded-xl border p-3.5 text-left transition ${
                        active ? "border-msr-primary bg-msr-primary-soft/50 ring-1 ring-msr-primary" : "border-msr-line hover:border-msr-line-strong"
                      }`}
                    >
                      <RadioDot on={active} />
                      <span className="min-w-0">
                        <span className="block text-[13px] font-bold text-msr-ink">{partner.name}</span>
                        <span className="mt-0.5 block text-[12px] text-msr-muted">
                          {partner.fee ? `${inr(partner.fee)} partner charge` : "No extra partner charge"}
                          {partner.isDefault ? " · Default" : ""}
                        </span>
                      </span>
                    </button>
                  );
                })}
              </div>
            </section>
          ) : null}

          <section className="overflow-hidden rounded-2xl border border-msr-line bg-white">
            <SectionHeader number={++stepNo} title="Payment method" description="Choose how you'd like to pay" icon={CreditCard} done={steps.find((s) => s.id === "payment")?.done} />
            <div className="p-4 sm:p-5">
              <div className="grid gap-2.5 sm:grid-cols-2">
                {PAYMENTS.map((payment) => {
                  const Icon = payment.icon;
                  const active = pay === payment.id;
                  return (
                    <label
                      key={payment.id}
                      className={`relative flex cursor-pointer items-center gap-3 rounded-xl border p-3.5 transition ${
                        active ? "border-msr-primary bg-msr-primary-soft/50 ring-1 ring-msr-primary" : "border-msr-line hover:border-msr-line-strong"
                      }`}
                    >
                      <input type="radio" name="payment" value={payment.id} checked={active} onChange={() => setPay(payment.id)} className="sr-only" />
                      <span
                        className={`grid h-10 w-10 shrink-0 place-items-center rounded-xl ${
                          active ? "bg-msr-primary text-white" : "bg-msr-surface text-msr-muted"
                        }`}
                      >
                        <Icon className="h-[18px] w-[18px]" />
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className={`block text-[13.5px] font-bold ${active ? "text-msr-primary-ink" : "text-msr-ink"}`}>{payment.label}</span>
                        <span className="mt-0.5 block text-[12px] leading-4 text-msr-muted">{payment.description}</span>
                      </span>
                      <RadioDot on={active} />
                    </label>
                  );
                })}
              </div>

              {pay === "purchase_order" ? (
                <label className="mt-4 block rounded-xl bg-msr-surface p-3.5">
                  <span className="text-[12px] font-semibold text-msr-muted">Purchase order number</span>
                  <input
                    value={poNumber}
                    onChange={(e) => setPoNumber(e.target.value)}
                    placeholder="Enter PO number"
                    className={`${inputClass} mt-1.5`}
                  />
                </label>
              ) : null}
            </div>
          </section>

          <section className="overflow-hidden rounded-2xl border border-msr-line bg-white">
            <div className="flex items-center gap-3 px-4 py-4 sm:px-5">
              <span className="grid h-9 w-9 place-items-center rounded-xl bg-msr-surface text-msr-muted">
                <NotebookPen className="h-4 w-4" />
              </span>
              <div>
                <h2 className="text-[14px] font-bold text-msr-ink">Delivery instructions</h2>
                <p className="text-[12px] text-msr-muted">Optional notes for the delivery partner</p>
              </div>
            </div>
            <div className="px-4 pb-4 sm:px-5 sm:pb-5">
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Example: Leave the order with security if I'm unavailable."
                className="min-h-[88px] w-full resize-none rounded-xl border border-msr-line-strong bg-white px-3.5 py-3 text-sm leading-5 outline-none transition placeholder:text-msr-subtle focus:border-msr-primary focus:ring-4 focus:ring-msr-primary/10"
              />
            </div>
          </section>
        </div>

        <aside className="lg:sticky lg:top-32">
          <div className="overflow-hidden rounded-2xl border border-msr-line bg-white">
            <div className="flex items-center justify-between border-b border-msr-line px-5 py-4">
              <div>
                <h2 className="text-[15px] font-bold text-msr-ink">Order summary</h2>
                <p className="mt-0.5 text-[12px] text-msr-muted">
                  {items.length} {items.length === 1 ? "item" : "items"}
                </p>
              </div>
              <Link to="/cart" className="text-[12.5px] font-semibold text-msr-primary hover:underline">
                Edit cart
              </Link>
            </div>

            <ul className="msr-pane max-h-[260px] space-y-3 overflow-auto px-5 py-4">
              {items.map((item) => (
                <CheckoutItem key={(item.cartItemId || item.id) + item.pack} item={item} />
              ))}
            </ul>

            {couponCode && totals.couponDiscount ? (
              <div className="mx-5 flex items-center gap-2 rounded-lg bg-msr-success-soft px-3 py-2.5">
                <Check className="h-4 w-4 text-msr-success" />
                <p className="text-[12px] font-semibold text-msr-success-ink">
                  {couponCode} applied · you save {inr(totals.couponDiscount)}
                </p>
              </div>
            ) : null}

            <div className="px-5 py-4">
              <dl className="space-y-2.5">
                <SummaryRow label="Item total" value={inr(totals.subtotal)} />
                {totals.couponDiscount ? <SummaryRow label="Coupon discount" value={`− ${inr(totals.couponDiscount)}`} success /> : null}
                <SummaryRow label="Delivery" value={totals.deliveryFee ? inr(totals.deliveryFee) : "FREE"} success={!totals.deliveryFee} />
                {totals.platformFee ? <SummaryRow label="Platform fee" value={inr(totals.platformFee)} /> : null}
                {totals.partnerFee ? (
                  <SummaryRow
                    label={preview?.deliveryPartner?.name ? `${preview.deliveryPartner.name} charge` : "Partner charge"}
                    value={inr(totals.partnerFee)}
                  />
                ) : null}
                {totals.tax ? <SummaryRow label="GST" value={inr(totals.tax)} /> : null}
              </dl>

              <div className="my-4 border-t border-dashed border-msr-line-strong" />

              <div className="flex items-end justify-between gap-3">
                <div>
                  <p className="text-[14px] font-bold text-msr-ink">Total payable</p>
                  <p className="mt-0.5 text-[11px] text-msr-subtle">Inclusive of applicable taxes</p>
                </div>
                <p className="text-[22px] font-extrabold tracking-tight text-msr-ink">{inr(payable)}</p>
              </div>

              <Button size="lg" block className="mt-5" disabled={busy || !addressId || !live} onClick={placeOrder}>
                {busy ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Placing order…
                  </>
                ) : (
                  <>
                    <Lock className="h-4 w-4" />
                    Place order · {inr(payable)}
                  </>
                )}
              </Button>

              <p className="mt-3 flex items-start gap-2 text-[11.5px] leading-4 text-msr-subtle">
                <ShieldCheck className="h-3.5 w-3.5 shrink-0 text-msr-success" />
                Your details are processed securely. A GST invoice is available after confirmation.
              </p>

              {!live ? <p className="mt-3 text-center text-[12px] text-msr-danger">Cart is not synced, so this order cannot be placed yet.</p> : null}
            </div>
          </div>
        </aside>
      </div>

      <div className="fixed inset-x-0 bottom-16 z-30 border-t border-msr-line bg-white/95 px-4 py-3 backdrop-blur md:hidden">
        <div className="flex items-center gap-3">
          <div className="min-w-0 flex-1">
            <p className="text-[11px] font-medium text-msr-muted">Total payable</p>
            <p className="text-lg font-extrabold leading-tight text-msr-ink">{inr(payable)}</p>
          </div>
          <Button disabled={busy || !addressId || !live} onClick={placeOrder} className="px-6">
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Lock className="h-4 w-4" />}
            {busy ? "Processing…" : "Place order"}
          </Button>
        </div>
      </div>
    </div>
  );
}

function RadioDot({ on }) {
  return (
    <span
      aria-hidden
      className={`grid h-5 w-5 shrink-0 place-items-center rounded-full border-2 transition ${on ? "border-msr-primary" : "border-msr-line-strong"}`}
    >
      {on ? <span className="h-2.5 w-2.5 rounded-full bg-msr-primary" /> : null}
    </span>
  );
}

function SectionHeader({ number, title, description, icon: Icon, done }) {
  return (
    <div className="flex items-center gap-3 border-b border-msr-line px-4 py-4 sm:px-5">
      <span
        className={`grid h-9 w-9 shrink-0 place-items-center rounded-xl ${done ? "bg-msr-success-soft text-msr-success" : "bg-msr-primary-soft text-msr-primary"}`}
      >
        {done ? <Check className="h-4 w-4" strokeWidth={2.6} /> : <Icon className="h-4 w-4" />}
      </span>
      <div className="min-w-0 flex-1">
        <h2 className="text-[14.5px] font-bold text-msr-ink">
          <span className="mr-1.5 text-msr-subtle">{number}.</span>
          {title}
        </h2>
        <p className="mt-0.5 text-[12px] text-msr-muted">{description}</p>
      </div>
    </div>
  );
}

function CheckoutItem({ item }) {
  return (
    <li className="flex items-center gap-3">
      <span className="relative grid h-12 w-12 shrink-0 place-items-center rounded-lg bg-msr-surface">
        <img
          src={item.image || "/products/product.png"}
          alt=""
          className="h-full w-full object-contain p-1 mix-blend-multiply"
          onError={(e) => {
            e.currentTarget.src = "/products/product.png";
          }}
        />
        <span className="absolute -right-1.5 -top-1.5 grid h-5 min-w-5 place-items-center rounded-full bg-msr-brand px-1 text-[10px] font-bold text-white">
          {item.qty}
        </span>
      </span>
      <div className="min-w-0 flex-1">
        <p className="line-clamp-2 text-[12.5px] font-semibold leading-4 text-msr-ink">{item.name}</p>
        <p className="mt-0.5 text-[11px] text-msr-subtle">{item.pack}</p>
      </div>
      <p className="shrink-0 text-[13px] font-bold text-msr-ink">{inr(item.lineTotal || item.price * item.qty)}</p>
    </li>
  );
}

function SummaryRow({ label, value, success = false }) {
  return (
    <div className="flex items-center justify-between gap-4 text-[13px]">
      <dt className="text-msr-muted">{label}</dt>
      <dd className={success ? "font-semibold text-msr-success" : "font-semibold text-msr-ink"}>{value}</dd>
    </div>
  );
}

function Field({ value, onChange, placeholder, required }) {
  return (
    <input
      value={value}
      required={required}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      className={inputClass}
    />
  );
}
