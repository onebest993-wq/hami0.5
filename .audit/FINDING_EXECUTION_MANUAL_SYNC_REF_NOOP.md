# FINDING — زر/مسار المزامنة اليدوية للتنفيذ معطّل (ref = noop)

**التاريخ:** ١٠ آب ٢٠٢٦  
**الشدة:** متوسطة  
**الحالة:** **مُغلَقة** (١٠ آب ٢٠٢٦ — الجولة ٥)

## الملخص

`syncExecutionFilesNowRef` يُسجَّل في `cloudSyncStatusStore` لكنه يُضبط دائماً على `() => undefined` ولا يُربط بـ `syncExecutionFilesNow` الفعلي. المزامنة الدورية (كل ٥ دقائق) تعمل؛ **«مزامنة الآن» من الواجهة لا يفعل شيئاً**.

## الشيفرة

```185:190:src/app/components/lawyer/dashboard/LawyerDashboardBackgroundServices.tsx
        store.registerSyncHandler('execution', () => syncExecutionFilesNowRef.current());
```

الأب (`AdvancedBackgroundRuntime` أو ما يعادله) يمرّر refs تُصفَّر عند التركيب:

```275:277:src/app/components/lawyer/dashboard/LawyerDashboardBackgroundServices.tsx
    syncExecutionFilesNowRef.current = () => undefined;
```

`syncExecutionFilesNow` من `useCloudSync` **موجود** (سطر 174) لكن لا يُنسخ إلى الـref.

## الأثر

المستخدم يظن أنه زامن إضابير التنفيذ يدوياً؛ لا تغيير في البيانات.
