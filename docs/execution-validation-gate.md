# Execution validation gate

## Full (world-class axes)

```bash
npm run gate:execution
```

Runs, in order:

1. Presence of this file + `execution-coverage-matrix.md` (warning only if missing)
2. `audit:execution-snapshot` + `audit:execution-chunk-scope`
3. Unit: `src/app/components/lawyer/ExecutionDashboard` (retry once)
4. Unit: `src/app/application/execution`
5. Domain + legal subset specs listed in `scripts/execution-production-gate.mjs`
6. `build:e2e`
7. Preview on `127.0.0.1:8090` then `gate:execution:probes` (retry once) then Playwright specs from `scripts/execution-gate-manifest.mjs` (retry once)

## Fast (no E2E / no production build)

```bash
npm run gate:execution:fast
```

## CI

`.github/workflows/execution-gate.yml` — path-filtered on ExecutionDashboard, application/execution, execution E2E, and gate scripts.

## Known limits

- Real Android/iOS Capacitor device is **not** part of this gate. Use `npm run checklist:capacitor-boot` and exercise an execution dossier (keyboard, 44px, safe-area) on hardware.
- Playwright may retry one flaky archive/lifecycle case; a green gate after retry is accepted by the script.
- Cloud HMAC (`HAMI_DOSSIER_PAYLOAD_MAC_SECRET`) is server-side. Local without `HAMI_DOSSIER_PAYLOAD_MAC_ENFORCE` still accepts legacy rows missing `payload_mac`.
