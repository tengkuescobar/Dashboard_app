import { useState } from "react";

// Fixed categorical order per the brief's chart palette.
export const SERIES = ["#6366f1", "#10b981", "#f59e0b", "#f43f5e", "#0ea5e9"];

function TipBox({ label, value, dot }) {
  return (
    <div className="pointer-events-none absolute right-2 top-0 z-10 rounded-lg bg-ink px-2.5 py-1.5 text-xs text-white shadow-lg">
      <div className="flex items-center gap-1.5 text-slate-300">
        <span className="h-2 w-2 rounded-sm" style={{ background: dot }} />
        {label}
      </div>
      <div className="mt-0.5 font-semibold">{value}</div>
    </div>
  );
}

// Show at most ~8 axis labels so 30 daily bars don't collide.
function labelStep(n) {
  return Math.max(1, Math.ceil(n / 8));
}

// ---- Bar chart (adaptive to bar count) -------------------------------------
export function BarChart({ data, color = "#6366f1" }) {
  const [hover, setHover] = useState(null);
  const max = Math.max(...data.map((d) => d.value));
  const W = 320;
  const H = 160;
  const pad = 4;
  const bw = (W - pad * 2) / data.length;
  const many = data.length > 14;
  const step = labelStep(data.length);
  return (
    <div className="relative h-full w-full">
      <svg viewBox={`0 0 ${W} ${H + 22}`} className="h-full w-full">
        {[0.25, 0.5, 0.75, 1].map((t) => (
          <line key={t} x1={0} x2={W} y1={H - H * t} y2={H - H * t} stroke="#f1f5f9" strokeWidth={1} />
        ))}
        {data.map((d, i) => {
          const h = (d.value / max) * (H - 12);
          const gap = many ? bw * 0.12 : bw * 0.18;
          const x = pad + i * bw + gap;
          const w = bw - gap * 2;
          const active = hover === i;
          return (
            <g key={i}>
              <rect
                x={x}
                y={H - h}
                width={w}
                height={h}
                rx={many ? 2 : 4}
                fill={color}
                opacity={hover === null || active ? 1 : 0.35}
                style={{ transition: "opacity .15s" }}
              />
              <rect
                x={pad + i * bw}
                y={0}
                width={bw}
                height={H}
                fill="transparent"
                onMouseEnter={() => setHover(i)}
                onMouseLeave={() => setHover(null)}
              />
              {i % step === 0 && (
                <text x={x + w / 2} y={H + 15} textAnchor="middle" fontSize={9} fill="#94a3b8">
                  {d.label}
                </text>
              )}
            </g>
          );
        })}
      </svg>
      {hover !== null && <TipBox label={data[hover].label} value={data[hover].value.toLocaleString()} dot={color} />}
    </div>
  );
}

