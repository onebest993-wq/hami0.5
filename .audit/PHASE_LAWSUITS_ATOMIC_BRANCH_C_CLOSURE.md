# Branch C — إغلاق جزئي (أحوال شخصية)

**تدقيق:** [Atomic audit Branch C](7d1c47f4-1d94-430c-bcb1-0749ee53eddb)  
**إصلاح:** [Fix C1 C2 personal-status](d009d5e6-f438-4a36-9242-7b74c9e9740c)  
**تاريخ:** 2026-08-20

## ما أُغلق

| ID | الإصلاح |
|----|---------|
| C1 | `isCaseLinkViewOnly` يقفل flags + handlers + readOnly (مرآة المدني) |
| C2 | `collectPersonalPartyNameErrors` عند حفظ NewCase الشخصي |

## متبقٍ

- C3 incidental stub / اختبار هيكلي
- C4–C7 نظافة وموبايل بصري (إذن مطلوب لأزرار 44px)

## جاهز للانتقال

**نعم** للحد الأدنى الأمني (view-only + أسماء أطراف). النظافة الكاملة اختيارية.
