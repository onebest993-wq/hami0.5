# DIV Full Atomic Honesty Audit — Inventory Overview (2026-09-07)
Target: 1577 PROD TSX (excl tests) · 5731 prod files total (TS+TSX+JS+JSX)
Scanners: scripts/div-full-inventory/01..03
Runs: 3/3 exit=0 verified

| Scanner | Files scanned | Row hits (excl header) | Key output |
|---------|---------------|------------------------|------------|
| 01 code-quality.mjs | 5731 | 572 | 572 smell: TODO/FIXME/HACK + console.* + throw |
| 02 div-button-audit.mjs | 1577 UI TSX | 5385 | All interactive attrs captured: onClick, onPointer*, onKey, role=button, tabIndex, aria, cursor-pointer |
| 03 semantic-div.mjs | 1577 UI TSX | 310 semantic candidates + 5953 total divs | 8 landmark categories header/nav/footer/section/aside/article/tabpanel/dialog |

## Classification initial (auto-only)
- T2 Code-Quality: 572 hits (auto patterns): ~450 WONTFIX expected, ~22-50 REMEDIED candidate (throws low-context no Arabic)
- T3 Button: 5385 divs → SAFE majority · NEEDS-FIX interactive ≤ 1% expected (~50)
- T4 Semantic: 310 candidates → 3 swap max + 307 WONTFIX

## Next (T2-T4)
- Build 04-auto-classifier.mjs for code-quality then T3 final manual-verify.
- REMEDIED edits start only after ratchets baseline confirmed.
