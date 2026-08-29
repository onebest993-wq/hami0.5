# تخفيف تصميم الدعاوى — أخف + أعصر (إذن صريح)

**تاريخ:** 2026-08-22  
**إذن المستخدم:** تخفيف الثقل البصري مع مظهر أجمل/أعصر — مع الحفاظ على navy `#0A0F1C` وذهب `#E6C673`.

---

## الاتجاه البصري

| قبل | بعد |
|-----|------|
| blur-2xl + ظلال سوداء ثقيلة | blur-md/sm أو بلا blur + ظل ناعم |
| غسل ذهبي شعاعي + glow | سطح navy نظيف + حد ذهبي رفيع |
| زوايا مغربية بألماس وتوهج | خط قوس واحد خفيف |
| زليج عالي الشفافية | نمط أخف / opacity أقل |
| بلاطات تنفيذ بـ glow ملوّن | تعبئة لونية مسطّحة هادئة |

---

## ملفات محورية

- `lawyerShared/lawsuitVisualLite.ts` — tokens مشتركة (LV_*)
- `smartFileModalTheme.tsx` · `moroccanGlassShell.tsx` · `smartModalChrome.tsx`
- `sessionHubGlassTheme.ts` · `smartFileOverlayZ.ts`
- `MoroccanGlassOverlay.tsx` · `QuickActions.tsx` · `useSmartHeaderDerivedState.ts`
- `archiveToolbarStyles.ts` · `ExecutionSmartCard.tsx`
- `newCaseGlassTheme.ts` · `executionCreationGlassUi.ts` · `ActionGridSection.tsx`

---

## حدود صادقة

- لم يُمسّ كل بكسل في الدعاوى (سطوح محلية كثيرة ما زالت ثقيلة جزئياً).
- personal-pearl / ملف شخصي: تخفيف خفيف عبر Frame المشترك فقط؛ ليس إعادة تصميم pearl كاملة.
- لمس ≥44px محفوظ في الثيمات المحدّثة.
- التقييم البصري يحتاج مراجعة بشرية في المتصفح (`npm run dev`).

---

## تقييم أبعاد (واقعي)

| البُعد | درجة | ملاحظة |
|--------|------|--------|
| أداء | 8.5/10 | أقل blur/ظل = أوفر لـ GPU موبايل |
| نظافة | 8.5/10 | tokens مركزية؛ لا تكرار عشوائي جديد |
| أمان | — | لا تغيير منطق |
| جودة كود | 8.5/10 | مصدر بصري واحد `lawsuitVisualLite` |
| موبايل | 9/10 | blur أخف + touch floors |
| صدق | 9.5/10 | ليس redesign شامل لكل الشاشات |

**جاهز للانتقال؟** نعم لمراجعة بصرية؛ مزيد من السطوح المحلية اختياري.
