# Liquid Glass Design System (Web) — v2.0

Dokumen ini adalah **sumber kebenaran tunggal** untuk tampilan website bergaya Liquid Glass (terinspirasi iOS 26). Dibuat supaya siapa pun yang membacanya (developer, desainer, atau AI) menghasilkan output yang sama, tanpa menebak-nebak.

---

## 0. Cara Membaca Dokumen Ini

### Kata kunci

| Kata | Artinya |
|---|---|
| **WAJIB** | Tidak boleh dilanggar. Kalau dilanggar, hasilnya dianggap salah. |
| **DILARANG** | Tidak boleh dilakukan dalam kondisi apa pun. |
| **SEBAIKNYA** | Default yang direkomendasikan. Boleh disimpang dengan alasan jelas. |
| **BOLEH** | Opsional. |

### Prioritas kalau ada aturan yang bertabrakan

1. **Aksesibilitas** (kontras, fokus, target sentuh, reduced motion/transparency)
2. **Keterbacaan** (teks harus jelas dibaca)
3. **Performa** (budget di bagian 11)
4. **Estetika** (kilau, pembiasan, detail visual)

Contoh: kalau efek pembiasan bikin teks susah dibaca, efeknya yang dikorbankan, bukan teksnya.

### Aturan untuk AI / developer yang mengerjakan

- **DILARANG** mengarang token, warna, atau komponen yang tidak ada di dokumen ini.
- Kalau butuh sesuatu yang belum ada, tulis `TODO(design): <kebutuhan>` di kode dan jangan improvisasi gaya baru.
- Kalau instruksi di prompt bertentangan dengan dokumen ini, **dokumen ini menang** kecuali prompt secara eksplisit menyebut "override".

---

## 1. Konteks Proyek (ISI DULU)

Bagian ini harus diisi sebelum dokumen dipakai. Nilai di bawah adalah placeholder.

| Item | Nilai |
|---|---|
| Nama proyek | `<isi>` |
| Jenis website | `<landing page / toko / portofolio / sistem / lainnya>` |
| Target pengguna | `<isi>` |
| Warna brand utama | `#6D5EF5` (placeholder, **WAJIB** diganti dan dicek kontrasnya) |
| Font | `system-ui` (placeholder, ganti kalau punya font brand) |
| Tema default | `light` / `dark` / `ikut sistem` → **ikut sistem** |
| Browser yang didukung | Evergreen 2024+ (Chrome/Edge 123+, Safari 17.5+, Firefox 120+) |
| Stack | `<HTML+CSS / React / Next.js / dll>` |

---

## 2. Aturan Inti (Non-Negotiable)

1. **Glass hanya untuk layer kontrol yang melayang**: navbar, tab bar, tombol floating, modal/sheet, dropdown, dan maksimal satu kartu unggulan per halaman.
2. **Konten utama berada di permukaan solid** (kartu biasa, section teks, tabel, form panjang). **DILARANG** menaruh paragraf panjang atau data penting di atas glass transparan.
3. **DILARANG nested glass.** Tidak boleh ada elemen ber-`backdrop-filter` di dalam elemen ber-`backdrop-filter` lain. Elemen di dalam glass memakai varian `tint` (tanpa blur).
4. **Budget glass per viewport:** maksimal **4** elemen glass di desktop, **3** di mobile. Hitung semua elemen yang punya `backdrop-filter` dan terlihat bersamaan.
5. **Luas glass maksimal 50% dari luas viewport.** DILARANG membuat layer glass full-screen.
6. **Glass butuh background yang berwarna.** Di atas background polos (putih/hitam datar), efeknya tidak terlihat dan **DILARANG** dipakai.
7. **Warna teks mengikuti terang/gelapnya background di belakang glass**, bukan sekadar tema OS. Lihat bagian 12.
8. **Semua komponen interaktif WAJIB** punya state: default, hover, active, focus-visible, disabled.
9. **Fallback WAJIB** untuk browser tanpa `backdrop-filter` dan untuk user yang meminta transparansi dikurangi.

---

## 3. Glosarium

