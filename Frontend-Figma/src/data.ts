// Sample datasets for the mockup.

export type Range = "7d" | "30d" | "12m";

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

export const months12 = MONTHS.map((m, i) => ({
  label: m,
  value: Math.round(4000 + Math.sin(i / 1.7) * 1600 + i * 260 + (i % 3) * 400),
}));

export const days30 = Array.from({ length: 30 }, (_, i) => ({
  label: `${i + 1}`,
  value: Math.round(220 + Math.sin(i / 2.2) * 90 + (i % 7 < 5 ? 120 : -40) + i * 4),
}));

// Range-aware series for bar / line / area charts.
export function series(range: Range) {
  if (range === "12m") return months12;
  if (range === "30d") return days30;
  return days30.slice(-7).map((d, i) => ({ label: ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"][i], value: d.value }));
}

export function rangeLabel(range: Range) {
  return range === "12m" ? "Last 12 months" : range === "30d" ? "Last 30 days" : "Last 7 days";
}

export const donutData = [
  { label: "Direct", value: 4200 },
  { label: "Organic", value: 3100 },
  { label: "Referral", value: 1800 },
  { label: "Social", value: 1200 },
  { label: "Email", value: 700 },
];

export const stackedData = MONTHS.slice(0, 8).map((m, i) => ({
  label: m,
  value: 0,
  parts: [1400 + i * 90, 900 + (i % 4) * 160, 500 + (i % 3) * 120],
}));
export const stackedKeys = ["New", "Returning", "Reactivated"];

export const varianceData = ["Q1", "Q2", "Q3", "Q4", "Jan", "Feb", "Mar", "Apr"].map((label, i) => ({
  label,
  previous: 3200 + i * 220 + (i % 3) * 300,
  current: 3200 + i * 220 + (i % 3) * 300 + (i % 2 === 0 ? 900 : -450),
}));

export const geoTiles = [
  { code: "US", name: "United States", col: 0, row: 1, value: 8200 },
  { code: "CA", name: "Canada", col: 0, row: 0, value: 2100 },
  { code: "BR", name: "Brazil", col: 1, row: 2, value: 3400 },
  { code: "UK", name: "United Kingdom", col: 3, row: 0, value: 4800 },
  { code: "DE", name: "Germany", col: 4, row: 0, value: 3900 },
  { code: "FR", name: "France", col: 3, row: 1, value: 2600 },
  { code: "IN", name: "India", col: 5, row: 1, value: 6100 },
  { code: "SG", name: "Singapore", col: 6, row: 2, value: 1500 },
  { code: "ID", name: "Indonesia", col: 6, row: 2, value: 5200 },
  { code: "JP", name: "Japan", col: 7, row: 1, value: 3300 },
  { code: "AU", name: "Australia", col: 7, row: 3, value: 1800 },
  { code: "ZA", name: "South Africa", col: 4, row: 3, value: 900 },
].map((t) => ({ ...t, col: t.col % 8 }));

export const heatmapRows = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
export const heatmapMatrix = heatmapRows.map((_, r) =>
  Array.from({ length: 12 }, (_, c) => Math.round(20 + Math.abs(Math.sin(r + c / 2)) * 180 + (r > 0 && r < 6 ? 60 : 0))),
);
