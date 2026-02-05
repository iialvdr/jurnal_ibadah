<p align="center">
  <a href="https://jurnal-ibadah.vercel.app/">
    <img src="./img/logo.png" alt="Logo Jurnal Ibadah" width="120" />
  </a>
</p>

<h1 align="center">Jurnal Ibadah</h1>

<p align="center">
  <strong>"Catat ibadahmu, raih keberkahan-Nya."</strong>
</p>

<p align="center">
  <a href="https://jurnal-ibadah.vercel.app/">
    <img src="https://img.shields.io/badge/Live_Demo-Buka_Aplikasi-10b981?style=for-the-badge&logo=vercel&logoColor=white" alt="Live Demo" />
  </a>
</p>

<p align="center">
  <img src="https://img.shields.io/badge/PWA-Installable-0ea5e9?style=flat-square" alt="PWA" />
  <img src="https://img.shields.io/badge/Offline-Friendly-10b981?style=flat-square" alt="Offline" />
  <img src="https://img.shields.io/badge/Vanilla_JS-Clean-111827?style=flat-square" alt="Vanilla JS" />
</p>

---

**Jurnal Ibadah** adalah aplikasi web berbasis PWA yang membantu memantau rutinitas ibadah harian, membaca Al-Qur'an, melihat jadwal sholat, berdzikir, hingga menghitung zakat dalam satu aplikasi ringan dan nyaman untuk mobile.

## Ringkasan Nilai

- Satu aplikasi untuk berbagai kebutuhan ibadah harian
- Desain fokus mobile yang cepat dan ringan
- Data tersimpan aman dan bisa sinkron lintas perangkat
- Akses cepat tanpa instalasi Play Store
- Berfungsi offline untuk fitur inti

## Fitur Utama

- Jurnal harian sholat wajib dan sunnah dengan jadwal dinamis
- Kalender ibadah dengan highlight puasa penting termasuk hari yang tidak boleh berpuasa
- Jadwal sholat offline dan tanggal Hijriah
- Al-Qur'an digital dengan pencarian dan bookmark ayat terakhir
- Perpustakaan hadits lengkap dan hadits harian di beranda
- Kumpulan doa dengan filter kategori dan tag
- Asmaul Husna lengkap Arab, Latin, arti
- Tasbih digital dengan target fleksibel dan getar
- Kompas kiblat berbasis sensor perangkat
- Kalkulator zakat maal, fitrah, dan fidyah
- Pusat Informasi dan Bantuan dengan pencarian dan filter
- FAQ, changelog, dan halaman kredit sumber data

## Pengalaman Pengguna

- Smart Calculation mengunci checklist sebelum waktunya agar pencatatan akurat
- Riwayat harian dan statistik ringkas untuk memantau konsistensi
- Pencarian cepat pada Al-Qur'an, hadits, dan doa
- Tampilan konsisten, jelas, dan ramah layar kecil

## Teknologi

| Area | Stack |
| --- | --- |
| Frontend | HTML5, CSS3, Vanilla JavaScript |
| Styling | Tailwind CSS (CDN) |
| Jadwal Sholat | Adhan.js |
| Grafik | Chart.js |
| Ikon | Lucide |
| Auth & Database | Firebase Auth + Firestore |

## Sumber Data

| Sumber | Kegunaan |
| --- | --- |
| EQuran.id | Data Al-Qur'an dan doa |
| Gading Hadith API | Hadits |
| BigDataCloud | Reverse geocoding lokasi |
| JSON lokal | Asmaul Husna |

## Cara Menjalankan (Local Development)

Karena aplikasi menggunakan ES Modules dan Service Worker, jalankan dengan server lokal.

**Opsi Live Server**
1. Install ekstensi Live Server di VS Code
2. Buka folder project
3. Jalankan `index.html` dengan Live Server

**Opsi Python**
```bash
cd jurnal-ibadah
python -m http.server 8000
```

## Konfigurasi Firebase

Atur konfigurasi Firebase di `js/config.js` sesuai project Firebase Anda.
Pastikan Authentication dan Firestore sudah aktif di console Firebase.

## PWA dan Offline

- Aplikasi bisa ditambahkan ke layar utama
- Service Worker menyimpan aset penting agar loading lebih cepat
- Jadwal sholat tetap berfungsi tanpa koneksi

## Struktur Folder

```text
jurnal-ibadah/
|-- assets/
|   `-- data/
|-- css/
|   `-- style.css
|-- img/
|   |-- logo.png
|   `-- favicon/
|-- js/
|   |-- modules/
|   |-- utils/
|   |-- app.js
|   |-- config.js
|   |-- router.js
|   |-- state.js
|   `-- version.js
|-- views/
|   |-- asmaul_husna.html
|   |-- changelog.html
|   |-- credits.html
|   |-- doa.html
|   |-- faq.html
|   |-- fasting.html
|   |-- hadith.html
|   |-- home.html
|   |-- login.html
|   |-- profile.html
|   |-- qibla.html
|   |-- quran.html
|   |-- tasbih.html
|   |-- tracker.html
|   `-- zakat.html
|-- index.html
|-- manifest.json
`-- sw.js
```

## Catatan

- Izin notifikasi dan lokasi bersifat opsional
- Beberapa fitur membutuhkan login agar data tersinkron
