# إغلاق قسم — معاملات: plaintext محلي + شبكة فقط عند مزامنة العمل

**التاريخ:** ٢٩ آب ٢٠٢٦  
**النطاق:** بلاطة `hubTransaction` / قسم المعاملات — توجيه المالك: لا إنترنت ولا تشفير محلي ولا WIFE في المسار اليومي؛ الشبكة فقط لمزامنة الإضابير/العمل عند التفعيل.

---

## ما أُنجز

| المجال | السلوك |
|--------|--------|
| مفاتيح التخزين | `isTransactionsLocalPlaintextKey` — `hami:transactions:*` و`hami:transactionsThreading:v1:*` بلا تشفير محلي |
| `isNeverEncryptedKey` / `isWarmEncryptAlwaysKey` | المعاملات خارج سياسة التشفير عند الراحة |
| سحابة | كما كانت: `lawyerTransactionsCloud` + `lawyerCloudKv` خلف `isLawyerWorkCloudLive` فقط؛ WIFE على `/api/kv-proxy` عند المزامنة |
| ترحيل | `SecureStoreService.warmPersistedKeys` يرحّل `hami_enc_v2:` القديم إلى plaintext عند خروج المفتاح من السياسة |
| صدق | اختبارات محدّثة + `transactionsLocalPlaintextCloudOnlyHonesty.test.ts` |

---

## الاختبار

| الجناح | النتيجة |
|--------|---------|
| secureStorageKeys + plaintextFallback + transactions honesty + offlineSections + wifeHackerCrew (مقاطع ذات صلة) | **47** نجح |

لم تُشغَّل حملة Playwright ولا جهاز Capacitor.

---

## التقييم

| البُعد | درجة | ملاحظة |
|--------|------|--------|
| أداء | 8/10 | لا AES محلي يومي على سجل المعاملات؛ الترحيل لمرة عند ciphertext قديم. إطار حي غير مُقاس. |
| نظافة | 8/10 | سياسة موحّدة مع التنفيذ؛ حذف منprefixes المشفّرة. |
| أمان | 8/10 | عزل شبكة + plaintext محلي حسب التوجيه. ليس pen-test جهاز مسروق. |
| جودة | 8/10 | دالة سياسة + اختبارات صدق. |
| موبايل | 7/10 | أقل عمل Crypto عند الفتح؛ الجهاز غير مُقاس. |
| صدق | 9/10 | الحدود أدناه. |

---

## الحدود

| الحد | السبب |
|------|--------|
| مشاركة إجراء إلى المنتدى | شبكة صريحة باختيار المستخدم — ليست مسار يومي |
| KV عند تفعيل المزامنة | يمرّ WIFE/`SecureAPIClient` — مطلوب لتوقيع الكتابة السحابية |
| حماية ضد سرقة الجهاز | plaintext على القرص كما في التنفيذ؛ العازل هو قطع الشبكة |
| `PROTECTED_WARM_KEYS` ما زال يضمّ `hami:transactions:v1` | حارس المسح + ترحيل ciphertext قديم |

---

## الموقع

**جاهز للانتقال: نعم** ضمن الحدود. قسم المعاملات: محلي بلا تشفير/WIFE يومياً؛ الإنترنت فقط عند مزامنة العمل السحابية.
