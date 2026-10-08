/**
 * Indian address helpers: states, PIN → state suggestion (from the postal circle prefix; the
 * backend has no PIN geocoding yet), and validators for phone, PIN and GSTIN.
 */
export const STATES = [
  "Andaman and Nicobar Islands", "Andhra Pradesh", "Arunachal Pradesh", "Assam", "Bihar", "Chandigarh", "Chhattisgarh",
  "Dadra and Nagar Haveli and Daman and Diu", "Delhi", "Goa", "Gujarat", "Haryana", "Himachal Pradesh", "Jammu and Kashmir",
  "Jharkhand", "Karnataka", "Kerala", "Ladakh", "Lakshadweep", "Madhya Pradesh", "Maharashtra", "Manipur", "Meghalaya",
  "Mizoram", "Nagaland", "Odisha", "Puducherry", "Punjab", "Rajasthan", "Sikkim", "Tamil Nadu", "Telangana", "Tripura",
  "Uttar Pradesh", "Uttarakhand", "West Bengal",
];

/** ISO 3166-2:IN codes (without "IN-") → state / UT name, as the API stores `stateCode`. */
export const STATE_CODES = {
  AN: "Andaman and Nicobar Islands", AP: "Andhra Pradesh", AR: "Arunachal Pradesh", AS: "Assam", BR: "Bihar", CH: "Chandigarh",
  CT: "Chhattisgarh", DH: "Dadra and Nagar Haveli and Daman and Diu", DL: "Delhi", GA: "Goa", GJ: "Gujarat", HP: "Himachal Pradesh",
  HR: "Haryana", JH: "Jharkhand", JK: "Jammu and Kashmir", KA: "Karnataka", KL: "Kerala", LA: "Ladakh", LD: "Lakshadweep",
  MH: "Maharashtra", ML: "Meghalaya", MN: "Manipur", MP: "Madhya Pradesh", MZ: "Mizoram", NL: "Nagaland", OD: "Odisha",
  PB: "Punjab", PY: "Puducherry", RJ: "Rajasthan", SK: "Sikkim", TG: "Telangana", TN: "Tamil Nadu", TR: "Tripura",
  UK: "Uttarakhand", UP: "Uttar Pradesh", WB: "West Bengal",
};

/** Older / informal codes and names → ISO code (mirrors the API's normaliser). */
const STATE_ALIASES = {
  TS: "TG", OR: "OD", UA: "UK", CG: "CT", DN: "DH", DD: "DH", PD: "PY", PO: "PY", JD: "JH", NCT: "DL",
  orissa: "OD", pondicherry: "PY", telengana: "TG", uttaranchal: "UK", chattisgarh: "CT", chhatisgarh: "CT",
  "new delhi": "DL", "nct of delhi": "DL", "delhi ncr": "DL", "national capital territory of delhi": "DL",
  "j&k": "JK", "jammu & kashmir": "JK", "andaman & nicobar islands": "AN", "andaman and nicobar": "AN",
  "dadra and nagar haveli": "DH", "daman and diu": "DH", "dadra & nagar haveli and daman & diu": "DH",
  tamilnadu: "TN", westbengal: "WB",
};
const CODE_BY_NAME = new Map(Object.entries(STATE_CODES).map(([code, name]) => [name.toLowerCase(), code]));

/**
 * Any state input — ISO code ("DL", "dl", "IN-DL"), old two-letter code ("TS", "OR"), name in any
 * case or a common alias ("New Delhi", "Orissa") — → the dropdown's full name. Optional `code`
 * (an address's `stateCode`) wins. Unknown input comes back trimmed so nothing is lost.
 */
export function normalizeState(value, code) {
  if (code && STATE_CODES[String(code).toUpperCase()]) return STATE_CODES[String(code).toUpperCase()];
  const raw = String(value ?? "").trim().replace(/\s+/g, " ");
  if (!raw) return "";
  const upper = raw.toUpperCase().replace(/^IN-/, "");
  const lower = raw.toLowerCase();
  const iso = (STATE_CODES[upper] && upper) || CODE_BY_NAME.get(lower) || STATE_ALIASES[upper] || STATE_ALIASES[lower] || CODE_BY_NAME.get(lower.replace(/&/g, "and"));
  return iso ? STATE_CODES[iso] : raw;
}

/** GST state codes (first two digits of a GSTIN). */
export const GST_STATE_CODES = {
  "01": "Jammu and Kashmir", "02": "Himachal Pradesh", "03": "Punjab", "04": "Chandigarh", "05": "Uttarakhand", "06": "Haryana",
  "07": "Delhi", "08": "Rajasthan", "09": "Uttar Pradesh", "10": "Bihar", "11": "Sikkim", "12": "Arunachal Pradesh", "13": "Nagaland",
  "14": "Manipur", "15": "Mizoram", "16": "Tripura", "17": "Meghalaya", "18": "Assam", "19": "West Bengal", "20": "Jharkhand",
  "21": "Odisha", "22": "Chhattisgarh", "23": "Madhya Pradesh", "24": "Gujarat", "26": "Dadra and Nagar Haveli and Daman and Diu",
  "27": "Maharashtra", "29": "Karnataka", "30": "Goa", "31": "Lakshadweep", "32": "Kerala", "33": "Tamil Nadu", "34": "Puducherry",
  "35": "Andaman and Nicobar Islands", "36": "Telangana", "37": "Andhra Pradesh", "38": "Ladakh",
};

