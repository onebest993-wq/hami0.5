# DIV Full Atomic Honesty Audit - Implementation Plan

## Nomenclature
- **Scope**: 1577 PROD TSX files (excl __tests__, .test.tsx, .spec.tsx)
- **N Targets**: 4994 `<div>` openings (prod only)
- **Phases**: A = Foundations/Inventory (T1-T2) · B = Remediation (T3-T5) · C = Gates + Report (T6-T9)
- **Baselines**: TSC=956 · Lint=11 · Dead=1885 · Tests=20 · Arch=244 · Cycles=2 · Closure=0
- **ZVF**: 0 visual changes. Permitted edits: tag name only / throw message only / remove TODO/console only.

---

## Task 1: Build 3 custom inventory scanners + 4 audit artifacts
- **Status**: `pending`
- **Priority**: high
- **Depends On**: SPEC/PLAN Approve
- **Description**:
  - Copy the 3 settings-inventory scripts (verified exit=0) to scripts/div-full-inventory/ and adapt the scope array from "settings folders only" to **ALL src/ TSX excluding `__tests__`, `.test.tsx`, `.spec.tsx`**.
  - Scanners to create:
    - `01-code-quality.mjs`: regex (TODO|FIXME|console\.(log|warn|error|debug|info)|throw\s+new\s+Error|debugger) over all prod TS → hits CSV with file,line,type,snippet_60,is_prod_file
    - `02-div-button-audit.mjs`: regex `<div\s[^>]*>` extracting has_onClick, has_onPointerDown, has_className, className_value, has_onKeyDown, has_role_button, has_tabindex, cursor_pointer, has_aria, has_onPointerEnter, classification_initial → output all 4-facet rows per div opening into `div-button-hits.csv`
    - `03-semantic-div.mjs`: 8-category className keyword matcher (header|footer|nav|section|aside|article|tabpanel|dialog) inside 1st 60 chars of className → output semantic-div-candidates.csv
  - Produce 4th artifact manually: `overview.md` = 1-paragraph summary after runs.
- **Acceptance Criteria Addressed**: AC-8
- **Test Requirements**:
  - `rule` TR-1.1: each scanner invoked via `node` → exit=0 and stdout emits final file-count consistent with baseline 1577 prod TSX
  - `rule` TR-1.2: all CSV files have header row and row count > 0
  - `rule` TR-1.3: code-quality CSV hits is finite (expected 200-700 range, not 4000 = regex FP)
- **Notes**: Reuse scripts from `.trae/specs/settings-deep-production-audit-2026-09-07/` scanners 01-03 as baseline. Adapt `ROOT_DIRS` list.

---

## Task 2: Code-Quality Classification Roster (100% hit coverage)
- **Status**: `pending`
- **Priority**: high
- **Depends On**: T1
- **Description**:
  - Read `code-quality-hits.csv` (output of T1). First-pass: auto-classify rows by pattern:
    - Category A (Auto-WONTFIX-1): "ToDo" or "TODO" in snippet AND snippet starts with function-name pattern `applyXXXToDom` → WONTFIX naming-pattern.
    - Category B (Auto-WONTFIX-2): console.warn/error AND sibling code contains gate `consumeMissingProviderWarning` or `isDevOnlyEnvFallback` → WONTFIX dev-only-guard.
    - Category C (Auto-WONTFIX-3): throw new Error with Arabic/RTL literal chars U+0600-U+06FF → WONTFIX i18n-literal-ZVF.
    - Category D (Auto-REMEDIED-1): throw new Error('xxx_short_plain_lowercase_underscore') WITHOUT Arabic AND without test-assertion on message string (after grep of all .test.ts → find if exact error text appears in .test.ts assertions; if not → REMEDIED with [domain:opid] prefix).
  - Remaining hits → manual READ 3 lines and classify into WONTFIX with reason.
  - Apply REMEDIED-1 edits: change ONLY the string literal, not any logic, not call sites. Use pattern `[domain:opid] original_message` where domain = shortest top-level folder name (app/services, app/domain, app/components) + opid = 5 chars unique.
