# ضريبة تحليل مضيف اللوحة — إغلاق صادق (موجة instant-home)

**التاريخ:** ٣١ آب ٢٠٢٦  
**النطاق:** ما بقي بعد قطع بوابة الكشف (deferred CSS، الملف المحلي، كروم الهاب): تحليل `LawyerDashboardInner` → FullBoot → workspace stem قبل أن تُرسم شبكة المنزل.  
**سابق:** كشف فوري عند البلاطات الحية + هيكل الهاب؛ `commandHubArchivePrefetch` دينامي؛ `commandHubTileClasses` في مقطع الطلاء.  
**ليس نطاقاً:** مسار Minimal/InnerRuntime (مقفل باختبارات الصدق)، كشف طبقة FirstPaint، تغيير بصري، إعادة بناء `dist` في هذه الجلسة.

---

## القرار

لوحة المنزل صغيرة. التأخير بعد الدخول كان **تحليل مضيف** لا حجم الشبكة. Inner يبقى يستورد FullBoot ساكناً (صدق). ما يمكن قطعه الآن: hydrate ملفات الدعاوى المتزامن على أول رسم، و`CalendarDB` الساكن في رادار 48 ساعة، وجسر البصمة الأصلي عبر `biometricSessionService`.

---

## ما أُنجز

| القطع | السلوك |
|---|---|
| `LawyerDashboardWorkspaceProvider` | أول رسم = stub. `LawyerDashboardWorkspaceStemLayer` عبر `import()` بعد commit. Prefetch عند تقييم الموفّر |
| `lawyerDashboardWorkspaceStem.types.ts` | نوع بلا قيمة حتى لا يسحب السياق مستودع الدعاوى |
| `useCalendarRadar48h` | `fetchCalendarEvents` من `calendarCloudRuntime` — hop موجود مسبقاً ولم يكن مستخدماً |
| `biometricSessionService` | `hasBiometricSessionEnrollment` من `nativeBiometricEnrollmentStore`؛ الجسر الأصلي `import()` عند التحقق/التسجيل |

القفل البيومتري يبقى متزامناً على أول إطار (علم التسجيل في SecureStore). لا وميض لوحة مفتوحة ثم قفل.

---

## القياس

**لم يُعد `npm run build`.** أرقام gzip السابقة (Inner ~1.48 م.ب إغلاق ساكن) **لا تُحدَّث هنا**. الاختبارات المستهدفة: 65 + 43 نجاح (صدق الإقلاع، الرادار، البصمة، الكشف، الأمن). `tsc` بلا أخطاء في الملفات المعدّلة؛ أخطاء المشروع السابقة خارج النطاق.

---

## التقييم

| البُعد | الدرجة | ملاحظة |
|---|---|---|
| أداء | 7 / 10 | قُطع hydrate الدعاوى وCalendarDB وجسر البصمة من أول تقييم. Inner+FullBoot+MainView+طلاء+command-hub ما زالوا ساكنين |
| نظافة | 8 / 10 | نمط StemLayer مطابق لـ HeavyLayer. نوع الجذع في ورقة مستقلة |
| أمان | 8 / 10 | التشفير كما كان. القفل يُقرأ متزامناً. الملفات تُحمَّل فوراً بعد أول رسم لا عند interactive |
| جودة كود | 8 / 10 | stubs + طبقة دينامية + hop تقويم موجود |
| موبايل | 8 / 10 | فك دعاوى أقل على الإطار الأول؛ Capacitor يستفيد. لم يُقس Pixel |
| صدق | 9 / 10 | لا ادّعاء «لحظي». dist غير مقيس. SecureStore ما زال على المسار عبر الإعدادات/الإشعارات/علم البصمة |

---

## الحدود — ما لم يُغلق

- Inner يستورد FullBoot ساكناً — مقفل بصدق. لا hop Minimal.
- FirstPaint يبقى تحت الغطاء (`announcePaint={false}`).
- `ForumTile` ما زال يستورد `forumProfile` ساكناً — الكشف ينتظر البلاطات الحية.
- `SecureStoreService` على FullBoot عبر `settingsSnapshot` و`notificationPeekLite` و`nativeBiometricEnrollmentStore`.
- بطاقة الهاب ما زالت تُسخَّن دون حجب الكشف؛ رادارها لم يعد يربط `lawyerCalendarCloud` ساكناً.
- `npm run dev` أثقل من الإنتاج (وحدات غير مدمجة).

## الموقع

جاهز للانتقال: **نعم** — داخل حدود الصدق. الضريبة التالية الحقيقية هي إغلاق Inner/FullBoot نفسه أو تسمية أوراق SecureStore الخفيفة خارج برميل التخزين.

## المصداقية

لم يُدَّعَ أن المنزل أصبح لحظياً على الجهاز. لم يُكسر عقد القفل البيومتري. لم يُغيَّر الشكل. لم تُحدَّث أرقام `dist`.
