const fs = require("fs");
const p = "src/shop/pages/Checkout.jsx";
let s = fs.readFileSync(p, "utf8");
const m = s.match(/  return \(\r?\n    <div className="min-h-screen bg-\[#f7f8fa\]">/);
if (!m) throw new Error("main marker");
s = s.slice(0, m.index) + fs.readFileSync(".tmp-checkout-tail.jsx", "utf8");
const a = s.indexOf("  if (!items.length) {");
const b = s.search(/  \/\* -+\r?\n     SAVE ADDRESS/);
if (a < 0 || b < 0) throw new Error("empty marker");
const empty = `  if (!items.length) {
    return (
      <div className="msr-gutter py-12 md:py-16">
        <EmptyState
          icon={ShoppingBag}
          title="Nothing to checkout"
          text="Your cart is empty. Add some products before continuing."
          className="mx-auto max-w-xl"
        >
          <Link to="/category/all" className={buttonClass({ size: "lg" })}>
            Browse products
            <ArrowRight className="h-4 w-4" />
          </Link>
        </EmptyState>
      </div>
    );
  }

`;
s = s.slice(0, a).replace(/\s*\/\* -+\s*EMPTY CART\s*-+ \*\/\s*$/, "\n\n") + empty + s.slice(b);
fs.writeFileSync(p, s);
fs.unlinkSync(".tmp-checkout-tail.jsx");
console.log("ok");
