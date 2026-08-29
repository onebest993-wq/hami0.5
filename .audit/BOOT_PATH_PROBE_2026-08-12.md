# Boot path probe — 2026-08-12

## ماذا شُغّل
1. `npm run test:e2e:boot` (إعادة بناء e2e + 7 اختبارات smoke) → **7/7 passed**
2. `e2e/boot-full-path-probe.spec.ts` → مسار من الصفر حتى الأقسام → **passed**

البيئة: Playwright Chromium + `vite preview` (shell-auth مفتوح لـ E2E). **ليس** جهاز Android أصلي.

## المسار المُتحقق
silent-canvas → إزالة `#hami-static-boot` → `lawyer-dashboard-ready` → `home-main-grid` → أقسام ظاهرة.

| عنصر | نتيجة |
|------|--------|
| سطح صامت بلا wordmark | ✅ |
| كشف + homeGridPainted | ✅ |
| Frame-1 snap موجود | ✅ (unread=0 في جلسة فارغة) |
| شبكة رئيسية + Hub | ✅ |
| مستودع / مهام / تقويم / منتدى | ✅ ظاهرة |
| أرشيف دعاوى / تنفيذ | ✅ ظاهرة |
| أخطاء JS صفحة | 0 |
| `home-dock-shell` | غير موجود كعقدة (أبناء الـ dock ظاهرة) |

## حدود الصدق
- لا يغطي Capacitor native splash / HamiBoot.notifyReady على جهاز.
- ترتيب علامات performance في التقرير قد يكون غير متسق زمنياً (interactive قبل chunk) — يحتاج تدقيق منفصل للـ marks لا للفشل الوظيفي.
