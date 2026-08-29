# إغلاق نقص أحجام الملف — P1 stem cut

**التاريخ:** 2026-08-12  
**قاعدة:** بلا تغيير بصري

## ما أُغلق
1. **`profileShellPrime`** — كل محمّلات studio/sheet/canvas/warm/settings أصبحتاميكية؛ لا سحب إلى stem عبر `ProfileTabHost`.
2. **حذف** `profileHubLoader.ts` + `profileIntentWarm.ts` — الدمج في `royalLawyerProfileLoader` + aliases في prime.
3. **هيدر/فتح** — تحميل hub ديناميكي من prefetch و openFlow و lazyImports.
4. P0 سابق: يتيم CSS + تصدير studio ميت.

## تحقق
Vitest: 9 ملفات / 51 اختباراً — ناجح.

## تقييم
| البُعد | درجة |
|--------|------|
| أداء/stem | مرتفع لهذا النطاق |
| نظافة | مرتفع |
| صدق | تقسيم الملفات الضخمة + CSS sync ما زالا مفتوحين |

## حدود متعمدة (التالي)
- تقسيم `useProfileSettingsBlockOps` / `useProfileEditSession` / `ProfileCustomBlocks`
- تأجيل CSS sync (~100ك.ب) فقط إن أمكن بلا FOUC

**جاهز للانتقال داخل النطاق المغلق:** نعم.
