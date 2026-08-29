# إغلاق عالمي — قسم الدعاوى (محدّث)

## التحقق الهندسي الكامل

```bash
npm run release:check:lawsuits:worldclass
```

يكتب ختم التحقق: `.audit/lawsuits-worldclass-verified.json`

## التحقق الإنتاجي (يدوي)

```bash
E2E_LAWSUIT_CLOUD_LIVE=1 VITE_SUPABASE_URL=... VITE_SUPABASE_ANON_KEY=... npm run release:check:lawsuits:worldclass
```

+ soak يومي على Pixel/iPad (4G، بطارية منخفضة) — خارج CI.

## المحاور

| محور | الآلية |
|------|--------|
| وحدة | `gate:lawsuits` — 1345+ vitest |
| E2E desktop | `run-lawsuits-ci-e2e.mjs` — دفعتان + preview واحد |
| cloud-sync | `civil-lawsuit-cloud-sync.spec.ts` |
| boot | `test:e2e:boot` |
| mobile | `run-civil-lawsuits-mobile-e2e.mjs` — Pixel 7 profile |
| TTFI | `gate:lawsuits:perf` — 4G throttle + median 3 samples |

## الحكم

| المستوى | الشرط |
|---------|--------|
| **عالمي هندسي** | `release:check:lawsuits:worldclass` PASSED + stamp |
| **عالمي إنتاج** | أعلاه + cloud live + soak ميداني موثّق |
