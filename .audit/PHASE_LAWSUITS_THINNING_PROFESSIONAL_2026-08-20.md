# تنحيف قسم الدعاوى — إغلاق صادق (2026-08-20)

## الحكم

| السؤال | الجواب |
|--------|--------|
| هل نُحّف بلا أثر بصري؟ | **نعم** |
| هل نُحّف بلا كسر عقود مثبتة؟ | **نعم** (434+379 اختبارات) |
| هل هذا ضغط حجم حزمة نهائي مقيس؟ | **لا** — لم يُقَس gzip/TTFI جهاز |
| جاهز للمتابعة؟ | **نعم** |

## ما أُنجز (ضغط آمن)

1. **توحيد حارس الأرشفة** — `lawsuitFileMutationGuard` يعتمد `isLawsuitArchived` / `isLawsuitInTrash`
2. **إزالة alias** `saveLawsuitFilesRawImmediate` → `saveLawsuitFilesRaw` فقط
3. **إخفاء exports داخلية** — `lawsuitTrashExpiresAtMs`, `readLawsuitLifecycleIndex`
4. **برميل smart-modal** — صار type-only؛ `SmartFileModal` يستورد مباشرة من Content
5. **قطع سحب أيقونات** — `personalStatusValidation` ← `wordLists` بدل `constants` (لا يسحب MAIN_GATEWAY)
6. **حذف stub** `canThirdPartyBeClient` (+ اختباره الميت وظيفياً)
7. **moroccanGlassShell** — حذف توكنات غير مستهلكة + un-export داخليات الزخرفة

## ما تُجنّب عمداً (خطر سلبي)

- تقسيم `SmartJudgmentModal` (~1000 سطر) بلا عقد اختبار سلوكي
- حذف `LAWSUIT_PORTAL_STUB` (يحتاج إعادة شكل execution controller)
- إزالة prefetch مفيد للـ cold open
- أي تغيير class/layout

## تحقق

- domain/lawsuit + storage + LawyerNewCase + wave7m + smartFile tests: **434 passed**
- smart-modal + ArchivePortal: **379 passed**

## تقييم

| البُعد | درجة | ملاحظة |
|--------|-----:|--------|
| تنحيف / نظافة | **8.5** | ضغط مثبت؛ ليس أقصى ضغط ممكن |
| أداء | **8** | أقل alias/تكرار؛ بلا قياس حزمة |
| صدق | — | ليس «ضغط عالمي» لـ SmartFile بالكامل |

## التالي الاختياري
- قياس `build` chunk size قبل/بعد
- P1: طي stub التنفيذ المشترك عند فصل سطح execution تماماً
