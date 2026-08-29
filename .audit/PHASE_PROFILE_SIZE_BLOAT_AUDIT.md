# مراجعة أحجام/كتل قسم الملف المهني — المرحلة 1

**التاريخ:** 2026-08-12  
**النطاق:** ملف المحامي المهني فقط (مصادر، ليس gzip dist)  
**قاعدة:** بلا تغيير بصري

## البصمة

| المقياس | القيمة |
|---------|--------|
| ملفات المصدر (بلا اختبارات) | 163 |
| الحجم | **760.1 ك.ب** |
| الأسطر | 20 792 |
| `.ts` | 303.3 ك.ب |
| `.tsx` | 278.5 ك.ب |
| `.css` | **178.3 ك.ب** (22 ملفاً → 21 بعد حذف اليتيم) |

## مسار CSS (المشكلة الأكبر)

| الدلو | ≈ ك.ب | التحميل |
|-------|------:|---------|
| sync أول فتح (pageFx + chrome + imageFx) | ~100.5 | MainView → ProfileTabHost → Royal |
| canvas مؤجّل | ~51.4 | `profileCanvasFxLoader` |
| settings FX | 25.4 | مع ورقة الإعدادات فقط (lazy) |
| enter FX | 4.5 | سطح مشترك مع الجدول |

`lawyerProfileFx-android.css` (~16.3 ك.ب) **خارج** برميل sync — يُحمَّل عبر `profileAndroidFxLoader` على Capacitor Android فقط (انظر `PHASE_PROFILE_SIZE_ANDROID_CSS_DEFER.md`).

## أكبر ملفات حية

1. `profileSettingsFx.css` 25.4 — lazy ✓  
2. `profilePageHeroFx.css` 20.6 — **sync**  
3. `profileImageFx.css` 20.3 — sync عبر `ProfileImageFrameShell`  
4. `useProfileSettingsBlockOps.ts` 19.0 — مرشّح تقسيم  
5. `useProfileEditSession.ts` 17.7 — مرشّح تقسيم  
6. `ProfileCustomBlocks.tsx` 16.4 — مرشّح تقسيم  

## جانك أُغلق في هذه الجولة

| البند | الحالة |
|-------|--------|
| `profileCanvasFx.css` (يتيم 82B) | حُذف |
| `prefetchProfileCanvasStudioFx` (تصدير ميت) | أُزيل |

ملفات Gate/Host/InstantShell/profilePageFxLoader/profileTabModuleLoader: **غائبة عن القرص** (محذوفات عمل سابقة).

## ترتيب الإغلاق التالي (بدون UI)

### P1
1. جعل استيرادات `profileShellPrime` لـ sheet/studio/canvas **ديناميكية** (قطع stem).  
2. دمج/تصفية `profileHubLoader` الهزيل.  
3. تقسيم الـ hooks/UI الضخمة أعلاه.

### P2
1. تأجيل أجزاء من page FX / imageFx عن المسار البارد إن أمكن بلا وميض.  
2. طيّ `profileIntentWarm` في المستدعين.

### P3 — يُبقى
جسر `profileInstantPaint`، hydrator، محمّلات الاستوديو الحقيقية، مسار المنتدى لـ Royal الكسول.

## صدق
- لم يُقَس gzip/dist في هذه الجولة.  
- Canvas: `profile-size-bloat-audit.canvas.tsx`

**جاهز لمتابعة P1:** نعم.
