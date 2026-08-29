# ATOMIC AUDIT — Branch B (SmartFile)

**مصدر التدقيق:** [Atomic audit Branch B SmartFile](9f819582-8bdf-4d08-900b-de4986aeea1e)  
**إصلاحات:** [Fix FastTrack B4/B5/B6](937413fc-e0fd-42d2-bdc7-83f5431f7084) · [Clean PauseActions](2b4eb116-c039-4113-8d47-b5fcc74b7543)  
**تاريخ:** 2026-08-20  
**جاهز للانتقال:** لا

## فهم المسار (مختصر)

```
أرشيف → openArchiveFile → setActiveFile
  → LawyerDashboardSmartFileOverlayEntry
  → SmartFileModal (key=fileId)
  → Orchestrator → Chrome + MainPanel + ModalsPortal
  → أحوال شخصية؟ تفرع مبكر → Branch C
  → FastTrack داخل الإضبارة ≠ تبويب مستعجل (Branch D)
```

~200 ملف / ~31k سطر في `smart-modal`.

## Scores (تدقيق أولي)

| Dimension | Score |
|-----------|------:|
| أداء | 6.5 |
| نظافة | 4.5→~6 بعد التنظيف |
| أمان | 7.0 |
| جودة/تقسيم | 4.0 |
| موبايل | 6.5 |

## P0/P1 — حالة بعد جولة الإصلاح

| ID | Issue | حالة |
|----|--------|------|
| B1–B3 | تقسيم: Judgment / incidental / SessionHub | **مفتوح** |
| B4 | تظلم FastTrack في UI | **أُغلق** |
| B5 | تقويم لجلسة التظلم | **أُغلق** |
| B6 | immutability FastTrack save | **أُغلق** (باقي incidental shallow) |
| B7–B8 | hydrate أحزاب + fingerprint | **مفتوح** |
| B9 | كود ميت pause actions | **أُغلق** |
| B10 | نوع `saveToCloud` | **أُغلق** |

## Minimum to close Branch B

1. تقسيم P0 للثلاثة الكبار  
2. immutability لبقية incidental handlers  
3. إصلاح/تضييق B7 hydrate + B8 fingerprint  
4. سياسة فهرس مرحلة واحدة (active vs viewing)  
5. اختبارات FastTrack + view-only
