/**
 * SANKET QR - Scanner Controller Script
 * Production-ready camera scanner and file decoder using Html5Qrcode
 * Features: Live camera scanning, camera selector, torch/flash toggle,
 * drag-and-drop file decoding, clipboard paste, Web Audio beep synthesis,
 * haptic vibration, safe link opening, history management.
 */

import { Toast } from './script.js';

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
    this.dom.tabCamera.addEventListener('click', () => this.switchMode('camera'));
    this.dom.tabUpload.addEventListener('click', () => this.switchMode('upload'));

    // Camera Controls
    this.dom.btnStartCamera.addEventListener('click', () => this.startCameraScanner());
    this.dom.btnStopCamera.addEventListener('click', () => this.stopCameraScanner());
    this.dom.cameraSelect.addEventListener('change', () => {
      if (this.isCameraScanning) {
        this.stopCameraScanner().then(() => this.startCameraScanner());
      }
    });

    // Torch Toggle
    if (this.dom.btnTorch) {
      this.dom.btnTorch.addEventListener('click', () => this.toggleTorch());
    }

    // Dropzone & File Upload
    this.dom.dropzone.addEventListener('click', () => this.dom.fileInput.click());

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

    this.dom.fileInput.addEventListener('change', (e) => {
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
    this.dom.btnCopyDecoded.addEventListener('click', () => this.copyDecodedText());
    this.dom.btnOpenLink.addEventListener('click', () => this.openDecodedLink());
    if (this.dom.btnShareDecoded) {
      this.dom.btnShareDecoded.addEventListener('click', () => this.shareDecodedText());
    }
    this.dom.btnScanAgain.addEventListener('click', () => this.resetAndScanAgain());

    // History Clear
    this.dom.btnClearHistory?.addEventListener('click', () => {
      ScanHistory.clear();
      this.renderHistory();
      Toast.info('Scan history cleared');
    });
  }

  initHtml5Qrcode() {
    if (typeof window.Html5Qrcode === 'undefined') {
      console.warn('Html5Qrcode library not yet loaded. Will retry on demand.');
      return;
    }
    try {
      this.html5QrCode = new window.Html5Qrcode('reader');
      this.enumerateCameras();
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
    this.dom.cameraPromptBox.style.display = 'none';
    this.dom.btnStartCamera.style.display = 'none';
    this.dom.btnStopCamera.style.display = 'inline-flex';

    const selectedCameraId = this.dom.cameraSelect.value;
    const cameraConfig = selectedCameraId 
      ? { deviceId: { exact: selectedCameraId } }
      : { facingMode: 'environment' };

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
      await this.html5QrCode.start(
        cameraConfig,
        config,
        (decodedText, decodedResult) => this.onScanSuccess(decodedText, decodedResult),
        (errorMessage) => {
          // Parsing frame errors are normal during live camera feed
        }
      );

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
   * Handle scanning an uploaded or pasted image file
   */
  async handleFileUpload(file) {
    if (!file) return;

    const validTypes = ['image/png', 'image/jpeg', 'image/jpg', 'image/webp'];
    if (!validTypes.includes(file.type)) {
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
      const decodedText = await this.html5QrCode.scanFile(file, true);
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
