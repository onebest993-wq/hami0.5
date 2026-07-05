# Debug Session: document-add-crash
- **Status**: [OPEN]
- **Issue**: انهيار المشروع عند إضافة مستند، مع فشل أو اضطراب في ظهور/معاينة بعض النتائج بعد الحفظ.
- **Debug Server**: Pending startup
- **Log File**: .dbg/trae-debug-log-document-add-crash.ndjson

## Reproduction Steps
1. فتح الإضبارة الذكية.
2. فتح نافذة إضافة مستند.
3. اختيار صورة أو PDF.
4. الضغط على حفظ المستند.

## Hypotheses & Verification
| ID | Hypothesis | Likelihood | Effort | Evidence |
|----|------------|------------|--------|----------|
| A | الانهيار يحصل داخل `saveFileToVault` أو نتيجة payload غير صالح يخرج منه | High | Med | Pending |
| B | الانهيار يحصل بعد الحفظ عند كتابة `vaultDoc` داخل `timeline metadata` ثم المرور في `saveToCloud` | High | Med | Pending |
| C | الانهيار يحصل من render داخل `AddDocumentModal` بعد تبدل حالة المعاينة أو الـ snapshot | Med | Med | Pending |
| D | الانهيار مرتبط بمستندات قديمة أو `editing/replacing` وليس الإضافة الجديدة نفسها | Med | Low | Pending |
| E | المشكلة من فقدان `userId` أو سياق التقويم أثناء حفظ المستند | Med | Low | Pending |

## Log Evidence
- `A / contentEntryModals.tsx:AddDocumentModal.handleSubmit`
  - submit وصل ومعه `hasFile=true`, `category=صورة`, `fileName=hami-logo.png`.
- `A / useProceduralTimelineActions.ts:handleAddDoc:entry`
  - `handleAddDoc` دخل فعلياً ببيانات صحيحة.
- `B / useProceduralTimelineActions.ts:handleAddDoc:vault-save`
  - `saveFileToVault` نجح وأعاد `attachmentDocId`.
- `C / useProceduralTimelineActions.ts:handleAddDoc:before-saveToCloud`
  - تكوين `timeline event` و `metadata.vaultDoc` تم قبل `saveToCloud` بدون crash.
- إعادة الإنتاج على صورة جديدة لم تُسقط المشروع، ما يستبعد فرضيات الحفظ الأساسية A/B/E في حالة الإضافة الجديدة.
- الاحتمال الأقوى تحوّل إلى `C`: فشل مسار `resolveVaultDocUrl(...)` أثناء render/preview بعد الحفظ كان يمكن أن يطيح الواجهة لعدم وجود `catch`.

## Verification Conclusion
- تم تحصين مسار المعاينة كالتالي:
  1. تخزين snapshot مصغّر وآمن داخل `timeline metadata` مع `signedUrl: null` لتجنب `blob:` المتقلب.
  2. إضافة `catch` في `DocumentTimelinePreview` و`handlePreviewSavedDocument` حتى يفشل العرض بهدوء بدل إسقاط الواجهة.
- **الحالة الحالية**: [OPEN] بانتظار تحقق المستخدم من بيئته الفعلية، خصوصاً الحالة التي كانت تسقط المشروع عنده.