- **Acceptance Criteria Addressed**: AC-1, AC-6
- **Test Requirements**:
  - `rule` TR-2.1: `(REMEDIED_count + WONTFIX_count) === csv_total_row_count` after all passes
  - `rule` TR-2.2: 0 edits touch className, style, children order. `git diff -- '*.tsx' '*.ts'` contains only single-quoted string literal changes inside `throw new Error(...)` and/or single-line comment deletions.
  - `rule` TR-2.3: guard:tsc and guard:lint current match baselines after edits.
- **Notes**: If any test contains exact error message as assertion → mark WONTFIX: assertion-snapshot-depends-on-message. Do NOT update snapshots: no --save without user command.

---

## Task 3: Button/Div Honesty → 100% Classification + NEEDS-FIX Zero
- **Status**: `pending`
- **Priority**: high
- **Depends On**: T1
- **Description**:
  - Read div-button-hits.csv (all 4994 divs). Initial column classification_initial already produced 4 classes:
    - SAFE-presentation-wrapper: no interactive attrs → no action.
    - MAYBE-WONTFIX-role-button-pattern: has role=button or onClick but READ the actual file → inner `<button>` or `<Toggle>` or `role=switch` element. If confirmed real semantic button inside → mark WONTFIX outer-click-proxy-inner-real-button.
    - NEEDS-REVIEW-action-missing-semantics: has onClick/onPointerDown/onKeyDown/tabIndex but no role=button etc. → open file, do full READ of 30 lines context. If it's a tablist ARIA container (role=tablist / role=radiogroup) wrapping children buttons → WONTFIX aria-parent-container. Otherwise, if parent drag-handle (className="drag" or onDragStart exists) → WONTFIX drag-handle-not-button. Otherwise mark NEEDS-FIX → convert.
    - NEEDS-FIX-interactive-div-not-button: convert `<div` to `<button type="button"` preserving ALL other attributes. Add inline ZVF reset style (FR-3) ONLY if computed CSS shows browser-default button styles would apply (i.e. no explicit appearance:none className already present).
  - NEEDS-FIX count is EXPECTED ≤ 1% of total divs (≤50 in 4994). If exceeds → re-run with tighter WONTFIX rules.
- **Acceptance Criteria Addressed**: AC-2, AC-6
- **Test Requirements**:
  - `rule` TR-3.1: final classification_all_count === 4994 exactly (0 remain initial-only)
  - `rule` TR-3.2: every NEEDS-FIX → `<button` has `type="button"` verbatim; no <button without type in new edits
  - `rule` TR-3.3: guard:lint still = 11 baseline after conversion; any lint "extra button attributes" = resolved via reset style only
  - `rubric` TR-3.4: Dimension "need-for-fix ratio". Scale 1-5. Anchors: 1 => >50 NEEDS-FIX (bad component library hygiene), 3 => 10-50 NEEDS-FIX, 5 => ≤ 10 NEEDS-FIX. Threshold: >= 4. Evidence: final NEEDS-FIX count §3.

---

## Task 4: Semantic Div Honesty Swap + WONTFIX Roster
- **Status**: `pending`
- **Priority**: medium
- **Depends On**: T1, T3 (reads candidates.csv)
- **Description**:
  - Read semantic-div-candidates.csv 8-category list. First, exclude already-semantic outer elements (e.g., SettingsShellHeader.tsx outer IS already <header> — scanner produces inner div layout wrapper as candidate → exclude it).
  - Remaining candidates: score on risk 1-5 scale (1=trivial wrapper, 5=complex multi-child component). Swap ONLY candidates with risk score ≤ 2 AND count swap_total ≤ 3 (fail-closed).
  - Swap rule: ONLY the tag name `div→header|section|nav` preserving className, children, data-testid, role, aria attrs, event handlers verbatim. Do NOT add/remove/change any attributes. If swap would need a new aria attribute (e.g., aria-label for section) to be valid → do NOT swap, mark WONTFIX missing-accessibility-annotation-not-added-for-ZVF.
  - Swap files manually via Edit tool after reading each. Keep count ≤ 3.
  - All remaining non-swapped candidates → explicit WONTFIX with one reason: (a) low-ROI-swap-test-risk (b) missing-landmark-label-without-manual-audit (c) wrapper-not-meaningful-landmark (d) skeleton/aria-hidden (e) component-in-third-party-ui-pattern.
