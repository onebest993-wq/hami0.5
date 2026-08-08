# مصفوفة سيناريوهات محضر المتابعة

> **المرحلة 0 — مرجع التحصين**  
> المصدر الحي للتوقعات: `src/app/application/execution/followup/followupScenarioDefinitions.ts`  
> المحلّل: `src/app/application/execution/followup/followupScenarioResolver.ts`  
> الاختبارات: `src/app/application/execution/followup/__tests__/followupScenarioMatrix.test.ts` (107 اختبار)

---

## المحاور الثلاثة (التكيّف)

| المحور | المصدر في الكود |
|--------|-----------------|
| **كاسب / موظف** | `isEmployee` → `resolveFollowupSpecializationVisibility` + `seizureMatrix` |
| **نوع المطالبة** | `resolveFollowupSpecializationVisibility` (12+ مسار) |
| **نوع التنفيذ / الوحدة** | `executionModuleStrategies` + `resolveSpecificDeliveryUiPhase` + `executionDomainIsolation` |

**طبقات إضافية (تُطبَّق بعد المحاور):**

1. وفاة مدين → `applyDebtorDeathFollowupOverlay`
2. مركز مالي + كاسب → `applyEarnerFinancialPersonalCoerciveOverlay` (>250,000 د.ع)
3. كيان قانوني / وكيل مدين → `followupTabsRestricted`
4. نزع حضانة → يعفّي الموظف من قفل التبويب الشخصي

---

## سلسلة المحلّل (تعكس الإنتاج)

```
resolveFollowupSpecializationVisibility(claimType, isEmployee, opts)
  → applyDebtorDeathFollowupOverlay (إن وُجد)
  → applyEarnerFinancialPersonalCoerciveOverlay (كاسب + مركز مالي)
  → buildFollowupModalTabsFromFlags (effective UI)
```

**مسار ثانٍ (للمرحلة 2):** `debtorPipelineInlineTabIds` — بدون earner overlay، يعكس `useExecutionDashboardFollowupTabAssembly` inline.

---

## كتالوج السيناريوهات (21 سيناريو)

| ID | الوصف | التبويبات الفعّالة (effective) |
|----|--------|-------------------------------|
| `financial_employee` | استحصال مالي — موظف | حجز، مخاطبات، نماذج، إضبارة، طرف آخر |
| `financial_earner` | استحصال مالي — كاسب (400k) | شخصي، جبرية، حجز، + ثابت |
| `civil_earner_low_center` | مدنية — كاسب — 50k | شخصي، جبرية، حجز، + ثابت |
| `civil_earner_high_center` | مدنية — كاسب — 300k | شخصي، جبرية، حجز، + ثابت |
| `specific_delivery_movable_pre_earner` | تسليم عيني منقول — كاسب | جبرية، + ثابت (لا حجز) |
| `specific_delivery_movable_pre_employee` | تسليم عيني منقول — موظف | جبرية، + ثابت |
| `specific_delivery_immovable_pending_earner` | غير منقول معلّق — كاسب | جبرية، + ثابت |
| `specific_delivery_post_financialized_earner` | بعد تحويل مالي — كاسب | جبرية، حجز، + ثابت |
| `eviction_earner` | تخلية — كاسب | جبرية، حجز، + ثابت |
| `eviction_employee` | تخلية — موظف | جبرية، حجز، + ثابت |
| `encroachment_earner` | إزالة تجاوز — كاسب | جبرية ميدانية، + ثابت (لا حجز مالي) |
| `visitation_earner` | مشاهدة — كاسب | شخصي، + ثابت |
| `matwaa_earner` | مطاوعة — كاسب | + ثابت فقط |
| `custody_removal_earner` | نزع حضانة — كاسب | شخصي، + ثابت |
| `custody_removal_employee` | نزع حضانة — موظف | شخصي، + ثابت (غير مقفول) |
| `marital_furniture_earner` | أثاث زوجية — كاسب | حجز، + ثابت |
| `legal_entity_financial` | كيان قانوني — مالي | + ثابت فقط (restricted) |
| `deceased_financial_earner` | متوفي + مالي + كاسب | ثابت فقط (وفاة تفوز على بوابة الكاسب) |
| `court_sharia_earner` | قرارات محاكم شرعي — كاسب | شخصي، حجز، + ثابت |
| `court_sharia_employee` | قرارات محاكم شرعي — موظف | حجز، + ثابت |
| `financial_employee_assignment_block` | موظف + كتلة تكليف | شخصي، حجز، + ثابت |

**التبويبات الثابتة:** مخاطبات، نماذج الطلبات، التحكم في الإضبارة، تحركات الطرف الآخر.

---

## هشاشات مُثبتة بالاختبار (دفعة 0)

| الهشاشة | الوصف | الحالة |
|---------|--------|--------|
| ~~`earner_overlay_after_death`~~ | وفاة المدين تخفي الجبرية، ثم بوابة الكاسب تفتحها مجدداً | **مُغلَق — دفعة 3** |
| `modalSectionTabOrderDrift` | كتلة التكليف تضيف «شخصي» للchips لكن ليس لـ section order | مفتوح |
| `debtor_pipeline_drift` | مسار inline بدون earner ≠ effective (مالي كاسب 400k) | متوقع (by design) |
| ~~`visitation_personal_tab`~~ | مشاهدة — تبويب شخصي متعمّد (أحوال شخصية دون حبس/إحضار) | **مُغلَق — صريح في الأعلام** |
| ~~`encroachment_seizure_tab`~~ | إزالة تجاوز كانت تعرض تبويب حجز مالي | **مُغلَق — دفعة 7** |

