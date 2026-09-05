# نقطة التوقف — سلة الدعاوى بعد Reload

تاريخ: 2026-09-01

جاهز للانتقال: **نعم** — لعقد `e2e/lawsuit-storage-lifecycle.spec.ts` على preview Chromium فقط.

التفاصيل: `.audit/PHASE_LAWSUIT_STORAGE_TRANSACTIONAL_SEAL_CLOSURE.md`

المراجعة بعد الإغلاق الأول أصلحت: إسقاط كل كتابة متأخرة على حاجز المعاملة (بما فيها الشواهد)، رفض الحذف النهائي فوق شواهد unread، ومنع استعادة النسخة الاحتياطية فوق تفريغ مقروء.

## أمر التحقق

```powershell
npm run build:e2e
$env:E2E_USE_PREVIEW='1'; $env:PW_RETRIES='0'; $env:E2E_REUSE_PREVIEW='0'
npx playwright test e2e/lawsuit-storage-lifecycle.spec.ts --project=chromium --workers=1 --repeat-each=2
```

لا تستخدم `npm run dev` (:8080) لهذا العقد.

## آخر حقيقة تشغيل

بعد المراجعة و`build:e2e`: الأمر أعلاه **مرتين متتاليتين** — **2 passed** ثم **2 passed**.
