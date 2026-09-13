import { useEffect, useRef, useState } from "react";
import { load as loadYaml } from "js-yaml";
import {
  BarChart,
  ComboChart,
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
  IconColumns,
  IconCompare,
  IconCopy,
  IconDonut,
  IconDots,
  IconEdit,
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
  IconTable,
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
import {
  login as apiLogin,
  logout as apiLogout,
  getPages as apiGetPages,
  createPage as apiCreatePage,
  updatePage as apiUpdatePage,
  deletePage as apiDeletePage,
  reorderPages as apiReorderPages,
  fetchReportData,
  getQueryCatalog,
  askAiGenerateChart,
  saveLlmApiKey,
  getDataMartMeta,
  queryDataMart,
  executeDataMartSql,
  getUsers,
  createUser,
  updateUser,
  deleteUser,
  getAuthToken,
  getStoredUser,
} from "./api";

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
  combo: { icon: IconCompare, label: "Combo (Bar + Line)", w: 2, h: 1 },
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

const defaultSeedPages = [
  {
    id: 1,
    name: "Sales Overview",
    icon: "chart",
    charts: [
      {
        id: "c1",
        type: "bar",
        title: "Revenue by Region",
        endpoint: "/api/reports/region-revenue",
        dimension: "region",
        metric: "revenue",
        w: 1,
        h: 1,
      },
      {
        id: "c2",
        type: "donut",
        title: "Sales by Category",
        endpoint: "/api/reports/category-summary",
        dimension: "category",
        metric: "quantity",
        w: 1,
        h: 1,
      },
      {
        id: "c3",
        type: "line",
        title: "Weekly Signups",
        w: 1,
        h: 1,
      },
      {
        id: "c4",
        type: "summary",
        title: "Performance Summary",
        w: 1,
        h: 1,
      },
    ],
  },
  {
    id: 2,
    name: "Marketing Report",
    icon: "line",
    charts: [
      mk("line", "Campaign Reach"),
      mk("bar", "Lead Conversion"),
      mk("donut", "Channel Distribution"),
    ],
  },
  {
    id: 3,
    name: "Product Analytics",
    icon: "grid",
    charts: [], // Empty state (2b)
  },
  {
    id: 4,
    name: "Interactive States (3b)",
    icon: "donut",
    charts: [],
    isInteractiveDemo: true,
  },
];

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
// Chart renderer with real API support & spec states
// ---------------------------------------------------------------------------
function ChartBody({ chart, range }) {
  const [state, setState] = useState(
    chart.data && chart.data.length > 0
      ? "ok"
      : chart.sql || chart.query_config || chart.endpoint
      ? "loading"
      : "ok"
  );
  const [errored, setErrored] = useState(!!chart.broken);
  const [apiData, setApiData] = useState(chart.data && chart.data.length > 0 ? chart.data : null);

  useEffect(() => {
    if (chart.data && chart.data.length > 0) {
      setApiData(chart.data);
      setState("ok");
      return;
    }

    let active = true;

    if (chart.sql) {
      setState("loading");
      setErrored(false);
      executeDataMartSql(chart.sql)
        .then((res) => {
          if (!active) return;
          const rows = res?.rows || [];
          const cols = res?.columns || [];
          if (rows.length === 0) {
            setApiData([]);
            setState("ok");
            return;
          }
          const labelKey = cols.find((c) => typeof rows[0][c] === "string") || cols[0];
          const numCols = cols.filter((c) => c !== labelKey && !isNaN(Number(rows[0][c])));
          const formatted = rows.map((r) => {
            const item = { label: String(r[labelKey] || "Unknown") };
            if (numCols.length >= 2) {
              item.actual = Number(r[numCols[0]] || 0);
              item.target = Number(r[numCols[1]] || 0);
              item.value = item.actual;
            } else if (numCols.length === 1) {
              item.value = Number(r[numCols[0]] || 0);
            } else {
              item.value = Number(Object.values(r)[1] || 0);
            }
            return item;
          });
          setApiData(formatted);
          setState("ok");
        })
        .catch((err) => {
          if (!active) return;
          console.error("SQL load error:", err);
          setErrored(true);
          setState("error");
        });
      return () => { active = false; };
    }

    if (chart.query_config) {
      setState("loading");
      setErrored(false);
      queryDataMart(chart.query_config)
        .then((res) => {
          if (!active) return;
          setApiData(res?.data || []);
          setState("ok");
        })
        .catch((err) => {
          if (!active) return;
          console.error("Data Mart load error:", err);
          setErrored(true);
          setState("error");
        });
      return () => { active = false; };
    }

    if (chart.endpoint) {
      setState("loading");
      setErrored(false);
      fetchReportData(chart.endpoint)
        .then((res) => {
          if (!active) return;
          const raw = res?.data || [];
          const dim = chart.dimension || "region";
          const met = chart.metric || "revenue";
          const formatted = raw.map((item) => ({
            label: String(item[dim] || item.label || Object.keys(item)[0] || "Unknown"),
            value: Number(item[met] || item.value || Object.values(item)[1] || 0),
          }));
          setApiData(formatted);
          setState("ok");
        })
        .catch((err) => {
          if (!active) return;
          console.error("Failed to load chart data:", err);
          setErrored(true);
          setState("error");
        });
      return () => { active = false; };
    }

    setState("ok");
    return () => { active = false; };
  }, [chart.sql, chart.query_config, chart.endpoint, chart.data]);

  const handleRetry = () => {
    setErrored(false);
    setState("loading");
    if (chart.sql) {
      executeDataMartSql(chart.sql)
        .then((res) => {
          const rows = res?.rows || [];
          const cols = res?.columns || [];
          const labelKey = cols.find((c) => typeof rows[0]?.[c] === "string") || cols[0];
          const numCols = cols.filter((c) => c !== labelKey);
          setApiData(
            rows.map((r) => ({
              label: String(r[labelKey] || "Unknown"),
              value: Number(r[numCols[0]] || 0),
              actual: Number(r[numCols[0]] || 0),
              target: Number(r[numCols[1]] || 0),
            }))
          );
          setState("ok");
        })
        .catch(() => {
          setErrored(true);
          setState("error");
        });
    } else if (chart.endpoint) {
      fetchReportData(chart.endpoint)
        .then((res) => {
          const raw = res?.data || [];
          const dim = chart.dimension || "region";
          const met = chart.metric || "revenue";
          setApiData(
            raw.map((item) => ({
              label: String(item[dim] || item.label || "Unknown"),
              value: Number(item[met] || item.value || 0),
            }))
          );
          setState("ok");
        })
        .catch(() => {
          setErrored(true);
          setState("error");
        });
    } else {
      setTimeout(() => setState("ok"), 800);
    }
  };

  if (errored) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-2 text-center p-4">
        <span className="flex h-11 w-11 items-center justify-center rounded-full bg-rose/10 text-rose">
          <IconWarning width={22} />
        </span>
        <div className="text-sm font-medium text-ink">Gagal memuat data</div>
        <Btn variant="outline" className="mt-1 px-3 py-1.5 text-xs" onClick={handleRetry}>
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

  if (chart.customSvg || chart.svg) {
    return (
      <div
        className="flex h-full w-full items-center justify-center overflow-hidden p-2"
        dangerouslySetInnerHTML={{ __html: chart.customSvg || chart.svg }}
      />
    );
  }

  const s = apiData && apiData.length > 0 ? apiData : series(range);

  switch (chart.type) {
    case "combo":
      return (
        <ComboChart
          data={s}
          barKey={chart.barKey || "actual"}
          lineKey={chart.lineKey || "target"}
          barLabel={chart.barLabel || "Actual"}
          lineLabel={chart.lineLabel || "Target"}
        />
      );
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
      return <DonutChart data={s} />;
    case "geo":
      return <GeoChart tiles={geoTiles} />;
    case "heatmap":
      return <Heatmap matrix={heatmapMatrix} rows={heatmapRows} />;
    case "gauge":
      return <Gauge value={chart.value || 78} label={chart.subtitle || "of Target"} />;
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
// Clean chart card (header + grip + resize + titik tiga + body)
// ---------------------------------------------------------------------------
function ChartCard({
  chart,
  index,
  range,
  onDelete,
  onDuplicate,
  onEdit,
  onToggleWidth,
  onDragStart,
  onDragOver,
  onDrop,
  onDragEnd,
  isDragging,
}) {
  const [menu, setMenu] = useState(false);

  return (
    <div
      draggable
      onDragStart={onDragStart}
      onDragOver={onDragOver}
      onDrop={onDrop}
      onDragEnd={onDragEnd}
      className={`group relative flex min-h-[320px] flex-col rounded-xl border bg-white p-4 shadow-sm transition-all ${
        chart.w === 2 ? "col-span-1 md:col-span-2" : "col-span-1"
      } ${
        isDragging
          ? "opacity-35 border-dashed border-indigo scale-[0.98] shadow-inner"
          : "border-line hover:border-indigo/50 hover:shadow-md"
      }`}
    >
      <div className="mb-3 flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <span
            className="cursor-grab active:cursor-grabbing text-slate-400 hover:text-indigo transition-colors p-0.5 rounded hover:bg-slate-100 shrink-0"
            title="Tarik untuk memindahkan posisi chart"
          >
            <IconGrip width={16} />
          </span>
          <div className="min-w-0">
            <h3 className="text-sm font-semibold text-ink truncate">{chart.title}</h3>
            {chart.subtitle && <p className="text-[11px] text-ink-faint truncate">{chart.subtitle}</p>}
          </div>
        </div>

        <div className="flex items-center gap-1 shrink-0">
          <button
            type="button"
            onClick={onToggleWidth}
            className="rounded p-1 text-ink-faint transition-all hover:bg-slate-100 hover:text-indigo opacity-0 group-hover:opacity-100"
            title={chart.w === 2 ? "Perkecil: 1 Kolom (50%)" : "Perbesar: 2 Kolom (Full Width)"}
          >
            <IconColumns width={16} className={chart.w === 2 ? "text-indigo" : ""} />
          </button>
          <button
            type="button"
            onClick={() => setMenu((m) => !m)}
            className={`rounded p-1 text-ink-faint transition-opacity hover:bg-slate-100 hover:text-ink ${
              menu ? "opacity-100" : "opacity-0 group-hover:opacity-100"
            }`}
            title="Pilihan lainnya"
          >
            <IconDots width={16} />
          </button>
        </div>
      </div>

      <div className="flex min-h-0 flex-1 flex-col justify-center">
        <ChartBody chart={chart} range={range} />
      </div>

      {menu && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setMenu(false)} />
          <div className="absolute right-3 top-10 z-20 w-44 overflow-hidden rounded-lg border border-line bg-white py-1 text-sm shadow-lg">
            <button
              type="button"
              onClick={() => {
                onEdit();
                setMenu(false);
              }}
              className="flex w-full items-center gap-2 px-3 py-1.5 text-ink-soft hover:bg-slate-50"
            >
              <IconEdit width={14} /> Edit Chart
            </button>
            <button
              type="button"
              onClick={() => {
                onToggleWidth();
                setMenu(false);
              }}
              className="flex w-full items-center gap-2 px-3 py-1.5 text-ink-soft hover:bg-slate-50"
            >
              <IconColumns width={14} /> {chart.w === 2 ? "Ubah ke 1 Kolom" : "Ubah ke 2 Kolom"}
            </button>
            <button
              type="button"
              onClick={() => {
                onDuplicate();
                setMenu(false);
              }}
              className="flex w-full items-center gap-2 px-3 py-1.5 text-ink-soft hover:bg-slate-50"
            >
              <IconCopy width={14} /> Duplikasi
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
              <IconTrash width={14} /> Hapus
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
  { type: "combo", label: "Combo (Bar+Line)", icon: IconCompare },
  { type: "donut", label: "Donut Chart", icon: IconDonut },
  { type: "summary", label: "Custom (YAML)", icon: IconCode },
];

const DEFAULT_YAML = `type: combo
title: Pendapatan vs Target per Kategori
data_source: data_mart
fact: fact_revenues
dimensions:
  - category_name
metrics:
  - actual_revenue
  - target_revenue`;

const DEFAULT_YAML_CONFIG = {
  type: "combo",
  title: "Pendapatan vs Target per Kategori",
  data_source: "data_mart",
  fact: "fact_revenues",
  dimensions: ["category_name"],
  metrics: ["actual_revenue", "target_revenue"],
};

function AddChartModal({ onClose, onPublish }) {
  const [tab, setTab] = useState("builder");
  const [step, setStep] = useState(0); // 0: Step 1, 1: Step 2A/2B, 2: Step 3
  const [type, setType] = useState("bar");
  const [title, setTitle] = useState("");
  const [subtitle, setSubtitle] = useState("");
  const [titleErr, setTitleErr] = useState(false);

  // Step 2A Data Mart state
  const [dataMode, setDataMode] = useState("builder"); // "builder" | "sql"
  const [selectedFact, setSelectedFact] = useState("fact_revenues");
  const [selectedDims, setSelectedDims] = useState(["category_name"]);
  const [selectedMetrics, setSelectedMetrics] = useState(["actual_revenue", "target_revenue"]);
  const [livePreviewData, setLivePreviewData] = useState(null);
  const [previewLoading, setPreviewLoading] = useState(false);

  // Custom SQL state
  const [sqlText, setSqlText] = useState(
    `SELECT p.category, ROUND(SUM(f.actual_revenue)/1000000, 2) as actual_revenue_mio, ROUND(AVG(t.target_revenue)/1000000, 2) as target_revenue_mio\nFROM fact_revenues f\nJOIN dim_products p ON f.dim_product_id = p.id\nJOIN fact_targets t ON f.dim_date_id = t.dim_date_id AND f.dim_product_id = t.dim_product_id\nGROUP BY p.category`
  );
  const [sqlResult, setSqlResult] = useState(null);
  const [sqlError, setSqlError] = useState(null);
  const [sqlLoading, setSqlLoading] = useState(false);

  // Step 2B YAML state
  const [customTab, setCustomTab] = useState("upload");
  const [yamlCode, setYamlCode] = useState(DEFAULT_YAML);
  const [yamlErr, setYamlErr] = useState(null);
  const [customConfig, setCustomConfig] = useState(DEFAULT_YAML_CONFIG);
  const [uploadedFileName, setUploadedFileName] = useState("");
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef(null);

  // Ask AI state
  const [ai, setAi] = useState("");
  const [aiModel, setAiModel] = useState("gemini-1.5-flash");
  const [aiState, setAiState] = useState("idle");
  const [aiResultChart, setAiResultChart] = useState(null);

  const [publishing, setPublishing] = useState(false);
  const isCustom = type === "summary";

  const handleToggleDim = (dim) => {
    setSelectedDims((prev) =>
      prev.includes(dim)
        ? prev.length > 1
          ? prev.filter((d) => d !== dim)
          : prev
        : [...prev, dim]
    );
  };

  const handleToggleMetric = (met) => {
    setSelectedMetrics((prev) =>
      prev.includes(met)
        ? prev.length > 1
          ? prev.filter((m) => m !== met)
          : prev
        : [...prev, met]
    );
  };

  const fetchLivePreview = async () => {
    setPreviewLoading(true);
    try {
      const res = await queryDataMart({
        fact: selectedFact,
        dimensions: selectedDims,
        metrics: selectedMetrics,
      });
      if (res?.data) {
        setLivePreviewData(res.data);
      }
    } catch (err) {
      console.error("Live preview error:", err);
    } finally {
      setPreviewLoading(false);
    }
  };

  const runCustomSql = async () => {
    if (!sqlText.trim()) return;
    setSqlLoading(true);
    setSqlError(null);
    try {
      const res = await executeDataMartSql(sqlText.trim());
      setSqlResult(res);
      const rows = res?.rows || [];
      const cols = res?.columns || [];
      if (rows.length > 0) {
        const labelKey = cols.find((c) => typeof rows[0][c] === "string") || cols[0];
        const numCols = cols.filter((c) => c !== labelKey && !isNaN(Number(rows[0][c])));
        const formatted = rows.map((r) => {
          const item = { label: String(r[labelKey] || "Unknown") };
          if (numCols.length >= 2) {
            item.actual = Number(r[numCols[0]] || 0);
            item.target = Number(r[numCols[1]] || 0);
            item.value = item.actual;
          } else if (numCols.length === 1) {
            item.value = Number(r[numCols[0]] || 0);
          }
          return item;
        });
        setLivePreviewData(formatted);
      }
    } catch (err) {
      setSqlError(err.message || "Gagal mengeksekusi query SQL.");
    } finally {
      setSqlLoading(false);
    }
  };

  const handleYamlChange = (code) => {
    setYamlCode(code);
    try {
      const parsed = loadYaml(code);
      if (!parsed || typeof parsed !== "object") {
        setYamlErr("Format YAML tidak valid: root harus berupa mapping key-value.");
        return;
      }
      setCustomConfig({
        type: parsed.type || parsed.template || "bar",
        title: parsed.title || parsed.name || "Custom YAML Chart",
        metric: parsed.metric || (Array.isArray(parsed.metrics) ? parsed.metrics[0] : "actual_revenue"),
        metrics: Array.isArray(parsed.metrics) ? parsed.metrics : [parsed.metric || "actual_revenue"],
        dimension: parsed.dimension || (Array.isArray(parsed.dimensions) ? parsed.dimensions[0] : "category_name"),
        dimensions: Array.isArray(parsed.dimensions) ? parsed.dimensions : [parsed.dimension || "category_name"],
        endpoint: parsed.endpoint || parsed.data_source || null,
        data: parsed.data || null,
        sql: parsed.sql || parsed.query || null,
        customSvg: parsed.svg || null,
        customHtml: parsed.html || null,
        w: parsed.w || (parsed.type === "combo" ? 2 : 1),
      });
      setYamlErr(null);
    } catch (err) {
      setYamlErr(err.message || "Format YAML tidak valid.");
    }
  };

  const handleFileUpload = (file) => {
    if (!file) return;
    if (file.size > 1024 * 1024) {
      setYamlErr("Ukuran file melebihi batas 1 MB.");
      return;
    }
    setUploadedFileName(file.name);
    const reader = new FileReader();
    reader.onload = (e) => {
      const content = e.target.result;
      handleYamlChange(content);
    };
    reader.onerror = () => {
      setYamlErr("Gagal membaca file.");
    };
    reader.readAsText(file);
  };

  const runAi = async () => {
    if (!ai.trim()) return;
    setAiState("thinking");
    try {
      const res = await askAiGenerateChart(ai.trim(), aiModel);
      if (res?.no_data) {
        setAiState("noData");
      } else if (res?.chart) {
        setAiResultChart(res.chart);
        setAiState("result");
      } else {
        setAiState("result");
      }
    } catch {
      setAiState("noData");
    }
  };

  const getStepTitle = () => {
    if (step === 0) return "Add Chart";
    if (step === 1) return isCustom ? "Custom Chart (YAML)" : `Configure ${typeMeta[type]?.label || "Chart"}`;
    return "Preview & Publish";
  };

  const goPreview = () => {
    if (!isCustom && !title.trim()) {
      setTitleErr(true);
      return;
    }
    if (isCustom && yamlErr) return;

    if (!isCustom && !livePreviewData && dataMode === "builder") {
      fetchLivePreview();
    }
    setStep(2);
  };

  const publish = () => {
    setPublishing(true);
    setTimeout(() => {
      if (isCustom) {
        onPublish({
          id: "chart-" + Date.now(),
          type: customConfig?.type || "bar",
          title: customConfig?.title || "Custom YAML Chart",
          w: customConfig?.w || (customConfig?.type === "combo" ? 2 : 1),
          dimensions: customConfig?.dimensions || ["category_name"],
          metrics: customConfig?.metrics || ["actual_revenue"],
          data: customConfig?.data || null,
          sql: customConfig?.sql || null,
          customSvg: customConfig?.customSvg || null,
          customHtml: customConfig?.customHtml || null,
          yamlRaw: yamlCode,
          isCustom: true,
        });
      } else if (dataMode === "sql" && sqlText) {
        onPublish({
          id: "chart-" + Date.now(),
          type: type,
          title: title.trim(),
          subtitle: subtitle.trim() || undefined,
          w: type === "combo" ? 2 : 1,
          sql: sqlText.trim(),
          data: livePreviewData,
          data_source: "custom_sql",
        });
      } else {
        onPublish({
          id: "chart-" + Date.now(),
          type: type,
          title: title.trim(),
          subtitle: subtitle.trim() || undefined,
          w: type === "combo" || selectedDims.length > 1 ? 2 : 1,
          query_config: {
            fact: selectedFact,
            dimensions: selectedDims,
            metrics: selectedMetrics,
          },
          dimension: selectedDims[0],
          metric: selectedMetrics[0],
          data: livePreviewData,
          data_source: "data_mart",
        });
      }
      setPublishing(false);
    }, 400);
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
                  onClick={() => {
                    setTab("builder");
                    setStep(0);
                  }}
                  className={`flex items-center gap-1.5 border-b-2 pb-1 text-sm font-medium transition-colors ${
                    tab === "builder"
                      ? "border-indigo text-ink font-semibold"
                      : "border-transparent text-ink-faint hover:text-ink-soft"
                  }`}
                >
                  Add Chart
                </button>
                <button
                  onClick={() => setTab("ai")}
                  className={`flex items-center gap-1.5 border-b-2 pb-1 text-sm font-medium transition-colors ${
                    tab === "ai"
                      ? "border-indigo text-ink font-semibold"
                      : "border-transparent text-ink-faint hover:text-ink-soft"
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
            {/* Step 1: Pilih Tipe (5 kartu) */}
            {step === 0 && (
              <div className="p-6">
                <div className="mb-3 text-xs font-medium text-ink-faint">Pilih salah satu tipe chart di bawah:</div>
                <div className="grid grid-cols-5 gap-3">
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
                        className={`group flex flex-col items-center gap-2.5 rounded-xl border p-3 text-center transition-all ${
                          active
                            ? "border-indigo bg-indigo-soft/60 shadow-[0_8px_24px_-10px_rgba(99,102,241,0.45)] ring-1 ring-indigo"
                            : "border-line hover:border-indigo hover:shadow-md hover:scale-[1.02]"
                        }`}
                      >
                        <span
                          className={`flex h-11 w-11 items-center justify-center rounded-xl transition-all ${
                            active
                              ? "scale-110 bg-indigo text-white shadow-sm"
                              : "bg-slate-100 text-ink-soft group-hover:scale-105 group-hover:bg-indigo-soft group-hover:text-indigo"
                          }`}
                        >
                          <Icon width={22} />
                        </span>
                        <span className={`text-[11px] font-semibold leading-tight ${active ? "text-indigo-dark" : "text-ink"}`}>
                          {t.label}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Step 2A: Konfigurasi Fleksibel Data Mart / SQL (Bar / Line / Combo / Donut) */}
            {step === 1 && !isCustom && (
              <div className="space-y-4 p-6 max-h-[70vh] overflow-y-auto">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <Field label="Chart Title" error={titleErr ? "Judul chart wajib diisi" : undefined}>
                    <input
                      autoFocus
                      value={title}
                      onChange={(e) => {
                        setTitle(e.target.value);
                        if (e.target.value.trim()) setTitleErr(false);
                      }}
                      placeholder="e.g. Pendapatan vs Target per Kategori"
                      className={
                        titleErr
                          ? "w-full rounded-lg border border-rose bg-rose/5 px-3 py-2 text-sm outline-none ring-2 ring-rose/20 text-rose"
                          : inputCls
                      }
                    />
                  </Field>
                  <Field label="Subjudul / Deskripsi (Opsional)">
                    <input
                      value={subtitle}
                      onChange={(e) => setSubtitle(e.target.value)}
                      placeholder="e.g. Realisasi Bulanan 2024"
                      className={inputCls}
                    />
                  </Field>
                </div>

                {/* Mode Selector: Visual Data Mart Builder vs Custom SQL Query */}
                <div className="flex rounded-lg border border-line bg-slate-50 p-1">
                  <button
                    type="button"
                    onClick={() => setDataMode("builder")}
                    className={`flex-1 rounded-md py-1.5 text-xs font-semibold transition-all ${
                      dataMode === "builder" ? "bg-white text-indigo shadow-sm" : "text-ink-faint hover:text-ink"
                    }`}
                  >
                    Visual Data Mart Builder
                  </button>
                  <button
                    type="button"
                    onClick={() => setDataMode("sql")}
                    className={`flex-1 rounded-md py-1.5 text-xs font-semibold transition-all ${
                      dataMode === "sql" ? "bg-white text-indigo shadow-sm" : "text-ink-faint hover:text-ink"
                    }`}
                  >
                    Custom SQL Query (Live)
                  </button>
                </div>

                {dataMode === "builder" ? (
                  <div className="space-y-4 rounded-xl border border-line bg-slate-50/50 p-4">
                    <Field label="Tabel Fakta (Data Mart)">
                      <Select value={selectedFact} onChange={(e) => setSelectedFact(e.target.value)}>
                        <option value="fact_revenues">fact_revenues (Pendapatan & Realisasi)</option>
                        <option value="fact_targets">fact_targets (Target Penjualan & MoM)</option>
                        <option value="fact_drivers">fact_drivers (Metrik Driver Telecom)</option>
                      </Select>
                    </Field>

                    {/* Multi-Dimension Selector */}
                    <div>
                      <div className="mb-2 flex items-center justify-between">
                        <span className="text-xs font-medium text-ink-soft">
                          Dimensi (Pilih 1 atau lebih):
                        </span>
                        <span className="text-[11px] text-ink-faint">
                          {selectedDims.length} dimensi terpilih
                        </span>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {[
                          { id: "category_name", label: "Kategori Produk" },
                          { id: "month_name", label: "Bulan" },
                          { id: "region_name", label: "Region" },
                          { id: "sales_type_name", label: "Tipe Sales" },
                          { id: "year", label: "Tahun" },
                        ].map((dim) => {
                          const active = selectedDims.includes(dim.id);
                          return (
                            <button
                              key={dim.id}
                              type="button"
                              onClick={() => handleToggleDim(dim.id)}
                              className={`flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium transition-all ${
                                active
                                  ? "bg-indigo text-white shadow-sm ring-1 ring-indigo"
                                  : "border border-line bg-white text-ink-soft hover:bg-slate-100"
                              }`}
                            >
                              {active && <IconCheck width={12} />}
                              {dim.label}
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    {/* Multi-Metric Selector */}
                    <div>
                      <div className="mb-2 flex items-center justify-between">
                        <span className="text-xs font-medium text-ink-soft">
                          Metrik (Pilih 1 atau lebih untuk Combo/Multi-bar):
                        </span>
                        <span className="text-[11px] text-ink-faint">
                          {selectedMetrics.length} metrik terpilih
                        </span>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {[
                          { id: "actual_revenue", label: "Actual Revenue" },
                          { id: "target_revenue", label: "Target Revenue" },
                          { id: "achievement_pct", label: "Achievement %" },
                          { id: "driver_value", label: "Driver Value" },
                        ].map((met) => {
                          const active = selectedMetrics.includes(met.id);
                          return (
                            <button
                              key={met.id}
                              type="button"
                              onClick={() => handleToggleMetric(met.id)}
                              className={`flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium transition-all ${
                                active
                                  ? "bg-emerald text-white shadow-sm ring-1 ring-emerald"
                                  : "border border-line bg-white text-ink-soft hover:bg-slate-100"
                              }`}
                            >
                              {active && <IconCheck width={12} />}
                              {met.label}
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    <div className="flex items-center justify-between pt-2">
                      <button
                        type="button"
                        onClick={fetchLivePreview}
                        disabled={previewLoading}
                        className="inline-flex items-center gap-1.5 rounded-lg border border-indigo bg-indigo-soft/60 px-3 py-1.5 text-xs font-semibold text-indigo hover:bg-indigo-soft"
                      >
                        <IconRefresh width={13} className={previewLoading ? "animate-spin" : ""} />
                        {previewLoading ? "Memuat Data..." : "Jalankan Query & Preview Data"}
                      </button>
                      {livePreviewData && (
                        <span className="text-xs font-medium text-emerald">
                          ✓ {livePreviewData.length} baris data ditemukan
                        </span>
                      )}
                    </div>

                    {/* Live Preview Table */}
                    {livePreviewData && livePreviewData.length > 0 && (
                      <div className="mt-2 max-h-36 overflow-auto rounded-lg border border-line bg-white text-xs">
                        <table className="w-full text-left">
                          <thead className="sticky top-0 bg-slate-50 text-[11px] text-ink-faint uppercase border-b border-line">
                            <tr>
                              <th className="p-2">Label / Dimensi</th>
                              {Object.keys(livePreviewData[0])
                                .filter((k) => k !== "label")
                                .map((k) => (
                                  <th key={k} className="p-2">{k}</th>
                                ))}
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-line">
                            {livePreviewData.slice(0, 5).map((row, idx) => (
                              <tr key={idx} className="hover:bg-slate-50">
                                <td className="p-2 font-medium text-ink">{row.label}</td>
                                {Object.keys(row)
                                  .filter((k) => k !== "label")
                                  .map((k) => (
                                    <td key={k} className="p-2 tabular-nums">
                                      {typeof row[k] === "number" ? row[k].toLocaleString() : String(row[k])}
                                    </td>
                                  ))}
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                ) : (
                  /* Custom SQL Query Mode */
                  <div className="space-y-3 rounded-xl border border-line bg-slate-50/50 p-4">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-medium text-ink-soft">
                        Query SQL Langsung ke Data Mart:
                      </span>
                      <div className="flex gap-1.5">
                        <button
                          type="button"
                          onClick={() =>
                            setSqlText(
                              `SELECT p.category, ROUND(SUM(f.actual_revenue)/1000000, 2) as actual_revenue_mio, ROUND(AVG(t.target_revenue)/1000000, 2) as target_revenue_mio\nFROM fact_revenues f\nJOIN dim_products p ON f.dim_product_id = p.id\nJOIN fact_targets t ON f.dim_date_id = t.dim_date_id AND f.dim_product_id = t.dim_product_id\nGROUP BY p.category`
                            )
                          }
                          className="rounded px-2 py-0.5 text-[11px] font-medium text-indigo bg-indigo-soft hover:bg-indigo-soft/80"
                        >
                          Template: Revenue vs Target
                        </button>
                        <button
                          type="button"
                          onClick={() =>
                            setSqlText(
                              `SELECT l.region_name, ROUND(SUM(f.actual_revenue)/1000000, 2) as actual_revenue_mio\nFROM fact_revenues f\nJOIN dim_locations l ON f.dim_location_id = l.id\nGROUP BY l.region_name\nORDER BY actual_revenue_mio DESC`
                            )
                          }
                          className="rounded px-2 py-0.5 text-[11px] font-medium text-slate-600 bg-slate-200 hover:bg-slate-300"
                        >
                          Template: Regional
                        </button>
                        <button
                          type="button"
                          onClick={() =>
                            setSqlText(
                              `SELECT m.metric_name, ROUND(AVG(d.metric_value), 0) as actual_metric, ROUND(AVG(d.target_value), 0) as target_metric\nFROM fact_drivers d\nJOIN dim_metrics m ON d.dim_metric_id = m.id\nGROUP BY m.metric_name`
                            )
                          }
                          className="rounded px-2 py-0.5 text-[11px] font-medium text-emerald-700 bg-emerald-100 hover:bg-emerald-200"
                        >
                          Template: Driver Telecom
                        </button>
                      </div>
                    </div>

                    <textarea
                      value={sqlText}
                      onChange={(e) => setSqlText(e.target.value)}
                      rows={5}
                      className="w-full rounded-lg border border-slate-700 bg-slate-900 p-3 font-mono text-xs text-emerald-300 outline-none focus:border-indigo"
                      placeholder="SELECT ... FROM fact_... GROUP BY ..."
                    />

                    <div className="flex items-center justify-between">
                      <button
                        type="button"
                        onClick={runCustomSql}
                        disabled={sqlLoading}
                        className="inline-flex items-center gap-1.5 rounded-lg bg-indigo px-3 py-1.5 text-xs font-semibold text-white hover:bg-indigo-dark shadow-sm"
                      >
                        <IconRefresh width={13} className={sqlLoading ? "animate-spin" : ""} />
                        {sqlLoading ? "Mengeksekusi..." : "Jalankan SQL & Preview Data"}
                      </button>
                      {sqlResult && (
                        <span className="text-xs font-medium text-emerald">
                          ✓ Berhasil: {sqlResult.rows?.length || 0} baris ditemukan
                        </span>
                      )}
                    </div>

                    {sqlError && (
                      <div className="rounded-lg border border-rose/30 bg-rose/5 p-2.5 text-xs text-rose">
                        {sqlError}
                      </div>
                    )}

                    {sqlResult && sqlResult.rows?.length > 0 && (
                      <div className="max-h-36 overflow-auto rounded-lg border border-line bg-white text-xs">
                        <table className="w-full text-left">
                          <thead className="sticky top-0 bg-slate-50 text-[11px] text-ink-faint uppercase border-b border-line">
                            <tr>
                              {sqlResult.columns?.map((col) => (
                                <th key={col} className="p-2">{col}</th>
                              ))}
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-line">
                            {sqlResult.rows.slice(0, 5).map((row, idx) => (
                              <tr key={idx} className="hover:bg-slate-50">
                                {sqlResult.columns?.map((col) => (
                                  <td key={col} className="p-2 tabular-nums">
                                    {typeof row[col] === "number" ? row[col].toLocaleString() : String(row[col])}
                                  </td>
                                ))}
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* Step 2B: Custom YAML Upload & Write */}
            {step === 1 && isCustom && (
              <div className="p-6">
                <div className="mb-4 inline-flex rounded-lg bg-slate-100 p-1">
                  {["upload", "write"].map((t) => (
                    <button
                      key={t}
                      onClick={() => setCustomTab(t)}
                      className={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
                        customTab === t
                          ? "bg-white text-ink shadow-sm font-semibold"
                          : "text-ink-faint hover:text-ink-soft"
                      }`}
                    >
                      {t === "upload" ? "Upload File YAML" : "Tulis YAML"}
                    </button>
                  ))}
                </div>

                {customTab === "upload" ? (
                  <>
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept=".yaml,.yml,.txt"
                      className="hidden"
                      onChange={(e) => {
                        if (e.target.files?.[0]) handleFileUpload(e.target.files[0]);
                        e.target.value = "";
                      }}
                    />
                    <div
                      onDragOver={(e) => {
                        e.preventDefault();
                        setIsDragging(true);
                      }}
                      onDragLeave={() => setIsDragging(false)}
                      onDrop={(e) => {
                        e.preventDefault();
                        setIsDragging(false);
                        if (e.dataTransfer.files?.[0]) handleFileUpload(e.dataTransfer.files[0]);
                      }}
                      className={`flex flex-col items-center justify-center gap-3 rounded-xl border-2 border-dashed py-10 text-center transition-all ${
                        isDragging
                          ? "border-indigo bg-indigo-soft/50 scale-[1.01]"
                          : "border-line bg-slate-50/60 hover:border-indigo hover:bg-indigo-soft/30"
                      }`}
                    >
                      <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-white text-indigo shadow-sm">
                        <IconUpload width={22} />
                      </span>
                      <div className="text-sm font-medium text-ink">
                        {uploadedFileName ? (
                          <span className="flex items-center gap-1.5 font-semibold text-emerald">
                            <IconCheck width={16} /> {uploadedFileName}
                          </span>
                        ) : (
                          "Tarik file YAML ke sini atau klik tombol di bawah"
                        )}
                      </div>
                      <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        className="inline-flex items-center gap-2 rounded-lg bg-indigo px-4 py-2 text-xs font-semibold text-white shadow-sm transition-colors hover:bg-indigo-dark"
                      >
                        <IconUpload width={14} /> Pilih File (.yaml / .yml)
                      </button>
                      <div className="text-xs text-ink-faint">
                        {uploadedFileName
                          ? "File berhasil dimuat dan siap dipreview."
                          : "Mendukung format YAML chart standar hingga 1 MB"}
                      </div>
                    </div>

                    {yamlErr && (
                      <div className="mt-3 flex items-start gap-3 rounded-lg border border-rose/30 bg-rose/5 p-3">
                        <IconWarning width={18} className="mt-0.5 shrink-0 text-rose" />
                        <div>
                          <div className="text-sm font-semibold text-rose">Invalid YAML Configuration</div>
                          <div className="mt-0.5 font-mono text-xs text-rose/80">{yamlErr}</div>
                        </div>
                      </div>
                    )}
                  </>
                ) : (
                  <>
                    <div className="overflow-hidden rounded-xl border border-slate-800 bg-[#0f172a] font-mono text-[13px] leading-relaxed shadow-inner">
                      <div className="flex items-center gap-1.5 border-b border-slate-800 px-4 py-2.5">
                        <span className="h-2.5 w-2.5 rounded-full bg-rose" />
                        <span className="h-2.5 w-2.5 rounded-full bg-amber" />
                        <span className="h-2.5 w-2.5 rounded-full bg-emerald" />
                        <span className="ml-2 text-xs text-slate-400">chart.yaml</span>
                        <div className="ml-auto flex gap-2">
                          <button
                            type="button"
                            onClick={() => {
                              setYamlCode(DEFAULT_YAML);
                              handleYamlChange(DEFAULT_YAML);
                            }}
                            className="rounded px-2 py-0.5 text-xs text-slate-400 transition-colors hover:bg-slate-800 hover:text-white"
                          >
                            Reset Template
                          </button>
                        </div>
                      </div>
                      <textarea
                        value={yamlCode}
                        onChange={(e) => handleYamlChange(e.target.value)}
                        rows={8}
                        className="w-full resize-none bg-transparent px-4 py-3 font-mono text-[13px] leading-relaxed text-slate-100 outline-none placeholder:text-slate-500"
                        placeholder="Masukkan kode YAML chart..."
                        spellCheck={false}
                      />
                    </div>
                    {yamlErr && (
                      <div className="mt-3 flex items-start gap-3 rounded-lg border border-rose/30 bg-rose/5 p-3">
                        <IconWarning width={18} className="mt-0.5 shrink-0 text-rose" />
                        <div>
                          <div className="text-sm font-semibold text-rose">Invalid YAML Configuration</div>
                          <div className="mt-0.5 font-mono text-xs text-rose/80">{yamlErr}</div>
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
                  <div className="mb-3">
                    <div className="text-sm font-semibold text-ink">
                      {isCustom ? customConfig?.title || "Custom YAML Chart" : title.trim() || typeMeta[type]?.label}
                    </div>
                    {subtitle.trim() && (
                      <div className="text-xs text-ink-faint">{subtitle.trim()}</div>
                    )}
                  </div>
                  <div className="h-56">
                    <PreviewChart
                      type={isCustom ? customConfig?.type || "bar" : type}
                      data={livePreviewData}
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Modal Footer */}
            <div className="flex items-center justify-between border-t border-line px-6 py-4">
              <Btn variant="outline" onClick={onClose}>
                Batal
              </Btn>
              <div className="flex gap-2">
                {step === 0 && <Btn onClick={() => setStep(1)}>Lanjutkan</Btn>}
                {step === 1 && (
                  <Btn onClick={goPreview} disabled={isCustom ? !!yamlErr : false}>
                    Preview Chart
                  </Btn>
                )}
                {step === 2 && (
                  <Btn onClick={publish} disabled={publishing} className="min-w-[96px]">
                    {publishing ? (
                      <span className="spin h-4 w-4 rounded-full border-2 border-white/40 border-t-white" />
                    ) : (
                      "Publish Chart"
                    )}
                  </Btn>
                )}
              </div>
            </div>
          </>
        ) : (
          /* Tab Ask AI dengan Model Selector (Gemini BYOK) */
          <div className="space-y-4 p-6">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <span className="text-xs font-medium text-ink-soft">Pilih Model Gemini:</span>
                <Select value={aiModel} onChange={(e) => setAiModel(e.target.value)} className="text-xs py-1">
                  <option value="gemini-1.5-flash">Gemini 1.5 Flash (Cepat &amp; Hemat)</option>
                  <option value="gemini-1.5-pro">Gemini 1.5 Pro (Penalaran Mendalam)</option>
                  <option value="gemini-2.0-flash">Gemini 2.0 Flash (Next-gen Fast)</option>
                </Select>
              </div>
              <span className="inline-flex items-center gap-1 rounded-full bg-indigo-soft px-2.5 py-0.5 text-[11px] font-semibold text-indigo">
                <IconSparkle width={12} /> BYOK Gemini Active
              </span>
            </div>

            <div className="flex items-center gap-2 rounded-xl border border-line bg-white p-2 shadow-sm focus-within:border-indigo focus-within:ring-2 focus-within:ring-indigo/20">
              <input
                value={ai}
                onChange={(e) => setAi(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && runAi()}
                className="flex-1 bg-transparent px-2 text-sm outline-none placeholder:text-ink-faint"
                placeholder="Deskripsikan chart yang diinginkan, misal: 'Tampilkan perbandingan revenue vs target broadband'"
              />
              <button
                onClick={runAi}
                className="flex h-9 w-9 items-center justify-center rounded-lg bg-indigo text-white transition-colors hover:bg-indigo-dark"
                title="Kirim ke AI"
              >
                <IconSend width={16} />
              </button>
            </div>

            {aiState === "thinking" && (
              <div className="flex items-center gap-3 rounded-xl bg-slate-50 p-4">
                <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-soft text-indigo">
                  <IconSparkle width={16} />
                </span>
                <span className="text-sm font-medium text-ink-soft">AI sedang merancang visualisasi...</span>
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
                <div className="mb-3 text-sm font-semibold text-ink">
                  {aiResultChart?.title || "Revenue Analysis"}
                </div>
                <div className="h-48">
                  {aiResultChart?.type === "combo" ? (
                    <ComboChart data={aiResultChart?.data || series("12m")} />
                  ) : (
                    <BarChart data={aiResultChart?.data || series("12m")} color={SERIES[0]} />
                  )}
                </div>
                <div className="mt-4 flex gap-2">
                  <Btn variant="outline" className="flex-1" onClick={runAi}>
                    <IconRefresh width={16} /> Regenerate
                  </Btn>
                  <Btn
                    className="flex-1"
                    onClick={() =>
                      onPublish({
                        ...mk(aiResultChart?.type || "bar", aiResultChart?.title || "Revenue Analysis"),
                        w: aiResultChart?.type === "combo" ? 2 : 1,
                        sql: aiResultChart?.sql,
                        data: aiResultChart?.data,
                        endpoint: aiResultChart?.endpoint,
                        dimension: aiResultChart?.dimension,
                        metric: aiResultChart?.metric,
                      })
                    }
                  >
                    <IconPlus width={16} /> Tambahkan ke Page
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
                    Data mart yang tersedia: <span className="font-medium text-ink">fact_revenues</span>,{" "}
                    <span className="font-medium text-ink">fact_targets</span>,{" "}
                    <span className="font-medium text-ink">fact_drivers</span>,{" "}
                    <span className="font-medium text-ink">dim_products</span>,{" "}
                    <span className="font-medium text-ink">dim_locations</span>.
                  </p>
                </div>
              </div>
            )}

            {aiState === "idle" && (
              <p className="px-1 text-xs text-ink-faint">
                Tip: Sebutkan dimensi (kategori produk, wilayah, bulan) dan metrik yang ingin dianalisis.
              </p>
            )}
          </div>
        )}
      </div>
    </Overlay>
  );
}

// ---------------------------------------------------------------------------
// Edit Chart Modal (Overlay with title, type, width & delete)
// ---------------------------------------------------------------------------
function EditChartModal({ chart, onClose, onSave, onDelete }) {
  const [title, setTitle] = useState(chart.title || "");
  const [subtitle, setSubtitle] = useState(chart.subtitle || "");
  const [chartType, setChartType] = useState(chart.type || "bar");
  const [chartWidth, setChartWidth] = useState(chart.w || 1);
  const [error, setError] = useState("");

  const handleSubmit = (e) => {
    e?.preventDefault();
    if (!title.trim()) {
      setError("Judul chart wajib diisi");
      return;
    }
    onSave({
      ...chart,
      title: title.trim(),
      subtitle: subtitle.trim() || undefined,
      type: chartType,
      w: Number(chartWidth),
    });
    onClose();
  };

  const chartTypeOptions = [
    { type: "bar", label: "Bar Chart" },
    { type: "line", label: "Line Chart" },
    { type: "combo", label: "Combo (Bar + Line)" },
    { type: "area", label: "Area Chart" },
    { type: "donut", label: "Donut Chart" },
    { type: "stacked", label: "Stacked Bar" },
    { type: "variance", label: "Variance YoY" },
    { type: "gauge", label: "Gauge / KPI" },
    { type: "heatmap", label: "Heatmap" },
    { type: "geo", label: "Geo Map" },
  ];

  return (
    <Overlay onClose={onClose}>
      <div className="mx-auto w-full max-w-lg overflow-hidden rounded-2xl border border-line bg-white shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-line px-6 py-4">
          <div className="flex items-center gap-2.5">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-soft text-indigo">
              <IconEdit width={16} />
            </span>
            <h2 className="text-base font-semibold text-ink">Edit Chart</h2>
          </div>
          <button onClick={onClose} className="rounded p-1 text-ink-faint hover:bg-slate-100">
            <IconClose width={18} />
          </button>
        </div>

        {/* Body */}
        <form onSubmit={handleSubmit} className="space-y-4 p-6">
          <Field label="Judul Chart" error={error}>
            <input
              autoFocus
              value={title}
              onChange={(e) => {
                setTitle(e.target.value);
                if (e.target.value.trim()) setError("");
              }}
              placeholder="Contoh: Pendapatan Broadband per Wilayah"
              className={
                error
                  ? "w-full rounded-lg border border-rose bg-rose/5 px-3 py-2.5 text-sm outline-none ring-2 ring-rose/20 text-rose"
                  : inputCls
              }
            />
          </Field>

          <Field label="Subjudul / Deskripsi (Opsional)">
            <input
              value={subtitle}
              onChange={(e) => setSubtitle(e.target.value)}
              placeholder="Contoh: Realisasi Q1 vs Q2 2024"
              className={inputCls}
            />
          </Field>

          <div className="grid grid-cols-2 gap-4">
            <Field label="Tipe Visualisasi">
              <Select value={chartType} onChange={(e) => setChartType(e.target.value)}>
                {chartTypeOptions.map((opt) => (
                  <option key={opt.type} value={opt.type}>
                    {opt.label}
                  </option>
                ))}
              </Select>
            </Field>

            <Field label="Ukuran Grid (Lebar Card)">
              <Select value={chartWidth} onChange={(e) => setChartWidth(Number(e.target.value))}>
                <option value={1}>1 Kolom (Standar / 50%)</option>
                <option value={2}>2 Kolom (Full Width / 100%)</option>
              </Select>
            </Field>
          </div>

          {(chart.dimension || chart.metric || chart.sql) && (
            <div className="rounded-xl border border-line bg-slate-50/70 p-3 text-xs text-ink-soft space-y-1">
              <div className="font-semibold text-ink">Informasi Sumber Data:</div>
              {chart.dimension && <div><span className="text-ink-faint">Dimensi:</span> {chart.dimension}</div>}
              {chart.metric && <div><span className="text-ink-faint">Metrik:</span> {chart.metric}</div>}
              {chart.sql && (
                <div className="font-mono text-[11px] text-indigo bg-indigo-soft/40 p-2 rounded truncate">
                  SQL: {chart.sql}
                </div>
              )}
            </div>
          )}

          <div className="flex items-center justify-between border-t border-line pt-4 mt-6">
            <button
              type="button"
              onClick={() => {
                if (window.confirm("Apakah Anda yakin ingin menghapus chart ini?")) {
                  onDelete(chart.id);
                  onClose();
                }
              }}
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-rose hover:underline"
            >
              <IconTrash width={14} /> Hapus Chart
            </button>
            <div className="flex gap-2">
              <Btn variant="outline" type="button" onClick={onClose}>
                Batal
              </Btn>
              <Btn type="submit">
                Simpan Perubahan
              </Btn>
            </div>
          </div>
        </form>
      </div>
    </Overlay>
  );
}

function PreviewChart({ type, data }) {
  switch (type) {
    case "combo":
      return (
        <ComboChart
          data={
            data && data.length > 0
              ? data
              : [
                  { label: "Broadband Core", actual: 1250000000, target: 1200000000 },
                  { label: "Acquisition", actual: 850000000, target: 900000000 },
                  { label: "Digital Services", actual: 450000000, target: 400000000 },
                  { label: "Voice & Legacy", actual: 300000000, target: 350000000 },
                ]
          }
        />
      );
    case "line":
      return <LineChart data={data && data.length > 0 ? data : series("12m")} />;
    case "donut":
      return <DonutChart data={data && data.length > 0 ? data : donutData} />;
    case "area":
      return <LineChart data={data && data.length > 0 ? data : series("12m")} color={SERIES[4]} area />;
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
      return <BarChart data={data && data.length > 0 ? data : series("12m")} />;
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

// ---------------------------------------------------------------------------
// BYOK (Bring Your Own Key) Modal (Fase 3)
// ---------------------------------------------------------------------------
function ByokModal({ onClose, onSaved }) {
  const [apiKey, setApiKey] = useState("");
  const [saving, setSaving] = useState(false);

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await saveLlmApiKey(apiKey.trim());
      onSaved("emerald", "LLM API Key berhasil disimpan dan terenkripsi!");
      onClose();
    } catch (err) {
      console.error(err);
      onSaved("rose", "Gagal menyimpan LLM API Key");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Overlay onClose={onClose}>
      <div className="mx-auto w-full max-w-md overflow-hidden rounded-2xl border border-line bg-white p-6 shadow-2xl">
        <div className="flex items-center justify-between border-b border-line pb-3">
          <div className="flex items-center gap-2">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-soft text-indigo">
              <IconSparkle width={18} />
            </span>
            <h3 className="text-base font-semibold text-ink">Bring Your Own Key (BYOK)</h3>
          </div>
          <button onClick={onClose} className="rounded p-1 text-ink-faint hover:bg-slate-100">
            <IconClose width={18} />
          </button>
        </div>

        <form onSubmit={handleSave} className="mt-4 space-y-4">
          <p className="text-xs text-ink-soft">
            Masukkan Google Gemini API Key Anda. Kunci akan dienkripsi dengan aman di database menggunakan Laravel{" "}
            <code className="rounded bg-slate-100 px-1 py-0.5 font-mono text-[11px] text-indigo">Crypt::encryptString</code>.
          </p>

          <Field label="Gemini API Key">
            <input
              type="password"
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              placeholder="AIzaSy..."
              className={inputCls}
            />
          </Field>

          <div className="flex justify-end gap-2 pt-2">
            <Btn variant="outline" type="button" onClick={onClose}>
              Batal
            </Btn>
            <Btn type="submit" disabled={saving}>
              {saving ? "Menyimpan..." : "Simpan Key"}
            </Btn>
          </div>
        </form>
      </div>
    </Overlay>
  );
}

// ---------------------------------------------------------------------------
// Admin User Management Modal
// ---------------------------------------------------------------------------
function UserManagementModal({ onClose, currentUserId, onToast }) {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [formOpen, setFormOpen] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState("member");
  const [saving, setSaving] = useState(false);
  const [formErr, setFormErr] = useState("");

  const loadUsers = async () => {
    setLoading(true);
    try {
      const data = await getUsers();
      setUsers(data || []);
    } catch (err) {
      console.error(err);
      onToast("rose", "Gagal memuat daftar user");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadUsers();
  }, []);

  const openAddForm = () => {
    setEditingUser(null);
    setName("");
    setEmail("");
    setPassword("");
    setRole("member");
    setFormErr("");
    setFormOpen(true);
  };

  const openEditForm = (u) => {
    setEditingUser(u);
    setName(u.name);
    setEmail(u.email);
    setPassword("");
    setRole(u.role || "member");
    setFormErr("");
    setFormOpen(true);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    if (!name.trim() || !email.trim()) {
      setFormErr("Nama dan Email wajib diisi.");
      return;
    }
    if (!editingUser && !password.trim()) {
      setFormErr("Password wajib diisi untuk user baru.");
      return;
    }
    setSaving(true);
    setFormErr("");
    try {
      if (editingUser) {
        const payload = { name: name.trim(), email: email.trim(), role };
        if (password.trim()) payload.password = password.trim();
        await updateUser(editingUser.id, payload);
        onToast("emerald", "User berhasil diperbarui");
      } else {
        await createUser({ name: name.trim(), email: email.trim(), password: password.trim(), role });
        onToast("emerald", "User baru berhasil ditambahkan");
      }
      setFormOpen(false);
      loadUsers();
    } catch (err) {
      console.error(err);
      setFormErr(err.message || "Gagal menyimpan user");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (u) => {
    if (u.id === currentUserId) {
      onToast("rose", "Tidak dapat menghapus akun Anda sendiri");
      return;
    }
    if (!confirm(`Hapus user "${u.name}" (${u.email})?`)) return;
    try {
      await deleteUser(u.id);
      onToast("emerald", "User berhasil dihapus");
      loadUsers();
    } catch (err) {
      console.error(err);
      onToast("rose", "Gagal menghapus user");
    }
  };

  return (
    <Overlay onClose={onClose}>
      <div className="mx-auto w-full max-w-2xl overflow-hidden rounded-2xl border border-line bg-white shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-line px-6 py-4">
          <div className="flex items-center gap-2.5">
            <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-indigo-soft text-indigo">
              <IconUsers width={20} />
            </span>
            <div>
              <h3 className="text-base font-semibold text-ink">User Management</h3>
              <p className="text-xs text-ink-faint">Kelola data pengguna sistem dan hak akses akun</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {!formOpen && (
              <Btn onClick={openAddForm} className="text-xs py-1.5 px-3">
                <IconPlus width={15} /> Tambah User
              </Btn>
            )}
            <button onClick={onClose} className="rounded p-1 text-ink-faint hover:bg-slate-100">
              <IconClose width={18} />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-6">
          {formOpen ? (
            <form onSubmit={handleSave} className="space-y-4 rounded-xl border border-line bg-slate-50/50 p-5">
              <div className="flex items-center justify-between border-b border-line pb-3">
                <span className="text-sm font-semibold text-ink">
                  {editingUser ? `Edit User: ${editingUser.name}` : "Tambah User Baru"}
                </span>
                <button
                  type="button"
                  onClick={() => setFormOpen(false)}
                  className="text-xs text-ink-faint hover:text-ink"
                >
                  Batal
                </button>
              </div>

              {formErr && (
                <div className="rounded-lg border border-rose/30 bg-rose/5 p-3 text-xs text-rose font-medium">
                  {formErr}
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                <Field label="Nama Lengkap">
                  <input
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="e.g. John Doe"
                    className={inputCls}
                    required
                  />
                </Field>
                <Field label="Email">
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="user@northstar.io"
                    className={inputCls}
                    required
                  />
                </Field>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <Field label={editingUser ? "Password Baru (Opsional)" : "Password"}>
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder={editingUser ? "Kosongkan jika tidak diubah" : "Minimal 6 karakter"}
                    className={inputCls}
                    minLength={editingUser ? undefined : 6}
                    required={!editingUser}
                  />
                </Field>
                <Field label="Role">
                  <Select value={role} onChange={(e) => setRole(e.target.value)}>
                    <option value="member">Member (Akses Dashboard &amp; Chart)</option>
                    <option value="admin">Admin (Akses Penuh + Kelola User)</option>
                  </Select>
                </Field>
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-line">
                <Btn variant="outline" type="button" onClick={() => setFormOpen(false)}>
                  Batal
                </Btn>
                <Btn type="submit" disabled={saving}>
                  {saving ? "Menyimpan..." : "Simpan User"}
                </Btn>
              </div>
            </form>
          ) : loading ? (
            <div className="flex flex-col gap-2 py-8">
              {[0, 1, 2].map((i) => (
                <div key={i} className="shimmer h-12 w-full rounded-lg bg-slate-100" />
              ))}
            </div>
          ) : users.length === 0 ? (
            <div className="py-12 text-center text-sm text-ink-faint">Belum ada user terdaftar.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-line text-xs font-semibold uppercase tracking-wider text-ink-faint">
                    <th className="pb-3 pl-2">User</th>
                    <th className="pb-3">Email</th>
                    <th className="pb-3">Role</th>
                    <th className="pb-3 pr-2 text-right">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-line">
                  {users.map((u) => {
                    const isAdmin = u.role === "admin";
                    const isSelf = u.id === currentUserId;
                    return (
                      <tr key={u.id} className="group hover:bg-slate-50/60 transition-colors">
                        <td className="py-3 pl-2">
                          <div className="flex items-center gap-2.5">
                            <span className={`flex h-7 w-7 items-center justify-center rounded-full text-xs font-semibold ${
                              isAdmin ? "bg-indigo text-white shadow-sm" : "bg-slate-200 text-ink-soft"
                            }`}>
                              {initials(u.name)}
                            </span>
                            <div>
                              <div className="font-medium text-ink flex items-center gap-1.5">
                                {u.name}
                                {isSelf && (
                                  <span className="rounded bg-indigo-soft px-1.5 py-0.2 text-[10px] font-semibold text-indigo">
                                    Anda
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>
                        </td>
                        <td className="py-3 text-ink-soft font-mono text-xs">{u.email}</td>
                        <td className="py-3">
                          <span
                            className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium ${
                              isAdmin
                                ? "bg-indigo-soft text-indigo ring-1 ring-indigo/20 font-semibold"
                                : "bg-slate-100 text-ink-soft"
                            }`}
                          >
                            {isAdmin ? "Admin" : "Member"}
                          </span>
                        </td>
                        <td className="py-3 pr-2 text-right">
                          <div className="flex items-center justify-end gap-1">
                            <button
                              type="button"
                              onClick={() => openEditForm(u)}
                              className="rounded p-1 text-ink-faint hover:bg-slate-100 hover:text-indigo"
                              title="Edit user"
                            >
                              <IconEdit width={15} />
                            </button>
                            {!isSelf && (
                              <button
                                type="button"
                                onClick={() => handleDelete(u)}
                                className="rounded p-1 text-ink-faint hover:bg-rose/10 hover:text-rose"
                                title="Hapus user"
                              >
                                <IconTrash width={15} />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
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
  const [authed, setAuthed] = useState(() => !!getAuthToken());
  const [currentUser, setCurrentUser] = useState(() => getStoredUser() || { name: "Ayu Rahma", email: "ayu@northstar.io" });
  const [booting, setBooting] = useState(false);
  const [pages, setPages] = useState(() => defaultSeedPages);
  const [activeId, setActiveId] = useState(1);
  const [pageMenu, setPageMenu] = useState(null);
  const [renaming, setRenaming] = useState(null);
  const [confirmDel, setConfirmDel] = useState(null);
  const [addOpen, setAddOpen] = useState(false);
  const [userMenu, setUserMenu] = useState(false);
  const [byokOpen, setByokOpen] = useState(false);
  const [manageUsersOpen, setManageUsersOpen] = useState(false);
  const [saved, setSaved] = useState(true);
  const [editingChart, setEditingChart] = useState(null);
  const [draggedChartIndex, setDraggedChartIndex] = useState(null);
  const [toasts, setToasts] = useState([]);
  const range = "12m";

  const pushToast = (tone, text) => {
    const id = uid();
    setToasts((t) => [...t, { id, tone, text }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 3800);
  };
  const dismiss = (id) => setToasts((t) => t.filter((x) => x.id !== id));

  // Load pages from Laravel backend API
  const loadPages = async () => {
    try {
      setBooting(true);
      const res = await apiGetPages();
      if (Array.isArray(res) && res.length > 0) {
        setPages(res);
        setActiveId(res[0].id);
      }
    } catch (err) {
      console.error("Failed to load pages from API, using defaults:", err);
    } finally {
      setBooting(false);
    }
  };

  useEffect(() => {
    if (authed) {
      loadPages();
    }
  }, [authed]);

  const active = pages.find((p) => p.id === activeId) ?? pages[0] ?? defaultSeedPages[0];

  const handleLoginSuccess = (user) => {
    setBooting(true);
    setAuthed(true);
    if (user) setCurrentUser(user);
    loadPages();
    setTimeout(() => setBooting(false), 800);
  };

  const handleLogout = async () => {
    try {
      await apiLogout();
    } catch {
      // Ignore
    }
    setAuthed(false);
    setUserMenu(false);
  };

  const addPage = async () => {
    try {
      const res = await apiCreatePage("Untitled Page");
      setPages((prev) => [...prev, res]);
      setActiveId(res.id);
      setRenaming(res.id);
      pushToast("emerald", "Page berhasil dibuat");
    } catch (err) {
      console.error(err);
      const p = { id: uid(), name: "Untitled Page", icon: "chart", charts: [] };
      setPages((prev) => [...prev, p]);
      setActiveId(p.id);
      setRenaming(p.id);
    }
  };

  const savePageRename = async (id, newName) => {
    setRenaming(null);
    setPages((prev) => prev.map((x) => (x.id === id ? { ...x, name: newName || x.name } : x)));
    try {
      await apiUpdatePage(id, { name: newName });
      pushToast("emerald", "Page berhasil di-rename");
    } catch (err) {
      console.error(err);
    }
  };

  const doDelete = async () => {
    if (!confirmDel) return;
    const targetId = confirmDel.id;
    setPages((prev) => prev.filter((p) => p.id !== targetId));
    const remaining = pages.filter((p) => p.id !== targetId);
    if (activeId === targetId && remaining[0]) {
      setActiveId(remaining[0].id);
    }
    setConfirmDel(null);
    try {
      await apiDeletePage(targetId);
      pushToast("rose", "Page dihapus");
    } catch (err) {
      console.error(err);
      pushToast("rose", "Gagal menghapus page di server");
    }
  };

  const persistCharts = async (pageId, newCharts) => {
    setSaved(false);
    try {
      await apiUpdatePage(pageId, { charts: newCharts });
      setSaved(true);
    } catch (err) {
      console.error("Autosave error:", err);
      setSaved(true);
    }
  };

  const addChart = (chart) => {
    const newCharts = [...(active.charts || []), chart];
    setPages((prev) =>
      prev.map((p) => (p.id === active.id ? { ...p, charts: newCharts } : p))
    );
    persistCharts(active.id, newCharts);
  };

  const deleteChart = (chartId) => {
    const newCharts = (active.charts || []).filter((c) => c.id !== chartId);
    setPages((prev) =>
      prev.map((p) => (p.id === active.id ? { ...p, charts: newCharts } : p))
    );
    persistCharts(active.id, newCharts);
    pushToast("rose", "Chart dihapus");
  };

  const duplicateChart = (chart) => {
    addChart({ ...chart, id: uid(), title: `${chart.title} (copy)` });
    pushToast("indigo", "Chart diduplikasi");
  };

  const editChart = (chart) => {
    setEditingChart(chart);
  };

  const handleSaveChartEdit = (updatedChart) => {
    const newCharts = (active.charts || []).map((c) =>
      c.id === updatedChart.id ? updatedChart : c
    );
    setPages((prev) =>
      prev.map((p) => (p.id === active.id ? { ...p, charts: newCharts } : p))
    );
    persistCharts(active.id, newCharts);
    pushToast("emerald", "Chart berhasil diperbarui");
  };

  const handleToggleChartWidth = (chart) => {
    const newWidth = chart.w === 2 ? 1 : 2;
    const newCharts = (active.charts || []).map((c) =>
      c.id === chart.id ? { ...c, w: newWidth } : c
    );
    setPages((prev) =>
      prev.map((p) => (p.id === active.id ? { ...p, charts: newCharts } : p))
    );
    persistCharts(active.id, newCharts);
    pushToast("indigo", `Ukuran chart diubah ke ${newWidth} kolom`);
  };

  const handleReorderCharts = (fromIdx, toIdx) => {
    if (fromIdx === null || toIdx === null || fromIdx === toIdx) return;
    const currentCharts = [...(active.charts || [])];
    const item = currentCharts.splice(fromIdx, 1)[0];
    currentCharts.splice(toIdx, 0, item);
    setPages((prev) =>
      prev.map((p) => (p.id === active.id ? { ...p, charts: currentCharts } : p))
    );
    persistCharts(active.id, currentCharts);
    pushToast("indigo", "Urutan chart berhasil dipindahkan");
  };

  if (!authed) return <LoginScreen onLogin={handleLoginSuccess} onToast={pushToast} />;

  const movePage = async (index, dir) => {
    const targetIdx = index + dir;
    if (targetIdx < 0 || targetIdx >= pages.length) return;
    const next = [...pages];
    const temp = next[index];
    next[index] = next[targetIdx];
    next[targetIdx] = temp;
    setPages(next);
    setPageMenu(null);
    try {
      await apiReorderPages(next);
      pushToast("indigo", "Urutan halaman diperbarui");
    } catch (err) {
      console.error("Reorder failed:", err);
    }
  };

  const renderPageRow = (p, index) => {
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
            onBlur={(e) => savePageRename(p.id, e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && savePageRename(p.id, e.target.value)}
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
            <div className="absolute right-1 top-9 z-20 w-36 overflow-hidden rounded-lg border border-line bg-white py-1 text-sm shadow-lg">
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
              {index > 0 && (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    movePage(index, -1);
                  }}
                  className="flex w-full items-center gap-2 px-3 py-1.5 text-ink-soft hover:bg-slate-50"
                >
                  <IconChevronDown width={14} className="rotate-180 text-ink-faint" /> Move Up
                </button>
              )}
              {index < pages.length - 1 && (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    movePage(index, 1);
                  }}
                  className="flex w-full items-center gap-2 px-3 py-1.5 text-ink-soft hover:bg-slate-50"
                >
                  <IconChevronDown width={14} className="text-ink-faint" /> Move Down
                </button>
              )}
              <div className="my-1 h-px bg-line" />
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

          {/* User profile dropdown: avatar user + nama, dropdown berisi tombol Logout & BYOK */}
          <div className="relative">
            <button
              type="button"
              onClick={() => setUserMenu((m) => !m)}
              className="flex items-center gap-2 rounded-full py-1 pl-1 pr-2.5 transition-colors hover:bg-slate-100"
            >
              <span className="flex h-7 w-7 items-center justify-center rounded-full bg-indigo text-xs font-semibold text-white">
                {initials(currentUser?.name || "Ayu Rahma")}
              </span>
              <span className="text-sm font-medium">{currentUser?.name || "Ayu Rahma"}</span>
              <IconChevronDown width={14} className="text-ink-faint" />
            </button>

            {userMenu && (
              <>
                <div className="fixed inset-0 z-10" onClick={() => setUserMenu(false)} />
                <div className="absolute right-0 top-11 z-20 w-48 overflow-hidden rounded-lg border border-line bg-white py-1 text-sm shadow-lg">
                  <div className="border-b border-line px-3 py-2 text-xs text-ink-faint">
                    {currentUser?.email || "ayu@northstar.io"}
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setUserMenu(false);
                      setByokOpen(true);
                    }}
                    className="flex w-full items-center gap-2 px-3 py-2 text-ink-soft hover:bg-slate-50"
                  >
                    <IconSparkle width={15} className="text-indigo" /> BYOK (LLM API Key)
                  </button>
                  {currentUser?.role === "admin" && (
                    <button
                      type="button"
                      onClick={() => {
                        setUserMenu(false);
                        setManageUsersOpen(true);
                      }}
                      className="flex w-full items-center gap-2 px-3 py-2 text-ink-soft hover:bg-slate-50"
                    >
                      <IconUsers width={15} className="text-indigo" /> User Management
                    </button>
                  )}
                  <div className="h-px bg-line" />
                  <button
                    type="button"
                    onClick={handleLogout}
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
              {pages.map((p, idx) => renderPageRow(p, idx))}
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
          ) : !active.charts || active.charts.length === 0 ? (
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
                {active.charts.map((c, idx) => (
                  <ChartCard
                    key={c.id || idx}
                    index={idx}
                    chart={c}
                    range={range}
                    onDelete={() => deleteChart(c.id)}
                    onDuplicate={() => duplicateChart(c)}
                    onEdit={() => editChart(c)}
                    onToggleWidth={() => handleToggleChartWidth(c)}
                    onDragStart={(e) => {
                      e.dataTransfer.setData("text/plain", String(idx));
                      setDraggedChartIndex(idx);
                    }}
                    onDragOver={(e) => {
                      e.preventDefault();
                      e.dataTransfer.dropEffect = "move";
                    }}
                    onDrop={(e) => {
                      e.preventDefault();
                      handleReorderCharts(draggedChartIndex, idx);
                      setDraggedChartIndex(null);
                    }}
                    onDragEnd={() => setDraggedChartIndex(null)}
                    isDragging={draggedChartIndex === idx}
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

      {/* Edit Chart Modal */}
      {editingChart && (
        <EditChartModal
          chart={editingChart}
          onClose={() => setEditingChart(null)}
          onSave={handleSaveChartEdit}
          onDelete={deleteChart}
        />
      )}

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

      {/* Fase 3: BYOK Modal */}
      {byokOpen && (
        <ByokModal
          onClose={() => setByokOpen(false)}
          onSaved={(tone, msg) => pushToast(tone, msg)}
        />
      )}

      {/* Admin: User Management Modal */}
      {manageUsersOpen && (
        <UserManagementModal
          onClose={() => setManageUsersOpen(false)}
          currentUserId={currentUser?.id}
          onToast={(tone, msg) => pushToast(tone, msg)}
        />
      )}

      {/* 10. Toast Notifications Stack */}
      <ToastStack toasts={toasts} dismiss={dismiss} />
    </div>
  );
}

// ---------------------------------------------------------------------------
// 1. Login Screen with Real API authentication
// ---------------------------------------------------------------------------
function LoginScreen({ onLogin, onToast }) {
  const [email, setEmail] = useState("ayu@northstar.io");
  const [pw, setPw] = useState("password");
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  const submit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg("");
    try {
      const res = await apiLogin(email.trim(), pw);
      onLogin(res.user);
    } catch (err) {
      console.error("Login failed:", err);
      setErrorMsg(err.message || "Email atau password salah.");
      if (onToast) onToast("rose", "Gagal login: Periksa kembali email dan password");
    } finally {
      setLoading(false);
    }
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

        {errorMsg && (
          <div className="mb-4 flex items-center gap-2 rounded-lg bg-rose/10 p-2.5 text-xs font-medium text-rose">
            <IconWarning width={15} />
            <span>{errorMsg}</span>
          </div>
        )}

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
          <Btn
            type="submit"
            disabled={loading}
            className="w-full bg-indigo hover:bg-indigo-dark py-2.5 text-sm font-semibold min-h-[42px]"
          >
            {loading ? (
              <span className="spin h-4 w-4 rounded-full border-2 border-white/40 border-t-white" />
            ) : (
              "Login"
            )}
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
