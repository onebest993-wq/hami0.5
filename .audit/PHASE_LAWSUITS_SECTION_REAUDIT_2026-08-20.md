# فحص ذرّي — قسم الدعاوى (إعادة فتح 2026-08-20)

## الحكم

| المستوى | الحالة |
|--------|--------|
| **فحص طبقي كامل** (قشرة → أرشيف → domain → sync → بحث) | **نعم** |
| **إصلاحات حرجة في هذه الجلسة** | **نعم** (انظر أدناه) |
| **إغلاق إنتاج** (سحابة حية + soak جهاز) | **لا** |

`npm run gate:lawsuits` — **PASSED** (دورات 0 · domain 51 · persist 31 · caseShare 48 · smartFile 309 · criminal 896 · shards 11 · touch 8)

---

## خريطة المسار (بلاطة «دعاوى»)

```
RouteTile(hubLawsuit) → openHubArchiveFromHomeTile('lawsuit')
  → setShowLawsuitsWorkspace(true) + warm/prefetch
  → LawyerDashboardLawsuitsOverlayEntry
       InstantChrome (Suspense) | LawsuitsWorkspaceHost
         → LawsuitsWorkspaceShell
           → ArchivePortalLawsuit* (شبكة / lifecycle / سلة)
             → openArchiveFile → SmartFile / جنائي
```

---

## ثغرات مكتشفة في الفحص الحيّ + الإصلاح

| ID | المشكلة | الحالة بعد الجلسة |
|----|---------|-------------------|
| **H-OPEN** | فتح مؤرشف/سلة يفشل لأن `resolveOpenableFileData` يرفض id خارج pool النشطة | **FIXED** — fallback لصف البطاقة |
| **C6** | مزامنة السحابة تحفظ المرآة فقط؛ المقاطع القديمة تُعيد الكتابة فوق الدمج | **FIXED** — `applyLawsuitMonolithicMergeToSegments` بعد sync + `reload` بلا re-persist |
| **C2-r** | `?? []` عند `archived/trash === null` يمسح المرآة | **FIXED** — `resolveLazyLawsuitSegmentForMirror` |
| **H-DEL** | `handleDeleteFile` hard بدون tombstone/سحابة/CaseShare | **FIXED** |
| **H-BACK** | Escape يغلق المساحة فوق حوارات السلة | **FIXED** — استثناء dialog testids |
| **H-CHROME** | InstantChrome بلا Escape/رجوع أصلي وبدون `data-hami-overlay-safe` | **FIXED** |
| **H-SEARCH** | نتائج lifecycle تفشل صامتاً | **FIXED** — `findLawsuitFileAcrossSegments` |
| **DEAD** | استيراد `resolveConsolidationMergedOpenTarget` غير مستعمل | **FIXED** |

---

## ما بقي معلناً (حدود صادقة)

1. أهداف لمس &lt;44px على أيقونات البطاقة / أزرار عرض 32px / فلاتر 40px — لا تغيير بصري بلا إذن
2. لا `visualViewport` لحقل بحث الأرشيف
3. `reduceMotion` ناقص على بعض skeletons/BulkBar
4. تشفير: fallback plaintext &gt;512KB؛ مفتاح tombstones غير حساس
5. أرشفة بلا حوار تأكيد (سلوك قائم)
6. E2E سحابة حية + soak جهاز — خارج هذه الجلسة
7. منظومة الجنائي الكاملة داخل الأرشيف لم تُعاد حرفياً سطراً بسطر (بوابة 896 اختبار ناجحة)

---

## التقييم (بعد الإصلاحات)

| البُعد | الدرجة | ملاحظة |
|--------|------:|--------|
| أداء / استقرار | **8** | InstantChrome + keep-alive + C6 مُغلق؛ قياس TTFI جهاز لم يُنفَّذ هنا |
| نظافة | **7.5** | stubs تنفيذ في controller؛ helpers monolith للاختبارات فقط |
| أمان | **7.5** | tombstone موحّد؛ تشفير مقاطع؛ بقايا حجم/tombstone key |
| جودة كود | **8** | فصل مقاطع واضح؛ إصلاحات بعقود اختبار |
| موبايل | **7** | Escape/safe-area/Shell 44px؛ فجوات أيقونات &lt;44px معلنة |
| صدق | — | تقارير آب ادّعت إغلاق C6 خطأً؛ أُصلح هنا بالدليل |

---

## الموقع

**جاهز للانتقال لقسم تالٍ؟** **نعم** — من منظور هندسي للقسم بعد إصلاحات الجلسة والبوابة.  
**جاهز للإنتاج العام؟** **لا** — ينقص soak سحابة/جهاز + قرار بصري لأهداف اللمس الصغيرة.
