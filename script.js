/**
 * SANKET QR - Main Generator Script
 * Production-ready, client-side QR code generator
 * Features: High-resolution PNG/SVG export, URL auto-formatting,
 * clipboard image & text copying, extensible content types, history storage.
 */

// ==========================================================================
// Toast Notification Utility
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

  /**
   * Show a toast notification
   * @param {string} message - Text to display
   * @param {'success'|'error'|'info'} type - Type of toast
   * @param {number} duration - Milliseconds before auto-dismiss
   */
  static show(message, type = 'success', duration = 3000) {
    this.init();

    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.setAttribute('role', 'alert');

    // Icon based on type
    const iconSvg = type === 'success' 
      ? `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#10b981" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6L9 17l-5-5"/></svg>`
      : type === 'error'
      ? `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#ef4444" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>`
      : `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#3b82f6" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>`;

    toast.innerHTML = `
      <span class="toast-icon">${iconSvg}</span>
      <span class="toast-msg">${this.escapeHTML(message)}</span>
    `;

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
// URL Validator & Content Formatter
// ==========================================================================
export class InputFormatter {
  /**
   * Sanitize and format a URL. Auto-prefixes https:// if missing.
   * @param {string} raw - User input string
   * @returns {{isValid: boolean, formatted: string, error?: string}}
   */
  static formatURL(raw) {
    if (!raw || !raw.trim()) {
      return { isValid: false, formatted: '', error: 'Please enter a website URL.' };
    }

    let trimmed = raw.trim();

    // Check for common internal or illegal spaces
    if (/\s/.test(trimmed)) {
      return { isValid: false, formatted: '', error: 'URLs cannot contain whitespace.' };
    }

    // Auto-add https:// if protocol is missing
    if (!/^https?:\/\//i.test(trimmed)) {
      trimmed = 'https://' + trimmed;
    }

    try {
      const parsed = new URL(trimmed);
      // Ensure there is at least a dot in hostname (e.g., example.com) or it's localhost
      if (!parsed.hostname.includes('.') && parsed.hostname !== 'localhost') {
        return { isValid: false, formatted: '', error: 'Please enter a valid domain (e.g. example.com).' };
      }
      return { isValid: true, formatted: parsed.toString() };
    } catch {
      return { isValid: false, formatted: '', error: 'Invalid URL format. Please check and try again.' };
    }
  }

  /**
   * Build Wi-Fi QR format: WIFI:S:<SSID>;T:<WPA|WEP|nopass>;P:<password>;H:<true|false>;;
   */
  static formatWiFi({ ssid, password, type, hidden }) {
    if (!ssid || !ssid.trim()) {
      return { isValid: false, formatted: '', error: 'Wi-Fi network name (SSID) is required.' };
    }
    const esc = (s) => (s || '').replace(/([\\;,:"])/g, '\\$1');
    const auth = type === 'nopass' ? 'nopass' : type;
    const formatted = `WIFI:S:${esc(ssid.trim())};T:${auth};P:${esc(password || '')};H:${hidden ? 'true' : 'false'};;`;
    return { isValid: true, formatted };
  }

  /**
   * Build Email mailto: string
   */
  static formatEmail({ to, subject, body }) {
    if (!to || !to.trim() || !to.includes('@')) {
      return { isValid: false, formatted: '', error: 'Please enter a valid recipient email address.' };
    }
    const params = new URLSearchParams();
    if (subject) params.set('subject', subject);
    if (body) params.set('body', body);
    const query = params.toString();
    const formatted = `mailto:${to.trim()}${query ? '?' + query : ''}`;
    return { isValid: true, formatted };
  }

  /**
   * Build Phone tel: string
   */
  static formatPhone(phone) {
    if (!phone || !phone.trim()) {
      return { isValid: false, formatted: '', error: 'Please enter a phone number.' };
    }
    const clean = phone.trim().replace(/[^\d+]/g, '');
    return { isValid: true, formatted: `tel:${clean}` };
  }

  /**
   * Build vCard format
   */
  static formatVCard({ firstName, lastName, phone, email, company, title }) {
    if (!firstName?.trim() && !lastName?.trim()) {
      return { isValid: false, formatted: '', error: 'First or last name is required for contact card.' };
    }
    const lines = [
      'BEGIN:VCARD',
      'VERSION:3.0',
      `N:${lastName || ''};${firstName || ''};;;`,
      `FN:${(firstName || '') + ' ' + (lastName || '')}`.trim()
    ];
    if (phone) lines.push(`TEL;TYPE=CELL:${phone.trim()}`);
    if (email) lines.push(`EMAIL:${email.trim()}`);
    if (company) lines.push(`ORG:${company.trim()}`);
    if (title) lines.push(`TITLE:${title.trim()}`);
    lines.push('END:VCARD');
    return { isValid: true, formatted: lines.join('\n') };
  }
}

// ==========================================================================
// LocalStorage History Manager
// ==========================================================================
export class HistoryManager {
  static STORAGE_KEY = 'sanket_qr_history';
  static MAX_ITEMS = 6;

  static getAll() {
    try {
      const data = localStorage.getItem(this.STORAGE_KEY);
      return data ? JSON.parse(data) : [];
    } catch {
      return [];
    }
  }

  static add(entry) {
    try {
      let items = this.getAll();
      // Remove duplicate if same text exists
      items = items.filter(i => i.text !== entry.text);
      items.unshift({
        id: Date.now(),
        text: entry.text,
        type: entry.type || 'URL',
        date: new Date().toLocaleDateString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })
      });
      if (items.length > this.MAX_ITEMS) {
        items = items.slice(0, this.MAX_ITEMS);
      }
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(items));
    } catch (e) {
      console.warn('LocalStorage save failed:', e);
    }
  }

  static clear() {
    try {
      localStorage.removeItem(this.STORAGE_KEY);
    } catch (e) {
      console.warn('LocalStorage clear failed:', e);
    }
  }
}

// ==========================================================================
// Main Application Controller
// ==========================================================================
export class SanketQRApp {
  constructor() {
    this.currentPayload = '';
    this.currentType = 'url';
    this.svgString = '';
    this.canvas = document.createElement('canvas');

    this.cacheDOM();
    this.bindEvents();
    this.renderHistory();

    // Check if initial URL param is provided (e.g. ?url=https://...)
    const urlParam = new URLSearchParams(window.location.search).get('text') || new URLSearchParams(window.location.search).get('url');
    if (urlParam) {
      this.dom.urlInput.value = urlParam;
      this.handleGenerate();
    }
  }

  cacheDOM() {
    this.dom = {
      // Tabs
      tabBtns: document.querySelectorAll('.tab-btn'),
      tabContents: document.querySelectorAll('.tab-content'),

      // Inputs
      urlInput: document.getElementById('url-input'),
      urlClearBtn: document.getElementById('url-clear-btn'),
      urlPasteBtn: document.getElementById('url-paste-btn'),
      urlErrorMsg: document.getElementById('url-error-msg'),

      // Text tab
      textInput: document.getElementById('text-input'),

      // WiFi tab
      wifiSsid: document.getElementById('wifi-ssid'),
      wifiPass: document.getElementById('wifi-pass'),
      wifiType: document.getElementById('wifi-type'),
      wifiHidden: document.getElementById('wifi-hidden'),

      // Email tab
      emailTo: document.getElementById('email-to'),
      emailSub: document.getElementById('email-sub'),
      emailBody: document.getElementById('email-body'),

      // Phone tab
      phoneInput: document.getElementById('phone-input'),

      // vCard tab
      vcardFirst: document.getElementById('vcard-first'),
      vcardLast: document.getElementById('vcard-last'),
      vcardPhone: document.getElementById('vcard-phone'),
      vcardEmail: document.getElementById('vcard-email'),
      vcardOrg: document.getElementById('vcard-org'),

      // Settings
      settingsToggle: document.getElementById('settings-toggle'),
      settingsDrawer: document.getElementById('settings-drawer'),
      fgColor: document.getElementById('fg-color'),
      bgColor: document.getElementById('bg-color'),
      qrSize: document.getElementById('qr-size'),
      qrEcc: document.getElementById('qr-ecc'),

      // Primary Action
      generateBtn: document.getElementById('generate-btn'),

      // Preview Area
      qrDisplayBox: document.getElementById('qr-display-box'),
      emptyState: document.getElementById('empty-state'),
      loadingState: document.getElementById('loading-state'),
      qrRenderedWrapper: document.getElementById('qr-rendered-wrapper'),
      canvasHolder: document.getElementById('canvas-holder'),
      qrSummaryText: document.getElementById('qr-summary-text'),

      // Result Actions
      btnDownloadPng: document.getElementById('btn-download-png'),
      btnDownloadSvg: document.getElementById('btn-download-svg'),
      btnCopyLink: document.getElementById('btn-copy-link'),
      btnCopyImage: document.getElementById('btn-copy-image'),
      btnGenerateAgain: document.getElementById('btn-generate-again'),

      // History
      historySection: document.getElementById('history-section'),
      historyList: document.getElementById('history-list'),
      btnClearHistory: document.getElementById('btn-clear-history')
    };
  }

  bindEvents() {
    // Tab switching
    this.dom.tabBtns.forEach(btn => {
      btn.addEventListener('click', () => this.switchTab(btn.dataset.tab));
    });

    // URL input handlers
    this.dom.urlInput.addEventListener('input', () => {
      this.clearFieldError();
      const hasVal = Boolean(this.dom.urlInput.value);
      this.dom.urlClearBtn.classList.toggle('visible', hasVal);
    });

    this.dom.urlInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        this.handleGenerate();
      }
    });

    this.dom.urlClearBtn.addEventListener('click', () => {
      this.dom.urlInput.value = '';
      this.dom.urlClearBtn.classList.remove('visible');
      this.clearFieldError();
      this.dom.urlInput.focus();
    });

    this.dom.urlPasteBtn.addEventListener('click', async () => {
      try {
        const text = await navigator.clipboard.readText();
        if (text) {
          this.dom.urlInput.value = text.trim();
          this.dom.urlClearBtn.classList.add('visible');
          this.clearFieldError();
          Toast.info('URL pasted from clipboard');
          this.handleGenerate();
        }
      } catch (err) {
        Toast.error('Please allow clipboard permissions or paste manually');
      }
    });

    // Customization Drawer Accordion
    this.dom.settingsToggle.addEventListener('click', () => {
      const isExpanded = this.dom.settingsToggle.getAttribute('aria-expanded') === 'true';
      this.dom.settingsToggle.setAttribute('aria-expanded', !isExpanded);
      this.dom.settingsDrawer.classList.toggle('open', !isExpanded);
    });

    // Re-render QR code dynamically if settings change and a QR is already generated
    const onSettingChange = () => {
      if (this.currentPayload) {
        this.renderQRCode(this.currentPayload);
      }
    };
    this.dom.fgColor.addEventListener('input', onSettingChange);
    this.dom.bgColor.addEventListener('input', onSettingChange);
    this.dom.qrEcc.addEventListener('change', onSettingChange);
    this.dom.qrSize.addEventListener('change', onSettingChange);

    // Main generate button
    this.dom.generateBtn.addEventListener('click', () => this.handleGenerate());

    // Download & Copy buttons
    this.dom.btnDownloadPng.addEventListener('click', () => this.downloadPNG());
    this.dom.btnDownloadSvg.addEventListener('click', () => this.downloadSVG());
    this.dom.btnCopyLink.addEventListener('click', () => this.copyContent());
    this.dom.btnCopyImage.addEventListener('click', () => this.copyImage());
    this.dom.btnGenerateAgain.addEventListener('click', () => this.resetGenerator());

    // History Clear
    this.dom.btnClearHistory?.addEventListener('click', () => {
      HistoryManager.clear();
      this.renderHistory();
      Toast.info('History cleared');
    });
  }

  switchTab(tabId) {
    this.currentType = tabId;
    this.dom.tabBtns.forEach(btn => btn.classList.toggle('active', btn.dataset.tab === tabId));
    this.dom.tabContents.forEach(content => content.classList.toggle('active', content.id === `tab-${tabId}`));
    this.clearFieldError();
  }

  showFieldError(message) {
    if (this.dom.urlErrorMsg) {
      this.dom.urlErrorMsg.textContent = message;
      this.dom.urlErrorMsg.classList.add('visible');
    }
    Toast.error(message);
  }

  clearFieldError() {
    if (this.dom.urlErrorMsg) {
      this.dom.urlErrorMsg.textContent = '';
      this.dom.urlErrorMsg.classList.remove('visible');
    }
  }

  /**
   * Validate and resolve the current payload from active tab
   */
  resolvePayload() {
    switch (this.currentType) {
      case 'url': {
        const res = InputFormatter.formatURL(this.dom.urlInput.value);
        if (!res.isValid) {
          this.showFieldError(res.error);
          return null;
        }
        // Sync back auto-added https:// to the input box for user clarity
        this.dom.urlInput.value = res.formatted;
        return { text: res.formatted, type: 'URL' };
      }

      case 'text': {
        const val = this.dom.textInput.value.trim();
        if (!val) {
          Toast.error('Please enter some text to generate a QR code.');
          return null;
        }
        return { text: val, type: 'Text' };
      }

      case 'wifi': {
        const res = InputFormatter.formatWiFi({
          ssid: this.dom.wifiSsid.value,
          password: this.dom.wifiPass.value,
          type: this.dom.wifiType.value,
          hidden: this.dom.wifiHidden.checked
        });
        if (!res.isValid) {
          Toast.error(res.error);
          return null;
        }
        return { text: res.formatted, type: 'Wi-Fi' };
      }

      case 'email': {
        const res = InputFormatter.formatEmail({
          to: this.dom.emailTo.value,
          subject: this.dom.emailSub.value,
          body: this.dom.emailBody.value
        });
        if (!res.isValid) {
          Toast.error(res.error);
          return null;
        }
        return { text: res.formatted, type: 'Email' };
      }

      case 'phone': {
        const res = InputFormatter.formatPhone(this.dom.phoneInput.value);
        if (!res.isValid) {
          Toast.error(res.error);
          return null;
        }
        return { text: res.formatted, type: 'Phone' };
      }

      case 'vcard': {
        const res = InputFormatter.formatVCard({
          firstName: this.dom.vcardFirst.value,
          lastName: this.dom.vcardLast.value,
          phone: this.dom.vcardPhone.value,
          email: this.dom.vcardEmail.value,
          company: this.dom.vcardOrg.value
        });
        if (!res.isValid) {
          Toast.error(res.error);
          return null;
        }
        return { text: res.formatted, type: 'Contact' };
      }

      default:
        return null;
    }
  }

  async handleGenerate() {
    this.clearFieldError();
    const resolved = this.resolvePayload();
    if (!resolved) return;

    this.currentPayload = resolved.text;

    // Show loading state
    this.dom.emptyState.style.display = 'none';
    this.dom.qrRenderedWrapper.classList.remove('visible');
    this.dom.loadingState.classList.add('visible');
    this.dom.generateBtn.disabled = true;

    // Short simulated micro-delay for smooth animation feedback
    await new Promise(r => setTimeout(r, 120));

    try {
      await this.renderQRCode(this.currentPayload);

      // Save to history
      HistoryManager.add(resolved);
      this.renderHistory();

      Toast.success('QR Code generated successfully!');
    } catch (err) {
      console.error('Generation error:', err);
      Toast.error('Failed to generate QR code. Try shorter content or lower ECC.');
    } finally {
      this.dom.loadingState.classList.remove('visible');
      this.dom.generateBtn.disabled = false;
    }
  }

  /**
   * Render QR Code to Canvas and generate vector SVG markup
   */
  async renderQRCode(text) {
    if (typeof window.QRCode === 'undefined') {
      throw new Error('QRCode library not loaded.');
    }

    const fgColor = this.dom.fgColor.value || '#000000';
    const bgColor = this.dom.bgColor.value || '#ffffff';
    const ecc = this.dom.qrEcc.value || 'M';
    const size = parseInt(this.dom.qrSize.value, 10) || 1024;

    // 1. Render High-Resolution Raster to Canvas
    this.canvas.width = size;
    this.canvas.height = size;

    await new Promise((resolve, reject) => {
      window.QRCode.toCanvas(
        this.canvas,
        text,
        {
          width: size,
          margin: 2,
          errorCorrectionLevel: ecc,
          color: {
            dark: fgColor,
            light: bgColor
          }
        },
        (error) => {
          if (error) reject(error);
          else resolve();
        }
      );
    });

    // 2. Render Pure Vector SVG for scalable print
    this.svgString = await new Promise((resolve, reject) => {
      window.QRCode.toString(
        text,
        {
          type: 'svg',
          margin: 2,
          errorCorrectionLevel: ecc,
          color: {
            dark: fgColor,
            light: bgColor
          }
        },
        (error, string) => {
          if (error) reject(error);
          else resolve(string);
        }
      );
    });

    // Update Preview DOM
    this.dom.canvasHolder.innerHTML = '';
    // Clone or append preview display (responsive scaled CSS)
    const previewCanvas = document.createElement('canvas');
    previewCanvas.width = 512;
    previewCanvas.height = 512;
    const ctx = previewCanvas.getContext('2d');
    ctx.drawImage(this.canvas, 0, 0, 512, 512);

    this.dom.canvasHolder.appendChild(previewCanvas);
    this.dom.qrSummaryText.textContent = text;

    this.dom.qrDisplayBox.classList.add('has-qr');
    this.dom.emptyState.style.display = 'none';
    this.dom.qrRenderedWrapper.classList.add('visible');
  }

  /**
   * Download high-resolution PNG
   */
  downloadPNG() {
    if (!this.canvas) return;
    try {
      const filename = `sanket-qr-${Date.now()}.png`;

      // 1. Check for native Android Bridge
      if (window.AndroidBridge && typeof window.AndroidBridge.saveImageToGallery === 'function') {
        try {
          const dataUrl = this.canvas.toDataURL('image/png');
          const success = window.AndroidBridge.saveImageToGallery(dataUrl, filename);
          if (success) {
            Toast.success('QR code saved to Gallery & Downloads!');
            return;
          }
        } catch (bridgeErr) {
          console.warn('AndroidBridge save error, falling back to blob:', bridgeErr);
        }
      }

      // 2. Standard browser Blob download fallback
      this.canvas.toBlob((blob) => {
        if (!blob) {
          Toast.error('Could not create PNG blob');
          return;
        }
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        Toast.success('PNG downloaded in high resolution!');
      }, 'image/png');
    } catch (e) {
      console.error(e);
      Toast.error('PNG download failed');
    }
  }

  /**
   * Download vector SVG
   */
  downloadSVG() {
    if (!this.svgString) {
      Toast.error('SVG not available');
      return;
    }
    try {
      const filename = `sanket-qr-${Date.now()}.svg`;

      // 1. Check for native Android Bridge
      if (window.AndroidBridge && typeof window.AndroidBridge.saveFileToDownloads === 'function') {
        try {
          const base64Svg = 'data:image/svg+xml;base64,' + btoa(unescape(encodeURIComponent(this.svgString)));
          const success = window.AndroidBridge.saveFileToDownloads(base64Svg, filename, 'image/svg+xml');
          if (success) {
            Toast.success('Vector SVG saved to Downloads!');
            return;
          }
        } catch (bridgeErr) {
          console.warn('AndroidBridge save error, falling back to blob:', bridgeErr);
        }
      }

      // 2. Standard browser Blob download fallback
      const blob = new Blob([this.svgString], { type: 'image/svg+xml;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      Toast.success('Vector SVG downloaded for printing!');
    } catch (e) {
      console.error(e);
      Toast.error('SVG download failed');
    }
  }

  /**
   * Copy the encoded text/URL to clipboard
   */
  async copyContent() {
    if (!this.currentPayload) return;
    try {
      await navigator.clipboard.writeText(this.currentPayload);
      Toast.success('Content copied to clipboard!');
    } catch (err) {
      // Fallback
      const ta = document.createElement('textarea');
      ta.value = this.currentPayload;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand('copy');
      document.body.removeChild(ta);
      Toast.success('Content copied to clipboard!');
    }
  }

  /**
   * Copy the generated QR code image directly to clipboard
   */
  async copyImage() {
    if (!this.canvas) return;
    try {
      this.canvas.toBlob(async (blob) => {
        if (!blob) {
          Toast.error('Unable to create image blob');
          return;
        }
        if (navigator.clipboard && window.ClipboardItem) {
          const item = new ClipboardItem({ 'image/png': blob });
          await navigator.clipboard.write([item]);
          Toast.success('QR Code image copied to clipboard!');
        } else {
          Toast.info('Image copying not supported in this browser. Use Download instead.');
        }
      }, 'image/png');
    } catch (err) {
      console.warn('Copy image error:', err);
      Toast.error('Could not copy image. Browser permission denied.');
    }
  }

  /**
   * Reset generator to initial state
   */
  resetGenerator() {
    this.currentPayload = '';
    this.dom.urlInput.value = '';
    this.dom.urlClearBtn.classList.remove('visible');
    this.clearFieldError();

    this.dom.qrDisplayBox.classList.remove('has-qr');
    this.dom.qrRenderedWrapper.classList.remove('visible');
    this.dom.emptyState.style.display = 'flex';
    this.dom.canvasHolder.innerHTML = '';
    this.dom.urlInput.focus();

    Toast.info('Generator reset');
  }

  /**
   * Render history items from LocalStorage
   */
  renderHistory() {
    if (!this.dom.historyList) return;
    const items = HistoryManager.getAll();

    if (!items || items.length === 0) {
      this.dom.historySection.style.display = 'none';
      return;
    }

    this.dom.historySection.style.display = 'block';
    this.dom.historyList.innerHTML = '';

    items.forEach(item => {
      const card = document.createElement('div');
      card.className = 'history-item';

      const typeBadge = `<span class="badge-tag" style="padding: 2px 8px; font-size: 0.7rem;">${item.type}</span>`;

      card.innerHTML = `
        <div class="history-item-info">
          <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 2px;">
            ${typeBadge}
            <span class="history-item-title" title="${Toast.escapeHTML(item.text)}">${Toast.escapeHTML(item.text)}</span>
          </div>
          <span class="history-item-date">${item.date}</span>
        </div>
        <div class="history-item-actions">
          <button class="history-btn-mini btn-load" title="Load into generator" aria-label="Load into generator">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="1 4 1 10 7 10"/><path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10"/></svg>
          </button>
          <button class="history-btn-mini btn-copy" title="Copy text" aria-label="Copy text">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>
          </button>
        </div>
      `;

      // Event handlers for history item actions
      card.querySelector('.btn-load').addEventListener('click', () => {
        this.dom.urlInput.value = item.text;
        this.dom.urlClearBtn.classList.add('visible');
        this.switchTab('url');
        this.handleGenerate();
        window.scrollTo({ top: 0, behavior: 'smooth' });
      });

      card.querySelector('.btn-copy').addEventListener('click', async () => {
        await navigator.clipboard.writeText(item.text);
        Toast.success('Copied from history!');
      });

      this.dom.historyList.appendChild(card);
    });
  }
}

// Initialize when DOM is ready (only on generator page)
if (typeof document !== 'undefined' && (document.getElementById('url-input') || document.getElementById('generate-btn'))) {
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => new SanketQRApp());
  } else {
    new SanketQRApp();
  }
}
