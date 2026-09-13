Buatkan mockup UI lengkap untuk aplikasi web dashboard analytics bergaya modern SaaS (terinspirasi Looker Studio, Power BI, dan Metabase), mencakup seluruh alur dari login sampai menambahkan chart ke dashboard, LENGKAP dengan variasi state (hover, loading, error, empty, konfirmasi).

GAYA VISUAL:
Clean, minimalis, banyak whitespace, sudut membulat (rounded corners ~12px untuk card, ~8px untuk tombol/input). Palet warna netral (putih/abu muda #f9fafb) dengan aksen warna indigo sebagai warna utama (primary: #6366f1), plus warna pendukung emerald (#10b981), amber (#f59e0b), rose (#f43f5e), dan sky (#0ea5e9) untuk elemen chart. Font sans-serif modern (Inter atau sejenis). Shadow tipis/subtle pada card. Ikon bergaya outline/line-based yang konsisten di semua layar.

---

## ALUR LAYAR (buat semua frame di bawah ini berurutan dalam satu file, diberi label nomor)

**1. Login Screen**
- Form login di tengah: input email, input password, tombol "Login" (indigo solid).
- Logo/nama aplikasi di atas form.
- Tanpa tombol Sign Up.

**2. Page Manager (Halaman Utama)**
- Sidebar kiri (~240px): daftar page user (contoh: "Sales Overview", "Marketing Report", "Product Analytics") dengan ikon kecil per item.
- Tombol "+ New Page" di atas sidebar.
- Item page saat di-hover: background abu muda muncul + ikon titik-tiga (menu Rename/Delete) muncul di kanan.
- Header atas kanan: avatar user + nama, dropdown berisi tombol Logout.
- Area kanan: judul page aktif + grid canvas.

**2b. Page Manager — Empty State**
- Varian tampilan saat page baru dibuat dan belum ada chart: ilustrasi sederhana di tengah canvas + teks "Belum ada chart di sini" + tombol besar "+ Add Your First Chart".

**2c. Page Manager — Loading State**
- Varian skeleton loading: sidebar menampilkan baris-baris abu-abu placeholder (shimmer effect), canvas menampilkan kotak-kotak placeholder abu-abu, bukan layar kosong.

**3. Canvas Berisi Chart (Contoh Terisi)**
- Grid layout berisi 4-5 chart card: bar chart, line chart, donut chart, dan 1 card custom teks/summary.
- Tiap card: header kecil (judul + ikon titik-tiga untuk Edit/Delete/Duplicate saat di-hover), shadow naik & border indigo tipis muncul saat card di-hover.
- Tombol mengambang "+ Add Chart" di pojok kanan bawah canvas.
- Indikator kecil "Saved" di pojok canvas (autosave indicator).

**3b. Chart Card — Interactive States**
- Tampilkan 1 donut chart dalam 3 kondisi berdampingan: (a) normal, (b) hover pada salah satu slice (slice menebal/highlight + tooltip kecil muncul menampilkan label & persentase), (c) legend di-hover (background abu muda pada baris legend tersebut).
- Tampilkan 1 chart dalam kondisi error: ikon warning + teks "Gagal memuat data" + tombol kecil "Coba Lagi" di dalam card.
- Tampilkan 1 chart dalam kondisi loading: skeleton berbentuk placeholder chart dengan efek shimmer.

**4. Modal "Add Chart" — Step 1: Pilih Tipe**
- Modal tengah dengan overlay gelap. Judul "Add Chart".
- 4 kartu sejajar: "Bar Chart", "Line Chart", "Donut Chart", "Custom (YAML)" — masing-masing dengan ikon representatif.
- Tampilkan salah satu kartu dalam kondisi hover (border indigo, shadow naik, ikon scale-up sedikit).
- Progress indicator kecil di atas modal (dot 1-2-3, dot pertama aktif).

**5. Modal "Add Chart" — Step 2A: Konfigurasi Cepat**
- Judul "Configure Bar Chart" + tombol "< Back".
- Form: input "Chart Title", dropdown "Data Source", dropdown "Dimension" & "Metric".
- Tampilkan 1 varian input dalam kondisi error validasi: border merah + teks kecil merah di bawah input "Judul chart wajib diisi".
- Tombol "Preview" di bawah.

**6. Modal "Add Chart" — Step 2B: Custom YAML**
- Judul "Custom Chart (YAML)" + tombol "< Back".
- Tab "Upload File" dan "Write YAML".
- Tab Upload: area drag-and-drop dengan ikon upload, teks "Click to upload or drag & drop".
- Tab Write YAML: code editor gelap dengan syntax highlighting.
- Tampilkan varian error: banner merah muda di bawah editor dengan ikon warning, judul "Invalid YAML Configuration" + detail spesifik error.

**7. Modal "Add Chart" — Step 3: Preview & Publish**
- Judul "Preview". Area preview besar menampilkan chart hasil konfigurasi.
- Tombol "Cancel" (outline) dan "Publish" (indigo solid) — tampilkan juga varian tombol "Publish" dalam kondisi loading (spinner kecil menggantikan teks).

**8. Modal "Add Chart" — Tab Ask AI**
- Text input besar bergaya chat, placeholder "Describe the chart you want, e.g. 'Show revenue by region as a bar chart'", tombol kirim di ujung kanan.
- Varian "AI sedang memproses": animasi typing dots ("AI is thinking...").
- Varian hasil sukses: preview chart + tombol "Regenerate" dan "Add to Page".
- Varian AI tidak menemukan data: pesan ramah "Maaf, saya tidak menemukan data yang sesuai. Data yang tersedia: ..." dengan ikon info.

**9. Dialog Konfirmasi Hapus**
- Modal kecil di tengah (lebih kecil dari modal Add Chart): ikon warning, judul "Hapus Page 'Sales Overview'?", teks "Semua chart di dalamnya akan ikut terhapus.", tombol "Batal" (outline) dan "Hapus" (merah/rose solid).

**10. Toast Notifications (kumpulkan 4 varian dalam 1 frame)**
- Toast Success (hijau/emerald): "Chart berhasil dipublish", muncul di pojok kanan atas, dengan tombol close (×).
- Toast Error (merah/rose): "Gagal menyimpan perubahan".
- Toast Info (indigo/biru): "Data sedang disinkronkan".
- Toast Warning (amber): "Koneksi lambat terdeteksi".

---

Susun semua frame di atas berurutan secara horizontal dalam satu file Figma dengan label nama frame sesuai nomor & judul di atas, sehingga terlihat sebagai satu user journey utuh dari login sampai chart berhasil dipublish, lengkap dengan variasi state pentingnya.