- **Acceptance Criteria Addressed**: AC-3, AC-7, AC-6
- **Test Requirements**:
  - `rule` TR-4.1: swap_count ≤ 3. Exceeds → fail and roll back excess swaps.
  - `rule` TR-4.2: For each swap, diff consists ONLY of `s/<div/<section/` (or header/nav) opening + closing; no attribute delta. Verify with `git diff`.
  - `rule` TR-4.3: After swaps, standalone test folder for that component PASS once.
  - `rubric` TR-4.4: Semantic coverage score (per AC-3). Scale 1-5; threshold >= 4 (per spec AC-3). Evidence §4.

---

## Task 5: Post-Remediation Four Ratchets + Architecture/Cycle/Closure Gates
- **Status**: `pending`
- **Priority**: high
- **Depends On**: T2, T3, T4 (all in-place edits done)
- **Description**:
  - Run sequentially and record outputs:
    1. `npm run guard:tsc`
    2. `npm run guard:lint`
    3. `npm run guard:dead-exports`
    4. `npm run guard:tests` (heavy: ~4-5 min)
    5. `npm run guard:architecture-boundaries`
    6. `npm run guard:cycles`
    7. `npm run guard:import-closure`
  - Any failure with Δ>0 above baseline → stop and rollback smallest possible code change to fix. Never proceed past failing ratchet.
- **Acceptance Criteria Addressed**: AC-0, AC-4
- **Test Requirements**:
  - `rule` TR-5.1: all 7 gates exit=0
  - `rule` TR-5.2: every current count ≤ baseline count (improvements allowed)
  - `rule` TR-5.3: for guard:tests, list EVERY failing test name that is NEW (not in baseline 20 allowlist) and explain its provenance or roll the offending swap.

---

## Task 6: Standalone Tests Determinism Proof (2x Clean exit=0)
- **Status**: `pending`
- **Priority**: high
- **Depends On**: T5 pass
- **Description**:
  - Gather the specific test files corresponding to modules edited in T2 (throw prefix) and T3 (div→button) and T4 (semantic swap).
  - Run vitest run once. Record test file names + pass count. Sleep 2 s. Run vitest run second time identical paths.
  - Compare pass/fail counts; they must be deterministic exact match. Count as determinism success.
- **Acceptance Criteria Addressed**: AC-5
- **Test Requirements**:
  - `rule` TR-6.1: run1 exit=0 AND run2 exit=0
  - `rule` TR-6.2: number_of_passed_tests run1 === run2 exactly
  - `rule` TR-6.3: 0 new flakes not in the global 13-item allowlist

---

## Task 7: Audit Artifact Assembly · Code Roster Finalization
- **Status**: `pending`
- **Priority**: medium
- **Depends On**: T2, T3, T4 completed (all classifications done)
- **Description**:
  - Write 5 small machine-readable rosters inside `.audit/div-full-inventory/`:
    1. `wontfix-roster.csv` = all WONTFIX items from T2 (smells) + T3 (divs) + T4 (semantic) with category, reason count.
    2. `remedied-roster.csv` = all REMEDIED edits (T2 throw prefixes + T3 div→button conversions + T4 semantic swaps) with file:line + before/after snippet ≤ 80 chars.
    3. `zvf-verification-report.md` = paragraph: (a) list every edited file, (b) for each file enumerate what exactly changed and confirm no className/style/children-order delta, (c) count total REMEDIED edits and total ZVF violations (must be 0).
    4. `classification-final.csv` = merged 4994 div final classification with both initial + final column + reason for any upgrade/downgrade.
    5. `swap-final.csv` = ONLY semantic swaps done (≤3 rows): file, before-tag, after-tag, risk-score (1-5).
