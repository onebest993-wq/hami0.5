# تقرير فحص احترافي — قسم الدعاوى (دعاوى)

**التاريخ:** 2026-08-20  
**نقطة الدخول:** بلاطة Hub «دعاوى» (`hubLawsuit` / `HubTileFace`)  
**المنهج:** فحص طبقي ذرّي + إصلاح حرج + بوابة اختبارات + حدود صادقة  
**لوحة تفاعلية:** `canvases/lawsuits-section-professional-audit.canvas.tsx`

---

## 0) الخلاصة التنفيذية (للقرار)

| السؤال | الجواب |
|--------|--------|
| هل الفحص مهني ودقيق لما غطّاه؟ | **نعم** |
| هل هو استنفاد حرفي لكل سطر في المنظومة؟ | **لا** — وهذا مُعلَن |
| هل وُجدت ثغرات حقيقية أُغلقت؟ | **نعم — 7 بنود** |
| هل وثائق آب عن إغلاق C6 موثوقة؟ | **لا** — كانت مبالغاً فيها؛ أُصلح 2026-08-20 |
| جاهز للانتقال لقسم تالٍ؟ | **نعم** (هندسياً) |
| جاهز للإنتاج العام؟ | **لا** (ينقص E2E كامل + سحابة حية + soak) |

**الحكم بجملة:** القسم في حالة إغلاق هندسي صادق بعد إصلاحات مثبتة؛ ليس «مثالي إنتاج»، وادعاء الكمال المطلق غير مهني.

---

## 1) نطاق الفحص

### داخل النطاق (مُغطّى)

1. بلاطة الدعاوى → فتح الأرشيف (auth، prefetch، warm، InstantChrome، Host، Shell)
2. ArchivePortal مسار الدعاوى (Chrome، شبكة، lifecycle، حوارات سلة)
3. `domain/lawsuit` + hooks التخزين/الطفرات + مرآة المقاطع
4. مزامنة سحابة bucket الدعاوى + tombstones
5. تنقّل البحث العام لنتائج lifecycle (مؤرشف/سلة)
6. جسر الجزائي من مساحة الدعاوى فقط (عقد فتح/عودة)

### خارج النطاق الحرفي (مُعلن)

- كل مودالات SmartFile الداخلية سطراً بسطر
- منظومة `criminal-system` كاملة سطراً بسطر (اعتمدنا بوابة 896 اختبار)
- CaseShare/RLS خادم كامل بعد تقارير آب
- قياس TTFI على جهاز حقيقي / soak بطارية-شبكة
- `release:check:lawsuits` الكامل (E2E desktop batched) — **لم يُشغَّل في هذه الجلسة**

---

## 2) مخطط الاستدعاء (مصدر الحقيقة)

```
HomeTabWidgetSlot (hubLawsuit / label: دعاوى)
  └─ RouteTile
       ├─ pointer → prefetchHubArchiveIntent('lawsuit') → warmLawsuitWorkspace
       └─ click → openHubArchiveFromHomeTile('lawsuit')
            ├─ hasLocalAppSession
            ├─ setShowLawsuitsWorkspace(true)  [بعد resolve overlay entry]
            └─ hydrate / loadLawsuitArchiveHubModule

MainView: lawsuitsLive = show || hostMounted
  └─ LawyerDashboardLawsuitsOverlayEntry
       ├─ Suspense → LawsuitsWorkspaceInstantChrome  (أول إطار)
       └─ LawsuitsWorkspaceHost
            └─ LawsuitsWorkspaceShell (tabs civil|urgent, Escape, native back)
                 └─ ArchivePortalHost type=lawsuits
                      └─ ArchivePortalLawsuitEntry/Surface/Chrome
                           └─ LawsuitArchiveFileGrid
                                └─ onFileClick → openArchiveFile → SmartFile / جنائي
```

**عقد فتح الإضبارة:** `openLawsuitDossierWithContract` (commit فوري + تسخين fire-and-forget).

