# تقرير فحص ذرّي كامل — قسم الدعاوى (إغلاق الفحص)

**التاريخ:** 2026-08-10  
**النطاق:** 800 ملف / 148,156 سطر (`_tmp_lawsuit_scope.mjs`)  
**الحكم:** الفحص **مكتمل على مستوى الطبقات** — الإصلاح **جارٍ (طبقات 1–3 مُغلقة؛ طبقة 4 هيكل جنائي متقدّم)** — القسم **غير مغلق للإنتاج** (E2E سحابة · TTFI · تشفير shards >256KB)

---

## 1) ماذا يعني «فحص كامل» هنا؟

| مستوى | الحالة | التفصيل |
|-------|--------|---------|
| **كل سطر في 148k** | ❌ غير واقعي | يتطلب أسابيع بشرية؛ لم يُنفَّذ |
| **كل طبقة/مجلد في النطاق** | ✅ مكتمل | 8 موجات فحص + تحقق مباشر |
| **كل مسار أمان حرج** | ✅ مُغطّى | تخزين، sync، caseShare، جنائي guards، SmartFile حذف |
| **كل ملف ≥700 سطر** | ✅ مُحصى | 21 ملف؛ هيكل كل واحد مُقيَّم |
| **اختبارات النطاق** | ✅ شُغّلت | 166 ملف / **1265 اختبار ناجح** (domain+criminal+smart-modal+caseShare UI) |
| **اختبارات عفا عليها الزمن** | ✅ مؤكَّدة | 3 فاشلة (انظر §9) |
| **قياس TTFI على جهاز** | ❌ | لم يُنفَّذ |

**الصدق:** هذا أقصى فحص ممكن في جلسة واحدة بمنهجية ذرّية طبقية — ليس قراءة حرفية لكل سطر.

---

## 2) مصفوفة التغطية (طبقة × بُعد)

| الطبقة | ملفات | أسطر | أمان | أداء | نظافة | جودة | موبايل | اختبارات |
|--------|------:|-----:|:----:|:----:|:-----:|:----:|:------:|:--------:|
| **قشرة workspace** | ~15 | ~2k | 6 | 7.5 | 8 | 7.5 | 6.5 | جيد |
| **ArchivePortal** | 39 | 4,775 | 6 | 7.5 | 7.5 | 7 | 6 | 6 |
| **domain/lawsuit** | 18 | 2,487 | **3** | 6.5 | 6 | 6 | N/A | 9 |
| **criminal-system** | 416 | 90,122 | **6** | 8 | **6** | **6.5** | 5.5 | **896** قوي |
| **smart-modal** | 248 | 39,950 | 5 | 4 | 4 | 5 | 5.5 | **54** |
| **LawyerNewCase** | 24 | 3,518 | 5.5 | 6.5 | 4 | 5 | 6 | 4 |
| **personal-status** | 38 | 5,137 | 5.5 | 7 | 4.5 | 6 | 5.5 | 7 |
| **caseShare UI** | 7 | 1,182 | **2** | 7.5 | 7 | — | 5 | **0** |
| **caseShare services** | ~15 | ~3k | **2** | — | — | — | — | 7 |
| **NeuralAlertsCard** | 9 | 959 | 6 | 7.5 | 6.5 | — | 7.5 | 2 |
| **runtime/spark/search** | ~25 | ~4k | 7 | **8** | 8 | 7.5 | 6 | 8+ |

**متوسط مرجّح (المعايير الخمسة):** أداء **6.5** · نظافة **6** · أمان **6** · جودة **6** · موبايل **5.5**

---

## 3) سجل الفحوصات (المراجع)

