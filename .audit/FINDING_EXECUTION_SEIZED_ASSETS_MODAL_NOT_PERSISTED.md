# FINDING — مودال الأصول المحجوزة لا يحفظ التعديلات في الإضبارة

**التاريخ:** ١٠ آب ٢٠٢٦  
**الشدة:** عالية (وظيفي)  
**الحالة:** **مُغلَقة** (١٠ آب ٢٠٢٦ — الجولة ٥)

## الملخص

`ExecutionSeizedAssetsModalContainer` يمرّر `onClose` و`executionId` فقط. `Modal_SeizedAssetsManager` يقبل `assets` و`onUpdateAssets` لكنهما غير موصولين — التعديلات تبقى في `useState` محلي وتُفقد عند الإغلاق.

## الشيفرة

الحاوية (`ExecutionSeizedAssetsModalContainer.tsx`) — props محدودة.

مقارنة: مودال القرارات في `ExecutionDashboardHeavyModals.tsx` يمرّر `persistExecutionMerge` و`seizedAssets` بشكل صحيح (~180–186).

## الأثر

مسار «إدارة الأصول المحجوزة» عرضي فقط — لا يدمج في `executionData` ولا في التخزين المحلي.
