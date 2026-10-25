/**
 * SANKET QR - Scanner Controller Script
 * Production-ready camera scanner and file decoder using Html5Qrcode
 * Features: Live camera scanning, camera selector, torch/flash toggle,
 * drag-and-drop file decoding, clipboard paste, Web Audio beep synthesis,
 * haptic vibration, safe link opening, history management.
 */

// ==========================================================================
// Toast Notification Utility (Self-contained)
// ==========================================================================
export class Toast {
  static container = null;

  static init() {
    if (!this.container) {
      this.container = document.getElementById('toast-container');
      if (!this.container) {
        this.container = document.createElement('div');
        this.container.id = 'toast-container';
        this.container.className = 'toast-container';
        this.container.setAttribute('aria-live', 'polite');
        document.body.appendChild(this.container);
      }
    }
  }

  static show(message, type = 'success', duration = 3000) {
    this.init();

    const toast = document.createElement('div');
    toast.className = 'toast toast-' + type;
    toast.setAttribute('role', 'alert');

    const iconSvg = type === 'success' 
      ? '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#10b981" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6L9 17l-5-5"/></svg>'
      : type === 'error'
      ? '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#ef4444" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>'
      : '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#3b82f6" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>';

    toast.innerHTML = '<span class="toast-icon">' + iconSvg + '</span><span class="toast-msg">' + this.escapeHTML(message) + '</span>';

    this.container.appendChild(toast);

    setTimeout(() => {
      toast.classList.add('hide');
      setTimeout(() => toast.remove(), 200);
    }, duration);
  }

  static success(msg, duration) { this.show(msg, 'success', duration); }
  static error(msg, duration) { this.show(msg, 'error', duration); }
  static info(msg, duration) { this.show(msg, 'info', duration); }

  static escapeHTML(str) {
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  }
}

// ==========================================================================
// Web Audio Synthesizer (Zero-dependency Scan Beep)
// ==========================================================================
class BeepSound {
  static play() {
    try {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(880, ctx.currentTime); // A5 note
      osc.frequency.exponentialRampToValueAtTime(1760, ctx.currentTime + 0.12);

      gain.gain.setValueAtTime(0.25, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.15);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start();
      osc.stop(ctx.currentTime + 0.15);
    } catch (e) {
      // AudioContext might be blocked until user gesture or not supported
    }
  }
}

// ==========================================================================
// Scan History Manager
// ==========================================================================
class ScanHistory {
  static STORAGE_KEY = 'sanket_qr_scan_history';
  static MAX_ITEMS = 6;

  static getAll() {
    try {
      const data = localStorage.getItem(this.STORAGE_KEY);
      return data ? JSON.parse(data) : [];
    } catch {
      return [];
    }
  }

  static add(text) {
    try {
      let items = this.getAll();
      items = items.filter(i => i.text !== text);
      items.unshift({
        id: Date.now(),
        text,
        isUrl: /^https?:\/\//i.test(text),
        date: new Date().toLocaleDateString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })
      });
      if (items.length > this.MAX_ITEMS) {
        items = items.slice(0, this.MAX_ITEMS);
      }
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(items));
    } catch (e) {
      console.warn('Scan history save failed:', e);
    }
  }

  static clear() {
    try {
      localStorage.removeItem(this.STORAGE_KEY);
    } catch (e) {
      console.warn('Scan history clear failed:', e);
    }
  }
}

// ==========================================================================
// Main Scanner Application
// ==========================================================================
export class SanketScannerApp {
  constructor() {
    this.html5QrCode = null;
    this.isCameraScanning = false;
    this.currentMode = 'camera'; // 'camera' | 'upload'
    this.lastDecodedText = '';
    this.cameras = [];
    this.torchEnabled = false;

    this.cacheDOM();
    this.bindEvents();
    this.initHtml5Qrcode();
    this.renderHistory();
  }

