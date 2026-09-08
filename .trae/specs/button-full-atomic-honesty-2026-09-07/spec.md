# BUTTON FULL ATOMIC HONESTY AUDIT — SPEC (TIER-1 PRODUCTION)
Baseline Date: 2026-09-07
Repository: `C:\Users\HEX STORE\Downloads\New folder` (hami-app v10.5.0-tier1-hardened)
Stack context: React 18 + Vite 7 + TS 5.9 + Tailwind 4 + Capacitor 8 + Supabase

---

## 0. PROBLEM STATEMENT
The HTML `<button>` element carries a **critical silent default behavior**: when rendered inside or adjacent to a `<form>` without an explicit `type=` attribute, browsers treat it as `type="submit"` — triggering accidental form submission, navigation, state reset, or even irreversible writes on user click with no onPress handler. This is the #1 button-related production bug class in React apps.

Additionally:
- Elements with `role="button"` that are actually pressable MUST be native `<button>` (HTML5.2 ARIA §5.4, WCAG 2.1 4.1.2 / SC 2.5.3 Label-in-Name) to provide keyboard Enter/Space semantics, native focus ring, and disabled state for free.
- `type="submit"` buttons require explicit form context verification; no more than 1 per form; never nested.
- Invisible, commented-out, or dangerouslySetInnerHTML button patterns (like `</button>` in strings) must be audited to protect against XSS-in-HTML-context misrendering.

The project just finished a global div audit with 30 safe edits ZVF and TIER-1 READY. The next logical audit is button semantics and integrity at identical Tier-1 scope.

---

## 1. GOALS (G1..G6)
| ID | Goal | Measurable |
|---|---|---|
| G1 | 100% of production `<button>` elements in TSX files classified by their HTML type (button/submit/reset/implicit-default) with zero unclassified. | `classification-final.csv` has all 2059 rows classified; no empty `class_final`. |
| G2 | Every `<button>` missing explicit `type=` (currently 4 identified in baseline) has a corrective edit adding `type="button"` (ZVF: no visual/layout/text changes). | `04-final-integrity.mjs` count no-type-buttons = 0; 7 ratchets Δ≤0. |
| G3 | Every element using `role="button"` (currently 13 in baseline) is independently reviewed: either (a) converted to real `<button type="button">` with UA inline reset for ZVF, OR (b) downgraded to WONTFIX with a binding spec-level justification documentable in `wontfix-roster.csv` (category: role-button-outer-switch / role-button-draggable / role-button-has-focus-trap-children). | swap-final.csv has N ≤ cap, and wontfix-roster has exactly (13 - N) role=button rows. |
| G4 | Every `type="submit"` is verified to live inside an HTML `<form>` (or React `<Form>` primitive) with submit handler, has explicit `disabled` during pending state, and is not duplicate (no >1 submit per form). | form-submit-integrity.csv populated; AC-4 rule. |
| G5 | Guarded monotonic quality preservation (7 ratchets, 3 arch/closure guards identical to div-full audit) — never allow regressions. Fail-closed. | All 7 pass with Δ≤0; tests ≤ baseline. |
| G6 | Final 11-section Tier-1 report + Spec Mode review gate identical to div-full audit. | Files exist at canonical paths. |

---

## 2. NON-GOALS (NG1..NG7 — STRICTLY FORBIDDEN EDITS)
Anything not explicitly in Goals above is a forbidden edit for this audit (zero discretion):
- **NG1**: Changing any className, inline style values, color, padding, border-width, animation-duration, layout, ordering of children. This is ZVF (Zero Visual Edits) — same binding as div-full audit. UA button native reset style additions ARE allowed and ARE ZVF-correct by definition (§6). No other inline styles.
- **NG2**: Refactoring onClick handlers, business logic, form submission payloads, state machines.
- **NG3**: Adding event handlers (onPointerDown, onKeyDown, onFocus, etc.) that were not present before.
- **NG4**: Converting `<button>` → `<div role="button">` under any circumstances (reverse swap). Always div→button when eligible.
- **NG5**: Removing ARIA attributes, data-testid, titles, tooltip attributes, or any HTML attributes on a changed tag.
- **NG6**: Setting `type="submit"` when it was not present before (that changes semantics).
- **NG7**: Disabled-state rollout campaign across all buttons (out of scope). Any disabled additions would require separate Spec.

---

