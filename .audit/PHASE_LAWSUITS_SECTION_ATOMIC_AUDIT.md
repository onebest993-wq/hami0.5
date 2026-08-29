# تقرير فحص ذرّي — قسم الدعاوى (Lawsuits)

**التاريخ:** 2026-08-10 (محدَّث بعد فحوصات فرعية)  
**النقطة:** بلاطة الرئيسية `RouteTile` / `hubLawsuit` / label «دعاوى»  
**الحكم:** **القسم غير مغلق** — جاهز للانتقال؟ **لا**

**فحوصات فرعية مدمجة:**
- [Criminal-system](76804a3d-bdaf-4153-aafb-539025871861) — ~415 ملف
- [Smart-modal](1475bd21-3c6a-4851-bc09-279f6b7c5ae5) — ~249 ملف
- [Archive/NewCase/PersonalStatus/CaseShare](22cfdc96-c2b2-474e-b989-ce013a36ce1d) — سطح الدخول والمشاركة

---

## 1) نطاق الفحص (ما يُحسب «دعاوى»)

```
Home RouteTile «دعاوى»
  → openHubArchiveFromHomeTile('lawsuit')
  → showLawsuitsWorkspace + LawsuitsWorkspaceHost (overlay keep-alive z-220)
       ├─ تبويب الدعاوى → ArchivePortalHost type=lawsuits
       │    ├─ مدني / أحوال → SmartFile
       │    ├─ جزائي → CriminalDashboard
       │    └─ FAB → LawyerNewCase (اختصاص)
       └─ تبويب مستعجل → View_Urgent_And_Orders_Dashboard
```

**الحجم المقاس الآن** (من `_tmp_lawsuit_scope.mjs`):

| | العدد |
|--|------:|
| ملفات النطاق | **801** |
| أسطر | **148,170** |
| اختبارات داخل النطاق | 187 ملف / ~27.6k سطر |
| ملفات غير-اختبار ≥700 سطر | ≥12 (الأغلب جنائي + SmartFile) |

توزيع الكتلة التقريبي: `criminal-system` ~60٪ · `smart-modal` ~27٪ · ArchivePortal/NewCase/domain/personal/caseShare الباقي.

مراحل سابقة (2–5، 2026-08-04) أغلقت **مسار الأرشيف/التخزين المقسّم/فصل Chrome** فقط — وليست القسم كاملاً. درجات الموبايل 7/10 في تلك التقارير كانت بلا تدقيق 44px/Capacitor — لا تُعاد هنا.

---

## 2) ما يعمل فعلاً (لا مبالغة)

| منطقة | دليل |
|--------|------|
| فتح فوري للواجهة | `LawyerDashboardLawsuitsOverlayEntry` + `LawsuitsWorkspaceInstantChrome` + `hydrateArchiveHubForInstantOpen` |
| Keep-alive | Host يبقى مركّباً بعد أول فتح؛ `useKeepAliveIdleRelease` (90ث native / 8د web) |
| فصل دعاوى/تنفيذ في الأرشيف | `LawsuitArchiveChrome` vs `ExecutionArchiveChrome` — shims القديمة محذوفة |
| دورة حياة محلية | نشط / مؤرشف / سلة + تحميل كسول للمؤرشف/السلة + عدّادات O(1) من الفهرس |
| API AuthZ / RLS / IDOR | `lawsuit-files/{list,upsert,delete}` عبر `requireWifeUser` + ربط `user_id` من JWT؛ الفتح من المسبح المحلي |
| XSS في النطاق | لا `dangerouslySetInnerHTML` في smart-modal/criminal/caseShare/ArchivePortal الدعاوى؛ ملاحظات غنية عبر DOMPurify |
| موبايل أساسي للقشرة | safe-area أعلى/أسفل/جوانب؛ تبويبات `min-h-[44px]`؛ FAB 48px؛ scroll-lock؛ hardware back؛ `reduceMotion` على منتقي الاختصاص |
| CaseShare أزرار الإشعار | إيجاد `.audit/FINDING_NOTIFICATION_CASESHARE_BUTTONS_BELOW_44PX.md` **مغلق 2026-08-10** |

---

## 3) ثغرات ونواقص مؤكَّدة (بالدليل)

### Critical

