# قسم الإعدادات — خروج الطبقة عبر نواة الـ hub

> **حالة الأرشيف:** المالك طلب التصرف فقط مع ما يمكن إكماله داخل الإعدادات.  
> **سابق غير مُعاد:** كسل المنظر، توحيد كشف الطبقة (`settingsOverlayPresence`).  
> **عقد قائم:** بلا دمج الشجرتين، بلا تشديد `keepAlive`، بلا Playwright / جهاز / `build:e2e`.

**التاريخ:** ٣١ آب ٢٠٢٦  
**النطاق:** مسار CSS للإغلاق — كاتب سمات واحد.  
**خارج النطاق:** إشعارات/بحث، hydration، قياس gzip.

---

## صدق عن الحدود

| الحد | الحكم |
|------|--------|
| شجرتان (قشرة HTML ثم React) | **لم تُدمَجا** |
| مدة الإغلاق البصرية | **220ms** كما في CSS — لم تُقصَّر إلى 140ms الافتراضي للـ hub |
| `suppressSettingsReopen` قبل الخروج | **بقي** — يحجب الترس أثناء التلاشي؛ `conceal({ suppressReopen: true })` يمدّه بعد الإخفاء |
| Playwright / جهاز | **لم تُشغَّل** |

---

## ما أُنجز

| العمل | الأثر |
|--------|--------|
| `beginSettingsShellExit` غلاف على `beginHubLayerExit(SETTINGS_HUB_LAYER)` | لا `setAttribute` مباشر لـ open/closing في مسار الإعدادات |
| قشرة بلا React تبقى فورية | Host فارغ (keepAlive) لا ينتظر 220ms |
| `SETTINGS_HUB_LAYER.exitMs = 220` | المهلة تطابق `settingsChromeOverlay.css` |
| حذف `isSettingsOverlayRevealed` | تصدير بلا مستهلك |
| تعليق المسار في `useLawyerDashboardSettings` / `settingsShellSnap` | يطابق نموذج الحضور لا «نمط الإشعارات» |

قفل: مجلد `hooks/lawyerDashboard/settings/__tests__` دخل بوابة `gate:settings` + بنود أمانة في `settingsOpenSizeHonesty` و`settingsRemainingGapsHonesty`.

---

## التقييم

| البُعد | درجة | ملاحظة |
|--------|------|--------|
| أداء | 8 | إغلاق القشرة الفارغة فوري كما كان. بلا قياس جهاز |
| نظافة | 9 | نسخة الحركة حُذفت؛ النواة المشتركة تكتب السمات |
| أمان | 8 | لم تُمسّ المسارات/الختم |
| جودة | 9 | غلاف رفيع + قفل على `beginHubLayerExit` وغياب `setAttribute` |
| موبايل | 8 | مدة 220ms لم تُغيَّر. بلا جهاز |
| صدق | 9 | لم يُدَّعَ دمج الشجرتين ولا توحيد الإشعارات/البحث |

`npm run gate:settings` — **PASSED: 141 ملفاً / 520 اختباراً** (كان 139/511؛ دخل مجلد اختبارات `settingsShellExit` / `settingsShellOpenFlow` إلى البوابة).

**جاهز للانتقال:** نعم لهذه الموجة (كاتب خروج CSS). لا للمنتج الكامل بلا `release:check:settings`.

---

## المصداقية — ما لم يُنفَّذ

- دمج قشرة HTML في شجرة React
- توحيد حضور الإشعارات/البحث على `settingsOverlayPresence`
- Playwright / جهاز / `tsc` صفري