---

## ما لم يُغطَّ بعد (دفعات لاحقة)

- مطالبات متعددة (`mergeFollowupSpecializationFlags`)
- كل مراحل تسليم عيني (needs_nature)
- موظف + قفل تبويب شخصي + فتح من التخزين المحلي
- ~~مراجعة منتج: `visitation_personal_tab`, `encroachment_seizure_tab`~~

---

## المرحلة 7 — إغلاق هشاشات منتج (مكتملة)

| الهشاشة | الإصلاح |
|---------|---------|
| `encroachment_seizure_tab` | `hideFollowupSeizureRequestsTab` + `hideDossierFinancialTools` في أعلام إزالة التجاوز |
| `visitation_personal_tab` | `hidePersonalCoerciveFollowupTab: false` صريح — سلوك مقصود |

---

## المرحلة 6 — baseline hidden 21/21 + E2E persist (مكتملة)

| الملف | الغرض |
|-------|--------|
| `followupScenarioHiddenBaseline.ts` | لقطة مرجعية لكل سيناريو |
| `followupScenarioHiddenInvariants.ts` | قواعد toggle/deceased/personal tab |
| `followupScenarioHiddenBaseline.test.ts` | 43 اختبار |
| `execution-followup-tabs.spec.ts` | لا legacy tabs + persist عبر close/reopen |

توليد baseline: `npx vitest run src/app/application/execution/followup/__tests__/printHiddenBaseline.test.ts`

---

## المرحلة 2 — Tab Builder موحّد (مكتملة)

| التغيير | الملف |
|---------|-------|
| إزالة inline builder (~25 سطر) | `useExecutionDashboardFollowupTabAssembly.ts` |
| مصدر واحد للتبويبات | `buildFollowupModalTabsFromFlags` في assembly + grace + scenario resolver |
| اختبارات parity إضافية | `buildFollowupModalTabsFromFlags.test.ts` |

**ملاحظة:** مسار earner-gated في `ClaimGracePersistSegment` كان يستخدم builder مسبقاً — الآن assembly يطابقه.

## المرحلة 3 — Resolver + Overlay Order (مكتملة)

| التغيير | الملف |
|---------|--------|
| `resolveFollowupFlagsForDebtorContext` | `executionDomainIsolation.ts` — مسار موحّد لأعلام المدين |
| debtor pipeline يستخدم المسار الموحّد | `useExecutionDashboardCoreFollowupDebtorPipeline.ts` |
| `applyFollowupSpecializationOverlays` | وفاة تفوز — لا بوابة كاسب للمتوفي |
| grace pipeline | overlays على base flags + `followupModalSpecialization` |

**إغلاق fragility:** `earner_overlay_after_death` — المتوفي لا يعيد تبويبات إكراهية عبر بوابة الكاسب.

## المرحلة 4 — سجل إجراءات + الطلبات المخفية (مكتملة)

| الملف | الغرض |
|-------|--------|
| `followupActionRegistry.ts` | مفاتيح ثابتة لإجراءات الطلبات المخفية (شخصي/كفيل/كسر أقفال) |
| `resolveFollowupHiddenActions.ts` | محلّل يعكس `ExecutionFollowupModalLatePanels` + `hiddenFollowupRequestsUtils` |
| `followupActionRegistry.test.ts` | 6 اختبارات |

**قاعدة UI:** عند وفاة المدين `hiddenToggleVisible=false` — لا تُحسب الطلبات المخفية في اللقطة الفعّالة حتى لو الكتالوج الداخلي يعيد مفاتيح.

## المرحلة 5 — Legacy tabs + Journey Harness (مكتملة)

| الملف | الغرض |
|-------|--------|
| `followupLegacyTabNormalization.ts` | `financial` → seizure / coercive؛ `special` → `admin` |
| `followupModalPersistUtils` | تطبيع legacy عند فتح المحضر |
| `followupModalJourneyHarness.ts` | محاكاة open → tab → persist → reopen |
| `ExecutionFollowupModalMidPanels` | إزالة تبويب `financial` legacy (غير مُبنى في builder) |

**E2E:** harness اختباري (بدون Playwright) — 7 اختبارات journey + 5 persist.


| الملف | الغرض |
|-------|--------|
| `followupSnapshotFieldKeys.ts` | `FollowupModalSnapshot` typed |
| `followupModalContext.tsx` | لا `Record<string, any>` |
| `utils/followupPortalSnapshotContract.ts` | استخراج مفاتيح portal |
| `scripts/audit-followup-portal-snapshot.mjs` | CI: controller ⊆ snapshot |
| `hooks/__tests__/followupPortalSnapshotContract.test.ts` | 4 اختبارات عقد |

تشغيل: `npm run audit:execution-snapshot`

---

*آخر تحديث: دفعة 0–7 — هشاشات منتج مغلقة، 189+ اختبار أخضر.*
