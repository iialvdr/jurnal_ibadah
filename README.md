
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

**Jurnal Ibadah** adalah aplikasi web berbasis PWA (Progressive Web App) yang dirancang untuk membantu umat Muslim memantau aktivitas ibadah harian mereka. Aplikasi ini memiliki antarmuka modern (*Glassmorphism*), ringan, dan dilengkapi fitur-fitur esensial seperti jadwal sholat, arah kiblat, tasbih digital, hingga Al-Qur'an digital.

## ✨ Fitur Utama

Aplikasi ini memuat berbagai fitur interaktif:

* **📝 Jurnal Harian (Prayer Tracker):** Checklist sholat Wajib (5 waktu) dan Sunnah (Dhuha & Tahajud) dengan *progress bar* harian.
* **📖 Al-Qur'an Digital:**
    * Daftar 114 Surat lengkap dengan terjemahan.
    * Fitur pencarian surat (*Search*).
    * Bacaan per ayat (Arab, Latin, Terjemahan).
    * **Audio Murottal:** Pemutar audio per ayat.
    * Navigasi mudah (Next/Prev Surah).
* **⏰ Jadwal Sholat Otomatis:** Menyesuaikan dengan lokasi GPS pengguna secara *real-time*.
* **🔔 Notifikasi Adzan:** Pengingat otomatis saat masuk waktu sholat.
* **📿 Tasbih Digital:**
    * Counter dzikir dengan target (33, 100, atau ∞).
    * Pilihan bacaan dzikir (Tasbih, Tahmid, Takbir, dll) beserta teks Arab/Latin.
    * Efek getar (*haptic feedback*).
* **🧭 Arah Kiblat:** Kompas visual yang menunjuk ke Ka'bah disertai estimasi jarak.
* **📊 Profil & Statistik:** Grafik tren ibadah dalam 7-14 hari terakhir menggunakan *Chart.js*.
* **🌓 Dark Mode:** Dukungan tema terang dan gelap sesuai preferensi mata.
* **📱 PWA Support:** Bisa diinstal di HP selayaknya aplikasi native (Android/iOS) dan mendukung akses offline.

## 🛠️ Teknologi yang Digunakan

Project ini dibangun menggunakan *Vanilla JavaScript* dengan arsitektur modern:

* **Frontend:** HTML5, CSS3.
* **Styling:** [Tailwind CSS](https://tailwindcss.com/) (via CDN).
* **Icons:** [Lucide Icons](https://lucide.dev/).
* **Database & Auth:** [Firebase](https://firebase.google.com/) (Authentication & Firestore).
* **Charts:** [Chart.js](https://www.chartjs.org/).
* **Architecture:** MVC-like structure (View & Logic separation).

## 🔗 API Eksternal

Terima kasih kepada penyedia API terbuka yang membuat aplikasi ini dapat berjalan:

1.  **[Aladhan API](https://aladhan.com/):** Untuk data jadwal sholat & kalender Hijriah.
2.  **[EQuran.id API](https://equran.id/apidev):** Untuk data Surat, Ayat, dan Audio Al-Qur'an.
3.  **[BigDataCloud](https://www.bigdatacloud.com/):** Untuk mendeteksi nama kota/daerah berdasarkan koordinat GPS (Reverse Geocoding).

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
│   ├── views/          # Komponen UI (HTML Strings)
│   │   ├── view_home.js
│   │   ├── view_tracker.js
│   │   ├── view_tasbih.js
│   │   ├── view_qibla.js
│   │   ├── view_quran.js
│   │   ├── view_profile.js
│   │   └── view_login.js
│   └── app.js          # Logika Utama & Firebase Config
├── index.html          # Entry Point
├── manifest.json       # Konfigurasi PWA
└── sw.js               # Service Worker (Offline Cache)