| Istilah | Definisi |
|---|---|
| **Glass surface** | Elemen yang memakai `backdrop-filter` (blur) sehingga background di belakangnya terlihat buram. |
| **Tint** | Permukaan semi-transparan **tanpa** `backdrop-filter`. Dipakai di dalam glass. |
| **Solid surface** | Permukaan tidak transparan (kartu, section konten). |
| **Specular edge** | Kilau gradient tipis di pinggir glass, meniru pantulan cahaya di tepi kaca. |
| **Refraction** | Efek pembiasan (background tampak melengkung di balik kaca). Opsional, hanya Chromium. |
| **Scrim** | Lapisan gelap/terang tipis di belakang glass untuk menjaga kontras di atas foto. |
| **Tier** | Tingkat ketebalan glass: `thin`, `regular`, `thick`. |

---

## 4. Design Tokens

Semua nilai di bawah **WAJIB** dipakai lewat variabel, bukan ditulis ulang manual.

> `light-dark()` hanya menerima warna, jadi nilai bukan warna (misal ukuran shadow) dipisah dari warnanya.

```css
:root {
  color-scheme: light dark;
}
/* Paksa tema lewat atribut (opsional, untuk toggle manual) */
:root[data-theme="light"] { color-scheme: light; }
:root[data-theme="dark"]  { color-scheme: dark; }

:root {
  /* ---------- Brand (GANTI & cek kontras) ---------- */
  --brand-500: #6d5ef5;
  --brand-600: #5645e0;
  --on-brand: #ffffff;

  /* ---------- Background ---------- */
  --bg-base:   light-dark(#eef1ff, #0b1020);
  --bg-blob-1: light-dark(rgba(124, 92, 255, 0.35), rgba(124, 92, 255, 0.45));
  --bg-blob-2: light-dark(rgba(0, 190, 255, 0.30),  rgba(0, 190, 255, 0.30));
  --bg-blob-3: light-dark(rgba(255, 122, 217, 0.30), rgba(255, 122, 217, 0.25));

  /* ---------- Permukaan solid ---------- */
  --surface:        light-dark(#ffffff, #151a2e);
  --surface-solid:  light-dark(rgba(255, 255, 255, 0.96), rgba(24, 28, 46, 0.96)); /* fallback glass */
  --border-subtle:  light-dark(rgba(15, 23, 42, 0.08), rgba(255, 255, 255, 0.08));

  /* ---------- Teks ---------- */
  --text-primary:   light-dark(#0f172a, #f8fafc);
  --text-secondary: light-dark(rgba(15, 23, 42, 0.72), rgba(248, 250, 252, 0.74));

  /* ---------- Status & fokus ---------- */
  --focus-ring: light-dark(#3730a3, #ffffff);
  --danger:     light-dark(#b91c1c, #fca5a5);

  /* ---------- Material glass ---------- */
  --glass-thin-bg:    light-dark(rgba(255, 255, 255, 0.30), rgba(20, 24, 40, 0.20));
  --glass-regular-bg: light-dark(rgba(255, 255, 255, 0.45), rgba(20, 24, 40, 0.32));
  --glass-thick-bg:   light-dark(rgba(255, 255, 255, 0.65), rgba(20, 24, 40, 0.52));
  --glass-thin-blur:    12px;
  --glass-regular-blur: 18px;
  --glass-thick-blur:   24px;
  --glass-saturate: 180%;
  --glass-border:    light-dark(rgba(255, 255, 255, 0.70), rgba(255, 255, 255, 0.16));
  --glass-highlight: light-dark(rgba(255, 255, 255, 0.90), rgba(255, 255, 255, 0.28));
  --shadow-color:    light-dark(rgba(60, 70, 140, 0.16), rgba(0, 0, 0, 0.45));

  /* ---------- Tipografi ---------- */
  --font-sans: system-ui, -apple-system, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
  --fs-xs: 0.875rem;   /* 14px, batas minimum teks di atas glass */
  --fs-sm: 0.9375rem;  /* 15px */
  --fs-md: 1rem;       /* 16px, body default */
  --fs-lg: 1.25rem;    /* 20px */
  --fs-xl: 1.5rem;     /* 24px */
  --fs-2xl: 2rem;      /* 32px */
  --fs-3xl: 2.75rem;   /* 44px */
  --fs-4xl: 3.5rem;    /* 56px */
  --lh-tight: 1.15;
  --lh-body: 1.55;

  /* ---------- Spacing (basis 4px) ---------- */
  --space-1: 4px;   --space-2: 8px;   --space-3: 12px;  --space-4: 16px;
  --space-5: 20px;  --space-6: 24px;  --space-8: 32px;  --space-12: 48px;
  --space-16: 64px; --space-24: 96px;

  /* ---------- Radius ---------- */
  --radius-sm: 12px;
  --radius-md: 20px;
  --radius-lg: 28px;
  --radius-pill: 999px;

  /* ---------- Z-index ---------- */
  --z-base: 0;
  --z-content: 1;
  --z-sticky: 100;
  --z-nav: 200;
  --z-dropdown: 300;
  --z-modal: 400;
  --z-toast: 500;

  /* ---------- Motion ---------- */
  --dur-fast: 120ms;
  --dur-base: 220ms;
  --dur-slow: 360ms;
  --ease: cubic-bezier(0.2, 0.8, 0.2, 1);
}
```

