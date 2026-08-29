# Branch E0 — إغلاق (جسر جزائي فقط)

**تدقيق:** [Atomic audit Branch E0](c0cc3f4b-9c11-4d2a-a0db-ddffab0aae38)  
**تاريخ:** 2026-08-20  
**نطاق:** جسر archive → `openCriminalCase` → overlay → عودة لمخزن الدعاوى.  
**خارج النطاق:** منطق `criminal-system` الداخلي (فرع E).

## ما أُنجز

| ID | الإصلاح | ملفات |
|----|---------|--------|
| E0-1 | إخفاء/inert مخزن الدعاوى أثناء فتح جزائي (keep-alive يبقى) | `LawyerDashboardLawsuitsOverlayEntry.tsx` |
| E0-2 | `Suspense` يعرض BootChrome + `criminal-dashboard-portal` بدل `null` | `LawyerDashboardMainView.tsx` |
| E0-3 | رفع `CRIMINAL_MODAL_Z.shell` إلى 235 مع طبقات فوقه | `criminalModalPortal.tsx` |
| E0-4 | اختبارات عودة `fromLawsuitsWorkspace` + إغلاق مساحة عند فتح من الرئيسية | `useLawyerDashboardOverlays.criminalOpen.test.ts` |
| E0-5 | Toast عند رفض الفتح بلا جلسة | `useLawyerDashboardOverlays.ts` |

**اختبارات:** criminalOpen + criminalModalPortal نجحت.

## التقييم

| البُعد | درجة | ملاحظة |
|--------|------|--------|
| أداء | 8/10 | BootChrome يغطي فجوة أول إطار |
| نظافة | 8/10 | الجسر كان نظيفاً؛ إصلاحات مركّزة |
| أمان | 8/10 | جلسة + feedback مرئي |
| جودة | 8/10 | مسار العودة مغطى باختبار |
| موبايل | 7.5/10 | Escape/inert تحت الجزائي؛ Branch E للمزيد |
| صدق | — | لم يُراجع عمق criminal-system |

## الحدود

- حذف عبر stub قبل attach LazyProvider ما زال no-op (Med؛ يُعالج في E إن لزم).
- `openNormalNewCaseModal` يستدعي prepare criminal دائماً (Low).

## جاهز للانتقال

**نعم** → **E** (`criminal-system` داخلياً).

## المصداقية

لم يُنفَّذ تدقيق ذرّي لـ 400 ملف جزائي — ذلك فرع E صراحةً.
