# Liquid Glass untuk Jurnal Ibadah — v3.0

Panduan ini menjelaskan cara menggunakan **Liquid Glass secara terarah** di Jurnal Ibadah. Prinsip visualnya mengikuti panduan Apple terkini; implementasi di browser adalah pendekatan web, bukan material native Apple dan tidak menjanjikan efek yang identik di semua browser.

Liquid Glass adalah material dinamis untuk membantu navigasi dan kontrol terasa menyatu dengan konten. Bukan alasan untuk membuat semua kartu transparan. **Konten tetap menjadi fokus; material membantu membentuk hierarki dan menonjolkan kontrol penting.**

## 1. Konteks proyek

| Item | Nilai |
|---|---|
| Produk | Jurnal Ibadah |
| Jenis aplikasi | Aplikasi web responsif untuk jurnal dan pelacak ibadah |
| Stack | React, Vite, Tailwind CSS |
| Warna brand | Hijau `#10b981` (token `--brand-500`) |
| Tema | Terang dan gelap |
| Implementasi terkait | `src/components/LiquidGlass.jsx`, `src/index.css`, `src/utils/liquidGlassRefraction.js` |

Gunakan komponen dan token proyek yang sudah ada. Dokumen ini bukan instruksi untuk mengganti seluruh UI atau menambahkan efek baru ke setiap halaman.

## 2. Prinsip desain

1. **Konten utama adalah fokus.** Teks, ayat, jadwal, formulir, statistik, dan kartu informasi memakai permukaan yang cukup solid agar mudah dibaca.
2. **Glass membentuk lapisan fungsional.** Prioritaskan navigasi, kontrol mengambang, indikator pilihan, atau aksi kontekstual yang perlu terlihat berada di atas konten.
3. **Gunakan dengan hemat dan sengaja.** Jangan menambahkan glass ke setiap kartu atau elemen dekoratif. Pilih elemen penting dan konsisten di seluruh alur.
4. **Biarkan konten terlihat melalui material.** Hindari warna/tint yang terlalu kuat, blur berlebihan, highlight dekoratif yang tebal, dan latar belakang yang mengalahkan konten.
5. **Material harus menyatu dengan keadaan UI.** Pastikan tampil baik di tema terang/gelap, saat elemen bergerak atau berdekatan, dan ketika preferensi aksesibilitas mengurangi transparansi atau gerakan.
6. **Keterbacaan dan aksesibilitas lebih penting daripada efek.** Jika latar belakang tidak dapat diprediksi atau kontras tidak terjamin, gunakan permukaan solid.
7. **Utamakan pola platform.** Bila aplikasi dijalankan sebagai aplikasi native Apple, gunakan komponen dan material sistem. Di web, gunakan komponen proyek dan fallback yang dapat dipahami.

> Jumlah elemen, luas permukaan, dan nilai blur di bawah bukan kuota desain. Evaluasi efek berdasarkan hierarki, keterbacaan, serta performa pada perangkat sasaran.

## 3. Material dan lapisan

| Lapisan | Tujuan | Contoh |
|---|---|---|
| Konten | Membaca dan menyelesaikan tugas | Jurnal, ayat, jadwal, daftar, formulir |
| Kontrol | Navigasi dan tindakan yang mengambang di atas konten | Navigasi bawah, kontrol floating, indikator tab |
| Overlay | Memusatkan perhatian pada tindakan sementara | Menu, dialog, bottom sheet |

Glass biasanya tepat untuk lapisan kontrol dan dapat digunakan secara selektif pada overlay. Konten panjang tidak sebaiknya ditempatkan di atas glass. Hindari menumpuk beberapa backdrop blur; untuk kontrol di dalam material glass, gunakan gaya sederhana tanpa blur tambahan.

## 4. Token proyek

Nilai berikut mencerminkan token yang saat ini didefinisikan di `src/index.css`. Jika token berubah, perbarui bagian ini agar dokumentasi dan implementasi tetap konsisten.

```css
:root {
  --brand-500: #10b981;
  --brand-600: #059669;
  --on-brand: #ffffff;

  --surface: #ffffff;
  --surface-solid: rgba(255, 255, 255, 0.96);
  --border-subtle: rgba(15, 23, 42, 0.08);

  --glass-thin-bg: rgba(255, 255, 255, 0.32);
  --glass-regular-bg: rgba(255, 255, 255, 0.46);
  --glass-thick-bg: rgba(255, 255, 255, 0.68);
  --glass-thin-blur: 12px;
  --glass-regular-blur: 18px;
  --glass-thick-blur: 24px;
  --glass-saturate: 180%;
  --glass-border: rgba(255, 255, 255, 0.22);
  --glass-highlight: rgba(255, 255, 255, 0.40);
  --shadow-color: rgba(60, 70, 140, 0.10);

  --radius-sm: 12px;
  --radius-md: 20px;
  --radius-lg: 28px;
  --radius-pill: 9999px;
  --dur-fast: 120ms;
  --dur-base: 220ms;
  --dur-slow: 360ms;
  --ease: cubic-bezier(0.2, 0.8, 0.2, 1);
}

.dark,
:root[data-theme="dark"] {
  --surface: #0f172a;
  --surface-solid: rgba(15, 23, 42, 0.96);
  --border-subtle: rgba(255, 255, 255, 0.08);
  --glass-thin-bg: rgba(15, 23, 42, 0.25);
  --glass-regular-bg: rgba(15, 23, 42, 0.42);
  --glass-thick-bg: rgba(15, 23, 42, 0.65);
  --glass-border: rgba(255, 255, 255, 0.08);
  --glass-highlight: rgba(255, 255, 255, 0.14);
  --shadow-color: rgba(0, 0, 0, 0.50);
}
```