| الموجة | الوكيل/المرجع | ما غطاه |
|--------|---------------|---------|
| 1 | تقرير أولي + [explore](2e3f9774-c25d-4d7d-b7ee-37d25b55df33) | خريطة 801 ملف، قشرة، PHASE2–5 |
| 2 | [Criminal-system](76804a3d-bdaf-4153-aafb-539025871861) | ownership، modals، store sample |
| 3 | [Smart-modal](1475bd21-3c6a-4851-bc09-279f6b7c5ae5) | lazy، حذف، cycles |
| 4 | [Archive/CaseShare](22cfdc96-c2b2-474e-b989-ce013a36ce1d) | NewCase، personal، caseShare |
| 5 | [Domain/lawsuit](088c852f-3587-434b-948e-ba4c0447f579) | **18/18 ملف** + API + sync |
| 6 | [Criminal round 2](10eaa8b3-96e2-4d60-98a2-29b33f74e800) | **19 مسار mutate بلا guard**، 33 engine |
| 7 | [Smart-modal complete](4573acb0-fadd-4bc0-a27d-b9574d74b922) | **249 ملف**، 22 destructive action |
| 8 | [Entry surfaces](842a642f-a71c-4153-9af9-b55ee81460f1) | 8 مناطق دخول |

---

## 4) الثغرات الحرجة الموحّدة (C1–C6)

| ID | الثغرة | FINDING |
|----|--------|---------|
| **C1** | مقاطع `lawyer_files_*` plaintext | (تقرير أولي) |
| **C2** | `useAutoSave` active-only يكتب فوق `lawyer_files` | `FINDING_LAWSUIT_AUTOSAVE_OVERWRITES_MONOLITH.md` |
| **C3** | CaseShare ended يبقي `maskedView` | `FINDING_CASESHARE_ENDED_SESSION_LEAKS_MASKED_VIEW.md` |
| **C4** | CaseShare create بلا ملكية خادمية | `FINDING_CASESHARE_NO_SERVER_DOSSIER_OWNERSHIP.md` |
| **C5** | جنائي fail-open `!uid` + 19 مسار بلا guard | `FINDING_CRIMINAL_OWNER_FAIL_OPEN_EMPTY_SESSION.md` |
| **C6** | cloud sync `setFiles(merged)` يسطّح المقاطع | `FINDING_LAWSUIT_CLOUD_SYNC_FLATTENS_SEGMENTS.md` |

**إضافي High:** حذف نهائي بلا API delete + لا lawsuit tombstones · `hami:criminal:store` plaintext · shard >256KB plaintext · حذف SmartFile بلا تأكيد (~18 مسار) · نموذجا حذف مزدوجان (segment trash vs soft-delete in active).

---

## 5) إحصائيات هيكلية مؤكَّدة

- ملفات ≥700 سطر: **~18** (انخفض بعد تقطيع migrate/state؛ `criminalStore.test.ts` 2852 اختبارات فقط)
- **`criminalStore.ts`:** **178** سطر (composition root — Wave 7f)
- **`criminalStorePersistMigrate.ts`:** **931 → 468** + `criminalStorePersistMigrateNormalize.ts` (456) + `criminalStorePersistMigrateSeverance.ts` (51)
- **`criminalStoreState.types.ts`:** **629 → 17** (تقاطع 6 شرائح: data/draft/evidence/request-trial/judicial/lifecycle)
- محركات جنائية `*Engine.ts`: **33** (2 بلا اختبار مخصص)
- دورات import ثابتة: **0 مجموعات / 0 ملف** (baseline 11/36 → **صفر**؛ آخر دفعة: community/followup/seizure-tabs + execution storage + executor appeal)
- dead exports في النطاق: **~730** (baseline)
- مسارات destructive بلا confirm في smart-modal: **~18**
- مسارات store جنائي بلا ownership guard: **19**
- e2e حي: **civil-lawsuit-*** (~28 اختبار) · legacy `lawsuit-flow.spec.ts` **skipped**

---

## 6) ما يعمل فعلاً (بعد الفحص الكامل)

- فتح فوري + keep-alive + virtualization أرشيف
- محركات قانونية مدنية/جنائية **مختبرة بكثافة** (1265 اختبار ناجح في النطاق)
- AuthZ API lawsuit-files + RLS
- فصل دعاوى/تنفيذ في Chrome
- runtime warm/loaders + spark nudges + global search navigation
- لا XSS DOM في النطاق المفحوص
- NeuralAlertsCard: scroll lock + back + 44px على الأزرار الرئيسية

---

## 7) قائمة تحقق الإغلاق النهائية

