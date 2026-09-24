import { api } from "../../shared/api.js";
import { mapApiProduct } from "./mapProduct.js";

export async function loadTaggedProducts(tag) {
  const rows = [];
  let page = 1;
  let pages = 1;
  while (page <= pages && page <= 20) {
    const res = await api.searchProducts({ tag, limit: 100, page });
    rows.push(...(res.data || []).map(mapApiProduct).filter(Boolean));
    pages = res.meta?.pages || 1;
    if (!(res.data || []).length) break;
    page += 1;
  }
  return rows;
}

export async function searchAllProducts(query = {}) {
  const rows = [];
  let page = 1;
  let pages = 1;
  while (page <= pages && page <= 15) {
    const res = await api.searchProducts({ ...query, limit: 100, page });
    rows.push(...(res.data || []));
    pages = res.meta?.pages || 1;
    if (!(res.data || []).length) break;
    page += 1;
  }
  return rows;
}
