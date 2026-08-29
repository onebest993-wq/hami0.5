# FINDING — `setSpecificDeliveryItemNature` غير معرَّف في ExecutionCreationView

**التاريخ:** ١٠ آب ٢٠٢٦  
**الشدة:** متوسطة (عطل محتمل عند إزالة نوع مطالبة)  
**الحالة:** **مُغلَقة** (١٠ آب ٢٠٢٦ — الجولة ٥ — أُزيل `@ts-nocheck` واستُبدل بـ `resetSpecificDeliveryItems`)

## الملخص

عند إزالة مطالبة «تسليم شيء معين» من القائمة النشطة، الكود يستدعي `setSpecificDeliveryItemNature('')` لكن لا يوجد state بهذا الاسم — النموذج يستخدم مصفوفة `specificDeliveryItems`.

## الشيفرة

```545:548:src/app/components/lawyer/ExecutionCreationView.tsx
    const removeActiveClaimType = useCallback((value: string) => {
        if (value === 'تسليم شيء معين') {
            setSpecificDeliveryItemNature('');
        }
```

الملف كله تحت `// @ts-nocheck` (سطر 1) — TypeScript لا يكشف الخطأ.

## الأثر

Runtime: `ReferenceError` عند إزالة نوع المطالبة من واجهة تعدد المطالبات — أو no-op إن كان الاسم مُعرَّفاً في نطاق آخر (لم يُؤكَّد في القراءة).