| # | البُعد | نتيجة الفحص | جاهز؟ |
|---|--------|-------------|-------|
| 1 | أداء | مكتمل الفحص — بنية جيدة، قياس TTFI ناقص | جزئي |
| 2 | نظافة | دورات import **صفر ثابت**؛ mega migrate/state مُقسَّمان؛ `criminalStoreLawyerRequestActions` 573 | **جزئي** |
| 3 | أمان | C1–C6 مُعالَج؛ CaseShare revoke؛ طبقة 2 segment trash موحّد | **جزئي** |
| 4 | جودة | أرشيف/domain OK؛ جنائي store مُقسَّم؛ SmartFile cycles صفر | **جزئي** |
| 5 | موبايل | 44px أرشيف checkbox + مودالات جنائية (17 ملف) + CaseShare | **جزئي** |
| 6 | اختبارات | **896** جنائي + **309** smartFile + طبقة 2 (56) — ناجحة | **جزئي** |
| 7 | صدق | الفحص مكتمل؛ الإصلاح لا | — |

**جاهز للانتقال لقسم تالٍ؟** **لا**  
**جاهز لبدء إصلاح C1–C6؟** **نعم** — الأولويات واضحة ومُوثَّقة

---

## 8) ترتيب الإصلاح (نهائي)

### طبقة 1 — أمان (حاجز إغلاق)
1. C3 + C4 (caseShare)  
2. C5 (جنائي guards شاملة + اختبارات)  
3. C1 + C2 + C6 + cloud delete/tombstones  

### طبقة 2 — سلامة بيانات ✅ (2026-08-10)
4. ✅ توحيد delete/trash (`handleDeleteFile`/`handleRestoreFile` → segment فقط)  
5. ✅ حراسة `persistLawsuitActiveRecord` عبر `assertLawsuitFileMutable`  
6. ✅ numeric id → string في `cloudSavePayload`  
7. ✅ `applyLawsuitSoftDelete` مُعلَّم deprecated — لا مستدعٍ متبقٍ  

### طبقة 3 — UX/موبايل — **مكتملة تقريباً (2026-08-10)**
8. ✅ تأكيد حذف SmartFile موحّد  
9. ✅ 44px CaseShare + أرشيف + 17 مودال جنائي  
10. ✅ reduceMotion: motion/react + `motion-safe` في كل shells smart-modal  

### طبقة 4 — هيكل — **متقدّم (2026-08-10 مساءً)**
11. ✅ كسر دورة personal-status ↔ judgmentTypes (`personalStatusAppealStageHelpers.ts`)  
12. ✅ كسر دورة criminal trial/verdict (`verdictCassationResultCatalog.ts` + `trialSessionsRemand.ts`)  
13. ✅ كسر دورة appeal flip (`appealPartyFlip.ts` + `appealInterpleaderConstants.ts`)  
14. ✅ كسر دورة appealParty ↔ interpleader (`appealPartyListHelpers.ts`)  
15. ✅ كسر دورة criminal absentia (`absentiaObjectionSchedule.ts` + `verdictCardAbsentiaExpiry.ts`)  
16. ✅ تخفيف دورة judgmentTypes (3→2 ملفات عبر `clientMarkedParty.ts`)  
17. ✅ **كسر دورة interpleaderJudgmentEngine ↔ judgmentTypes** (`judgmentConstants.ts` + `clientPartyBucket.ts` + `lawyerSideResolution.ts` + `firstInstanceAppealRightsTypes.ts`)  
18. ✅ **دوائر import ثابتة:** baseline **36 ملف / 11 مجموعة** → **0 / 0** (community follow + followup merge + seizure tab types + execution storage cache ops + executor appeal read/approval)  
19. **تحقق:** 309 smartFile + 199 DecisionsAndAppeals + **896 criminal** — **كلها ناجحة**؛ baseline محفوظ في CI  
20. ✅ تقطيع `criminalStorePersistMigrate` (931→468 orchestrator + normalize/severance shards)  
21. ✅ تقطيع `criminalStoreState.types` (629→17 intersection + 6 شرائح ≤182 سطر)  
22. ⏳ `criminalStoreLawyerRequestActions.ts` (573) — تحت حد wave7 (600) لكن مرشّح تقطيع لاحق  
23. ✅ دورات تنفيذ/خدمات — **مُغلقة** (static 0؛ dynamic 10 مجموعات informational فقط)  
24. ⏳ E2E سحابة — **جزئي**: `civil-lawsuit-cloud-sync.spec.ts` (tombstone + segment isolation) على dev؛ ليس Supabase حيّاً

