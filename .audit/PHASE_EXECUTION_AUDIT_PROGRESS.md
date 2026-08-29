# قسم التنفيذ — تقدّم الفحص الذري (قراءة فقط — بلا إصلاح)

**آخر تحديث:** ١٠ آب ٢٠٢٦ — **دفعة إغلاق صادقة** (انظر `PHASE_EXECUTION_SECTION_CLOSURE.md`)

**القاعدة:** لا تعديل كود، لا إصلاح، لا تحسين — فحص وتوثيق فقط.

**حالة الإغلاق:** القسم **غير مغلق** للانتقال — تقرير إغلاق صادق مُنجَز مع حدود واضحة (~120+ ملف مقروء مباشرة + مسحان موجّهان + بوابة حية).

---

## حجم النطاق (جرد حيّ — `build-execution-inventory.mjs`)

| المقياس | القيمة |
|---|---:|
| إجمالي الملفات | **1,745** |
| إجمالي الأسطر | **278,321** |
| ملفات إنتاج | **1,267** |
| ملفات `@ts-nocheck` | **153** |

### توزيع الوحدات (أعلى ٥)

| الوحدة | ملفات | أسطر |
|---|---:|---:|
| A1-core-hooks | 315 | 45,196 |
| A3-dashboard-components | 237 | 50,437 |
| F-utils | 199 | 32,725 |
| A2-dashboard-hooks | 150 | 16,668 |
| P-scripts | 141 | 22,465 |

---

## ما قُرئ بالكامل في هذه الجلسة (مسار الضغط → الإضبارة)

| # | الملف | ملاحظة الفحص |
|---|---|---|
| 1 | `dashboard/commandHub/CommandHubTiles.tsx` (ExecutionHero) | زر `hub-archive-execution`، prefetch عند hover، `min-h` على البطاقة، `onOpenArchive('execution')` |
| 2 | `services/hub/hubHomeOpen.ts` | تحقق دخول + prefetch قبل فتح الأرشيف |
| 3 | `overlay-sections/LawyerDashboardExecutionOverlayEntry.tsx` | أرشيف التنفيذ، warm workspace، فتح إضبارة/إنشاء |
| 4 | `overlay-sections/LawyerDashboardExecutionDossierOverlayEntry.tsx` | ربط nav handlers، lazy portal |
| 5 | `dashboard/ExecutionDashboardPortal.tsx` | portal + safe-area في fallback + `min-h-[44px]` على زر الإغلاق |
| 6 | `ExecutionDashboard.tsx` | غلاف رفيع → `useExecutionDashboardView`، **`@ts-nocheck`** |
| 7 | `ArchivePortal/hooks/useArchivePortalController.ts` | فلاتر/سلة/حذف نهائي — **لا منطق حذف فعلي هنا** (يُمرَّر callback فقط) |
| 8 | `ExecutionDashboard/followupModalTabTypes.ts` | ٩ تبويبات محضر المتابعة |
| 9 | `ExecutionDashboard/hooks/useExecutionDashboardView.tsx` | → ViewResolved |
| 10 | `ExecutionDashboard/hooks/ExecutionDashboardViewResolved.tsx` | → `useExecutionDashboardCore` |
| 11 | `application/execution/followup/followupScenarioResolver.ts` | منطق التبويبات حسب نوع المطالبة — **مصدر فشل ٧ اختبارات في البوابة** |
| 12 | `types/execution.ts` (جزء ClaimType) | **١٨ نوع مطالبة** مُعرَّفة |

**تقدّم القراءة:** ~68 ملفاً (كاملاً أو مقاطع حرجة مُثبتة) من 1,745 ≈ **3.9%**.

### الجولة ٢ — مسار الإنشاء + تبويبات المتابعة + الحذف

