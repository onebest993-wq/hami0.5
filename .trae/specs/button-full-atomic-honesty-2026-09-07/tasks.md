# BUTTON FULL ATOMIC HONESTY AUDIT — TASK QUEUE (Spec Mode Tasks Phase)
Related SPEC: `.trae/specs/button-full-atomic-honesty-2026-09-07/spec.md`
Scope: 1569 PROD TSX · 2059 `<button>` baseline · 4 no-type · 13 role=button · 14 type=submit
Method: fail-closed caps + ZVF 100% + 7 monotonic ratchets + 2x deterministic clean standalone

---

# PHASE A — INVENTORY (تأسيس الجرد)

## Task 1 (T1): Build and Run Inventory Scripts
**Priority:** HIGH
**Status:** pending
**Target Exit Codes:** 0/0/0 for 01/02/03; 04 final integrity after edits
**Coverage Map: → AC-8 rule**
Scripts to write in `scripts/button-full-inventory/`:

  - 01-code-quality.mjs — scan src/app (excl tests) for throw-new-Error-without-prefix hits + console.log in prod files + any-inline-any-typed event handlers. Output `.audit/button-full-inventory/code-quality-hits.csv` cols [file,line,col,category,message_snippet].
  - 02-button-inventory.mjs — multiline-aware regex scan of every `<button\b[^>]*>` (single-line with \n attrs). Output buttons-inventory.csv cols [file,line,tag_text,has_type,type_value,has_onClick,has_onPointerDown,has_onKeyDown,has_disabled,has_aria_disabled,has_role,inside_form_context,raw_html_snippet_120chars].
  - 03-role-button-audit.mjs — scan any element tag opening + closing pair when tag contains role=button. Output role-button-candidates.csv cols [file,line,element_tag,class_name,onClick,onPointerDown,onKeyDown,has_descendant_button_or_input,has_draggable,is_radix_asChild_context,category_initial].
  - 04-auto-classifier.mjs — consume (02 + 03 CSVs). Assign class_final per taxonomy §6 of spec: B0/B1/B2/B3/R0/R1/R2/R3/Qx. NEEDS-FIX = union(B3 + R3). Enumerate WONTFIX with explicit downgrade_reason col. Outputs (1) buttons-classification-final.csv, (2) need-to-fix-b3-no-type.csv = B3, (3) need-to-fix-r3-role.csv = R3, (4) wontfix-roster-interim.csv.
  - 04-button-final-integrity.mjs — runs AFTER edits. Re-scans with (02 pattern + 03 pattern). Verifies: (a) no-type-buttons count = 0 (B3 all done), (b) R3 remaining not-yet-swapped = 13 - N_swapped ≤ (20 - N_swapped), (c) nested buttons violations count excluding 33 preexisting Radix-asChild rows = 0. Exit 0 when all 3 pass. Exit 2 when only (c) 33 preexisting remain (acceptable).

**TR (Test Requirements) T1:**
- TR T1.1 [rule]: `node scripts/button-full-inventory/01-code-quality.mjs` exit=0, CSV rows >0, headers non-empty, file paths absolute.
- TR T1.2 [rule]: `02-button-inventory.mjs` exit=0, CSV row count 2059 ±50 (baseline drift tolerance).
- TR T1.3 [rule]: `03-role-button-audit.mjs` exit=0, CSV row count = 13 baseline.
- TR T1.4 [rule]: `04-auto-classifier.mjs` exit=0; class_final column has no empty strings; NEEDS-FIX-B3 row count ≤ 4; NEEDS-FIX-R3 row count ≤ 13.

---

# PHASE B — REMEDIATION (تصحيح الذرية)

## Task 2 (T2): Code Quality REMEDIED throw-prefix (Cap C ≤ 15) + B3 no-type buttons 4/4 (Cap A ≤ 100)
**Priority:** HIGH
**Status:** pending
**Coverage Map: → AC-1 (unclassified=0), AC-2 (B3→0 remain), AC-4 (caps A/C respected)**

### Sub-T2.A Code-Quality throw-prefix
- Open each row in code-quality-hits.csv with category = throw-prefix.
- Apply ZVF prefix format: `[domain_module:opid] original_msg`. opid = first 18 alphanumeric chars of error message lowercase.
- **Cap: MAX 25 (same as div-full).** If >25 → prioritize domain/services > components.
- Write each row with explicit file/line edit. NO text content changes other than prefix insert. NO other logic edits.
- Git restore any file with TSC errors.

### Sub-T2.B B3 no-type buttons → insert type="button"
- Open NEEDS-FIX-B3 4 files one by one with Read tool for 20 lines context before edit.
- Check inside-form context: if element is inside a `<form>` AND NO existing type=submit in same form → REMAP B3→B2 WONTFIX (form might depend on implicit submit). Otherwise insert:
  ```diff
  - <button onClick=...
  + <button type="button" onClick=...
  ```