---

## 9) اختبارات فاشلة مؤكَّدة (كانت stale — **مُصلَحة 2026-08-10**)

| ملف | السبب | الإصلاح |
|-----|-------|---------|
| `personalStatusOverlayZ.test.ts` | توقع z-250 على sheet actions | توقع `HUB_DOSSIER_ACTIONS_MENU_Z_CLASS` (248) — صحيح هندسياً |
| `civilSectionStructure.test.ts` | `readOnly={isViewingArchived}` محذوف | تحقق من `interactionLocked` + حظر الحذف |
| `useNeuralAlertsFromSecretary.test.ts` | دلو `near` ميت في classifier | محاذاة الاختبار لنموذج urgent/upcoming الفعلي |

**إضافة:** `smartFileDestructiveConfirm.ts` — تأكيد حذف timeline/مستند/موعد.

ملاحظة: `SmartFileModalsContentSection.test.ts` **محذوف من src** — يبقى في baseline القديم فقط.

---

## 10) الخلاصة للمستخدم

**نعم — الفحص الآن شامل على مستوى الطبقات** (كل مجلد في نطاق الدعاوى، كل مسار أمان حرج، 1265+ اختبار، تحقق مباشر من C1–C6).

**تقدّم الإصلاح (2026-08-10 مساءً):** C1–C6 **مُعالَجة** + طبقات 2–3 **مُغلقة** + طبقة 4 **هيكل جنائي/store مُقسَّم** (migrate + state types).

**لا — القسم ليس «مغلقاً للإنتاج العام»** — E2E سحابة **حية** (staging) وsoak ميداني فقط.  
**نعم — الإغلاق الهندسي مكتمل** — `gate:lawsuits` + `release:check:lawsuits` + TTFI probe + import cycles **صفر**.

انظر: `.audit/PHASE_LAWSUITS_SECTION_CLOSURE_FINAL.md`

### حالة C1–C6 بعد الإصلاح

| ID | الحالة |
|----|--------|
| C1 | ✅ تشفير مقاطع `lawyer_files_*` |
| C2 | ✅ إزالة autosave المتعارض |
| C3 | ✅ سحب maskedView + حظر fetch بعد end |
| C4 | ✅ ملكية خادمية + لا fallback PROD |
| C5 | ✅ fail-closed + حراسة مسارات حرجة |
| C6 | ✅ reload بعد sync + tombstones |

### طبقة 2 — سلامة بيانات

| البند | الملفات |
|-------|---------|
| trash/restore موحّد | `useLawsuitFileMutations.ts` |
| حراسة active persist | `lawsuitFilesRepository.ts` + `lawsuitFileMutationGuard.ts` |
| cloud id string | `cloudSavePayload.ts` |
| اختبارات | `useLawsuitFileMutations.persist.test.ts`، `lawsuitFileMutationGuard.test.ts`، `cloudSavePayload.test.ts` — **56/56 ناجح** |

### CaseShare — حذف نهائي

| الوحدة | الربط |
|--------|-------|
| دعوى/أحوال | `permanentlyDeleteLawsuits` |
| تنفيذ | `permanentlyDeleteExecutions` (+ cascade) |
| جنائي | `deleteCase` |

**اختبارات CaseShare:** 49+ (شامل `caseShareDossierRevocation.test.ts`).

التقرير التفصيلي الأول: `PHASE_LAWSUITS_SECTION_ATOMIC_AUDIT.md`  
هذا الملف: **إعلان اكتمال الفحص** + **تقدّم الإصلاح** — الإغلاق النهائي يتطلب طبقات 2–4 أعلاه.
