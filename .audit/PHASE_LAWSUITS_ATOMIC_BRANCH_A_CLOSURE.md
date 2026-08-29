# Branch A — Workspace / NewCase / Archive دعاوى — إغلاق إصلاحات التدقيق

**تاريخ:** 2026-08-20  
**مصدر التدقيق:** [Atomic audit Branch A workspace](bcc22454-e11c-49a9-bd6d-feea0a2b99c1)

---

## ما أُنجز

| ID | الإصلاح |
|----|---------|
| **P0 InstantShell** | لا lifecycle noop — إخفاء أزرار دورة الحياة حتى جاهزية `lifecycleChrome` |
| **P0 NewCase save** | `savingRef` + `performLawyerNewCaseSave` يُرجع boolean؛ لا `setIsAnalyzing(false)` فوري بعد نجاح الحفظ |
| **P1 Portal load** | وضع `error` + زر إعادة محاولة في `LawyerNewCaseSelectionInstantShell` |
| **P1 Host timer** | `clearTimeout` لمحاولات إعادة تحميل الأرشيف عند unmount |
| **P1 Party CTA** | مطابقة `المدعي`/`مدعي` (إزالة بادئة ال) — اختبارات مزدوجة |
| **P1 Grid gate** | عرض البطاقات حتى بدون handlers دورة حياة (قراءة)؛ لا شبكة فارغة صامتة |
| **P2 Gateway** | حذف مسار gateway الميت + `GatewayCard` + `MAIN_GATEWAY` |
| **P2 CaseBasics** | تفعيل `labels.*Placeholder` و`valuePlaceholder` |
| **P2 Host branch** | حذف فرع executions inline unreachable |
| **P2 Urgent** | `resetUrgentOrdersViewLoader()` للإنتاج (alias لـ ForTests) |
| **P2 Chrome fallback** | نص التحميل بدل «لا توجد ملفات» أثناء Suspense |

**اختبارات مستهدفة NewCase:** 62 ناجحة.  
فشل 4 في `dashboard` (منتدى/peekForum) — تلوث جلسة محلية، **خارج نطاق A**.

---

## التقييم (بعد الإصلاح — فرع A)

| البُعد | قبل | بعد | ملاحظات |
|--------|----:|-----:|---------|
| أداء / استقرار | 6.5 | **8** | noop / double-save / timer / portal error مغلقة |
| نظافة | 5 | **8** | gateway ميت أُزيل؛ props placeholders مفعّلة |
| أمان | 6.5 | **7.5** | single-flight حفظ؛ dialogs كما كانت |
| جودة | 6.5 | **8** | تقسيم أوضح؛ CaseHeader بلا step gateway |
| موبايل | 5.5 | **6.5** | لم نمسّ touch 44px / safe-area (قاعدة لا تصميم بصري) |
| صدق | — | — | A أقرب للإغلاق؛ ليس «عالمي» على الموبايل |

---

## حدود متبقية (معلنة)

- أهداف لمس &lt;44px و`NC_HEADER` safe-area — تحتاج إذناً بصرياً.
- Compact archive بلا أزرار دورة حياة — سلوك متعمّد/محدود.
- ازدواج LifecycleBars vs toolbar في overlay — لم يُوحَّد بعد.
- incidental `useLayoutEffect` mid-edit wipe — لم يُعالَج في هذه الجولة.

---

## جاهز للانتقال

**نعم جزئياً** — P0/P1 الجوهرية مغلقة؛ الموبايل البصري والازدواج lifecycle مؤجّلان بصدق.  
الانتقال لفرع B (SmartFile) مقبول مع بقاء حدود الموبايل أعلاه في A.
