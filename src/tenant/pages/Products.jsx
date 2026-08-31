import { products, discount } from "../../shared/data/catalog.js";
import { inr } from "../../shared/lib/format.js";

export default function SellerProducts() {
  return (
    <div>
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-extrabold">Products</h1>
        <button type="button" className="rounded-xl bg-msr-navy px-4 py-2 text-sm font-semibold text-white">
          Add product
        </button>
      </div>
      <div className="mt-5 overflow-x-auto rounded-2xl bg-white shadow-sm">
        <table className="w-full text-left text-sm">
          <thead className="bg-msr-bg text-msr-muted">
            <tr>
              <th className="px-4 py-3">Product</th>
              <th>SKU</th>
              <th>Price</th>
              <th>Discount</th>
              <th>Stock</th>
            </tr>
          </thead>
          <tbody>
            {products.map((p) => (
              <tr key={p.id} className="border-t border-msr-border">
                <td className="px-4 py-3">
                  <div className="flex items-center gap-3">
                    <img src={p.image} alt="" className="h-10 w-10 rounded-lg object-cover" />
                    <div>
                      <p className="font-semibold">{p.name}</p>
                      <p className="text-xs text-msr-muted">{p.brand}</p>
                    </div>
                  </div>
                </td>
                <td className="uppercase">{p.id.slice(0, 10)}</td>
                <td>{inr(p.price)}</td>
                <td>{discount(p)}%</td>
                <td>{p.stock}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
