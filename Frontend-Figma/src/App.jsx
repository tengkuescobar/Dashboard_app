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
  IconGauge,
  IconGlobe,
  IconGrid,
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
  heatmapMatrix,
  heatmapRows,
  series,
  stackedData,
  stackedKeys,
  varianceData,
} from "./data";

// ---------------------------------------------------------------------------
// Icon registry (page icons are stored as a string key so they stay swappable)
// ---------------------------------------------------------------------------
const ICONS = {
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
// Seed data & helpers
// ---------------------------------------------------------------------------
const uid = () => Math.random().toString(36).slice(2, 9);

const typeMeta = {
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

const mk = (type, title, broken) => ({
  id: uid(),
  type,
  title,
  x: 0,
  y: 0,
  w: typeMeta[type]?.w ?? 1,
  h: typeMeta[type]?.h ?? 1,
  broken,
});

const rawSeedPages = [
  {
    id: "p1",
    name: "Sales Overview",
    icon: "chart",
    charts: [
      mk("bar", "Revenue by Month"),
      mk("line", "Weekly Signups"),
      mk("donut", "Traffic Sources"),
      mk("summary", "Performance Summary"),
    ],
  },
  {
    id: "p2",
    name: "Marketing Report",
    icon: "line",
    charts: [
      mk("line", "Campaign Reach"),
      mk("bar", "Lead Conversion"),
      mk("donut", "Channel Distribution"),
    ],
  },
  {
    id: "p3",
    name: "Product Analytics",
    icon: "grid",
    charts: [], // Empty state (2b)
  },
  {
    id: "p4",
    name: "Interactive States (3b)",
    icon: "donut",
    charts: [],
    isInteractiveDemo: true,
  },
];
const seedPages = rawSeedPages;

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
}) {
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

function Field({ label, error, children }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-xs font-medium text-ink-soft">{label}</span>
      {children}
      {error && <span className="mt-1 block text-xs text-rose">{error}</span>}
    </label>
  );
}

function Dots({ active }) {
  return (
    <div className="flex items-center gap-1.5">
      {[0, 1, 2].map((i) => (
        <span key={i} className={`h-1.5 rounded-full transition-all ${i === active ? "w-5 bg-indigo" : "w-1.5 bg-slate-300"}`} />
      ))}
    </div>
  );
}

function Select({ children, ...props }) {
  return (
    <div className="relative">
      <select className={`${inputCls} appearance-none pr-9`} {...props}>
        {children}
      </select>
      <IconChevronDown width={14} className="pointer-events-none absolute right-3 top-3.5 text-ink-faint" />
    </div>
  );
}

