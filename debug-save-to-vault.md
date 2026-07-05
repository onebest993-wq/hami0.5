# Debug Session: save-to-vault

Status: [OPEN]

## Symptom
- زر `حفظ المرفق في المخزن` في المنشورات ما زال يعرض `تعذّر حفظ المرفق في المخزن`.
- المستخدم يؤكد أيضاً أن `المخزن` و`المفكرة` لم يعد لهما وجود مستقل بعد الدمج في `المستودع الذكي`، وأي بقايا أو مسميات قديمة يجب حذفها.

## Scope
- مسار حفظ مرفق منشور المنتدى داخل `Smart Vault / المستودع الذكي`.
- أي تسميات أو IDs أو عناصر legacy مرتبطة بـ `dockVault` و`dockNotepad`.

## Reproduction
1. فتح منشور يحتوي صورة أو ملف.
2. الضغط على زر `حفظ المرفق في المخزن`.
3. ظهور رسالة الفشل.

## Falsifiable Hypotheses
1. فشل `resolveCommunityAttachmentUrl()` أو رجوع `null`.
2. فشل تحويل الرابط إلى `File` داخل `urlToFile()`.
3. فشل `saveFileToVault()` بسبب metadata أو userId أو storage path.
4. الحفظ ينجح لكن يحدث استثناء لاحق يجعل الواجهة تعرض الفشل.
5. بقايا `dockVault/dockNotepad` ما زالت موجودة في الطبقات المنطقية أو الواجهات رغم دمجها في `المستودع الذكي`.

## Evidence Plan
- instrumentation في:
  - `handleSavePostToVault`
  - `saveForumAttachmentToVault`
  - `saveFileToVault`
- ثم إعادة إنتاج وقراءة logs.
- بعد تثبيت الجذر: إصلاح منطقي minimal.
- بعدها تنظيف legacy labels/ids للمخزن والمفكرة.
