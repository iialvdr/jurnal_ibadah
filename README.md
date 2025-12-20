<p align="center">
  <img src="assets/favicon/android-chrome-192x192.png" alt="Logo Jurnal Ibadah" width="120" />
</p>

<h1 align="center">🕌 Jurnal Ibadah</h1>

<p align="center">
  <strong>"Catat ibadahmu, raih keberkahan-Nya."</strong>
</p>

<p align="center">
  <a href="https://jurnal-ibadah.vercel.app/">
    <img src="https://img.shields.io/badge/🚀_Live_Demo-Buka_Aplikasi-10b981?style=for-the-badge&logo=vercel&logoColor=white" alt="Live Demo" />
  </a>
</p>

<p align="center">
  <a href="#-fitur-utama">Fitur</a> •
  <a href="#-teknologi-yang-digunakan">Teknologi</a> •
  <a href="#-cara-menjalankan-local-development">Instalasi</a>
</p>

---

**Jurnal Ibadah** adalah aplikasi web berbasis PWA (Progressive Web App) yang dirancang untuk membantu umat Muslim memantau aktivitas ibadah harian mereka. Aplikasi ini memiliki antarmuka modern (*Glassmorphism*), ringan, dan kini mendukung perhitungan jadwal sholat sepenuhnya **Offline**.

## ✨ Fitur Utama

Aplikasi ini memuat berbagai fitur interaktif:

* **📝 Jurnal Harian (Prayer Tracker):**
    * Checklist sholat Wajib (5 waktu) dan Sunnah (Dhuha & Tahajud).
    * **Smart Calculation:** Jadwal sholat di setiap kartu tracker dihitung secara dinamis sesuai tanggal yang dipilih.
    * Statistik & Grafik kemajuan ibadah.
* **⏰ Jadwal Sholat & Kalender Hijriah (Offline Ready):**
    * Menggunakan **Adhan.js** untuk perhitungan waktu sholat presisi tanpa internet.
    * Konfigurasi standar mirip Kemenag RI (Metode Singapore/MABIMS).
    * **Hijriah Adjustment:** Logika koreksi manual tanggal Hijriah untuk menyesuaikan dengan ketetapan lokal.
* **📖 Al-Qur'an Digital:**
    * Daftar 114 Surat lengkap dengan terjemahan dan audio.
    * **Bookmark Pintar:** Simpan ayat terakhir yang dibaca dan lanjutkan langsung dari Dashboard.
    * Fitur pencarian surat instan.
* **🤲 Kumpulan Doa:**
    * Cari doa harian, tahlil, dan wirid.
    * Filter berdasarkan Kategori (Grup) dan Tag.
    * UI/UX yang dioptimalkan untuk mobile (Anti-Flicker & Lazy GPU Rendering).
* **🔢 Asmaul Husna:**
    * Daftar 99 Nama Allah dengan teks Arab, Latin, dan Artinya.
* **📿 Tasbih Digital:**
    * Counter dzikir dengan target fleksibel (33, 100, ∞).
    * Mode getar (*haptic feedback*) saat mencapai target.
* **🧭 Arah Kiblat:** Kompas visual yang menunjuk ke Ka'bah menggunakan sensor perangkat.
* **📊 Profil & Personalisasi:**
    * Grafik tren ibadah 7-14 hari terakhir.
    * **Dark Mode:** Dukungan tema gelap/terang yang tersinkronisasi dengan akun Cloud.
* **📱 PWA Support:** Dapat diinstal (Add to Home Screen) dan berjalan layaknya aplikasi native.

## 🛠️ Teknologi yang Digunakan

Project ini dibangun menggunakan *Vanilla JavaScript* dengan arsitektur modern:

* **Frontend:** HTML5, CSS3 (Modern Features).
* **Styling:** [Tailwind CSS](https://tailwindcss.com/) (via CDN).
* **Logic Library:**
    * **[Adhan.js](https://github.com/batoulapps/adhan-js):** Perhitungan waktu sholat offline.
    * **[Chart.js](https://www.chartjs.org/):** Visualisasi data statistik.
* **Icons:** [Lucide Icons](https://lucide.dev/).
* **Database & Auth:** [Firebase](https://firebase.google.com/) (Authentication & Firestore).
* **Architecture:** MVC-like structure (View & Logic separation).

## 🔗 Sumber Data (API)

Terima kasih kepada penyedia data terbuka yang membuat aplikasi ini dapat berjalan:

1.  **[EQuran.id API](https://equran.id/apidev):** Untuk data Surat, Ayat, Audio Al-Qur'an, dan Kumpulan Doa.
2.  **[BigDataCloud](https://www.bigdatacloud.com/):** Untuk Reverse Geocoding (Nama Kota dari Koordinat GPS).
3.  **[Mikqi Github Raw](https://github.com/mikqi/dzikir-counter):** Sumber data JSON untuk Asmaul Husna.

## 🚀 Cara Menjalankan (Local Development)

Karena aplikasi ini menggunakan **ES Modules** (`type="module"`) dan **Service Worker**, aplikasi tidak bisa dijalankan hanya dengan klik ganda pada `index.html`. Kamu memerlukan *local server*.

### Opsi 1: Menggunakan VS Code Live Server (Disarankan)
1.  Install ekstensi **Live Server** di VS Code.
2.  Buka folder project di VS Code.
3.  Klik kanan pada `index.html` lalu pilih **"Open with Live Server"**.

### Opsi 2: Menggunakan Python
Jika kamu memiliki Python terinstal:
```bash
# Masuk ke folder project
cd jurnal-ibadah

# Jalankan server HTTP sederhana
python -m http.server 8000
````

Buka browser dan akses `http://localhost:8000`.

## 📂 Struktur Folder

```text
jurnal-ibadah/
├── assets/             # Gambar, Logo, Favicon
├── css/
│   └── style.css       # Custom CSS & Animations
├── js/
│   ├── modules/        # Logika Bisnis (Terpisah per Fitur)
│   │   ├── auth.js
│   │   ├── home.js     # Logika Dashboard & Adhan.js
│   │   ├── tracker.js  # Logika Jurnal & Kalkulasi Jadwal Dinamis
│   │   ├── quran.js
│   │   ├── doa.js      # Logika Doa & Filter UI
│   │   ├── ...
│   ├── views/          # Komponen UI (HTML Strings)
│   ├── app.js          # Main Entry Point
│   ├── config.js       # Firebase Config
│   ├── router.js       # Routing System
│   └── state.js        # Global State Management
├── index.html          # Entry Point & Library Loader
├── manifest.json       # Konfigurasi PWA
└── sw.js               # Service Worker (Offline Cache)

```
```