  cacheDOM() {
    this.dom = {
      // Mode tabs
      tabCamera: document.getElementById('tab-mode-camera'),
      tabUpload: document.getElementById('tab-mode-upload'),
      panelCamera: document.getElementById('panel-camera'),
      panelUpload: document.getElementById('panel-upload'),

      // Camera view
      reader: document.getElementById('reader'),
      reticleOverlay: document.getElementById('reticle-overlay'),
      cameraSelect: document.getElementById('camera-select'),
      btnStartCamera: document.getElementById('btn-start-camera'),
      btnStopCamera: document.getElementById('btn-stop-camera'),
      btnTorch: document.getElementById('btn-torch'),
      cameraPromptBox: document.getElementById('camera-prompt-box'),

      // Upload view
      dropzone: document.getElementById('upload-dropzone'),
      fileInput: document.getElementById('file-input'),
      cameraSnapInput: document.getElementById('camera-snap-input'),
      cameraSnapInputUpload: document.getElementById('camera-snap-input-upload'),
      imagePreviewHolder: document.getElementById('image-preview-holder'),
      imagePreview: document.getElementById('image-preview'),

      // Result Card & Placeholder
      resultCard: document.getElementById('decoded-result-card'),
      placeholderCard: document.getElementById('scanner-placeholder-card'),
      decodedContent: document.getElementById('decoded-content'),
      decodedTypeBadge: document.getElementById('decoded-type-badge'),
      btnOpenLink: document.getElementById('btn-open-link'),
      btnCopyDecoded: document.getElementById('btn-copy-decoded'),
      btnShareDecoded: document.getElementById('btn-share-decoded'),
      btnScanAgain: document.getElementById('btn-scan-again'),

      // History
      historySection: document.getElementById('scan-history-section'),
      historyList: document.getElementById('scan-history-list'),
      btnClearHistory: document.getElementById('btn-clear-scan-history')
    };
  }

  bindEvents() {
    // Mode Switching
    this.dom.tabCamera?.addEventListener('click', () => this.switchMode('camera'));
    this.dom.tabUpload?.addEventListener('click', () => this.switchMode('upload'));

    // Camera Controls
    this.dom.btnStartCamera?.addEventListener('click', () => this.startCameraScanner());
    this.dom.btnStopCamera?.addEventListener('click', () => this.stopCameraScanner());
    this.dom.cameraSelect?.addEventListener('change', () => {
      if (this.isCameraScanning) {
        this.stopCameraScanner().then(() => this.startCameraScanner());
      }
    });

    // Torch Toggle
    if (this.dom.btnTorch) {
      this.dom.btnTorch.addEventListener('click', () => this.toggleTorch());
    }

    // Native Camera Snapshots & Android bridge listeners
    const handleSnap = (e) => {
      const files = e.target.files;
      if (files && files.length > 0) {
        this.switchMode('upload');
        this.handleFileUpload(files[0]);
      }
    };
    if (this.dom.cameraSnapInput) {
      this.dom.cameraSnapInput.addEventListener('change', handleSnap);
    }
    if (this.dom.cameraSnapInputUpload) {
      this.dom.cameraSnapInputUpload.addEventListener('change', handleSnap);
    }

    // Android Webview runtime permission callback
    window.onCameraPermissionGranted = () => {
      console.log('Native camera permission granted.');
      this.enumerateCameras().then(() => {
        if (!this.isCameraScanning) {
          this.startCameraScanner();
        }
      });
    };

    // Android Webview native image picked callback (safe fetch without atob size limits)
    window.onNativeImagePicked = async (dataUrl) => {
      console.log('Received native image from Android');
      try {
        this.switchMode('upload');
        const res = await fetch(dataUrl);
        const blob = await res.blob();
        const file = new File([blob], 'sanket_scan_' + Date.now() + '.png', { type: blob.type || 'image/png' });
        this.handleFileUpload(file);
      } catch (err) {
        console.error('Failed to parse native image:', err);
        Toast.error('Could not process image');
      }
    };

    // Dropzone native file click (uses Android WebChromeClient.onShowFileChooser natively, streaming files of any size without Binder Base64 crash)
    this.dom.dropzone?.addEventListener('click', (e) => {
      // Natural label click fires file input directly
    });

    // Dropzone & File Upload (Fallback for standard browsers)
    if (this.dom.dropzone && this.dom.dropzone.tagName !== 'LABEL') {
      this.dom.dropzone.addEventListener('click', () => this.dom.fileInput.click());
    }

    this.dom.dropzone.addEventListener('dragover', (e) => {
      e.preventDefault();
      this.dom.dropzone.classList.add('drag-active');
    });

    ['dragleave', 'dragend'].forEach(evt => {
      this.dom.dropzone.addEventListener(evt, () => {
        this.dom.dropzone.classList.remove('drag-active');
      });
    });

    this.dom.dropzone.addEventListener('drop', (e) => {
      e.preventDefault();
      this.dom.dropzone.classList.remove('drag-active');
      const files = e.dataTransfer?.files;
      if (files && files.length > 0) {
        this.handleFileUpload(files[0]);
      }
    });

    this.dom.fileInput?.addEventListener('change', (e) => {
      const files = e.target.files;
      if (files && files.length > 0) {
        this.handleFileUpload(files[0]);
      }
    });

    // Global Clipboard Paste Support (Ctrl+V)
    window.addEventListener('paste', (e) => {
      const items = e.clipboardData?.items;
      if (!items) return;
      for (let i = 0; i < items.length; i++) {
        if (items[i].type.startsWith('image/')) {
          const file = items[i].getAsFile();
          if (file) {
            this.switchMode('upload');
            this.handleFileUpload(file);
            Toast.info('Pasted image from clipboard');
            break;
          }
        }
      }
    });

    // Result Action Buttons
    this.dom.btnCopyDecoded?.addEventListener('click', () => this.copyDecodedText());
    this.dom.btnOpenLink?.addEventListener('click', () => this.openDecodedLink());
    this.dom.btnShareDecoded?.addEventListener('click', () => this.shareDecodedText());
    this.dom.btnScanAgain?.addEventListener('click', () => this.resetAndScanAgain());

    // History Clear
    this.dom.btnClearHistory?.addEventListener('click', () => {
      ScanHistory.clear();
      this.renderHistory();
      Toast.info('Scan history cleared');
    });
  }