## 3. SCOPE (WHAT'S IN / OUT)
### IN SCOPE:
- All `src/app/**/*.tsx` production files (excl `__tests__/`, `/tests/`, `*.test.*`, `*.spec.*`). Count: 1569 TSX files confirmed by baseline.
- Elements matching:
  - `<button\b[^>]*>` — open JSX tags (multiline-aware regex with `[\s\S]*?>`)
  - Any element (div/span/Anchor/a/Tr/Td/etc.) containing `role\s*=\s*["']button["']`
  - `type\s*=\s*["']submit["']` attributes anywhere in scope
  - `type\s*=\s*["']reset["']` (0 count expected; verify)

### OUT OF SCOPE:
- `src/**/*.test.tsx`, `*.spec.tsx`, `__tests__/**` → excluded by scope guard
- `node_modules/`, `.svelte/` (doesn't exist), Capacitor native code (android/, ios/)
- `.md`, `.json`, `.css`, `.svg`, static assets
- `src/app/**/*.ts` service/domain files (11 `<button` hits are error strings, not JSX)
- Radix primitives / shadcn/ui component internals in `node_modules` or vendored UI that already passes asChild — classified WONTFIX-role-button-Radix-asChild (category R0).

---

## 4. FUNCTIONAL REQUIREMENTS (FR1..FR5)
| ID | Requirement | Rule/Rubric |
|---|---|---|
| FR1 | **Script-generated inventory BEFORE ANY EDIT**: Run 3 inventory Node scripts: 01-code-quality.mjs (smells: throw/no-prefix, console.log, any-typed-inline-in-tsx), 02-button-inventory.mjs (2000+ buttons into CSV), 03-role-button-audit.mjs (role=button rows). Exit 0 for all 3. | Rule |
| FR2 | **Auto-classifier 04-auto-classifier.mjs**: Assign 100% of 2059 buttons to 9-bucket taxonomy (see §6). Expose NEEDS-FIX (no-type-buttons + role=button eligible) only. | Rule |
| FR3 | **Edit ceiling caps (fail-closed HARD)**: Exceeding ANY cap below forces audit FAIL with zero roll-forward. | Rule |
| | Cap A. no-type-button → type=button insert: ≤100 edits (actual baseline = 4) | |
| | Cap B. role=button → `<button type="button">` swap with inline UA-reset: ≤20 edits (actual baseline = 13) | |
| | Cap C. service/domain throw-prefix code quality REMEDIED: ≤15 (max; realistic ≤5) | |
| | Cap D. form-context missing submit → NOT fixed in this audit, 100% WONTFIX escalated to separate Spec | |
| FR4 | **Depth-balanced close tag edits**: For each role→button swap, BFS depth-search identifies the paired `</originalTag>` by open/close self-close balanced equation. Never mismatch close-tag depth. Same method applied successfully in div-full 5/5 balanced. | Rule |
| FR5 | **Final integrity 04-button-final-integrity.mjs**: re-scan scope for `button-no-type` count (MUST = 0), `role-button-but-not-native` count (MUST = 13 - Cap B used), `nested-button` violations count (exclude 33 preexisting Radix-asChild rows identified during div-full). | Rule |

---

## 5. NON-FUNCTIONAL REQUIREMENTS (NFR1..NFR6)
| ID | Requirement | Rule/Rubric |
|---|---|---|
| NFR1 | **Monotonic ratchets 7/7 must PASS Δ≤0 after edits**: guard-tsc-ratchet ≤956, guard-lint ≤11 errors, guard-dead-exports ≤1885, guard-test ≤21 failing tests (allowlist 13 timing-flakes ≤0.109%), guard-cycles ≤2 groups/13 files, guard-arch ≤244, guard-closure broken-imports=0. Improvement Δ- allowed (like div-full improved tests 21→20) but `--save` NEVER invoked on baseline thresholds (user binding NO SAVE). | Rule |
| NFR2 | **Determinism AC-5 2x clean runs**: Targeted standalone tests touching modified files run TWICE. Identical pass counts across Run 1 ↔ Run 2 for each. Maximum 0/6 non-deterministic failures permitted; any flake even single → T6 marked in_progress until resolved. | Rule |
| NFR3 | **ZVF 100% boundary audit matrix**: Matrix proof artifact `zvf-verification-report.md` lists every single edit with columns (Edit # / File / Original Line / New Line / Category). Categories allowed ONLY = (T:type-insert, B:role→button-swap, Q:throw-prefix). Allowed className additions ONLY = `w-full text-right` (to correct button inline-block → div block display parity). No className removals. No text content changes. | Rubric: score 0..2. Pass threshold ≥ 2 (no violations). |
| NFR4 | **5 roster CSVs published**: wontfix-roster.csv, remedied-roster.csv, role-button-classification.csv, swap-final.csv, form-submit-integrity.csv. All with correct headers. | Rule |
| NFR5 | **11-Section Tier-1 Final Report** at `.audit/BUTTON-FULL-ATOMIC-HONESTY-AUDIT-2026-09-07.txt` with sections §0 Banner → §10 Escalations → §11 Verdict. TIER-1 READY banner only when all gates open. | Rule |
| NFR6 | **Independent Review gate**: `review.md` created in Review phase only (never during Implement). Binary pass/fail rule re-verification of 10 ACs. Workflow fidelity rubric 0..2 ≥ 2 required. | Rule |

---

## 6. TAXONOMY / CLASSIFICATION BUCKETS (9 buckets for 2059 buttons + 13 role=button)
Buttons without type:
- B0 `SAFE-explicit-type-button` — `<button type="button"` (vast majority, ~2041). ✓ No edit.
- B1 `SAFE-explicit-type-submit-form-verified` — type=submit + verified inside `<form>` w/ handler. (~13 of 14)
- B2 `WONTFIX-submit-outside-form-or-escalated` — type=submit without form context. Documented. Not fixed this audit. (count TBD)
- B3 `NEEDS-FIX-NO-TYPE-IMPLICIT-SUBMIT-RISK` → remediation: INSERT `type="button"` (4 in baseline). THIS IS THE HIGHEST PRIORITY REMEDIATION.
- B4 `SAFE-explicit-type-reset` — verify baseline count 0.

Role=button elements (div/span/a/etc):
- R0 `WONTFIX-role-button-RADIX-asChild-or-Slot` — Radix Slot (DropdownMenuItem/Toolbar/ToggleGroup/DialogClose already does role=button via primitive). WONTFIX by library-boundary rule.
- R1 `WONTFIX-role-button-input-or-nested-button-inside` — contains `<input>` or descendant `<button>`. Cannot convert outer per HTML 4.10.8.
- R2 `WONTFIX-role-button-drag-handle` — drag & drop surface; native button UA activation interferes with drag.
- R3 `NEEDS-FIX-ROLE-BUTTON-→-NATIVE-BUTTON` — low-risk role=button (no R0/R1/R2) → swap opening tag to `<button type="button">` plus inline UA reset (§6.1) plus balanced close tag.

Code quality (not button-classification but T2):
- Qx `REMEDIED throw-prefix` — exactly div-full format `[domain_subdomain:opid] original_msg` for services/domain throw new Error.

### §6.1 ZVF-CORRECT BUTTON UA RESET (ONLY ALLOWED INLINE STYLE for R3 swaps)
This inline style is REQUIRED for every R3 role→button swap. It is mathematically provable visual parity with the original div/span in every browser UA stylesheet:

```tsx
style={{
  appearance: 'none',
  background: 'transparent',
  border: 'none',
  padding: 0,
  margin: 0,
  font: 'inherit',
  color: 'inherit',
  lineHeight: 'inherit',
  letterSpacing: 'inherit',
  textAlign: 'inherit',
  WebkitTapHighlightColor: 'transparent',
  cursor: 'pointer' /* only if original element had className with cursor-pointer; else omit */
}}
```
**PLUS** className append (NOT replace): if element was block-level width, add `w-full`; if original div had `text-left`/`text-right`/`text-center` → add matching to correct button text-align UA reset. Original className kept verbatim (never removed chars).

### §6.2 no-type-button INSERT RULE (ONLY ALLOWED B3 EDIT)
For each `<button>` in NEEDS-FIX-B3, insert `type="button"` as the FIRST attribute after button tag name. ZVF proof: adding an HTML attribute that already matches browser UA default behavior (since we determined it's not inside form or already acts as button) = 100% identical DOM rendering.

```diff
- <button onClick={handleClick}
+ <button type="button" onClick={handleClick}
```

---

## 7. CONSTRAINTS, DEPENDENCIES, ASSUMPTIONS, OPEN Qs
### CONSTRAINTS (BINARY FAIL):
- **C1 (NO QUESTIONS, FULL AUTONOMY)**: User binding message in force. NotifyUser artifacts for review but do not block on approval; proceed Implement immediately after Notify.
- **C2 NO SAVE**: Never modify baseline threshold files. `--save` never used.
- **C3 FAIL-CLOSED**: If ANY edit causes TSC production error (even 1 new), halt, git restore that file, try alternative edit. No progression until 0 new TSC errors.
- **C4 CAPS HARD**: §4 FR3 caps A/B/C/D.

### DEPENDENCIES:
- Node 24.x (.nvmrc) — verified
- Vitest for T6 standalone — package.json `"test": "vitest run"`
- Guard scripts (preexisting): `scripts/guard-*.mjs` + `.audit/verify-import-closure.mjs`

### ASSUMPTIONS (DOCUMENTED):
- A1: 33 preexisting Radix-asChild nested button rows = NOT COUNTED against violations.
- A2: ZVF matrix treats className additions (§6.1 + §6.2) as parity-correct, not visual.
- A3: For B3 → type=button always correct when file context does not show submit-intent form. If B3 element lives inside a form but there's already a type=submit, treating as button is safe. If inside form AND NO other submit present → REMAP to B2 WONTFIX escalated (conservative).

### OPEN QUESTIONS:
**0 resolved autonomously (fail-closed: conservative).** No user questions per autonomy.

---

## 8. ACCEPTANCE CRITERIA (10 ACs — rule/rubric, rule first)
| ID | Type | Condition | Failure means |
|---|---|---|---|
| AC-0 | rule | 7 monotonic ratchets Δ≤0 (TSC ≤956, Lint ≤11, Dead ≤1885, Tests ≤21, Cycles =2/13, Arch=244, Closure=0) | ROLLBACK failing edit; repeat until pass. |
| AC-1 | rule | 0 unclassified button rows in `buttons-classification-final.csv` (col class_final non-empty for every row). | Mark T2 in_progress, patch classifier. |
| AC-2 | rule | NEEDS-FIX-B3 no-type-buttons → 100% addressed = 0 remaining in final integrity scan. | T2 incomplete; fix 4/4. |
| AC-3 | rule | role=button 13 → 100% classified. Exact count (R3 swapped) + (R0/R1/R2 wontfix) = 13. | T3 in_progress; add rows to wontfix-roster for each WONTFIX. |
| AC-4 | rule | Cap B ≤20 R3 swaps, Cap A ≤100 type-inserts, Cap C ≤15 quality remediations, Cap D = 0 out-of-scope fix. | Audit FAIL. |
| AC-5 | rule | 6/6 T6 standalone runs exit=0 AND identical pass counts between run1 ↔ run2 for each of 3 target test files. | T6 rerun until deterministic. |
| AC-6 | rubric | ZVF matrix 0..2 score per edit. PASS ≥ 2 for every edit row in zvf-report. Mean ≥2 required. | Review FAIL: rollback offending edit. |
| AC-7 | rule | Arch-boundaries Δ=244, import cycles Δ=2, closure broken=0. 3 arch/closure guards pass. | Fail closed; investigate dependency injection order. |
| AC-8 | rule | Inventory scripts 01/02/03 exit 0. Final integrity 04 exit ≤2 (Radix 33 preexisting ok). All CSV headers non-empty no NaN columns. | T1 incomplete. |
| AC-9 | rule | 11-section report at canonical path with TIER-1 READY banner iff AC-0..AC-8 all PASS. Otherwise TIER-1 NOT READY. | T9 in_progress until corrected. |
| AC-10 | rubric | Independent Review workflow fidelity 0..2, adaptability 0..2. Sum ≥ 3 required; workflow fidelity MUST = 2. | Review FAIL return Implement. |

---

## 9. ARTIFACT INDEX (canonical paths)
| Artifact | Absolute Path | Phase |
|---|---|---|
| SPEC MD | `.trae/specs/button-full-atomic-honesty-2026-09-07/spec.md` | ✅ THIS FILE |
| TASKS MD | `.trae/specs/button-full-atomic-honesty-2026-09-07/tasks.md` | Plan |
| REVIEW MD | `.trae/specs/button-full-atomic-honesty-2026-09-07/review.md` | Review |
| FINAL 11-SEC REPORT | `.audit/BUTTON-FULL-ATOMIC-HONESTY-AUDIT-2026-09-07.txt` | Implement T9 |
| Inventory folder | `.audit/button-full-inventory/` | Implement T1-T7 |