| # | الملف | ملاحظة الفحص |
|---|---|---|
| 13 | `ExecutionCreationView.tsx` (مقاطع 1–120، 200–260، 545–560، 1260+) | **`@ts-nocheck` على الملف كله**؛ حالة `specificDeliveryItems` موجودة لكن `setSpecificDeliveryItemNature` **غير معرَّف** في `removeActiveClaimType` |
| 14 | `ExecutionCreationView/hooks/useExecutionCreationSubmit.ts` (أول 100 سطر) | مسار الحفظ منفصل؛ يستخدم `normalizeSpecificDeliveryItemsForSave` — لا يستدعي `setSpecificDeliveryItemNature` |
| 15 | `ExecutionCreationView/hooks/useExecutionCreationFormOptions.ts` | **نوع مستند واحد فعّال فقط** (`قرارات وأحكام المحاكم`) — باقي الأنواع «قيد الدراسة» |
| 16 | `ExecutionCreationView/components/SpecificDeliveryItemsSetupSection.tsx` | واجهة عناصر التسليم (منقول/غير منقول) — لا state منفصل لـ`itemNature` على مستوى الإضبارة |
| 17 | `buildFollowupModalTabsFromFlags.ts` | يبني ٧ تبويبات؛ `personal` مشروط بـ`showPersonalCoerciveFollowupTab && !followupTabsRestricted` |
| 18 | `followupScenarioResolver.ts` | يمرّر `modalShowPersonalCoerciveFollowupTab` لـ`effectiveTabIds` — قد يختلف عن `showPersonalCoerciveFollowupTab` |
| 19 | `followupScenarioDefinitions.ts` (تخلية) | كتالوج الاختبار يتوقع **بدون** تبويب `personal` لتخلية مأجور |
| 20 | `followupSpecializationVisibility.ts` (تخلية سطر 290–296) | الكود يضبط **`hidePersonalCoerciveFollowupTab: false`** لتخلية مأجور — **تعارض مباشر مع الكتالوج** |
| 21 | `followupScenarioHiddenBaseline.ts` (تخلية) | baseline يتوقع ٣ مفاتيح مخفية شخصية — الفحص الحي يُظهر `[]` |
| 22 | `followupScenarioMatrix.test.ts` | ٧ فشول في البوابة من هنا |
| 23 | `executionStorageKeysLite.ts` (حزمة الحذف) | **مُحسَّن** — يشمل `hami_unified_funds_ledger_` و`hami_eviction_grace_*` صراحة |
| 24 | `executionStorageKeys.ts` (حذف) | `removeExecutionStorageBundleAsync` + `isKeyOwnedByDossierTail` عبر `EXECUTION_WIPE_KEY_PREFIXES` |
| 25 | `executionWipeRegistry.ts` | سجل البادئات المركزي للمسح |
| 26 | `SeizedMovableWorkflowPanel.tsx` + `useSeizedMovableWorkflowPanelState.tsx` (مقاطع) | نص «قيد البت» موجود في الكود؛ الاختبار يفشل لعدم إيجاده في DOM بعد remount |
| 27 | `seizedMovableWorkflowLane.integration.test.tsx` | فشل البوابة: لا يجد `/قيد البت/i` بعد طلب مزايدة |
| 28 | `useExecutionDashboardCore.ts` (أول 80 سطر) | سلسلة: boot → pipelines → orchestrators → scope bags |

### الجولة ٣ — تبويبات محضر المتابعة (UI) + API + shell الموبايل

| # | الملف | ملاحظة الفحص |
|---|---|---|
| 29 | `PersonalTab.tsx` | غلاف رفيع → lazy panels؛ قفل موظف بزر `py-2.5` **بدون** `min-h-[44px]`؛ `allowWrite` يُمرَّر للوحة |
| 30 | `CoerciveTab.tsx` (أول 200 سطر) | تخصص حسب المطالبة (تخلية/إزالة/تسليم معين)؛ props كثيرة (~120) — منطق في أقسام فرعية |
| 31 | `SeizureRequestsTab.tsx` | **`@ts-nocheck`**؛ يفوّض لـ`useSeizureRequestsTabModel` + blocks منفصلة |
| 32 | `CommunicationsTab.tsx` + `CommunicationCreateForm.tsx` | بنية نظيفة؛ نموذج إنشاء مخاطبة؛ لا `window.confirm` |
| 33 | `OtherPartyTab.tsx` | `submitOtherPartyFollowupAction` كمسار application؛ يتحقق من stub handlers |
| 34 | `RequestsTab.tsx` | طلبات خاصة + طلبات مخفية lazy؛ زر تبديل `py-1 text-[9px]` — **هدف لمس صغير** |
| 35 | `DossierControlsTab.tsx` | أزرار `py-3.5` بدون `EXEC_MODAL_TOUCH_TARGET`؛ workflow strip بخط `text-[9px]` |
| 36 | `ExecutionFollowupModalShell.tsx` | **جاهزية موبايل جيدة:** safe-area، `EXEC_MODAL_SHELL_HEIGHT_CLASS`، debounce scroll 220ms، prefetch تبويبات، إغلاق Escape |
| 37 | `executionModalMobileShell.ts` | ثوابت موحّدة: close 44px، `touch-manipulation`، `dvh` + safe-area |
| 38 | `useExecutionDashboardFollowupTabAssembly.ts` (مقاطع) | قفل شخصي للموظف في sessionStorage؛ `modalShowPersonalCoerciveFollowupTab` قد يُظهر personal حتى عند الإخفاء |
| 39 | `api/execution-files/_auth.ts` | رفض ضيف العرض في الإنتاج؛ `requireExecutionFilesAuth` |
| 40 | `api/execution-files/list|upsert|delete/route.ts` | مصادقة + `user_id` scope؛ upsert يشترط `encrypted_data` + `data_signature` |
| 41 | `PartiesSection.tsx` + `PartyCard.tsx` (مقاطع) | أطراف متعددة؛ `PartyCard` بأزرار `py-1.5 text-[11px]` — أهداف لمس صغيرة |
| 42 | `useExecutionCreationClaimCascade.ts` (مقاطع) | منطق cascade منفصل — **غير موصول** بالملف الرئيسي حالياً |
| 43 | `executionCreationViewStructure.test.ts` | اختبارات Phase-1/2 تتوقع hook submit + ≤1000 سطر — **لا تطابق الواقع** (الملف ~2948 سطر) |
| 44 | `ExecutionCreationView.tsx` (مقاطع 103–110، 1364) | يستخدم `confirmInSection` (Capacitor-safe)؛ لكن `useExecutionCreationSubmit` **غير مستورد** — hook يحتوي `window.confirm` |

