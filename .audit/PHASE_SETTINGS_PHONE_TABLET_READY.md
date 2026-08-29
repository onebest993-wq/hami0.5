# جاهزية مركز الإعدادات للهاتف واللوح — إغلاق 2026-08-13

**النطاق:** مركز الإعدادات + الأوراق المتداخلة + حوارات SmartDialog + إثبات E2E موبايل/لوح/WebKit.  
**الحكم:** الجبهة **مغلقة تقنياً ومُثبتة بمحاكاة Playwright**. ليست تجربة على جهاز آيفون/آيباد/أندرويد في اليد.

---

## ما أُغلق في هذه الجولة (كان نقصاً معلناً)

| النقص | الإغلاق | الإثبات |
|--------|---------|---------|
| E2E غير مشغَّل | `build:e2e` + تشغيل كامل | **28 نجاح / 2 تخطٍ** (تخطي عقد اللوح على الهاتف) |
| لا مشروع iPad | `tablet-chrome` = iPad Mini، `testMatch` لملف الإعدادات فقط | 10/10 على اللوح |
| أوراق ملء الشاشة على اللوح | هاتف: ملء شاشة كما كان. لوح ≥768px: بطاقة متمركزة `min(42rem)` فوق تعتيم | E2E: عرض اللوحة ≤672px على iPad Mini |
| native verify فاشل بسبب poll قديم | العقد يطابق `HamiBootPlugin.setReadyListener` | `verify:native:android` **أخضر** |
| لا WebKit | `mobile-safari` (iPhone 14) | **9 نجاح / 1 تخطٍ** |

---

## نتائج التشغيل (هذه الجلسة)

```
npm run build:e2e                         → نجاح
npx playwright test e2e/settings-mobile.spec.ts
  mobile-chrome (Pixel 7)                 → 9 passed, 1 skipped
  tablet-chrome (iPad Mini)               → 10 passed
  mobile-safari (iPhone 14 WebKit)        → 9 passed, 1 skipped
npm run verify:native:android             → core native wiring OK
vitest HamiSettings                       → 39 files / 113 tests
vitest native/privacy/biometric           → 10 tests
```

حالات E2E المغطاة: viewport-fit=cover، فتح بلا overflow، تبويبات 44px، مفتاح أمني باللمس، Escape، أفق 844×390، إطار 768px، ورقة تخصيص، وثيقة قانونية، عرض بطاقة اللوح.

---

## التقييم بالأبعاد

| البُعد | الدرجة | السبب |
|--------|--------|--------|
| أداء | **8.5/10** | فتح E2E ناجح على ثلاث محاكيات؛ بلا قياس جهاز |
| نظافة | **8.5/10** | `SettingsNestedSheetFrame` مشترك؛ CSS هاتف/لوح منفصل |
| أمان | **8/10** | native verify أخضر؛ بيومتري وحدة فقط |
| جودة كود | **8.5/10** | scrim يغلق على اللوح فقط عندما الهدف هو الخلفية |
| موبايل+لوح | **9.5/10** | محاكاة Pixel + iPad Mini + iPhone WebKit خضراء. لا جهاز حقيقي |
| صدق | **9.5/10** | الأرقام من تشغيل هذه الجلسة |

**المجموع الواقعي:** ~8.8/10.

---

## الحدود المتبقية (لا يمكن إغلاقها من هنا)

1. **لا جهاز حقيقي** — Face ID، شريط المنزل، لوحة مفاتيح سامسونج/iOS الأصلية. لا محاكاة تغني عن اليد.
2. **لا مشروع iOS/Xcode على هذه الآلة** — ويندوز لا يشغّل Xcode ولا CocoaPods. القوالب والأمر جاهزان لماك.
3. محاكاة Playwright ليست WebView Capacitor على الجهاز.

---

## ما أُغلق بعد سؤال «هل تستطيع فعل شيء»

| النقص | ما نُفِّذ هنا | ما بقي لجهاز/ماك |
|--------|----------------|-------------------|
| `cap add ios` بلا سكربت | `npm run cap:add:ios` — على ماك يولّد ثم يدمج Info.plist. على ويندوز يرفض صراحةً (exit 2) ولا يترك شجرة مكسورة | توليد `ios/` + `pod install` + فتح Xcode |
| Face ID يسقط بلا وصف | القصاصة + الدمج التلقائي: Face ID، الموقع، الكاميرا، الميكروفون | apparition حوار النظام على آيفون |
| لوحة مفاتيح iOS | `Keyboard.style: 'DARK'` + `Keyboard.setStyle(Dark)` عند الإقلاع الأصلي | التحقق على لوحة iOS/سامسونج في اليد |
| verify iOS غائب | `npm run verify:native:ios` (قوالب على ويندوز = نجاح + تحذير؛ مشروع موجود = فرض المفاتيح) | أخضر بلا تحذير بعد `cap add ios` على ماك |

```bash
npm run verify:native:ios   # ويندوز: قوالب فقط
npm run cap:add:ios         # ماك فقط
npm run cap:sync:ios
npm run verify:native
```

---

## جاهز للانتقال؟

**نعم من جهة مركز الإعدادات على الهاتف/اللوح داخل المحاكاة.**  
**لا** من جهة تجربة آيفون/آيباد/أندرويد في اليد، و**لا** من جهة مشروع Xcode على هذه الآلة.

```bash
npm run gate:settings
npm run test:e2e:settings:mobile
npm run verify:native
```
