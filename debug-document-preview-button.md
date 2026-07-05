# [OPEN] Debug Session: document-preview-button

## Symptom
- زر `اطلاع` في سجل المستندات داخل مودال `محفظة الأدلة الذكية` يبدو للمستخدم غير قابل للضغط أو لا يُظهر الملف.

## Scope
- المسار المستهدف: `AddDocumentModal` داخل `contentEntryModals.tsx`
- مسار المعاينة: `handlePreviewSavedDocument` -> `FullDocumentPreviewOverlay` -> `AppDocumentPreviewOverlay` -> `VaultDocViewer`

## Hypotheses
1. يتم إطلاق حدث الزر لكن طبقة المعاينة تظهر خلف طبقة أعلى أو خارج نطاق الرؤية بسبب `z-index`/`pointer-events`.
2. بعض المستندات تصل إلى `handlePreviewSavedDocument` بدون `snapshot` أو `fallback doc` صالح، فيفشل تجهيز المعاينة.
3. `resolveVaultDocForViewing()` يعيد `payload` غير صالح أو `null` في مسارات محددة، فيتوقف الفتح.
4. المعاينة تُفتح لكن React لا يعيد mount/render بشكل موثوق في كل ضغطة بسبب بقاء state سابق.
5. هناك تداخل حدثي داخل بطاقة السجل أو المودال يمنع اكتمال التفاعل في بيئات تشغيل محددة.

## Evidence Plan
- إضافة instrumentation فقط حول:
  - ضغط زر `اطلاع`
  - بداية/نهاية `handlePreviewSavedDocument`
  - نتيجة `snapshot/fallback doc`
  - نتيجة `resolveVaultDocForViewing`
  - فتح `FullDocumentPreviewOverlay` و`AppDocumentPreviewOverlay`
  - قيم `overlayScope`, `fileUrl`, `kind`

## Status
- Instrumented and reproduced in attached browser session

## Evidence Summary
- Reproduction path:
  - Open lawsuit dossier
  - Open `محفظة الأدلة الذكية`
  - Click `اطلاع` on saved PDF document

## Hypothesis Verification
| ID | Hypothesis | Status | Evidence Summary |
|----|------------|--------|------------------|
| A | الزر لا يطلق الحدث | REJECTED | log shows `preview button clicked` and `preview click entry` |
| B | المستند لا يملك snapshot/fallback صالح | REJECTED | log shows `hasSnapshot: true` with valid `snapshotId/fileName` |
| C | `resolveVaultDocForViewing()` يفشل | REJECTED | log shows `hasPayload: true`, `payloadKind: pdf`, `hasUrl: true`, `hasBlob: true` |
| D | حالة React لا تكمل فتح المعاينة | REJECTED | log shows `opening preview from snapshot` immediately before open |
| E | overlay يُبنى لكن لا يظهر | REJECTED in attached browser | logs show `FullDocumentPreviewOverlay`, `AppDocumentPreviewOverlay`, and `VaultDocViewer` all rendered with `isOpen: true`, `overlayScope: viewport`, `portalToBody: true` |

## Current Conclusion
- In the attached browser/runtime, the preview button works end-to-end.
- The previously real defect was the file-picking path in the document modal, which relied on `input.click()` for a hidden file input and had no true drag/drop support.
- Current evidence does **not** support a live failure in the preview button path on this attached runtime.
- If user still observes failure elsewhere, the remaining likely cause is environmental divergence (different browser/webview/tab/stale runtime) rather than the current code path executed here.
