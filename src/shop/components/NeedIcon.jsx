export default function NeedIcon({ slug }) {
  const svg = {
    viewBox: "0 0 48 48",
    fill: "none",
    className: "h-10 w-10 sm:h-11 sm:w-11",
    "aria-hidden": true,
  };
  const s = {
    stroke: "currentColor",
    strokeWidth: "1.5",
    strokeLinecap: "round",
    strokeLinejoin: "round",
  };

  if (slug === "cooking") {
    return (
      <svg {...svg}>
        <path d="M18 8c0 3 2.2 3.4 2.2 6M24 6.5c0 3.6 2.4 4 2.4 7M30 8c0 3 2.2 3.4 2.2 6" {...s} />
        <path d="M15 18h18" {...s} />
        <path d="M17 16h14v2H17z" {...s} />
        <path d="M12 20h24v9c0 6.5-5.2 11-12 11s-12-4.5-12-11v-9z" {...s} />
        <path d="M12 23H7M36 23h5" {...s} />
      </svg>
    );
  }
  if (slug === "masala") {
    return (
      <svg {...svg}>
        <path d="M17 10h14l-1.4 6H18.4L17 10z" {...s} />
        <path d="M18.2 16h11.6v20.5c0 2.6-2.3 4-5.8 4s-5.8-1.4-5.8-4V16z" {...s} />
        <circle cx="21.5" cy="13" r="0.9" fill="currentColor" />
        <circle cx="24" cy="13" r="0.9" fill="currentColor" />
        <circle cx="26.5" cy="13" r="0.9" fill="currentColor" />
        <path d="M21 23h6M21 28.5h6M21 34h6" {...s} />
      </svg>
    );
  }
  if (slug === "pulses") {
    return (
      <svg {...svg}>
        <path d="M16 16c0-5.5 16-5.5 16 0" {...s} />
        <path d="M16 16c1.8 3.2 13.2 3.2 16 0" {...s} />
        <path d="M16 16v16.5c0 5.2 3.6 8 8 8s8-2.8 8-8V16" {...s} />
        <path d="M22 12.5c.4-2 1.6-3.5 4-3.5" {...s} />
        <circle cx="21" cy="27" r="1.15" fill="currentColor" />
        <circle cx="25.5" cy="29.5" r="1.15" fill="currentColor" />
        <circle cx="27.5" cy="24.5" r="1.15" fill="currentColor" />
      </svg>
    );
  }
  if (slug === "sauces") {
    return (
      <svg {...svg}>
        <path d="M20.5 8h7v5.5" {...s} />
        <path d="M20.5 13.5h7l3 5.5v17c0 2.6-2.4 4-7 4s-7-1.4-7-4v-17l3-5.5z" {...s} />
        <path d="M20.5 13.5h7" {...s} />
        <path d="M19.5 26h9" {...s} />
        <path d="M21.5 29.5h5" {...s} />
      </svg>
    );
  }
  if (slug === "biscuits") {
    return (
      <svg {...svg}>
        <rect x="13" y="8.5" width="22" height="31" rx="3" {...s} />
        <path d="M18 15h12M18 21h12M18 27h12M18 33h8" {...s} />
        <circle cx="32.5" cy="12" r="1.1" fill="currentColor" />
      </svg>
    );
  }
  if (slug === "chocolates") {
    return (
      <svg {...svg}>
        <rect x="10" y="16" width="28" height="22" rx="3" {...s} />
        <path d="M10 27h28M19.5 16v22M28.5 16v22" {...s} />
        <path d="M15 11h5M29 11h5" {...s} />
        <path d="M17.5 11c0-2.4 2.5-3.5 4.5-2.2M30.5 11c0-2.4 2.5-3.5 4.5-2.2" {...s} />
      </svg>
    );
  }
  if (slug === "cleaning") {
    return (
      <svg {...svg}>
        <path d="M19 14h10l2.5 6v17c0 2.6-2.4 4.2-7.5 4.2s-7.5-1.6-7.5-4.2v-17L19 14z" {...s} />
        <path d="M21 8.5h8v5.5h-10V10c0-.8.7-1.5 2-1.5z" {...s} />
        <path d="M32.5 11c3.2 1.4 5.2 4.6 5.2 8" {...s} />
        <path d="M18.5 24h11" {...s} />
      </svg>
    );
  }
  if (slug === "tissues") {
    return (
      <svg {...svg}>
        <rect x="10.5" y="16" width="27" height="23" rx="3" {...s} />
        <path d="M18 16V11c0-2.2 12-2.2 12 0v5" {...s} />
        <path d="M21 11c1-3.2 6-4 8-1.2" {...s} />
        <path d="M16 23.5h16M16 29h16M16 34.5h10" {...s} />
      </svg>
    );
  }
  return (
    <svg {...svg}>
      <circle cx="24" cy="24" r="14.5" {...s} />
      <circle cx="16.5" cy="24" r="2.2" fill="currentColor" />
      <circle cx="24" cy="24" r="2.2" fill="currentColor" />
      <circle cx="31.5" cy="24" r="2.2" fill="currentColor" />
    </svg>
  );
}