---

## 3) مصفوفة الثغرات — قبل / بعد

| ID | الخطورة | الوصف | قبل | بعد 2026-08-20 |
|----|---------|--------|-----|----------------|
| **H-OPEN** | حرج | فتح مؤرشف/سلة يفشل لأن pool = النشطة فقط | مفتوح | **مغلق** — fallback لصف البطاقة |
| **C6** | حرج | sync يحفظ المرآة؛ المقاطع القديمة تطمس الدمج | مفتوح (رغم وثيقة «مغلق») | **مغلق** — re-split + reload بلا persist |
| **C2-r** | مرتفع | `?? []` مع lazy null يمسح archived/trash من المرآة | مفتوح | **مغلق** — قراءة من القرص |
| **H-DEL** | مرتفع | hard delete بلا tombstone/سحابة/CaseShare | مفتوح | **مغلق** |
| **H-BACK** | مرتفع | Escape يغلق فوق حوارات السلة | مفتوح | **مغلق** |
| **H-CHROME** | متوسط | InstantChrome بلا Escape/native back | مفتوح | **مغلق** |
| **H-SEARCH** | مرتفع | نتائج lifecycle تفشل صامتاً | مفتوح | **مغلق** |
| **DEAD** | منخفض | استيراد غير مستعمل في NewCaseFlow | مفتوح | **مغلق** |

### ملفات معدّلة (جلسة الإصلاح)

- `src/app/components/lawyer/LawyerDashboardParts/utils.ts`
- `src/app/domain/lawsuit/lawsuitSegmentStorage.ts`
- `src/app/domain/lawsuit/lawsuitFilesRepository.ts`
- `src/app/hooks/useLawsuitFilesState.ts`
- `src/app/services/cloudSyncEngine.ts`
- `src/app/hooks/useLawsuitFileMutations.ts`
- `src/app/components/lawyer/dashboard/LawsuitsWorkspaceInstantChrome.tsx`
- `src/app/components/lawyer/dashboard/LawsuitsWorkspaceShell.tsx`
- `src/app/hooks/globalSearchNavDispatch.ts`
- `src/app/hooks/useLawsuitNewCaseFlow.ts` (تنظيف استيراد)
- اختبارات مرافقة في domain / hooks / services / utils

---

## 4) تقييم المعايير الخمسة (صادق)

| البُعد | الدرجة /10 | المبرر |
|--------|----------:|--------|
| أداء / استقرار | **8.0** | InstantChrome، keep-alive، virtualization، C6 مُغلق؛ لا قياس TTFI جهاز هنا |
| نظافة | **7.5** | stubs تنفيذ في controller؛ helpers monolith للاختبار |
| أمان | **7.5** | تشفير مقاطع، tombstone موحّد؛ plaintext >512KB + tombstone key معلنان |
| جودة كود | **8.0** | فصل مقاطع واضح؛ إصلاحات بعقود اختبار |
| موبايل | **7.0** | safe-area، Escape، Shell 44px؛ أيقونات بطاقة &lt;44px بلا إذن بصري |

**متوسط تقريبي بعد الإصلاح:** ~**7.6 / 10**

---

## 5) قائمة تحقق الإغلاق الإلزامية

| # | البُعد | سؤال التحقق | النتيجة |
|---|--------|-------------|---------|
| 1 | أداء | فتح فوري؟ استقرار؟ لا regressions؟ | جزئي — بنية قوية؛ TTFI جهاز ناقص |
| 2 | نظافة | لا كود ميت جوهري؟ | جزئي — stubs معتمدة للتوافق |
| 3 | أمان | مدخلات/صلاحيات/مسح آمن؟ | جيد بعد الإصلاحات؛ بقايا حجم |
| 4 | جودة | تقسيم/hooks/تسمية؟ | نعم ضمن الطبقة المفحوصة |
| 5 | موبايل | safe-area / 44px / keyboard / back / reduceMotion؟ | جزئي — back/safe-area محسّنان؛ لمس صغير معلن |
| 6 | صدق | التقييم يعكس الواقع؟ | **نعم** — لا ادّعاء كمال |