const PIN3 = {
  160: "Chandigarh", 194: "Ladakh", 403: "Goa", 605: "Puducherry", 737: "Sikkim", 744: "Andaman and Nicobar Islands",
  246: "Uttarakhand", 247: "Uttarakhand", 248: "Uttarakhand", 249: "Uttarakhand", 263: "Uttarakhand",
  790: "Arunachal Pradesh", 791: "Arunachal Pradesh", 792: "Arunachal Pradesh", 793: "Meghalaya", 794: "Meghalaya",
  795: "Manipur", 796: "Mizoram", 797: "Nagaland", 798: "Nagaland", 799: "Tripura",
  814: "Jharkhand", 815: "Jharkhand", 816: "Jharkhand",
};
const PIN2 = {
  11: "Delhi", 12: "Haryana", 13: "Haryana", 14: "Punjab", 15: "Punjab", 16: "Punjab", 17: "Himachal Pradesh",
  18: "Jammu and Kashmir", 19: "Jammu and Kashmir",
  20: "Uttar Pradesh", 21: "Uttar Pradesh", 22: "Uttar Pradesh", 23: "Uttar Pradesh", 24: "Uttar Pradesh", 25: "Uttar Pradesh",
  26: "Uttar Pradesh", 27: "Uttar Pradesh", 28: "Uttar Pradesh",
  30: "Rajasthan", 31: "Rajasthan", 32: "Rajasthan", 33: "Rajasthan", 34: "Rajasthan",
  36: "Gujarat", 37: "Gujarat", 38: "Gujarat", 39: "Gujarat",
  40: "Maharashtra", 41: "Maharashtra", 42: "Maharashtra", 43: "Maharashtra", 44: "Maharashtra",
  45: "Madhya Pradesh", 46: "Madhya Pradesh", 47: "Madhya Pradesh", 48: "Madhya Pradesh", 49: "Chhattisgarh",
  50: "Telangana", 51: "Andhra Pradesh", 52: "Andhra Pradesh", 53: "Andhra Pradesh",
  56: "Karnataka", 57: "Karnataka", 58: "Karnataka", 59: "Karnataka",
  60: "Tamil Nadu", 61: "Tamil Nadu", 62: "Tamil Nadu", 63: "Tamil Nadu", 64: "Tamil Nadu",
  67: "Kerala", 68: "Kerala", 69: "Kerala",
  70: "West Bengal", 71: "West Bengal", 72: "West Bengal", 73: "West Bengal", 74: "West Bengal",
  75: "Odisha", 76: "Odisha", 77: "Odisha", 78: "Assam",
  80: "Bihar", 81: "Bihar", 82: "Jharkhand", 83: "Jharkhand", 84: "Bihar", 85: "Bihar",
};

/** Suggested state for a 6-digit PIN (postal circle). A suggestion only: the buyer can change it. */
export function stateForPin(pin) {
  const p = String(pin || "").trim();
  if (!/^[1-9]\d{5}$/.test(p)) return "";
  return PIN3[Number(p.slice(0, 3))] || PIN2[Number(p.slice(0, 2))] || "";
}

export function isValidPin(pin) {
  return /^[1-9]\d{5}$/.test(String(pin || "").trim());
}

/** "+91 98765 43210", "098765-43210", "9876543210" → "9876543210" (or "" when invalid). */
export function normalizePhone(value) {
  let digits = String(value || "").replace(/\D/g, "");
  if (digits.length === 12 && digits.startsWith("91")) digits = digits.slice(2);
  if (digits.length === 11 && digits.startsWith("0")) digits = digits.slice(1);
  return /^[6-9]\d{9}$/.test(digits) ? digits : "";
}

/** Phone as the API stores it: "+91 9876543210". */
export function formatPhone(value) {
  const n = normalizePhone(value);
  return n ? `+91 ${n}` : String(value || "");
}

const GSTIN_RX = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z][1-9A-Z]Z[0-9A-Z]$/;
const CHARS = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ";

/** GSTIN format + state code + check digit. Returns "" when valid, else a message. */
export function gstinError(value) {
  const g = String(value || "").trim().toUpperCase();
  if (!g) return "";
  if (g.length !== 15) return "GSTIN has 15 characters";
  if (!GSTIN_RX.test(g)) return "This doesn’t look like a GSTIN (e.g. 27ABCDE1234F1Z5)";
  if (!GST_STATE_CODES[g.slice(0, 2)]) return "Unknown state code in GSTIN";
  let sum = 0;
  for (let i = 0; i < 14; i += 1) {
    const v = CHARS.indexOf(g[i]) * (i % 2 ? 2 : 1);
    sum += Math.floor(v / 36) + (v % 36);
  }
  const check = CHARS[(36 - (sum % 36)) % 36];
  return check === g[14] ? "" : "GSTIN check digit doesn’t match. Please re-check it.";
}

export function stateForGstin(value) {
  return GST_STATE_CODES[String(value || "").slice(0, 2)] || "";
}

/** Validate an address form. Returns { field: message } (empty = valid). */
export function validateAddress(form) {
  const errors = {};
  if (!String(form.contactName || "").trim()) errors.contactName = "Enter the receiver’s name";
  if (!normalizePhone(form.phone)) errors.phone = "Enter a 10-digit mobile number";
  if (!String(form.addressLine1 || "").trim()) errors.addressLine1 = "Enter the shop / building and street";
  if (!isValidPin(form.postalCode)) errors.postalCode = "Enter a 6-digit PIN code";
  if (!String(form.city || "").trim()) errors.city = "Enter the city";
  if (!String(form.state || "").trim()) errors.state = "Choose the state";
  const gst = gstinError(form.gstin);
  if (gst) errors.gstin = gst;
  return errors;
}