  initHtml5Qrcode() {
    if (typeof window.Html5Qrcode === 'undefined') {
      console.warn('Html5Qrcode library not yet loaded. Setting retry timer.');
      let attempts = 0;
      const interval = setInterval(() => {
        attempts++;
        if (typeof window.Html5Qrcode !== 'undefined') {
          clearInterval(interval);
          this.initHtml5Qrcode();
        } else if (attempts > 30) {
          clearInterval(interval);
        }
      }, 150);
      return;
    }
    try {
      this.html5QrCode = new window.Html5Qrcode('reader');
      this.enumerateCameras().then(() => {
        // Auto-start camera if already permitted
        if (this.currentMode === 'camera') {
          if (window.AndroidBridge && typeof window.AndroidBridge.hasCameraPermission === 'function') {
            if (window.AndroidBridge.hasCameraPermission()) {
              this.startCameraScanner();
            }
          }
        }
      });
    } catch (e) {
      console.error('Failed to init Html5Qrcode:', e);
    }
  }

  async enumerateCameras() {
    try {
      if (!window.Html5Qrcode) return;
      const devices = await window.Html5Qrcode.getCameras();
      this.cameras = devices || [];

      if (this.cameras.length > 0) {
        this.dom.cameraSelect.innerHTML = '';
        this.cameras.forEach((camera, idx) => {
          const opt = document.createElement('option');
          opt.value = camera.id;
          opt.textContent = camera.label || `Camera ${idx + 1}`;
          this.dom.cameraSelect.appendChild(opt);
        });
        // Select back/environment camera by default if available
        const backCamera = this.cameras.find(c => /back|rear|environment/i.test(c.label));
        if (backCamera) {
          this.dom.cameraSelect.value = backCamera.id;
        }
        this.dom.cameraSelect.style.display = this.cameras.length > 1 ? 'block' : 'none';
      }
    } catch (err) {
      console.warn('Could not enumerate cameras yet (needs user permission first):', err);
    }
  }

