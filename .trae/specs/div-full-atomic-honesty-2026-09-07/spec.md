# DIV Full Atomic Honesty Audit (div×4) - Product Requirements Document

## Overview
- **Summary**: فحص مركزي إنتاجي عميق من الصفر لجميع عناصر `<div>` في جميع الواجهات الإنتاجية بمشروع Hami (1577 ملف TSX إنتاجي · 4994 `<div>`) بنفس الطريقة الشاملة الذرية الاحترافية التي طبقت في قسم الإعدادات — تصنيف 100%، إصلاحات ZVF فقط، وتقرير نهائي 11 قسم مع حفظ 4 راتشيتات أحادية اللحظة.
- **Purpose**: القضاء على أي غموض حول استخدام `<div>` كمُقدّم تفاعلي غير صحيح (div كـ button غير معلن)، معايير دلالية، ونظافة كود محيطة بـ div-heavy components، مع الحفاظ التام على ZVF 100%.
- **Target Users**: مهندس برمجيات رئيسي · Chief Systems Architect · مستوى Tier-1 Enterprise Mobile Production.

## Goals
- **G1 (Classification 100%)**: تصنيف 4994 `<div>` عبر 1577 ملف TSX إنتاجي إلى فئات صريحة (SAFE / WONTFIX / NEEDS-FIX) دون أي عنصر غير مصنّف عند الخروج.
- **G2 (Code Quality)**: جميع مؤشرات الرائحة الكودية (TODO/FIXME/console/throw/debugger) في الملفات التي تعتمد على `<div>` المصنفة إما REMEDIED أو WONTFIX مع سبب موثق لكل حالة.
- **G3 (Button Honesty)**: 0 عناصر `<div>` تفاعلية (onClick/onPointerDown/role=button/tabIndex/onKeyDown) بدون تصنيف صحيح؛ كل NEEDS-FIX حقيقي يتم تحويله إلى `<button type="button">` مع appearance:none inline reset للحفاظ على ZVF.
- **G4 (Semantic Div Honesty)**: تحويل عدد منخفض المخاطر فقط من divs المرشحة للعلامات الدلالية (header/footer/nav/section/aside/article/dialog/tabpanel) مع احتساب Rubric Score ≥ 4.
- **G5 (Zero Visual Freeze)**: 0 تغييرات بصرية مطلقة. No className / no style / no children order / no box-model changes. التعديلات المسموح بها: (a) إسم علامة فقط `div→button` أو `div→header` مع reset inline حيث يلزم، (b) نص رسالة خطأ فقط throw prefixes، (c) إزالة console.log/TODO تعليقية فقط.
- **G6 (4 Monotonic Ratchets)**: لا يوجد أي زيادة على baseline في TSC=956، Lint=11، Dead-exports=1885، Tests=20 (التحسن مسموح به، الانحدار ممنوع).
- **G7 (Report 11 Sections)**: إنتاج تقرير نهائي بـ 11 قسم في `.audit/DIV-FULL-ATOMIC-HONESTY-AUDIT-2026-09-07.txt` يطابق بنية تقرير قسم الإعدادات §0..§10.

## Non-Goals
- ❌ إعادة تصميم أي مكون بصريًا أو تغيير مظهر (ZVF 100%).
- ❌ تحويل مرشح دلالي عالي المخاطر بدون تغطية اختبار كافية (يصنف WONTFIX بدلاً من ذلك).
- ❌ كسر أي assertion يعتمد على نص رسالة الخطأ الحالي (يُصنف WONTFIX مع سبب موثق).
- ❌ إضافة أي new dependencies أو libraries.
- ❌ تغيير className أو style أو ترتيب children لأي عنصر DOM بغض النظر عن صوابه.
- ❌ حفظ baseline جديد (no --save) بدون موافقة مستخدم صريحة.

## Background & Context
- الإصدار: Hami v10.5.0-tier1-hardened · Commit 3b608afd · improve/current.
- النطاق الثابت: 1577 PROD TSX (باستثناء `__tests__` و `.test.tsx` و `.spec.tsx`) · 1853 TSX كامل.
- Baseline الراتشيتات (المؤكدة من جولة قسم الإعدادات): TSC=956 · Lint=11 · Dead=1885 · Tests=20 (التحسن الأخير من 21 مُثبَّت · no --save).
- Baseline Arch/Cycles: arch-boundaries=244 · cycles=2 groups (13 files) · broken imports=0.
- المرحلة السابقة: SEMANTIC DIV INDEX PHASE B = 146 مرشح className keyword؛ تم استبدال 3 منخفضة المخاطر فقط (ExecutionArchiveChrome / LawsuitArchiveChrome / ArchiveHubInstantShell div → header). هذه الجولة = GLOBAL AUDIT الكامل مع Classification 100% وليس استبدالات عشوائية.
- القيود الثابتة: **ZVF ملزم**. fail-closed على جميع الراتشيتات 4+3. أي زيادة = rollback فوري للخطوة الأخيرة. لا أسئلة للمستخدم (استقلالية كاملة).