### Aturan token

- **Tipografi:** teks di atas glass minimal `--fs-xs` (14px) dan berat font minimal 500. Heading di atas glass berat minimal 600.
- **Spacing:** hanya pakai skala di atas. DILARANG nilai acak seperti `13px` atau `27px`.
- **Radius bersarang:** radius elemen dalam = radius luar dikurangi padding. Contoh: kartu radius 28px dengan padding 12px → elemen dalam radius 16px.
- **Target sentuh:** semua elemen interaktif minimal **44×44px** (default komponen di bawah memakai 48px).

---

## 5. Model Layer

| Layer | Isi | Material | Contoh |
|---|---|---|---|
| **L0** | Background halaman | Gradient/foto | `body::before` |
| **L1** | Konten utama | **Solid** | Kartu, teks, tabel, form panjang |
| **L2** | Kontrol melayang | **Glass** (`regular`/`thin`) | Navbar, tab bar, tombol floating, kartu unggulan |
| **L3** | Overlay | **Glass** (`thick`) + scrim solid | Modal, bottom sheet, dropdown |

Aturan: L2 dan L3 tidak boleh bersarang. Isi dari L2/L3 memakai **tint**, bukan glass.

---

## 6. Material Dasar

Urutan CSS **WAJIB**: reset → token → base → komponen → utilitas. Komponen harus ditulis **setelah** base karena menimpa radius dan padding.

### 6.1 Background halaman

`background-attachment: fixed` bermasalah di iOS Safari, jadi pakai elemen fixed:

```css
body {
  margin: 0;
  background-color: var(--bg-base);
  color: var(--text-primary);
  font-family: var(--font-sans);
  font-size: var(--fs-md);
  line-height: var(--lh-body);
}
body::before {
  content: "";
  position: fixed;
  inset: 0;
  z-index: -1;
  background:
    radial-gradient(60% 50% at 15% 20%, var(--bg-blob-1), transparent 70%),
    radial-gradient(50% 50% at 85% 30%, var(--bg-blob-2), transparent 70%),
    radial-gradient(60% 60% at 50% 90%, var(--bg-blob-3), transparent 70%);
  pointer-events: none;
}
```

### 6.2 Glass (base + tier)

```css
.glass {
  --_bg: var(--glass-regular-bg);
  --_blur: var(--glass-regular-blur);

  position: relative;
  isolation: isolate;
  background: var(--_bg);
  -webkit-backdrop-filter: blur(var(--_blur)) saturate(var(--glass-saturate));
  backdrop-filter: blur(var(--_blur)) saturate(var(--glass-saturate));
  border: 1px solid var(--glass-border);
  border-radius: var(--radius-md);
  color: var(--text-primary);
  box-shadow:
    inset 0 1px 0 var(--glass-highlight),
    0 8px 32px var(--shadow-color);
}

.glass--thin  { --_bg: var(--glass-thin-bg);  --_blur: var(--glass-thin-blur); }
.glass--thick { --_bg: var(--glass-thick-bg); --_blur: var(--glass-thick-blur); }

/* Specular edge */
.glass::before {
  content: "";
  position: absolute;
  inset: 0;
  z-index: -1;
  padding: 1px;
  border-radius: inherit;
  background: linear-gradient(
    135deg,
    rgba(255, 255, 255, 0.8),
    rgba(255, 255, 255, 0) 40%,
    rgba(255, 255, 255, 0) 60%,
    rgba(255, 255, 255, 0.5)
  );
  -webkit-mask: linear-gradient(#000 0 0) content-box, linear-gradient(#000 0 0);
  -webkit-mask-composite: xor;
  mask: linear-gradient(#000 0 0) content-box, linear-gradient(#000 0 0);
  mask-composite: exclude;
  pointer-events: none;
}
```

