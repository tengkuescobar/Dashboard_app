# Prompt Siap Kirim — Dari Awal Sampai Akhir Fase

> Kirim SATU PER SATU secara berurutan. Tunggu agent selesai + kamu cek hasilnya dulu sebelum kirim prompt berikutnya. Ganti semua teks dalam kurung siku `[...]` dengan path/detail asli sebelum dikirim.

---

## PROMPT 1 — Analisa Project Lama (Prompt A)

```
Baca file "Prompt-Codebase-Analysis-Skill.md" yang ada di folder [path folder berisi file-file .md, misal C:\xampp\htdocs\Dashboard_United].

Ikuti instruksi di bagian "PROMPT A" pada file tersebut — analisa project lama di folder [path lengkap Dashboard_Analysis1]. JANGAN ubah kode apapun di project lama itu, cukup dokumentasikan sesuai yang diminta di prompt tersebut.

Simpan hasilnya (PROJECT_ANALYSIS.md) di dalam project Dashboard_United, bukan di project lama.

Setelah selesai, laporkan hasilnya ke saya dan TUNGGU konfirmasi saya sebelum melakukan langkah apapun berikutnya.
```

---

## PROMPT 2 — Buat Skill Guide (Prompt B)

> Kirim setelah kamu review PROJECT_ANALYSIS.md dan sudah oke.

```
Terima kasih, PROJECT_ANALYSIS.md sudah saya review dan disetujui.

Sekarang baca bagian "PROMPT B" di file "Prompt-Codebase-Analysis-Skill.md" (folder yang sama), dan jalankan instruksinya untuk membuat file YAML_CHART_SKILL.md — mengacu pada temuan di PROJECT_ANALYSIS.md yang sudah dibuat sebelumnya.

Simpan hasilnya di project Dashboard_United.

Setelah selesai, laporkan hasilnya dan TUNGGU konfirmasi saya sebelum lanjut ke pembangunan fitur apapun.
```

---

## PROMPT 3 — Fase 0: Auth Dasar

> Kirim setelah YAML_CHART_SKILL.md direview dan oke.

```
Terima kasih, YAML_CHART_SKILL.md sudah saya review dan disetujui. Simpan file ini beserta PROJECT_ANALYSIS.md sebagai acuan tetap untuk semua pekerjaan berikutnya di project ini.

Stack project ini: backend Laravel (PHP), frontend React.

SEBELUM mengerjakan Fase 0, tentukan dulu arsitektur komunikasi Laravel-React yang paling tepat untuk project ini:
1. Cek struktur project yang sudah ada (folder resources/js, apakah ada pola Inertia seperti resources/js/Pages, atau murni komponen React yang terpisah dari routing Laravel).
2. Berdasarkan temuan itu, tentukan salah satu:
   - Inertia.js (kalau project sudah/lebih cocok pola ini), ATAU
   - REST API terpisah dengan Laravel Sanctum untuk autentikasi SPA (kalau React berjalan independen dari routing Laravel).
3. Tulis keputusan ini beserta alasannya di PROJECT_ANALYSIS.md (tambahkan sebagai bagian baru), SEBELUM mulai implementasi Fase 0.
4. Laporkan keputusan arsitektur ini ke saya dan TUNGGU konfirmasi saya sebelum lanjut implementasi — karena ini keputusan besar yang akan memengaruhi semua fase berikutnya.

Setelah saya konfirmasi arsitekturnya, baru lanjutkan baca file "Prompt-Per-Fase-Page-Builder.md" di folder yang sama, dan jalankan HANYA bagian "FASE 0 — Auth Dasar (Login + Seeder, Tanpa Create User)" menggunakan arsitektur yang sudah disepakati. Jangan baca atau kerjakan fase lain dulu di file tersebut.

Setelah Fase 0 selesai, laporkan hasilnya ke saya dan TUNGGU konfirmasi sebelum lanjut ke fase berikutnya.
```

---

## PROMPT 4 — Fase 1: Page Manager

> Kirim setelah Fase 0 dicoba manual (coba login pakai user hasil seeder) dan berhasil.

```
Fase 0 sudah saya coba dan berhasil (login jalan normal).

Lanjutkan ke "FASE 1 — Page Manager" di file "Prompt-Per-Fase-Page-Builder.md". Jangan kerjakan fase lain dulu.

Setelah selesai, laporkan hasilnya dan TUNGGU konfirmasi saya.
```

---

## PROMPT 5 — Fase 2: Chart Card System

```
Fase 1 sudah saya coba dan berhasil (bisa buat/rename/hapus/reorder page).

Lanjutkan ke "FASE 2 — Chart Card System (Canvas & Layout Grid)" di file yang sama. Jangan kerjakan fase lain dulu.

Setelah selesai, laporkan hasilnya dan TUNGGU konfirmasi saya.
```

---

## PROMPT 6 — Unified Chart Picker (Menggantikan Fase 3 & 4 Asli)

> PENTING: mulai dari sini, JANGAN pakai Fase 3 dan Fase 4 asli dari file "Prompt-Per-Fase-Page-Builder.md" — sudah digantikan oleh file "Tambahan-Unified-Chart-Picker.md".

