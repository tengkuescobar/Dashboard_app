import { useEffect, useRef, useState } from "react";
import {
  BarChart,
  DonutChart,
  Gauge,
  GeoChart,
  Heatmap,
  LineChart,
  SERIES,
  StackedBar,
  VarianceBar,
} from "./charts";
import {
  IconArea,
  IconBag,
  IconBolt,
  IconCalendar,
  IconChart,
  IconCheck,
  IconChevronDown,
  IconChevronLeft,
  IconClose,
  IconCloud,
  IconCode,
  IconCompare,
  IconCopy,
  IconDonut,
  IconDots,
  IconEdit,
  IconFolder,
  IconGauge,
  IconGlobe,
  IconGrid,
  IconGrip,
  IconInfo,
  IconLayers,
  IconLine,
  IconPlus,
  IconRefresh,
  IconSend,
  IconSparkle,
  IconStar,
  IconTarget,
  IconTrash,
  IconUpload,
  IconUsers,
  IconWarning,
  IconWifi,
} from "./icons";
import {
  donutData,
  geoTiles,
  months12,
  heatmapMatrix,
  heatmapRows,
  type Range,
  rangeLabel,
  series,
  stackedData,
  stackedKeys,
  varianceData,
} from "./data";

// ---------------------------------------------------------------------------
// Icon registry (page icons are stored as a string key so they stay swappable)
// ---------------------------------------------------------------------------
const ICONS: Record<string, typeof IconChart> = {
  chart: IconChart,
  line: IconLine,
  donut: IconDonut,
  area: IconArea,
  globe: IconGlobe,
  grid: IconGrid,
  gauge: IconGauge,
  compare: IconCompare,
  star: IconStar,
  bolt: IconBolt,
  target: IconTarget,
  bag: IconBag,
  users: IconUsers,
  calendar: IconCalendar,
};
const ICON_KEYS = Object.keys(ICONS);

// ---------------------------------------------------------------------------
// Types + seed data
// ---------------------------------------------------------------------------
type ChartType = "bar" | "line" | "area" | "stacked" | "variance" | "donut" | "geo" | "heatmap" | "gauge" | "summary";
type Chart = { id: string; type: ChartType; title: string; x: number; y: number; w: number; h: number; broken?: boolean };

// First empty cell (row-major) where a w×h block fits, gaps allowed.
function firstFree(charts: Chart[], w: number, h: number, cols: number) {
  const occ: boolean[][] = [];
  const mark = (x: number, y: number, cw: number, ch: number) => {
    for (let r = y; r < y + ch; r++) {
      occ[r] = occ[r] || [];
      for (let c = x; c < x + cw; c++) occ[r][c] = true;
    }
  };
  charts.forEach((c) => mark(c.x, c.y, Math.min(c.w, cols), c.h));
  const fits = (x: number, y: number) => {
    for (let r = y; r < y + h; r++) for (let c = x; c < x + w; c++) if (occ[r]?.[c]) return false;
    return true;
  };
  for (let y = 0; ; y++) for (let x = 0; x <= cols - w; x++) if (fits(x, y)) return { x, y };
}

// Do two w×h blocks overlap?
function overlaps(a: { x: number; y: number; w: number; h: number }, b: { x: number; y: number; w: number; h: number }) {
  return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
}

// Drop `id` at (tx,ty). Same-size collision → swap; otherwise place it and
// relocate any displaced charts to the nearest free cells (no card buried).
function resolveDrop(charts: Chart[], id: string, tx: number, ty: number, cols: number): Chart[] {
  const moving = charts.find((c) => c.id === id);
  if (!moving) return charts;
  const w = Math.min(moving.w, cols);
  const target = { ...moving, x: Math.max(0, Math.min(tx, cols - w)), y: Math.max(0, ty), w };
  const others = charts.filter((c) => c.id !== id);
  const hit = others.filter((c) => overlaps(target, c));
  // Single same-size collision → clean swap, but only if the swap itself
  // doesn't leave the two cards overlapping (adjacent 2×2 blocks etc.).
  if (hit.length === 1 && hit[0].w === moving.w && hit[0].h === moving.h) {
    const swapped = { ...hit[0], x: moving.x, y: moving.y };
    if (!overlaps(target, swapped)) {
      return charts.map((c) => (c.id === id ? target : c.id === hit[0].id ? swapped : c));
    }
  }
  // Otherwise: keep the drop position, bump displaced charts to first free cell.
  const placed: Chart[] = [target, ...others.filter((c) => !hit.includes(c))];
  [...hit]
    .sort((a, b) => a.y - b.y || a.x - b.x)
    .forEach((c) => {
      const pos = firstFree(placed, Math.min(c.w, cols), c.h, cols);
      placed.push({ ...c, x: pos.x, y: pos.y });
    });
  const byId = new Map(placed.map((c) => [c.id, c]));
  return charts.map((c) => byId.get(c.id) ?? c);
}

// Neatly pack a set of charts into a fresh grid (used for seed data).
function packLayout(charts: Chart[], cols: number): Chart[] {
  const placed: Chart[] = [];
  for (const ch of charts) {
    const w = Math.min(ch.w, cols);
    const pos = firstFree(placed, w, ch.h, cols);
    placed.push({ ...ch, x: pos.x, y: pos.y, w });
  }
  return placed;
}
type Page = { id: string; name: string; icon: string; folderId: string | null; charts: Chart[] };
type Folder = { id: string; name: string; collapsed: boolean };
type AiKey = { id: string; provider: string; label: string; masked: string; active: boolean };

const uid = () => Math.random().toString(36).slice(2, 9);

const typeMeta: Record<ChartType, { icon: typeof IconChart; label: string; w: number; h: number }> = {
  bar: { icon: IconChart, label: "Bar Chart", w: 1, h: 1 },
  line: { icon: IconLine, label: "Line Chart", w: 1, h: 1 },
  area: { icon: IconArea, label: "Area Chart", w: 2, h: 1 },
  stacked: { icon: IconLayers, label: "Stacked Bar", w: 1, h: 1 },
  variance: { icon: IconCompare, label: "Variance (YoY)", w: 2, h: 1 },
  donut: { icon: IconDonut, label: "Donut Chart", w: 1, h: 1 },
  geo: { icon: IconGlobe, label: "Geo Map", w: 1, h: 2 },
  heatmap: { icon: IconGrid, label: "Heatmap", w: 2, h: 1 },
  gauge: { icon: IconGauge, label: "Gauge / KPI", w: 1, h: 1 },
  summary: { icon: IconCode, label: "Custom (YAML)", w: 1, h: 1 },
};

const mk = (type: ChartType, title: string, broken?: boolean): Chart => ({
  id: uid(),
  type,
  title,
  x: 0,
  y: 0,
  w: typeMeta[type].w,
  h: typeMeta[type].h,
  broken,
});

const seedFolders: Folder[] = [
  { id: "f1", name: "Revenue", collapsed: false },
  { id: "f2", name: "Product", collapsed: false },
];
const rawSeedPages: Page[] = [
  {
    id: "p1",
    name: "Sales Overview",
    icon: "chart",
    folderId: "f1",
    charts: [
      mk("bar", "Revenue by Month"),
      mk("variance", "Revenue YoY"),
      mk("line", "Weekly Signups"),
      mk("donut", "Traffic Sources"),
      mk("gauge", "Quota Attainment"),
      mk("geo", "Users by Country"),
    ],
  },
  {
    id: "p2",
    name: "Marketing Report",
    icon: "line",
    folderId: "f1",
    charts: [mk("area", "Campaign Reach"), mk("stacked", "Cohorts"), mk("donut", "Lead Sources", true)],
  },
  { id: "p3", name: "Product Analytics", icon: "grid", folderId: "f2", charts: [] },
];
const seedPages: Page[] = rawSeedPages.map((p) => ({ ...p, charts: packLayout(p.charts, 3) }));

// ---------------------------------------------------------------------------
// Primitives
// ---------------------------------------------------------------------------
const inputCls =
  "w-full rounded-lg border border-line bg-white px-3 py-2.5 text-sm text-ink outline-none transition-colors placeholder:text-ink-faint focus:border-indigo focus:ring-2 focus:ring-indigo/20";

function Btn({
  children,
  variant = "primary",
  className = "",
  ...props
}: {
  children: React.ReactNode;
  variant?: "primary" | "outline" | "danger" | "ghost";
} & React.ButtonHTMLAttributes<HTMLButtonElement>) {
  const styles = {
    primary: "bg-indigo text-white hover:bg-indigo-dark shadow-sm disabled:opacity-60",
    outline: "border border-line bg-white text-ink-soft hover:bg-slate-50",
    danger: "bg-rose text-white hover:brightness-95 shadow-sm",
    ghost: "text-ink-soft hover:bg-slate-100",
  }[variant];
  return (
    <button
      className={`inline-flex items-center justify-center gap-1.5 rounded-lg px-3.5 py-2 text-sm font-medium transition-colors ${styles} ${className}`}
      {...props}
    >
      {children}
    </button>
  );
}

function Field({ label, error, children }: { label: string; error?: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-xs font-medium text-ink-soft">{label}</span>
      {children}
      {error && <span className="mt-1 block text-xs text-rose">{error}</span>}
    </label>
  );
}

function Dots({ active }: { active: number }) {
  return (
    <div className="flex items-center gap-1.5">
      {[0, 1, 2].map((i) => (
        <span key={i} className={`h-1.5 rounded-full transition-all ${i === active ? "w-5 bg-indigo" : "w-1.5 bg-slate-300"}`} />
      ))}
    </div>
  );
}

function Select({ children, ...props }: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <div className="relative">
      <select className={`${inputCls} appearance-none pr-9`} {...props}>
        {children}
      </select>
      <IconChevronDown width={14} className="pointer-events-none absolute right-3 top-3.5 text-ink-faint" />
    </div>
  );
}

