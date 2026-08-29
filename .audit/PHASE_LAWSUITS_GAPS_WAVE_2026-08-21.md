# موجة إكمال النقص — 2026-08-21

**مسح:** [Find remaining lawsuit gaps](0ad6620a-4f94-4f6a-806b-29400afb7c33)  
**إصلاح:** [Fix remaining A+B gaps](00f40a4a-0d8c-464d-84a7-9cc4048a86db)

## أُغلق

| ID | الإصلاح |
|----|---------|
| A1 | AddIncidentalCaseModal — reset على حافة الفتح فقط |
| A3 | يتامى جزائيون لا يُعرضون؛ claim عند الفتح فقط |
| A4 | قوالب FastTrack حسب userId + ترحيل تراثي |
| A5 | replaceStageAt في incidental actions |
| B1 | إزالة stub incidental في PersonalStatus |
| B2 | mirrorLawsuitSegmentsSafe موحّد |

## لم يُغلق (صدق)

| بند | السبب |
|-----|--------|
| A2 plaintext >512KiB | يحتاج تصميم sharding كامل — نصف إصلاح خطر |
| موبايل 44px / safe-area | إذن تصميم صريح (`hami-architecture`) |

## High المتبقي

**لا.**