Tier adalah titik awal, bukan aturan penggunaan kaku:

| Tier | Karakter | Pemakaian yang mungkin |
|---|---|---|
| `thin` | Lebih tembus pandang | Kontrol kecil di atas konten yang tenang |
| `regular` | Seimbang | Navigasi atau kontrol utama |
| `thick` | Lebih opak | Overlay yang memerlukan pemisahan dan keterbacaan |

Pilih tier berdasarkan latar aktual, ukuran kontrol, dan tema. Jangan mengandalkan nilai transparansi sebagai jaminan kontras.

## 5. Penggunaan komponen

### Navigasi dan kontrol mengambang

- Terapkan glass pada navigasi yang memang mengambang di atas area konten; jangan menambahkan latar dekoratif yang menutupi efek material.
- Gunakan `LiquidGlass` untuk elemen yang membutuhkan perilaku/refraction Liquid Glass proyek. Pertahankan konten kontrol di atas lapisan efek dan jangan memasang glass kedua pada turunannya.
- Indikator tab aktif harus mudah dikenali tanpa hanya mengandalkan warna atau efek kaca.
- Pertimbangkan konten yang bergulir di bawah navigasi dan pastikan batas antara area konten dan kontrol tetap jelas.
- Sediakan ruang untuk navigasi mengambang agar tidak menutupi konten terakhir; perhitungkan safe area perangkat.

### Kartu dan konten

- Gunakan permukaan solid untuk sebagian besar kartu, daftar, panel bacaan, dan formulir.
- Glass pada kartu hanya untuk penekanan yang benar-benar membantu hierarki; bukan gaya default semua kartu.
- Jangan menaruh paragraf panjang atau informasi penting di atas foto/latar ramai dengan glass tipis.
- Jika informasi perlu dibaca tanpa memandang gambar di belakangnya, pilih permukaan solid.

### Tombol dan kontrol di dalam glass

- Gunakan tombol primer brand untuk aksi utama; kontrol sekunder memakai gaya yang lebih tenang.
- Tombol di dalam glass menggunakan fill/tint ringan, bukan glass dengan backdrop blur tersendiri.
- Sediakan state hover, pressed, focus-visible, disabled, serta state terpilih yang jelas.
- Ikon tanpa label yang terlihat harus memiliki nama aksesibel; area sentuh sebaiknya minimal 44 × 44 CSS px.

### Dialog dan sheet

- Gunakan pola dialog atau sheet yang sesuai perilaku aplikasi, dengan fokus, dismiss, dan urutan baca yang benar.
- Overlay harus cukup opak untuk memisahkan tugas sementara dari latar. Glass tidak menggantikan backdrop modal atau manajemen fokus.
- Jangan mengandalkan blur saja untuk membedakan modal dari konten di belakangnya.

## 6. Perilaku visual dan interaksi

- Bentuk, highlight, dan transparansi harus konsisten pada satu kelompok kontrol. Hindari outline terang tebal yang membuat komponen tampak seperti tombol plastik.
- Gerakan harus mengkomunikasikan perubahan keadaan—misalnya memilih tab atau membuka kontrol—bukan berjalan terus-menerus sebagai dekorasi.
- Jangan menganimasikan perubahan blur/backdrop-filter secara terus-menerus. Batasi animasi ke properti yang ringan bila memungkinkan.
- Hormati `prefers-reduced-motion`; hilangkan atau sederhanakan perpindahan dan gerakan elastis saat diminta.
- Hindari menetapkan `will-change: backdrop-filter` secara global. Periksa scroll, konsumsi GPU, dan frame pacing pada perangkat nyata.

## 7. Aksesibilitas, tema, dan fallback

1. Uji tampilan terang dan gelap terhadap konten yang benar-benar berada di belakang glass.
2. Pertahankan kontras teks sesuai WCAG: setidaknya **4.5:1** untuk teks biasa dan **3:1** untuk teks besar serta komponen visual penting. Periksa pada kondisi latar terburuk.
3. Fokus keyboard harus tetap terlihat. Jangan menghapus outline tanpa pengganti yang setara.
4. Sediakan perilaku pengganti yang solid saat `backdrop-filter` tidak tersedia, transparansi dikurangi, atau glass dimatikan. `prefers-reduced-transparency` belum didukung seragam; jangan menjadikannya satu-satunya cara mematikan efek.
5. Saat memakai gambar atau konten latar dinamis, gunakan scrim atau permukaan solid bila kontras tidak dapat dijaga.
6. Uji pada ukuran layar kecil, zoom teks, navigasi keyboard, dan kombinasi tema serta pengaturan aksesibilitas.