**C1 — مقاطع التخزين الحيّة plaintext**  
المفاتيح الفعلية للكتابة: `lawyer_files_active|archived|trash|index` (`dossierStorageKeys.ts` + `lawsuitSegmentStorage.ts`).  
التحقق وقت التشغيل:

- `lawyer_files` → مشفّر  
- `lawyer_files_active|archived|trash|index` → **غير حسّاسة** (`isSensitiveStorageKey === false`)  
- البادئة المشفّرة هي `lawsuit_` وليست `lawyer_files_`  

الفهرس يحمل أسماء/أرقام/هاتف/searchHaystack. الحماية من المسح (wipe-guard) موجودة عبر `includes('lawyer_files')` — **لكن المسح ≠ التشفير**.

**C3 — CaseShare: إنهاء الجلسة لا يسحب البيانات**  
`applyShareAccessPolicy` يُعيد `maskedView` كاملاً عند `ended`/`declined` (`caseShareAccessControl.ts:55-57`).  
`canFetchShareDetail` لا يمنع `ended` للمستقبل.  
→ `.audit/FINDING_CASESHARE_ENDED_SESSION_LEAKS_MASKED_VIEW.md`

**C4 — CaseShare: لا تحقق خادمي من ملكية الإضبارة عند الإنشاء**  
`POST /api/case-share` create يقبل `source` من العميل بلا تحميل من مخزن المالك.  
→ `.audit/FINDING_CASESHARE_NO_SERVER_DOSSIER_OWNERSHIP.md`

**C5 — الجنائي: fail-open عند غياب هوية الجلسة**  
`canMutateCriminalCaseForLawyer` → `if (!uid) return true` (`criminalCaseOwner.ts:23-24`).  
`mergeCases` / `registerPartyDeath` / `updateCaseLocation` بلا حراسة ملكية.  
→ `.audit/FINDING_CRIMINAL_OWNER_FAIL_OPEN_EMPTY_SESSION.md`

**C2 — الحذف النهائي محلي فقط → السحابة قد تُعيد الملف**  
`permanentlyDeleteLawsuits` في `useLawsuitFileMutations.ts` يحدّث المقاطع + تقويم فقط — **لا استدعاء** لـ `/api/lawsuit-files/delete` (المسار موجود وبلا مستهلكين في `src/`).  
`cloudSyncEngine` يطبّق `filterTombstonedExecutionSyncRows` للتنفيذ فقط؛ مسار `lawsuit` دمج «الأحدث يفوز» بلا tombstones. مع تفعيل المزامنة: حذف نهائي محلي ثم sync → احتمال عودة الإضبارة من السحابة.

### High

**H1** — `hami:criminal:store` في `NEVER_ENCRYPT_KEYS` (الجزائي جزء من مخزن الدعاوى).  
**H2** — سقوط تشفير عند >512KB (`ENCRYPT_MAX_BYTES`) — أثقل الإضابير الأغنى بالـPII.  
**H3** — أعمدة السحابة `case_no` / `court` / `stage` plaintext بجانب `encrypted_data`.  
**H4** — SmartFile: حذف مستند/حدث timeline **بلا تأكيد** (`AddDocumentModal`, `TimelineFeed`, `useSmartFileTimelineActions`).  
**H5** — SmartFile: lazy وهمي — `SmartJudgmentModal`/`AppealTransitionModal` eager + mounted حتى وهي مغلقة (`SmartFileModalsJudgmentSection.tsx`).

### Medium

