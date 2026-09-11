# Tambahan — Unified Chart Type Picker (Bar / Line / Custom YAML)

> Prompt ini MENGGANTIKAN desain modal "+ Add Chart" dari Fase 3 & 4 sebelumnya (yang tadinya 2 tab terpisah: "Existing Chart" dan "Import YAML"). Sekarang digabung jadi satu alur pemilihan tipe yang sejajar, karena semua tipe chart pada akhirnya disimpan dalam skema YAML yang SAMA di backend — supaya cuma ada SATU pipeline render, bukan dua sistem terpisah yang harus dirawat dobel.

```
Saya ingin merevisi modal "+ Add Chart" jadi alur 3 langkah yang unified, menggantikan desain tab lama.

FUNCTIONAL REQUIREMENTS:

STEP 1 — Pilih Tipe Chart
1. Tampilkan pilihan dalam bentuk grid kartu/ikon yang SEJAJAR (tidak ada yang terasa "utama" vs "sampingan"): 
   - Bar Chart
   - Line Chart
   - Donut Chart
   - Custom (YAML)
2. Klik salah satu lanjut ke Step 2 sesuai tipe yang dipilih.

STEP 2A — Konfigurasi Cepat (untuk Bar/Line/Donut)
1. Form input: Judul chart (text), Sumber data (dropdown: pilih dari Query Catalog yang tersedia, ATAU opsi "Gunakan Data Dummy" kalau user belum siap pakai data mart).
2. Kalau pilih sumber data dari Query Catalog: tampilkan dropdown Dimension & Metric berdasarkan `response_fields` yang terdaftar di query tersebut.
3. Kalau pilih "Data Dummy": tampilkan mini form untuk input manual 2-6 baris data contoh (label + value), supaya user bisa lihat preview tanpa perlu nulis YAML manual.
4. Setelah form diisi, SISTEM YANG GENERATE YAML secara otomatis di balik layar (pakai Template Engine dari fase sebelumnya) — user tidak perlu melihat/menulis YAML mentah di jalur ini.

STEP 2B — Custom YAML (untuk pilihan "Custom")
1. Tampilkan editor teks (textarea dengan syntax highlighting kalau memungkinkan) ATAU tombol upload file .yaml/.yml — sediakan dua-duanya sebagai opsi.
2. Validasi skema real-time saat user mengetik/upload (reuse validator yang sudah dibuat sebelumnya) — tampilkan error inline kalau ada bagian yang tidak sesuai skema.

STEP 3 — Preview & Publish (SAMA untuk semua jalur, baik dari 2A maupun 2B)
1. Tampilkan preview chart hasil akhir (render sungguhan, bukan mockup) sebelum disimpan.
2. Ada 2 tombol: "Publish" (simpan & tambahkan ke canvas page aktif) dan "Batal" (kembali/tutup modal tanpa menyimpan).
3. Setelah "Publish" diklik: chart tersimpan ke tabel `charts` (reuse struktur dari Fase 2), dengan `config_ref` menunjuk ke YAML yang sudah divalidasi — TIDAK PEDULI apakah YAML itu hasil generate otomatis (dari 2A) atau ditulis manual (dari 2B), keduanya disimpan dengan format & tabel yang SAMA.

TEKNIS:
- Tambahkan kolom `status` di tabel `charts` (enum: 'draft' | 'published') — chart baru dianggap 'draft' sampai user klik tombol Publish di Step 3.
- Buat 1 fungsi generator YAML generic untuk Step 2A (`generateYamlFromQuickConfig(type, title, dataSource, dimension, metric)`), supaya baik Bar/Line/Donut pakai fungsi yang sama, cuma beda parameter `type`/`template`.
- Reuse Template Engine (Fase 7) dan validator skema yang sudah ada — JANGAN buat sistem render terpisah untuk jalur 2A vs 2B.

BATASAN:
- Chart dengan status 'draft' TIDAK tampil untuk role 'viewer' (hanya admin/editor yang bisa lihat draft) — chart baru terlihat semua orang setelah statusnya 'published'. (Kalau logic role/permission ini belum ada, buat versi paling sederhana dulu: draft = hanya terlihat oleh pembuatnya, published = terlihat oleh semua user yang punya akses ke page tersebut.)
- Step 1 harus mudah ditambah tipe baru ke depannya (misal nanti nambah "Table" atau "Scorecard") — desain komponennya supaya scalable, bukan hardcode 4 pilihan yang kaku.
- Kalau ada ambiguitas soal bagaimana "Data Dummy" di Step 2A disimpan (apakah ikut tersimpan permanen di YAML atau cuma sementara untuk preview), tanyakan dulu sebelum implementasi.
```

## Ringkasan kenapa desain ini optimal

1. **Satu pipeline render** — Bar/Line/Donut/Custom semuanya jadi YAML dengan skema sama, dirender lewat mekanisme yang sama. Gak ada percabangan sistem.
2. **User awam gak perlu nulis YAML** — cukup pakai form Step 2A, YAML digenerate otomatis di belakang layar.
3. **User advanced tetap bisa full-control** — lewat jalur Custom (YAML) kalau butuh visual di luar 3 tipe standar.
4. **Draft/Publish** mencegah chart setengah jadi keburu kelihatan orang lain, sekaligus jadi fondasi natural untuk role viewer/editor yang sudah kamu seed dari Fase 0.