- Final integrity count B3 = 0.

**TR (Test Requirements) T2:**
- TR T2.1 [rule]: 0 ≤ REMEDIED throws ≤ 25 (cap C). All roster rows present.
- TR T2.2 [rule]: 04-auto-classifier after edits NEEDS-FIX-B3 row count = 0.
- TR T2.3 [rule]: `npx tsc --noEmit -p tsconfig.prod.json` 0 new production errors in modified files.

## Task 3 (T3): Role=Button R3 eligible → native <button type="button"> ZVF (Cap B ≤ 20)
**Priority:** HIGH
**Status:** pending
**Coverage Map: → AC-3 (13 classified), AC-4 (cap B), AC-6 (ZVF matrix rubric)**

Method per R3 row:
1. Read 30 lines context around role=button element.
2. Classify manually per R0/R1/R2 if classifier missed any.
3. For confirmed R3:
   a. Swap opening tag to `<button type="button"` — preserve existing attributes verbatim (className, onClick, data-testid, aria-*, title, etc.) EXCEPT remove role="button" (no longer needed).
   b. Append inline UA-reset style per spec §6.1. If original element had `cursor-pointer` in className → include `cursor: 'pointer'` in style; omit otherwise.
   c. Append className append ONLY for parity: if block-level add `w-full`; if original had text-align, add matching `text-right/left/center`. NEVER remove chars from existing className.
   d. **Balanced close tag (div-full proven method):**
      - start_line = open tag line
      - open_count = 1
      - scan forward: each `\n<TAG\b` open_count++; each `\n</TAG>` open_count--
      - when open_count hits 0 = close_tag_line
      - replace `</TAG>` → `</button>`
4. WONTFIX downgrade → write explicit reason col in wontfix-roster-final.csv. Valid reasons:
   - `R0 Radix asChild primitive`
   - `R1 descendant <input> or <button>`
   - `R2 draggable surface`
   - `R2 click delegate / focus trap`
   - `R2 contenteditable surface`

Cap B = 20; actual expected ≤ 10.
**TR (Test Requirements) T3:**
- TR T3.1 [rule]: post swap: R3_final_remaining_not_swapped = 0; wontfix-R count + swapped count = 13.
- TR T3.2 [rule]: 33 preexisting nested violations only; 0 new nested button-in-button from our swap files (run 04-final-integrity).
- TR T3.3 [rubric 0..2 ZVF]: every R3 edit listed in zvf-report with category=B:role→button-swap; inline style §6.1 only; className append only. Score ≥ 2.

## Task 4 (T4): Form Submit Integrity Audit (Cap D = 0 out-of-scope fixes)
**Priority:** MEDIUM
**Status:** pending
**Coverage Map: → AC-4 cap D rule; produces informational form-submit-integrity.csv**

For each 14 rows with type=submit:
- Scan 100 lines upward for nearest parent `<form>` OR `<Form>` (React Router DOM action form).
- Record: has_form_parent, has_pending_disabled_logic, duplicate_submits_in_same_form_count, explicit_action_handler.
- All rows B1 if verified; else B2 WONTFIX escalated.
- CAP D = 0: do NOT fix missing disabled, missing form parent, etc. Write to form-submit-integrity.csv and to §10 Escalations in final report.

**TR (Test Requirements) T4:**
- TR T4.1 [rule]: form-submit-integrity.csv has exactly 14 data rows + header.
- TR T4.2 [rule]: Cap D actual = 0.

---

# PHASE C — VERIFICATION & REPORT (التحقق والتقرير)

## Task 5 (T5): 7 Monotonic Ratchets + 3 Guards (ALL must PASS)
**Priority:** HIGH
**Status:** pending
**Coverage Map: → AC-0, AC-7 rules**

Order of run (fail-closed - halt on first non-pass):
1. TSC ratchet: `scripts/guard-tsc-ratchet.mjs` → expect ≤956 new? NO — script returns prod errors current ≤ baseline 956. Δ0 ok, Δ-1 ok.
2. Lint: `npx eslint src --ext .ts,.tsx` ERRORS count ≤ 11.
3. Dead exports: `node scripts/guard-dead-exports.mjs` current dead ≤ 1885.
4. Test ratchet: `node scripts/guard-test-ratchet.mjs` failing ≤ 21. NO --save even if improvement; write delta to report.
5. Cycles: `node scripts/guard-import-cycles.mjs` groups=2 files=13 Δ0.
6. Arch boundaries: guard-arch-boundaries. total=244 Δ0.
7. Import closure: `node .audit/verify-import-closure.mjs` broken=0 Δ0.

