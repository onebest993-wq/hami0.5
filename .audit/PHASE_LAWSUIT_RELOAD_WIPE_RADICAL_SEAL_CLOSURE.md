# إغلاق — اختفاء الإضبارة بعد Reload (ختم جذري)

## التشخيص
المشكلة لم تكن فقط تكرار سلة∩نشط. المسار الحرج:

1. قراءة sync تُرجع `[]` مسمّمة بينما القرص ما زال يحمل ciphertext.
2. `allowShrink` يتجاوز حارس المسح حتى للتفريغ الكامل.
3. مسار الإقلاع/إعادة التوزيع كان يكتب تقلّصاً نشطاً على القرص عند كل reload.
4. tombstone فاسد كان يخرج إضبارة حية من النشط.

## ما أُغلق
| طبقة | التغيير |
|------|---------|
| SecureStore | `getItemSync` / `isUnreadSync`: `[]` فوق ciphertext = unread |
| SecureStore | `allowShrink` لا يفرّغ `lawyer_files` بلا `allowVerifiedEmptyOverwrite` |
| DurabilityGate | إثبات تقلّص: كل id مُزال يجب أن يكون في سلة/أرشيف/tombstone |
| SegmentBundle | إزالة `allowShrink` من redistribute السحابة/المرآة |
| Boot | لا كتابة تقلّص نشط من الإقلاع — شفاء سلة/أرشيف فقط |
| Policy | tombstone ∩ نشط → فضّل النشط |
| Archive | رفض المسار إن فشلت كتابة النشط (مثل السلة) |

## التحقق
- 156 اختبار domain/lawsuit نجحت
- secureStoreEncryptedWipeGuard نجحت (poison cache + allowShrink empty)

## حدود الصدق
- إن كانت الإضبارة **مُسحت مسبقاً** من IndexedDB والسحابة، هذا الختم يمنع التكرار ولا يستعيد البايتات المفقودة.
- يحتاج المستخدم hard reload بعد سحب التحديث ثم إنشاء/التحقق من إضبارة موجودة.
