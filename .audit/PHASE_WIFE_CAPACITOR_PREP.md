# PHASE — WIFE Capacitor Prep (no UI changes)

**التاريخ:** 2026-08-21  
**الأمر:** `npm run test:security:capacitor-prep`

---

## ما اُختُبر (unit/static)

| البند | النتيجة |
|-------|---------|
| `androidScheme: https` | ✓ |
| `allowMixedContent: false` | ✓ |
| Keyboard `resizeOnFullScreen: true` | ✓ |
| `getOrCreateDeviceId` → 32 hex | ✓ |
| `attachWifeClientHeaders` يرسل `x-wife-device-id` | ✓ |
| `wireNativeSecuritySettingsListener` في shell boot | ✓ |

---

## Gaps صادقة (لم تُغلَق)

| البند | السبب |
|-------|--------|
| **PrivacyScreen plugin** | `preventScreenshots: false` في config — screenshot deterrent عبر `syncNativeScreenshotGuard` فقط |
| **Biometrics / Face ID** | لا E2E native |
| **WebView cookie isolation** | يعتمد على BFF HttpOnly + `VITE_BFF_AUTH` |
| **Safe-area live** | CSS/kernel — لم يُختبر على جهاز |

---

## التقييم

| البُعد | الدرجة |
|--------|--------|
| موبايل prep | **7/10** (كان 6) |
| WIFE على native path | **8/10** (device-id + signing) |

**ليس إغلاق Capacitor كامل** — يحتاج build + جهاز + biometrics.

---

## أوامر

```bash
npm run test:security:capacitor-prep
npm run gate:wife-prod-readiness
npm run test:security:professional-audit
```