  switchMode(mode) {
    this.currentMode = mode;
    this.dom.tabCamera.classList.toggle('active', mode === 'camera');
    this.dom.tabUpload.classList.toggle('active', mode === 'upload');

    this.dom.panelCamera.style.display = mode === 'camera' ? 'block' : 'none';
    this.dom.panelUpload.style.display = mode === 'upload' ? 'block' : 'none';

    if (mode === 'upload' && this.isCameraScanning) {
      this.stopCameraScanner();
    }
  }

  async startCameraScanner() {
    if (!this.html5QrCode) {
      this.initHtml5Qrcode();
    }
    if (!this.html5QrCode) {
      Toast.error('Scanner engine is not ready. Please refresh the page.');
      return;
    }

    this.hideResultCard();

    // Check native Android permission if available
    if (window.AndroidBridge && typeof window.AndroidBridge.hasCameraPermission === 'function') {
      if (!window.AndroidBridge.hasCameraPermission()) {
        if (typeof window.AndroidBridge.requestCameraPermission === 'function') {
          window.AndroidBridge.requestCameraPermission();
          Toast.info('Please allow camera permission in the system prompt.');
          return;
        }
      }
    }

    this.dom.cameraPromptBox.style.display = 'none';
    this.dom.btnStartCamera.style.display = 'none';
    this.dom.btnStopCamera.style.display = 'inline-flex';

    // Ensure we have device IDs enumerated
    let targetCamera = this.dom.cameraSelect.value;
    if (!targetCamera) {
      if (this.cameras.length === 0) {
        try {
          const devices = await window.Html5Qrcode.getCameras();
          this.cameras = devices || [];
        } catch (e) {
          console.warn('Pre-scan camera enumeration:', e);
        }
      }
      if (this.cameras.length > 0) {
        const backCam = this.cameras.find(c => /back|rear|environment/i.test(c.label));
        targetCamera = backCam ? backCam.id : this.cameras[0].id;
      }
    }

    const cameraConfig = targetCamera ? targetCamera : { facingMode: 'environment' };

    const config = {
      fps: 15,
      qrbox: (viewfinderWidth, viewfinderHeight) => {
        const edge = Math.min(viewfinderWidth, viewfinderHeight);
        return {
          width: Math.floor(edge * 0.72),
          height: Math.floor(edge * 0.72)
        };
      },
      aspectRatio: 1.0
    };

    try {
      try {
        await this.html5QrCode.start(
          cameraConfig,
          config,
          (decodedText, decodedResult) => this.onScanSuccess(decodedText, decodedResult),
          (errorMessage) => {
            // Parsing frame errors are normal during live camera feed
          }
        );
      } catch (firstErr) {
        console.warn('Initial camera config failed, trying fallback...', firstErr);
        let started = false;
        try {
          // Fallback 1: User facing camera
          await this.html5QrCode.start(
            { facingMode: 'user' },
            config,
            (decodedText, decodedResult) => this.onScanSuccess(decodedText, decodedResult),
            () => {}
          );
          started = true;
        } catch (secondErr) {
          console.warn('User facing fallback failed, enumerating cameras...', secondErr);
          try {
            // Fallback 2: First available hardware device id
            const devices = await window.Html5Qrcode.getCameras();
            if (devices && devices.length > 0) {
              await this.html5QrCode.start(
                devices[0].id,
                config,
                (decodedText, decodedResult) => this.onScanSuccess(decodedText, decodedResult),
                () => {}
              );
              started = true;
            }
          } catch (thirdErr) {
            console.error('All camera fallbacks failed:', thirdErr);
          }
        }
        if (!started) throw firstErr;
      }

      this.isCameraScanning = true;
      this.dom.reticleOverlay.classList.add('active');
      Toast.info('Camera active. Point at any QR code.');

      // Check for torch capability
      if (this.dom.btnTorch) {
        this.dom.btnTorch.style.display = 'inline-flex';
      }

      // Re-enumerate cameras if labels were hidden before permission
      if (this.cameras.length <= 1) {
        this.enumerateCameras();
      }
    } catch (err) {
      console.error('Camera start error:', err);
      this.dom.cameraPromptBox.style.display = 'flex';
      this.dom.btnStartCamera.style.display = 'inline-flex';
      this.dom.btnStopCamera.style.display = 'none';
      this.dom.reticleOverlay.classList.remove('active');

      if (err.name === 'NotAllowedError' || /permission/i.test(String(err))) {
        Toast.error('Camera permission denied. Please allow camera access in browser settings.');
      } else {
        Toast.error('Unable to access camera: ' + (err.message || 'Unknown device error'));
      }
    }
  }