### الجولة ٤ — مكوّنات الإنشاء (٢٠ ملف) + نواة core + المركز المالي

| # | الملف | ملاحظة الفحص |
|---|---|---|
| 45 | `executionCreationGlassUi.ts` | أنماط موحّدة؛ `sheetFooter` safe-area؛ `multiItem min-h-[48px]`؛ `saveBtn py-3.5` بدون `min-h-[44px]` صريح؛ `modalClose` بدون 44px |
| 46 | `DirectorateSection.tsx` | بسيط؛ `aria-label` على الحقول |
| 47 | `ExecutionSaveButton.tsx` | غلاف زر الحفظ → `ecg.saveBtn` |
| 48 | `EvictionSection.tsx` | حقول تخلية إلزامية؛ responsive grid |
| 49 | `ExecutionIntakeModals.tsx` | صك تجاري + غياب؛ **`z-[999999]`** يتجاوز sheet (`z-[235]`) — ترتيب طبقات غير متسق |
| 50 | `InstrumentDetailsSection.tsx` (~821 سطر) | يجمع نفقة/تخلية/تسليم/أثاث/أجنبي — **مكوّن ضخم** رغم الاستخراج |
| 51 | `PastAlimonySection.tsx` | **`@ts-nocheck`**؛ قيمة `<option>` = `الفقه الجعfري` (حرف **f** لاتيني) ≠ النوع `الفقه الجعفري` في الـhooks |
| 52 | `SmartAlimonyCalculator.tsx` | تحليل سياق + `analyzeAlimonyCreationContext` — بدون nocheck |
| 53 | `VisitationScheduleSetupSection.tsx` | جدولة مشاهدة؛ سطر 3: import مدمج على سطر واحد (جودة كود) |
| 54 | `MaritalFurnitureSetupSection.tsx` | جدول أثاث + بحث + scroll عند ≥5 أسطر |
| 55 | `ForeignJudgmentSection.tsx` | حكم أجنبي + checkbox مصادقة |
| 56 | `useExecutionCreationFormState.ts` | hook state كامل (~405 سطر) — **موجود لكن غير موصول** بالملف الرئيسي |
| 57 | `executionHandlerClusterStubs.ts` | stubs بـProxy + toast cooldown؛ `Submit` يرجع `{ok:false}` |
| 58 | `useExecutionDashboardCore.ts` (أول 120) | boot → pipelines → orchestrators → scope bags → handler clusters |
| 59 | `useExecutionDashboardCoreBootPipeline.ts` | **`@ts-nocheck`**؛ **`isHistoricalMode = false` ثابت**؛ blob warm + migration + store sync |
| 60 | `useExecutionDashboardCorePipelinesChain.ts` (مقاطع) | يربط workspace + followup debtor + claim/grace/persist |
| 61 | `ExecutionFinancialHubPortal.tsx` (مقاطع) | portal lazy لـ`FinancialOperationsCenter`؛ safe-area backdrop؛ ~100 prop |
| 62 | `FinancialOperationsCenter.tsx` (~**3492** سطر) | **`@ts-nocheck`**؛ monolith مع 67 ملف فرعي جزئي — أثقل وحدة مالية |

---

## أعطال مؤكَّدة بالقراءة المباشرة (لم تُصلَح)

