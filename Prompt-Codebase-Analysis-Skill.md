# Prompt Awal — Codebase Analysis & YAML Generation Skill

> Jalankan Prompt A dulu, baru Prompt B. Prompt A wajib duluan karena Prompt B akan mengutip temuan dari Prompt A — jangan dibalik urutannya.

---

## PROMPT A — Analisa & Dokumentasi Sistem yang Sudah Ada

```
Sebelum kita lanjut membangun fitur baru, saya ingin kamu MEMPELAJARI DULU struktur project ini secara menyeluruh — JANGAN ubah kode apapun di langkah ini, murni analisa & dokumentasi.

YANG PERLU DIPELAJARI & DIDOKUMENTASIKAN:

1. **Pola Chart yang Sudah Ada**
   - Scan semua file di [sebutkan path, misal resources/js/app/components/charts]
   - Untuk tiap chart (contoh: MonthlyTotalChart, RevenueCompositionPie, dll), catat: library apa yang dipakai (Recharts?), bagaimana data di-fetch/diterima (props? hook? langsung import dari env?), pola styling yang konsisten dipakai (warna, spacing, font).

2. **Sumber Data Saat Ini**
   - Jelaskan bagaimana data sekarang masuk ke chart — kamu sebut datanya "langsung nyambung ke .env", jadi tolong telusuri: apakah data di-hardcode di file config, atau .env cuma nyimpan koneksi (host/credential) yang lalu dipakai query ke database?
   - Dokumentasikan alur lengkapnya: .env → (lewat apa) → sampai ke komponen chart.

3. **Struktur Database / Data Mart**
   - List semua tabel yang relevan untuk reporting/chart (bukan tabel auth/session dll yang tidak relevan).
   - Untuk tiap tabel penting, catat: nama kolom, tipe data, relasi ke tabel lain (kalau ada foreign key).
   - Kalau ada "data mart" terpisah (tabel/view yang sudah diagregasi khusus untuk reporting), tandai secara khusus dan jelaskan bedanya dengan tabel transaksional biasa.

4. **Endpoint/API yang Sudah Ada (kalau ada)**
   - List endpoint backend yang menyediakan data untuk chart (path, method, parameter, contoh response).
   - Kalau ternyata BELUM ada endpoint API (chart langsung query database di server-side render / langsung baca .env tanpa lewat API terpisah), jelaskan itu juga apa adanya.

5. **Konvensi Kode & Styling yang Konsisten**
   - Catat konvensi penamaan file/komponen, penggunaan Tailwind vs inline style, palet warna yang berulang dipakai di berbagai chart.

OUTPUT YANG DIHARAPKAN:
Buatkan 1 file dokumentasi (`PROJECT_ANALYSIS.md` atau format sejenis) berisi rangkuman ke-5 poin di atas dengan bahasa yang jelas, termasuk contoh kode singkat (cuplikan) untuk tiap temuan penting. Jangan lakukan perubahan kode apapun — murni dokumentasi.

Kalau ada bagian yang tidak jelas/ambigu saat kamu telusuri kode (misal ada 2 pola berbeda dipakai di file yang beda), catat sebagai "temuan inkonsisten" dan tanyakan ke saya mana yang harus dijadikan standar ke depan.
```

---

## PROMPT B — Buat Skill/Style Guide untuk YAML Chart Generation

