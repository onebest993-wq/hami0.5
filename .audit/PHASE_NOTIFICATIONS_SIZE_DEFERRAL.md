# Phase — Notifications Size Deferral (safe batch)

تاريخ: 2026-08-13  
القسم: لوحة الإشعارات — تخفيف حجم فتح الوارد دون تغيير سلوك ظاهر.

## ما أُنجز

| بند | التنفيذ |
|-----|---------|
| P0 AlertControls | `React.lazy` عبر `notificationPanelLazyModules`؛ يُحمَّل عند `alert-controls` فقط |
| P0 Prefetch | زر الصوت: `pointerenter` / `pointerdown` / `focus` → prefetch |
| P0 SharedDossierViewer | lazy داخل `CaseSharePanelSection` عند `viewing` فقط |
| P1 CaseShare UI | لا يُركَّب إلا إذا `hasCaseShareContent` (+ prefetch عند ظهور المحتوى) |
| P1 OS event | `notificationOsTapEvents.ts` — اللوحة تستورد الثابت فقط |
| P1 mute | `notificationSessionMute.ts` — inbox لا يسحب `notificationAlertPolicy` |
| UX صغير | إعادة فتح اللوحة بلا focus → تبويب المنتدى (يطابق الاختبار) |

## التحقق

Vitest: **15 ملف / 73 اختبار — نجاح** (NotificationPanel + alert policy + OS routing + honesty).

## حدود

- حجم قرص الخدمات (~144KB) لم يُقص — التأجيل عند **أول parse للوارد**.
- أول فتح لتحكم التنبيهات قد يظهر skeleton قصير إن لم يكتمل prefetch.
- لم يُبنَ `dist` جديد لقياس gzip بعد التغيير في هذه الجلسة.

## جاهز؟

نعم — دفعة التخفيف الآمنة مكتملة.
