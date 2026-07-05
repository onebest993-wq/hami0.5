# Debug Session: nested-button-warning

Status: [OPEN]

## Symptom
- يظهر تحذير React: `validateDOMNesting(...): <button> cannot appear as a descendant of <button>`.
- الـ stack trace يشير إلى `WorkspacePinButton` داخل `TransactionCard` ضمن شاشة المعاملات.

## Scope
- شاشة `TransactionsThreading`.
- التركيب البنيوي بين `TransactionCard`, `TxGlassPanel`, و `WorkspacePinButton`.

## Reproduction
1. فتح شاشة المعاملات.
2. عرض قائمة النتائج.
3. ظهور التحذير في console.

## Falsifiable Hypotheses
1. `TransactionCard` يرسم عنصر `button` يغلّف `WorkspacePinButton`.
2. `TxGlassPanel` يحوّل الحاوية إلى `button` إضافةً إلى زر آخر أعلى منه.
3. `WorkspacePinButton` يملك مسار render بديل غير مستخدم هنا.
4. هناك أكثر من موضع nested button داخل قائمة النتائج نفسها.
5. إزالة التحذير قد تتطلب أيضاً ضبط propagation للحفاظ على نفس UX.

## Evidence Plan
- قراءة مسار render الفعلي في المكونات المشار إليها.
- إضافة instrumentation minimal حول نوع الحاوية/الأزرار في المسار المتهم.
- إعادة إنتاج وقراءة الأدلة.
- تطبيق إصلاح minimal بعد ثبوت الجذر.
