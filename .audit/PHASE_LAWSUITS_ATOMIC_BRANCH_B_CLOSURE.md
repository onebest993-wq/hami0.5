# Branch B — دفعة ضخمة (إصلاحات وفق التدقيق)

**تاريخ:** 2026-08-20  
**أساس:** [Atomic audit Branch B](9f819582-8bdf-4d08-900b-de4986aeea1e)

## ما أُنجز في هذه الدفعة

| بند | التفاصيل | وكلاء/عمل |
|-----|----------|-----------|
| **B7** | hydrate أحزاب في الذاكرة فقط — بلا `saveToCloud` عند الفتح | مباشر |
| **B8** | fingerprint أعمق (petitions/attachments/tasks/incidental/parties/updatedAt) | مباشر |
| **B1** | `SmartJudgmentModal` ~1015→**~412** + أجزاء تحت `parts/judgment/` | [Split SmartJudgmentModal](718df4f1-e680-4469-a290-bd0e9bb4dccb) |
| **B2** | فصل FastTrack + Attachment من incidental (~851→**~608**) | [Extract FastTrack Attachment](8db73976-3e45-4d6d-ac1a-5fe94c27b253) |
| **B3** | `SessionAndRequestsHub` ~727→**465** + theme/form/readonly | [Split SessionAndRequestsHub](03182dcb-17f3-41bf-b625-b2ce73efb0e3) |
| **B6+** | immutability لرد قاضٍ / ربط / مخاطبة / تصحيح مادي + `replaceStageAt` | [Immutability](49e6869d-c674-4d3d-b007-cc8e1aea622f) + إكمال يدوي |
| **B11** | تصحيح مادي على `activeStageIndex` فقط | يدوي |
| **B4–B6 سابقاً** | تظلم + تقويم + FT immutable | جولات سابقة |

**اختبارات مستهدفة:** 17 ناجحة (fastTrackStatus · stageImmutable · fileSync indices · calendarContext).

## التقييم المحدَّث (فرع B)

| البُعد | قبل | بعد الدفعة | صدق |
|--------|----:|----------:|-----|
| أداء/استقرار | 6.5 | **8** | hydrate بلا حفظ + fingerprint أعمق |
| نظافة | 4.5–6 | **8** | تقسيم P0 الثلاثة + pause نظيف |
| أمان | 7 | **7.5** | لا تغيير جوهري |
| جودة/تقسيم | 4 | **8** | incidental/judgment/hub تحت عتبة الوحوش |
| موبايل | 6.5 | **6.5** | بلا إذن بصري — لم يُمس |

## حدود متبقية

- بعض handlers incidental ما زالت تستخدم `[...stages]` + تعيين slot (نسخ سطحي للمرحلة عبر spread — مقبول أكثر من طفرة المرجع).
- incidental ما زال ~600 سطر (إحالة/توحيد/ربط) — قابل لفصل B2 لاحقاً.
- قوالب FastTrack في localStorage بلا عزل مستخدم (B14 — منخفض).
- موبايل: أزرار &lt;44px / safe-area overlays — خارج إذن التصميم.

## جاهز للانتقال

**نعم جزئياً** — الحد الأدنى لإغلاق B من التدقيق (تقسيم P0 + منطق FT + hydrate/fingerprint + immutability الحرجة) **مُنفَّذ**.  
الإغلاق الكامل لشجرة SmartFile «ذرّة بذرّة» ما زال يستلزم B2 (linking) وC (أحوال) كفروع منفصلة.

**المصداقية:** لا ندّعي إغلاق قسم الدعاوى كاملاً.
