# Phase 2 — Zero-CLS Frame-1 (قيد التنفيذ المهني)

تاريخ: 2026-08-12

## المشكلة الجذرية

مسار ultra-minimal كان يرسم `unreadCount: 0` و `secretaryAlerts: []` عمداً، ثم تُحدَّث القيم بعد الكشف → CLS مرئي (شارات تقفز).

الكشف الأصلي كان يحدث عند paint الشبكة **قبل** زرع الكاش في نموذج أول إطار.

## العقد المنفَّذ

```
BootLaunchOrchestrator
  seedBootLaunchFrame1()     // peeks محلية فقط
  → buildUltraMinimalFirstPaint  // unread + secretary من اللقطة
  → home grid paint
  → beforeBootShellReveal()
  → remove shell → markBootRevealDone → HamiBoot.notifyReady
```

**لا يُنتظر:** spark bridge / شبكة المنتدى / orchestrator كامل (يحافظ على TTFI).

## التقييم (صادق)

| بُعد | درجة | ملاحظة |
|------|------|--------|
| أداء | 7/10 | peeks sync خفيفة؛ بلا قياس جهاز لـ CLS |
| نظافة | 8/10 | مصدر واحد `bootFrame1Hydrate` |
| جودة | 8/10 | نموذج أول إطار لم يعد يكذب بالأصفار |
| موبايل | 7/10 | يحتاج تحقق بصري للشارات |
| صدق | — | شارات Hub المؤجلة (spark) ما زالت قد تتحدث بعد الكشف — مقصود للوزن |

## جاهز لإغلاق Phase 2؟

جزئياً — بذور Frame-1 للهيدر/السكرتير تمت. شارات Hub/Forum المؤجلة تبقى Phase 2b إن لزم.