// ---- Line / Area chart -----------------------------------------------------
export function LineChart({ data, color = "#0ea5e9", area = false }) {
  const [hover, setHover] = useState(null);
  const max = Math.max(...data.map((d) => d.value)) * 1.1;
  const W = 320;
  const H = 160;
  const px = (i) => (i / (data.length - 1)) * W;
  const py = (v) => H - (v / max) * (H - 10) - 4;
  const pts = data.map((d, i) => `${px(i)},${py(d.value)}`).join(" ");
  const step = labelStep(data.length);
  const showDots = data.length <= 14;
  return (
    <div className="relative h-full w-full">
      <svg viewBox={`0 0 ${W} ${H + 22}`} className="h-full w-full">
        {[0.25, 0.5, 0.75, 1].map((t) => (
          <line key={t} x1={0} x2={W} y1={H - H * t} y2={H - H * t} stroke="#f1f5f9" strokeWidth={1} />
        ))}
        <defs>
          <linearGradient id={`fill-${color.slice(1)}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity={area ? 0.32 : 0.18} />
            <stop offset="100%" stopColor={color} stopOpacity={0} />
          </linearGradient>
        </defs>
        <polygon points={`0,${H} ${pts} ${W},${H}`} fill={`url(#fill-${color.slice(1)})`} />
        <polyline points={pts} fill="none" stroke={color} strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" />
        {data.map((d, i) => (
          <g key={i}>
            {hover === i && (
              <line x1={px(i)} x2={px(i)} y1={0} y2={H} stroke={color} strokeWidth={1} strokeDasharray="3 3" opacity={0.5} />
            )}
            {(showDots || hover === i) && (
              <circle cx={px(i)} cy={py(d.value)} r={hover === i ? 5 : 3.5} fill="#fff" stroke={color} strokeWidth={2} />
            )}
            <rect
              x={px(i) - W / data.length / 2}
              y={0}
              width={W / data.length}
              height={H}
              fill="transparent"
              onMouseEnter={() => setHover(i)}
              onMouseLeave={() => setHover(null)}
            />
            {i % step === 0 && (
              <text x={px(i)} y={H + 15} textAnchor="middle" fontSize={9} fill="#94a3b8">
                {d.label}
              </text>
            )}
          </g>
        ))}
      </svg>
      {hover !== null && <TipBox label={data[hover].label} value={data[hover].value.toLocaleString()} dot={color} />}
    </div>
  );
}

// ---- Stacked bar -----------------------------------------------------------
export function StackedBar({ data, keys }) {
  const [hover, setHover] = useState(null);
  const max = Math.max(...data.map((d) => d.parts.reduce((s, v) => s + v, 0)));
  const W = 320;
  const H = 160;
  const bw = W / data.length;
  const step = labelStep(data.length);
  return (
    <div className="relative flex h-full w-full flex-col">
      <svg viewBox={`0 0 ${W} ${H + 22}`} className="min-h-0 w-full flex-1">
        {data.map((d, i) => {
          let acc = 0;
          const gap = bw * 0.2;
          return (
            <g key={i} onMouseEnter={() => setHover(i)} onMouseLeave={() => setHover(null)}>
              {d.parts.map((v, k) => {
                const h = (v / max) * (H - 12);
                acc += h;
                const y = H - acc;
                return (
                  <rect
                    key={k}
                    x={i * bw + gap}
                    y={y + (k > 0 ? 2 : 0)}
                    width={bw - gap * 2}
                    height={Math.max(0, h - (k > 0 ? 2 : 0))}
                    rx={2}
                    fill={SERIES[k % SERIES.length]}
                    opacity={hover === null || hover === i ? 1 : 0.4}
                  />
                );
              })}
              {i % step === 0 && (
                <text x={i * bw + bw / 2} y={H + 15} textAnchor="middle" fontSize={9} fill="#94a3b8">
                  {d.label}
                </text>
              )}
            </g>
          );
        })}
      </svg>
      <Legend keys={keys} />
    </div>
  );
}

// ---- Variance: this year vs last year (grouped) ----------------------------
export function VarianceBar({ data }) {
  const [hover, setHover] = useState(null);
  const max = Math.max(...data.flatMap((d) => [d.current, d.previous]));
  const W = 320;
  const H = 160;
  const gw = W / data.length;
  return (
    <div className="relative flex h-full w-full flex-col">
      <svg viewBox={`0 0 ${W} ${H + 22}`} className="min-h-0 w-full flex-1">
        {[0.25, 0.5, 0.75, 1].map((t) => (
          <line key={t} x1={0} x2={W} y1={H - H * t} y2={H - H * t} stroke="#f1f5f9" strokeWidth={1} />
        ))}
        {data.map((d, i) => {
          const bw = (gw * 0.62) / 2;
          const x0 = i * gw + gw * 0.19;
          const hp = (d.previous / max) * (H - 12);
          const hc = (d.current / max) * (H - 12);
          const up = d.current >= d.previous;
          return (
            <g key={i} onMouseEnter={() => setHover(i)} onMouseLeave={() => setHover(null)}>
              <rect x={x0} y={H - hp} width={bw} height={hp} rx={2} fill="#cbd5e1" opacity={hover === null || hover === i ? 1 : 0.4} />
              <rect
                x={x0 + bw + 2}
                y={H - hc}
                width={bw}
                height={hc}
                rx={2}
                fill={up ? SERIES[1] : SERIES[3]}
                opacity={hover === null || hover === i ? 1 : 0.4}
              />
              <text x={i * gw + gw / 2} y={H + 15} textAnchor="middle" fontSize={9} fill="#94a3b8">
                {d.label}
              </text>
            </g>
          );
        })}
      </svg>
      {hover !== null && (
        <div className="pointer-events-none absolute right-2 top-0 z-10 rounded-lg bg-ink px-2.5 py-1.5 text-xs text-white shadow-lg">
          <div className="text-slate-300">{data[hover].label}</div>
          <div className="mt-0.5 font-semibold">
            {data[hover].current.toLocaleString()}{" "}
            <span className={data[hover].current >= data[hover].previous ? "text-emerald" : "text-rose"}>
              {data[hover].current >= data[hover].previous ? "▲" : "▼"}
              {Math.round((Math.abs(data[hover].current - data[hover].previous) / data[hover].previous) * 100)}%
            </span>
          </div>
          <div className="text-slate-400">vs {data[hover].previous.toLocaleString()} LY</div>
        </div>
      )}
      <div className="mt-1 flex justify-center gap-4 text-[11px] text-ink-soft">
        <span className="flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-sm bg-slate-300" /> Last year
        </span>
        <span className="flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-sm" style={{ background: SERIES[1] }} /> This year
        </span>
      </div>
    </div>
  );
}

// ---- Donut -----------------------------------------------------------------
export function DonutChart({
  data,
  activeSlice,
  forceTooltip,
  hoverLegend,
}) {
  const [hoverState, setHover] = useState(null);
  const [selected, setSelected] = useState(null);
  const toggle = (i) => setSelected((s) => (s === i ? null : i));
  // Click filters (isolates) a slice; hover only previews.
  const hover = selected ?? (activeSlice !== undefined ? activeSlice : hoverState);
  const total = data.reduce((s, d) => s + d.value, 0);
  const R = 52;
  const cx = 70;
  const cy = 70;
  let acc = 0;
  const arc = (start, end, radius) => {
    const a0 = (start / total) * 2 * Math.PI - Math.PI / 2;
    const a1 = (end / total) * 2 * Math.PI - Math.PI / 2;
    const large = end - start > total / 2 ? 1 : 0;
    return `M ${cx + radius * Math.cos(a0)} ${cy + radius * Math.sin(a0)} A ${radius} ${radius} 0 ${large} 1 ${cx + radius * Math.cos(a1)} ${cy + radius * Math.sin(a1)}`;
  };
  return (
    <div className="relative flex h-full w-full items-center justify-center gap-4">
      <svg viewBox="0 0 140 140" width={140} height={140} className="shrink-0">
        {data.map((d, i) => {
          const start = acc;
          const end = acc + d.value;
          acc = end;
          const active = hover === i;
          const dim = selected !== null ? 0.12 : 0.4;
          return (
            <path
              key={i}
              d={arc(start, end, R)}
              fill="none"
              stroke={SERIES[i % SERIES.length]}
              strokeWidth={active ? 24 : 18}
              opacity={hover === null || active ? 1 : dim}
              onMouseEnter={() => setHover(i)}
              onMouseLeave={() => setHover(null)}
              onClick={() => toggle(i)}
              style={{ transition: "stroke-width .15s, opacity .15s", cursor: "pointer" }}
            />
          );
        })}
        {selected !== null ? (
          <>
            <text x={cx} y={cy - 4} textAnchor="middle" fontSize={16} fontWeight={700} fill="#0f172a">
              {Math.round((data[selected].value / total) * 100)}%
            </text>
            <text x={cx} y={cy + 10} textAnchor="middle" fontSize={8} fill="#94a3b8">
              {data[selected].label.toUpperCase()}
            </text>
          </>
        ) : (
          <>
            <text x={cx} y={cy - 2} textAnchor="middle" fontSize={16} fontWeight={700} fill="#0f172a">
              {total.toLocaleString()}
            </text>
            <text x={cx} y={cy + 12} textAnchor="middle" fontSize={8} fill="#94a3b8">
              TOTAL
            </text>
          </>
        )}
      </svg>
      <ul className="flex flex-col gap-0.5 text-xs">
        {data.map((d, i) => (
          <li key={i}>
            <button
              type="button"
              onMouseEnter={() => setHover(i)}
              onMouseLeave={() => setHover(null)}
              onClick={() => toggle(i)}
              className={`flex w-full items-center gap-2 rounded-md px-2 py-1 text-left transition-all ${
                selected === i ? "bg-indigo-soft ring-1 ring-indigo/30" : hover === i || hoverLegend === i ? "bg-slate-100" : ""
              } ${selected !== null && selected !== i ? "opacity-40" : ""}`}
            >
              <span className="h-2.5 w-2.5 rounded-sm" style={{ background: SERIES[i % SERIES.length] }} />
              <span className="text-ink-soft">{d.label}</span>
              <span className="ml-auto font-medium tabular-nums text-ink">{Math.round((d.value / total) * 100)}%</span>
            </button>
          </li>
        ))}
        {selected !== null && (
          <li>
            <button type="button" onClick={() => setSelected(null)} className="mt-1 w-full rounded-md px-2 py-1 text-left text-[11px] font-medium text-indigo hover:underline">
              Clear filter
            </button>
          </li>
        )}
      </ul>
      {(hover !== null && (forceTooltip ?? true) && (activeSlice !== undefined || hoverState !== null)) && (
        <div className="pointer-events-none absolute left-12 top-2 z-10 rounded-lg bg-ink px-2.5 py-1.5 text-xs text-white shadow-lg">
          <div className="flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-sm" style={{ background: SERIES[(hover ?? 0) % SERIES.length] }} />
            {data[hover ?? 0]?.label}
          </div>
          <div className="mt-0.5 font-semibold">
            {Math.round((data[hover ?? 0]?.value / total) * 100)}% · {data[hover ?? 0]?.value.toLocaleString()}
          </div>
        </div>
      )}
    </div>
  );
}

// ---- Geo: tile cartogram with sequential fill ------------------------------
export function GeoChart({ tiles }) {
  const [hover, setHover] = useState(null);
  const max = Math.max(...tiles.map((t) => t.value));
  const min = Math.min(...tiles.map((t) => t.value));
  const cols = Math.max(...tiles.map((t) => t.col)) + 1;
  const rows = Math.max(...tiles.map((t) => t.row)) + 1;
  const size = 30;
  const gap = 4;
  const shade = (v) => {
    const t = (v - min) / (max - min || 1);
    // sequential single-hue indigo, light -> dark
    return `rgba(79,70,229,${0.16 + t * 0.84})`;
  };
  return (
    <div className="relative flex h-full w-full flex-col items-center justify-center">
      <svg viewBox={`0 0 ${cols * (size + gap)} ${rows * (size + gap)}`} className="mx-auto w-full max-w-[240px]">
        {tiles.map((t, i) => (
          <g key={t.code} onMouseEnter={() => setHover(i)} onMouseLeave={() => setHover(null)}>
            <rect
              x={t.col * (size + gap)}
              y={t.row * (size + gap)}
              width={size}
              height={size}
              rx={5}
              fill={shade(t.value)}
              stroke={hover === i ? "#4f46e5" : "transparent"}
              strokeWidth={2}
            />
            <text
              x={t.col * (size + gap) + size / 2}
              y={t.row * (size + gap) + size / 2 + 3}
              textAnchor="middle"
              fontSize={9}
              fontWeight={600}
              fill={(t.value - min) / (max - min || 1) > 0.55 ? "#fff" : "#4f46e5"}
            >
              {t.code}
            </text>
          </g>
        ))}
      </svg>
      <div className="mt-2 flex items-center justify-center gap-2 text-[10px] text-ink-faint">
        <span>Low</span>
        <span className="h-2 w-24 rounded-full" style={{ background: "linear-gradient(90deg,rgba(79,70,229,.16),rgba(79,70,229,1))" }} />
        <span>High</span>
      </div>
      {hover !== null && (
        <div className="pointer-events-none absolute right-2 top-0 z-10 rounded-lg bg-ink px-2.5 py-1.5 text-xs text-white shadow-lg">
          <div className="text-slate-300">{tiles[hover].name}</div>
          <div className="mt-0.5 font-semibold">{tiles[hover].value.toLocaleString()} users</div>
        </div>
      )}
    </div>
  );
}

// ---- Heatmap (weekday x week) ----------------------------------------------
export function Heatmap({ matrix, rows }) {
  const [hover, setHover] = useState(null);
  const max = Math.max(...matrix.flat());
  const cols = matrix[0].length;
  return (
    <div className="relative mx-auto flex h-full w-full max-w-[380px] items-center">
      <div className="flex w-full gap-2">
        <div className="flex flex-col justify-between py-0.5 text-[10px] text-ink-faint">
          {rows.map((r) => (
            <span key={r} className="h-4 leading-4">
              {r}
            </span>
          ))}
        </div>
        <div className="grid flex-1 gap-1" style={{ gridTemplateColumns: `repeat(${cols}, minmax(0,1fr))` }}>
          {matrix.map((row, r) =>
            row.map((v, c) => (
              <div
                key={`${r}-${c}`}
                onMouseEnter={() => setHover({ r, c })}
                onMouseLeave={() => setHover(null)}
                className="aspect-square rounded-sm transition-transform hover:scale-110"
                style={{ background: `rgba(16,185,129,${0.12 + (v / max) * 0.88})` }}
              />
            )),
          )}
        </div>
      </div>
      {hover && (
        <div className="pointer-events-none absolute right-2 top-0 z-10 rounded-lg bg-ink px-2.5 py-1.5 text-xs font-semibold text-white shadow-lg">
          {matrix[hover.r][hover.c].toLocaleString()} events
        </div>
      )}
    </div>
  );
}

// ---- Gauge -----------------------------------------------------------------
export function Gauge({ value, max = 100, label }) {
  const pct = Math.min(1, value / max);
  const R = 60;
  const cx = 80;
  const cy = 80;
  const a0 = Math.PI;
  const a1 = Math.PI - pct * Math.PI;
  const arcPath = (from, to) =>
    `M ${cx + R * Math.cos(from)} ${cy - R * Math.sin(from)} A ${R} ${R} 0 ${to - from > Math.PI ? 1 : 0} 1 ${cx + R * Math.cos(to)} ${cy - R * Math.sin(to)}`;
  const color = pct > 0.66 ? SERIES[1] : pct > 0.33 ? SERIES[2] : SERIES[3];
  return (
    <div className="flex h-full w-full flex-col items-center justify-center">
      <svg viewBox="0 0 160 100" className="w-full max-w-[220px]">
        <path d={arcPath(a0, 0)} fill="none" stroke="#f1f5f9" strokeWidth={14} strokeLinecap="round" />
        <path d={arcPath(a0, a1)} fill="none" stroke={color} strokeWidth={14} strokeLinecap="round" />
        <text x={cx} y={cy - 8} textAnchor="middle" fontSize={26} fontWeight={700} fill="#0f172a">
          {value}
          <tspan fontSize={13} fill="#94a3b8">
            %
          </tspan>
        </text>
        <text x={cx} y={cy + 12} textAnchor="middle" fontSize={10} fill="#94a3b8">
          {label}
        </text>
      </svg>
    </div>
  );
}

function Legend({ keys }) {
  return (
    <div className="mt-1 flex flex-wrap justify-center gap-3 text-[11px] text-ink-soft">
      {keys.map((k, i) => (
        <span key={k} className="flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-sm" style={{ background: SERIES[i % SERIES.length] }} />
          {k}
        </span>
      ))}
    </div>
  );
}