**Kapan pakai tier mana**

| Tier | Dipakai untuk | Alasan |
|---|---|---|
| `thin` | Tombol floating kecil, chip di atas foto | Paling ringan, paling transparan |
| `regular` | Navbar, tab bar, kartu unggulan | Default |
| `thick` | Modal, sheet, dropdown | Butuh keterbacaan lebih tinggi |

### 6.3 Tint (untuk elemen di dalam glass)

```css
.tint {
  background: color-mix(in srgb, var(--text-primary) 8%, transparent);
  border: 1px solid var(--glass-border);
}
.tint:hover { background: color-mix(in srgb, var(--text-primary) 14%, transparent); }
```

### 6.4 Scrim (wajib kalau glass di atas foto)

```css
.has-scrim { position: relative; }
.has-scrim::after {
  content: "";
  position: absolute;
  inset: 0;
  background: linear-gradient(to bottom, rgba(0, 0, 0, 0.35), rgba(0, 0, 0, 0.1) 40%, rgba(0, 0, 0, 0.45));
  pointer-events: none;
}
```

---

## 7. Komponen

Setiap komponen punya: tujuan, anatomi, state, dan kode.

### 7.1 Tombol

**Varian**

| Varian | Class | Dipakai untuk | Blur? |
|---|---|---|---|
| Primary | `btn btn--primary` | Aksi utama (maks. 1 per section) | Tidak |
| Glass | `btn glass glass--thin` | Tombol berdiri sendiri di atas background/foto | Ya (dihitung ke budget) |
| Tint | `btn btn--tint tint` | Tombol di dalam glass/kartu | Tidak |

**State:** default · hover (naik 1px) · active (scale 0.97) · focus-visible (ring 2px) · disabled (opacity 0.5, tanpa gerak).

```css
.btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: var(--space-2);
  min-height: 48px;
  padding: 0 var(--space-6);
  border-radius: var(--radius-pill);
  font: 600 var(--fs-sm)/1 var(--font-sans);
  color: var(--text-primary);
  text-decoration: none;
  cursor: pointer;
  transition:
    transform var(--dur-base) var(--ease),
    background-color var(--dur-base) var(--ease),
    box-shadow var(--dur-base) var(--ease);
}
.btn:hover  { transform: translateY(-1px); }
.btn:active { transform: scale(0.97); }
.btn:focus-visible { outline: 2px solid var(--focus-ring); outline-offset: 3px; }
.btn:disabled,
.btn[aria-disabled="true"] { opacity: 0.5; cursor: not-allowed; transform: none; }

.btn--primary {
  background: var(--brand-500);
  color: var(--on-brand);
  border: 1px solid transparent;
  box-shadow: 0 4px 16px color-mix(in srgb, var(--brand-500) 40%, transparent);
}
.btn--primary:hover { background: var(--brand-600); }
```

Tombol hanya ikon: **WAJIB** punya `aria-label` dan ukuran 48×48px.

### 7.2 Navbar

**Perilaku**
- Desktop (≥768px): pill melayang, `sticky`, lebar maks 960px, di tengah. Isi: brand kiri, link tengah/kanan, satu CTA di kanan.
- Mobile (<768px): brand + tombol menu. Menu terbuka sebagai bottom sheet `glass--thick` (lihat 7.6). Link desktop disembunyikan.
- Link aktif ditandai `aria-current="page"`.

