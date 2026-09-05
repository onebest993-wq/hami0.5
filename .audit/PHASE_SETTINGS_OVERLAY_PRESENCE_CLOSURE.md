# قسم الإعدادات — مصدر حقيقة واحد لكشف الطبقة

> **حالة الأرشيف:** المالك طلب التصرف مع عنق نواة الفتح/الإغلاق لا مع حجم المصدر.  
> **سابق غير مُعاد:** كسل المنظر، توحيد عقدة الـ overlay، قشرة فورية.  
> **عقد قائم:** بلا hydration لـ React فوق HTML القشرة، بلا `useLawyerSettingsCloudSync`، بلا `build:e2e`.

**التاريخ:** ٣١ آب ٢٠٢٦  
**النطاق:** كشف/إخفاء الطبقة — علم تشغيل واحد وإسقاط CSS.  
**خارج النطاق:** دمج شجرتي القشرة وReact، Playwright / جهاز / `tsc --noEmit` صفري.

---

## صدق عن الحدود

| الحد | الحكم |
|------|--------|
| شجرتان (قشرة HTML ثم React) | **لم تُدمَجا** — hydration فوق innerHTML سبق أن كسر الإغلاق |
| Playwright / جهاز / gzip | **لم تُشغَّل** |
| `keepAlive` | كما هو — لا تفريغ للوحة عند الإغلاق الدافئ |

---

## ما أُنجز

| العمل | الأثر |
|--------|--------|
| `settingsOverlayPresence.ts` | `isSettingsLayerOpen = reactOpen \|\| revealed` — بلا قراءة `html[data-hami-settings-open]` |
| `markSettingsOverlayRevealed` / `clearSettingsOverlayPresence` | العلم وسمة html يُكتبان معاً؛ اليتيم في DOM لا يُظهر الطبقة منطقياً |
| الإغلاق يُخفي عبر `concealSettingsWarmShell` فقط | بلا `snap` + `clearForceVisible` + `removeBridge` مكررة |
| حارس الإغلاق لا يكتب الحضور | كان يمسح العلم دون الإسقاط ولا يُصلح الانفكاك |
| `useLawyerDashboardMainViewChrome` | `isSettingsLayerOpen(showSettings)` بدل `showSettings && snap` — inert من أول طلاء |

قفل: `settingsOverlayPresence.test.ts` + بند في `settingsOpenSizeHonesty`.

`npm run gate:settings` — **PASSED: 139 ملفاً / 511 اختباراً**.

---

## التقييم

| البُعد | درجة | ملاحظة |
|--------|------|--------|
| أداء | 8 | مصدر حقيقة للكشف. بلا قياس جهاز. الشجرتان بقيتا عن قصد |
| نظافة | 8 | كتّاب الحضور: طلاء وإخفاء فقط |
| أمان | 8 | لم تُمسّ المسارات/الختم |
| جودة | 8 | قفل على السمة اليتيمة |
| موبايل | 8 | 44px / safe-area لم تُضعَف. بلا جهاز |
| صدق | 9 | لم يُدَّعَ دمج الشجرتين ولا أن الإعدادات صارت «تبويب بسيط» في النواة |

**جاهز للانتقال:** نعم لهذه الموجة (نواة الكشف). لا للمنتج الكامل بلا `release:check:settings`.

---

## المصداقية — ما لم يُنفَّذ

- دمج قشرة HTML في شجرة React
- Playwright / جهاز / `tsc` صفري
- توحيد نمط الإشعارات/البحث على نفس وحدة الحضور (خارج قسم الإعدادات)