**M1** — الحذف النهائي لا يُنهي جلسات CaseShare (يُعزَّز بـ C3).  
**M2** — افتراضات CaseShare للدعاوى/الجزائي أقصى إفصاح (عكس التنفيذ المقيّد).  
**M3** — `data_signature` يُخزَّن دون تحقق عند القراءة.  
**M4** — تسخين ثانوي: مؤقّت 5ث لـ SmartFile + prefetch NewCase عند mount الـHost حتى وهو keep-alive مخفي (`LawsuitsWorkspaceHost`).  
**M5** — تبويب المستعجل يبقى في الشجرة (`hidden`) طالما Host مركّب.  
**M6** — دورات import قيمية: (أ) `judgmentTypes`↔`interpleaderJudgmentEngine`↔`absentJudgmentFlow`؛ (ب) `appealPartyEngine`↔`appealStageTransition`؛ (ج) جنائي `decisionAppealPeriodEngine`↔`trialSessionsEngine`↔`verdictCassationResultEngine`.  
**M7** — رفع مستندات: `accept` PDF/صورة فقط على الواجهة؛ لا تحقق MIME صارم قبل `saveFileToVault` (حد 50MB فقط).  
**M8** — `LawyerNewCase.tsx` ~930 سطر orchestrator؛ `Party.phone` في النوع بلا حقل/تحقق في `PartyCard`.  
**M9** — 3 اختبارات فاشلة بأسباب هيكلية: `personalStatusOverlayZ` (z-248 vs 250)، `civilSectionStructure` (readOnly محذوف)، `useNeuralAlertsFromHorizon` (دلو near ميت).  
**M10** — `resolveEditableCaseNumber` محذوفة؛ اختبار `SmartFileModalsContentSection.test.ts` عفا عليه الزمن (ليس خلل رقم قضية حي).

### Mobile / Capacitor (دون إذن بصري لا يُغلق)

| عنصر | حجم تقريبي | ملف |
|------|------------|-----|
| checkbox تحديد متعدد في السلة | 24px (`w-6 h-6`) | `LawsuitArchiveCard.tsx` |
| أيقونات أرشفة/سلة على البطاقة | ~28px | `UnifiedDossierCard` |
| تبديل شبكة/مدمج في الشريط | 32px (`h-8 w-8`) | `ArchiveDossierToolbar` |
| شريحة اختصاص | 40px | toolbar |
| زر إعادة محاولة خطأ التحميل | 40px | `LawsuitsWorkspaceHost` |
| بصمة على الحذف النهائي | غير موجودة | trash state → delete مباشر |
| StatusBar عند فتح المساحة | غير موصول | — |
| مودالات جنائية (`StageCloserModal`, `CriminalStatementModal`, `RequestsEntryModal`) | لا safe-area / scroll-lock / 44px إغلاق | criminal-system |
| SmartFile إغلاق مغربي | `GLASS_CLOSE` 32px | `moroccanGlassShell.tsx` |
| CaseShare slider المدة | `h-2` على range | `CaseShareSessionClockSlider.tsx` |
| لا `reduceMotion` في smart-modal | `animate-in` بدون `prefers-reduced-motion` | smart-modal |

**لا يوجد قياس TTFI حقيقي لفتح الدعاوى** — `lawsuit-perf-baseline.json` يقيس معمارية البيانات لا زمن أول بطاقة.

### نظافة / تقسيم

- 21 ملف ≥700 سطر؛ الأثقل: `criminalStageUtils` 1326، `proceduralContainersEngine` 1108، `SmartJudgmentModal` 1070، orchestration جنائي 997.
- ~730 dead exports داخل النطاق (أثقلها themes شخصية + `criminalStageUtils` + `criminalDefendantLiteCore`).
- 4+ حلقات import قيمية (مدني حكم/طعن + جنائي appeal/trial/verdict + stageFinal↔verdictCards).
- `criminalStorePersistMigrate.ts`: كثافة `any` عالية (~168).
- `e2e/lawsuit-flow.spec.ts` ما زال `describe.skip` (legacy ميت).
- قشرة الأرشيف نظيفة بعد PHASE4/5؛ **virtualization فعلية** (`ArchiveVirtualGrid` + `@tanstack/react-virtual`).
- ثيمات `personal-status` متضخمة (4 طبقات: pearl/dossier/visual/MoroccanGlass + aliases مكررة).
- **ديْن القسم الحقيقي:** الجنائي + SmartFile UI/hooks آلهة.

---

## 4) تقييم فرعي (بعد الفحص العميق)

| السطح | أمان | أداء | نظافة | جودة | موبايل |
|--------|-----:|-----:|------:|-----:|-------:|
| قشرة workspace + أرشيف | 5.5 | 7.5 | 7 | 7 | 6 |
| `criminal-system` | 3* | 6 | 4 | 4 | 5 |
| `smart-modal` | 5.5 | 4 | 4 | 5 | 6 |
| `caseShare` | **2** | — | — | — | 5.5 |
| NewCase / personal-status | 5.5 | — | 4 | 5.5 | 5.5 |

\* يشمل fail-open الجلسة الفارغة ومسارات merge بلا حراسة؛ التخزين shard مشفّر لكن monolith `hami:criminal:store` plaintext.