```html
<header class="nav glass">
  <a class="nav__brand" href="/">Brand</a>
  <nav class="nav__links" aria-label="Utama">
    <a href="/" aria-current="page">Beranda</a>
    <a href="/menu">Menu</a>
    <a href="/kontak">Kontak</a>
  </nav>
  <a class="btn btn--primary" href="/pesan">Pesan</a>
</header>
```

```css
.nav {
  position: sticky;
  top: var(--space-4);
  z-index: var(--z-nav);
  width: min(100% - var(--space-8), 960px);
  margin: var(--space-4) auto;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--space-6);
  padding: var(--space-2) var(--space-2) var(--space-2) var(--space-6);
  border-radius: var(--radius-pill);
}
.nav__brand { font-weight: 700; color: var(--text-primary); text-decoration: none; }
.nav__links { display: flex; gap: var(--space-1); }
.nav__links a {
  padding: 12px var(--space-4);
  border-radius: var(--radius-pill);
  color: var(--text-primary);
  font-weight: 500;
  text-decoration: none;
}
.nav__links a:hover,
.nav__links a[aria-current="page"] { background: color-mix(in srgb, var(--text-primary) 10%, transparent); }
.nav__links a:focus-visible { outline: 2px solid var(--focus-ring); outline-offset: 2px; }

@media (max-width: 767px) { .nav__links { display: none; } }
```

Tombol CTA di dalam navbar memakai `btn--primary` (tanpa blur), jadi tidak melanggar aturan nested.

### 7.3 Kartu

| Varian | Class | Kapan |
|---|---|---|
| Solid (default) | `card` | Semua konten biasa |
| Glass | `card glass` | Maks. **1** per halaman, untuk elemen unggulan di atas visual |

```css
.card {
  background: var(--surface);
  border: 1px solid var(--border-subtle);
  border-radius: var(--radius-lg);
  padding: var(--space-6);
  box-shadow: 0 2px 8px var(--shadow-color);
}
.card.glass { background: var(--_bg); border-color: var(--glass-border); }

/* Hover HANYA kalau kartu bisa diklik */
.card--interactive { transition: transform var(--dur-base) var(--ease); }
.card--interactive:hover { transform: translateY(-4px); }
```

### 7.4 Input

```css
.input {
  width: 100%;
  min-height: 48px;
  padding: 0 var(--space-4);
  border-radius: var(--radius-sm);
  border: 1px solid var(--glass-border);
  background: light-dark(rgba(255, 255, 255, 0.6), rgba(255, 255, 255, 0.06));
  color: var(--text-primary);
  font: 500 16px/1.4 var(--font-sans); /* 16px agar iOS tidak auto-zoom */
}
.input::placeholder { color: var(--text-secondary); }
.input:focus-visible { outline: 2px solid var(--focus-ring); outline-offset: 2px; }
.input[aria-invalid="true"] { border-color: var(--danger); }
.input:disabled { opacity: 0.5; cursor: not-allowed; }
```

Aturan form: label **WAJIB** terlihat dan terhubung (`<label for>`), pesan error muncul di bawah field dengan `aria-describedby`, bukan hanya mengandalkan warna.

### 7.5 Chip / Label

```css
.chip {
  display: inline-flex;
  align-items: center;
  min-height: 32px;
  padding: 0 var(--space-3);
  border-radius: var(--radius-pill);
  font: 600 var(--fs-xs)/1 var(--font-sans);
}
```

Pakai bersama `tint`. Chip yang bisa diklik **WAJIB** punya area sentuh 44px (tambah padding atau wrapper).

### 7.6 Modal dan Bottom Sheet

Pakai elemen native `<dialog>` supaya fokus dan tombol Esc ditangani browser.

```html
<dialog class="modal glass glass--thick" aria-labelledby="modal-title">
  <h2 id="modal-title">Judul</h2>
  <p>Isi singkat.</p>
  <button class="btn btn--primary">Oke</button>
</dialog>
```

```css
.modal {
  width: min(100% - var(--space-8), 480px);
  padding: var(--space-6);
  border-radius: var(--radius-lg);
  z-index: var(--z-modal);
}
/* Scrim modal: solid, TANPA blur (hemat performa, tidak double-blur) */
.modal::backdrop { background: rgba(0, 0, 0, 0.45); }

@media (max-width: 767px) {
  .modal {
    margin: auto 0 0;
    width: 100%;
    max-width: none;
    border-radius: var(--radius-lg) var(--radius-lg) 0 0;
    padding-bottom: calc(var(--space-6) + env(safe-area-inset-bottom));
  }
}
```