  async stopCameraScanner() {
    if (!this.html5QrCode || !this.isCameraScanning) return;
    try {
      await this.html5QrCode.stop();
      this.isCameraScanning = false;
      this.dom.reticleOverlay.classList.remove('active');
      this.dom.btnStartCamera.style.display = 'inline-flex';
      this.dom.btnStopCamera.style.display = 'none';
      if (this.dom.btnTorch) {
        this.dom.btnTorch.style.display = 'none';
        this.torchEnabled = false;
      }
    } catch (err) {
      console.warn('Error stopping camera:', err);
    }
  }

  async toggleTorch() {
    try {
      if (!this.html5QrCode || !this.isCameraScanning) return;
      this.torchEnabled = !this.torchEnabled;
      await this.html5QrCode.applyVideoConstraints({
        advanced: [{ torch: this.torchEnabled }]
      });
      Toast.info(`Flashlight ${this.torchEnabled ? 'ON' : 'OFF'}`);
    } catch (err) {
      Toast.error('Flashlight / torch not supported on this device');
    }
  }

  /**
   * Comprehensive 5-Stage Multi-Engine QR Decoder (ZXing + jsQR + Rotations + Downscales)
   */
  loadImageElement(file) {
    return new Promise((resolve) => {
      const img = new Image();
      const url = URL.createObjectURL(file);
      img.onload = () => {
        URL.revokeObjectURL(url);
        resolve(img);
      };
      img.onerror = () => {
        URL.revokeObjectURL(url);
        resolve(null);
      };
      img.src = url;
    });
  }

  calculateAspectRatioFit(srcWidth, srcHeight, maxDimension) {
    if (srcWidth <= maxDimension && srcHeight <= maxDimension) {
      return { width: srcWidth, height: srcHeight };
    }
    if (srcWidth > srcHeight) {
      return {
        width: maxDimension,
        height: Math.round((srcHeight * maxDimension) / srcWidth)
      };
    } else {
      return {
        width: Math.round((srcWidth * maxDimension) / srcHeight),
        height: maxDimension
      };
    }
  }

  scanWithJsQR(img, width, height, rotationAngle = 0) {
    if (typeof window.jsQR !== 'function') return null;
    try {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');

      if (rotationAngle === 90 || rotationAngle === 270) {
        canvas.width = height;
        canvas.height = width;
      } else {
        canvas.width = width;
        canvas.height = height;
      }

      ctx.save();
      if (rotationAngle === 90) {
        ctx.translate(canvas.width, 0);
        ctx.rotate(Math.PI / 2);
      } else if (rotationAngle === 180) {
        ctx.translate(canvas.width, canvas.height);
        ctx.rotate(Math.PI);
      } else if (rotationAngle === 270) {
        ctx.translate(0, canvas.height);
        ctx.rotate((3 * Math.PI) / 2);
      }

      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = 'high';
      ctx.drawImage(img, 0, 0, width, height);
      ctx.restore();

      const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const code = window.jsQR(imgData.data, canvas.width, canvas.height, {
        inversionAttempts: 'attemptBoth'
      });

      if (code && code.data && code.data.trim()) {
        return code.data.trim();
      }
    } catch (e) {
      // ignore
    }
    return null;
  }

