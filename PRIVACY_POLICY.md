# Privacy Policy for Sanket QR

**Effective Date:** October 25, 2026  
**Application Name:** Sanket QR (Generator & Scanner)  
**Developer / Owner:** Sannivesham  
**Live Policy URL:** [https://sanket-qr.sannivesham.com/privacy.html](https://sanket-qr.sannivesham.com/privacy.html) (Mirror: `https://sannivesham.github.io/sanket-qr/privacy.html`)  
**Contact Email:** web.sannivesham@gmail.com  

---

## 1. Overview & Commitment to Privacy

Sanket QR ("the Application") is developed and maintained by Sannivesham ("we", "us", or "our"). We believe that your privacy is a fundamental right. 

Sanket QR is engineered from the ground up as a **100% client-side utility**. All QR code generation, camera scanning, and image decoding occur entirely inside your device's memory (RAM). 

**We do not collect, store, sell, monetize, or transmit your personal data, camera feeds, photos, or scanned links to any external server.**

---

## 2. Device Permissions Usage (Google Play Store Compliance)

In compliance with the **Google Play Developer Program Policy** regarding *Permissions*, *User Data*, and *Device and Network Abuse*, below is a transparent breakdown of all permissions used by Sanket QR:

| Permission | Android Identifier | Purpose | Data Handling & Retention |
| :--- | :--- | :--- | :--- |
| **Camera Access** | `android.permission.CAMERA` | Used exclusively to stream real-time video frames to locate and decode QR codes when you tap "Start Camera". | Video frames are analyzed purely in transient device RAM. **Frames are never recorded, never saved to storage, never uploaded, and never shared.** Camera access terminates immediately when scanning is paused or closed. |
| **Photos / Storage** | `READ_MEDIA_IMAGES` / File API | Used only when you voluntarily select an image from your gallery to decode a QR code, or download a generated PNG/SVG code. | The app only accesses the specific image file selected via the system file picker. We do not access your photo library, metadata, or other personal files. |
| **Clipboard Access** | Clipboard API | Allows user-initiated pasting of URLs ("Paste" button), pasting screenshot images (`Ctrl+V`), and copying decoded scan results or QR code images. | The app never reads clipboard contents automatically in the background. Access is strictly triggered by direct user interaction. |
| **Flashlight / Torch** | `android.permission.FLASHLIGHT` | Allows you to illuminate dark environments while using the live camera scanner. | Controlled solely by the user via the "Flashlight" toggle button. |

---

## 3. Information We Do NOT Collect (Google Play Data Safety)

In compliance with the **Google Play Data Safety** declaration requirements:

- **No Personal Identifiers:** We do not collect names, email addresses, phone numbers, postal addresses, or account credentials.
- **No Precise or Approximate Location:** We do not access GPS, cellular location, or Wi-Fi location data.
- **No Device Identifiers:** We do not collect IMEI, Android ID, MAC address, or Advertising IDs (GAID).
- **No Financial Data:** The app is free with no in-app purchases or payment processing.
- **No Biometric Data:** We do not access facial geometry, fingerprints, or voice data.
- **No Browsing History:** We do not track websites visited or user browsing activities.

---

## 4. Local Data Storage & User Deletion Rights

Sanket QR includes an optional convenience feature for viewing your recent generated codes and recent scans:
- **Storage Location:** All history items are stored strictly on your local device hardware using browser `localStorage`.
- **No Cloud Synchronization:** Data is never synced or uploaded to cloud databases.
- **User Control & Instant Deletion:** You can permanently purge all stored history records at any time by clicking the **"Clear History"** or **"Clear Scans"** buttons within the app.
- **Clearing Cache / Uninstalling:** Clearing browser cache or uninstalling the app immediately and permanently purges all local data.

---

## 5. Third-Party Services, SDKs & Advertising

- **Zero Advertising SDKs:** Sanket QR does not contain Google AdMob, Unity Ads, Meta Audience Network, or any other advertising libraries.
- **Zero Analytics Trackers:** We do not use Google Analytics, Firebase Analytics, Flurry, or any telemetry tracking SDKs.
- **Zero Third-Party Trackers:** No Facebook Pixel or cross-app tracking cookies exist in this application.
- **Bundled Open-Source Libraries:** Cryptographic QR operations run locally via bundled open-source scripts (`qrcode.js` and `html5-qrcode`) without outgoing network tracking calls.

---

## 6. Children's Privacy (COPPA & Google Play Families Policy)

Sanket QR is safe for users of all ages, including children under 13. We strictly adhere to:
- The United States **Children's Online Privacy Protection Act (COPPA)**
- The European Union **General Data Protection Regulation (GDPR / GDPR-K)**
- The **Google Play Families Policy**

Because Sanket QR does not collect or transmit personal information from any user, we do not knowingly solicit or collect data from children under 13 (or under 16 in the EEA).

---

## 7. Global Privacy Regulations (GDPR, CCPA/CPRA, CalOPPA)

- **Right to Access / Transparency:** This policy provides full transparency regarding the local-only nature of our software.
- **Right to Erasure (Right to be Forgotten):** Users have direct one-click control to delete local data at any time.
- **Do Not Sell or Share My Personal Information:** We do not sell, rent, monetize, or disclose user data because no personal data is collected.
- **Non-Discrimination:** All users enjoy complete access to all app features regardless of privacy preferences.

---

## 8. Security Safeguards

- **Transport Layer Security (TLS/HTTPS):** All website resources are served through HTTPS encryption.
- **Cross-Site Scripting (XSS) Prevention:** Scanned text is strictly sanitized via safe DOM APIs (`textContent`) to prevent script injection.
- **Protocol Verification:** External links require user confirmation and are verified to block malicious `javascript:` or `data:` URL execution.

---

## 9. Changes to this Privacy Policy

We may update this Privacy Policy periodically to reflect app updates or legal requirements. The updated policy will be posted on this page with a revised "Effective Date".

---

## 10. Developer Contact Information

If you have any questions or require clarification regarding this Privacy Policy or Google Play compliance, please contact:

- **Developer:** Sannivesham
- **Application:** Sanket QR
- **Email:** [web.sannivesham@gmail.com](mailto:web.sannivesham@gmail.com)