```
Berdasarkan hasil analisa di PROJECT_ANALYSIS.md yang sudah kamu buat sebelumnya, sekarang buatkan sebuah dokumen "Skill Guide" yang akan jadi ACUAN TETAP setiap kali ada permintaan (dari saya, dari AI Agent "Ask AI" nantinya, atau siapapun) untuk generate YAML chart — supaya hasilnya SELALU KONSISTEN, baik itu:
   (a) YAML dengan data dummy/hardcoded, ATAUPUN
   (b) YAML yang sudah nyambung ke data mart lewat query.

ISI SKILL GUIDE HARUS MENCAKUP:

1. **Skema YAML Baku** (mengacu skema yang sudah ditetapkan sebelumnya: `title` + `content_html`, aturan indentasi, larangan `<script>`/event handler, styling inline/Tailwind, SVG wajib `viewBox`)
   - Tambahkan varian skema untuk mode data mart: field `data_query` (id, params) seperti yang sudah didesain di Fase 6 planning sebelumnya.
   - Jelaskan dengan tegas: field `content_html` WAJIB ada di kedua mode — untuk mode dummy isinya statis, untuk mode data mart isinya TEMPLATE dengan placeholder yang diisi computation layer (bukan lagi ditulis manual).

2. **Aturan Konsistensi Visual** (diambil dari temuan PROJECT_ANALYSIS.md)
   - Palet warna resmi yang harus dipakai (harus sama dengan yang sudah dipakai di chart existing project ini, bukan warna baru sembarangan).
   - Font-family, ukuran heading/subtitle, spacing/padding standar.
   - Pola legend yang konsisten (posisi, format "label: value (persentase)").

3. **Aturan Penamaan (Naming Convention) untuk Hindari Konflik CSS**
   - Setiap YAML/HTML custom WAJIB pakai prefix class/id unik (contoh pola: `qc-[nama_singkat]-[nomor_urut]`) — jelaskan kenapa ini penting (karena `dangerouslySetInnerHTML` inject ke DOM global, bisa tabrakan kalau banyak card tampil sekaligus di satu page).

4. **Aturan Khusus Mode Data Mart**
   - `data_query.id` WAJIB terdaftar di Query Catalog — TIDAK BOLEH mengarang endpoint/query sendiri.
   - Jelaskan alur: data_query → fetch → computation layer → isi ke template — supaya siapapun/apapun yang generate YAml paham ini BUKAN proses satu langkah.
   - Larangan eksplisit: JANGAN PERNAH taruh kredensial, connection string, atau query SQL mentah di dalam YAML.

5. **Contoh Lengkap (Few-shot Examples)**
   - Sertakan minimal 2 contoh YAML lengkap: satu mode dummy (donut chart), satu mode data mart (referensi ke query_id), diambil/disesuaikan dari file YAML yang sudah pernah dibuat sebelumnya di project ini.

6. **Checklist Validasi Sebelum YAML Dianggap Valid**
   - Buat daftar checklist singkat (boleh dalam bentuk pertanyaan ya/tidak) yang bisa dipakai untuk mengecek cepat apakah sebuah YAML sudah sesuai standar sebelum disimpan/dirender.

OUTPUT:
Simpan sebagai file `YAML_CHART_SKILL.md` di root project (atau folder dokumentasi project ini). File ini nantinya akan saya jadikan acuan/system prompt setiap kali minta generate YAML baru — baik oleh saya manual, maupun nanti oleh AI Agent di fitur "Ask AI".

BATASAN:
- Jangan buat aturan baru yang bertentangan dengan apa yang sudah ditemukan di PROJECT_ANALYSIS.md — skill ini harus SELARAS dengan pola yang sudah ada di project, bukan menciptakan standar baru dari nol.
- Kalau menemukan pola existing yang kurang ideal (misal warna tidak konsisten di beberapa chart lama), boleh usulkan standar baru, tapi TANDAI JELAS sebagai "usulan perbaikan" dan tanyakan persetujuan saya dulu sebelum dijadikan aturan baku.
```

---

## Kenapa urutannya harus begini

Poin 1 (mau skill biar konsisten) itu **hasil**, sedangkan poin 2 (belajar dari project existing) itu **bahan bakunya**. Kalau skill dibuat duluan tanpa agent paham pola project kamu, dia bakal ngarang standar sendiri yang belum tentu nyambung sama chart-chart lama yang sudah ada (styling beda, konvensi database beda, dst) — nanti malah bikin inkonsistensi baru, bukan nyelesain masalah.

Setelah dua prompt ini selesai dijalankan, kamu akan punya:
- `PROJECT_ANALYSIS.md` — potret akurat kondisi project kamu sekarang
- `YAML_CHART_SKILL.md` — aturan baku yang dipakai konsisten ke depannya, baik oleh kamu manual maupun nanti oleh AI Agent

File `YAML_CHART_SKILL.md` inilah yang nanti di Fase 8 (AI Agent Integration) dikirim sebagai bagian dari system prompt ke Claude API — supaya AI selalu menghasilkan YAML yang konsisten dengan project kamu, bukan menebak-nebak dari nol tiap kali dipanggil.
