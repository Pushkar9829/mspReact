import { BRAND_LOGO } from "../lib/brandLogo.js";

export { BRAND_LOGO };

export default function BrandLogo({ className = "h-9 w-9", alt = "Brand" }) {
  return (
    <span className={`relative inline-grid shrink-0 overflow-hidden rounded-full bg-white ring-1 ring-[#ead9a0] ${className}`}>
      <img
        src={BRAND_LOGO}
        alt={alt}
        className="h-full w-full object-cover"
        loading="lazy"
        referrerPolicy="no-referrer"
      />
    </span>
  );
}