- **Acceptance Criteria Addressed**: AC-1 (evidence), AC-2 (evidence), AC-3 (evidence), AC-6 (evidence)
- **Test Requirements**:
  - `rule` TR-7.1: wontfix_count + remedied_count === total hits for each of the 3 CSVs (code-quality, div, semantic) individually
  - `rule` TR-7.2: remedied csv rows exactly match git diff number of hunks edited
  - `rubric` TR-7.3: Dimension "Audit Traceability". Scale 1-5: 1=almost no roster, 3=rosters present but 10% gaps, 5=100% linked via file:line. Threshold >= 4. Evidence roster §2-4 in final report.

---

## Task 8: Run All 1577 Prod File Div Button Final Aggregate Integrity
- **Status**: `pending`
- **Priority**: medium
- **Depends On**: T3, T4, T7
- **Description**:
  - Run ONE FINAL VERIFY SCRIPT (new: `04-div-button-final-audit.mjs`) that rescans ALL 1577 files and:
    - Counts converted NEEDS-FIX items now correctly have `<button type="button"` attribute
    - Counts swapped semantic tags = number matches swap-final.csv
    - Counts remaining div = expected 4994 minus converted count
    - Checks no illegal <button encloses <button (nested buttons = HTML violation). If nested button found → undo conversion for that case → mark WONTFIX conversion-forced-nesting-violation.
- **Acceptance Criteria Addressed**: AC-2, AC-7
- **Test Requirements**:
  - `rule` TR-8.1: 0 nested `<button` inside `<button` violations
  - `rule` TR-8.2: Final total buttons-with-type = original + converted NEEDS-FIX exactly
  - `rule` TR-8.3: Script exit=0; all numeric deltas reconcile against 4994 baseline div total.

---

## Task 9: Write Final 11-Section Report + Publish Evidence
- **Status**: `pending`
- **Priority**: high
- **Depends On**: T5, T6, T7, T8 all pass
- **Description**:
  - Write `.audit/DIV-FULL-ATOMIC-HONESTY-AUDIT-2026-09-07.txt` with sections:
    §0 Metadata · §1 Inventory Summary · §2 Code Quality · §3 Button/Div Honesty · §4 Semantic Div Honesty · §5 Security side-effects of swaps if any (no-change expected) · §6 Performance side-effects of swaps (no-change expected) · §7 Hydration/React integrity (extra re-renders after swap — none expected) · §8 Ratchets + Architecture Gates (exact 7 outputs) · §9 Acceptance Criteria Matrix AC-0 through AC-10 · §10 Verdict + 3 non-blocking Recommendations.
  - Also add `Final Determinism Banner`: banner line ===TIER-1 READY=== only if ALL ACs PASS. Otherwise banner ===NOT READY=== with list of failing ACs.
- **Acceptance Criteria Addressed**: AC-9
- **Test Requirements**:
  - `rule` TR-9.1: File exists at audit path
  - `rule` TR-9.2: 11 sections numbered §0..§10; each section non-empty and contains numeric evidence (no TODO placeholders)
  - `rule` TR-9.3: §9 matrix has 10/10 AC PASS or partial with rubric score; every failing AC has actionable item listed.
  - `rubric` TR-9.4: Dimension "Report Detail Quality". Scale 1-5: 1=numbers missing, 3=numbers present but ~10% without evidence path, 5=each metric hyperlinked to file:line source artifact. Threshold >= 4. Evidence §0 of final report file.

---
