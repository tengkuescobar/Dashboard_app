# YAML_CHART_SKILL.md — Skill Guide untuk YAML Chart Generation

> **Dokumen ini adalah ACUAN TETAP** setiap kali ada permintaan untuk generate YAML chart — baik oleh manusia, AI Agent, atau siapapun.
> Dibuat berdasarkan temuan di `PROJECT_ANALYSIS.md` agar **SELALU KONSISTEN** dengan pola yang sudah ada di project.

---

## Daftar Isi

1. [Skema YAML Baku](#1-skema-yaml-baku)
2. [Aturan Konsistensi Visual](#2-aturan-konsistensi-visual)
3. [Aturan Penamaan (Naming Convention)](#3-aturan-penamaan-naming-convention)
4. [Aturan Khusus Mode Data Mart](#4-aturan-khusus-mode-data-mart)
5. [Contoh Lengkap (Few-shot Examples)](#5-contoh-lengkap-few-shot-examples)
6. [Checklist Validasi](#6-checklist-validasi)

---

## 1. Skema YAML Baku

### 1.1 Struktur Dasar (Wajib untuk SEMUA YAML chart)

```yaml
# Komentar deskriptif tentang chart
# Boleh multi-line

title: "Judul Chart Yang Jelas"    # WAJIB — string, non-empty

content_html: |                     # WAJIB — string HTML/SVG, non-empty
  <div style="font-family: 'Inter', 'Segoe UI', system-ui, sans-serif;">
    <!-- Isi chart di sini -->
  </div>
```

**Aturan indentasi:**
- File YAML menggunakan **2 spasi** untuk indentasi (BUKAN tab)
- `content_html` menggunakan literal block scalar (`|`) — bukan flow scalar
- HTML di dalam `content_html` boleh indentasi bebas, tapi baris pertama harus di-indent 2 spasi dari `content_html:`

### 1.2 Field Wajib

| Field | Tipe | Wajib? | Keterangan |
|---|---|---|---|
| `title` | string | ✅ WAJIB | Judul yang akan tampil di header card. Non-empty. |
| `content_html` | string (HTML/SVG) | ✅ WAJIB | Markup HTML/SVG yang akan di-render. Non-empty. |

### 1.3 Varian Skema: Mode Data Mart

Untuk chart yang terhubung ke data mart (data dinamis dari backend), tambahkan field `data_query`:

```yaml
title: "Revenue Monthly Trend"

data_query:                          # OPSIONAL — untuk mode data mart
  id: "revenue_monthly_total"        # WAJIB di data_query — ID dari Query Catalog
  params:                            # OPSIONAL — parameter yang dikirim ke query
    year: 2025
    grain: "Monthly"
    category: "All"

content_html: |                      # WAJIB — tetap harus ada!
  <div style="font-family: 'Inter', 'Segoe UI', system-ui, sans-serif;">
    <!-- TEMPLATE: placeholder akan diisi oleh computation layer -->
    <!-- Gunakan {{variable_name}} untuk placeholder -->
    <p>Total Revenue: <strong>{{total_revenue}}</strong></p>
    <!-- SVG/chart markup dengan data placeholder -->
  </div>
```

**Perbedaan content_html antara dua mode:**

| Aspek | Mode Dummy (Hardcoded) | Mode Data Mart |
|---|---|---|
| `data_query` | **Tidak ada** | **Ada** — referensi ke Query Catalog |
| `content_html` | Berisi data statis langsung | Berisi **TEMPLATE** dengan placeholder `{{...}}` |
| Siapa yang isi data? | Penulis YAML, manual | **Computation layer**, otomatis saat render |
| Kapan data diproses? | Saat YAML dibuat | Saat runtime, setelah query dieksekusi |

> ⚠️ **PENTING:** Field `content_html` **WAJIB ADA** di KEDUA mode. Untuk mode data mart, isinya adalah template — BUKAN data final.

### 1.4 Larangan Keamanan

**DILARANG KERAS** menyertakan di dalam YAML:

| Yang Dilarang | Alasan | Contoh yang SALAH |
|---|---|---|
| Tag `<script>` | Distrip oleh DOMPurify, indikasi XSS | `<script>alert('x')</script>` |
| Event handler HTML | Distrip oleh DOMPurify | `onclick="..."`, `onerror="..."` |
| `<iframe>`, `<object>`, `<embed>` | Potensi XSS | `<iframe src="...">` |
| Kredensial / connection string | Bocor ke client | `DB_HOST=...`, `password=...` |
| Query SQL mentah | Bocor ke client, injection risk | `SELECT * FROM ...` |
| JavaScript inline | Tidak berfungsi setelah sanitasi | `javascript:void(0)` |

---

## 2. Aturan Konsistensi Visual

### 2.1 Palet Warna Resmi

Warna berikut **WAJIB** dipakai untuk kategori yang sesuai. **JANGAN** mengarang warna baru.

| Kategori | Hex | Nama | Kapan Dipakai |
|---|---|---|---|
| BAU / Existing | `#3B82F6` | Blue 500 | Revenue existing, broadband |
| New Sales | `#F59E0B` | Amber 500 | Revenue new sales, IR |
| Acquisition | `#8B5CF6` | Violet 500 | Broadband acquisition |
| Core | `#06B6D4` | Cyan 500 | Broadband core, voice |
| CVM (BTL) | `#F97316` | Orange 500 | CVM Below The Line |
| Phys. Voucher | `#EC4899` | Pink 500 | Physical voucher |
| Digital | `#A78BFA` | Violet 400 | Digital revenue |
| SMS | `#22C55E` | Green 500 | SMS revenue, success indicator |
| Others | `#6B7280` | Gray 500 | Kategori lain-lain |
| Success / On Target | `#22C55E` | Green 500 | Gauge on target, positive variance |
| Danger / Below Target | `#EF4444` | Red 500 | Gauge below target, negative variance |

**Warna pendukung (non-data):**

| Elemen | Light Mode | Dark Mode | CSS Variable |
|---|---|---|---|
| Background page | `#EEF2FA` | `#080E1C` | `--dt-bg` |
| Card background | `#FFFFFF` | `#0F1829` | `--dt-card` |
| Card border | `rgba(0,0,0,0.08)` | `rgba(255,255,255,0.07)` | `--dt-card-border` |
| Primary text | `#0F172A` | `#E8EDF5` | `--dt-text-1` |
| Secondary text | `#334155` | `#CBD5E1` | `--dt-text-2` |
| Muted text | `#64748B` | `#64748B` | `--dt-text-3` |
| Hint text / label | `#94A3B8` | `#475569` | `--dt-text-4` |
| Grid lines | `rgba(0,0,0,0.07)` | `rgba(255,255,255,0.05)` | `--dt-grid` |
| Accent text | `#1D4ED8` | `#93C5FD` | `--dt-accent-text` |

> 💡 **Usulan perbaikan:** YAML charts saat ini menggunakan warna hardcoded yang hanya berfungsi di light mode. Disarankan agar YAML `content_html` baru menggunakan CSS classes atau `currentColor` pattern agar kompatibel dengan dark mode. Keputusan ini menunggu persetujuan Anda.

### 2.2 Tipografi

| Elemen | Font | Ukuran | Weight |
|---|---|---|---|
| Container/body text | `'Inter', 'Segoe UI', system-ui, sans-serif` | — | — |
| Heading/title (di YAML) | Inter | 10-12px | 700 (bold) |
| Subtitle/deskripsi | Inter | 12px | 400 (regular) |
| Label sumbu / legend | Inter / system | 10-11px | 400 |
| Nilai angka | Monospace (`DM Mono, monospace`) | Bervariasi | 600-800 |
| Data label di atas bar | System / Inter | 9px | 600 |
| Y-axis label | Monospace | 10px | 400 |
| X-axis label | System | 10px | 400 |

### 2.3 Spacing & Padding

| Elemen | Nilai |
|---|---|
| Legend margin-bottom | `16px` |
| Gap antar item legend | `16px` |
| SVG `viewBox` standar | `"0 0 780 320"` (landscape chart) |
| Margin atas untuk label | 4-6px di atas elemen chart |
| Card padding (set oleh renderer) | `20px` (p-5) |

### 2.4 Pola Legend

Legend harus mengikuti pola konsisten:

```html
<div style="display: flex; gap: 16px; margin-bottom: 16px; flex-wrap: wrap;">
  <div style="display: flex; align-items: center; gap: 6px;">
    <span style="width: 10px; height: 10px; border-radius: 2px; background: #3B82F6; display: inline-block;"></span>
    <span style="font-size: 11px; color: #64748b;">Broadband</span>
  </div>
  <!-- ...item legend lainnya... -->
</div>
```

**Aturan legend:**
- Indikator warna: kotak 10×10px, `border-radius: 2px` untuk bar chart, `border-radius: 50%` untuk line chart
- Label: `font-size: 11px`, `color: #64748b`
- Layout: `display: flex`, `flex-wrap: wrap`, `gap: 16px`
- Posisi: **di atas chart**, sebelum SVG

### 2.5 Pola SVG Chart

**Setiap SVG WAJIB memiliki `viewBox`:**
```html
<svg viewBox="0 0 780 320" xmlns="http://www.w3.org/2000/svg" style="width: 100%; height: auto;">
```

**Pola grid lines:**
```html
<!-- Grid horizontal dengan dash -->
<line x1="50" y1="40" x2="770" y2="40" stroke="#e2e8f0" stroke-width="0.5" stroke-dasharray="3,3"/>
<!-- Garis dasar (tanpa dash) -->
<line x1="50" y1="280" x2="770" y2="280" stroke="#e2e8f0" stroke-width="0.5"/>
```

**Pola bar chart:**
```html
<!-- Bar dengan opacity -->
<rect x="58" y="91" width="40" height="22.5" rx="0" fill="#22C55E" opacity="0.9"/>
```

---

## 3. Aturan Penamaan (Naming Convention)

### 3.1 Kenapa Ini Penting

YAML chart di-render via `dangerouslySetInnerHTML`, yang berarti HTML/CSS di-inject ke DOM global. Jika beberapa card tampil sekaligus di satu halaman, class/ID yang sama akan **BERTABRAKAN** — style dari card A bisa mengubah tampilan card B.

### 3.2 Pola Prefix Wajib

Setiap YAML chart yang menggunakan `<style>` tag atau custom class/ID **WAJIB** menggunakan prefix unik:

```
Format: qc-[nama_singkat]-[nomor_urut]
```

**Contoh:**
```html
<style>
  .qc-rev-bar-001 .bar-label { font-size: 9px; font-weight: 600; }
  .qc-rev-bar-001 .grid-line { stroke: #e2e8f0; stroke-width: 0.5; }
</style>

<div class="qc-rev-bar-001">
  <!-- Chart content -->
</div>
```

**Aturan:**
- Prefix `qc-` = "YAML Chart" (identifikasi bahwa ini CSS dari YAML card)
- `[nama_singkat]` = 2-4 karakter deskriptif (e.g. `rev`, `sub`, `var`, `geo`)
- `[nomor_urut]` = 3 digit urut (e.g. `001`, `002`)
- **JANGAN** pakai class generic tanpa prefix (e.g. `.card`, `.label`, `.bar`)
- **JANGAN** pakai ID tanpa prefix (e.g. `#chart`, `#gradient-1`)

### 3.3 Prefix untuk SVG `<defs>` (Gradient, ClipPath, dll.)

SVG `<defs>` ID juga harus unik:

```html
<svg>
  <defs>
    <!-- ✅ BENAR: prefix unik -->
    <linearGradient id="qc-rev-001-grad-blue">...</linearGradient>
    
    <!-- ❌ SALAH: ID generic yang akan tabrakan -->
    <linearGradient id="grad-blue">...</linearGradient>
  </defs>
</svg>
```

---

## 4. Aturan Khusus Mode Data Mart

### 4.1 Query Catalog — Wajib Terdaftar

`data_query.id` **WAJIB** mereferensi query yang sudah terdaftar di **Query Catalog** project. Tidak boleh mengarang ID query sendiri.

```yaml
# ✅ BENAR — ID terdaftar di Query Catalog
data_query:
  id: "revenue_monthly_total"

# ❌ SALAH — ID tidak ada di catalog
data_query:
  id: "my_custom_query_123"
```

### 4.2 Alur Eksekusi Data Mart

Pahami bahwa rendering YAML chart mode data mart **BUKAN proses satu langkah**:

```
┌─────────────┐     ┌──────────────┐     ┌────────────────────┐     ┌───────────────┐
│ YAML File   │────→│ data_query   │────→│ Computation Layer  │────→│ Template Fill │
│ (template)  │     │ resolver     │     │ (fetch + process)  │     │ (inject HTML) │
└─────────────┘     └──────────────┘     └────────────────────┘     └───────────────┘
     Step 1              Step 2                  Step 3                   Step 4
  Parse YAML         Cari query_id          Execute query,           Isi placeholder
  + sanitize         di catalog             transform data           di content_html
```

**Step-by-step:**
1. **Parse YAML** — `js-yaml` parse, DOMPurify sanitize `content_html`
2. **Resolve query** — Sistem mencari `data_query.id` di Query Catalog
3. **Execute & compute** — Backend menjalankan query, computation layer memproses hasilnya
4. **Fill template** — Placeholder `{{...}}` di `content_html` diganti dengan data aktual

### 4.3 Larangan Eksplisit Mode Data Mart

| ❌ DILARANG | ✅ YANG BENAR |
|---|---|
| Taruh SQL mentah di YAML | Referensi `data_query.id` ke Query Catalog |
| Taruh connection string / credential | Query dieksekusi di server, YAML hanya terima hasil |
| Hardcode data yang seharusnya dinamis | Gunakan placeholder `{{variable}}` di template |
| Buat endpoint API baru di YAML | Gunakan query_id yang sudah terdaftar |
| Mengarang `data_query.id` sembarangan | Cek Query Catalog dulu, request tambahan kalau belum ada |

---

## 5. Contoh Lengkap (Few-shot Examples)

### 5.1 Contoh Mode Dummy — Donut Chart (Revenue Composition)

```yaml
# ─────────────────────────────────────────────
# Revenue Composition — Donut Chart
# Mode: Dummy/Hardcoded data
# Prefix: qc-comp-001
# ─────────────────────────────────────────────

title: "Revenue Composition — Q3 2025"

content_html: |
  <div class="qc-comp-001" style="font-family: 'Inter', 'Segoe UI', system-ui, sans-serif;">
    <style>
      .qc-comp-001 .subtitle { font-size: 12px; color: #94a3b8; margin: 0 0 12px 0; }
      .qc-comp-001 .legend { display: flex; gap: 16px; margin-bottom: 16px; flex-wrap: wrap; }
      .qc-comp-001 .legend-item { display: flex; align-items: center; gap: 6px; }
      .qc-comp-001 .legend-dot { width: 10px; height: 10px; border-radius: 50%; display: inline-block; }
      .qc-comp-001 .legend-label { font-size: 11px; color: #64748b; }
      .qc-comp-001 .center-label { font-size: 11px; font-weight: 700; fill: #334155; }
      .qc-comp-001 .center-value { font-size: 18px; font-weight: 800; fill: #0f172a; }
      .qc-comp-001 .pct-label { font-size: 9px; font-weight: 600; }
    </style>

    <p class="subtitle">Revenue breakdown by product category (dummy data)</p>

    <!-- Legend -->
    <div class="legend">
      <div class="legend-item">
        <span class="legend-dot" style="background: #3B82F6;"></span>
        <span class="legend-label">Broadband: 42.5 Bn (38.2%)</span>
      </div>
      <div class="legend-item">
        <span class="legend-dot" style="background: #A78BFA;"></span>
        <span class="legend-label">Digital: 22.1 Bn (19.9%)</span>
      </div>
      <div class="legend-item">
        <span class="legend-dot" style="background: #F59E0B;"></span>
        <span class="legend-label">IR: 14.8 Bn (13.3%)</span>
      </div>
      <div class="legend-item">
        <span class="legend-dot" style="background: #06B6D4;"></span>
        <span class="legend-label">Voice: 18.2 Bn (16.4%)</span>
      </div>
      <div class="legend-item">
        <span class="legend-dot" style="background: #22C55E;"></span>
        <span class="legend-label">SMS: 7.6 Bn (6.8%)</span>
      </div>
      <div class="legend-item">
        <span class="legend-dot" style="background: #6B7280;"></span>
        <span class="legend-label">Others: 6.0 Bn (5.4%)</span>
      </div>
    </div>

    <!-- Donut SVG -->
    <svg viewBox="0 0 300 300" xmlns="http://www.w3.org/2000/svg" style="width: 100%; max-width: 280px; height: auto; margin: 0 auto; display: block;">
      <!-- Donut segments (stroke-dasharray trick) -->
      <!-- Total circumference = 2 * PI * 90 ≈ 565.49 -->
      
      <!-- Broadband 38.2% = 216.0 -->
      <circle cx="150" cy="150" r="90" fill="none" stroke="#3B82F6" stroke-width="36"
              stroke-dasharray="216.0 349.49" stroke-dashoffset="141.37" opacity="0.9"/>
      <!-- Digital 19.9% = 112.5 -->
      <circle cx="150" cy="150" r="90" fill="none" stroke="#A78BFA" stroke-width="36"
              stroke-dasharray="112.5 452.99" stroke-dashoffset="-74.63" opacity="0.9"/>
      <!-- IR 13.3% = 75.2 -->
      <circle cx="150" cy="150" r="90" fill="none" stroke="#F59E0B" stroke-width="36"
              stroke-dasharray="75.2 490.29" stroke-dashoffset="-187.13" opacity="0.9"/>
      <!-- Voice 16.4% = 92.7 -->
      <circle cx="150" cy="150" r="90" fill="none" stroke="#06B6D4" stroke-width="36"
              stroke-dasharray="92.7 472.79" stroke-dashoffset="-262.33" opacity="0.9"/>
      <!-- SMS 6.8% = 38.5 -->
      <circle cx="150" cy="150" r="90" fill="none" stroke="#22C55E" stroke-width="36"
              stroke-dasharray="38.5 526.99" stroke-dashoffset="-355.03" opacity="0.9"/>
      <!-- Others 5.4% = 30.5 -->
      <circle cx="150" cy="150" r="90" fill="none" stroke="#6B7280" stroke-width="36"
              stroke-dasharray="30.5 534.99" stroke-dashoffset="-393.53" opacity="0.9"/>

      <!-- Center text -->
      <text x="150" y="143" text-anchor="middle" class="center-label">TOTAL</text>
      <text x="150" y="167" text-anchor="middle" class="center-value">111.2 Bn</text>
    </svg>
  </div>
```

### 5.2 Contoh Mode Data Mart — Referensi ke Query ID

```yaml
# ─────────────────────────────────────────────
# Revenue Monthly Total — Data Mart Mode
# Mode: Dynamic data via Query Catalog
# Prefix: qc-revmt-002
# ─────────────────────────────────────────────

title: "Revenue — Monthly Total (Live)"

data_query:
  id: "revenue_monthly_total"
  params:
    year: 2025
    grain: "Monthly"
    category: "All"

content_html: |
  <div class="qc-revmt-002" style="font-family: 'Inter', 'Segoe UI', system-ui, sans-serif;">
    <style>
      .qc-revmt-002 .subtitle { font-size: 12px; color: #94a3b8; margin: 0 0 12px 0; }
      .qc-revmt-002 .legend { display: flex; gap: 16px; margin-bottom: 16px; flex-wrap: wrap; }
      .qc-revmt-002 .legend-item { display: flex; align-items: center; gap: 6px; }
      .qc-revmt-002 .legend-dot { width: 10px; height: 10px; border-radius: 2px; display: inline-block; }
      .qc-revmt-002 .legend-label { font-size: 11px; color: #64748b; }
    </style>

    <p class="subtitle">
      Stacked bar chart — data from query <code style="font-size: 11px; padding: 1px 4px; border-radius: 4px; background: rgba(59,130,246,0.08);">revenue_monthly_total</code>
    </p>

    <!-- Legend -->
    <div class="legend">
      <div class="legend-item">
        <span class="legend-dot" style="background: #3B82F6;"></span>
        <span class="legend-label">Broadband</span>
      </div>
      <div class="legend-item">
        <span class="legend-dot" style="background: #A78BFA;"></span>
        <span class="legend-label">Digital</span>
      </div>
      <div class="legend-item">
        <span class="legend-dot" style="background: #06B6D4;"></span>
        <span class="legend-label">Voice</span>
      </div>
      <div class="legend-item">
        <span class="legend-dot" style="background: #22C55E;"></span>
        <span class="legend-label">SMS</span>
      </div>
    </div>

    <!-- Chart SVG — TEMPLATE: bars akan diisi oleh computation layer -->
    <svg viewBox="0 0 780 320" xmlns="http://www.w3.org/2000/svg" style="width: 100%; height: auto;">
      <!-- Grid lines -->
      <line x1="50" y1="40" x2="770" y2="40" stroke="#e2e8f0" stroke-width="0.5" stroke-dasharray="3,3"/>
      <line x1="50" y1="100" x2="770" y2="100" stroke="#e2e8f0" stroke-width="0.5" stroke-dasharray="3,3"/>
      <line x1="50" y1="160" x2="770" y2="160" stroke="#e2e8f0" stroke-width="0.5" stroke-dasharray="3,3"/>
      <line x1="50" y1="220" x2="770" y2="220" stroke="#e2e8f0" stroke-width="0.5" stroke-dasharray="3,3"/>
      <line x1="50" y1="280" x2="770" y2="280" stroke="#e2e8f0" stroke-width="0.5"/>

      <!-- Y-axis labels (akan diisi oleh computation layer) -->
      <text x="45" y="44" text-anchor="end" font-size="10" fill="#94a3b8">{{y_max}}</text>
      <text x="45" y="284" text-anchor="end" font-size="10" fill="#94a3b8">0</text>

      <!-- Bars — placeholder, diisi oleh computation layer -->
      {{chart_bars}}

      <!-- X-axis labels — placeholder -->
      {{chart_x_labels}}
    </svg>
  </div>
```

---

## 6. Checklist Validasi

Sebelum YAML dianggap valid dan siap disimpan/dirender, jawab semua pertanyaan berikut **"Ya"**:

### 6.1 Checklist Struktur

| # | Pertanyaan | ✅/❌ |
|---|---|---|
| 1 | Apakah field `title` ada dan berisi string non-empty? | |
| 2 | Apakah field `content_html` ada dan berisi string HTML non-empty? | |
| 3 | Apakah `content_html` menggunakan literal block scalar (`\|`)? | |
| 4 | Apakah indentasi menggunakan 2 spasi (bukan tab)? | |
| 5 | Apakah YAML valid (bisa di-parse tanpa error oleh js-yaml)? | |

### 6.2 Checklist Keamanan

| # | Pertanyaan | ✅/❌ |
|---|---|---|
| 6 | Apakah TIDAK ada tag `<script>` di `content_html`? | |
| 7 | Apakah TIDAK ada event handler (`onclick`, `onerror`, dll.)? | |
| 8 | Apakah TIDAK ada kredensial, connection string, atau SQL mentah? | |
| 9 | Apakah TIDAK ada `<iframe>`, `<object>`, atau `<embed>`? | |

### 6.3 Checklist Visual

| # | Pertanyaan | ✅/❌ |
|---|---|---|
| 10 | Apakah warna yang dipakai sesuai palet resmi (Bagian 2.1)? | |
| 11 | Apakah font menggunakan `'Inter', 'Segoe UI', system-ui, sans-serif`? | |
| 12 | Apakah SVG memiliki atribut `viewBox`? | |
| 13 | Apakah legend ada dan mengikuti pola standar (Bagian 2.4)? | |
| 14 | Apakah label angka menggunakan format yang sesuai (k, M, Bn)? | |

### 6.4 Checklist Naming

| # | Pertanyaan | ✅/❌ |
|---|---|---|
| 15 | Apakah semua CSS class menggunakan prefix `qc-[nama]-[nomor]`? | |
| 16 | Apakah SVG `<defs>` ID menggunakan prefix unik? | |
| 17 | Apakah TIDAK ada class/ID generic tanpa prefix (`.card`, `#chart`)? | |

### 6.5 Checklist Mode Data Mart (jika applicable)

| # | Pertanyaan | ✅/❌ |
|---|---|---|
| 18 | Apakah `data_query.id` sudah terdaftar di Query Catalog? | |
| 19 | Apakah placeholder menggunakan format `{{variable_name}}`? | |
| 20 | Apakah TIDAK ada SQL mentah atau endpoint API di dalam YAML? | |

---

## Catatan Akhir

> **Dokumen ini SELARAS dengan pola yang sudah ada di project Dashboard_Analysis1.**
> Semua aturan diambil dari temuan aktual di `PROJECT_ANALYSIS.md`, bukan diciptakan dari nol.
>
> Satu-satunya **usulan perbaikan** (belum dijadikan aturan baku):
> - 💡 **Dark mode di YAML**: Disarankan YAML baru menggunakan CSS variables (`var(--dt-text-4)` dll.) alih-alih warna hardcoded, agar kompatibel dark mode. Ini menunggu persetujuan.
>
> File ini akan digunakan sebagai acuan/system prompt untuk AI Agent di fitur "Ask AI" (Fase 8).

---

> *Dibuat: 10 September 2026 | Berdasarkan: PROJECT_ANALYSIS.md*
