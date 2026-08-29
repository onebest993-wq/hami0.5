# إكمال نقص احترافي — بعد قياس الحزمة (2026-08-21)

**نطاق:** بوابات الحجم + سلامة بناء التقسيم · لا commit

---

## ما كان يخصم (صارم)

| نقص | قبل | بعد |
|-----|------|-----|
| `execution-handler-cluster-seizure` named cap 120 | **167 KB** fail | **104 KB** OK (+ inline 80) |
| `check-bundle-size` exit | **1** | **0** |
| بناء معطوب من تقشير | statementLinking + ScopePicker | **مُصلح سابقاً** |

---

## ما أُكمل فوق الهدف (target)

| نقص | قبل | بعد |
|-----|------|-----|
| `ExecutionDashboard-*` target 280 | **386 KB** warn | **72 KB** (pipelines peels) |

---

## ما بقي تحذيراً فقط (غير صارم / خارج الدعاوى)

| بند | ملاحظة |
|-----|--------|
| `vendor-pdf` 326 &gt; 280 target | بائع PDF — خارج تقشير الدعاوى |
| critical path gzip 248 &gt; 120 target | حدّ تدريجي؛ soft limit 320 OK |
| orchestration 922 / DossierBody 554 | متعمّد (هيكل/Lazy) |

---

## تحقق

- `check-bundle-size`: **OK** · named caps **22**
- vitest hygiene/warm: خضراء
- لقطة محدّثة: `.audit/size-baseline-lawsuits-closure-2026-08-21.json`

---

## صدق

نقص **الصرامة** لبوابة الحجم أُغلق. تحذيرات vendor/critical-path معلنة وليست ديوناً مفتوحة لقسم الدعاوى.