Contoh pola fallback CSS:

```css
@supports not ((backdrop-filter: blur(1px)) or (-webkit-backdrop-filter: blur(1px))) {
  .glass,
  .liquid-glass {
    background: var(--surface-solid);
  }
}

@media (prefers-reduced-transparency: reduce) {
  .glass,
  .liquid-glass {
    background: var(--surface-solid);
    -webkit-backdrop-filter: none;
    backdrop-filter: none;
  }
}

:root[data-glass="off"] .glass,
:root[data-glass="off"] .liquid-glass {
  background: var(--surface-solid);
  -webkit-backdrop-filter: none;
  backdrop-filter: none;
}
```

Sesuaikan selector dengan komponen yang benar-benar dipakai. Pastikan lapisan refraksi SVG pada `LiquidGlass` juga tidak tetap terlihat saat glass dinonaktifkan.

## 8. Refraksi dan implementasi web

Komponen [`LiquidGlass`](./src/components/LiquidGlass.jsx) dan utilitas [`liquidGlassRefraction`](./src/utils/liquidGlassRefraction.js) menyediakan pendekatan web untuk refraksi dengan fallback CSS. Refraksi adalah penyempurnaan opsional, bukan syarat agar layar dianggap Liquid Glass.

- Gunakan refraksi hanya jika menambah kedalaman yang bermakna dan tidak mengganggu membaca atau mengoperasikan kontrol.
- Pastikan komponen tetap terbaca dan berfungsi ketika filter SVG/backdrop tidak didukung atau dimatikan.
- Verifikasi perilaku pada Safari, Chromium, dan Firefox; dukungan filter dan hasil optiknya tidak selalu seragam.
- Jangan menganggap CSS blur, saturasi, border, dan highlight sebagai padanan penuh material sistem Apple.
- Jika performa menurun, matikan refraksi terlebih dahulu, lalu sederhanakan blur atau gunakan permukaan solid.

## 9. Alur keputusan

| Pertanyaan | Pilihan |
|---|---|
| Apakah elemen ini navigasi atau kontrol mengambang penting? | Pertimbangkan glass |
| Apakah pengguna perlu membaca atau membandingkan banyak informasi? | Gunakan permukaan solid |
| Apakah latar di belakangnya ramai atau berubah-ubah? | Gunakan scrim/permukaan solid; jangan mengandalkan glass tipis |
| Apakah ada backdrop blur pada induk atau elemen di dalamnya? | Hindari blur bertingkat; sederhanakan elemen anak |
| Apakah kontras atau performa tidak lolos pengujian? | Kurangi efek atau ganti dengan solid |

## 10. Checklist sebelum selesai

- [ ] Glass dipakai untuk fungsi/hierarki yang jelas, bukan sebagai dekorasi massal.
- [ ] Konten utama tetap jelas pada tema terang dan gelap.
- [ ] Kontrol tetap terbaca pada latar aktual dan tidak bergantung hanya pada blur.
- [ ] Tidak ada backdrop blur bertingkat yang tidak diperlukan.
- [ ] Fokus keyboard, state kontrol, label aksesibel, dan target sentuh dapat digunakan.
- [ ] Preferensi reduced motion/transparency dan fallback solid telah diperiksa.
- [ ] Navigasi mengambang tidak menutupi konten atau area safe-area.
- [ ] Tampilan dan scroll diuji pada browser/perangkat sasaran.

## Referensi

- [Apple — Liquid Glass](https://developer.apple.com/documentation/technologyoverviews/liquid-glass)
- [Apple — Adopting Liquid Glass](https://developer.apple.com/documentation/technologyoverviews/adopting-liquid-glass)
- [Apple — Human Interface Guidelines](https://developer.apple.com/design/human-interface-guidelines/)

Panduan Apple menjelaskan material dan perilaku pada platform Apple. Penerapan pada aplikasi web di dokumen ini adalah interpretasi untuk teknologi web dan harus mengikuti kebutuhan aksesibilitas serta dukungan browser.

## Riwayat versi

| Versi | Perubahan |
|---|---|
| v3.0 | Menyelaraskan prinsip dengan panduan Liquid Glass Apple terkini; menjelaskan batas simulasi web; menyesuaikan konteks, token, komponen, aksesibilitas, dan fallback dengan proyek; menghapus kuota visual yang arbitrer. |
| v2.0 | Menambahkan aturan, token, komponen, fallback, performa, dan checklist generik. |
| v1.0 | Draf awal. |
