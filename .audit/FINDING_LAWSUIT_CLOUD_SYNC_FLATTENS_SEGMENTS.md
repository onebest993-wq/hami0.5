# مزامنة السحابة تسطّح المقاطع — **مُغلق فعلياً (2026-08-20)**

**اكتُشف:** 2026-08-10 · **أُعيد فتحه بالفحص الحي:** 2026-08-20 (إصلاح آب كان ناقصاً).

## الملخص

الحفظ على `lawyer_files` وحدها لا يكفي: إن وُجدت مقاطع `lawyer_files_active|archived|trash` فإن `reload` / أي `persist` يقرأ المقاطع القديمة ويعيد كتابة المرآة.

## الإصلاح (2026-08-20)

1. `applyLawsuitMonolithicMergeToSegments` في `lawsuitSegmentStorage.ts` — تقسيم كامل بعد دمج السحابة.
2. `cloudSyncEngine.ts` — يستدعيها لـ bucket الدعاوى (مثل reconcile التنفيذ).
3. `useLawsuitFilesState.reloadLawsuitFiles` — قراءة فقط بلا `persistLawsuitSegments`.
4. `resolveLazyLawsuitSegmentForMirror` — يمنع مسح archived/trash عبر `?? []`.
5. اختبارات: `lawsuitSegmentStorage.test.ts` + `cloudSyncLawsuitBucket.test.ts`.

**حدود:** E2E سحابة حية ما زال خارج البوابة الافتراضية.