```
Fase 2 sudah saya coba dan berhasil (chart card bisa di-drag, resize, posisinya tersimpan).

Sekarang baca file "Tambahan-Unified-Chart-Picker.md" di folder yang sama, dan jalankan seluruh instruksi di dalamnya. File ini MENGGANTIKAN desain Fase 3 dan Fase 4 dari file "Prompt-Per-Fase-Page-Builder.md" — jadi jangan jalankan Fase 3/4 versi asli, langsung pakai desain unified picker ini.

Setelah selesai, laporkan hasilnya dan TUNGGU konfirmasi saya.
```

---

## PROMPT 7 — Fase 5: Query Catalog

> Sebelum kirim ini, siapkan dulu dokumentasi lengkap endpoint backend yang sudah ada (path, parameter, contoh response JSON) — isi di bagian `[SEBUTKAN endpoint...]` pada prompt Fase 5 di file aslinya, atau lampirkan sebagai referensi tambahan di sini.

```
Unified Chart Picker sudah saya coba dan berhasil (bisa pilih Bar/Line/Donut/Custom, preview, dan publish).

Lanjutkan ke "FASE 5 — Query Catalog" di file "Prompt-Per-Fase-Page-Builder.md". 

Berikut dokumentasi endpoint backend yang sudah tersedia dan boleh didaftarkan ke catalog:
[TEMPEL DOKUMENTASI ENDPOINT DI SINI — path, method, parameter, contoh response JSON]

Jangan kerjakan fase lain dulu. Setelah selesai, laporkan hasilnya dan TUNGGU konfirmasi saya.
```

---

## PROMPT 8 — Fase 6: Data Fetcher + Computation Layer

```
Fase 5 sudah saya coba dan berhasil (Query Catalog sudah terdaftar dan terdokumentasi).

Lanjutkan ke "FASE 6 — Data Fetcher + Computation Layer" di file yang sama. Jangan kerjakan fase lain dulu.

Setelah selesai, laporkan hasilnya dan TUNGGU konfirmasi saya.
```

---

## PROMPT 9 — Fase 7: Template Engine

```
Fase 6 sudah saya coba dan berhasil (data dari query bisa diambil dan dihitung dengan benar).

Lanjutkan ke "FASE 7 — Template Engine" di file yang sama. Jangan kerjakan fase lain dulu.

Setelah selesai, laporkan hasilnya dan TUNGGU konfirmasi saya.
```

---

## PROMPT 10 — Fase 8: AI Agent Integration

```
Fase 7 sudah saya coba dan berhasil (chart bar/donut data-driven sudah render dengan benar sesuai style project).

Lanjutkan ke "FASE 8 — AI Agent Integration" di file yang sama. Pastikan system prompt untuk AI menyertakan isi YAML_CHART_SKILL.md, Query Catalog (Fase 5), dan Template Registry (Fase 7) sebagai konteks, sesuai yang sudah dijelaskan di file tersebut.

PENTING soal arsitektur: panggilan ke Claude API HARUS dilakukan dari BACKEND LARAVEL (buat endpoint baru, misal POST /api/ai/generate-chart), BUKAN langsung dari React. React cuma mengirim prompt user ke endpoint Laravel tersebut, lalu Laravel yang meneruskan ke Claude API dan mengembalikan hasilnya — supaya API key Claude tidak pernah terekspos ke browser/frontend.

Jangan kerjakan fase lain dulu. Setelah selesai, laporkan hasilnya dan TUNGGU konfirmasi saya.
```

---

## PROMPT 11 — Fase 9: Validasi & Guardrail Output AI

```
Fase 8 sudah saya coba dan berhasil (prompt AI menghasilkan chart yang sesuai).

Lanjutkan ke "FASE 9 — Validasi & Guardrail Output AI" di file yang sama. Jangan kerjakan fase lain dulu.

Setelah selesai, laporkan hasilnya dan TUNGGU konfirmasi saya.
```

---

## PROMPT 12 — Fase 10: Keamanan API Key

> Hanya kirim ini kalau kamu memang butuh user bawa API key sendiri. Kalau cukup pakai API key milik sistem, fase ini boleh dilewati.

```
Fase 9 sudah saya coba dan berhasil (output AI yang tidak valid berhasil ditolak dengan benar).

Lanjutkan ke "FASE 10 — Keamanan API Key" di file yang sama. Jangan kerjakan fase lain dulu.

Setelah selesai, laporkan hasilnya dan TUNGGU konfirmasi saya.
```

---

## Catatan Penting

- **Selalu tunggu konfirmasi & coba manual dulu** di tiap fase sebelum kirim prompt berikutnya — jangan kirim semua prompt sekaligus dalam satu pesan panjang.
- Kalau di tengah jalan agent menemukan bagian ambigu dan bertanya balik ke kamu, jawab dulu pertanyaannya sebelum agent lanjut — jangan diabaikan meski kamu buru-buru ke fase berikutnya.
- Kalau ada fase yang hasilnya kurang sesuai, jangan langsung lanjut fase berikutnya — kirim dulu feedback perbaikan untuk fase itu sampai benar, karena fase-fase berikutnya saling bergantung pada fondasi dari fase sebelumnya.