## Functional Requirements
- **FR-1**: Inventory Scripts — 3 سكربتات جرد مخصصة تُخرج CSV بتنسيق موحد:
  - `scripts/div-full-inventory/01-code-quality.mjs` → prod files × (TODO|FIXME|console|throw|debugger)
  - `scripts/div-full-inventory/02-div-button-audit.mjs` → تصنيف كل <div> حسب onClick/onPointerDown/role=button/tabIndex/aria/cursor-pointer
  - `scripts/div-full-inventory/03-semantic-div.mjs` → تصنيف حسب className keyword دلالي 8 فئات
- **FR-2**: Post-inventory Classification — كل hit في الـ 3 CSVs يُصنف إلى REMEDIED (مع تعديل مطبق) أو WONTFIX (مع سبب موثق) قبل أن يُعتبر الملف "مكتمل".
- **FR-3**: Button Honesty — أي div فيه onClick أو onPointerDown أو role=button أو tabIndex≠-1 بدون أن يكون له زر حقيقي داخلي قابل للتفعيل → يتم تصنيفه NEEDS-FIX → يُحول إلى `<button type="button"` مع inline style reset للحفاظ على ZVF:
  ```
  style={{ appearance:'none', background:'transparent', border:'none', padding:0, margin:0, textAlign:'inherit', font:'inherit', color:'inherit', cursor:'inherit', WebkitTapHighlightColor:'transparent' }}
  ```
- **FR-4**: Semantic Swap — فقط مرشحون ≤3 منخفضو المخاطر ومستقرون اختباريًا يتم تحويلهم إلى HTML5 المناسب مع حفظ className/children/attributes بنسبة 100%.
- **FR-5**: Error Prefix Standardization — فقط throws الـ ZVF في الملفات المصنفة مع نمط `[domain:opid] message` الأصلي دون تغيير أي منطق.

## Non-Functional Requirements
- **NFR-1 (Determinism)**: دورتي تشغيل متتاليتين نظيفتين exit=0 على جميع الاختبارات Standalone للمكونات المعدلة قبل اعتبار الكود سليم.
- **NFR-2 (Performance Budget)**: لا يُسمح بأي تحسينات/تغييرات ترفع حجم الحزمة. الحجم الحالي boot 88.4KB gzip هو عتبة سقف لا يمكن تجاوزه.
- **NFR-3 (Security)**: ألا تُعرَض أي أسرار في رسائل الخطأ بعد تطبيق prefixes (prefixes = مجرد تصنيف، لا تحتوي PII).
- **NFR-4 (A11y)**: أي تحويل div→button يجب أن يحمل type="button" صريح لمنع سلوك submit ضمني في النماذج.
- **NFR-5 (Memory)**: لا يُسمح بزيادة memory footprint بسبب closures زائدة في event handlers الجديدة؛ المفضّل إعادة استخدام handler الموجود فقط مع تغيير اسم العلامة.

## Constraints
- **Technical**: ZVF 100% · 4 ratchets fail-closed · Node 24.x · Vite 7 · TypeScript strict · React 18.
- **Business**: No new features · No visual changes · No --save baseline · No commit unless explicitly ordered.
- **Dependencies**: 0 new packages. التعديلات فقط على ملفات TS/TSX الموجودة.
- **Environment**: VMM timing-flakes ≤ 0.1% (13 flakes مسموح بها من أصل 11,916 اختبار).

## Assumptions
- [A1] السكربتات الثلاث المخصصة تعطي إحصاءات دقيقة أكثر من grep العام (حل مشكلة SVG `<path d="M...p...` FP من المرحلة السابقة).
- [A2] نسبة NEEDS-FIX الحقيقية في div × 4994 ستكون ≤ 1% (بنفس توزيع قسم الإعدادات: 129 div → 0 NEEDS-FIX حقيقي).
- [A3] 99% من interactive divs هي click-proxy لزر حقيقي داخلي (Toggle / action-slot) أو tablist ARIA containers وليست div تفاعلية خالصة.
- [A4] حفظ baseline 20 للاختبارات ممنوع الآن (user لم يأمر بـ --save)؛ لا يتم تشغيل guard:baseline.
- [A5] استقلالية كاملة — لا أسئلة للمستخدم على الإطلاق خلال دورة التنفيذ.