---

## 6) أدلة التحقق التجريبية

| الحزمة | النتيجة | التفصيل |
|--------|---------|---------|
| `npm run gate:lawsuits` | **PASSED** | دورات 0 · domain 51 · persist 31 · caseShare 48 · smartFile 309 · criminal 896 · shards 11 · touch 8 |
| حزمة إصلاحات الجلسة (26 ملفاً) | **120/120** | domain + mutations + search + cloud bucket + utils + ArchivePortal |
| `phase16LawsuitChromeCut` | **2 failed** | يخص إضبارة **التنفيذ** (`ExecutionDossierInstantChrome`) — خارج قسم الدعاوى المدنية؛ سُجّل للأمانة |
| `release:check:lawsuits` | لم يُشغَّل | وحدة + E2E batched + cloud-sync + boot |
| `test:e2e:civil-lawsuits:cloud:live` | لم يُشغَّل | يتطلب credentials staging |
| `soak:lawsuits-device` | لم يُشغَّل | جهاز فعلي |

---

## 7) البنود المفتوحة المتبقية (لا إخفاء)

| ID | البند | سبب الإبقاء | الخطوة التالية |
|----|--------|-------------|----------------|
| M-TOUCH | أهداف لمس &lt;44px (أيقونات/عرض/فلاتر) | قاعدة لا تغيير بصري | إذن تصميم |
| M-KBD | لا visualViewport لبحث الأرشيف | قرار UX | رفع الشريط عند التركيز |
| M-MOTION | reduceMotion ناقص على skeletons/BulkBar | جزئي | ربط prefers-reduced-motion |
| S-SIZE | plaintext فوق 512KB | حد SecureStore | sharding أو رفع الحد |
| S-TOMB | مفتاح tombstones غير حساس | IDs فقط | تشفير أو قبول موثّق |
| E2E-LIVE | سحابة حية + soak | بيئة/جهاز | أوامر الفقرة 9 |

---

## 8) تغطية الطبقات × مستوى الثقة

| الطبقة | منهج الفحص | الثقة | درجة تقريبية |
|--------|------------|-------|-------------|
| قشرة Workspace | ذرّي سطر بسطر | عالية | 8 |
| ArchivePortal Lawsuit* | ذرّي + عيّنة شبكة | عالية | 7 |
| domain + hooks | ذرّي + إثبات C1/C2/C6 | عالية جداً | 8 |
| Cloud sync | كود + وحدات | عالية | 8 |
| بحث lifecycle | مسار + إصلاح | عالية | 7.5 |
| SmartFile مدني عميق | عيّنة فتح/ربط | متوسطة | 6 |
| criminal-system كامل | بوابة اختبارات | متوسطة | — |

---

## 9) أوامر إعادة التحقق (للمراجع)

```bash
npm run gate:lawsuits
npm run release:check:lawsuits
npm run test:e2e:civil-lawsuits:cloud:live   # يحتاج staging
npm run soak:lawsuits-device
npm run perf:lawsuits-dossier-ttfi
```

مرجع البوابات: `docs/lawsuits-validation-gate.md`

---

## 10) الموقع النهائي

| المستوى | الحالة |
|--------|--------|
| فحص طبقي مهني | **مكتمل لما في النطاق** |
| إصلاحات حرجة الجلسة | **مكتملة ومختبرة** |
| إغلاق هندسي للانتقال | **نعم** |
| إغلاق إنتاج عام | **لا** |

**المصداقية:** أقصى ما يمكن في جلسة واحدة مع إصلاحات مثبتة وحدود مكتوبة. ادّعاء «مثالي 100% من الألف للياء لكل سطر» سيكون غير صادق.

---

*نهاية التقرير — 2026-08-20*
