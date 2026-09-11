# Planning: Page Builder + AI Chart Agent + Custom YAML Chart

## 1. Gambaran Umum Alur

```
User buka "Page Manager"
   ├─ Buat Page baru (kasih nama page)
   │    ├─ Opsi A: Pilih chart existing (dari komponen JSX yang sudah ada)
   │    ├─ Opsi B: Import YAML (custom HTML/SVG, statis atau data-bound)
   │    └─ Opsi C: Prompt ke AI Agent → AI generate YAML sesuai skill/skema
   └─ Page tersimpan, bisa ditambah page lain, chart bisa disusun ulang (layout)
```

Tiga jalur pembuatan chart (existing / import YAML / AI prompt) semuanya **bermuara ke satu format YAML yang sama** di backend — supaya sistem render & penyimpanan tetap satu jalur, gak triple maintenance.

---

## 2. UI: Page Manager (Layar Utama)

### Struktur Layar
- **Sidebar kiri**: daftar page (bisa reorder drag & drop), tombol `+ New Page`
- **Header page**: nama page (editable inline), tombol `Rename`, `Delete Page`
- **Canvas utama**: grid layout tempat chart-chart di page itu ditampilkan (drag-resize card)
- **Tombol `+ Add Chart`** di canvas, membuka modal dengan 3 tab:
  1. **Existing Chart** — daftar komponen chart JSX yang sudah ada (searchable, dengan preview thumbnail)
  2. **Import YAML** — file upload area (seperti yang sudah ada sekarang)
  3. **Ask AI** — text input untuk prompt natural language

### Data yang perlu disimpan per Page
```
Page {
  id, name, order, 
  charts: [
    { id, type: "existing" | "yaml_static" | "yaml_ai" | "yaml_data_bound",
      position: {x, y, w, h},
      config_ref: <yaml_id atau component_key>
    }
  ]
}
```

---

## 3. AI Agent — "Skill Framework"

Ini bagian yang kamu maksud "ada skill di AI agentnya semacam framework". Konsepnya: AI **tidak boleh generate bebas** — dia dibatasi oleh sebuah **system prompt/skill definition** yang berisi 3 hal wajib:

### a. Skema YAML yang harus diikuti
Sama seperti aturan `[SCHEMA & SYSTEM INSTRUCTIONS]` yang sudah kamu punya sekarang (title, content_html, aturan indentasi, larangan script, dsb) — ini tetap berlaku sebagai lapisan dasar.

### b. Query Catalog (daftar query yang boleh dipanggil AI)
AI **tidak boleh menulis query sendiri**. Dia hanya boleh memilih dari daftar query yang sudah terdaftar & terdokumentasi di backend. Contoh katalog:

```yaml
# query-catalog.yaml (didefinisikan sekali oleh developer, jadi referensi AI)
queries:
  - id: "sales_by_category"
    endpoint: "/api/reports/category-summary"
    description: "Total penjualan per kategori produk"
    params:
      - name: period
        type: enum
        options: [daily, weekly, monthly]
      - name: year
        type: number
    response_fields:
      dimension: "category"
      metric: "quantity"

  - id: "revenue_by_region"
    endpoint: "/api/reports/region-revenue"
    description: "Total revenue per region"
    params:
      - name: year
        type: number
    response_fields:
      dimension: "region"
      metric: "revenue"
```

AI cuma boleh mengeluarkan `data_query.id` yang ada di katalog ini — bukan bikin endpoint atau query baru sendiri. Ini pagar keamanan paling penting.

### c. Template Registry (daftar jenis visual yang boleh dipakai)
```yaml
templates:
  - id: "donut_chart"
    description: "Chart donat untuk perbandingan proporsi antar kategori"
  - id: "bar_chart"
    description: "Chart batang untuk perbandingan nilai antar kategori/waktu"
  - id: "line_chart"
    description: "Chart garis untuk tren dari waktu ke waktu"
```

