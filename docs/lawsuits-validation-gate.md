# Lawsuits validation gate

## World-class axis (full)

```bash
npm run release:check:lawsuits:worldclass
```

Includes unit gate (1319+), desktop E2E (28+), cloud-sync, boot, **mobile E2E** (smoke + new-case + criminal), and **TTFI budgets** (desktop + mobile).

## Quick gate

```bash
npm run gate:lawsuits
```

## Perf only

```bash
npm run gate:lawsuits:perf
```

### Regression vs aspiration

| Mark | Desktop regression | Desktop aspiration | Mobile regression (4G+CPU×4) | Mobile aspiration |
|------|-------------------|------------------|------------------------------|-------------------|
| `dossierOpenMs` | ≤ 20000 | ≤ 8000 | ≤ 12000 | ≤ 5000 |
| `totalMs` | ≤ 30000 | ≤ 15000 | ≤ 35000 | ≤ 12000 |

Mobile probe uses `--throttle=slow-mobile` + **median of 3 samples** (closer to real-device feel on CI).

### Real device (manual)

Point probe at LAN device preview:

```bash
npm run build:e2e && npx vite preview --host 0.0.0.0 --port 4173
npm run perf:lawsuits-dossier-ttfi -- --url=http://<device-lan-ip>:4173 --device=iphone14 --throttle=slow-mobile --samples=5
```

## CI

`.github/workflows/lawsuits-gate.yml` — parallel jobs: **unit**, **E2E batched** (`run-lawsuits-ci-e2e.mjs`), **perf** (main/dispatch).

## Known limits

Live Supabase staging E2E still requires environment credentials (`test:e2e:civil-lawsuits:cloud:live`).