  drawToBlob(img, width, height, rotationAngle = 0) {
    return new Promise((resolve) => {
      try {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');

        if (rotationAngle === 90 || rotationAngle === 270) {
          canvas.width = height;
          canvas.height = width;
        } else {
          canvas.width = width;
          canvas.height = height;
        }

        ctx.save();
        if (rotationAngle === 90) {
          ctx.translate(canvas.width, 0);
          ctx.rotate(Math.PI / 2);
        } else if (rotationAngle === 180) {
          ctx.translate(canvas.width, canvas.height);
          ctx.rotate(Math.PI);
        } else if (rotationAngle === 270) {
          ctx.translate(0, canvas.height);
          ctx.rotate((3 * Math.PI) / 2);
        }

        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';
        ctx.drawImage(img, 0, 0, width, height);
        ctx.restore();

        canvas.toBlob((blob) => {
          if (blob) {
            resolve(new File([blob], 'render_' + width + '.png', { type: 'image/png' }));
          } else {
            resolve(null);
          }
        }, 'image/png');
      } catch (err) {
        resolve(null);
      }
    });
  }

  async scanWithFallback(file) {
    // Stage 1: Fast direct scan with Html5Qrcode (ZXing) in-memory
    try {
      if (this.html5QrCode) {
        const res = await this.html5QrCode.scanFile(file, false);
        if (res && res.trim()) return res.trim();
      }
    } catch (e1) {
      console.log('Stage 1 (ZXing direct) failed:', e1);
    }

    // Load file into an HTML Image element to access pixel dimensions
    const img = await this.loadImageElement(file);
    if (!img) {
      throw new Error('Unable to read image file');
    }

    const naturalWidth = img.naturalWidth || img.width;
    const naturalHeight = img.naturalHeight || img.height;

    // Stage 2: jsQR scan at original resolution (attempting both normal and inverted colors)
    if (typeof window.jsQR === 'function') {
      try {
        const text = this.scanWithJsQR(img, naturalWidth, naturalHeight, 0);
        if (text) return text;
      } catch (e2) {
        console.log('Stage 2 (jsQR original) failed:', e2);
      }
    }

    // Stage 3: Multi-resolution downscaling (1200px, 800px, 500px)
    // Mobile photos are often 4000x3000 where QR modules are too large for binarizers
    const targetScales = [1200, 800, 500].filter(scale => scale < Math.max(naturalWidth, naturalHeight));
    
    for (const maxDim of targetScales) {
      const { width, height } = this.calculateAspectRatioFit(naturalWidth, naturalHeight, maxDim);
      
      // Try jsQR at scaled dimension
      if (typeof window.jsQR === 'function') {
        const text = this.scanWithJsQR(img, width, height, 0);
        if (text) return text;
      }

      // Try Html5Qrcode at scaled dimension
      try {
        const scaledBlob = await this.drawToBlob(img, width, height, 0);
        if (scaledBlob && this.html5QrCode) {
          const res = await this.html5QrCode.scanFile(scaledBlob, false);
          if (res && res.trim()) return res.trim();
        }
      } catch (eScale) {
        // continue
      }
    }

    // Stage 4: Rotational Scan (90 deg, 180 deg, 270 deg)
    // Solves camera EXIF orientation issues and rotated screenshots
    const rotations = [90, 180, 270];
    const rotScale = Math.min(1000, Math.max(naturalWidth, naturalHeight));
    const { width: rw, height: rh } = this.calculateAspectRatioFit(naturalWidth, naturalHeight, rotScale);

    for (const angle of rotations) {
      // Try jsQR with rotation
      if (typeof window.jsQR === 'function') {
        const text = this.scanWithJsQR(img, rw, rh, angle);
        if (text) return text;
      }

      // Try ZXing with rotation
      try {
        const rotBlob = await this.drawToBlob(img, rw, rh, angle);
        if (rotBlob && this.html5QrCode) {
          const res = await this.html5QrCode.scanFile(rotBlob, false);
          if (res && res.trim()) return res.trim();
        }
      } catch (eRot) {
        // continue
      }
    }

    // Stage 5: Contrast & Brightness Enhancement (for dark, low-contrast, or washed-out photos)
    try {
      const enhancedCanvas = document.createElement('canvas');
      const { width: ew, height: eh } = this.calculateAspectRatioFit(naturalWidth, naturalHeight, 800);
      enhancedCanvas.width = ew;
      enhancedCanvas.height = eh;
      const ctx = enhancedCanvas.getContext('2d');
      ctx.filter = 'grayscale(100%) contrast(180%) brightness(105%)';
      ctx.drawImage(img, 0, 0, ew, eh);

      if (typeof window.jsQR === 'function') {
        const imgData = ctx.getImageData(0, 0, ew, eh);
        const code = window.jsQR(imgData.data, ew, eh, { inversionAttempts: 'attemptBoth' });
        if (code && code.data && code.data.trim()) {
          return code.data.trim();
        }
      }

      // Try Html5Qrcode with enhanced canvas
      const enhancedFile = await new Promise(resolve => {
        enhancedCanvas.toBlob(blob => {
          resolve(blob ? new File([blob], 'enhanced.png', { type: 'image/png' }) : null);
        }, 'image/png');
      });
      if (enhancedFile && this.html5QrCode) {
        const res = await this.html5QrCode.scanFile(enhancedFile, false);
        if (res && res.trim()) return res.trim();
      }
    } catch (eContrast) {
      console.log('Stage 5 failed:', eContrast);
    }

    throw new Error('No QR code detected in this image');
  }