## Acceptance Criteria

### AC-0: Four monotonic ratchets — No regression
- **Type**: `rule`
- **Given**: Baselines TSC=956, Lint=11, Dead-exports=1885, Tests=20 (all confirmed post-settings-audit)
- **When**: تشغيل `npm run guard:tsc && npm run guard:lint && npm run guard:dead-exports && npm run guard:tests` بعد الإغلاق النهائي
- **Then**: كل بوابة تخرج بـ exit=0 و current ≤ baseline (التحسن مسموح به ويسجل كـ IMPROVEMENT في التقرير)
- **Pass Condition**: 4/4 بوابات تمر مع exit=0 و no-regression
- **Evidence**: Output guard-* commands appended to report §8

### AC-1: Code-Quality smell hits — 0 unclassified
- **Type**: `rule`
- **Given**: 01-code-quality.csv من IMP-T1 يحتوي على N smell hits في جميع prod files ضمن scope
- **When**: يعمل المصنّف على كل hit ويصنفه إما REMEDIED مع تعديل مطبق ومُعتمد عبر ratchets / tests، أو WONTFIX مع سبب موثق واحدًا من:
  (a) TODO-naming-comment, (b) console.dev-only-guarded, (c) Arabic-i18n-error-literal, (d) risky-change-would-break-tests, (e) third-party-runtime-output
- **Then**: المجموع REMEDIED + WONTFIX يساوي بالضبط العدد الإجمالي hits في CSV
- **Pass Condition**: `remediation_count + wontfix_count === csv_count` و 0 hits متبقين "غير مصنف"
- **Evidence**: §2 of final report contains per-wontfix-category roster with counts and reasons

### AC-2: Button Honesty — 0 interactive-divs unclassified
- **Type**: `rule`
- **Given**: 02-div-button-audit.csv مصنف بـ 4 فئات: SAFE / NEEDS-REVIEW / NEEDS-FIX / MAYBE-WONTFIX
- **When**: يتم فرز كل div في الفئتين NEEDS-REVIEW و NEEDS-FIX ويُقرر:
  (i) يحول إلى button مع reset inline ZVF → يُصنف NEEDS-FIX-RESOLVED،
  (ii) يظل WONTFIX مع سبب موثق = inner-switch-proxy / tablist-aria-container / interactive-sheet-drag-handle / etc.
- **Then**: العدد NEEDS-FIX + NEEDS-REVIEW = NEEDS-FIX-RESOLVED + WONTFIX صفر
- **Pass Condition**: `count(classified_all) === total_divs_in_scope === 4994` و 0 divs بـ تصنيف initial فقط بدون تصنيف نهائي
- **Evidence**: §3 contains final classification matrix with raw numbers

### AC-3: Semantic Div Honesty — Rubric ≥ 4
- **Type**: `rubric`
- **Dimension**: Semantic HTML5 landmark coverage and correctness
- **Scale**: 1-5
- **Anchors**:
  1 = >100 divs مع className=header/footer/nav لا تزال غير محوّلة ومئات landmarks مفقودة
  3 = 1-2 swaps مطبقة + باقي المرشحين مصنفين WONTFIX مع أسباب مقبولة جزئيًا
  5 = 3+ swaps صحيحة منخفضة المخاطر + كل مرشح (≤3) مصنف مع سبب موثق دقيق + لا يوجد swap كسر اختبار
- **Pass Threshold**: >= 4
- **Evidence**: §4 with swap matrix + WONTFIX reasons + post-swap test results

### AC-4: Architecture + Closure gates — No regression
- **Type**: `rule`
- **Given**: Baselines arch=244, cycles=2grp/13f, closure=0
- **When**: تشغيل `guard:architecture-boundaries && guard:cycles && guard:import-closure`
- **Then**: 3/3 exit=0 · Δ=0 على كل counts
- **Pass Condition**: 3 consecutive exit=0
- **Evidence**: §8 final results

