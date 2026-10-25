# Sanket QR (संकेत QR)

> **Production-Ready, Privacy-First QR Code Generator & Scanner**  
> Fast, client-side, zero-dependency QR code platform built from scratch with clean vanilla web standards.

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![Vanilla JS](https://img.shields.io/badge/ES6-Vanilla_JavaScript-f7df1e.svg)](https://developer.mozilla.org/en-US/docs/Web/JavaScript)
[![CSS3](https://img.shields.io/badge/CSS3-Modern_Responsive-264de4.svg)](https://developer.mozilla.org/en-US/docs/Web/CSS)
[![Client-Side](https://img.shields.io/badge/Privacy-100%25_Client--Side-10b981.svg)](#security--privacy)

---

## 📖 Overview

**Sanket QR** is a modern, high-performance web application designed to generate and scan QR codes with zero server latency and complete user privacy. 

All generation, rendering, and camera/image decoding execute **100% in the user's browser**. Sensitive data (such as internal URLs, private Wi-Fi network credentials, and contact cards) **never touches an external server**.

---

## ✨ Features

### ⚡ QR Code Generator (`index.html`)
- **Instant Generation**: 0ms latency with real-time DOM rendering.
- **Auto-Formatting & Validation**: Automatically handles missing protocols (prepends `https://`), trims trailing/leading spaces, and validates domain structures.
- **Vector SVG Export**: Clean, scalable vector paths optimized for high-DPI print media, packaging, and billboards.
- **High-Resolution PNG Export**: Raster canvas generation up to 2048x2048 px with customizable error correction (L, M, Q, H).
- **One-Click Clipboard**:
  - Copy decoded link / plain text.
  - Copy generated QR code image directly to clipboard (`image/png` blob).
- **Customization Controls**: Foreground pattern color, background color, error correction level, and resolution presets.
- **Future-Ready Extensible Input Modes**:
  - 🌐 Website URL (Primary)
  - 📝 Plain Text
  - 📶 Wi-Fi Network (WPA/WPA2/WPA3, WEP, Open, Hidden SSID)
  - ✉️ Email (`mailto:` with subject & body)
  - 📞 Phone (`tel:`)
  - 👤 vCard (Contact Card)
- **Local History**: Recent codes saved locally with privacy-first `localStorage` (can be loaded or cleared anytime).

### 📷 Live Camera & Upload Scanner (`scan.html`)
- **Live Camera Scanner**:
  - Automatic camera enumeration (back/environment vs front/user camera selector).
  - Modern animated laser scan reticle with corner brackets.
  - Synthesized Web Audio beep on scan (zero external MP3 files).
  - Haptic feedback vibration (`navigator.vibrate`) on supported mobile devices.
  - Auto-stop on successful detection to preserve device battery and prevent scan loops.
  - Flashlight / torch toggle support for low-light environments.
- **Image Upload Scanner**:
  - Drag-and-drop zone with visual hover states.
  - File picker supporting PNG, JPG, JPEG, and WEBP formats.
  - **Clipboard Paste (`Ctrl+V`)**: Paste screenshots directly from the clipboard to decode instantly.
- **Decoded Result Actions**:
  - Safe URL opening (`rel="noopener noreferrer"`) with protocol verification.
  - One-click copy with toast notification.
  - Native Web Share API integration on mobile.
  - Quick "Scan Again" button.

---

## 📁 Project Architecture & Folder Structure

```
qr-website/
│
├── index.html               # Main Generator page (Semantic HTML5, Accessible, SEO)
├── scan.html                # Dedicated Scanner page (Camera & File upload)
├── style.css                # Premium modern stylesheet (CSS variables, responsive, animations)
├── script.js                # Modular ES6 application logic for the generator
├── scanner.js               # Modular scanner controller (Html5Qrcode engine, Web Audio)
├── manifest.webmanifest     # PWA manifest for mobile installation
├── README.md                # Comprehensive documentation
└── assets/
    ├── icons/
    │   ├── favicon.svg          # Crisp vector favicon
    │   ├── apple-touch-icon.png # iOS home screen icon (180x180)
    │   ├── icon-192.png         # PWA icon (192x192)
    │   └── icon-512.png         # PWA splash icon (512x512)
    ├── logo/
    │   ├── sanket-qr-logo.svg   # Full typographic brand logo
    │   └── sanket-qr-mark.svg   # Minimalist geometric QR mark
    ├── screenshots/
    │   └── og-banner.svg        # Social card banner for Open Graph / Twitter Cards
    └── vendor/
        ├── qrcode.min.js        # High-performance QR generation engine
        └── html5-qrcode.min.js  # QR scanning & camera stream engine
```

---

## 🚀 Quick Start

Because Sanket QR is built with pure web standards (HTML5, CSS3, ES6), it requires **zero build steps or package managers**.

### Option 1: Live Server (VS Code / Python / Node)
To test camera permissions and ES6 modules locally, serve via any lightweight static server:

```bash
# Using Python 3
python -m http.server 8000

# OR using Node npx
npx serve .

# OR using PHP
php -S localhost:8000
```
Open [http://localhost:8000](http://localhost:8000) in your browser.

> **Note on Camera Permissions**: Browsers enforce that camera access (`getUserMedia`) requires a secure context (`https://` or `http://localhost`). When testing the live camera, always access the site via `localhost` or an HTTPS domain.

---

## 🔒 Security & Privacy

1. **Client-Side Sandbox**: No user input or decoded camera frame leaves the browser.
2. **XSS Protection**: All user input and decoded strings are sanitized via `textContent` and strict URI protocol parsing before DOM insertion.
3. **Safe Redirections**: External links generated from scans open with `target="_blank" rel="noopener noreferrer"` and enforce `http:` / `https:` protocol checks to block dangerous `javascript:` or `data:` URL execution.
4. **Resilient Offline Operation**: Bundled vendor libraries in `assets/vendor/` with seamless CDN fallbacks.

---

## 📱 Mobile & Cross-Browser Compatibility

Tested and optimized for:
- **Mobile Browsers**: Android Chrome, Samsung Internet, iOS Safari, Firefox Mobile.
- **Desktop Browsers**: Google Chrome, Mozilla Firefox, Microsoft Edge, Apple Safari, Brave, Opera.
- **PWA Ready**: Add to Home Screen support with standalone app display and touch icons.

---

## 🧪 Testing Checklist

- [x] **URL Generation**: Auto-adds `https://`, validates format, updates preview instantly.
- [x] **High-Res PNG Download**: Generates 1024px/2048px raster with clean transparency.
- [x] **Vector SVG Download**: Generates clean XML paths scalable for high-DPI printing.
- [x] **Clipboard Copy**: Copies URL text and copies PNG image directly to clipboard.
- [x] **Camera Scanning**: Requests camera permissions cleanly, switches between cameras, auto-detects QR codes.
- [x] **File Upload Scanning**: Drag & drop and file picker decode PNG, JPG, and WEBP.
- [x] **Clipboard Image Paste**: Pressing `Ctrl+V` pastes and scans clipboard screenshots.
- [x] **Mobile Responsive**: Stacks cleanly on screens from 320px up to 4K displays.
- [x] **Audio / Haptic Feedback**: Plays synthesized tone and triggers vibration on detection.
- [x] **No Console Errors**: Clean syntax and graceful error handling.

---

## 📤 How to Push to GitHub

Once you are ready to publish your repository to GitHub, follow these simple steps:

1. **Initialize Git repository**:
   ```bash
   git init
   git add .
   git commit -m "feat: initial commit of Sanket QR production website"
   ```

2. **Create a new repository on GitHub**:
   - Go to [github.com/new](https://github.com/new)
   - Name it `sanket-qr` (or `qr-website`)
   - Leave it public or private, do not initialize with README (you already have one!)

3. **Link remote and push**:
   ```bash
   git branch -M main
   git remote add origin https://github.com/<YOUR_USERNAME>/sanket-qr.git
   git push -u origin main
   ```

4. **Enable GitHub Pages (Optional for 100% Free Hosting)**:
   - In your GitHub repo, go to **Settings** > **Pages**.
   - Under **Build and deployment** > **Branch**, select `main` / `root`.
   - Click **Save**.
   - Your website will be live worldwide at `https://<YOUR_USERNAME>.github.io/sanket-qr/` in seconds!

---

## 📄 License

Distributed under the MIT License. See `LICENSE` for more information.