| # | الموقع | العطل |
|---|---|---|
| E1 | `ExecutionCreationView.tsx:547` | `setSpecificDeliveryItemNature('')` **غير معرَّف** — مخفي بـ `@ts-nocheck` |
| E2 | `ExecutionCoerciveActionsModalContainer.tsx:395-427` | زرّان بلا `onClick` |
| E3 | `ExecutionSeizedAssetsModalContainer.tsx` | يمرّر `onClose`+`executionId` فقط — لا `assets` |
| E4 | `LawyerDashboardBackgroundServices.tsx:275` | `syncExecutionFilesNowRef` يُضبط `() => undefined` فقط — زر المزامنة اليدوية معطّل |
| E5 | `gate:execution:fast` | فشل: سكربت chunk-scope قديم + ٨ اختبارات (movable lane + followup scenarios) |
| E6 | `followupSpecializationVisibility.ts:291` vs `followupScenarioDefinitions.ts:303` | **تعارض كتالوج/كود:** تخلية مأجور — الكود يُظهر تبويب «شخصي»، الاختبارات تتوقع إخفاءه |
| E7 | `followupScenarioHiddenBaseline.ts` (eviction_*) | baseline المخفي قديم — لا يطابق `resolveFollowupHiddenActions` الحالي |
| E8 | `seizedMovableWorkflowLane.integration.test.tsx` | «قيد البت» في الشيفرة لكن لا يظهر في DOM عند الاختبار (جلسة/accordion/remount) |
| E9 | `useExecutionCreationSubmit.ts` vs `ExecutionCreationView.tsx` | **تفكيك Phase-1 غير مكتمل:** الـhook بـ`window.confirm` **ميت**؛ المنطق مكرر inline في الملف الرئيسي (~2948 سطر) مع `confirmInSection` |
| E10 | `executionCreationViewStructure.test.ts` | يتوقع استيراد `useExecutionCreationSubmit` + `useExecutionCreationFormState` + ≤1000 سطر — **يفشل مقابل الكود الحي** |
| E11 | `PersonalTab.tsx:129-135` + `RequestsTab.tsx:95-108` | أزرار تفاعلية بـ`py-1`/`py-2.5` **دون** `min-h-[44px]` — مخالفة هدف اللمس في Capacitor |
| E12 | `useExecutionDashboardFollowupTabAssembly.ts:168-170` | `modalShowPersonalCoerciveFollowupTab` يُجبر إظهار تبويب personal عند `modalShowEmployeeAssignmentCoerciveBlock` حتى لو التخصص يخفيه |
| E13 | `PastAlimonySection.tsx:67` vs `useAlimonyCalculator.ts:3` | **تعارض ترميز:** UI يخزّن `الفقه الجعfري` (f لاتيني) والنوع يتوقع `الفقه الجعفري` — قد يكسر مقارنات لاحقة عند الحفظ/العرض |
| E14 | `useExecutionDashboardCoreBootPipeline.ts:96` | `isHistoricalMode` مُثبَّت `false` دائماً — وضع القراءة التاريخية قد لا يُفعَّل من boot |
| E15 | `FinancialOperationsCenter.tsx` | **3492 سطر** + `@ts-nocheck` — monolith رغم مجلد فرعي 67 ملف |
| E16 | `useExecutionCreationFormState.ts` | hook state جاهز (~405 سطر) **غير مستخدم** — تكرار مع inline state في الملف الرئيسي |
| E17 | `ExecutionIntakeModals.tsx` | `z-[999999]` vs sheet `z-[235]` — تراكب طبقات غير منضبط |

### تصحيحات على التقرير القديم (بعد قراءة حية)

| موضوع التقرير القديم | الواقع الآن |
|---|---|
| حذف السجل المالي ينجو | **جزئياً مُصلَح** — `hami_unified_funds_ledger_` في `getExecutionStorageBundleKeys` + `EXECUTION_WIPE_KEY_PREFIXES` |
| `filterTombstonedExecutionSyncRows` غير موصول | **مُصلَح** — موصول في `cloudSyncEngine.ts:225` |
| `execution_` غير مشفَّر | **مُصلَح** — في `ENCRYPTED_KEY_PREFIXES` |

---

## ما بقي — بالترتيب المخطَّط

1. **A0 مسار الإنشاء** — بقية hooks (`useAlimonyCalculator`, `executionFormUtils`) + ربط الاختبارات
2. **A1 نواة hooks** — `executionDashboardCore/**` (~270 ملف متبقٍ) — الأثقل
2b. **المركز المالي** — `FinancialOperationsCenter/**` (67 ملف) + `FinancialOperationsCenter.tsx` monolith
3. **A3 مكوّنات** — تبويبات المتابعة، الحجز، التخلية، الزيارة، الأثاث...
4. **F-utils + H-services** — تخزين، مزامنة، حذف
5. **G-api** — `/api/execution-files/*`
6. **O-e2e** — ١٢ مواصفة

---

## مرجع سابق (لا يُعتمد وحده)

`.audit/EXECUTION-AUDIT-FINAL-REPORT.md` — يدّعي 100% تغطية سابقة بـ 32+ عطلاً. **يُعاد التحقق منه ملفاً ملفاً**؛ بعض النقاط تغيّرت (مثلاً `execution_` أُضيف للتشفير، `filterTombstonedExecutionSyncRows` موصول الآن).
