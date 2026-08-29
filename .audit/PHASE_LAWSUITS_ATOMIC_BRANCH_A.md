# فرع A — سجل فحص ذرّي (قيد التنفيذ)

## نطاق
- dashboard Lawsuits*
- LawyerNewCase*
- ArchivePortal Lawsuit*

## خريطة مدمجة
بعد خريطة الاختصاصات: `PHASE_LAWSUITS_ATOMIC_FULL_PROGRAM.md` محدَّث (ترتيب A→F→F2→B→B2→C→D→E0→E).

## ملاحظات حية

### LawsuitsWorkspaceShell
- Escape/native back مع استثناء dialogs — سليم
- تبويبات 44px + safe-area FAB — سليم

### LawsuitsWorkspaceHost
- FAB اختصاص + جسر جزائي `prepareNormalCriminalCaseForm`
- تسخين SmartFile متأخر 5s — مقصود

### LawsuitsWorkspaceUrgentTab
- **FINDING مُغلق:** `min-h-[40px]` → `min-h-[44px]` على زر إعادة المحاولة
- شجرة المستعجل = فرع **D** (+108 ملف ≈12k سطر أُضيفت للجرد)

### LawsuitArchiveChrome
- في المسار المضمّن (`embedded`/`gridOnly`) لا يلتقط Escape — صحيح (Shell يتولّى)
- مسار غير مضمّن: Escape يغلق فوراً **بدون** استثناء حوارات السلة — **FINDING** إن استُخدم الأرشيف كـ overlay مستقل
- grid lazy + lifecycle bars + trash dialogs — بنية سليمة

### LawsuitsAddCaseFabWithPicker
- prefetch civil/personal/criminal على intent — سليم
- قائمة اختصاص + Escape يغلق القائمة — سليم
- touch ≥44px (`min-h-[3.25rem]` / `h-12`) + reduceMotion — سليم

### حالة
**غير مغلق** — انتظار تقرير وكيل A + باقي ملفات Lawsuit* في ArchivePortal.
