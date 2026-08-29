# إغلاق — بقايا بوابة الإنتاج / رفع المنتدى / kv-ownership

**التاريخ:** ٢١ آب ٢٠٢٦  
**النطاق:** WIFE فقط. ليس قطع الاتصال.

---

## ما أُنجز

1. **بوابة الإنتاج** — `WIFE_EXEMPT_ROUTES` يطابق `WIFE_BOOTSTRAP_API_PATHS` (signup + forgot-password).  
   ملف: `scripts/wife-production-gate.mjs`.

2. **صور المنتدى عبر `/api/upload` الموقّع**  
   `forumService` لم يعد يستدعي `supabase.storage.upload` أو `createSignedUrl` من العميل.  
   الرفع: `SecureAPIClient.fetchSecureResponse('/api/upload', FormData category=forum-media)`.  
   الرابط: `POST /api/upload/signed-url`.  
   الخادم يقبل ciphertext `.enc` في `forum-media` فقط ويتخطى magic-bytes؛ `.svg.enc` مرفوض.  
   المسار على الخادم: `{userId}/forum-media/...` من `requireWifeUser` (معرّف العميل يُتجاهل).

3. **kv-ownership** — نُفِّذ `npm run sync:kv-ownership`. نسخة Edge تطابق المصدر في التطبيق.

### تحقق

| الطبقة | النتيجة |
|--------|---------|
| Vitest (forum + upload + destruction) | **29/29 ناجح** |
| `node scripts/load-env-and-gate.mjs` | **Blockers: 0** — 5 تحذيرات بيئة محلية |

---

## التقييم

| البُعد | درجة | ملاحظة |
|--------|------|--------|
| أداء | جيد | الاختبارات محلية سريعة؛ لم يُغيَّر الشكل |
| نظافة | جيد | مسار رفع واحد موقّع؛ موك supabase الميت حُذف من اختبار المنتدى |
| أمان | جيد مع سقوف | الرفع يمرّ بـ WIFE + hash؛ ciphertext منتدى استثناء صريح للـ magic-bytes |
| جودة كود | جيد | `isForumEncryptedUpload` مشترك بين المسار والاختبار |
| موبايل | غير ممسوس بصرياً | نفس `fetch` الموقّع |

---

## الحدود

- Redis غير مضبوط محلياً؛ الإنتاج fail-closed على المعدل إن غاب Redis.
- لا round-trip JWT محامٍ حقيقي على إنتاج.
- كائنات قديمة تحت `{userId}/images/` ما زالت تُوقَّع إن `startsWith(userId/)`.
- تحذير البوابة `syncService.js` (`supabase.from` مباشر) **خارج هذا العمل**.
- فحص البرمجيات الخبيثة السحابي (إن فُعّل Cloudmersive) قد يرفض ciphertext عشوائي — حدّ إنتاج، ليس كاذباً هنا.

## الموقع

جاهز لإغلاق بقايا البوابة/الرفع/kv: **نعم**.

## المصداقية

لم يُرفع ملف حيّ إلى Storage؛ لم يُضبط Redis؛ لم يُدمج HMAC العميل مع BFF؛ لم يُغيَّر الشكل؛ لم يُعمل commit.
