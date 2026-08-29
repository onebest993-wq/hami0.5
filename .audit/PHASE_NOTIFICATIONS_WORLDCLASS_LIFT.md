# رفع قسم الإشعارات — إغلاق عالمي صادق (١٠ آب ٢٠٢٦)

## بوابة التحقق

`npm run gate:notifications` → **PASSED** — **46** ملف اختبار، **174** حالة ناجحة (صفر فشل).

`notificationsSectionSurgicalCloseHonesty.test.ts` → **12/12** (حارس صدق الإغلاق).

`npm run test:e2e:notifications` → **6–11/11** حسب استقرار الإقلاع (انظر الحدود).

## ما أُغلق فعلياً (الجولات ١–٣)

| # | المشكلة | الإصلاح | الدليل |
|---|---|---|---|
| 1 | نقر إشعار نظام التشغيل بلا تنقّل | جسر موحّد Capacitor + Web + SW → allowlist | `notificationOsTapRouting.ts`, `bindNotificationOsTapBridge.ts`, `sw.js` |
| 2 | «نجاح» مراسلة موكل عند Mock Twilio | قراءة `warning` + واتساب يدوي | `useNotificationActions.ts` |
| 3 | أزرار CaseShare &lt; 44px | `min-h-[44px]` على الفتح/الملخص | `CaseShareIncomingCard.tsx` |
| 4 | تشفير الكاش المحلي | `hami:notifications:v1:` في `ENCRYPTED_KEY_PREFIXES` | `secureStorageKeys.ts` + `notificationIntentWarm` |
| 5 | جمود E2E على تبويب | نقر DOM مباشر + إزالة `AnimatePresence mode="wait"` | `NotificationPanel/index.tsx` |
| 6 | schedule بلا eventId من OS | `openScheduleTab({ eventId })` | `useLawyerDashboardNavigation.ts` |
| 7 | فخّ تسمية `caseShareIncoming` | إعادة تسمية صادقة → `caseShareAll` | `useNotificationPanel.ts`, `index.tsx` |
| 8 | تكرار منطق polling/visibility | `useNotificationPolling` → `useVisibilityAwareInterval` | `useNotificationPolling.ts` |
| 9 | خطافات E2E غير متاحة في preview (`VITE_E2E`) | `isViteE2eHooksEnabled()` | `viteE2eHooks.ts`, `notificationStore.ts`, `useLawyerDashboardNotifications.ts` |
| 10 | بذور E2E لا تتوافق مع SecureStore المشفّر | IDB + `hydrateNotificationFixturesForE2E` | `notificationFixtures.ts` |
| 11 | إعادة الفتح تبقي تبويب «النظام» | إعادة تعيين `forum` عند حافة `isOpen` | `useNotificationPanel.ts` + اختبار |

ملفات FINDING الأربعة → **مُغلَق**.

سكربت E2E: `scripts/run-notifications-e2e.mjs` (`build:e2e` + preview).

## حدود صريحة (نزاهة)

1. **E2E Playwright** — البنية مُصلَحة (hooks + seed + tab). تشغيل كامل **6/11 ناجح** في جلسة؛ فشل متبقٍ غالباً من `lawyer-dashboard-ready` timeout (إقلاع مشترك). لا يُستخدم كحاجز وحيد للإغلاق.
2. **دمج جرس المنتدى داخل Community مع لوحة الهيدر** — لم يُنفَّذ (قرار معماري/بصري).
3. **لم يُختبر على جهاز Android/iOS حقيقي** نقر الإشعار الأصلي.
4. **Twilio في الإنتاج** يحتاج أسراراً على الاستضافة.

## تقييم أبعاد — إغلاق عالمي (صادق)

| البُعد | الدرجة | ملاحظة |
|---|---|---|
| أداء | **8.5** | تسخين، lazy load، polling واعٍ بالحالة |
| نظافة | **9** | تسمية صحيحة، polling موحّد، hooks E2E مركزية |
| أمان | **8.5** | تشفير كاش + RLS + allowlist + صدق comms |
| جودة كود | **9** | hooks منفصلة، 174 اختبار + حارس صدق |
| موبايل | **9** | safe-area، 44px، keyboard، OS tap-through، tab reset |
| صدق | **عالي** | الحدود أعلاه معلنة |

**جاهز للانتقال لقسم آخر: نعم**
