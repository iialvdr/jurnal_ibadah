<div align="center">
  <img src="public/img/icons/icon-192x192.png" alt="Jurnal Ibadah Logo" width="120" />
  <h1>Jurnal Ibadah App</h1>
  <p><strong>Teman setia dalam perjalanan spiritualmu untuk menjaga istiqomah setiap hari.</strong></p>
  
  [![React](https://img.shields.io/badge/React-19.2-blue.svg?style=flat&logo=react)](https://react.dev)
  [![Vite](https://img.shields.io/badge/Vite-8.0-646CFF.svg?style=flat&logo=vite)](https://vitejs.dev)
  [![Tailwind CSS](https://img.shields.io/badge/Tailwind-4.3-38B2AC.svg?style=flat&logo=tailwind-css)](https://tailwindcss.com)
  [![Firebase](https://img.shields.io/badge/Firebase-12.14-FFCA28.svg?style=flat&logo=firebase)](https://firebase.google.com)
  [![PWA Ready](https://img.shields.io/badge/PWA-Ready-success.svg?style=flat&logo=pwa)](https://developer.mozilla.org/en-US/docs/Web/Progressive_web_apps)
</div>

<br />

## 📖 Tentang Aplikasi

**Jurnal Ibadah** adalah aplikasi _Progressive Web App_ (PWA) Islami modern yang didesain dengan antarmuka yang indah (UI/UX) untuk membantu kaum muslimin melacak ibadah harian, menjaga konsistensi (*streak*), dan mendapatkan panduan harian seperti waktu sholat, bacaan Al-Qur'an, dan masih banyak lagi.

Aplikasi ini dapat diinstal di HP (Android/iOS) maupun Desktop, serta mendukung fitur **Notifikasi Waktu Sholat** (Push Notifications) dan bisa diakses sebagian secara _offline_.

---

## ✨ Fitur Utama

- 🕌 **Jadwal & Notifikasi Sholat:** Jadwal sholat akurat berbasis lokasi menggunakan data resmi Kemenag & perhitungan algoritma (Adhan.js), dilengkapi notifikasi *Push/Local*.
- 📖 **Al-Qur'an Digital:** Baca Al-Qur'an lengkap 114 surah beserta terjemahannya. Terdapat fitur pencatatan "Surat Terakhir Dibaca" yang otomatis tersinkron.
- 📝 **Jurnal Ibadah (Checklist):** Lacak sholat 5 waktu harian Anda dan raih _Streak_ serta _Badges_ jika konsisten!
- 📿 **Tasbih Digital:** Hitung dzikir dengan antarmuka estetik yang dilengkapi haptic feedback (getaran).
- 🧭 **Arah Kiblat:** Kompas penunjuk arah Ka'bah secara _real-time_ berbasis sensor perangkat.
- 🤲 **Kumpulan Doa & Asmaul Husna:** Ratusan doa harian dan daftar 99 Asmaul Husna.
- 🍽️ **Jadwal Puasa Sunnah:** Pengingat dan jadwal puasa Ayyamul Bidh, Senin-Kamis, Asyura, dll.
- 💰 **Kalkulator Zakat:** Hitung kewajiban zakat harta/profesi Anda dengan mudah.
- 📚 **Hadits Harian:** Menampilkan kutipan hadits inspiratif secara acak setiap hari.
- 🌓 **Dark Mode:** Tampilan Mode Gelap dan Terang yang nyaman di mata, lengkap dengan animasi transisi yang mulus.

---

## 🛠️ Teknologi yang Digunakan

Aplikasi ini dibangun dengan *modern stack* untuk performa yang kencang dan responsif:

- **Frontend Framework:** React.js v19 (menggunakan `vite`)
- **Styling:** Tailwind CSS v4 
- **Backend / Database:** Firebase (Authentication, Cloud Firestore)
- **Icons:** `lucide-react`
- **Charts:** `chart.js` & `react-chartjs-2` untuk grafik tren ibadah
- **PWA:** `vite-plugin-pwa`
- **Library Tambahan:** `adhan` (perhitungan waktu sholat offline), `dompurify`, `framer-motion`, `goey-toast`

---

## 🚀 Cara Menjalankan di Komputer Lokal

Ingin mencoba atau berkontribusi pada aplikasi ini? Ikuti langkah-langkah berikut:

### 1. Kloning Repositori
```bash
git clone https://github.com/username/jurnal-ibadah.git
cd jurnal-ibadah
```

### 2. Install Dependensi
```bash
npm install
```

### 3. Konfigurasi Firebase
Buat file `.env` di *root directory* project dan isi kredensial Firebase Anda:
```env
VITE_FIREBASE_API_KEY="your_api_key"
VITE_FIREBASE_AUTH_DOMAIN="your_auth_domain"
VITE_FIREBASE_PROJECT_ID="your_project_id"
VITE_FIREBASE_STORAGE_BUCKET="your_storage_bucket"
VITE_FIREBASE_MESSAGING_SENDER_ID="your_sender_id"
VITE_FIREBASE_APP_ID="your_app_id"
```
*(Opsional: Tambahkan konfigurasi VAPID KEY untuk mengaktifkan web push notifications)*

### 4. Jalankan Development Server
```bash
npm run dev
```
Buka `http://localhost:5173` di browser Anda.

---

## 📦 Build untuk Production

Untuk melakukan kompilasi (_build_) versi final yang sudah dioptimasi dan didukung *Service Worker* (PWA):

```bash
npm run build
npm run preview
```

---

## 📱 Cara Instalasi (PWA) di HP

Karena ini adalah Progressive Web App, pengguna tidak perlu mendownload dari Play Store/App Store.
1. Buka aplikasi via browser Chrome/Safari di HP.
2. Tunggu beberapa detik hingga muncul *banner* pop-up "Install App" / "Tambahkan ke Layar Utama".
3. Atau klik menu (titik tiga) di browser lalu pilih **Install App** / **Add to Home Screen**.
4. Aplikasi akan tampil di daftar aplikasi HP seperti aplikasi _native_ pada umumnya.

---

## 🤝 Kontribusi

Aplikasi ini dikembangkan dengan tujuan mempermudah umat muslim dalam beribadah. Jika Anda menemukan *bug*, memiliki ide fitur baru, atau ingin berkontribusi pada kode, silakan buka **Issues** atau buat **Pull Request**!

<div align="center">
  <br />
  <p>Dibuat dengan ❤️ untuk Umat Muslim</p>
</div>
