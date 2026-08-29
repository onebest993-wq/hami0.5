# قياس حجم حزمة قسم الدعاوى — أرقام حية

**تاريخ:** 2026-08-21  
**الأمر:** `npm run build` ثم `report-chunk-sizes` + `report-size-baseline --save`  
**لقطة محفوظة:** `.audit/size-baseline-lawsuits-closure-2026-08-21.json`  
**لا commit.**

---

## إصلاحات قبل القياس (ضرورية)

البناء كان يفشل بسبب تلف تقشير:
1. `statementLinking.ts` — استعادة `parseLinkableEntryId` من HEAD
2. `InvestigationDecisionDefendantScopePicker.tsx` — `export function X =` → `export const X =`

بعد الإصلاح: **vite build نجح**.

---

## أرقام عامة (dist)

| مؤشر | قيمة |
|------|------|
| Total dist | **16.6 MB** (1026 ملف) |
| JS assets | **9.8 MB** raw · **779** chunk · micro&lt;5KB: **431** |
| CSS | **1.03 MB** |
| Entry | **4.9 KB** raw / **2.0 KB** gzip |
| Critical preload (chunk report) | ~**70 KB** gzip (react + boot-runtime) |
| Critical path (check-bundle-size) | ~**248 KB** gzip (أوسع من preload فقط) |

---

## chunks مرتبطة بالدعاوى (filename heuristic)

**126** ملف مطابق · مجموع **~2205 KB** raw / **~587.7 KB** gzip ≈ **19%** من إجمالي JS gzip.

| Chunk (اسم تقريبي) | raw KB | gzip KB |
|--------------------|-------:|--------:|
| criminalStore | 255 | 64.3 |
| CriminalDashboard | 164 | 44.8 |
| execution-handler-cluster-seizure | 166.6 | 43.1 |
| archive-portal-execution | 150.2 | 42.3 |
| SmartFileModal | 158.5 | 40.5 |
| Dashboard_Active_Order_File | 186.1 | 40.2 |
| ExecutionCreationView | 150.5 | 37.3 |
| lawsuit-archive-grid | 61 | 18.6 |
| PersonalStatusDossierBody | 63.9 | 19.3 |
| SmartFileMainPanel | 50.8 | 13.3 |
| View_Urgent_And_Orders_Dashboard | 48 | 12.6 |
| archive-portal-lite | 43.8 | 11.9 |
| Modal_Unified_Summons_Hub | 41.8 | 10.4 |
| Form_Urgent_Actions | 35.5 | 9.6 |
| CriminalDashboardModalsHost | 23.5 | 7.6 |
| TrialsTab | 23.3 | 7.2 |
| LawsuitsWorkspaceHost | 21.7 | 7.2 |

دليل التقسيم/التخفيف: مودالات/تبويبات/أرشيف lite **منفصلة** وليست داخل entry (entry 2 KB gzip).

---

## مقارنة baselines قديمة (صدق)

مقابل `.audit/size-baseline-closure.json`:
- total **+4.32 MB** · JS **+1.21 MB** · micro **+402**

**تفسير صادق:** التقسيم يزيد عدد الملفات الصغيرة (overhead)، ولا يعني بالضرورة أن إجمالي JS أصغر من لقطة قديمة. قيمة التخفيف المُقاسة هنا هي **فصل المسارات** (lazy chunks + entry رفيع)، لا ادّعاء «−X% إجمالي المستودع» مقابل baseline قديم غير مكافئ زمنياً.

---

## health:bundle (بوابات قديمة)

`check-bundle-size.mjs` **فشل** على عتبات قديمة:
- ExecutionDashboard **386 KB** raw &gt; 280
- critical path **248 KB** gzip &gt; 120
- seizure cluster **167 KB** &gt; named 120

هذه بوابات تنفيذ/عامّة؛ **ليست** إنكاراً لإغلاق قسم الدعاوى — لكنها تُعلن كحد صريح: ضغط حجم حزمة **التنفيذ** ما زال فوق الـcap.

---

## خلاصة

| سؤال | جواب |
|------|------|
| هل قِيس الحجم بأرقام؟ | **نعم** — لقطة 2026-08-21 |
| هل الدعاوى على chunks منفصلة؟ | **نعم** — 126 مطابقة · ~588 KB gzip |
| هل entry نظيف؟ | **نعم** — 2 KB gzip |
| هل ادّعاء −% إجمالي مقابل baseline قديم؟ | **لا** — الإجمالي ارتفع مع micro peels |
| هل health:bundle أخضر؟ | **لا** — ExecutionDashboard/critical caps |

**البُعد الناقص سابقاً (قياس رقمي) = مُنفَّذ وموثَّق.**
