# MASTER BUILD — حامي (عقد معماري حقيقي)

تاريخ: 2026-08-12  
الحالة: **ملزم** — أي تنفيذ يخالفه يُرفض كترقيع.

---

## 0) لماذا ساء العمل سابقاً

1. إصلاح أعراض (رعشة/كلمة/تأخير) بلا عقد ستاك.
2. طبقات CSS/Timeout فوق مسار إقلاع مكسور أصلاً.
3. توجيه Compose/Hilt طُبّق جزئياً بالكلام بينما المنتج **Capacitor WebView + React**.

هذا ممنوع من الآن.

---

## 1) حقيقة الستاك (لا تُجادَل)

| طبقة | التقنية الفعلية |
|------|------------------|
| UI المنتج | React + Vite داخل Capacitor WebView |
| غلاف Android | `BridgeActivity` + SplashScreen API + Plugins Kotlin |
| Compose | محدود (ورقة إشعارات أصلية) — **ليس** لوحة المحامي |
| حالة الواجهة | Context / Zustand / hooks — مرادف StateFlow |
| تخزين محلي | SecureStore / IndexedDB / local — مرادف DataStore |
| تنقّل الشاشات | state screens + overlay coordinator — مرادف Navigation |

### ترجمة توجيه Compose → حامي

| توجيه المستخدم | التنفيذ الصحيح في حامي |
|----------------|-------------------------|
| Jetpack Compose Dashboard | **لا إعادة كتابة** — إصلاح React hydration / CLS |
| StateFlow + ViewModel | SSOT stores + hydrate قبل الكشف |
| Hilt | غير مطلوب للوحة؛ Plugins Capacitor للأصلي |
| Navigation Component | overlay/backstack موحّد في JS |
| Dispatchers.IO | async/idle + Capacitor native IO |
| `installSplashScreen` + keep condition | موجود — يُستبدل **poll** بإشارة حدث من JS |
| debounce 300ms بحث | في hook البحث (مسموح كـ pipeline بيانات لا كـ UI sleep) |

**قرار منتج:** إعادة كتابة اللوحة بـ Compose كامل = مشروع منفصل لأشهر. MASTER BUILD الحالي يصل لنفس **النتائج** على الستاك الحقيقي.

---

## 2) المراحل (إغلاق ذرّي لكل مرحلة)

### Phase 1 — App Launch Engine (مفتوح — تعميق 2026-08-12)
- [x] سطح ويب صامت `#0a0f1c`
- [x] Android Splash: لون فقط + أيقونة فارغة
- [x] `setKeepOnScreenCondition` + `HamiBoot` plugin (حدث بدل poll)
- [x] جسر JS ينتظر Capacitor ويعيد المحاولة ويُعلن الفشل (لا صمت)
- [x] Warm restore بلا إمساك splash
- [x] Failsafe 20s أمان فقط
- [ ] قياس cold/warm على جهاز حقيقي
- [ ] إغلاق المرحلة بعد تحقق جهاز أو موافقة مالك صريحة

### Phase 2 — Zero-CLS Dashboard Frame-1 (جزئي 2026-08-12)
- [x] `BootLaunchOrchestrator` + `bootFrame1Hydrate` (unread + سكرتير sync)
- [x] ultra-minimal first paint يستهلك اللقطة لا أصفار
- [x] `beforeBootShellReveal` قبل إزالة shell
- [ ] شارات Hub/Forum المؤجلة (spark) — Phase 2b إن لزم
- [ ] قياس CLS على جهاز
- [ ] `windowBackground` = لون اللوحة (تحقق أصلي)

### Phase 3 — Settings
- IO خارج المسار الحرج
- إصلاح قصّ RTL / typo / insets الحوارات
- لا وميض أسود عند تبديل التبويب

### Phase 4 — Notifications sheets
- SSOT تبويب واحد للفراغ
- scrim موحّد — لا تراكب
- كاش إعدادات الصوت في الحالة

### Phase 5 — Global Search
- منع finish/pop عند الفتح
- مزامنة IME بعد اكتمال دخول الطبقة
- debounce+distinct على الاستعلام

### Phase 6 — Profile Studio
- شريط إجراءات فوق الهيرو
- statusBars insets
- كاش نسيج الصفحة لرفض سلس

---

## 3) قواعد جودة (Hard)

1. ممنوع: `setTimeout` كجاهزية UI، `visibility:hidden` للتمويه، `try/catch` صامت حول أخطاء جذرية.
2. مسموح: debounce خطوط بيانات، failsafe أمان أصلية موثّقة، `rAF` لمزامنة paint فقط.
3. كل مرحلة: اختبارات صدق + تقرير إغلاق أبعاد (أداء/نظافة/أمان/جودة/موبايل/صدق).
4. لا انتقال لمرحلة تالية قبل إغلاق الحالية صراحة.

---

## 4) قرار مطلوب من المالك (مرة واحدة)

- **المسار A (المعتمد هنا):** MASTER BUILD على Capacitor+React كما أعلاه.
- **المسار B:** إعادة بناء المنتج Compose أصلي كامل — خارج نطاق هذا المستند ويزامن فريقاً/جدولاً منفصلاً.