### 7.7 Tab Bar (mobile)

Tampil hanya di <768px. Maksimal 5 item. Dihitung sebagai 1 glass surface.

```css
.tabbar {
  position: fixed;
  left: 50%;
  bottom: calc(var(--space-4) + env(safe-area-inset-bottom));
  transform: translateX(-50%);
  z-index: var(--z-nav);
  display: flex;
  gap: var(--space-1);
  padding: 6px;
  border-radius: var(--radius-pill);
}
.tabbar a {
  min-width: 48px;
  min-height: 48px;
  display: grid;
  place-items: center;
  padding: 0 var(--space-4);
  border-radius: var(--radius-pill);
  color: var(--text-primary);
}
.tabbar a[aria-current="page"] { background: color-mix(in srgb, var(--text-primary) 12%, transparent); }
@media (min-width: 768px) { .tabbar { display: none; } }
```

Konten halaman **WAJIB** diberi `padding-bottom` ekstra supaya tidak tertutup tab bar.

---

## 8. Layout & Responsif

Pendekatan **mobile-first** (`min-width`).

| Breakpoint | Lebar | Kolom | Gutter | Padding samping |
|---|---|---|---|---|
| Mobile | <640px | 4 | 16px | 16px |
| Tablet | 640–1023px | 8 | 24px | 24px |
| Desktop | ≥1024px | 12 | 24px | 32px |

- Lebar konten maksimal: **1200px**, di tengah.
- Jarak vertikal antar section: **64px** (mobile), **96px** (desktop).
- Ukuran judul hero: `--fs-3xl` di mobile, `--fs-4xl` di desktop.
- Tidak boleh ada scroll horizontal di lebar 320px.
- Konten penting **DILARANG** disembunyikan di mobile, hanya boleh disusun ulang.

---

## 9. Motion

- Hanya animasikan `transform` dan `opacity`. **DILARANG** menganimasikan `blur()`, `backdrop-filter`, `width`, `height`, atau `top/left`.
- Durasi: interaksi kecil `--dur-fast`, hover/press `--dur-base`, transisi layar/sheet `--dur-slow`.
- Tidak ada animasi yang berulang tanpa henti kecuali loading indicator.

```css
@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
    scroll-behavior: auto !important;
  }
}
```

---

## 10. Fallback & Dukungan Browser

### 10.1 Matriks dukungan

| Fitur | Chrome/Edge | Safari | Firefox | Kalau tidak didukung |
|---|---|---|---|---|
| `backdrop-filter` | Ya | Ya (butuh `-webkit-`) | Ya (103+) | Jatuh ke permukaan solid (10.2) |
| `light-dark()` | 123+ | 17.5+ | 120+ | Di luar target dukungan |
| `color-mix()` | 111+ | 16.2+ | 113+ | Di luar target dukungan |
| `prefers-reduced-transparency` | Terbatas | Terbatas | Terbatas | Tetap dipasang, tidak ada efek buruk |
| `url()` di `backdrop-filter` (refraksi) | Ya | Tidak | Tidak | Tetap blur biasa (bagian 13) |

### 10.2 Fallback solid

Tiga kondisi memicu tampilan solid: browser tanpa `backdrop-filter`, user meminta transparansi dikurangi, dan toggle manual `data-glass="off"`. Deklarasinya sama, ditulis berulang karena tidak bisa digabung lintas `@media`/`@supports`.

```css
@supports not ((backdrop-filter: blur(1px)) or (-webkit-backdrop-filter: blur(1px))) {
  .glass { background: var(--surface-solid); }
}

@media (prefers-reduced-transparency: reduce) {
  .glass {
    background: var(--surface-solid);
    -webkit-backdrop-filter: none;
    backdrop-filter: none;
  }
}

:root[data-glass="off"] .glass {
  background: var(--surface-solid);
  -webkit-backdrop-filter: none;
  backdrop-filter: none;
}

@media (prefers-contrast: more) {
  .glass {
    background: var(--surface-solid);
    border-color: currentColor;
  }
}
```