### AC-5: Standalone tests for modified components — 2x Clean exits
- **Type**: `rule`
- **Given**: مجموعة الملفات التي تم تطبيق تعديلات عليها (REMEDIED)
- **When**: تشغيل standalone vitest run لمجلدات الـ __tests__ المرتبطة بكل ملف معدل مرتين متتاليتين
- **Then**: كلتا الدورتين exit=0 و عدد الاختبارات الناجحة متطابق بين الدورتين (determinism proof)
- **Pass Condition**: run1 exit=0 AND run2 exit=0 AND test_counts_match
- **Evidence**: §5/§6/§7 contains both run outputs

### AC-6: Zero Visual Freeze — 0 style/className/layout changes
- **Type**: `rule`
- **Given**: جميع الملفات المعدلة في REMEDIED
- **When**: مقارنة diff لكل تعديل: (a) اسم العلامة فقط → مسموح، (b) رسالة خطأ فقط → مسموح، (c) إزالة TODO/console → مسموح. أي تعديل يلمس className أو style أو ترتيب children أو attributes بصري = مخالفة.
- **Then**: 0 مخالفات ZVF
- **Pass Condition**: grep for any `className=` أو `style=` أو `padding|margin|border` changes in diff: 0 hits
- **Evidence**: §0 ZVF VERIFIED 100% banner + no edits to visual fields in every changed file manually reconciled

### AC-7: Semantic correctness of swaps (when any exist)
- **Type**: `rule`
- **Given**: أن نطاق المكونات التي تم فيها swap = ≤ 3 components منخفضو المخاطر
- **When**: تشغيل الفحوصات:
  (1) div→header swap → يصبح أول ابن مباشر لـ settings-shell أو صفحة أرشيف ويحتوي على title+nav داخليًا بالفعل
  (2) div→section swap → يحتوي على role=region + aria-label أو title داخلي بالفعل
  (3) div→button swap → يُصدر `type="button"` صريح و `aria-pressed` أو `aria-selected` أو `role="tab"` يطابق original semantics
- **Then**: كل swap تمر بالفحص الصحي دون أن تحتاج إلى إضافة attributes جديدة (تُصنف WONTFIX بدل ذلك)
- **Pass Condition**: كل swap ≤3 تمت دون أي attribute أو className إضافي
- **Evidence**: §4 per-swap correctness matrix

### AC-8: Inventory scripts exit=0 and produce valid CSVs
- **Type**: `rule`
- **Given**: السكربتات 01-03 في scripts/div-full-inventory/
- **When**: `node scripts/div-full-inventory/01-code-quality.mjs` ثم 02 ثم 03
- **Then**: كل سكربت exit=0 و CSV المخرجات يحتوي على صف header + على الأقل row واحد و count الأعمدة ثابت عبر جميع rows
- **Pass Condition**: 3/3 exit=0 و csv_count_row_correct
- **Evidence**: §1 inventory counts section with script exit codes

### AC-9: Final Report — 11 sections produced
- **Type**: `rule`
- **Given**: الكود مطابق لجميع ACs السابقة
- **When**: كتابة `.audit/DIV-FULL-ATOMIC-HONESTY-AUDIT-2026-09-07.txt`
- **Then**: يحتوي على §0..§10 = 11 أقسام مطابقة لبنية تقرير قسم الإعدادات: §0 Metadata, §1 Inventory, §2 Code-Quality, §3 Button, §4 Semantic, §5 Security, §6 Perf, §7 Hydration/Auto, §8 Ratchets/Arch, §9 AC-Matrix, §10 Verdict/Recs
- **Pass Condition**: 11/11 أقسام موجودة وكل قسم يحتوي على أرقام حقيقية وليس placeholders
- **Evidence**: File exists at audit path with ≥ 240 lines non-empty

### AC-10: Independent Review gate PASS
- **Type**: `rule`
- **Given**: جميع tasks completed في tasks.md
- **When**: تشغيل مراجعة مستقلة (Review R1) عبر فصل read-only context جديد
- **Then**: Review Result = pass مع 0 findings actionable
- **Pass Condition**: review.md يحتوي على Result=pass
- **Evidence**: .trae/specs/div-full-atomic-honesty-2026-09-07/review.md exists with PASS

## Open Questions
- [x] (Resolved via Autonomy Binding) هل نحفظ baseline الاختبارات الجديد 20؟ → لا. No --save بدون أمر مستخدم صريح.
- [x] (Resolved via ZVF Binding) هل نُضيف aria attributes جديدة أثناء swap؟ → لا. التعديل المقصود: اسم العلامة فقط. إن أردنا attributes إضافية → نصنف WONTFIX.