// ---------------------------------------------------------------------------
// Chart renderer
// ---------------------------------------------------------------------------
function ChartBody({ chart, range }) {
  const [state, setState] = useState("ok");
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
// Clean chart card (header + titik tiga + body)
// ---------------------------------------------------------------------------
function ChartCard({
  chart,
  range,
  onDelete,
  onDuplicate,
  onEdit,
}) {
  const [menu, setMenu] = useState(false);

  return (
    <div className="group relative flex min-h-[300px] flex-col rounded-xl border border-line bg-white p-4 shadow-sm transition-all hover:border-indigo/50 hover:shadow-md">
      <div className="mb-3 flex items-center justify-between">
        <h3 className="text-sm font-semibold text-ink">{chart.title}</h3>
        <button
          type="button"
          onClick={() => setMenu((m) => !m)}
          className={`rounded p-1 text-ink-faint transition-opacity hover:bg-slate-100 hover:text-ink ${
            menu ? "opacity-100" : "opacity-0 group-hover:opacity-100"
          }`}
          title="More options"
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
          <div className="absolute right-3 top-10 z-20 w-36 overflow-hidden rounded-lg border border-line bg-white py-1 text-sm shadow-lg">
            <button
              type="button"
              onClick={() => {
                onEdit();
                setMenu(false);
              }}
              className="flex w-full items-center gap-2 px-3 py-1.5 text-ink-soft hover:bg-slate-50"
            >
              <IconEdit width={14} /> Edit
            </button>
            <button
              type="button"
              onClick={() => {
                onDuplicate();
                setMenu(false);
              }}
              className="flex w-full items-center gap-2 px-3 py-1.5 text-ink-soft hover:bg-slate-50"
            >
              <IconCopy width={14} /> Duplicate
            </button>
            <div className="my-1 h-px bg-line" />
            <button
              type="button"
              onClick={() => {
                onDelete();
                setMenu(false);
              }}
              className="flex w-full items-center gap-2 px-3 py-1.5 text-rose hover:bg-rose/5"
            >
              <IconTrash width={14} /> Delete
            </button>
          </div>
        </>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Toasts
// ---------------------------------------------------------------------------
const toastIcon = {
  emerald: <IconCloud width={18} />,
  rose: <IconWarning width={18} />,
  indigo: <IconRefresh width={18} />,
  amber: <IconWifi width={18} />,
};

function ToastStack({ toasts, dismiss }) {
  const map = {
    emerald: "text-emerald bg-emerald/10",
    rose: "text-rose bg-rose/10",
    indigo: "text-indigo bg-indigo/10",
    amber: "text-amber bg-amber/10",
  };
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
// Add Chart wizard (Steps 1 -> 2A/2B -> 3 -> Ask AI)
// ---------------------------------------------------------------------------
const WIZARD_TYPES = [
  { type: "bar", label: "Bar Chart", icon: IconChart },
  { type: "line", label: "Line Chart", icon: IconLine },
  { type: "donut", label: "Donut Chart", icon: IconDonut },
  { type: "summary", label: "Custom (YAML)", icon: IconCode },
];

function AddChartModal({ onClose, onPublish }) {
  const [tab, setTab] = useState("builder");
  const [step, setStep] = useState(0); // 0: Step 1, 1: Step 2A/2B, 2: Step 3
  const [type, setType] = useState("bar");
  const [title, setTitle] = useState("");
  const [titleErr, setTitleErr] = useState(false);
  const [customTab, setCustomTab] = useState("write");
  const [yamlErr, setYamlErr] = useState(true);
  const [publishing, setPublishing] = useState(false);
  const [ai, setAi] = useState("");
  const [aiState, setAiState] = useState("idle");

  const isCustom = type === "summary";

  const getStepTitle = () => {
    if (step === 0) return "Add Chart";
    if (step === 1) return isCustom ? "Custom Chart (YAML)" : `Configure ${typeMeta[type].label}`;
    return "Preview";
  };

  const goPreview = () => {
    if (!isCustom && !title.trim()) {
      setTitleErr(true);
      return;
    }
    setStep(2);
  };

  const publish = () => {
    setPublishing(true);
    setTimeout(() => {
      onPublish({ ...mk(type, title.trim() || typeMeta[type].label) });
    }, 1000);
  };

  const runAi = () => {
    if (!ai.trim()) return;
    setAiState("thinking");
    setTimeout(() => {
      setAiState(/revenue|region|sales|bar|line|trend|source|country|geo/i.test(ai) ? "result" : "noData");
    }, 1400);
  };

  return (
    <Overlay onClose={onClose}>
      <div className="w-full max-w-2xl overflow-hidden rounded-2xl border border-line bg-white shadow-2xl">
        {/* Modal Header */}
        <div className="flex items-center justify-between border-b border-line px-6 py-4">
          <div className="flex items-center gap-2">
            {tab === "builder" && step > 0 && (
              <button
                onClick={() => setStep(step - 1)}
                className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-sm font-medium text-ink-soft hover:bg-slate-100 hover:text-ink"
              >
                <IconChevronLeft width={16} /> Back
              </button>
            )}
            {tab === "builder" && step > 0 ? (
              <h2 className="text-base font-semibold text-ink">{getStepTitle()}</h2>
            ) : (
              <div className="flex gap-2">
                <button
                  onClick={() => { setTab("builder"); setStep(0); }}
                  className={`flex items-center gap-1.5 border-b-2 pb-1 text-sm font-medium transition-colors ${
                    tab === "builder" ? "border-indigo text-ink font-semibold" : "border-transparent text-ink-faint hover:text-ink-soft"
                  }`}
                >
                  Add Chart
                </button>
                <button
                  onClick={() => setTab("ai")}
                  className={`flex items-center gap-1.5 border-b-2 pb-1 text-sm font-medium transition-colors ${
                    tab === "ai" ? "border-indigo text-ink font-semibold" : "border-transparent text-ink-faint hover:text-ink-soft"
                  }`}
                >
                  <IconSparkle width={15} className={tab === "ai" ? "text-indigo" : ""} />
                  Ask AI
                </button>
              </div>
            )}
          </div>
          <div className="flex items-center gap-4">
            {tab === "builder" && <Dots active={step} />}
            <button onClick={onClose} className="rounded p-1 text-ink-faint hover:bg-slate-100">
              <IconClose width={18} />
            </button>
          </div>
        </div>

        {tab === "builder" ? (
          <>
            {/* Step 1: Pilih Tipe (4 kartu sejajar) */}
            {step === 0 && (
              <div className="p-6">
                <div className="mb-3 text-xs font-medium text-ink-faint">Pilih salah satu tipe chart di bawah:</div>
                <div className="grid grid-cols-4 gap-3.5">
                  {WIZARD_TYPES.map((t) => {
                    const Icon = t.icon;
                    const active = type === t.type;
                    return (
                      <button
                        key={t.type}
                        onClick={() => setType(t.type)}
                        onDoubleClick={() => {
                          setType(t.type);
                          setStep(1);
                        }}
                        className={`group flex flex-col items-center gap-3 rounded-xl border p-4 text-center transition-all ${
                          active
                            ? "border-indigo bg-indigo-soft/60 shadow-[0_8px_24px_-10px_rgba(99,102,241,0.45)] ring-1 ring-indigo"
                            : "border-line hover:border-indigo hover:shadow-md hover:scale-[1.02]"
                        }`}
                      >
                        <span
                          className={`flex h-12 w-12 items-center justify-center rounded-xl transition-all ${
                            active
                              ? "scale-110 bg-indigo text-white shadow-sm"
                              : "bg-slate-100 text-ink-soft group-hover:scale-105 group-hover:bg-indigo-soft group-hover:text-indigo"
                          }`}
                        >
                          <Icon width={24} />
                        </span>
                        <span className={`text-xs font-semibold leading-tight ${active ? "text-indigo-dark" : "text-ink"}`}>
                          {t.label}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Step 2A: Konfigurasi Cepat (Bar / Line / Donut) */}
            {step === 1 && !isCustom && (
              <div className="space-y-4 p-6">
                <Field label="Chart Title" error={titleErr ? "Judul chart wajib diisi" : undefined}>
                  <input
                    autoFocus
                    value={title}
                    onChange={(e) => {
                      setTitle(e.target.value);
                      if (e.target.value.trim()) setTitleErr(false);
                    }}
                    placeholder="e.g. Revenue by Region"
                    className={titleErr ? "w-full rounded-lg border border-rose bg-rose/5 px-3 py-2.5 text-sm outline-none ring-2 ring-rose/20 text-rose" : inputCls}
                  />
                </Field>
                <div className="grid grid-cols-2 gap-4">
                  <Field label="Data Source">
                    <Select defaultValue="orders">
                      <option value="orders">Orders (BigQuery)</option>
                      <option value="sessions">Sessions</option>
                      <option value="subscriptions">Subscriptions</option>
                    </Select>
                  </Field>
                  <Field label="Dimension">
                    <Select defaultValue="region">
                      <option value="region">Region</option>
                      <option value="month">Month</option>
                      <option value="channel">Channel</option>
                    </Select>
                  </Field>
                </div>
                <Field label="Metric">
                  <Select defaultValue="revenue">
                    <option value="revenue">Sum of Revenue</option>
                    <option value="orders">Count of Orders</option>
                    <option value="aov">Avg Order Value</option>
                  </Select>
                </Field>
              </div>
            )}

            {/* Step 2B: Custom YAML */}
            {step === 1 && isCustom && (
              <div className="p-6">
                <div className="mb-4 inline-flex rounded-lg bg-slate-100 p-1">
                  {["upload", "write"].map((t) => (
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
                        <button
                          type="button"
                          onClick={() => setYamlErr((e) => !e)}
                          className="ml-auto text-xs text-slate-400 hover:text-white"
                        >
                          {yamlErr ? "[Demo: Fix Error]" : "[Demo: Trigger Error]"}
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

            {/* Step 3: Preview & Publish */}
            {step === 2 && (
              <div className="p-6">
                <div className="rounded-xl border border-line bg-slate-50/50 p-5">
                  <div className="mb-3 text-sm font-semibold text-ink">{title.trim() || typeMeta[type].label}</div>
                  <PreviewChart type={type} />
                </div>
              </div>
            )}

            {/* Modal Footer */}
            <div className="flex items-center justify-between border-t border-line px-6 py-4">
              <Btn variant="outline" onClick={onClose}>
                Cancel
              </Btn>
              <div className="flex gap-2">
                {step === 0 && <Btn onClick={() => setStep(1)}>Continue</Btn>}
                {step === 1 && (
                  <Btn onClick={goPreview} disabled={isCustom && yamlErr}>
                    Preview
                  </Btn>
                )}
                {step === 2 && (
                  <Btn onClick={publish} disabled={publishing} className="min-w-[96px]">
                    {publishing ? (
                      <span className="spin h-4 w-4 rounded-full border-2 border-white/40 border-t-white" />
                    ) : (
                      "Publish"
                    )}
                  </Btn>
                )}
              </div>
            </div>
          </>
        ) : (
          /* Tab Ask AI */
          <div className="space-y-4 p-6">
            <div className="flex items-center gap-2 rounded-xl border border-line bg-white p-2 shadow-sm focus-within:border-indigo focus-within:ring-2 focus-within:ring-indigo/20">
              <input
                value={ai}
                onChange={(e) => setAi(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && runAi()}
                className="flex-1 bg-transparent px-2 text-sm outline-none placeholder:text-ink-faint"
                placeholder="Describe the chart you want, e.g. 'Show revenue by region as a bar chart'"
              />
              <button
                onClick={runAi}
                className="flex h-9 w-9 items-center justify-center rounded-lg bg-indigo text-white transition-colors hover:bg-indigo-dark"
              >
                <IconSend width={16} />
              </button>
            </div>

            {/* State Switcher for Previewing All AI States */}
            <div className="flex items-center gap-1.5 text-xs text-ink-faint">
              <span>Preview state:</span>
              <button
                type="button"
                onClick={() => setAiState("thinking")}
                className={`rounded px-1.5 py-0.5 font-medium hover:bg-slate-100 ${aiState === "thinking" ? "text-indigo bg-indigo-soft" : ""}`}
              >
                Thinking
              </button>
              <span>·</span>
              <button
                type="button"
                onClick={() => setAiState("result")}
                className={`rounded px-1.5 py-0.5 font-medium hover:bg-slate-100 ${aiState === "result" ? "text-indigo bg-indigo-soft" : ""}`}
              >
                Success Result
              </button>
              <span>·</span>
              <button
                type="button"
                onClick={() => setAiState("noData")}
                className={`rounded px-1.5 py-0.5 font-medium hover:bg-slate-100 ${aiState === "noData" ? "text-indigo bg-indigo-soft" : ""}`}
              >
                No Data
              </button>
            </div>

            {aiState === "thinking" && (
              <div className="flex items-center gap-3 rounded-xl bg-slate-50 p-4">
                <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-soft text-indigo">
                  <IconSparkle width={16} />
                </span>
                <span className="text-sm font-medium text-ink-soft">AI is thinking...</span>
                <span className="flex gap-1">
                  {[0, 1, 2].map((i) => (
                    <span
                      key={i}
                      className="h-1.5 w-1.5 rounded-full bg-indigo"
                      style={{ animation: `typing-bounce 1.2s ${i * 0.15}s infinite` }}
                    />
                  ))}
                </span>
              </div>
            )}

            {aiState === "result" && (
              <div className="rounded-xl border border-line p-4">
                <div className="mb-3 text-sm font-semibold text-ink">Revenue by Region</div>
                <BarChart data={series("12m")} color={SERIES[0]} />
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
                    <span className="font-medium text-ink">sessions</span>,{" "}
                    <span className="font-medium text-ink">subscriptions</span>.
                  </p>
                </div>
              </div>
            )}

            {aiState === "idle" && (
              <p className="px-1 text-xs text-ink-faint">Tip: sebutkan sumber data (orders, sessions, subscriptions).</p>
            )}
          </div>
        )}
      </div>
    </Overlay>
  );
}

function PreviewChart({ type }) {
  switch (type) {
    case "line":
      return <LineChart data={series("12m")} />;
    case "donut":
      return <DonutChart data={donutData} />;
    case "summary":
      return (
        <div className="flex flex-col justify-center gap-3 py-2">
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
    default:
      return <BarChart data={series("12m")} />;
  }
}

// ---------------------------------------------------------------------------
// Overlay + confirm dialog
// ---------------------------------------------------------------------------
function Overlay({ children, onClose }) {
  useEffect(() => {
    const h = (e) => e.key === "Escape" && onClose();
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

function ConfirmDelete({ title, body, onCancel, onConfirm }) {
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

function initials(name) {
  return name.trim().split(/\s+/).slice(0, 2).map((s) => s[0]?.toUpperCase() ?? "").join("") || "?";
}

// ---------------------------------------------------------------------------
// 3b & 10: Interactive States & Toast Showcase View
// ---------------------------------------------------------------------------
function InteractiveStatesView({ onTriggerToast }) {
  const [retryLoading, setRetryLoading] = useState(false);
  const handleRetry = () => {
    setRetryLoading(true);
    setTimeout(() => setRetryLoading(false), 1200);
  };

  return (
    <div className="space-y-8">
      {/* 3b: Donut Chart 3 Kondisi Berdampingan */}
      <div>
        <div className="mb-3">
          <h2 className="text-base font-semibold text-ink">3b. Donut Chart — Interactive States (3 Kondisi Berdampingan)</h2>
          <p className="text-xs text-ink-faint">Menampilkan 3 kondisi visual berdampingan sesuai spec</p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Kondisi A: Normal */}
          <div className="rounded-xl border border-line bg-white p-4 shadow-sm">
            <div className="mb-2 text-xs font-semibold text-ink-soft uppercase tracking-wider">(a) Normal</div>
            <div className="h-48 flex items-center justify-center">
              <DonutChart data={donutData} forceTooltip={false} />
            </div>
          </div>

          {/* Kondisi B: Hover pada salah satu slice */}
          <div className="rounded-xl border border-indigo/40 bg-white p-4 shadow-md">
            <div className="mb-2 text-xs font-semibold text-indigo uppercase tracking-wider">(b) Hover Slice (Highlighted + Tooltip)</div>
            <div className="h-48 flex items-center justify-center">
              <DonutChart data={donutData} activeSlice={0} forceTooltip={true} />
            </div>
          </div>

          {/* Kondisi C: Legend di-hover */}
          <div className="rounded-xl border border-line bg-white p-4 shadow-sm">
            <div className="mb-2 text-xs font-semibold text-ink-soft uppercase tracking-wider">(c) Legend di-hover (Row Highlighted)</div>
            <div className="h-48 flex items-center justify-center">
              <DonutChart data={donutData} hoverLegend={1} forceTooltip={false} />
            </div>
          </div>
        </div>
      </div>

      {/* 3b: Error & Loading States */}
      <div>
        <div className="mb-3">
          <h2 className="text-base font-semibold text-ink">3b. Chart States — Error &amp; Loading</h2>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Error state */}
          <div className="rounded-xl border border-line bg-white p-4 shadow-sm">
            <div className="mb-3 flex items-center justify-between">
              <h3 className="text-sm font-semibold text-ink">Traffic Acquisition (Error State)</h3>
              <span className="rounded bg-rose/10 px-2 py-0.5 text-[11px] font-medium text-rose">Error</span>
            </div>
            <div className="h-48 flex flex-col items-center justify-center gap-2 text-center">
              {retryLoading ? (
                <div className="flex flex-1 items-end gap-2 px-1 py-4 w-full">
                  {[40, 70, 55, 85, 65, 90].map((h, i) => (
                    <div key={i} className="shimmer flex-1 rounded-md bg-slate-100" style={{ height: `${h}%` }} />
                  ))}
                </div>
              ) : (
                <>
                  <span className="flex h-11 w-11 items-center justify-center rounded-full bg-rose/10 text-rose">
                    <IconWarning width={22} />
                  </span>
                  <div className="text-sm font-medium text-ink">Gagal memuat data</div>
                  <Btn variant="outline" className="mt-1 px-3 py-1.5 text-xs" onClick={handleRetry}>
                    <IconRefresh width={14} /> Coba Lagi
                  </Btn>
                </>
              )}
            </div>
          </div>

          {/* Loading shimmer skeleton state */}
          <div className="rounded-xl border border-line bg-white p-4 shadow-sm">
            <div className="mb-3 flex items-center justify-between">
              <h3 className="text-sm font-semibold text-ink">Weekly Signups (Loading State)</h3>
              <span className="rounded bg-indigo-soft px-2 py-0.5 text-[11px] font-medium text-indigo">Shimmer Skeleton</span>
            </div>
            <div className="h-48 flex flex-1 items-end gap-2 px-1 py-4">
              {[45, 65, 50, 80, 60, 95, 70].map((h, i) => (
                <div key={i} className="shimmer flex-1 rounded-md bg-slate-200" style={{ height: `${h}%` }} />
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* 10. Toast Notifications Showcase Frame */}
      <div>
        <div className="mb-3">
          <h2 className="text-base font-semibold text-ink">10. Toast Notifications (4 Varian dalam 1 Frame)</h2>
          <p className="text-xs text-ink-faint">Koleksi varian toast notification sesuai microcopy spesifikasi resmi</p>
        </div>
        <div className="rounded-2xl border border-line bg-slate-50/70 p-5">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {/* Toast Success */}
            <div className="flex items-center gap-3 rounded-xl border border-emerald/30 bg-white p-3 shadow-sm">
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-emerald/10 text-emerald">
                <IconCloud width={18} />
              </span>
              <div className="min-w-0 flex-1">
                <div className="text-xs font-semibold text-emerald">Toast Success (emerald)</div>
                <div className="text-sm font-medium text-ink">Chart berhasil dipublish</div>
              </div>
              <button
                type="button"
                onClick={() => onTriggerToast("emerald", "Chart berhasil dipublish")}
                className="rounded px-2.5 py-1 text-xs font-medium text-emerald bg-emerald/10 hover:bg-emerald/20 transition-colors"
              >
                Trigger
              </button>
            </div>

            {/* Toast Error */}
            <div className="flex items-center gap-3 rounded-xl border border-rose/30 bg-white p-3 shadow-sm">
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-rose/10 text-rose">
                <IconWarning width={18} />
              </span>
              <div className="min-w-0 flex-1">
                <div className="text-xs font-semibold text-rose">Toast Error (rose)</div>
                <div className="text-sm font-medium text-ink">Gagal menyimpan perubahan</div>
              </div>
              <button
                type="button"
                onClick={() => onTriggerToast("rose", "Gagal menyimpan perubahan")}
                className="rounded px-2.5 py-1 text-xs font-medium text-rose bg-rose/10 hover:bg-rose/20 transition-colors"
              >
                Trigger
              </button>
            </div>

            {/* Toast Info */}
            <div className="flex items-center gap-3 rounded-xl border border-indigo/30 bg-white p-3 shadow-sm">
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-indigo/10 text-indigo">
                <IconRefresh width={18} />
              </span>
              <div className="min-w-0 flex-1">
                <div className="text-xs font-semibold text-indigo">Toast Info (indigo)</div>
                <div className="text-sm font-medium text-ink">Data sedang disinkronkan</div>
              </div>
              <button
                type="button"
                onClick={() => onTriggerToast("indigo", "Data sedang disinkronkan")}
                className="rounded px-2.5 py-1 text-xs font-medium text-indigo bg-indigo/10 hover:bg-indigo/20 transition-colors"
              >
                Trigger
              </button>
            </div>

            {/* Toast Warning */}
            <div className="flex items-center gap-3 rounded-xl border border-amber/30 bg-white p-3 shadow-sm">
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-amber/10 text-amber">
                <IconWifi width={18} />
              </span>
              <div className="min-w-0 flex-1">
                <div className="text-xs font-semibold text-amber">Toast Warning (amber)</div>
                <div className="text-sm font-medium text-ink">Koneksi lambat terdeteksi</div>
              </div>
              <button
                type="button"
                onClick={() => onTriggerToast("amber", "Koneksi lambat terdeteksi")}
                className="rounded px-2.5 py-1 text-xs font-medium text-amber bg-amber/10 hover:bg-amber/20 transition-colors"
              >
                Trigger
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main Application (Page Manager, Canvas, Dialogs, Header)
// ---------------------------------------------------------------------------
export default function App() {
  const [authed, setAuthed] = useState(false);
  const [booting, setBooting] = useState(false);
  const [pages, setPages] = useState(() => seedPages);
  const [activeId, setActiveId] = useState("p1");
  const [pageMenu, setPageMenu] = useState(null);
  const [renaming, setRenaming] = useState(null);
  const [confirmDel, setConfirmDel] = useState(null);
  const [addOpen, setAddOpen] = useState(false);
  const [userMenu, setUserMenu] = useState(false);
  const [saved, setSaved] = useState(true);
  const [toasts, setToasts] = useState([]);
  const range = "12m";

  const active = pages.find((p) => p.id === activeId) ?? pages[0];

  const pushToast = (tone, text) => {
    const id = uid();
    setToasts((t) => [...t, { id, tone, text }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 3800);
  };
  const dismiss = (id) => setToasts((t) => t.filter((x) => x.id !== id));

  // Autosave indicator flicker
  const firstRun = useRef(true);
  useEffect(() => {
    if (firstRun.current) {
      firstRun.current = false;
      return;
    }
    setSaved(false);
    const t = setTimeout(() => setSaved(true), 600);
    return () => clearTimeout(t);
  }, [pages]);

  const login = () => {
    setBooting(true);
    setAuthed(true);
    setTimeout(() => setBooting(false), 900);
  };

  const addPage = () => {
    const p = { id: uid(), name: "Untitled Page", icon: "chart", charts: [] };
    setPages((prev) => [...prev, p]);
    setActiveId(p.id);
    setRenaming(p.id);
  };

  const doDelete = () => {
    if (!confirmDel) return;
    setPages((prev) => prev.filter((p) => p.id !== confirmDel.id));
    const remaining = pages.filter((p) => p.id !== confirmDel.id);
    if (activeId === confirmDel.id && remaining[0]) {
      setActiveId(remaining[0].id);
    }
    pushToast("rose", "Page dihapus");
    setConfirmDel(null);
  };

  const addChart = (chart) => {
    setPages((prev) =>
      prev.map((p) =>
        p.id === active.id ? { ...p, charts: [...p.charts, chart] } : p
      )
    );
  };

  const deleteChart = (chartId) => {
    setPages((prev) =>
      prev.map((p) =>
        p.id === active.id ? { ...p, charts: p.charts.filter((c) => c.id !== chartId) } : p
      )
    );
    pushToast("rose", "Chart dihapus");
  };

  const duplicateChart = (chart) => {
    addChart({ ...chart, id: uid(), title: `${chart.title} (copy)` });
    pushToast("indigo", "Chart diduplikasi");
  };

  const editChart = (chart) => {
    const newTitle = prompt("Masukkan judul baru untuk chart:", chart.title);
    if (newTitle && newTitle.trim()) {
      setPages((prev) =>
        prev.map((p) =>
          p.id === active.id
            ? { ...p, charts: p.charts.map((c) => (c.id === chart.id ? { ...c, title: newTitle.trim() } : c)) }
            : p
        )
      );
      pushToast("emerald", "Chart berhasil diperbarui");
    }
  };

  if (!authed) return <LoginScreen onLogin={login} />;

  const renderPageRow = (p) => {
    const Icon = ICONS[p.icon] ?? IconChart;
    const isActive = p.id === active.id;
    return (
      <div
        key={p.id}
        onClick={() => setActiveId(p.id)}
        className={`group relative flex cursor-pointer items-center gap-2 rounded-lg py-2 px-2.5 text-sm transition-colors ${
          isActive ? "bg-indigo-soft font-medium text-indigo-dark" : "text-ink-soft hover:bg-slate-100"
        }`}
      >
        <Icon width={16} className={isActive ? "text-indigo" : "text-ink-faint"} />
        {renaming === p.id ? (
          <input
            autoFocus
            defaultValue={p.name}
            onBlur={(e) => {
              setPages((prev) => prev.map((x) => (x.id === p.id ? { ...x, name: e.target.value || x.name } : x)));
              setRenaming(null);
            }}
            onKeyDown={(e) => e.key === "Enter" && e.target.blur()}
            onClick={(e) => e.stopPropagation()}
            className="w-full rounded border border-indigo bg-white px-1.5 py-0.5 text-sm outline-none"
          />
        ) : (
          <span className="truncate">{p.name}</span>
        )}
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            setPageMenu(pageMenu === p.id ? null : p.id);
          }}
          className={`ml-auto rounded p-1 text-ink-faint transition-opacity hover:bg-white hover:text-ink ${
            pageMenu === p.id ? "opacity-100" : "opacity-0 group-hover:opacity-100"
          }`}
        >
          <IconDots width={14} />
        </button>
        {pageMenu === p.id && (
          <>
            <div className="fixed inset-0 z-10" onClick={(e) => { e.stopPropagation(); setPageMenu(null); }} />
            <div className="absolute right-1 top-9 z-20 w-32 overflow-hidden rounded-lg border border-line bg-white py-1 text-sm shadow-lg">
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setRenaming(p.id);
                  setPageMenu(null);
                }}
                className="flex w-full items-center gap-2 px-3 py-1.5 text-ink-soft hover:bg-slate-50"
              >
                <IconEdit width={14} /> Rename
              </button>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setConfirmDel({ id: p.id, name: p.name });
                  setPageMenu(null);
                }}
                className="flex w-full items-center gap-2 px-3 py-1.5 text-rose hover:bg-rose/5"
              >
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
      {/* 2. Top Header */}
      <header className="flex h-14 shrink-0 items-center justify-between border-b border-line bg-white px-6">
        <div className="flex items-center gap-3">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo text-white shadow-sm">
            <IconChart width={18} />
          </span>
          <span className="text-sm font-semibold tracking-tight">Northstar Analytics</span>
        </div>

        <div className="flex items-center gap-4">
          {/* Demo toggle for 2c: Skeleton loading */}
          <button
            type="button"
            onClick={() => {
              setBooting(true);
              setTimeout(() => setBooting(false), 2000);
            }}
            className="hidden sm:inline-flex items-center gap-1.5 rounded-lg border border-line bg-slate-50 px-2.5 py-1 text-xs font-medium text-ink-soft hover:bg-slate-100 transition-colors"
          >
            <IconRefresh width={13} className={booting ? "animate-spin" : ""} /> Demo: Skeleton Loading (2c)
          </button>

          {/* User profile dropdown: avatar user + nama, dropdown berisi tombol Logout */}
          <div className="relative">
            <button
              type="button"
              onClick={() => setUserMenu((m) => !m)}
              className="flex items-center gap-2 rounded-full py-1 pl-1 pr-2.5 transition-colors hover:bg-slate-100"
            >
              <span className="flex h-7 w-7 items-center justify-center rounded-full bg-indigo text-xs font-semibold text-white">
                {initials("Ayu Rahma")}
              </span>
              <span className="text-sm font-medium">Ayu Rahma</span>
              <IconChevronDown width={14} className="text-ink-faint" />
            </button>

            {userMenu && (
              <>
                <div className="fixed inset-0 z-10" onClick={() => setUserMenu(false)} />
                <div className="absolute right-0 top-11 z-20 w-44 overflow-hidden rounded-lg border border-line bg-white py-1 text-sm shadow-lg">
                  <div className="border-b border-line px-3 py-2 text-xs text-ink-faint">ayu@northstar.io</div>
                  <button
                    type="button"
                    onClick={() => {
                      setAuthed(false);
                      setUserMenu(false);
                    }}
                    className="flex w-full items-center gap-2 px-3 py-2 text-rose hover:bg-rose/5"
                  >
                    <IconClose width={15} /> Logout
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      </header>

      <div className="flex min-h-0 flex-1">
        {/* 2. Sidebar kiri (~240px) */}
        <aside className="flex w-60 shrink-0 flex-col border-r border-line bg-slate-50/60 p-3">
          <button
            type="button"
            onClick={addPage}
            className="mb-3 flex w-full items-center justify-center gap-2 rounded-lg bg-indigo px-3 py-2 text-sm font-medium text-white shadow-sm transition-colors hover:bg-indigo-dark"
          >
            <IconPlus width={16} /> + New Page
          </button>

          {booting ? (
            /* 2c: Page Manager Loading State - Sidebar shimmer rows */
            <div className="flex flex-col gap-2 pt-2">
              {[0, 1, 2, 3].map((i) => (
                <div key={i} className="shimmer h-8 w-full rounded-lg bg-slate-200" />
              ))}
            </div>
          ) : (
            <div className="flex flex-col gap-1 overflow-y-auto">
              {pages.map((p) => renderPageRow(p))}
            </div>
          )}
        </aside>

        {/* Canvas Area */}
        <main className="relative min-h-0 flex-1 overflow-y-auto p-6">
          {booting ? (
            /* 2c: Page Manager Loading State - Canvas shimmer boxes */
            <BootSkeleton />
          ) : active.isInteractiveDemo ? (
            /* 3b & 10: Interactive States Showcase */
            <InteractiveStatesView onTriggerToast={pushToast} />
          ) : active.charts.length === 0 ? (
            /* 2b: Page Manager — Empty State */
            <div className="mt-8 flex flex-col items-center justify-center gap-4 rounded-xl border-2 border-dashed border-line py-24 text-center">
              <div className="flex h-20 w-20 items-center justify-center rounded-2xl bg-indigo-soft text-indigo">
                <IconChart width={40} />
              </div>
              <div>
                <h2 className="text-lg font-semibold text-ink">Belum ada chart di sini</h2>
                <p className="mt-1 text-sm text-ink-faint">Mulai visualisasikan data Anda dengan chart pertama.</p>
              </div>
              <Btn className="px-6 py-3 text-base font-medium shadow-md" onClick={() => setAddOpen(true)}>
                <IconPlus width={18} /> + Add Your First Chart
              </Btn>
            </div>
          ) : (
            /* 3: Canvas Berisi Chart (Contoh Terisi) */
            <>
              <div className="flex items-center justify-between gap-3">
                <h1 className="text-xl font-semibold tracking-tight text-ink">{active.name}</h1>
                {/* Autosave indicator */}
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

              <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-4">
                {active.charts.map((c) => (
                  <ChartCard
                    key={c.id}
                    chart={c}
                    range={range}
                    onDelete={() => deleteChart(c.id)}
                    onDuplicate={() => duplicateChart(c)}
                    onEdit={() => editChart(c)}
                  />
                ))}
              </div>

              {/* Floating button + Add Chart */}
              <button
                type="button"
                onClick={() => setAddOpen(true)}
                className="fixed bottom-6 right-6 z-20 flex items-center gap-2 rounded-full bg-indigo px-5 py-3 text-sm font-semibold text-white shadow-lg shadow-indigo/40 transition-transform hover:scale-105"
              >
                <IconPlus width={18} /> + Add Chart
              </button>
            </>
          )}
        </main>
      </div>

      {/* 4-8. Modal Add Chart */}
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

      {/* 9. Dialog Konfirmasi Hapus */}
      {confirmDel && (
        <ConfirmDelete
          title={`Hapus Page '${confirmDel.name}'?`}
          body="Semua chart di dalamnya akan ikut terhapus."
          onCancel={() => setConfirmDel(null)}
          onConfirm={doDelete}
        />
      )}

      {/* 10. Toast Notifications Stack */}
      <ToastStack toasts={toasts} dismiss={dismiss} />
    </div>
  );
}

// ---------------------------------------------------------------------------
// 1. Login Screen
// ---------------------------------------------------------------------------
function LoginScreen({ onLogin }) {
  const [email, setEmail] = useState("ayu@northstar.io");
  const [pw, setPw] = useState("");
  const submit = (e) => {
    e.preventDefault();
    onLogin();
  };

  return (
    <div className="flex h-full items-center justify-center bg-gradient-to-b from-slate-50 to-white p-6">
      <form onSubmit={submit} className="w-full max-w-sm rounded-2xl border border-line bg-white p-8 shadow-sm">
        <div className="mb-6 flex flex-col items-center gap-3 text-center">
          <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-indigo text-white shadow-lg shadow-indigo/30">
            <IconChart width={24} />
          </span>
          <div className="text-lg font-semibold tracking-tight text-ink">Northstar Analytics</div>
        </div>
        <div className="space-y-4">
          <Field label="Email">
            <input
              className={inputCls}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="user@example.com"
            />
          </Field>
          <Field label="Password">
            <input
              type="password"
              placeholder="••••••••"
              className={inputCls}
              value={pw}
              onChange={(e) => setPw(e.target.value)}
            />
          </Field>
          <Btn type="submit" className="w-full bg-indigo hover:bg-indigo-dark py-2.5 text-sm font-semibold">
            Login
          </Btn>
        </div>
      </form>
    </div>
  );
}

// ---------------------------------------------------------------------------
// 2c. Skeleton Loading State for Canvas
// ---------------------------------------------------------------------------
function BootSkeleton() {
  return (
    <div>
      <div className="shimmer h-7 w-48 rounded-md bg-slate-200" />
      <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-4">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="rounded-xl border border-line bg-white p-4 shadow-sm">
            <div className="shimmer h-4 w-28 rounded bg-slate-200" />
            <div className="shimmer mt-4 h-48 rounded-lg bg-slate-100" />
          </div>
        ))}
      </div>
    </div>
  );
}
