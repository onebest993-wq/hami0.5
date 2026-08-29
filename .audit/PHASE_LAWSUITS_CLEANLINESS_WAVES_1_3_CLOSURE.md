# نظافة قسم الدعاوى — تقرير صدق موجات 1–3 (2026-08-21)

**جرد:** [inventory](cf9ae4a6-af40-459d-99d6-c4386c5e14d1) · [stubs](6303040a-17ff-4eda-b2fa-9b1ceb2d2d16)  
**تنفيذ:** W1 [0b07faa1](0b07faa1-fac4-48cb-ae33-a4ad78bd9795) · W2 [1b93de83](1b93de83-41ee-4a48-9dbb-ca80a710ebb7) · W3 [506ded4a](506ded4a-7cee-4910-8f00-b63ac00ff6b4)

## هل اكتملت النظافة الشاملة حرفياً؟

**لا.** اكتملت **موجات احترافية عالية الثقة** (ميت مثبت + تكرار واضح + demote exports)، لا مسح كل سطر في ≈1000 ملف.

## ما أُنجز (مثبت)

| موجة | محتوى |
|------|--------|
| 1 | حذف barrels/shims/ميت urgent+criminal+PS tokens؛ noop onToggleClient؛ توحيد ModalSuspense؛ 78 اختباراً |
| 2 | re-export ميت؛ إصلاح urgentSectionStructure؛ demote 15 رمزاً؛ تخطي lifecycle merge (خطر بصري)؛ 149 اختباراً |
| 3 | حذف CORRECTION_JUDGMENT_ACCEPTED + PARTIES_CARD_SHELL؛ demote 20؛ barrel urgent → 3 رموز حية؛ 74+ اختباراً |

## ما بقي (مرتب)

1. مزيد demote تحت criminal / Form_Urgent / personal-status  
2. توحيد توكنات زجاج (بلا انحراف بصري)  
3. تقليل `as any` في hydrate/migrate (عمل أنواع، ليس حذف)  
4. P2: حقول ترحيل `@deprecated` على النماذج — قرار منتج  
5. ملفات ضخمة (تقسيم) — نظافة هيكل لا ميت فقط  

## التقييم الصادق

| البُعد | درجة |
|--------|------|
| احتراف الموجات المنفَّذة | 9/10 |
| شمول القسم حرفياً | 4/10 (موجات ≠ ألف-ياء) |
| خطر كسر بعد الحذف | منخفض (Grep + vitest) |
| صدق التقرير | إلزامي |

## جاهز لمتابعة موجة 4؟

نعم عند الطلب — بنفس قواعد الثقة العالية.
