# FINDING — قيمة «الفقه الجعفري» في النفقة الماضية بترميز خاطئ (حرف لاتيني)

**التاريخ:** ١٠ آب ٢٠٢٦  
**الشدة:** متوسطة  
**الحالة:** **مُغلَقة** (١٠ آب ٢٠٢٦ — الجولة ٥)

## الملخص

واجهة `PastAlimonySection` تستخدم قيمة `<option value="الفقه الجعfري">` (حرف **f** لاتيني). الأنواع في `useAlimonyCalculator.ts` وstate في `ExecutionCreationView.tsx` تتوقع `الفقه الجعفري` (ف عربية).

## الشيفرة

```67:67:src/app/components/lawyer/ExecutionCreationView/components/PastAlimonySection.tsx
                <option value="الفقه الجعfري">الفقه الجعfري (بدون حد أقصى)</option>
```

```3:3:src/app/components/lawyer/ExecutionCreationView/hooks/useAlimonyCalculator.ts
export type AlimonyPastLawSystem = 'قانون الأحوال الشخصية 1959' | 'الفقه الجعفري';
```

## الأثر

- مقارنات صارمة `=== 'الفقه الجعفري'` تفشل بعد اختيار المستخدم من القائمة
- القيمة المخزَّنة في الإضبارة قد تختلف عن ما تتوقعه منطق لاحق
- العرض الشرطي في نفس الملف يقارن بالقيمة الخاطئة (`جعfري`) — متسق داخل القسم لكن غير متسق مع النظام