  /**
   * Handle scanning an uploaded or pasted image file
   */
  async handleFileUpload(file) {
    if (!file) return;

    const isImage = (file.type && file.type.startsWith('image/')) || 
                    /\.(png|jpe?g|webp|bmp|gif|svg)$/i.test(file.name || '') ||
                    !file.type; // Some mobile file pickers return empty MIME type
    if (!isImage) {
      Toast.error('Unsupported format. Please upload PNG, JPG, or WEBP images.');
      return;
    }

    if (!this.html5QrCode) {
      this.initHtml5Qrcode();
    }

    // Show image preview
    const reader = new FileReader();
    reader.onload = (e) => {
      this.dom.imagePreview.src = e.target.result;
      this.dom.imagePreviewHolder.classList.add('visible');
    };
    reader.readAsDataURL(file);

    Toast.info('Decoding image...');

    try {
      const decodedText = await this.scanWithFallback(file);
      this.onScanSuccess(decodedText, null);
    } catch (err) {
      console.warn('File decode error:', err);
      Toast.error('No QR code detected in this image. Ensure good lighting & contrast.');
    }
  }

  /**
   * Scan success handler
   */
  async onScanSuccess(decodedText, decodedResult) {
    if (!decodedText || decodedText === this.lastDecodedText) return;

    this.lastDecodedText = decodedText;

    // Trigger audio beep and subtle haptic feedback
    BeepSound.play();
    if (navigator.vibrate) {
      navigator.vibrate([100]);
    }

    // Stop camera to conserve battery and avoid continuous scan triggers
    if (this.isCameraScanning) {
      await this.stopCameraScanner();
    }

    // Save to scan history
    ScanHistory.add(decodedText);
    this.renderHistory();

    // Display Result
    this.displayResult(decodedText);
    Toast.success('QR Code successfully detected!');
  }

  /**
   * Render decoded result safely to UI
   */
  displayResult(text) {
    this.dom.decodedContent.textContent = text;

    const isUrl = /^https?:\/\//i.test(text.trim());

    if (isUrl) {
      this.dom.decodedTypeBadge.textContent = 'Website Link (URL)';
      this.dom.btnOpenLink.style.display = 'inline-flex';
      // Verify valid URL before assigning href
      try {
        const parsed = new URL(text.trim());
        if (parsed.protocol === 'http:' || parsed.protocol === 'https:') {
          this.dom.btnOpenLink.href = parsed.toString();
        } else {
          this.dom.btnOpenLink.style.display = 'none';
        }
      } catch {
        this.dom.btnOpenLink.style.display = 'none';
      }
    } else if (/^mailto:/i.test(text)) {
      this.dom.decodedTypeBadge.textContent = 'Email';
      this.dom.btnOpenLink.style.display = 'inline-flex';
      this.dom.btnOpenLink.href = text.trim();
    } else if (/^tel:/i.test(text)) {
      this.dom.decodedTypeBadge.textContent = 'Phone Number';
      this.dom.btnOpenLink.style.display = 'inline-flex';
      this.dom.btnOpenLink.href = text.trim();
    } else if (/^WIFI:/i.test(text)) {
      this.dom.decodedTypeBadge.textContent = 'Wi-Fi Network';
      this.dom.btnOpenLink.style.display = 'none';
    } else {
      this.dom.decodedTypeBadge.textContent = 'Plain Text';
      this.dom.btnOpenLink.style.display = 'none';
    }

    // Show result card and hide placeholder
    if (this.dom.placeholderCard) this.dom.placeholderCard.style.display = 'none';
    this.dom.resultCard.classList.add('visible');
    this.dom.resultCard.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }

  hideResultCard() {
    this.dom.resultCard.classList.remove('visible');
    if (this.dom.placeholderCard) this.dom.placeholderCard.style.display = 'block';
    this.lastDecodedText = '';
  }

  async copyDecodedText() {
    if (!this.lastDecodedText) return;
    try {
      await navigator.clipboard.writeText(this.lastDecodedText);
      Toast.success('Decoded text copied to clipboard!');
    } catch {
      Toast.error('Could not copy to clipboard.');
    }
  }

  openDecodedLink() {
    if (!this.lastDecodedText) return;
    try {
      const url = new URL(this.lastDecodedText.trim());
      if (url.protocol === 'http:' || url.protocol === 'https:') {
        window.open(url.toString(), '_blank', 'noopener,noreferrer');
      }
    } catch {
      Toast.error('Invalid URL protocol');
    }
  }

  async shareDecodedText() {
    if (!this.lastDecodedText) return;
    if (navigator.share) {
      try {
        await navigator.share({
          title: 'Decoded QR Code - Sanket QR',
          text: this.lastDecodedText,
          url: /^https?:\/\//i.test(this.lastDecodedText) ? this.lastDecodedText : undefined
        });
        Toast.success('Shared successfully!');
      } catch (err) {
        if (err.name !== 'AbortError') {
          Toast.error('Share cancelled or failed');
        }
      }
    } else {
      this.copyDecodedText();
    }
  }

  resetAndScanAgain() {
    this.hideResultCard();
    this.dom.imagePreviewHolder.classList.remove('visible');
    this.dom.imagePreview.src = '';
    this.dom.fileInput.value = '';

    if (this.currentMode === 'camera') {
      this.startCameraScanner();
    } else {
      Toast.info('Ready to scan next image');
    }
  }

  renderHistory() {
    if (!this.dom.historyList) return;
    const items = ScanHistory.getAll();

    if (!items || items.length === 0) {
      this.dom.historySection.style.display = 'none';
      return;
    }

    this.dom.historySection.style.display = 'block';
    this.dom.historyList.innerHTML = '';

    items.forEach(item => {
      const card = document.createElement('div');
      card.className = 'history-item';

      const typeBadge = `<span class="badge-tag" style="padding: 2px 8px; font-size: 0.7rem;">${item.isUrl ? 'URL' : 'Text'}</span>`;

      card.innerHTML = `
        <div class="history-item-info">
          <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 2px;">
            ${typeBadge}
            <span class="history-item-title" title="${Toast.escapeHTML(item.text)}">${Toast.escapeHTML(item.text)}</span>
          </div>
          <span class="history-item-date">${item.date}</span>
        </div>
        <div class="history-item-actions">
          <button class="history-btn-mini btn-copy-scan" title="Copy text" aria-label="Copy text">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>
          </button>
        </div>
      `;

      card.querySelector('.btn-copy-scan').addEventListener('click', async () => {
        await navigator.clipboard.writeText(item.text);
        Toast.success('Copied from history!');
      });

      this.dom.historyList.appendChild(card);
    });
  }
}

// Initialize on DOM load
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => new SanketScannerApp());
} else {
  new SanketScannerApp();
}
