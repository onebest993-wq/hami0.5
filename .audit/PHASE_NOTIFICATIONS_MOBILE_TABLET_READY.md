# إغلاق — جاهزية الإشعارات البرمجية للهاتف (Capacitor)

تاريخ: 2026-08-13

## المقصود

جاهزية التشغيل على الهواتف: كيبورد، تزامن، push، خصوصية، ضغط إشعار النظام → اللوحة.

## ما أُنجز

### جولة سابقة
| فجوة | إصلاح |
|------|--------|
| كيبورد / shrink / scroll | `notificationPanelKeyboardLayout` + gating |
| FCM foreground بلا تحديث صندوق | `refreshInboxAfterPush` |
| عودة من الخلفية | `appStateChange` في background sync |
| prefs plaintext | مسح + إيقاف الكتابة |
| Android popup blur + showPicker | تم |

### هذه الجولة — ضغط إشعار النظام
| سلوك | تفاصيل |
|------|--------|
| إشعار عام / بلا deep-link | يفتح لوحة الإشعارات |
| مع `notificationId` | stash focus + فتح اللوحة + تمرير البطاقة |
| `path: notifications` | فتح اللوحة فقط |
| تقويم / منتدى / تنفيذ / دعوى | تنقّل الميزة كما كان (بدون إجبار اللوحة) |
| `os-preview` | لا يفتح اللوحة |
| اللوحة مفتوحة مسبقاً | لا تُغلق؛ يُعاد التركيز فقط |
| cold start | pending v2 يحفظ openPanel + focus |

ملفات: `notificationOsTapRouting.ts`, `bindNotificationOsTapBridge.ts`, `useLawyerDashboardNotifications.ts`, `useNotificationPanel.ts`

## التقييم بعد الإكمال البرمجي

| بُعد | درجة |
|------|------|
| كيبورد | 8/10 |
| تزامن | 7.5/10 |
| ضغط إشعار النظام | 8.5/10 (كان ~7 — deep-link فقط) |
| خصوصية | 8.5/10 |
| جاهزية هاتف بالكود | ~8.5/10 |

## ما يبقى خارج الكود
1. تحقق APK/جهاز حقيقي
2. FCM إنتاج (`FCM_SERVICE_ACCOUNT_JSON` + redeploy)
3. Realtime اختياري (polling كافٍ حالياً)

## جاهز للانتقال؟
نعم لمسار الكود في قسم الإشعارات على الهاتف — المتبقي تشغيلي/جهاز.