---

## 11. Performa

| Batas | Nilai |
|---|---|
| Elemen glass per viewport | ≤ 4 desktop, ≤ 3 mobile |
| Luas glass | ≤ 50% viewport |
| Blur maksimum | 24px |
| Nested glass | 0 |
| Scroll di HP kelas menengah | Tetap mulus (±60fps), tanpa patah-patah |
| CLS | ≤ 0.1 |
| LCP | ≤ 2.5 detik |

Aturan tambahan:
- **DILARANG** `will-change: backdrop-filter` secara global.
- Gambar background: format WebP/AVIF, ukuran sesuai tampilan, `loading="lazy"` kecuali hero.
- Kalau scroll terasa berat, urutan pemangkasan: kurangi refraksi → turunkan blur → turunkan tier → ganti ke solid.

---

## 12. Konten & Kontras di Atas Glass

### 12.1 Aturan teks

- Kontras minimal **4.5:1** untuk teks biasa, **3:1** untuk teks besar (≥24px, atau ≥19px bold) dan ikon/border komponen.
- Ukuran minimum 14px, berat minimum 500 (heading 600+).
- Paragraf di atas glass maksimal **3 baris**. Lebih dari itu pindahkan ke permukaan solid.
- Ikon tanpa teks wajib punya `aria-label`.

### 12.2 Cara menentukan warna teks

Warna teks ditentukan oleh **terang/gelapnya area di belakang glass**, bukan sekadar tema OS.

| Kondisi background di belakang glass | Tindakan |
|---|---|
| Gradient bawaan dokumen ini | Ikuti token tema (`--text-primary`) |
| Foto gelap | Teks terang, boleh tambah scrim |
| Foto terang | Pakai `glass--thick` **atau** scrim gelap, jangan paksakan teks gelap di atas glass tipis |
| Foto ramai (banyak detail/kontras) | Scrim WAJIB + `glass--thick` |
| Tidak bisa diprediksi (konten dari user/CMS) | Pakai permukaan solid, jangan glass |

### 12.3 Cara mengecek

Cek di DevTools (Inspect → Accessibility → contrast) pada titik **terburuk** di belakang teks, bukan titik rata-rata.

---

## 13. Efek Pembiasan (Opsional, Chromium saja)

Status: **BOLEH**, bukan syarat. Desain **WAJIB** tetap bagus tanpa efek ini.

Aturan:
- Maksimal pada **1 elemen** per halaman (misal navbar atau hero card).
- Dilarang di mobile low-end. Aktifkan hanya kalau `@media (min-width: 1024px)`.
- Tetap wajib memenuhi kontras (bagian 12).

```html
<svg width="0" height="0" style="position:absolute" aria-hidden="true">
  <filter id="liquid-glass" x="0" y="0" width="100%" height="100%">
    <feTurbulence type="fractalNoise" baseFrequency="0.008 0.012" numOctaves="2" seed="3" result="noise"/>
    <feGaussianBlur in="noise" stdDeviation="2" result="softNoise"/>
    <feDisplacementMap in="SourceGraphic" in2="softNoise" scale="40" xChannelSelector="R" yChannelSelector="G"/>
  </filter>
</svg>
```

```css
@media (min-width: 1024px) {
  @supports (backdrop-filter: url(#liquid-glass)) {
    .glass--refract {
      -webkit-backdrop-filter: url(#liquid-glass) blur(10px) saturate(160%);
      backdrop-filter: url(#liquid-glass) blur(10px) saturate(160%);
    }
  }
}
```

---

## 14. Tabel Keputusan Cepat

Kalau ragu, pakai tabel ini. Jangan improvisasi.