---

## 5) التقييم الصادق (المعايير الخمسة — مجمّع)

| البُعد | درجة | تبرير مختصر |
|--------|-----:|-------------|
| **أداء / استقرار** | **6/10** | أرشيف virtualized + instant open؛ SmartFile eager/lazy وهمي؛ orchestration props churn جنائي |
| **نظافة** | **4.5/10** | أرشيف نظيف؛ جنائي/SmartFile/personal themes متضخمة + dead exports |
| **أمان** | **3.5/10** | C1–C5 + caseShare 2/10؛ AuthZ API جيد لكن مسارات التخزين والمشاركة والجنائي مثقوبة |
| **جودة كود / تقسيم** | **4.5/10** | hooks أرشيف جيدة؛ god hooks جنائي/SmartFile؛ محركات domain قوية لكن متشابكة |
| **موبايل / Capacitor** | **5.5/10** | قشرة workspace جيدة؛ مودالات جنائية/SmartFile ثانوية ضعيفة؛ لا biometrics على حذف |
| **صدق التقرير** | — | لا إغلاق؛ حدود القدرة مُعلَنة |

---

## 6) قائمة تحقق الإغلاق

| # | البُعد | النتيجة |
|---|--------|---------|
| 1 | أداء | جزئي — أرشيف virtualized؛ SmartFile eager؛ لا TTFI |
| 2 | نظافة | **راسب** — mega files + themes + dead exports |
| 3 | أمان | **راسب** — C1–C5 |
| 4 | جودة | جزئي — أرشيف نعم؛ جنائي/SmartFile لا |
| 5 | موبايل | جزئي — قشرة نعم؛ مودالات عميقة لا |
| 6 | صدق | تقرير محدَّث 2026-08-10 بعد 3 فحوصات فرعية |

---

## 7) أولويات الإصلاح الموحّدة (مرتبة)

### طبقة أمان — قبل أي إغلاق

1. **C3** — سحب `maskedView` بعد إنهاء CaseShare + رفض `getById` للمستقبل.  
2. **C4** — تحقق ملكية `dossierId` خادمياً عند create share.  
3. **C5** — إغلاق fail-open الجنائي (`!uid` → رفض) + حراسة merge/وفاة/موقع.  
4. **C1** — تشفير `lawyer_files_*` segments + index.  
5. **C2** — وصل delete API + lawsuit tombstones في cloud sync.

### طبقة سلوك/UX (بعضها يحتاج إذناً بصرياً)

6. تأكيد حذف مستند/timeline في SmartFile.  
7. تقييد التسخين الثانوي (5ث) على `active === true`.  
8. لمس 44px: أرشيف checkbox/أيقونات + SmartFile إغلاق/حذف + مودالات جنائية.  
9. بصمة على الحذف النهائي.  
10. إصلاح/حذف اختبارات عفا عليها الزمن (`resolveEditableCaseNumber`, near alerts, overlay z).

### طبقة هيكل (بعد الأمان)

11. كسر حلقات import (حكم/طعن/جنائي).  
12. تقطيع mega files جنائي + SmartJudgmentModal + `LawyerNewCase.tsx`.  
13. دمج/تشذيب ثيمات personal-status.  
14. lazy حقيقي لـ SmartFile modals أو حذف exports المضلّلة.

---

## 8) الجاهزية والمصداقية

| البند | المحتوى |
|--------|---------|
| **ما أُنجز** | فحص قشرة + 3 فحوصات فرعية عميقة؛ 3 FINDING جديدة؛ درجات مجمّعة |
| **ما لم يُنفَّذ** | إصلاحات كود؛ قياس TTFI على جهاز |
| **جاهز للانتقال؟** | **لا** |
| **حد القدرة** | ~801 ملف — الفحص الذرّي للمسارات الحرجة مكتمل؛ إصلاح C1–C5 شرط قبل إغلاق الأمان |

**خلاصة:** قسم الدعاوى وظيفياً ناضج في الأرشيف والفتح الفوري، لكن **خمس ثغرات Critical (C1–C5)** + دين هيكلي في الجنائي/SmartFile يمنع الإغلاق. درجة الأمان المجمّعة **3.5/10** — أقل من التقدير الأولي بعد فحص caseShare والجنائي.
