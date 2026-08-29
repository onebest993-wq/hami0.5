# كاش الإشعارات المحلي (أسماء موكّلين، أرقام قضايا) يُخزَّن بلا تشفير — **مُغلَق**

**اكتُشف:** ٩ آب ٢٠٢٦، أثناء الفحص الذري لقسم الإشعارات.
**أُغلق:** ١٠ آب ٢٠٢٦.

---

## ما كان

`hami:notifications:v1:<userId>` كان خارج `ENCRYPTED_KEY_PREFIXES`، فكتابة `SecureStoreService` كانت نصّاً صريحاً بالكامل (عناوين، رسائل، `actionPayload`).

## ما صار

| التغيير | الملفّ |
|---|---|
| السابقة أُدرجت في `ENCRYPTED_KEY_PREFIXES` | `services/secureStorageKeys.ts` |
| اختبار يمنع الرجوع لـ plaintext | `services/secureStorageKeys.test.ts` |
| `NotificationRepository` يستخدم `getItem`/`setItem` غير المتزامنين للتشفير الفعلي | `infrastructure/NotificationRepository.ts` |
| تسخين `decryptedCache` عند فتح اللوحة | `hooks/lawyerDashboard/notificationIntentWarm.ts` |
| حارس الإغلاق الجراحي يثبت السابقة | `runtime/__tests__/notificationsSectionSurgicalCloseHonesty.test.ts` |

**ملاحظة هجرة:** الكتابات الجديدة مشفَّرة. النسخ النصّية القديمة على الأجهزة تُستبدَل عند أول `saveLocal` ناجح بعد التحديث (fetch/merge/mark). لا تُضاف مفاتيح الإشعارات إلى `BOOT_SHELL_WARM_KEYS` (مفتاح لكل مستخدم، غير معروف عند الإقلاع) ولا إلى wipe-guard (كتابة `[]` بعد حذف آخر عنصر مسار مشروع).