// A small custom dropdown used in the filter bar.
function Dropdown({
  icon,
  value,
  options,
  onChange,
}: {
  icon?: React.ReactNode;
  value: string;
  options: { value: string; label: string }[];
  onChange: (v: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const current = options.find((o) => o.value === value);
  return (
    <div className="relative">
      <button
        onClick={() => setOpen((o) => !o)}
        className="flex items-center gap-2 rounded-lg border border-line bg-white px-3 py-2 text-sm font-medium text-ink-soft transition-colors hover:bg-slate-50"
      >
        {icon}
        {current?.label}
        <IconChevronDown width={14} className="text-ink-faint" />
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
          <div className="absolute left-0 top-11 z-20 w-48 overflow-hidden rounded-lg border border-line bg-white py-1 text-sm shadow-lg">
            {options.map((o) => (
              <button
                key={o.value}
                onClick={() => {
                  onChange(o.value);
                  setOpen(false);
                }}
                className={`flex w-full items-center justify-between px-3 py-2 text-left hover:bg-slate-50 ${
                  o.value === value ? "font-medium text-indigo-dark" : "text-ink-soft"
                }`}
              >
                {o.label}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Chart renderer
// ---------------------------------------------------------------------------
function ChartBody({ chart, range }: { chart: Chart; range: Range }) {
  const [state, setState] = useState<"ok" | "loading">("ok");
  const [errored, setErrored] = useState(!!chart.broken);

  if (errored) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-2 text-center">
        <span className="flex h-11 w-11 items-center justify-center rounded-full bg-rose/10 text-rose">
          <IconWarning width={22} />
        </span>
        <div className="text-sm font-medium text-ink">Gagal memuat data</div>
        <Btn
          variant="outline"
          className="mt-1 px-3 py-1.5 text-xs"
          onClick={() => {
            setErrored(false);
            setState("loading");
            setTimeout(() => setState("ok"), 1100);
          }}
        >
          <IconRefresh width={14} /> Coba Lagi
        </Btn>
      </div>
    );
  }
  if (state === "loading") {
    return (
      <div className="flex flex-1 items-end gap-2 px-1 py-4">
        {[40, 70, 55, 85, 65, 90].map((h, i) => (
          <div key={i} className="shimmer flex-1 rounded-md bg-slate-100" style={{ height: `${h}%` }} />
        ))}
      </div>
    );
  }
  const s = series(range);
  switch (chart.type) {
    case "bar":
      return <BarChart data={s} />;
    case "line":
      return <LineChart data={s} />;
    case "area":
      return <LineChart data={s} color={SERIES[4]} area />;
    case "stacked":
      return <StackedBar data={stackedData} keys={stackedKeys} />;
    case "variance":
      return <VarianceBar data={varianceData} />;
    case "donut":
      return <DonutChart data={donutData} />;
    case "geo":
      return <GeoChart tiles={geoTiles} />;
    case "heatmap":
      return <Heatmap matrix={heatmapMatrix} rows={heatmapRows} />;
    case "gauge":
      return <Gauge value={78} label="of $92K target" />;
    default:
      return (
        <div className="flex flex-1 flex-col justify-center gap-4">
          <div>
            <div className="text-xs text-ink-faint">Total Revenue</div>
            <div className="mt-1 flex items-baseline gap-2">
              <span className="text-3xl font-bold tracking-tight text-ink">$72,480</span>
              <span className="text-sm font-medium text-emerald">+12.4%</span>
            </div>
          </div>
          <div className="h-px bg-line" />
          <div className="grid grid-cols-2 gap-3">
            <div>
              <div className="text-xs text-ink-faint">New Customers</div>
              <div className="text-lg font-semibold text-ink">1,284</div>
            </div>
            <div>
              <div className="text-xs text-ink-faint">Churn</div>
              <div className="text-lg font-semibold text-ink">2.1%</div>
            </div>
          </div>
        </div>
      );
  }
}

// ---------------------------------------------------------------------------
// Draggable + resizable chart card
// ---------------------------------------------------------------------------
function ChartCard({
  chart,
  range,
  gridRef,
  cols,
  onDelete,
  onDuplicate,
  onResize,
  drag,
}: {
  chart: Chart;
  range: Range;
  gridRef: React.RefObject<HTMLDivElement | null>;
  cols: number;
  onDelete: () => void;
  onDuplicate: () => void;
  onResize: (w: number, h: number) => void;
  drag: {
    onDragStart: () => void;
    onDragEnd: () => void;
    dragging: boolean;
  };
}) {
  const [menu, setMenu] = useState(false);

  const startResize = (e: React.PointerEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const grid = gridRef.current;
    if (!grid) return;
    const gap = 16;
    const colW = (grid.clientWidth - gap * (cols - 1)) / cols;
    const rowH = 248 + gap;
    const sx = e.clientX;
    const sy = e.clientY;
    const sw = chart.w;
    const sh = chart.h;
    const target = e.currentTarget as HTMLElement;
    target.setPointerCapture(e.pointerId);
    const move = (ev: PointerEvent) => {
      const w = Math.min(cols, Math.max(1, Math.round(sw + (ev.clientX - sx) / colW)));
      const h = Math.min(2, Math.max(1, Math.round(sh + (ev.clientY - sy) / rowH)));
      onResize(w, h);
    };
    const up = () => {
      target.removeEventListener("pointermove", move);
      target.removeEventListener("pointerup", up);
    };
    target.addEventListener("pointermove", move);
    target.addEventListener("pointerup", up);
  };

  return (
    <div
      draggable
      onDragStart={drag.onDragStart}
      onDragEnd={drag.onDragEnd}
      style={{
        gridColumn: `${Math.min(chart.x, cols - Math.min(chart.w, cols)) + 1} / span ${Math.min(chart.w, cols)}`,
        gridRow: `${chart.y + 1} / span ${chart.h}`,
      }}
      className={`group relative z-[1] flex min-h-0 flex-col rounded-xl border border-line bg-white p-4 shadow-sm transition-all hover:border-indigo/50 hover:shadow-[0_8px_28px_-8px_rgba(99,102,241,0.35)] ${
        drag.dragging ? "opacity-40" : ""
      }`}
    >
      <div className="mb-3 flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <span className="cursor-grab text-ink-faint opacity-0 transition-opacity group-hover:opacity-100 active:cursor-grabbing">
            <IconGrip width={16} />
          </span>
          <h3 className="text-sm font-semibold text-ink">{chart.title}</h3>
        </div>
        <button
          onClick={() => setMenu((m) => !m)}
          className={`rounded p-1 text-ink-faint transition-opacity hover:bg-slate-100 hover:text-ink ${
            menu ? "opacity-100" : "opacity-0 group-hover:opacity-100"
          }`}
        >
          <IconDots width={16} />
        </button>
      </div>
      <div className="flex min-h-0 flex-1 flex-col justify-center">
        <ChartBody chart={chart} range={range} />
      </div>

      {menu && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setMenu(false)} />
          <div className="absolute right-3 top-10 z-20 w-40 overflow-hidden rounded-lg border border-line bg-white py-1 text-sm shadow-lg">
            <div className="px-3 py-1.5 text-[11px] font-semibold uppercase tracking-wide text-ink-faint">Size</div>
            <div className="flex gap-1 px-3 pb-2">
              {[1, 2, 3].map((w) => (
                <button
                  key={w}
                  onClick={() => onResize(w, chart.h)}
                  className={`h-7 flex-1 rounded border text-xs ${
                    chart.w === w ? "border-indigo bg-indigo-soft text-indigo-dark" : "border-line text-ink-soft hover:bg-slate-50"
                  }`}
                >
                  {w}×
                </button>
              ))}
            </div>
            <button
              onClick={() => onResize(chart.w, chart.h === 1 ? 2 : 1)}
              className="flex w-full items-center gap-2 px-3 py-1.5 text-ink-soft hover:bg-slate-50"
            >
              <IconChart width={14} /> {chart.h === 1 ? "Make taller" : "Make shorter"}
            </button>
            <div className="my-1 h-px bg-line" />
            <button onClick={() => { onDuplicate(); setMenu(false); }} className="flex w-full items-center gap-2 px-3 py-1.5 text-ink-soft hover:bg-slate-50">
              <IconCopy width={14} /> Duplicate
            </button>
            <button onClick={() => { onDelete(); setMenu(false); }} className="flex w-full items-center gap-2 px-3 py-1.5 text-rose hover:bg-rose/5">
              <IconTrash width={14} /> Delete
            </button>
          </div>
        </>
      )}

      {/* Resize handle */}
      <span
        onPointerDown={startResize}
        className="absolute bottom-1 right-1 cursor-nwse-resize p-1 text-ink-faint opacity-0 transition-opacity group-hover:opacity-100"
        title="Drag to resize"
      >
        <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
          <path d="M11 5 5 11M11 9l-2 2" />
        </svg>
      </span>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Icon picker popover
// ---------------------------------------------------------------------------
function IconPicker({ value, onPick, onClose }: { value: string; onPick: (k: string) => void; onClose: () => void }) {
  return (
    <>
      <div className="fixed inset-0 z-20" onClick={onClose} />
      <div className="absolute left-1 top-9 z-30 w-52 rounded-lg border border-line bg-white p-2 shadow-lg">
        <div className="mb-1.5 px-1 text-[11px] font-semibold uppercase tracking-wide text-ink-faint">Change icon</div>
        <div className="grid grid-cols-5 gap-1">
          {ICON_KEYS.map((k) => {
            const Icon = ICONS[k];
            return (
              <button
                key={k}
                onClick={() => {
                  onPick(k);
                  onClose();
                }}
                className={`flex h-8 items-center justify-center rounded-md transition-colors ${
                  value === k ? "bg-indigo text-white" : "text-ink-soft hover:bg-slate-100"
                }`}
              >
                <Icon width={16} />
              </button>
            );
          })}
        </div>
      </div>
    </>
  );
}

// ---------------------------------------------------------------------------
// Toasts
// ---------------------------------------------------------------------------
type Toast = { id: string; tone: "emerald" | "rose" | "indigo" | "amber"; text: string };
const toastIcon = { emerald: <IconCloud width={18} />, rose: <IconWarning width={18} />, indigo: <IconRefresh width={18} />, amber: <IconWifi width={18} /> };
function ToastStack({ toasts, dismiss }: { toasts: Toast[]; dismiss: (id: string) => void }) {
  const map = { emerald: "text-emerald bg-emerald/10", rose: "text-rose bg-rose/10", indigo: "text-indigo bg-indigo/10", amber: "text-amber bg-amber/10" };
  return (
    <div className="pointer-events-none fixed right-5 top-5 z-50 flex flex-col gap-3">
      {toasts.map((t) => (
        <div
          key={t.id}
          className="pointer-events-auto flex w-80 items-center gap-3 rounded-xl border border-line bg-white p-3 shadow-[0_8px_30px_-8px_rgba(15,23,42,0.25)]"
          style={{ animation: "toast-in .3s ease" }}
        >
          <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${map[t.tone]}`}>{toastIcon[t.tone]}</span>
          <span className="text-sm font-medium text-ink">{t.text}</span>
          <button onClick={() => dismiss(t.id)} className="ml-auto rounded p-1 text-ink-faint hover:bg-slate-100 hover:text-ink">
            <IconClose width={16} />
          </button>
        </div>
      ))}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Add Chart wizard
// ---------------------------------------------------------------------------
function AddChartModal({ onClose, onPublish }: { onClose: () => void; onPublish: (c: Chart) => void }) {
  const [tab, setTab] = useState<"builder" | "ai">("builder");
  const [step, setStep] = useState(0);
  const [type, setType] = useState<ChartType>("bar");
  const [title, setTitle] = useState("");
  const [titleErr, setTitleErr] = useState(false);
  const [customTab, setCustomTab] = useState<"upload" | "write">("write");
  const [yamlErr, setYamlErr] = useState(true);
  const [publishing, setPublishing] = useState(false);
  const [ai, setAi] = useState("");
  const [aiState, setAiState] = useState<"idle" | "thinking" | "result" | "noData">("idle");

  const isCustom = type === "summary";

  const goPreview = () => {
    if (!isCustom && !title.trim()) {
      setTitleErr(true);
      return;
    }
    setStep(2);
  };
  const publish = () => {
    setPublishing(true);
    setTimeout(() => onPublish({ ...mk(type, title.trim() || typeMeta[type].label) }), 1000);
  };
  const runAi = () => {
    if (!ai.trim()) return;
    setAiState("thinking");
    setTimeout(() => setAiState(/revenue|region|sales|bar|line|trend|source|country|geo/i.test(ai) ? "result" : "noData"), 1400);
  };

  return (
    <Overlay onClose={onClose}>
      <div className="w-full max-w-2xl overflow-hidden rounded-2xl border border-line bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b border-line px-6 pt-4">
          <div className="flex gap-1">
            {(["builder", "ai"] as const).map((t) => (
              <button
                key={t}
                onClick={() => setTab(t)}
                className={`flex items-center gap-1.5 border-b-2 px-1 pb-3 text-sm font-medium transition-colors ${
                  tab === t ? "border-indigo text-ink" : "border-transparent text-ink-faint hover:text-ink-soft"
                }`}
              >
                {t === "ai" && <IconSparkle width={15} className={tab === "ai" ? "text-indigo" : ""} />}
                {t === "builder" ? "Add Chart" : "Ask AI"}
              </button>
            ))}
          </div>
          <div className="flex items-center gap-4 pb-2">
            {tab === "builder" && <Dots active={step} />}
            <button onClick={onClose} className="rounded p-1 text-ink-faint hover:bg-slate-100">
              <IconClose width={18} />
            </button>
          </div>
        </div>

        {tab === "builder" ? (
          <>
            {step === 0 && (
              <div className="grid grid-cols-5 gap-3 p-6">
                {(Object.keys(typeMeta) as ChartType[]).map((t) => {
                  const Icon = typeMeta[t].icon;
                  const active = type === t;
                  return (
                    <button
                      key={t}
                      onClick={() => setType(t)}
                      className={`flex flex-col items-center gap-2 rounded-xl border p-3 text-center transition-all ${
                        active
                          ? "border-indigo bg-indigo-soft shadow-[0_8px_24px_-10px_rgba(99,102,241,0.5)]"
                          : "border-line hover:border-indigo hover:shadow-md"
                      }`}
                    >
                      <span
                        className={`flex h-10 w-10 items-center justify-center rounded-xl transition-transform ${
                          active ? "scale-110 bg-indigo text-white" : "bg-slate-100 text-ink-soft"
                        }`}
                      >
                        <Icon width={20} />
                      </span>
                      <span className={`text-[11px] font-medium leading-tight ${active ? "text-indigo-dark" : "text-ink-soft"}`}>
                        {typeMeta[t].label}
                      </span>
                    </button>
                  );
                })}
              </div>
            )}

            {step === 1 && !isCustom && (
              <div className="space-y-4 p-6">
                <h3 className="text-base font-semibold text-ink">Configure {typeMeta[type].label}</h3>
                <Field label="Chart Title" error={titleErr ? "Judul chart wajib diisi" : undefined}>
                  <input
                    autoFocus
                    value={title}
                    onChange={(e) => {
                      setTitle(e.target.value);
                      if (e.target.value.trim()) setTitleErr(false);
                    }}
                    placeholder="e.g. Revenue by Region"
                    className={titleErr ? "w-full rounded-lg border border-rose bg-rose/5 px-3 py-2.5 text-sm outline-none ring-2 ring-rose/20" : inputCls}
                  />
                </Field>
                <div className="grid grid-cols-2 gap-4">
                  <Field label="Data Source">
                    <Select defaultValue="orders">
                      <option value="orders">Orders (BigQuery)</option>
                      <option>Sessions</option>
                      <option>Subscriptions</option>
                    </Select>
                  </Field>
                  <Field label="Dimension">
                    <Select defaultValue="region">
                      <option value="region">Region</option>
                      <option>Month</option>
                      <option>Channel</option>
                    </Select>
                  </Field>
                </div>
                <Field label="Metric">
                  <Select defaultValue="revenue">
                    <option value="revenue">Sum of Revenue</option>
                    <option>Count of Orders</option>
                    <option>Avg Order Value</option>
                  </Select>
                </Field>
              </div>
            )}

            {step === 1 && isCustom && (
              <div className="p-6">
                <h3 className="mb-4 text-base font-semibold text-ink">Custom Chart (YAML)</h3>
                <div className="mb-4 inline-flex rounded-lg bg-slate-100 p-1">
                  {(["upload", "write"] as const).map((t) => (
                    <button
                      key={t}
                      onClick={() => setCustomTab(t)}
                      className={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
                        customTab === t ? "bg-white text-ink shadow-sm" : "text-ink-faint hover:text-ink-soft"
                      }`}
                    >
                      {t === "upload" ? "Upload File" : "Write YAML"}
                    </button>
                  ))}
                </div>
                {customTab === "upload" ? (
                  <div className="flex flex-col items-center justify-center gap-3 rounded-xl border-2 border-dashed border-line bg-slate-50/60 py-14 text-center transition-colors hover:border-indigo hover:bg-indigo-soft/40">
                    <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-white text-indigo shadow-sm">
                      <IconUpload width={22} />
                    </span>
                    <div className="text-sm font-medium text-ink">Click to upload or drag &amp; drop</div>
                    <div className="text-xs text-ink-faint">YAML up to 1 MB</div>
                  </div>
                ) : (
                  <>
                    <div className="overflow-hidden rounded-xl border border-slate-800 bg-[#0f172a] font-mono text-[13px] leading-relaxed">
                      <div className="flex items-center gap-1.5 border-b border-slate-800 px-4 py-2.5">
                        <span className="h-2.5 w-2.5 rounded-full bg-rose" />
                        <span className="h-2.5 w-2.5 rounded-full bg-amber" />
                        <span className="h-2.5 w-2.5 rounded-full bg-emerald" />
                        <span className="ml-2 text-xs text-slate-500">chart.yaml</span>
                        <button onClick={() => setYamlErr((e) => !e)} className="ml-auto text-xs text-slate-400 hover:text-white">
                          {yamlErr ? "fix error" : "break it"}
                        </button>
                      </div>
                      <pre className="overflow-x-auto px-4 py-3">
                        <code>
                          <span className="text-sky-400">type</span>
                          <span className="text-slate-400">: </span>
                          <span className="text-emerald-300">bar</span>
                          {"\n"}
                          <span className="text-sky-400">title</span>
                          <span className="text-slate-400">: </span>
                          <span className="text-emerald-300">Revenue by Region</span>
                          {"\n"}
                          <span className="text-sky-400">metric</span>
                          <span className="text-slate-400">{yamlErr ? ":: " : ": "}</span>
                          <span className={yamlErr ? "text-rose-400" : "text-amber-300"}>revenue</span>
                          {yamlErr && <span className="text-slate-600">  # &larr; syntax error</span>}
                        </code>
                      </pre>
                    </div>
                    {yamlErr && (
                      <div className="mt-3 flex items-start gap-3 rounded-lg border border-rose/30 bg-rose/5 p-3">
                        <IconWarning width={18} className="mt-0.5 shrink-0 text-rose" />
                        <div>
                          <div className="text-sm font-semibold text-rose">Invalid YAML Configuration</div>
                          <div className="mt-0.5 font-mono text-xs text-rose/80">
                            Line 3: unexpected token &quot;:&quot; — mapping values are not allowed here.
                          </div>
                        </div>
                      </div>
                    )}
                  </>
                )}
              </div>
            )}

            {step === 2 && (
              <div className="p-6">
                <div className="rounded-xl border border-line bg-slate-50/50 p-5">
                  <div className="mb-3 text-sm font-semibold text-ink">{title.trim() || typeMeta[type].label}</div>
                  <PreviewChart type={type} />
                </div>
              </div>
            )}

            <div className="flex items-center justify-between border-t border-line px-6 py-4">
              {step > 0 ? (
                <Btn variant="ghost" onClick={() => setStep(step - 1)}>
                  <IconChevronLeft width={16} /> Back
                </Btn>
              ) : (
                <span />
              )}
              <div className="flex gap-2">
                <Btn variant="outline" onClick={onClose}>
                  Cancel
                </Btn>
                {step === 0 && <Btn onClick={() => setStep(1)}>Continue</Btn>}
                {step === 1 && (
                  <Btn onClick={goPreview} disabled={isCustom && yamlErr}>
                    Preview
                  </Btn>
                )}
                {step === 2 && (
                  <Btn onClick={publish} disabled={publishing} className="min-w-[104px]">
                    {publishing ? (
                      <span className="flex items-center gap-2">
                        <span className="spin h-4 w-4 rounded-full border-2 border-white/40 border-t-white" /> Publishing
                      </span>
                    ) : (
                      "Publish"
                    )}
                  </Btn>
                )}
              </div>
            </div>
          </>
        ) : (
          <div className="space-y-4 p-6">
            <div className="flex items-center gap-2 rounded-xl border border-line bg-white p-2 shadow-sm focus-within:border-indigo focus-within:ring-2 focus-within:ring-indigo/20">
              <input
                value={ai}
                onChange={(e) => setAi(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && runAi()}
                className="flex-1 bg-transparent px-2 text-sm outline-none placeholder:text-ink-faint"
                placeholder="Describe the chart you want, e.g. 'Show revenue by region as a bar chart'"
              />
              <button onClick={runAi} className="flex h-9 w-9 items-center justify-center rounded-lg bg-indigo text-white transition-colors hover:bg-indigo-dark">
                <IconSend width={16} />
              </button>
            </div>
            {aiState === "idle" && <p className="px-1 text-xs text-ink-faint">Tip: sebutkan sumber data (orders, sessions, subscriptions).</p>}
            {aiState === "thinking" && (
              <div className="flex items-center gap-3 rounded-xl bg-slate-50 p-4">
                <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-soft text-indigo">
                  <IconSparkle width={16} />
                </span>
                <span className="text-sm text-ink-soft">AI is thinking</span>
                <span className="flex gap-1">
                  {[0, 1, 2].map((i) => (
                    <span key={i} className="h-1.5 w-1.5 rounded-full bg-indigo" style={{ animation: `typing-bounce 1.2s ${i * 0.15}s infinite` }} />
                  ))}
                </span>
              </div>
            )}
            {aiState === "result" && (
              <div className="rounded-xl border border-line p-4">
                <div className="mb-3 text-sm font-semibold text-ink">Revenue by Region</div>
                <BarChart data={series("12m")} color={SERIES[1]} />
                <div className="mt-4 flex gap-2">
                  <Btn variant="outline" className="flex-1" onClick={runAi}>
                    <IconRefresh width={16} /> Regenerate
                  </Btn>
                  <Btn className="flex-1" onClick={() => onPublish(mk("bar", "Revenue by Region"))}>
                    <IconPlus width={16} /> Add to Page
                  </Btn>
                </div>
              </div>
            )}
            {aiState === "noData" && (
              <div className="flex items-start gap-3 rounded-xl border border-sky/30 bg-sky/5 p-4">
                <IconInfo width={20} className="mt-0.5 shrink-0 text-sky" />
                <div>
                  <div className="text-sm font-medium text-ink">Maaf, saya tidak menemukan data yang sesuai.</div>
                  <p className="mt-1 text-sm text-ink-soft">
                    Data yang tersedia: <span className="font-medium text-ink">orders</span>,{" "}
                    <span className="font-medium text-ink">sessions</span>, <span className="font-medium text-ink">subscriptions</span>.
                  </p>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </Overlay>
  );
}

function PreviewChart({ type }: { type: ChartType }) {
  switch (type) {
    case "line":
      return <LineChart data={series("12m")} />;
    case "area":
      return <LineChart data={series("30d")} color={SERIES[4]} area />;
    case "stacked":
      return <StackedBar data={stackedData} keys={stackedKeys} />;
    case "variance":
      return <VarianceBar data={varianceData} />;
    case "donut":
      return <DonutChart data={donutData} />;
    case "geo":
      return <GeoChart tiles={geoTiles} />;
    case "heatmap":
      return <Heatmap matrix={heatmapMatrix} rows={heatmapRows} />;
    case "gauge":
      return <Gauge value={78} label="of $92K target" />;
    default:
      return <BarChart data={series("12m")} />;
  }
}

// ---------------------------------------------------------------------------
// Overlay + confirm dialog
// ---------------------------------------------------------------------------
function Overlay({ children, onClose }: { children: React.ReactNode; onClose: () => void }) {
  useEffect(() => {
    const h = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, [onClose]);
  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-slate-900/50 backdrop-blur-[2px]" onClick={onClose} />
      <div className="relative w-full max-w-2xl">{children}</div>
    </div>
  );
}

function ConfirmDelete({ title, body, onCancel, onConfirm }: { title: string; body: string; onCancel: () => void; onConfirm: () => void }) {
  return (
    <Overlay onClose={onCancel}>
      <div className="mx-auto w-full max-w-sm overflow-hidden rounded-2xl border border-line bg-white p-6 text-center shadow-2xl">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-rose/10 text-rose">
          <IconWarning width={24} />
        </div>
        <h3 className="mt-4 text-base font-semibold text-ink">{title}</h3>
        <p className="mt-1.5 text-sm text-ink-soft">{body}</p>
        <div className="mt-6 flex gap-2">
          <Btn variant="outline" className="flex-1" onClick={onCancel}>
            Batal
          </Btn>
          <Btn variant="danger" className="flex-1" onClick={onConfirm}>
            Hapus
          </Btn>
        </div>
      </div>
    </Overlay>
  );
}

const AI_PROVIDERS = [
  { value: "anthropic", label: "Anthropic Claude", hint: "sk-ant-…" },
  { value: "openai", label: "OpenAI", hint: "sk-…" },
  { value: "google", label: "Google Gemini", hint: "AIza…" },
];

function initials(name: string) {
  return name.trim().split(/\s+/).slice(0, 2).map((s) => s[0]?.toUpperCase() ?? "").join("") || "?";
}

function ProfileModal({
  name,
  onName,
  email,
  stats,
  aiKeys,
  setAiKeys,
  onClose,
  onLogout,
  notify,
}: {
  name: string;
  onName: (v: string) => void;
  email: string;
  stats: { folders: number; pages: number; charts: number };
  aiKeys: AiKey[];
  setAiKeys: React.Dispatch<React.SetStateAction<AiKey[]>>;
  onClose: () => void;
  onLogout: () => void;
  notify: (tone: Toast["tone"], msg: string) => void;
}) {
  const [tab, setTab] = useState<"profile" | "ai" | "prefs">("profile");
  const [draftName, setDraftName] = useState(name);
  const [role] = useState("Data Analyst");

  // AI key form
  const [provider, setProvider] = useState("anthropic");
  const [label, setLabel] = useState("");
  const [key, setKey] = useState("");
  const providerLabel = (v: string) => AI_PROVIDERS.find((p) => p.value === v)?.label ?? v;

  const addKey = () => {
    const raw = key.trim();
    if (raw.length < 8) {
      notify("rose", "API key tidak valid — terlalu pendek");
      return;
    }
    const masked = `${raw.slice(0, 4)}${"•".repeat(6)}${raw.slice(-4)}`;
    const entry: AiKey = { id: uid(), provider, label: label.trim() || providerLabel(provider), masked, active: true };
    setAiKeys((prev) => [entry, ...prev.map((k) => ({ ...k, active: k.provider === provider ? false : k.active }))]);
    setKey("");
    setLabel("");
    notify("emerald", `${providerLabel(provider)} key tersimpan & aktif`);
  };

  const prefRow = (title: string, desc: string, node: React.ReactNode) => (
    <div className="flex items-center justify-between gap-4 border-b border-line py-3 last:border-0">
      <div>
        <div className="text-sm font-medium text-ink">{title}</div>
        <div className="text-xs text-ink-faint">{desc}</div>
      </div>
      {node}
    </div>
  );
  const [emailNotif, setEmailNotif] = useState(true);
  const [weekly, setWeekly] = useState(false);
  const Toggle = ({ on, set }: { on: boolean; set: (v: boolean) => void }) => (
    <button
      type="button"
      onClick={() => set(!on)}
      className={`relative h-6 w-11 shrink-0 rounded-full transition-colors ${on ? "bg-indigo" : "bg-slate-300"}`}
    >
      <span className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-all ${on ? "left-[22px]" : "left-0.5"}`} />
    </button>
  );

  return (
    <Overlay onClose={onClose}>
      <div className="mx-auto flex max-h-[86vh] w-full max-w-2xl flex-col overflow-hidden rounded-2xl border border-line bg-white shadow-2xl">
        {/* Header */}
        <div className="flex items-center gap-4 border-b border-line bg-slate-50/70 px-6 py-5">
          <span className="flex h-14 w-14 items-center justify-center rounded-full bg-indigo text-lg font-semibold text-white">
            {initials(name)}
          </span>
          <div className="min-w-0">
            <div className="truncate text-base font-semibold text-ink">{name}</div>
            <div className="truncate text-sm text-ink-faint">{email}</div>
            <div className="mt-1 flex items-center gap-1.5 text-[11px] font-medium text-ink-soft">
              <span className="rounded-full bg-indigo-soft px-2 py-0.5 text-indigo">{role}</span>
              <span className="rounded-full bg-emerald/10 px-2 py-0.5 text-emerald">Pro plan</span>
            </div>
          </div>
          <button onClick={onClose} className="ml-auto self-start rounded-lg p-1.5 text-ink-faint hover:bg-slate-100 hover:text-ink">
            <IconClose width={18} />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 border-b border-line px-4">
          {([["profile", "Profile"], ["ai", "AI & API Keys"], ["prefs", "Preferences"]] as const).map(([v, l]) => (
            <button
              key={v}
              onClick={() => setTab(v)}
              className={`relative px-3 py-3 text-sm font-medium transition-colors ${tab === v ? "text-indigo" : "text-ink-faint hover:text-ink-soft"}`}
            >
              {l}
              {tab === v && <span className="absolute inset-x-2 -bottom-px h-0.5 rounded-full bg-indigo" />}
            </button>
          ))}
        </div>

        <div className="overflow-y-auto px-6 py-5">
          {tab === "profile" && (
            <div className="space-y-5">
              <div className="grid grid-cols-3 gap-3">
                {[
                  { k: "Folders", v: stats.folders },
                  { k: "Pages", v: stats.pages },
                  { k: "Charts", v: stats.charts },
                ].map((s) => (
                  <div key={s.k} className="rounded-xl border border-line bg-slate-50/60 px-4 py-3">
                    <div className="text-2xl font-semibold tracking-tight text-ink">{s.v}</div>
                    <div className="text-xs text-ink-faint">{s.k}</div>
                  </div>
                ))}
              </div>
              <Field label="Display name">
                <input className={inputCls} value={draftName} onChange={(e) => setDraftName(e.target.value)} />
              </Field>
              <Field label="Email">
                <input className={`${inputCls} bg-slate-50 text-ink-faint`} value={email} disabled />
              </Field>
              <div className="flex items-center gap-2 text-xs text-ink-faint">
                <IconInfo width={14} /> Member since Jan 2025 · Last login today
              </div>
              <div className="flex justify-end gap-2 pt-1">
                <Btn variant="outline" onClick={onLogout}>
                  Logout
                </Btn>
                <Btn
                  onClick={() => {
                    onName(draftName.trim() || name);
                    notify("emerald", "Profil diperbarui");
                    onClose();
                  }}
                >
                  <IconCheck width={16} /> Save changes
                </Btn>
              </div>
            </div>
          )}

          {tab === "ai" && (
            <div className="space-y-5">
              <div className="rounded-xl border border-line bg-indigo-soft/50 p-4">
                <div className="flex items-center gap-2 text-sm font-medium text-ink">
                  <IconSparkle width={16} className="text-indigo" /> Bring your own AI key
                </div>
                <p className="mt-1 text-xs text-ink-soft">
                  Add your own provider key to power "Ask AI" chart generation. Keys are stored locally and never shared.
                </p>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <Field label="Provider">
                  <Select value={provider} onChange={(e) => setProvider(e.target.value)}>
                    {AI_PROVIDERS.map((p) => (
                      <option key={p.value} value={p.value}>
                        {p.label}
                      </option>
                    ))}
                  </Select>
                </Field>
                <Field label="Label (optional)">
                  <input className={inputCls} placeholder="e.g. Personal key" value={label} onChange={(e) => setLabel(e.target.value)} />
                </Field>
              </div>
              <Field label="API key">
                <div className="flex gap-2">
                  <input
                    type="password"
                    className={inputCls}
                    placeholder={AI_PROVIDERS.find((p) => p.value === provider)?.hint}
                    value={key}
                    onChange={(e) => setKey(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && addKey()}
                  />
                  <Btn onClick={addKey} className="shrink-0">
                    <IconPlus width={16} /> Add
                  </Btn>
                </div>
              </Field>

              <div>
                <div className="mb-2 text-xs font-medium text-ink-soft">Your keys</div>
                {aiKeys.length === 0 ? (
                  <div className="rounded-xl border border-dashed border-line py-8 text-center text-sm text-ink-faint">
                    No API keys yet. Add one above to activate AI features.
                  </div>
                ) : (
                  <ul className="space-y-2">
                    {aiKeys.map((k) => (
                      <li key={k.id} className="flex items-center gap-3 rounded-xl border border-line px-3 py-2.5">
                        <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-soft text-indigo">
                          <IconSparkle width={16} />
                        </span>
                        <div className="min-w-0">
                          <div className="truncate text-sm font-medium text-ink">{k.label}</div>
                          <div className="font-mono text-xs text-ink-faint">
                            {providerLabel(k.provider)} · {k.masked}
                          </div>
                        </div>
                        <span
                          className={`ml-auto flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium ${
                            k.active ? "bg-emerald/10 text-emerald" : "bg-slate-100 text-ink-faint"
                          }`}
                        >
                          <span className={`h-1.5 w-1.5 rounded-full ${k.active ? "bg-emerald" : "bg-ink-faint"}`} />
                          {k.active ? "Active" : "Inactive"}
                        </span>
                        <button
                          onClick={() => setAiKeys((prev) => prev.map((x) => (x.id === k.id ? { ...x, active: !x.active } : x)))}
                          className="rounded-lg px-2 py-1 text-xs font-medium text-ink-soft hover:bg-slate-100"
                        >
                          {k.active ? "Disable" : "Enable"}
                        </button>
                        <button
                          onClick={() => {
                            setAiKeys((prev) => prev.filter((x) => x.id !== k.id));
                            notify("rose", "API key dihapus");
                          }}
                          className="rounded-lg p-1.5 text-ink-faint hover:bg-rose/10 hover:text-rose"
                          title="Remove"
                        >
                          <IconTrash width={15} />
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
          )}

          {tab === "prefs" && (
            <div>
              {prefRow("Email notifications", "Report anomalies and shares to your inbox", <Toggle on={emailNotif} set={setEmailNotif} />)}
              {prefRow("Weekly digest", "A Monday summary of your dashboards", <Toggle on={weekly} set={setWeekly} />)}
              {prefRow(
                "Default date range",
                "Applied when opening a dashboard",
                <div className="w-40">
                  <Select defaultValue="12m">
                    <option value="7d">Last 7 days</option>
                    <option value="30d">Last 30 days</option>
                    <option value="12m">Last 12 months</option>
                  </Select>
                </div>,
              )}
              {prefRow("Number format", "How values are displayed", <div className="w-40"><Select defaultValue="id"><option value="id">1.000,00</option><option value="us">1,000.00</option></Select></div>)}
              <div className="mt-5 rounded-xl border border-rose/30 bg-rose/5 p-4">
                <div className="text-sm font-medium text-ink">Danger zone</div>
                <p className="mt-0.5 text-xs text-ink-soft">Sign out of your account on this device.</p>
                <Btn variant="danger" className="mt-3" onClick={onLogout}>
                  Logout
                </Btn>
              </div>
            </div>
          )}
        </div>
      </div>
    </Overlay>
  );
}

// Underlying data table (the "Data" nav view), driven by global filters.
const MONTH_ORDER = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
function DataView({
  pageName,
  filters,
  notify,
}: {
  pageName: string;
  filters: { month: string; year: string; region: string };
  notify: (tone: Toast["tone"], msg: string) => void;
}) {
  const yearMul = filters.year === "2024" ? 0.78 : filters.year === "2025" ? 0.9 : 1;
  const regionMul = filters.region === "amer" ? 0.44 : filters.region === "emea" ? 0.33 : filters.region === "apac" ? 0.23 : 1;
  const rows = months12
    .filter((m) => filters.month === "all" || m.label === filters.month)
    .map((m, i, arr) => {
      const revenue = Math.round(m.value * yearMul * regionMul);
      const orders = Math.round(revenue / 42);
      const sessions = Math.round(orders * (14 + (i % 5)));
      const conv = +((orders / sessions) * 100).toFixed(1);
      const prev = i > 0 ? Math.round(arr[i - 1].value * yearMul * regionMul) : revenue;
      const delta = prev ? +(((revenue - prev) / prev) * 100).toFixed(1) : 0;
      return { period: `${m.label} ${filters.year}`, revenue, orders, sessions, conv, delta };
    });
  const totals = rows.reduce(
    (a, r) => ({ revenue: a.revenue + r.revenue, orders: a.orders + r.orders, sessions: a.sessions + r.sessions }),
    { revenue: 0, orders: 0, sessions: 0 },
  );
  const fmt = (n: number) => n.toLocaleString("id-ID");

  const exportCsv = () => {
    const head = ["Period", "Revenue", "Orders", "Sessions", "Conv%", "ΔRevenue%"];
    const body = rows.map((r) => [r.period, r.revenue, r.orders, r.sessions, r.conv, r.delta].join(","));
    const blob = new Blob([[head.join(","), ...body].join("\n")], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "northstar-data.csv";
    a.click();
    URL.revokeObjectURL(url);
    notify("emerald", "Data diekspor ke CSV");
  };

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold tracking-tight">Data · {pageName}</h1>
          <p className="mt-1 text-sm text-ink-faint">
            {rows.length} rows · {filters.region === "all" ? "All regions" : filters.region.toUpperCase()} · {filters.year}
          </p>
        </div>
        <Btn variant="outline" onClick={exportCsv}>
          <IconUpload width={16} /> Export CSV
        </Btn>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3">
        {[
          { k: "Total revenue", v: `Rp ${fmt(totals.revenue)}` },
          { k: "Total orders", v: fmt(totals.orders) },
          { k: "Total sessions", v: fmt(totals.sessions) },
        ].map((s) => (
          <div key={s.k} className="rounded-xl border border-line bg-white px-4 py-3">
            <div className="text-xs text-ink-faint">{s.k}</div>
            <div className="mt-0.5 text-lg font-semibold tracking-tight text-ink">{s.v}</div>
          </div>
        ))}
      </div>

      <div className="mt-4 overflow-hidden rounded-xl border border-line bg-white">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-line bg-slate-50/70 text-left text-xs font-medium text-ink-soft">
              <th className="px-4 py-2.5">Period</th>
              <th className="px-4 py-2.5 text-right">Revenue</th>
              <th className="px-4 py-2.5 text-right">Orders</th>
              <th className="px-4 py-2.5 text-right">Sessions</th>
              <th className="px-4 py-2.5 text-right">Conv.</th>
              <th className="px-4 py-2.5 text-right">Δ Revenue</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.period} className="border-b border-line last:border-0 hover:bg-slate-50/60">
                <td className="px-4 py-2.5 font-medium text-ink">{r.period}</td>
                <td className="px-4 py-2.5 text-right tabular-nums text-ink-soft">Rp {fmt(r.revenue)}</td>
                <td className="px-4 py-2.5 text-right tabular-nums text-ink-soft">{fmt(r.orders)}</td>
                <td className="px-4 py-2.5 text-right tabular-nums text-ink-soft">{fmt(r.sessions)}</td>
                <td className="px-4 py-2.5 text-right tabular-nums text-ink-soft">{r.conv}%</td>
                <td className={`px-4 py-2.5 text-right tabular-nums font-medium ${r.delta >= 0 ? "text-emerald" : "text-rose"}`}>
                  {r.delta >= 0 ? "▲" : "▼"} {Math.abs(r.delta)}%
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="mt-3 flex items-center gap-1.5 text-xs text-ink-faint">
        <IconInfo width={14} /> Data respects the global month / year / region filters in the top bar.
      </p>
    </div>
  );
}

// Product documentation, opened from the login screen.
function DocsModal({ onClose }: { onClose: () => void }) {
  const sections = [
    { icon: IconFolder, title: "Folders & pages", body: "Create a folder from the sidebar, then add pages inside it. Rename or change a page's icon anytime. Click a folder row to expand or collapse it." },
    { icon: IconGrid, title: "Building dashboards", body: "Add charts with the + button. Choose from bar, line, area, stacked, variance (YoY), donut, geo, heatmap, gauge and custom YAML — or ask AI to generate one." },
    { icon: IconGrip, title: "Arrange & resize", body: "Drag any chart to an empty cell — gaps are allowed. Same-size cards swap; others reflow so nothing overlaps. Drag a card's corner to resize, or use the ⋮ size menu." },
    { icon: IconCalendar, title: "Filters", body: "Global month / year / region filters live in the top bar and apply across the workspace. Each dashboard also has its own date-range and source filters." },
    { icon: IconLayers, title: "Data view", body: "Switch to the Data tab in the navbar to inspect the underlying table, review totals, and export to CSV." },
    { icon: IconSparkle, title: "AI keys", body: "Open your profile → AI & API Keys to add your own Anthropic, OpenAI or Gemini key and power the Ask-AI chart builder." },
  ];
  return (
    <Overlay onClose={onClose}>
      <div className="mx-auto flex max-h-[86vh] w-full max-w-2xl flex-col overflow-hidden rounded-2xl border border-line bg-white shadow-2xl">
        <div className="flex items-center gap-3 border-b border-line px-6 py-4">
          <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-indigo text-white">
            <IconCode width={18} />
          </span>
          <div>
            <div className="text-base font-semibold text-ink">Documentation</div>
            <div className="text-xs text-ink-faint">Everything you need to get started with Northstar</div>
          </div>
          <button onClick={onClose} className="ml-auto rounded-lg p-1.5 text-ink-faint hover:bg-slate-100 hover:text-ink">
            <IconClose width={18} />
          </button>
        </div>
        <div className="grid gap-3 overflow-y-auto p-6 sm:grid-cols-2">
          {sections.map((s) => (
            <div key={s.title} className="rounded-xl border border-line p-4">
              <div className="flex items-center gap-2 text-sm font-semibold text-ink">
                <s.icon width={16} className="text-indigo" /> {s.title}
              </div>
              <p className="mt-1.5 text-sm leading-relaxed text-ink-soft">{s.body}</p>
            </div>
          ))}
          <div className="rounded-xl border border-line bg-slate-50/60 p-4 sm:col-span-2">
            <div className="text-sm font-semibold text-ink">Keyboard shortcuts</div>
            <div className="mt-2 flex flex-wrap gap-x-6 gap-y-1 text-sm text-ink-soft">
              <span><kbd className="rounded border border-line bg-white px-1.5 py-0.5 font-mono text-xs">⌘/Ctrl+Z</kbd> Undo</span>
              <span><kbd className="rounded border border-line bg-white px-1.5 py-0.5 font-mono text-xs">⌘/Ctrl+Shift+Z</kbd> Redo</span>
              <span><kbd className="rounded border border-line bg-white px-1.5 py-0.5 font-mono text-xs">Esc</kbd> Close dialogs</span>
            </div>
          </div>
        </div>
      </div>
    </Overlay>
  );
}

// ---------------------------------------------------------------------------
// App
// ---------------------------------------------------------------------------
export default function App() {
  const [authed, setAuthed] = useState(false);
  const [booting, setBooting] = useState(false);
  const [folders, setFolders] = useState<Folder[]>(() => seedFolders);
  const [pages, setPages] = useState<Page[]>(() => seedPages);
  const [activeId, setActiveId] = useState("p1");
  const [pageMenu, setPageMenu] = useState<string | null>(null);
  const [iconPick, setIconPick] = useState<string | null>(null);
  const [renaming, setRenaming] = useState<string | null>(null);
  const [renamingFolder, setRenamingFolder] = useState<string | null>(null);
  const [confirmDel, setConfirmDel] = useState<{ kind: "page" | "folder"; id: string; name: string } | null>(null);
  const [addOpen, setAddOpen] = useState(false);
  const [userMenu, setUserMenu] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [profileName, setProfileName] = useState("Ayu Rahma");
  const [aiKeys, setAiKeys] = useState<AiKey[]>([]);
  const [view, setView] = useState<"dashboard" | "data">("dashboard");
  const [gMonth, setGMonth] = useState("all");
  const [gYear, setGYear] = useState("2026");
  const [gRegion, setGRegion] = useState("all");
  const [saved, setSaved] = useState(true);
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [range, setRange] = useState<Range>("12m");
  const [source, setSource] = useState("orders");

  const [cols, setCols] = useState(3);
  const gridRef = useRef<HTMLDivElement | null>(null);
  const mainRef = useRef<HTMLDivElement | null>(null);
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [dragCell, setDragCell] = useState<{ x: number; y: number } | null>(null);

  // Auto-scroll the canvas while dragging a card near the top/bottom edge.
  const scrollDir = useRef(0);
  const scrollTimer = useRef<number | null>(null);
  const stopAutoScroll = () => {
    if (scrollTimer.current !== null) {
      clearInterval(scrollTimer.current);
      scrollTimer.current = null;
    }
    scrollDir.current = 0;
  };
  const autoScroll = (clientY: number) => {
    const el = mainRef.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    const zone = 72;
    scrollDir.current = clientY < r.top + zone ? -1 : clientY > r.bottom - zone ? 1 : 0;
    if (scrollDir.current !== 0 && scrollTimer.current === null) {
      scrollTimer.current = window.setInterval(() => {
        el.scrollTop += scrollDir.current * 16;
      }, 16);
    } else if (scrollDir.current === 0) {
      stopAutoScroll();
    }
  };

  const active = pages.find((p) => p.id === activeId) ?? pages[0];

  const pushToast = (tone: Toast["tone"], text: string) => {
    const id = uid();
    setToasts((t) => [...t, { id, tone, text }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 3800);
  };
  const dismiss = (id: string) => setToasts((t) => t.filter((x) => x.id !== id));

  // Responsive column count for the grid.
  useEffect(() => {
    const calc = () => {
      const w = window.innerWidth;
      setCols(w < 768 ? 1 : w < 1280 ? 2 : 3);
    };
    calc();
    window.addEventListener("resize", calc);
    return () => window.removeEventListener("resize", calc);
  }, []);

  // Autosave flicker
  const firstRun = useRef(true);
  useEffect(() => {
    if (firstRun.current) {
      firstRun.current = false;
      return;
    }
    setSaved(false);
    const t = setTimeout(() => setSaved(true), 700);
    return () => clearTimeout(t);
  }, [pages, folders]);

  // Undo/redo history (Ctrl/Cmd+Z, Ctrl/Cmd+Shift+Z or Ctrl+Y) over pages + folders.
  type Snap = { pages: Page[]; folders: Folder[] };
  const history = useRef<Snap[]>([]);
  const future = useRef<Snap[]>([]);
  const prevSnap = useRef<Snap>({ pages: seedPages, folders: seedFolders });
  const histFirst = useRef(true);
  const undoing = useRef(false);
  const redoing = useRef(false);
  useEffect(() => {
    if (histFirst.current) {
      histFirst.current = false;
      return;
    }
    if (undoing.current) {
      undoing.current = false;
    } else if (redoing.current) {
      redoing.current = false;
    } else {
      history.current.push(prevSnap.current);
      if (history.current.length > 60) history.current.shift();
      future.current = []; // a fresh change invalidates the redo stack
    }
    prevSnap.current = { pages, folders };
  }, [pages, folders]);
  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      const mod = e.ctrlKey || e.metaKey;
      if (!mod) return;
      const k = e.key.toLowerCase();
      const isRedo = (k === "z" && e.shiftKey) || k === "y";
      const isUndo = k === "z" && !e.shiftKey;
      if (isRedo) {
        e.preventDefault();
        const snap = future.current.pop();
        if (!snap) return;
        redoing.current = true;
        history.current.push(prevSnap.current);
        setPages(snap.pages);
        setFolders(snap.folders);
        pushToast("indigo", "Perubahan diulang (redo)");
      } else if (isUndo) {
        e.preventDefault();
        const snap = history.current.pop();
        if (!snap) return;
        undoing.current = true;
        future.current.push(prevSnap.current);
        setPages(snap.pages);
        setFolders(snap.folders);
        pushToast("indigo", "Perubahan dibatalkan (undo)");
      }
    };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const login = () => {
    setBooting(true);
    setAuthed(true);
    setTimeout(() => setBooting(false), 1200);
  };

  const addPage = (folderId: string | null) => {
    const p: Page = { id: uid(), name: "Untitled Page", icon: "chart", folderId, charts: [] };
    setPages((prev) => [...prev, p]);
    if (folderId) setFolders((prev) => prev.map((f) => (f.id === folderId ? { ...f, collapsed: false } : f)));
    setActiveId(p.id);
    setRenaming(p.id);
  };
  const addFolder = () => {
    const f: Folder = { id: uid(), name: "Untitled Folder", collapsed: false };
    setFolders((prev) => [...prev, f]);
    setRenamingFolder(f.id);
  };

  const doDelete = () => {
    if (!confirmDel) return;
    if (confirmDel.kind === "page") {
      setPages((prev) => prev.filter((p) => p.id !== confirmDel.id));
      const remaining = pages.filter((p) => p.id !== confirmDel.id);
      if (activeId === confirmDel.id && remaining[0]) setActiveId(remaining[0].id);
      pushToast("rose", "Page dihapus");
    } else {
      // delete folder + its pages
      const doomed = pages.filter((p) => p.folderId === confirmDel.id).map((p) => p.id);
      setPages((prev) => prev.filter((p) => p.folderId !== confirmDel.id));
      setFolders((prev) => prev.filter((f) => f.id !== confirmDel.id));
      if (doomed.includes(activeId)) {
        const remaining = pages.filter((p) => p.folderId !== confirmDel.id);
        if (remaining[0]) setActiveId(remaining[0].id);
      }
      pushToast("rose", "Folder dihapus");
    }
    setConfirmDel(null);
  };

  const mutateActive = (fn: (charts: Chart[]) => Chart[]) =>
    setPages((prev) => prev.map((p) => (p.id === active.id ? { ...p, charts: fn(p.charts) } : p)));

  // Append a chart into the first free cell so it doesn't land on top of another.
  const addChart = (chart: Chart) =>
    mutateActive((cs) => {
      const pos = firstFree(cs, Math.min(chart.w, cols), chart.h, cols);
      return [...cs, { ...chart, x: pos.x, y: pos.y }];
    });

  // Compute the target cell under the cursor while dragging.
  const cellFromPointer = (clientX: number, clientY: number, w: number) => {
    const grid = gridRef.current;
    if (!grid) return null;
    const rect = grid.getBoundingClientRect();
    const gap = 16;
    const colStride = (grid.clientWidth - gap * (cols - 1)) / cols + gap;
    const rowStride = 248 + gap;
    const x = Math.max(0, Math.min(cols - w, Math.floor((clientX - rect.left) / colStride)));
    const y = Math.max(0, Math.floor((clientY - rect.top) / rowStride));
    return { x, y };
  };

  if (!authed) return <LoginScreen onLogin={login} />;

  const renderPageRow = (p: Page, inFolder: boolean) => {
    const Icon = ICONS[p.icon] ?? IconChart;
    const isActive = p.id === active.id;
    return (
      <div
        key={p.id}
        onClick={() => setActiveId(p.id)}
        className={`group relative flex cursor-pointer items-center gap-2 rounded-lg py-2 pr-1.5 text-sm transition-colors ${
          inFolder ? "pl-3" : "pl-2.5"
        } ${isActive ? "bg-indigo-soft font-medium text-indigo-dark" : "text-ink-soft hover:bg-slate-100"}`}
      >
        <span
          role="button"
          tabIndex={0}
          onClick={(e) => {
            e.stopPropagation();
            setIconPick(iconPick === p.id ? null : p.id);
          }}
          className="relative shrink-0 cursor-pointer rounded p-0.5 hover:bg-white/70"
          title="Change icon"
        >
          <Icon width={16} />
          {iconPick === p.id && (
            <IconPicker
              value={p.icon}
              onClose={() => setIconPick(null)}
              onPick={(k) => setPages((prev) => prev.map((x) => (x.id === p.id ? { ...x, icon: k } : x)))}
            />
          )}
        </span>
        {renaming === p.id ? (
          <input
            autoFocus
            defaultValue={p.name}
            onBlur={(e) => {
              setPages((prev) => prev.map((x) => (x.id === p.id ? { ...x, name: e.target.value || x.name } : x)));
              setRenaming(null);
            }}
            onKeyDown={(e) => e.key === "Enter" && (e.target as HTMLInputElement).blur()}
            onClick={(e) => e.stopPropagation()}
            className="w-full rounded border border-indigo bg-white px-1 py-0.5 text-sm outline-none"
          />
        ) : (
          <span className="truncate">{p.name}</span>
        )}
        <button
          onClick={(e) => {
            e.stopPropagation();
            setPageMenu(pageMenu === p.id ? null : p.id);
          }}
          className={`ml-auto rounded p-0.5 text-ink-faint transition-opacity hover:bg-white hover:text-ink ${
            pageMenu === p.id ? "opacity-100" : "opacity-0 group-hover:opacity-100"
          }`}
        >
          <IconDots width={16} />
        </button>
        {pageMenu === p.id && (
          <>
            <div className="fixed inset-0 z-10" onClick={(e) => { e.stopPropagation(); setPageMenu(null); }} />
            <div className="absolute right-1 top-9 z-20 w-32 overflow-hidden rounded-lg border border-line bg-white py-1 text-sm shadow-lg">
              <button onClick={(e) => { e.stopPropagation(); setRenaming(p.id); setPageMenu(null); }} className="flex w-full items-center gap-2 px-3 py-1.5 text-ink-soft hover:bg-slate-50">
                <IconEdit width={14} /> Rename
              </button>
              <button onClick={(e) => { e.stopPropagation(); setConfirmDel({ kind: "page", id: p.id, name: p.name }); setPageMenu(null); }} className="flex w-full items-center gap-2 px-3 py-1.5 text-rose hover:bg-rose/5">
                <IconTrash width={14} /> Delete
              </button>
            </div>
          </>
        )}
      </div>
    );
  };

  return (
    <div className="flex h-full flex-col bg-canvas text-ink">
      <header className="flex h-14 shrink-0 items-center justify-between gap-4 border-b border-line bg-white px-4">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2.5">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo text-white">
              <IconChart width={18} />
            </span>
            <span className="hidden text-sm font-semibold tracking-tight sm:inline">Northstar Analytics</span>
          </div>
          <nav className="flex items-center gap-1 rounded-lg bg-slate-100 p-0.5">
            {([["dashboard", "Dashboard", IconGrid], ["data", "Data", IconLayers]] as const).map(([v, l, Ic]) => (
              <button
                key={v}
                onClick={() => setView(v)}
                className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
                  view === v ? "bg-white text-ink shadow-sm" : "text-ink-faint hover:text-ink-soft"
                }`}
              >
                <Ic width={15} /> {l}
              </button>
            ))}
          </nav>
        </div>

        {/* Global filters */}
        <div className="hidden items-center gap-2 md:flex">
          <Dropdown
            icon={<IconCalendar width={15} className="text-ink-faint" />}
            value={gMonth}
            onChange={setGMonth}
            options={[{ value: "all", label: "All months" }, ...["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"].map((m) => ({ value: m, label: m }))]}
          />
          <Dropdown
            value={gYear}
            onChange={setGYear}
            options={[
              { value: "2024", label: "2024" },
              { value: "2025", label: "2025" },
              { value: "2026", label: "2026" },
            ]}
          />
          <Dropdown
            icon={<IconGlobe width={15} className="text-ink-faint" />}
            value={gRegion}
            onChange={setGRegion}
            options={[
              { value: "all", label: "All regions" },
              { value: "amer", label: "Americas" },
              { value: "emea", label: "EMEA" },
              { value: "apac", label: "APAC" },
            ]}
          />
          {(gMonth !== "all" || gYear !== "2026" || gRegion !== "all") && (
            <button
              onClick={() => { setGMonth("all"); setGYear("2026"); setGRegion("all"); }}
              className="rounded-lg px-2 py-1.5 text-xs font-medium text-indigo hover:bg-indigo-soft"
            >
              Reset
            </button>
          )}
        </div>

        <div className="relative">
          <button onClick={() => setUserMenu((m) => !m)} className="flex items-center gap-2 rounded-full py-1 pl-1 pr-2.5 transition-colors hover:bg-slate-100">
            <span className="relative flex h-7 w-7 items-center justify-center rounded-full bg-indigo text-xs font-semibold text-white">
              {initials(profileName)}
              {aiKeys.some((k) => k.active) && (
                <span className="absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full border-2 border-white bg-emerald" title="AI connected" />
              )}
            </span>
            <span className="text-sm font-medium">{profileName}</span>
            <IconChevronDown width={14} className="text-ink-faint" />
          </button>
          {userMenu && (
            <>
              <div className="fixed inset-0 z-10" onClick={() => setUserMenu(false)} />
              <div className="absolute right-0 top-11 z-20 w-52 overflow-hidden rounded-lg border border-line bg-white py-1 text-sm shadow-lg">
                <div className="border-b border-line px-3 py-2">
                  <div className="font-medium text-ink">{profileName}</div>
                  <div className="text-xs text-ink-faint">ayu@northstar.io</div>
                </div>
                <button onClick={() => { setProfileOpen(true); setUserMenu(false); }} className="flex w-full items-center gap-2 px-3 py-2 text-ink-soft hover:bg-slate-50">
                  <IconUsers width={15} className="text-ink-faint" /> View profile
                </button>
                <button onClick={() => { setProfileOpen(true); setUserMenu(false); }} className="flex w-full items-center gap-2 px-3 py-2 text-ink-soft hover:bg-slate-50">
                  <IconSparkle width={15} className="text-ink-faint" /> AI & API keys
                  {aiKeys.some((k) => k.active) && <span className="ml-auto h-1.5 w-1.5 rounded-full bg-emerald" />}
                </button>
                <div className="my-1 border-t border-line" />
                <button onClick={() => { setAuthed(false); setUserMenu(false); }} className="flex w-full items-center gap-2 px-3 py-2 text-rose hover:bg-rose/5">
                  <IconClose width={15} /> Logout
                </button>
              </div>
            </>
          )}
        </div>
      </header>

      <div className="flex min-h-0 flex-1">
        {/* Sidebar */}
        <aside className="flex w-72 shrink-0 flex-col border-r border-line bg-slate-50/60 p-3">
          <button
            onClick={addFolder}
            className="mb-3 flex w-full items-center justify-center gap-2 rounded-lg bg-indigo px-3 py-2.5 text-sm font-medium text-white shadow-sm transition-colors hover:bg-indigo-dark"
          >
            <IconPlus width={16} /> New Folder
          </button>

          <div className="flex flex-col gap-0.5 overflow-y-auto">
            {folders.map((f) => {
              const fpages = pages.filter((p) => p.folderId === f.id);
              return (
                <div key={f.id}>
                  <div
                    role="button"
                    tabIndex={0}
                    onClick={() => renamingFolder !== f.id && setFolders((prev) => prev.map((x) => (x.id === f.id ? { ...x, collapsed: !x.collapsed } : x)))}
                    onKeyDown={(e) => {
                      if ((e.key === "Enter" || e.key === " ") && renamingFolder !== f.id) {
                        e.preventDefault();
                        setFolders((prev) => prev.map((x) => (x.id === f.id ? { ...x, collapsed: !x.collapsed } : x)));
                      }
                    }}
                    className="group flex cursor-pointer items-center gap-1.5 rounded-lg px-2 py-1.5 text-ink-soft hover:bg-slate-100"
                  >
                    <IconChevronDown width={14} className={`shrink-0 text-ink-faint transition-transform ${f.collapsed ? "-rotate-90" : ""}`} />
                    <IconFolder width={15} className="shrink-0 text-amber" />
                    {renamingFolder === f.id ? (
                      <input
                        autoFocus
                        defaultValue={f.name}
                        onClick={(e) => e.stopPropagation()}
                        onBlur={(e) => {
                          setFolders((prev) => prev.map((x) => (x.id === f.id ? { ...x, name: e.target.value || x.name } : x)));
                          setRenamingFolder(null);
                        }}
                        onKeyDown={(e) => e.key === "Enter" && (e.target as HTMLInputElement).blur()}
                        className="w-full rounded border border-indigo bg-white px-1 py-0.5 text-[11px] font-semibold outline-none"
                      />
                    ) : (
                      <span className="truncate text-[11px] font-semibold uppercase tracking-wide">{f.name}</span>
                    )}
                    <span className="ml-auto flex items-center opacity-0 transition-opacity group-hover:opacity-100">
                      <button onClick={(e) => { e.stopPropagation(); addPage(f.id); }} title="Add page" className="rounded p-0.5 text-ink-faint hover:bg-white hover:text-ink">
                        <IconPlus width={14} />
                      </button>
                      <button onClick={(e) => { e.stopPropagation(); setRenamingFolder(f.id); }} title="Rename" className="rounded p-0.5 text-ink-faint hover:bg-white hover:text-ink">
                        <IconEdit width={14} />
                      </button>
                      <button onClick={(e) => { e.stopPropagation(); setConfirmDel({ kind: "folder", id: f.id, name: f.name }); }} title="Delete" className="rounded p-0.5 text-ink-faint hover:bg-white hover:text-rose">
                        <IconTrash width={14} />
                      </button>
                    </span>
                  </div>
                  {!f.collapsed && (
                    <div className="ml-3 border-l border-line pl-1">
                      {fpages.length === 0 ? (
                        <button
                          onClick={() => addPage(f.id)}
                          className="flex w-full items-center gap-1.5 rounded-lg px-3 py-1.5 text-left text-xs text-ink-faint transition-colors hover:bg-slate-100 hover:text-indigo"
                        >
                          <IconPlus width={13} /> Add page here
                        </button>
                      ) : (
                        <>
                          {fpages.map((p) => renderPageRow(p, true))}
                          <button
                            onClick={() => addPage(f.id)}
                            className="mt-0.5 flex w-full items-center gap-1.5 rounded-lg px-3 py-1.5 text-left text-xs text-ink-faint transition-colors hover:bg-slate-100 hover:text-indigo"
                          >
                            <IconPlus width={13} /> Add page
                          </button>
                        </>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </aside>

        {/* Canvas */}
        <main
          ref={mainRef}
          onDragOver={(e) => {
            if (draggingId !== null) autoScroll(e.clientY);
          }}
          className="relative min-h-0 flex-1 overflow-y-auto p-6"
        >
          {booting ? (
            <BootSkeleton />
          ) : view === "data" ? (
            <DataView
              pageName={active.name}
              filters={{ month: gMonth, year: gYear, region: gRegion }}
              notify={pushToast}
            />
          ) : (
            <>
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h1 className="text-xl font-semibold tracking-tight">{active.name}</h1>
                  <p className="mt-1 text-sm text-ink-faint">
                    {active.charts.length} charts · {rangeLabel(range)}
                    {(gMonth !== "all" || gYear !== "2026" || gRegion !== "all") && (
                      <span className="ml-2 rounded-full bg-indigo-soft px-2 py-0.5 text-[11px] font-medium text-indigo">
                        Filter: {gMonth === "all" ? "All" : gMonth} {gYear}
                        {gRegion !== "all" && ` · ${gRegion.toUpperCase()}`}
                      </span>
                    )}
                  </p>
                </div>
                <span className={`flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium transition-colors ${saved ? "bg-emerald/10 text-emerald" : "bg-slate-100 text-ink-faint"}`}>
                  {saved ? (
                    <>
                      <IconCloud width={14} /> Saved
                    </>
                  ) : (
                    <>
                      <span className="spin h-3 w-3 rounded-full border-2 border-slate-300 border-t-ink-faint" /> Saving…
                    </>
                  )}
                </span>
              </div>

              {/* Filter bar */}
              {active.charts.length > 0 && (
                <div className="mt-4 flex flex-wrap items-center gap-2">
                  <Dropdown
                    icon={<IconCalendar width={15} className="text-ink-faint" />}
                    value={range}
                    onChange={(v) => setRange(v as Range)}
                    options={[
                      { value: "7d", label: "Last 7 days" },
                      { value: "30d", label: "Last 30 days" },
                      { value: "12m", label: "Last 12 months" },
                    ]}
                  />
                  <Dropdown
                    value={source}
                    onChange={setSource}
                    options={[
                      { value: "orders", label: "Orders" },
                      { value: "sessions", label: "Sessions" },
                      { value: "subscriptions", label: "Subscriptions" },
                    ]}
                  />
                  <div className="ml-auto text-xs text-ink-faint">Drag anywhere on the grid · corner to resize · ⌘/Ctrl+Z to undo</div>
                </div>
              )}

              {active.charts.length === 0 ? (
                <div className="mt-6 flex flex-col items-center justify-center gap-4 rounded-xl border-2 border-dashed border-line py-20 text-center">
                  <div className="flex h-20 w-20 items-center justify-center rounded-2xl bg-indigo-soft text-indigo">
                    <IconChart width={36} />
                  </div>
                  <div>
                    <div className="text-base font-semibold">Belum ada chart di sini</div>
                    <p className="mt-1 text-sm text-ink-faint">Mulai visualisasikan data Anda dengan chart pertama.</p>
                  </div>
                  <Btn className="px-5" onClick={() => setAddOpen(true)}>
                    <IconPlus width={16} /> Add Your First Chart
                  </Btn>
                </div>
              ) : (
                (() => {
                  const dragChart = active.charts.find((c) => c.id === draggingId);
                  const rowsUsed = active.charts.reduce((m, c) => Math.max(m, c.y + c.h), 0);
                  const rows = Math.max(rowsUsed, dragChart && dragCell ? dragCell.y + dragChart.h : 0) + (draggingId ? 1 : 0);
                  return (
                    <div
                      ref={gridRef}
                      onDragOver={(e) => {
                        e.preventDefault();
                        if (dragChart) {
                          const cell = cellFromPointer(e.clientX, e.clientY, Math.min(dragChart.w, cols));
                          if (cell) setDragCell(cell);
                          autoScroll(e.clientY);
                        }
                      }}
                      onDrop={() => {
                        if (dragChart && dragCell) {
                          mutateActive((cs) => resolveDrop(cs, dragChart.id, dragCell.x, dragCell.y, cols));
                        }
                        setDraggingId(null);
                        setDragCell(null);
                        stopAutoScroll();
                      }}
                      className="relative mt-4 grid gap-4"
                      style={{
                        gridTemplateColumns: `repeat(${cols}, minmax(0,1fr))`,
                        gridAutoRows: "248px",
                        minHeight: rows ? rows * 264 : undefined,
                      }}
                    >
                      {/* Drop preview */}
                      {dragChart && dragCell && (
                        <div
                          className="pointer-events-none z-0 rounded-xl border-2 border-dashed border-indigo bg-indigo-soft/60"
                          style={{
                            gridColumn: `${dragCell.x + 1} / span ${Math.min(dragChart.w, cols)}`,
                            gridRow: `${dragCell.y + 1} / span ${dragChart.h}`,
                          }}
                        />
                      )}
                      {active.charts.map((c) => (
                        <ChartCard
                          key={c.id}
                          chart={c}
                          range={range}
                          gridRef={gridRef}
                          cols={cols}
                          drag={{
                            dragging: draggingId === c.id,
                            onDragStart: () => {
                              setDraggingId(c.id);
                              setDragCell({ x: c.x, y: c.y });
                            },
                            onDragEnd: () => {
                              setDraggingId(null);
                              setDragCell(null);
                              stopAutoScroll();
                            },
                          }}
                          onResize={(w, h) =>
                            mutateActive((cs) => {
                              const nx = Math.min(c.x, cols - Math.min(w, cols));
                              const resized = cs.map((x) => (x.id === c.id ? { ...x, w, h, x: nx } : x));
                              // Push any charts the enlarged card now overlaps to free cells.
                              return resolveDrop(resized, c.id, nx, c.y, cols);
                            })
                          }
                          onDelete={() => {
                            mutateActive((cs) => cs.filter((x) => x.id !== c.id));
                            pushToast("rose", "Chart dihapus");
                          }}
                          onDuplicate={() => {
                            addChart({ ...c, id: uid(), title: `${c.title} (copy)` });
                            pushToast("indigo", "Chart diduplikasi");
                          }}
                        />
                      ))}
                    </div>
                  );
                })()
              )}

              {active.charts.length > 0 && (
                <button onClick={() => setAddOpen(true)} className="fixed bottom-6 right-6 z-20 flex items-center gap-2 rounded-full bg-indigo px-5 py-3 text-sm font-semibold text-white shadow-lg shadow-indigo/40 transition-transform hover:scale-105">
                  <IconPlus width={18} /> Add Chart
                </button>
              )}
            </>
          )}
        </main>
      </div>

      {addOpen && (
        <AddChartModal
          onClose={() => setAddOpen(false)}
          onPublish={(c) => {
            addChart(c);
            setAddOpen(false);
            pushToast("emerald", "Chart berhasil dipublish");
          }}
        />
      )}
      {profileOpen && (
        <ProfileModal
          name={profileName}
          onName={setProfileName}
          email="ayu@northstar.io"
          stats={{ folders: folders.length, pages: pages.length, charts: pages.reduce((s, p) => s + p.charts.length, 0) }}
          aiKeys={aiKeys}
          setAiKeys={setAiKeys}
          onClose={() => setProfileOpen(false)}
          onLogout={() => { setProfileOpen(false); setAuthed(false); }}
          notify={pushToast}
        />
      )}
      {confirmDel && (
        <ConfirmDelete
          title={confirmDel.kind === "page" ? `Hapus Page "${confirmDel.name}"?` : `Hapus Folder "${confirmDel.name}"?`}
          body={
            confirmDel.kind === "page"
              ? "Semua chart di dalamnya akan ikut terhapus. Tindakan ini tidak dapat dibatalkan."
              : "Folder beserta semua page di dalamnya akan terhapus permanen."
          }
          onCancel={() => setConfirmDel(null)}
          onConfirm={doDelete}
        />
      )}
      <ToastStack toasts={toasts} dismiss={dismiss} />
    </div>
  );
}

// ---------------------------------------------------------------------------
// Login + skeleton
// ---------------------------------------------------------------------------
function LoginScreen({ onLogin }: { onLogin: () => void }) {
  const [email, setEmail] = useState("ayu@northstar.io");
  const [pw, setPw] = useState("");
  const [loading, setLoading] = useState(false);
  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setTimeout(onLogin, 600);
  };
  return (
    <div className="flex h-full items-center justify-center bg-gradient-to-b from-slate-50 to-white p-6">
      <form onSubmit={submit} className="w-full max-w-sm">
        <div className="mb-8 flex flex-col items-center gap-3 text-center">
          <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-indigo text-white shadow-lg shadow-indigo/30">
            <IconChart width={24} />
          </span>
          <div>
            <div className="text-lg font-semibold tracking-tight text-ink">Northstar Analytics</div>
            <div className="mt-1 text-sm text-ink-faint">Sign in to your workspace</div>
          </div>
        </div>
        <div className="space-y-4">
          <Field label="Email">
            <input className={inputCls} value={email} onChange={(e) => setEmail(e.target.value)} />
          </Field>
          <Field label="Password">
            <input type="password" placeholder="••••••••" className={inputCls} value={pw} onChange={(e) => setPw(e.target.value)} />
          </Field>
          <Btn type="submit" disabled={loading} className="w-full">
            {loading ? (
              <span className="flex items-center gap-2">
                <span className="spin h-4 w-4 rounded-full border-2 border-white/40 border-t-white" /> Signing in
              </span>
            ) : (
              "Login"
            )}
          </Btn>
        </div>
      </form>
    </div>
  );
}

function BootSkeleton() {
  return (
    <>
      <div className="shimmer h-6 w-48 rounded-md bg-slate-200" />
      <div className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
        {[0, 1, 2, 3, 4, 5].map((i) => (
          <div key={i} className="rounded-xl border border-line p-4">
            <div className="shimmer h-4 w-24 rounded bg-slate-200" />
            <div className="shimmer mt-4 h-32 rounded-lg bg-slate-100" />
          </div>
        ))}
      </div>
    </>
  );
}
