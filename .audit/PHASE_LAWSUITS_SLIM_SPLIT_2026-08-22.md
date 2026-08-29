# تقرير إغلاق — تخفيف/تقسيم أثقل ملفات الدعاوى (موجة 2026-08-22)

## ما أُنجز

### تقسيم
| ملف | قبل | بعد | ملاحظة |
|-----|-----|-----|--------|
| `JudgmentOutcomeActions.tsx` | ~462 | **152** | تقسيم إلى FirstInstance / Absent / Appeal / Cassation / Correction |
| `CriminalDashboardDossierBody.tsx` | ~554 | **472** | طلبات + تتبع → `CriminalDossierRequestsPanel` / `TrackingPanel` |
| `useCriminalDashboardResolvedOrchestration.ts` | ~922–956 | ~956 | جذر تركيب؛ محاولة دمج banners+merge زادت الحجم فأُلغيت |

ملفات جديدة: `JudgmentFirstInstanceHadoriActions`, `JudgmentAbsentRoleActions`, `JudgmentAppealStageActions`, `JudgmentCassationStageActions`, `JudgmentCorrectionStageActions`, `CriminalDossierRequestsPanel`, `CriminalDossierTrackingPanel`.

### تصميم (بإذن صريح)
- `CaseJourneyHeader`: رموز `LV_*` (سطح أخف، زر إحالة مسطح، touch 44px)
- `judgmentGlassButtons`: ربط بـ `LV_BTN_GOLD` / `LV_INSET` + `min-h-[44px]`

### نظافة / أمان
- لا منطق سلوك جديد؛ نفس المسارات
- تحديث `criminalDashboardStructure.test.ts` لألواح الطلبات/التتبع
- لا مسارات أسرار/صلاحيات لم تُمس في هذه الموجة

### تحقق
- `criminalDashboardStructure.test.ts`: **19/19** ناجحة

## التقييم (واقعي)

| البُعد | درجة | ملاحظة |
|--------|------|--------|
| أداء | 7.5/10 | تقسيم يحسّن قابلية الصيانة؛ لا قياس bundle جديد لهذه الموجة |
| نظافة | 8/10 | Judgment منظّف جيداً؛ DossierBody ما زال يفكك حقيبة props كبيرة |
| أمان | 7/10 | لا ثغرات جديدة ظاهرة؛ لم يُراجع أمنياً من الصفر |
| جودة كود | 8.5/10 | تقسيم Judgment احترافي؛ orchestration ما زال جذر تركيب ضخم |
| موبايل | 8/10 | touch 44px على أزرار الحكم/الإحالة؛ safe-area خارج النطاق |

## الحدود
- `useCriminalDashboardResolvedOrchestration` لم يُنحَّف فعلياً (أي شريحة تمرّر كل الحقول تطيل الملف)
- `SessionAndRequestsHub` (~466) لم يُقسَّم في هذه الموجة
- لم يُشغَّل E2E كامل (طلب المستخدم سابقاً إيقافه)

## جاهز للانتقال
**نعم** للموجة التالية: SessionAndRequestsHub / caseLinking / FinalDecisionEntry — بشرط عدم زيادة حجم الجذر بتمرير حقول مكررة.

## المصداقية
ما لم يُنفَّذ: تخفيف orchestration الجذري، تقسيم SessionHub، قياس bundle/TTFI لهذه الموجة.
