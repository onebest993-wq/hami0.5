# hop السحابة وتصفير الهوية — إغلاق صادق

**التاريخ:** ٣١ آب ٢٠٢٦  
**السؤال:** هل بقي شيء يُفعل باحترافية بعد صدفة `schedule-chrome-lite`؟  
**ليس نطاقاً:** تغيير بصري، إخراج InstantChrome من MainView، دمج hops، إسقاط التشفير، تقصير keep-alive.

---

## القرار

نعم، بقي قطعان هندسيان في مصدر التقويم. قيسنا `dist` ولم نخمّن.

1. **`calendarCloudRuntime.ts` بلا اسم** كان يُمتص داخل `lawyer-boot-peek-lite` عبر `homeHubRadarWarmCache`. Host يستورد `prefetchCalendarCloudModule` فيفتح hop فيدفع أرشيف المنزل. نسمّي الطبقتين hop منفصلتين — لا دمج مع `calendarCloudLoader` ولا مع `lawyerCalendarCloud`.
2. **مسار التشفير المحلي** كان: `useCalendarData` → `calendarLocalSnapshot` → `SecureStore` → `CryptoService` → `liveAuthUserId` → تصفير هوية الملف ثابتاً → `userIdentityUiState` → أوراق peek. تصفير الكروم عند تبديل الحساب لا يلزم قراءة التقويم المشفّر. صار `import()`.

---

## ما أُنجز

- `vite.config.mts`: `calendar-cloud-runtime` + `calendarCloudLoader` أوراق مشتركة قبل boot-peek.
- `liveAuthUserId.ts`: تصفير الهوية عبر `import('@/app/services/auth/resetLawyerSessionUiForIdentityChange')` فقط عند تبديل حساب حي (ليس أول ملء null→id).
- اختبارات: `liveAuthUserId` و`authOnboardingHiddenGaps` ينتظران الوعد؛ `firstOpenSharedTaxHonesty` يثبت hop + عدم الاستيراد الثابت.
- الحارس: الأوراق المسماة مطلوبة؛ Host→MainView فشل؛ Host→peek **مراقبة** لا فشل — دورة Rollup ما زالت تنزّل peek كـ`import"./…"` بلا ربط.

---

## القياس — `dist` بعد البناء

| المقياس | بعد chrome-lite | بعد هذه الجولة |
|---|---|---|
| Host JS | 38.2 / 12.5 gzip | **38.2 / 12.5** (حجم الكسرة نفسها) |
| `calendar-cloud-runtime` | — | **1.4 / 0.6** |
| Host → calendar-cloud-runtime | لا (كان عبر peek) | **نعم** |
| Host → MainView | لا | لا |
| Host → boot/persist pipeline | لا | لا |
| مصدر Host → peek | نعم (`liveAuthUserId`) | **لا** (مشية الاستيراد) |
| `dist` Host → peek / hub / أرشيف / supabase | نعم | **نعم — استيراد جانبي لدورة chunk** |
| MainView JS | 62.8 / 19.4 | 64.9 / 20 (إعادة توزيع كِسَر؛ ليس قطع تقويم) |

عدد الاستيرادات الثابتة لـ Host بقي **60**. معظمها `import"./named.js"` بلا ربط — ترتيب تهيئة بين `boot-runtime` (SecureStore/Crypto) وعناقيد المنزل.

---

## التقييم

| البُعد | الدرجة | ملاحظة |
|---|---|---|
| أداء | 7 / 10 | hop سحابي ورقة 1.4KB؛ تنزيل peek/hub/أرشيف عند فتح التقويم **لم يُكسر** بعد. TTFI هاتف غير مقيس |
| نظافة | 8 / 10 | مصدر التقويم لم يعد يصل peek؛ الحارس لا يدّعي كذبة dist |
| أمان | 9 / 10 | التشفير المحلي كما هو؛ تصفير الهوية عند تبديل الحساب ما زال يحدث (بعد tick التحميل) |
| جودة كود | 8 / 10 | hop مزدوج بقي ملفين؛ تصفير الهوية لم يعد على مسار SecureStore |
| موبايل | 7 / 10 | نفس حدود الشجرتين والـkeep-alive؛ ضريبة الدورة على الشبكة باقية |
| صدق | 9 / 10 | صرّحنا أن دورة Rollup حدّ فعلي لا «لاحقاً داخل نفس القطع» |

---

## الحدود — لماذا لا نغلق «حجم الفتح» بالكامل

- التشفير المحلي **يجب** أن يمر بـ `SecureStore`/`Crypto` (`boot-runtime`). ذلك الجذع يشارك المنزل؛ Rollup يُبقي استيرادات جانبية لـ peek/hub-card/archive/supabase على Host لترتيب التهيئة. كسر الدورة يعني إعادة تسمية جذع التخزين دون سحب الأرشيف إلى الإقلاع — خارج «ورقة hop» وخطر على أول طلاء المنزل.
- لم نُخرج PaintGate من MainView.
- لم نُعدّ E2E Playwright في هذه الجولة.
- تبديل الحساب يصفّر الهوية بعد `import()` لا تزامناً في نفس النَفَس — الاختبارات تنتظر؛ المنتج: تبديل حساب نادر.

**جاهز للانتقال من قطع hop/الهوية:** نعم.  
**جاهز للانتقال بمعنى «لا ضريبة منزل على فتح التقويم»:** لا.
