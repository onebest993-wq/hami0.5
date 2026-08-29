# إغلاق — شاشة إقلاع أصلية (شعار + شريط برمجي)

تاريخ: 2026-08-21

## مطابقة الأوامر مع الوضع العام (قبل التنفيذ)

العقد القائم كان **سطحاً صامتاً** `#0A0F1C` بلا شعار، مع قطع فوري لـ AndroidX SplashScreen حتى لا تظهر فجوة سوداء. طلب الشعار+الشريط **يُنفَّذ على الغلاف الأصلي** دون كسر عقد الكشف (HamiBoot.notifyReady، بلا حد أدنى، بلا poll).

| طلب | تعارض مع الوضع العام | القرار المنفَّذ |
|-----|----------------------|-----------------|
| خلفية `#000000` | يفتح وميضاً مع اللوحة `#0A0F1C` | الإبقاء على هوية `#0A0F1C` (الخيار المسموح: «أو الكود المعتمد») |
| شريط على SplashScreen API | أندرويد 12+ لا يدعم ProgressBar داخل الـ API | أول إطار = شعار GPU؛ الشريط على طبقة أصلية فوق WebView |
| تلاشي 150ms لـ AndroidX | التلاشي السابق فتح فجوة سوداء/نصف جاهزة | قطع فوري لـ AndroidX على الطبقة المطابقة، ثم تلاشي الطبقة ≤150ms بعد الجاهزية |
| حد أدنى لعرض الشعار | `getBootRevealMinMs() = 0` و«ممنوع التأخير الاصطناعي» | بلا `Thread.sleep` / `setTimeout` للعرض؛ failsafe 8ث شبكة أمان فقط |
| شعار على الويب | أول بايت صامت + e2e `silent-canvas` | الويب يبقى بلا شعار؛ شريط CSS فقط. الأصلي يملك الشعار |

## ما أُنجز

- Android 12+: `Theme.SplashScreen` + `splash_icon` (288dp، الشعار داخل دائرة 160dp) عبر `androidx.core:core-splashscreen:1.2.0`.
- طبقة `hami_boot_overlay` + `HamiBootProgressView` (3dp، pill، تدرج ذهبي، ValueAnimator).
- تحرير الطبقة عند `HamiBoot.notifyReady` بتلاشٍ 150ms (0 عند Reduce Motion).
- iOS: قوالب `LaunchScreen.storyboard` (`scaleAspectFit`) + `HamiBootOverlayView.swift` + `HamiBootPlugin.swift` — تُنسخ عند `cap:apply:ios` على ماك.
- أصول WebP < 30KB في `drawable-nodpi`؛ حُذفت PNG/JPG الإقلاع القديمة غير المستخدمة.
- `androidScaleType: FIT_CENTER`. Capacitor `launchShowDuration: 0` ما زال يمنع شاشة plugin مزدوجة.

## التقييم

| البُعد | درجة | ملاحظة |
|--------|------|--------|
| أداء / استقرار | 8/10 | أول إطار GPU؛ بلا تأخير اصطناعي. TTFI اللوحة لم يُقاس على جهاز في هذه الجولة |
| نظافة | 8.5/10 | أصول ثقيلة قديمة حُذفت. قوالب native-ready محدَّثة |
| أمان | 8/10 | لا تغيير في بوابة الجلسة؛ التحرير ما زال حدث HamiBoot |
| جودة كود | 8.5/10 | شريط Kotlin/Swift منفصل؛ اختبار honesty جديد |
| موبايل | 8/10 | 160dp circle، fitCenter، scaleAspectFit، reduceMotion، failsafe 8ث |
| صدق | 9/10 | التعارضات معلنة؛ iOS بلا مشروع Xcode كامل على ويندوز |

## الحدود

- لا يمكن رسم شريط على Android 12+ SplashScreen API نفسه.
- مشروع iOS غير مكتمل على هذا الجهاز (لا Info.plist/Xcode). القوالب جاهزة؛ الربط في Xcode يتم على ماك عبر `npm run cap:add:ios && npm run cap:apply:ios`.
- الويب يبقى `silent-canvas` عمداً.
- لم يُبنَ APK حي في هذه الجولة — التحقق ساكن + اختبارات مصدر.

## الموقع

جاهز للانتقال من جهة **عقد الإقلاع الأصلي (شعار+شريط بدون تأخير اصطناعي)**: **نعم**.

جاهز بمعنى «مُقاس TTFI على Pixel»: **لا**.