**TR (Test Requirements) T5:**
- TR T5.1 [rule]: 7/7 PASS; any 1 FAIL → T5 in_progress until resolved.
- TR T5.2 [rule]: NO --save flags used; baselines untouched (verify no files `*baseline*` modified).

## Task 6 (T6): Standalone Determinism 2× Clean Cycles (6/6 runs)
**Priority:** HIGH
**Status:** pending
**Coverage Map: → AC-5 rule**

3 test targets (T2+T3 modified files → nearest test exists). For each run × 2:
  T6a. `LawyerAuthOtpPanel.test.tsx` (if touched) — else modified components test.
  T6b. Service test of throw-prefix files (e.g., `CryptoService.test.ts` if modified again, or else `notifications/fcm tests`).
  T6c. Domain test (e.g., `independentChallengeDossier.test.ts` if modified).
For each file, Run1 & Run2 must: exit=0, identical (Tests passed counts).

**TR (Test Requirements) T6:**
- TR T6.1 [rule]: 3 files × 2 runs = 6 runs. All exit 0.
- TR T6.2 [rule]: Run1 pass count = Run2 pass count for all 3.

## Task 7 (T7): Publish 5 Roster CSVs + ZVF Verification Matrix
**Priority:** HIGH
**Status:** pending
**Coverage Map: → NFR4 rule, AC-6 rubric**

Finalize 5 roster CSVs in `.audit/button-full-inventory/`:
1. wontfix-roster.csv (union B2+R0+R1+R2+Qx-wontfix) with header [category,file,line,downgrade_reason,raw_snippet]
2. remedied-roster.csv (T2.A throws + T2.B B3 edits + T3 R3 swaps) with header [category,file,line_old,line_new,parity_proof_category]
3. buttons-classification-final.csv final classifier output with class_final + reason cols
4. role-button-swap-final.csv R3 swapped only
5. form-submit-integrity.csv
Also write zvf-verification-report.md (7-section matrix same as div-full structure).

**TR (Test Requirements) T7:**
- TR T7.1 [rule]: 5/5 CSV files exist in target dir, non-empty headers, NaN-free numeric cols.
- TR T7.2 [rubric 0..2]: zvf-report completeness ≥2 (all 30 edits ≤60 edits listed with parity proof category).

## Task 8 (T8): Final Integrity 04-button-final-integrity.mjs
**Priority:** HIGH
**Status:** pending
**Coverage Map: → AC-2 (B3=0), AC-3 (13 classified), nested 0-new rule**

Run final scan:
- Pass conditions: B3-count = 0; (R3 swapped + wontfix = 13); nested-button violations total minus 33 Radix preexisting = 0.
- Exit 0 all pass. Exit 2 when only 33 Radix rows exist. Exit 1 on any other failure.

**TR (Test Requirements) T8:**
- TR T8.1 [rule]: Exit ∈ {0, 2}. Exit 1 fail-closed T8 in_progress.

## Task 9 (T9): 11-Section Final Report + Banner
**Priority:** HIGH
**Status:** pending
**Coverage Map: → AC-9 rule**

Write `.audit/BUTTON-FULL-ATOMIC-HONESTY-AUDIT-2026-09-07.txt` with 11 sections:
§0 TIER-1 banner (PENDING → ✅ CONFIRMED or ❌ NOT), §1 Executive Summary, §2 Baseline Numbers, §3 Cap Compliance Evidence (A/B/C/D), §4 B3 no-type edits, §5 R3 role→button swaps, §6 7 Ratchets Pass Evidence, §7 T6 6/6 Determinism Runs matrix, §8 ZVF Proof Matrix Summary, §9 5 Roster inventory, §10 Escalations (B2 WONTFIX, T4 form submit integrity gaps), §11 Verdict (AC-0..AC-9 gates checked).

**TR (Test Requirements) T9:**
- TR T9.1 [rule]: §0 banner CONFIRMED only when T5(7/7)+T6(6/6)+T8(exit≤2) all true. Otherwise NOT READY.

---

## Review (independent phase — after all 9 tasks completed):
### Review Task R1
Reviewer re-verifies AC-0..AC-10 binary. Writes review.md with (Evidence / Source / Result / Notes / Confidence / Override-Reason). Sum AC scores ≥ 9 pass / 10 → Verdict ACCEPTED.

---

## TASK STATUS TRACKER (live)
| ID | Status | Last Update | TR Verified |
|---|---|---|---|
| T1 Inventory scripts | pending | — | — |
| T2 Throw-prefix + B3→type=button | pending | — | — |
| T3 R3 role→button swaps | pending | — | — |
| T4 Submit integrity audit | pending | — | — |
| T5 7 Ratchets | pending | — | — |
| T6 2× Det runs | pending | — | — |
| T7 Rosters + ZVF md | pending | — | — |
| T8 Final integrity | pending | — | — |
| T9 11-section report | pending | — | — |
