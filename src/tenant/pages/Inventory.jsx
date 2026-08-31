import { products } from "../../shared/data/catalog.js";

export default function SellerInventory() {
  return (
    <div>
      <h1 className="text-2xl font-extrabold">Inventory</h1>
      <div className="mt-5 overflow-x-auto rounded-2xl bg-white shadow-sm">
        <table className="w-full text-left text-sm">
          <thead className="bg-msr-bg text-msr-muted">
            <tr>
              <th className="px-4 py-3">SKU</th>
              <th>Product</th>
              <th>Available</th>
              <th>Reserved</th>
              <th>Warehouse</th>
            </tr>
          </thead>
          <tbody>
            {products.map((p) => (
              <tr key={p.id} className="border-t border-msr-border">
                <td className="px-4 py-3 font-mono text-xs uppercase">{p.id}</td>
                <td>{p.name}</td>
                <td className={p.stock < 100 ? "font-bold text-msr-warning" : ""}>{p.stock}</td>
                <td>{Math.round(p.stock * 0.08)}</td>
                <td>DEL-WH-01</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
