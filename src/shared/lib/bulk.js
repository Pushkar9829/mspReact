import { inr } from "./format.js";

/** Read qty-slab rows from a product create/edit form (slabMin[], slabMax[], slabPrice[]). */
export function readTierPricesFromForm(form) {
  const mins = form.getAll("slabMin");
  const maxes = form.getAll("slabMax");
  const prices = form.getAll("slabPrice");
  const tiers = [];
  for (let i = 0; i < Math.max(mins.length, prices.length); i += 1) {
    const minQty = Number(mins[i]);
    const unitPrice = Number(prices[i]);
    if (!Number.isFinite(minQty) || minQty < 1 || !Number.isFinite(unitPrice) || unitPrice < 0) continue;
    const rawMax = maxes[i];
    const maxQty = rawMax === "" || rawMax == null ? null : Number(rawMax);
    tiers.push({
      minQty,
      maxQty: Number.isFinite(maxQty) ? maxQty : null,
      unitPrice,
    });
  }
  return tiers.sort((a, b) => a.minQty - b.minQty);
}

export function formatSlabLabel(slab) {
  const max = slab.maxQty == null ? "+" : `–${slab.maxQty}`;
  return `${slab.minQty}${max} units · ${inr(slab.unitPrice)}`;
}

/**
 * CSV columns:
 * sku,name,sellingPrice,listPrice,moq,maxQty,packMultiple,bulkEligible,slabMin1,slabMax1,slabPrice1,slabMin2,slabMax2,slabPrice2,...
 */
export function parseBulkProductCsv(text) {
  const lines = String(text || "")
    .replace(/^\uFEFF/, "")
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
  if (lines.length < 2) return [];
  const headers = splitCsvLine(lines[0]).map((h) => h.trim().toLowerCase());
  const idx = (name) => headers.indexOf(name);

  return lines.slice(1).map((line) => {
    const cols = splitCsvLine(line);
    const get = (name) => {
      const i = idx(name);
      return i >= 0 ? String(cols[i] ?? "").trim() : "";
    };
    const sellingPrice = Number(get("sellingprice") || get("price") || 0);
    const listPrice = Number(get("listprice") || sellingPrice);
    const maxRaw = get("maxqty") || get("max");
    const bulkRaw = (get("bulkeligible") || get("bulk") || "true").toLowerCase();
    const tierPrices = [];
    for (let n = 1; n <= 5; n += 1) {
      const minQty = Number(get(`slabmin${n}`) || get(`min${n}`));
      const unitPrice = Number(get(`slabprice${n}`) || get(`price${n}`));
      if (!Number.isFinite(minQty) || !Number.isFinite(unitPrice)) continue;
      const maxVal = get(`slabmax${n}`) || get(`max${n}`);
      tierPrices.push({
        minQty,
        maxQty: maxVal === "" ? null : Number(maxVal),
        unitPrice,
      });
    }
    return {
      sku: get("sku"),
      name: get("name"),
      sellingPrice,
      listPrice,
      publish: (get("publish") || "true").toLowerCase() !== "false",
      wholesale: {
        bulkEligible: !["0", "false", "no", "n"].includes(bulkRaw),
        moq: Math.max(1, Number(get("moq") || 1)),
        maxQty: maxRaw === "" ? null : Number(maxRaw),
        packMultiple: Math.max(1, Number(get("packmultiple") || get("pack") || 1)),
      },
      tierPrices,
    };
  }).filter((row) => row.sku && row.name);
}

function splitCsvLine(line) {
  const out = [];
  let cur = "";
  let quoted = false;
  for (let i = 0; i < line.length; i += 1) {
    const ch = line[i];
    if (ch === '"') {
      if (quoted && line[i + 1] === '"') {
        cur += '"';
        i += 1;
      } else quoted = !quoted;
      continue;
    }
    if (ch === "," && !quoted) {
      out.push(cur);
      cur = "";
      continue;
    }
    cur += ch;
  }
  out.push(cur);
  return out;
}
