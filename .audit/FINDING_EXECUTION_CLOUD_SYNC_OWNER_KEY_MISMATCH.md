# FINDING — مزامنة السحابة تكتب على مفتاح `executionFiles` بينما الواجهة تقرأ `executionFiles:<uid>`

**التاريخ:** ١٠ آب ٢٠٢٦  
**الشدة:** عالية (سلامة بيانات)  
**الحالة:** **مُغلَقة** (١٠ آب ٢٠٢٦ — الجولة ٥)

## الملخص

بعد ترحيل فهرس إضابير التنفيذ إلى مفتاح مُقيَّد بالمالك (`executionFiles:<userId>`)، مسار `useCloudSync` في `LawyerDashboardBackgroundServices` ما زال يستخدم المفتاح العام `executionFiles` فقط. النتيجة: دمج السحابة قد لا يصل إلى البيانات التي تعرضها الواجهة، والمفتاح العام قد يُفرَّغ بعد الترحيل.

## الشيفرة

**المزامنة (مفتاح عام):**

```174:179:src/app/components/lawyer/dashboard/LawyerDashboardBackgroundServices.tsx
    const { syncNow: syncExecutionFilesNow } = useCloudSync({
        localKey: EXECUTION_FILES_STORAGE_KEY,
        syncInterval: 300_000,
        enabled: !!user && syncExecutionOn,
        onSyncError: (error) => debug.warn('[LawyerDashboard] sync execution skipped:', error),
    });
```

`EXECUTION_FILES_STORAGE_KEY` = `'executionFiles'` (`dossierStorageKeys.ts`).

**القراءة/الكتابة الفعلية (مفتاح المالك):**

```85:101:src/app/utils/executionFilesStorage.ts
function maybeMigrateLegacyIndexToOwner(ownerId: string): void {
    // ...
    const ownerKey = `${EXECUTION_FILES_STORAGE_KEY}:${ownerId}`;
    // ...
    writeExecutionFilesSerializedToKey(ownerKey, serialized);
    writeExecutionFilesSerializedToKey(EXECUTION_FILES_STORAGE_KEY, '[]');
```

## الأثر

- بعد الترحيل، المزامنة الدورية/الفورية قد تدمج في فهرس فارغ أو قديم.
- لا `onSyncSuccess` لإضابير التنفيذ (عكس الملاحظات والدعاوى) — حتى لو نجحت المزامنة على المفتاح الخاطئ، React state لا يُحدَّث.

## ما يُنصح به (للمرحلة التالية — خارج نطاق هذا الفحص)

1. تمرير `resolveExecutionFilesStorageKey(userId)` إلى `useCloudSync.localKey`.
2. إضافة `onSyncSuccess` يعيد تحميل فهرس الإضابير في الواجهة.
3. اختبار تكامل: migrate → cloud merge → قائمة الأرشيف تعكس الصفوف الجديدة.