| Situasi | Keputusan |
|---|---|
| Mau bikin kartu produk/menu/artikel | Kartu **solid** (`card`) |
| Mau bikin navbar | `glass` regular, pill, sticky |
| Tombol di dalam glass | `btn--tint` (tanpa blur) |
| Tombol di atas foto hero | `btn glass glass--thin` + scrim |
| Aksi utama | `btn--primary`, satu per section |
| Form panjang | Permukaan solid |
| Modal / menu mobile | `glass--thick` + `<dialog>` |
| Background halaman polos | **Dilarang pakai glass**, tambah gradient dulu |
| Perlu paragraf panjang di atas visual | Taruh di kartu solid |
| Budget glass sudah penuh | Ubah elemen paling tidak penting jadi solid |
| Kontras gagal | Naikkan tier → tambah scrim → ganti solid |

---

## 15. Template Prompt untuk AI (Stitch, Cursor, dll.)

Aturan pakai: **satu prompt lengkap per halaman**. Jangan dipecah per section. Pisah hanya kalau memang beda halaman.

```text
Bangun halaman: <nama halaman> untuk <nama proyek>.

Acuan wajib: ikuti DESIGN.md (Liquid Glass Design System v2.0) apa adanya.
Jangan menambah token, warna, atau komponen baru. Kalau butuh yang belum ada,
tulis TODO(design) dan lanjut.

Tujuan halaman: <satu kalimat>
Pengguna utama & aksi yang diharapkan: <isi>

Urutan section (dari atas ke bawah):
1. Navbar: <isi link & CTA>
2. Hero: <judul, subjudul, CTA, background>
3. <section>: <konten, komponen yang dipakai>
4. ...
N. Footer: <isi>

Konten teks asli: <tempel di sini, jangan biarkan AI mengarang copy>

Komponen yang boleh dipakai: Navbar, Button (primary/glass/tint), Card (solid),
Card (glass, maks. 1), Input, Chip, Modal, Tab bar.

Responsif: mobile-first, breakpoint 640/1024. Perilaku khusus: <isi>
Tema: ikut sistem (light + dark).

Batasan: budget glass ≤ 4 desktop / ≤ 3 mobile, tanpa nested glass,
semua teks lolos kontras 4.5:1, semua elemen interaktif punya state lengkap.

Output: <HTML+CSS / React / dll.> dalam satu file/proyek lengkap.
```

---

## 16. Checklist Penerimaan (Definition of Done)

Halaman dianggap selesai kalau **semua** centang.

**Struktur & aturan**
- [ ] Jumlah elemen `backdrop-filter` per viewport ≤ 4 desktop / ≤ 3 mobile
- [ ] Tidak ada glass di dalam glass
- [ ] Konten utama memakai permukaan solid
- [ ] Hanya token dari dokumen ini yang dipakai (tidak ada warna/spacing acak)
- [ ] Maksimal 1 `btn--primary` per section, maksimal 1 `card glass` per halaman

**Aksesibilitas**
- [ ] Kontras teks ≥ 4.5:1 di titik terburuk (cek di DevTools)
- [ ] Semua elemen interaktif bisa dijangkau keyboard, fokus terlihat jelas
- [ ] Target sentuh ≥ 44×44px
- [ ] Tombol ikon punya `aria-label`; form punya label terlihat
- [ ] `prefers-reduced-motion`, `prefers-reduced-transparency`, `prefers-contrast` ditangani

**Tampilan**
- [ ] Light dan dark mode sama-sama terbaca
- [ ] Tampilan benar di 320px, 768px, 1280px tanpa scroll horizontal
- [ ] Fallback solid berfungsi (tes dengan `data-glass="off"`)
- [ ] Tab bar tidak menutupi konten terakhir di mobile

**Performa & browser**
- [ ] Dites di Chrome, Safari (iOS/macOS), Firefox
- [ ] Dites di satu HP Android kelas menengah: scroll tetap mulus
- [ ] LCP ≤ 2.5 detik, CLS ≤ 0.1

---

## 17. Riwayat Versi

| Versi | Perubahan |
|---|---|
| v2.0 | Struktur ulang: prioritas aturan, glosarium, token lengkap (light-dark), model layer, spec komponen dengan state, budget performa, tabel keputusan, template prompt, checklist. Perbaikan: warna teks mengikuti background (bukan hanya tema OS), larangan nested glass (tombol di dalam glass pakai tint), background fixed lewat `::before` agar aman di iOS. |
| v1.0 | Draf awal: token dasar, base class, komponen sederhana. |