### Alur kerja AI Agent
```
User prompt: "Tampilkan revenue per region tahun 2026 dalam bentuk bar chart"
   ↓
AI terima prompt + system prompt berisi Query Catalog + Template Registry
   ↓
AI PILIH (bukan generate bebas):
   - query_id: "revenue_by_region"
   - template_id: "bar_chart"
   - params: { year: 2026 }
   ↓
Sistem validasi: apakah query_id ada di katalog? apakah param sesuai tipe yang diminta?
   ↓
Jika valid → generate YAML final:
```
```yaml
title: "Revenue by Region 2026"
template: "bar_chart"
data_query:
  id: "revenue_by_region"
  params:
    year: 2026
```
```
   ↓
Sistem fetch data dari endpoint asli (bukan AI yang fetch) → computation layer → render
```

**Poin krusial:** AI perannya cuma **"penerjemah bahasa natural → pilihan dari daftar terbatas"**, bukan "penulis kode/query bebas". Ini yang bikin fitur ini aman meski pakai LLM.

---

## 4. Fase Pembangunan (Detail)

| Fase | Deliverable | Kesulitan |
|---|---|---|
| **1. Page Manager UI** | Sidebar page list, create/rename/delete page, canvas kosong dengan grid layout | 5/10 |
| **2. Chart Card System** | Komponen card generic yang bisa nampilin 3 jenis chart (existing/yaml_static/data_bound), drag-resize di canvas, simpan posisi | 6/10 |
| **3. Existing Chart Picker** | Modal tab 1: daftar komponen JSX yang sudah ada + thumbnail preview + search | 4/10 |
| **4. Import YAML (sudah ada, tinggal integrasi ke Page)** | Modal tab 2: upload YAML → jadi chart card baru di page aktif | 2/10 (reuse yang sudah jadi) |
| **5. Query Catalog Definition** | Developer definisikan daftar query yang boleh diakses (YAML/JSON registry), dokumentasi tiap query | 4/10 |
| **6. Data Fetcher + Computation Layer** | Fungsi generic: baca `data_query.id` → fetch endpoint sesuai katalog → hitung nilai visual sesuai `template` | 6/10 |
| **7. Template Engine** | Kerangka HTML/SVG per template (donut/bar/line) dengan placeholder yang diisi computation layer | 5/10 |
| **8. AI Agent Integration (Tab "Ask AI")** | Modal tab 3: input prompt → kirim ke LLM API beserta Query Catalog + Template Registry sebagai context → terima YAML → validasi ketat → render | 7/10 |
| **9. Validasi & Guardrail AI Output** | Cek `query_id` & `template_id` ADA di katalog, cek param sesuai tipe, tolak kalau ada field asing/mencurigakan | 6/10 |
| **10. Keamanan API Key (kalau user bawa API key sendiri)** | Enkripsi API key di database, jangan pernah expose ke frontend, rate limiting pemakaian | 6/10 |

**Overall keseluruhan fitur ini: 7-8/10** — lebih ringan dari skenario "bangun BI tool dari nol" sebelumnya (9-10/10), karena akses data mentah (query ke DB) sudah beres duluan di backend; effort besar sekarang lebih ke **orkestrasi**: page management, computation layer, dan guardrail AI.

---

## 5. Urutan Pengerjaan yang Disarankan

1. **Fase 1-4 dulu** (Page Manager + reuse existing chart & YAML import) — ini murni UI/state management, gak nyentuh AI/data mart sama sekali. Cepat kelihatan progress-nya.
2. **Fase 5-7** (Query Catalog + Computation + Template Engine) — ini fondasi teknis paling penting, harus solid sebelum AI masuk, karena AI Agent nantinya cuma "memilih" dari sini.
3. **Fase 8-9** (AI Agent) — baru masuk setelah katalog & template sudah stabil dan teruji manual (tanpa AI dulu, pastikan sistem jalan kalau developer/tim sendiri yang isi YAML-nya).
4. **Fase 10** (API key & keamanan lanjutan) — paling akhir, sekali AI Agent sudah terbukti jalan dengan aman di skenario sederhana.

**Catatan:** setiap fase di atas sebaiknya jadi **prompt/sesi kerja terpisah** ke coding agent — jangan digabung, karena scope-nya besar dan saling bergantung satu sama lain.
