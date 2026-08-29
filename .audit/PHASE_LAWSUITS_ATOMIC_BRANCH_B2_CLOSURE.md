# Branch B2 — إغلاق جزئي

**تدقيق:** [Atomic audit Branch B2](dd31bd79-d70e-4ddc-810c-43518f4b4823)  
**إصلاح:** [Fix B2 incidental ID and orphan](9009d892-5262-4170-9f5a-82d636967c9a)  
**تاريخ:** 2026-08-20

## ما أُغلق

| ID | الإصلاح |
|----|---------|
| B2-1 | `normalizeFileId` في `lawsuitNewCaseSave` + `useLawsuitActiveDossierOpenUpdate` |
| B2-2 | لا صف حادثة قبل NewCase؛ upsert عبر `patchIncidentalLinkedFile(createIfMissing)` عند نجاح الحفظ |

## متبقٍ (منخفض/متوسط)

- B2-3 تكرار التوحيد الخارجي
- B2-4 incidental ~567 ما زال سلة handlers

## جاهز للانتقال

**نعم** لمسار الربط/الحادثة الحرج. فصل handlers اختياري لاحقاً.
