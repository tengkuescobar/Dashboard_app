# PROJECT_ANALYSIS.md — Analisa Menyeluruh Dashboard_Analysis1

> Dokumen ini adalah hasil analisa codebase project **Dashboard_Analysis1** (`C:\xampp\htdocs\Dashboard50\Dashboard_Analysis1`).
> Dibuat sebagai acuan sebelum membangun project baru **Dashboard_United**.
> **TIDAK ADA kode yang diubah di project lama** — murni dokumentasi.

---

## Daftar Isi

1. [Pola Chart yang Sudah Ada](#1-pola-chart-yang-sudah-ada)
2. [Sumber Data Saat Ini](#2-sumber-data-saat-ini)
3. [Struktur Database / Data Mart](#3-struktur-database--data-mart)
4. [Endpoint/API yang Sudah Ada](#4-endpointapi-yang-sudah-ada)
5. [Konvensi Kode & Styling yang Konsisten](#5-konvensi-kode--styling-yang-konsisten)
6. [Arsitektur Laravel-React (Keputusan Fase 0)](#6-arsitektur-laravel-react-keputusan-fase-0)
7. [Temuan Inkonsisten & Pertanyaan](#7-temuan-inkonsisten--pertanyaan)

---

## 1. Pola Chart yang Sudah Ada

### 1.1 Arsitektur Chart — Dua Sistem Terpisah

Project ini memiliki **dua sistem chart berbeda** yang beroperasi secara paralel:

#### A. Chart Recharts (Komponen React)
Chart interaktif yang menggunakan library **Recharts v2.12.7** dan menerima data dari API backend.

| Komponen | Lokasi | Tipe Chart | Library |
|---|---|---|---|
| `GaugeChart` | `charts/overview/GaugeChart.jsx` | Custom SVG Gauge | **Raw SVG** (bukan Recharts) |
| `RevenueCompositionPie` | `charts/overview/RevenueCompositionPie.jsx` | Donut/Pie | Recharts (`PieChart`, `Pie`, `Cell`) |
| `ScorecardRow` | `charts/overview/ScorecardRow.jsx` | Scorecard cards | React + CSS (bukan chart) |
| `BreakdownList` | `charts/overview/BreakdownList.jsx` | List/table | React + CSS |
| `SummaryTable` | `charts/overview/SummaryTable.jsx` | Table | React + CSS |
| `IndonesiaGeoChart` | `charts/overview/IndonesiaGeoChart.jsx` | Choropleth Map | `react-simple-maps` + `d3-geo` |
| `TargetManagementModal` | `charts/overview/TargetManagementModal.jsx` | Modal Form | React + MUI |
| `MonthlyTotalChart` | `charts/revenue/MonthlyTotalChart.jsx` | Stacked Bar | Recharts (`ComposedChart`, `Bar`) |
| `RevenueStackedBar` | `charts/revenue/RevenueStackedBar.jsx` | Stacked Bar | Recharts (`ComposedChart`, `Bar`) |
| `LosChart` | `charts/revenue/LosChart.jsx` | Stacked Bar | Recharts (`ComposedChart`, `Bar`) |
| `VarianceComparisonChart` | `charts/revenue/VarianceComparisonChart.jsx` | Grouped Bar + Variance | Recharts |
| `BroadbandStackedBar` | `charts/broadband/BroadbandStackedBar.jsx` | Stacked Bar | Recharts |
| `PrepaidBroadbandChart` | `charts/broadband/PrepaidBroadbandChart.jsx` | Stacked Bar | Recharts |
| `DriverTrend` | `charts/drivers/DriverTrend.jsx` | Line/Area Chart | Recharts |
| `MetricTablesSection` | `charts/drivers/MetricTablesSection.jsx` | Data Tables | React + CSS |

**Pola umum komponen Recharts:**

```jsx
// Setiap chart mengikuti pola ini:
import { useDateFilter } from "../../Layout";       // 1. Ambil filter dari context
import axios from "axios";                            // 2. Fetch data via axios
import { C, axisProps, ... } from "../../../utils/formatters"; // 3. Formatting dari utility
import { Card, SectionTitle, ... } from "../../ui/ChartUIComponents"; // 4. UI wrapper

export function SomeChart() {
  const { dateFilter } = useDateFilter();
  const [rawData, setRawData] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    axios.get("/api/dashboard/some-endpoint", {
      params: { ...dateFilter, grain: period }
    }).then(res => { setRawData(res.data); setLoading(false); });
  }, [dateFilter, period]);

  // ... transform data, render Recharts
}
```

#### B. Chart YAML (Custom HTML/SVG via `dangerouslySetInnerHTML`)
Sistem rendering chart berbasis YAML — YAML file berisi `title` dan `content_html`, lalu di-render sebagai card via sanitized HTML injection.

| File YAML | Isi | Tipe Visual |
|---|---|---|
| `sample-bar-chart.yaml` | Revenue Monthly Total | Stacked Bar (SVG manual) |
| `sample-line-chart.yaml` | Subscriber Growth Trend | Multi-line (SVG manual) |
| `sample-variance-analysis.yaml` | Revenue Variance Q4 2026 | Scorecards + Gauges + YoY Bar (SVG manual) |

**Pipeline YAML chart:**
```
File YAML → parseYamlContent() → js-yaml parse → DOMPurify sanitize → dangerouslySetInnerHTML
```

**Skema YAML wajib:**
```yaml
title: "Judul Chart"           # string, WAJIB
content_html: |                # string HTML/SVG, WAJIB
  <div>...</div>
```

**Sanitasi (yamlChartLoader.js):**
- Library: `DOMPurify v3.4.15`
- Profiles: HTML + SVG + SVG Filters
- Tag tambahan diizinkan: `<style>`
- Atribut SVG di-whitelist secara eksplisit (`viewBox`, `fill`, `stroke`, `d`, `cx`, `cy`, dll.)
- Tag `<script>` dan event handler (`onclick`, `onerror`, dll.) **DIBLOKIR**

### 1.2 Pola Data Fetching

| Pola | Komponen Yang Pakai | Penjelasan |
|---|---|---|
| `axios.get()` + `useEffect` | Semua chart Recharts | Data di-fetch dari API Laravel saat mount/filter berubah |
| `useDateFilter()` context | Semua chart Recharts | Filter (year, month, quarter, area, region) dari Layout context |
| `?raw` Vite import | YAML charts | YAML file di-import sebagai raw string via Vite |
| Mock data (hardcoded) | `dashboardMockData.js` | Data dummy tersedia tapi **TIDAK dipakai** di production — semua chart sudah nyambung ke API |

### 1.3 Pola Styling Chart

- **Wrapper**: Semua chart dibungkus komponen `<Card>` dari `ChartUIComponents.jsx`
- **Header**: `<SectionTitle icon={LucideIcon} label="..." />`
- **Controls**: `<Dropdown>`, `<LabelToggle>`, `<ChartDownloadButton>` — semua dari `ChartUIComponents.jsx`
- **Legend**: `<ChartLegend items={[...]} activeItem={...} onItemClick={...} />`
- **Tooltip**: Custom `<ChartHoverPopoverCard>` — bukan Recharts Tooltip bawaan, melainkan popover custom yang muncul di atas chart
- **Loading state**: `<ChartSkeleton height={...} />` — shimmer effect
- **Bar radius**: Top bar selalu `[6,6,0,0]`, inner bars `[0,0,0,0]`
- **Grid**: `strokeDasharray="3 3"`, `stroke="var(--dt-grid)"`, vertical=false
- **Axis**: Props konsisten dari `axisProps` (font: DM Mono, size: 11, no axis line, no tick line)

---

## 2. Sumber Data Saat Ini

### 2.1 Alur Data Lengkap

```
┌──────────┐     ┌──────────────┐     ┌────────────────────────┐     ┌──────────────┐     ┌───────────┐
│  .env    │────→│ Laravel       │────→│  DashboardService.php  │────→│ DashboardCtrl │────→│  React    │
│ (koneksi)│     │ config/       │     │  (query + aggregation) │     │ (caching +    │     │  Frontend │
│          │     │ database.php  │     │                        │     │  JSON response)│     │  (Recharts)│
└──────────┘     └──────────────┘     └────────────────────────┘     └──────────────┘     └───────────┘
```

**Detail alur:**

1. **`.env`** — Menyimpan kredensial database saja (BUKAN data):
   ```
   DB_CONNECTION=mysql
   DB_HOST=127.0.0.1
   DB_PORT=3306
   DB_DATABASE=Dashboard11
   DB_USERNAME=root
   DB_PASSWORD=
   ```

2. **`config/database.php`** — Membaca `.env` untuk konfigurasi koneksi MySQL

3. **`DashboardService.php`** (1011 baris) — Service layer yang berisi SEMUA logika query. Ini adalah **inti dari backend**:
   - `summary()` → Scorecards, Gauge, Breakdown, Driver metrics
   - `revenueTotal()` → Revenue by product category over time
   - `revenueBySalesType()` → Revenue BAU vs New Sales
   - `revenueLos()` → Revenue by Length of Stay
   - `broadbandPack()` → Broadband pack breakdown
   - `prepaidBroadband()` → Prepaid broadband analysis
   - `driverTrend()` → Driver metric trends
   - `varianceAnalysis()` → YoY comparison
   - `revenueByArea()` → Geographic revenue

4. **`DashboardController.php`** — Thin controller, delegasi ke service, tambah caching (12 jam TTL)

5. **React Frontend** — Fetch via `axios.get("/api/dashboard/...")`, render via Recharts

### 2.2 Catatan Penting: Data BUKAN dari .env

Data **TIDAK** di-hardcode di `.env` atau file config. `.env` hanya menyimpan connection string ke MySQL database `Dashboard11`. Semua data di-query langsung dari database melalui Laravel's query builder (`DB::table()`).

Mock data (`dashboardMockData.js`) ada di frontend tapi **TIDAK aktif dipakai** — semua chart sudah terhubung ke API endpoint yang query database langsung.

---

## 3. Struktur Database / Data Mart

### 3.1 Skema Star Schema

Project menggunakan **Star Schema** klasik dengan tabel dimensi dan tabel fakta:

```
                    ┌─────────────┐
                    │  dim_dates  │
                    │─────────────│
                    │ id (PK)     │
                    │ date        │──────┐
                    │ year        │      │
                    │ month       │      │
                    │ quarter     │      │
                    │ day_of_week │      │
                    └─────────────┘      │
                                         │
┌──────────────┐    ┌──────────────────┐ │   ┌────────────────┐
│ dim_products │    │  fact_revenues   │ │   │ dim_sales_types│
│──────────────│    │──────────────────│ │   │────────────────│
│ id (PK)      │◄───│ dim_product_id   │ │   │ id (PK)        │
│ category     │    │ dim_date_id      │─┘   │ type_name      │
│ broadband_   │    │ dim_sales_type_id│────►│                │
│  pack_type   │    │ dim_location_id  │     └────────────────┘
└──────────────┘    │ actual_revenue   │
                    └──────────────────┘
                                         
┌──────────────┐    ┌──────────────────┐    ┌────────────────┐
│dim_locations │    │  fact_targets    │    │ dim_metrics    │
│──────────────│    │──────────────────│    │────────────────│
│ id (PK)      │◄───│ dim_location_id  │    │ id (PK)        │
│ area_name    │    │ dim_sales_type_id│    │ metric_name    │
│ region_name  │    │ dim_product_id   │    └───────┬────────┘
└──────────────┘    │ year             │            │
                    │ month            │    ┌───────┴────────┐
                    │ target_revenue   │    │ fact_drivers   │
                    │ timestamps       │    │────────────────│
                    └──────────────────┘    │ dim_date_id    │
                                           │ dim_metric_id  │
                                           │ value          │
                                           └────────────────┘
```

### 3.2 Detail Tabel Dimensi

| Tabel | Kolom | Tipe | Keterangan |
|---|---|---|---|
| **dim_dates** | `id` | bigint (PK) | Auto increment |
| | `date` | date (unique) | Tanggal kalender |
| | `year` | integer | Tahun |
| | `month` | integer | Bulan (1-12) |
| | `quarter` | integer | Kuartal (1-4) |
| | `day_of_week` | integer | Hari dalam minggu |
| **dim_products** | `id` | bigint (PK) | Auto increment |
| | `category` | string | "Broadband", "Digital", "IR", "Voice", "SMS", "Others" |
| | `broadband_pack_type` | string (nullable) | "Core", "Acquisition", "CVM (BTL)", "Phys. Voucher", "Others" |
| **dim_sales_types** | `id` | bigint (PK) | Auto increment |
| | `type_name` | string | "BAU" atau "New Sales" |
| **dim_metrics** | `id` | bigint (PK) | Auto increment |
| | `metric_name` | string | Nama metrik (e.g. "Playing User", "Trx", dll.) |
| **dim_locations** | `id` | bigint (PK) | Auto increment |
| | `area_name` | string | Nama area (level 1) |
| | `region_name` | string | Nama region (level 2, di bawah area) |

### 3.3 Detail Tabel Fakta

| Tabel | Kolom | Tipe | FK → | Keterangan |
|---|---|---|---|---|
| **fact_revenues** | `id` | bigint (PK) | | |
| | `dim_date_id` | FK | dim_dates.id | Granularity: per hari |
| | `dim_product_id` | FK | dim_products.id | Kategori produk |
| | `dim_sales_type_id` | FK | dim_sales_types.id | BAU / New Sales |
| | `dim_location_id` | FK | dim_locations.id | Area/Region |
| | `actual_revenue` | decimal(20,2) | | Pendapatan aktual |
| **fact_targets** | `id` | bigint (PK) | | |
| | `year` | integer | | Tahun target |
| | `month` | integer | | Bulan (1-12) |
| | `dim_location_id` | FK (nullable) | dim_locations.id | |
| | `dim_sales_type_id` | FK (nullable) | dim_sales_types.id | BAU / New Sales |
| | `dim_product_id` | FK (nullable) | dim_products.id | |
| | `target_revenue` | decimal(20,2) | | Target revenue |
| | `timestamps` | created_at, updated_at | | |
| **fact_drivers** | `id` | bigint (PK) | | |
| | `dim_date_id` | FK | dim_dates.id | |
| | `dim_metric_id` | FK | dim_metrics.id | |
| | `value` | decimal(20,2) | | Nilai metrik |

### 3.4 Catatan Database

- Database: **MySQL** (`Dashboard11` di localhost)
- Ada juga file `database.sqlite` (1.8MB) di folder `database/` — kemungkinan untuk development/fallback
- Tabel `fact_revenues` adalah tabel transaksional utama, granularity per **hari per produk per sales type per lokasi**
- Tabel `fact_targets` adalah data mart aggregated per **bulan per lokasi per sales type**
- Terdapat **performance indexes** yang ditambahkan via migration `add_performance_indexes.php`
- File SQL (`insert.sql`, `insertsql2.sql`) tersedia untuk seed data

---

## 4. Endpoint/API yang Sudah Ada

Semua API routes didefinisikan di `routes/web.php` dengan prefix `/api`, dilindungi middleware `auth`.

### 4.1 Dashboard Data Endpoints

| Endpoint | Method | Controller Method | Parameter | Deskripsi |
|---|---|---|---|---|
| `/api/dashboard/summary` | GET | `summary()` | year, month, quarter, area, region | Scorecard, Gauge, Breakdown (overview page) |
| `/api/dashboard/revenue-total` | GET | `revenueTotal()` | year, month, quarter, grain, area, region | Revenue by category (Broadband/Digital/dll) |
| `/api/dashboard/revenue-by-sales-type` | GET | `revenueBySalesType()` | year, month, quarter, grain, area, region | Revenue BAU vs New Sales |
| `/api/dashboard/revenue-los` | GET | `revenueLos()` | year, month, quarter, grain, area, region | Revenue by Length of Stay |
| `/api/dashboard/broadband-pack` | GET | `broadbandPack()` | year, month, quarter, grain, area, region | Broadband pack breakdown |
| `/api/dashboard/prepaid-broadband` | GET | `prepaidBroadband()` | year, month, quarter, grain, area, region | Prepaid broadband data |
| `/api/dashboard/driver-trend` | GET | `driverTrend()` | year, month, quarter, grain, metric, area, region | Driver metric trend |
| `/api/dashboard/gauge-chart` | GET | `getGaugeChartData()` | year, month, quarter, sales_type, area, region | Gauge chart data |
| `/api/dashboard/variance-analysis` | GET | `varianceAnalysis()` | year, month, quarter, area, region | YoY comparison |
| `/api/dashboard/revenue-by-area` | GET | `revenueByArea()` | year, month, quarter, area, region | Revenue by area (geo chart) |
| `/api/locations` | GET | `locations()` | — | Daftar area & region untuk filter |

### 4.2 Target Management Endpoints

| Endpoint | Method | Controller | Deskripsi |
|---|---|---|---|
| `/api/targets` | GET | `TargetController@index` | List target per bulan |
| `/api/targets` | POST | `TargetController@store` | Create/update target per bulan |
| `/api/targets/bulk` | POST | `TargetController@bulkStore` | Bulk update target |
| `/api/targets` | DELETE | `TargetController@destroy` | Reset/delete target |

### 4.3 Utility Endpoints

| Endpoint | Method | Deskripsi |
|---|---|---|
| `/api/cache/clear` | POST | Flush semua cache |
| `/login` | GET, POST | Login form & auth |
| `/logout` | POST | Logout |

### 4.4 Pola Caching

Semua endpoint dashboard di-cache 12 jam (43200 detik) via `Cache::remember()`. Cache key unik per kombinasi parameter:
```php
private function cacheKey(string $prefix, Request $request, array $extraKeys = []): string
{
    // prefix + year + month + quarter + grain + area + region + extraKeys
}
```

Cache di-flush saat target diupdate (`Cache::flush()` di TargetController).

### 4.5 Pola Response

Semua endpoint mengembalikan JSON langsung tanpa wrapper khusus (kecuali target management yang menggunakan `{ status, data }`). Contoh response `revenue-total`:
```json
[
  { "p": "Jan 2025", "Broadband": 16800, "Digital": 8200, "IR": 5100, "Voice": 9400, "SMS": 3200, "Others": 2600 }
]
```

---

## 5. Konvensi Kode & Styling yang Konsisten

### 5.1 Konvensi Penamaan File

| Kategori | Pola | Contoh |
|---|---|---|
| Pages | `Dashboard[Feature].jsx` (PascalCase) | `DashboardOverview.jsx`, `DashboardRevenue.jsx` |
| Chart components | `[ChartName].jsx` (PascalCase) | `GaugeChart.jsx`, `MonthlyTotalChart.jsx` |
| UI components | `[component].jsx` (lowercase untuk shadcn, PascalCase untuk custom) | `button.jsx`, `ChartUIComponents.jsx` |
| Utility files | `[name].js` (camelCase) | `formatters.js`, `yamlChartLoader.js` |
| YAML data | `sample-[type].yaml` (kebab-case) | `sample-bar-chart.yaml` |
| Backend controllers | `[Name]Controller.php` (PascalCase) | `DashboardController.php` |
| Backend models | `[ModelName].php` (PascalCase, singular) | `FactTarget.php`, `DimLocation.php` |
| Backend services | `[Name]Service.php` (PascalCase) | `DashboardService.php` |

### 5.2 Styling Approach — Hybrid System

Project menggunakan **pendekatan hybrid** antara Tailwind CSS v4 dan CSS Custom Properties:

1. **Tailwind CSS v4** — Untuk layout, spacing, responsive grid, utility classes
2. **CSS Custom Properties (`--dt-*`)** — Untuk semua warna dan theming dashboard
3. **Inline `style={{}}` props** — Untuk warna yang mereferensi CSS variables

**Contoh cuplikan khas:**
```jsx
<div 
  className="flex items-center justify-between px-5 py-3"  // Tailwind: layout
  style={{ 
    borderBottom: "1px solid var(--dt-card-border)",        // CSS var: warna
    background: "var(--dt-card)"                            // CSS var: warna
  }}
>
```

> **Catatan penting:** Warna **TIDAK** pakai Tailwind utility classes (bukan `bg-blue-500`), melainkan selalu mereferensi `--dt-*` CSS variables via inline `style` prop. Ini memungkinkan dark/light mode switching yang lancar.

### 5.3 Palet Warna Resmi (dari `formatters.js`)

```javascript
export const C = {
  bau: "#3B82F6",         // BAU / Existing — Blue
  newSales: "#F59E0B",    // New Sales — Amber
  existing: "#3B82F6",    // (alias bau)
  acquisition: "#8B5CF6", // Acquisition — Purple  
  core: "#06B6D4",        // Core — Cyan
  cvmBtl: "#F97316",      // CVM (BTL) — Orange
  physVoucher: "#EC4899", // Phys. Voucher — Pink
  broadband: "#3B82F6",   // Broadband — Blue
  digital: "#A78BFA",     // Digital — Light Purple
  ir: "#F59E0B",          // IR — Amber
  voice: "#06B6D4",       // Voice — Cyan
  sms: "#22C55E",         // SMS — Green
  others: "#6B7280",      // Others — Gray
  success: "#22C55E",     // Success/On Target — Green
  danger: "#EF4444"       // Danger/Below Target — Red
};
```

### 5.4 Theme System (`--dt-*` CSS Variables)

Didefinisikan di `resources/js/styles/theme.css`:

**Light Mode (`:root`):**
```css
--dt-bg: #EEF2FA;
--dt-card: #FFFFFF;
--dt-card-border: rgba(0,0,0,0.08);
--dt-header-bg: rgba(238,242,250,0.88);
--dt-text-1: #0F172A;    /* Primary text */
--dt-text-2: #334155;    /* Secondary text */
--dt-text-3: #64748B;    /* Muted text */
--dt-text-4: #94A3B8;    /* Hint text */
--dt-grid: rgba(0,0,0,0.07);
--dt-dd-bg: rgba(59,130,246,0.08);
--dt-dd-text: #2563EB;
--dt-accent-text: #1D4ED8;
```

**Dark Mode (`.dark`):**
```css
--dt-bg: #080E1C;
--dt-card: #0F1829;
--dt-card-border: rgba(255,255,255,0.07);
--dt-header-bg: rgba(8,14,28,0.85);
--dt-text-1: #E8EDF5;
--dt-text-2: #CBD5E1;
--dt-text-3: #64748B;
--dt-text-4: #475569;
--dt-grid: rgba(255,255,255,0.05);
--dt-dd-text: #93C5FD;
```

### 5.5 Font System

| Penggunaan | Font | Definisi |
|---|---|---|
| Body/General | `Inter, sans-serif` | Set di Layout: `fontFamily: "Inter, sans-serif"` |
| Angka/Monospace (chart axis, values) | `DM Mono, monospace` | Set di `axisProps` dan value labels |
| YAML chart fallback | `'Inter', 'Segoe UI', system-ui, sans-serif` | Inline di YAML content_html |

### 5.6 Pola Komponen UI Reusable

Semua di `ChartUIComponents.jsx` (691 baris, file terbesar):

| Komponen | Fungsi |
|---|---|
| `Card` | Wrapper card dengan border, rounded corners, padding |
| `SectionTitle` | Section header dengan icon Lucide + label |
| `Dropdown` | Custom dropdown untuk filter (period, category) |
| `LabelToggle` | Toggle show/hide segment labels |
| `ChartDownloadButton` | Button download CSV |
| `ChartLegend` | Legend interaktif (klik untuk filter) |
| `SegmentPill` | Label di atas segment bar |
| `makeTopLabel` | Factory function untuk total+percentage label di atas bar |
| `handleBarHover` | Handler untuk hover popover pada bars |
| `ChartHoverPopoverCard` | Popover card saat hover di chart |
| `CustomTooltip` | Custom tooltip untuk Recharts |
| `ChartDetailPopover` | Global detail popover |
| `SeriesIndicator` | Indikator warna (kotak/garis) di tooltip |

### 5.7 Pola CSV Export

Setiap chart yang mendukung download menggunakan `exportToCSV()` dari `utils/csvExport.js`:
```javascript
exportToCSV({
  filename: "Revenue_Analysis_Monthly_All",
  title: "Revenue Analysis Report",
  subtitle: "Grain: Monthly | Category: All | Year: 2025",
  headers: [...],
  rows: [...],
  summaryRow: [...]
});
```

### 5.8 Routing & Navigation

```
/              → DashboardOverview (default)
/revenue       → DashboardRevenue
/broadband     → DashboardBroadband
/drivers       → DashboardDrivers
/yaml-charts   → DashboardYamlChart
/*             → Redirect ke /
```

Sidebar navigasi di `Sidebar.jsx` — collapsible, icons dari `lucide-react`.

### 5.9 State Management

- **Global date filter**: React Context (`DateFilterContext`) di `Layout.jsx`
- **URL sync**: Filter params di-sync ke URL search params via `useSearchParams()`
- **Per-chart state**: `useState` lokal (period, category, rawData, loading, hoveredState)
- **Tidak ada Redux/Zustand** — murni React context + local state

---

## 6. Arsitektur Laravel-React (Keputusan Fase 0)

Berdasarkan pengecekan struktur direktori dan file `routes/web.php` pada project `Dashboard_Analysis1`, project ini menggunakan arsitektur **REST API terpisah (SPA Catch-all)**, bukan Inertia.js.

### 6.1 Bukti Struktur
1. **Tidak ada folder `resources/js/Pages`** yang biasa dipakai di arsitektur Inertia. React component dikelompokkan ke `pages` dan `components`.
2. **Routing React menggunakan `react-router-dom`** di `resources/js/app/app.jsx` (`<BrowserRouter>`, `<Routes>`, `<Route>`). Inertia tidak menggunakan react-router.
3. **Routing Laravel menggunakan Catch-all SPA route**:
   ```php
   // routes/web.php
   Route::middleware('auth')->get('/{any}', function () {
       return view('welcome');
   })->where('any', '.*');
   ```
4. **Data fetching menggunakan Axios** langsung ke `/api/*` endpoints, bukan menerima data via `props` dari Inertia backend render.

### 6.2 Keputusan Arsitektur
Untuk mempertahankan konsistensi dengan project sebelumnya dan mengakomodasi kebutuhan dashboard modern:

**Keputusan: Menggunakan REST API terpisah dengan SPA routing di React.**

**Alasan:**
1. Pola ini sudah terbukti bekerja dengan baik di project `Dashboard_Analysis1`.
2. Cocok untuk aplikasi dashboard yang heavy di sisi client (data fetching, interaksi chart yang sering) tanpa harus reload full page context seperti yang kadang terjadi di Inertia jika tidak hati-hati.
3. React bertanggung jawab penuh atas UI (react-router), sementara Laravel murni bertugas sebagai penyedia data API dan autentikasi.

### 6.3 Implementasi Auth (Fase 0)
Dengan keputusan ini, implementasi autentikasi pada Fase 0 akan menggunakan:
- Auth session bawaan Laravel untuk mengamankan API route (memanfaatkan guard web dan session cookie). Ini lebih simpel daripada token Sanctum jika API dan frontend berada di domain yang sama.
- Endpoint POST `/login` dan `/logout` standar dari Laravel.
- Frontend React memanggil endpoint login, dan jika sukses, redirect ke route utama SPA.
- Middleware `auth` di Laravel akan melindungi rute `/api/*` dan catch-all `/{any}`.

---

## 7. Temuan Inkonsisten & Pertanyaan

### 7.1 Temuan Inkonsisten

#### 🟡 TI-1: Dua Sistem CSS Variables
- `app.css` mendefinisikan CSS variables menggunakan `oklch()` color format (shadcn/ui style)
- `theme.css` mendefinisikan `--dt-*` variables menggunakan hex/rgba
- **Dashboard chart components hanya menggunakan `--dt-*`** — variables di `app.css` dipakai oleh shadcn/ui components saja
- **Pertanyaan:** Di Dashboard_United, mau tetap pertahankan dua sistem ini, atau konsolidasi ke satu?

#### 🟡 TI-2: Model DimLocation.revenues() Error
```php
// DimLocation.php line 21 — BUG:
public function revenues()
{
    return $this->hasMany(\Illuminate\Support\Facades\DB::class);
    // Seharusnya return hasMany ke model/tabel, bukan ke DB facade
}
```
Relasi ini tidak terpakai di mana pun (semua query pakai DB::table langsung), jadi tidak berdampak saat ini.

#### 🟡 TI-3: Mock Data Ada tapi Tidak Dipakai
`dashboardMockData.js` (351 baris) berisi data dummy yang komprehensif tapi sudah tidak dipakai setelah chart terhubung ke API. File ini masih di-import di `DashboardComponents.jsx` barrel export.

#### 🟡 TI-4: Perbedaan Pola Fetch Data di Overview Page
- Overview page: Fetch via `useDateFilter()` + `axios.get()` di **page component** (`DashboardOverview.jsx`)
- Revenue/Broadband/Drivers: Fetch di **masing-masing chart component**
- Ini menghasilkan pola yang berbeda — Overview page fetch satu kali, lalu pass data via props; sedangkan chart lain fetch sendiri-sendiri.

#### 🟡 TI-5: Pola Styling di YAML Content
YAML sample charts menggunakan **inline style langsung** dengan warna hard-coded (bukan CSS variables). Contoh:
```html
<!-- Di YAML: -->
<span style="color: #94a3b8;">Label</span>

<!-- Di React chart: -->
style={{ color: "var(--dt-text-4)" }}
```
Ini berarti YAML charts **tidak mendukung dark mode** — warna akan tetap sama di light/dark. Sedangkan React charts mendukung dark mode via CSS variables.

#### 🟡 TI-6: `.env` Typo
Baris 63: `AWS_USE_PATH_STYLE_ENDPOINT=falsex` — ada karakter `x` di akhir.

### 7.2 Pertanyaan untuk Diklarifikasi

1. **[TI-1] Konsolidasi CSS?** Apakah di project baru mau pakai satu set CSS variables saja (`--dt-*`), atau tetap pertahankan dua sistem?

2. **[TI-4] Pola Fetch?** Mau standarisasi pola fetch data? Apakah lebih baik setiap chart fetch sendiri (seperti Revenue charts), atau satu page fetch semua lalu pass via props (seperti Overview)?

3. **[TI-5] Dark Mode di YAML?** Apakah YAML charts perlu mendukung dark mode? Jika ya, perlu konvensi CSS variables yang harus dipakai di `content_html`.

4. **Database:** Apakah Dashboard_United akan pakai database yang sama (`Dashboard11`), atau database baru?

---

> **Dokumen ini dibuat berdasarkan analisa kode project Dashboard_Analysis1 pada 10 September 2026.**
> **Tidak ada perubahan kode yang dilakukan pada project lama.**
