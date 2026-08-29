# Execution coverage matrix

Maps `npm run gate:execution` steps to product axes. This is the file the production gate checks for presence.

| Axis | What the gate proves | Not in this gate |
|---|---|---|
| Snapshot / overlays | Followup snapshot keys + chunk-scope wiring | Visual design |
| Dashboard unit | ExecutionDashboard vitest (~818) | Device biometrics |
| Application unit | `src/app/application/execution` | Live Supabase of a specific tenant |
| Domain / legal subset | Summons isolation + persist sanitizer + debtor profile bundle | Full Iraqi procedure encyclopedia |
| Probes | Seizure + followup tab stubs against E2E preview | All coercive subtypes |
| E2E Chromium | Specs in `scripts/execution-gate-manifest.mjs` | Safari / WebView |
| Payload MAC | API unit tests; production example requires secret + enforce | Physical phone |
| Legacy index quarantine | Unit + settings claim control (multi-account) | User actually tapping Import on a shared device |

E2E spec list (single source): `scripts/execution-gate-manifest.mjs`.
