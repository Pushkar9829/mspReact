import { useId, useMemo, useRef, useState } from "react";
import { cn } from "./cn.js";
import { compactNumber } from "../lib/format.js";

/*
 * Lightweight SVG charts styled with the design tokens (no chart library).
 * data: array of rows; `x` is the category/label key; `series` = [{ key, label, color? }].
 * Colours default to --chart-1..5. Every chart has an accessible <title>/<desc> and a hidden
 * data table for screen readers.
 */

const PALETTE = ["var(--chart-1)", "var(--chart-2)", "var(--chart-3)", "var(--chart-4)", "var(--chart-5)"];

function niceMax(v) {
  if (v <= 0) return 1;
  const exp = 10 ** Math.floor(Math.log10(v));
  const f = v / exp;
  const nice = f <= 1 ? 1 : f <= 2 ? 2 : f <= 2.5 ? 2.5 : f <= 5 ? 5 : 10;
  return nice * exp;
}

function SrTable({ data, x, series, format }) {
  return (
    <table className="sr-only">
      <thead>
        <tr>
          <th>{x}</th>
          {series.map((s) => (
            <th key={s.key}>{s.label || s.key}</th>
          ))}
        </tr>
      </thead>
      <tbody>
        {data.map((row, i) => (
          <tr key={i}>
            <td>{row[x]}</td>
            {series.map((s) => (
              <td key={s.key}>{format(row[s.key])}</td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function Legend({ series }) {
  if (series.length < 2) return null;
  return (
    <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-ui-xs text-fg-muted">
      {series.map((s, i) => (
        <span key={s.key} className="inline-flex items-center gap-1.5">
          <span aria-hidden className="size-2.5 rounded-xs" style={{ background: s.color || PALETTE[i % PALETTE.length] }} />
          {s.label || s.key}
        </span>
      ))}
    </div>
  );
}

function useHover() {
  const [hover, setHover] = useState(null);
  return [hover, setHover];
}

const W = 600;
const PAD = { top: 12, right: 8, bottom: 24, left: 44 };

/**
 * <AreaChart data={rows} x="date" series={[{ key: "netSales", label: "Net sales" }]}
 *            format={(v) => inr(v, { whole: true })} formatX={(d) => formatDate(d)} height={220} />
 */
export function AreaChart({ data = [], x = "x", series = [], height = 220, format = compactNumber, formatX = (v) => v, title = "Chart", className, stacked = false }) {
  const gid = useId().replace(/:/g, "");
  const ref = useRef(null);
  const [hover, setHover] = useHover();
  const H = height;
  const iw = W - PAD.left - PAD.right;
  const ih = H - PAD.top - PAD.bottom;
  const max = useMemo(() => niceMax(Math.max(0, ...data.map((r) => (stacked ? series.reduce((a, s) => a + (Number(r[s.key]) || 0), 0) : Math.max(...series.map((s) => Number(r[s.key]) || 0)))))), [data, series, stacked]);
  const px = (i) => PAD.left + (data.length <= 1 ? iw / 2 : (i / (data.length - 1)) * iw);
  const py = (v) => PAD.top + ih - (v / max) * ih;
  const ticks = [0, 0.25, 0.5, 0.75, 1].map((t) => t * max);
  const step = Math.max(1, Math.ceil(data.length / 6));

  function onMove(e) {
    const rect = ref.current?.getBoundingClientRect();
    if (!rect || !data.length) return;
    const rel = ((e.clientX - rect.left) / rect.width) * W;
    const i = Math.round(((rel - PAD.left) / iw) * (data.length - 1));
    setHover(Math.max(0, Math.min(data.length - 1, i)));
  }

  return (
    <figure className={cn("relative", className)}>
      <svg ref={ref} viewBox={`0 0 ${W} ${H}`} className="h-auto w-full overflow-visible" role="img" aria-label={title} onMouseMove={onMove} onMouseLeave={() => setHover(null)}>
        <title>{title}</title>
        <defs>
          {series.map((s, si) => (
            <linearGradient key={s.key} id={`${gid}-${si}`} x1="0" x2="0" y1="0" y2="1">
              <stop offset="0%" stopColor={s.color || PALETTE[si % PALETTE.length]} stopOpacity="0.22" />
              <stop offset="100%" stopColor={s.color || PALETTE[si % PALETTE.length]} stopOpacity="0" />
            </linearGradient>
          ))}
        </defs>
        {ticks.map((t) => (
          <g key={t}>
            <line x1={PAD.left} x2={W - PAD.right} y1={py(t)} y2={py(t)} stroke="var(--chart-grid)" strokeWidth="1" />
            <text x={PAD.left - 6} y={py(t)} dy="0.32em" textAnchor="end" className="fill-fg-subtle text-[10px] tabular-nums">
              {format(t)}
            </text>
          </g>
        ))}
        {data.map((row, i) =>
          i % step === 0 || i === data.length - 1 ? (
            <text key={i} x={px(i)} y={H - 6} textAnchor="middle" className="fill-fg-subtle text-[10px]">
              {formatX(row[x])}
            </text>
          ) : null
        )}
        {series.map((s, si) => {
          const color = s.color || PALETTE[si % PALETTE.length];
          const pts = data.map((r, i) => [px(i), py(Number(r[s.key]) || 0)]);
          if (!pts.length) return null;
          const line = pts.map(([a, b], i) => `${i ? "L" : "M"}${a},${b}`).join(" ");
          const area = `${line} L${pts[pts.length - 1][0]},${py(0)} L${pts[0][0]},${py(0)} Z`;
          return (
            <g key={s.key}>
              <path d={area} fill={`url(#${gid}-${si})`} />
              <path d={line} fill="none" stroke={color} strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" />
            </g>
          );
        })}
        {hover != null && data[hover] ? (
          <g>
            <line x1={px(hover)} x2={px(hover)} y1={PAD.top} y2={PAD.top + ih} stroke="var(--border-strong)" strokeDasharray="3 3" />
            {series.map((s, si) => (
              <circle key={s.key} cx={px(hover)} cy={py(Number(data[hover][s.key]) || 0)} r="3.5" fill="var(--surface)" stroke={s.color || PALETTE[si % PALETTE.length]} strokeWidth="2" />
            ))}
          </g>
        ) : null}
      </svg>
      {hover != null && data[hover] ? (
        <div
          className="pointer-events-none absolute top-0 z-10 rounded-md border border-border bg-surface px-2.5 py-1.5 text-ui-xs shadow-md"
          style={{ left: `${(px(hover) / W) * 100}%`, transform: `translateX(${px(hover) > W / 2 ? "-105%" : "5%"})` }}
        >
          <p className="font-medium text-fg">{formatX(data[hover][x])}</p>
          {series.map((s, si) => (
            <p key={s.key} className="flex items-center gap-1.5 text-fg-muted">
              <span className="size-2 rounded-xs" style={{ background: s.color || PALETTE[si % PALETTE.length] }} />
              {s.label || s.key}: <span className="font-medium tabular-nums text-fg">{format(data[hover][s.key])}</span>
            </p>
          ))}
        </div>
      ) : null}
      <Legend series={series} />
      <SrTable data={data} x={x} series={series} format={format} />
    </figure>
  );
}

/** Vertical bars (grouped when several series). Same props as AreaChart. `horizontal` for ranked lists. */
export function BarChart({ data = [], x = "x", series = [], height = 220, format = compactNumber, formatX = (v) => v, title = "Chart", className, horizontal = false }) {
  const [hover, setHover] = useHover();
  if (horizontal) {
    const s = series[0];
    const max = niceMax(Math.max(0, ...data.map((r) => Number(r[s?.key]) || 0)));
    return (
      <figure className={cn("grid gap-2", className)} aria-label={title}>
        {data.map((row, i) => {
          const v = Number(row[s?.key]) || 0;
          return (
            <div key={i} className="grid grid-cols-[minmax(0,9rem)_1fr_auto] items-center gap-3 text-ui-sm">
              <span className="truncate text-fg-muted" title={String(formatX(row[x]))}>
                {formatX(row[x])}
              </span>
              <span className="h-2 overflow-hidden rounded-full bg-surface-sunken">
                <span className="block h-full rounded-full" style={{ width: `${(v / max) * 100}%`, background: s?.color || PALETTE[0] }} />
              </span>
              <span className="tabular-nums text-fg">{format(v)}</span>
            </div>
          );
        })}
        <SrTable data={data} x={x} series={series} format={format} />
      </figure>
    );
  }
  const H = height;
  const iw = W - PAD.left - PAD.right;
  const ih = H - PAD.top - PAD.bottom;
  const max = niceMax(Math.max(0, ...data.flatMap((r) => series.map((s) => Number(r[s.key]) || 0))));
  const band = iw / Math.max(1, data.length);
  const bw = Math.max(2, (band * 0.7) / Math.max(1, series.length));
  const py = (v) => PAD.top + ih - (v / max) * ih;
  const ticks = [0, 0.5, 1].map((t) => t * max);
  const step = Math.max(1, Math.ceil(data.length / 8));
  return (
    <figure className={cn("relative", className)}>
      <svg viewBox={`0 0 ${W} ${H}`} className="h-auto w-full" role="img" aria-label={title} onMouseLeave={() => setHover(null)}>
        <title>{title}</title>
        {ticks.map((t) => (
          <g key={t}>
            <line x1={PAD.left} x2={W - PAD.right} y1={py(t)} y2={py(t)} stroke="var(--chart-grid)" />
            <text x={PAD.left - 6} y={py(t)} dy="0.32em" textAnchor="end" className="fill-fg-subtle text-[10px] tabular-nums">
              {format(t)}
            </text>
          </g>
        ))}
        {data.map((row, i) => {
          const x0 = PAD.left + i * band + (band - bw * series.length) / 2;
          return (
            <g key={i} onMouseEnter={() => setHover(i)}>
              <rect x={PAD.left + i * band} y={PAD.top} width={band} height={ih} fill="transparent" />
              {series.map((s, si) => {
                const v = Number(row[s.key]) || 0;
                return <rect key={s.key} x={x0 + si * bw} y={py(v)} width={bw - 1} height={Math.max(0, py(0) - py(v))} rx="2" fill={s.color || PALETTE[si % PALETTE.length]} opacity={hover == null || hover === i ? 1 : 0.45} />;
              })}
              {i % step === 0 ? (
                <text x={PAD.left + i * band + band / 2} y={H - 6} textAnchor="middle" className="fill-fg-subtle text-[10px]">
                  {formatX(row[x])}
                </text>
              ) : null}
            </g>
          );
        })}
      </svg>
      {hover != null && data[hover] ? (
        <div className="pointer-events-none absolute right-0 top-0 rounded-md border border-border bg-surface px-2.5 py-1.5 text-ui-xs shadow-md">
          <p className="font-medium text-fg">{formatX(data[hover][x])}</p>
          {series.map((s) => (
            <p key={s.key} className="text-fg-muted">
              {s.label || s.key}: <span className="font-medium tabular-nums text-fg">{format(data[hover][s.key])}</span>
            </p>
          ))}
        </div>
      ) : null}
      <Legend series={series} />
      <SrTable data={data} x={x} series={series} format={format} />
    </figure>
  );
}

/** <DonutChart data={[{ label: "Paid", value: 12 }, …]} format={number} centerLabel="Orders" /> */
export function DonutChart({ data = [], size = 160, thickness = 22, format = compactNumber, centerLabel, title = "Chart", className }) {
  const total = data.reduce((a, d) => a + (Number(d.value) || 0), 0);
  const r = (size - thickness) / 2;
  const c = 2 * Math.PI * r;
  let offset = 0;
  return (
    <figure className={cn("flex flex-wrap items-center gap-5", className)}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} role="img" aria-label={title}>
        <title>{title}</title>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="var(--surface-sunken)" strokeWidth={thickness} />
        {total > 0
          ? data.map((d, i) => {
              const len = ((Number(d.value) || 0) / total) * c;
              const el = (
                <circle
                  key={d.label}
                  cx={size / 2}
                  cy={size / 2}
                  r={r}
                  fill="none"
                  stroke={d.color || PALETTE[i % PALETTE.length]}
                  strokeWidth={thickness}
                  strokeDasharray={`${Math.max(0, len - 1.5)} ${c}`}
                  strokeDashoffset={-offset}
                  transform={`rotate(-90 ${size / 2} ${size / 2})`}
                />
              );
              offset += len;
              return el;
            })
          : null}
        <text x="50%" y="48%" textAnchor="middle" className="fill-fg text-[18px] font-semibold tabular-nums">
          {format(total)}
        </text>
        {centerLabel ? (
          <text x="50%" y="62%" textAnchor="middle" className="fill-fg-subtle text-[10px]">
            {centerLabel}
          </text>
        ) : null}
      </svg>
      <ul className="grid gap-1.5 text-ui-sm">
        {data.map((d, i) => (
          <li key={d.label} className="flex items-center gap-2">
            <span aria-hidden className="size-2.5 rounded-xs" style={{ background: d.color || PALETTE[i % PALETTE.length] }} />
            <span className="text-fg-muted">{d.label}</span>
            <span className="ml-auto pl-4 font-medium tabular-nums text-fg">{format(d.value)}</span>
          </li>
        ))}
      </ul>
    </figure>
  );
}

/** Inline trend line for tables / stat cards. */
export function Sparkline({ values = [], width = 80, height = 24, color = "var(--chart-1)", className }) {
  if (values.length < 2) return null;
  const max = Math.max(...values);
  const min = Math.min(...values);
  const span = max - min || 1;
  const d = values.map((v, i) => `${i ? "L" : "M"}${(i / (values.length - 1)) * width},${height - ((v - min) / span) * (height - 2) - 1}`).join(" ");
  return (
    <svg width={width} height={height} className={className} aria-hidden>
      <path d={d} fill="none" stroke={color} strokeWidth="1.5" strokeLinejoin="round" />
    </svg>
  );
}
