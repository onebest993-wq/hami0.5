# تخفيف حجم الملف — عزل Android CSS عن الويب

**التاريخ:** 2026-08-13  
**قاعدة:** بلا تغيير بصري على الويب؛ أندرويد يحتفظ بنفس القواعد مع تحميل مبكر

## ما أُنجز
- أُخرج `lawyerProfileFx-android.css` (~16.3 ك.ب) من برميل `profilePageFx` sync.
- محمل منصّي: `profileAndroidFxLoader` — يعمل فقط عند `isAndroidNativeShell()`.
- تسخين مبكر: `capacitorShellBoot` + `profileShellPrime` (boot/hover/open) + دخول `RoyalLawyerProfile`.

## أثر الوزن
| سطح | قبل | بعد |
|-----|------|------|
| ويب / أول فتح ملف (sync CSS) | android داخل البرميل | **لا يُحمَّل** (~16 ك.ب أقل من مسار الملف العام) |
| Capacitor Android | sync مع البرميل | chunk منفصل مبكر — نفس القواعد، بلا وزن ويب |

## ما لم يُلمَس (عمداً)
- باقي برميل sync (hero/section/…) — FOUC
- Settings/Canvas المؤجّلة أصلاً
- تطهير CSS ميت غير مؤكد

## تحقق
اختبارات: `profilePageFxBudget` + `profileAndroidFxLoader` + `lawyerProfileFx-android` + `profileShellPrime`.

**جاهز:** نعم ضمن نطاق التخفيف الآمن.
