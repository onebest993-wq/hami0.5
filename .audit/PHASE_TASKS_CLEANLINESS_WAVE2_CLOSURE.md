# نظافة قسم المهام — موجة 2 — إغلاق صادق

**التاريخ:** ٣٠ آب ٢٠٢٦  
**النطاق:** أجندة المهام + ستارة الميدان + QuantumTasks + مساعدة المهام. بلا معاملات/تنفيذ.  
**سابق:** `.audit/PHASE_TASKS_CLEANLINESS_CLOSURE.md` (موجة 1). هذه موجة ثانية أعمق، لا إعادة ادّعاء للموجة الأولى.

## ما أُنجز

### دوال وبراميل ميتة
| عنصر | الحكم |
|------|--------|
| `persistQuantumTasksImmediate` | لم يُستدعَ — المسار الحي `persistQuantumTasksSync` + `persistQuantumTasksBackground` |
| `useQuantumPendingSnapshot` / `useQuantumTasksSnapshot` وإعادة تصدير اللقطات من السياق | بلا مستهلك — اللقطات من `quantumTasksMetrics` |
| `reportFieldTasksPerfIfDev` | بلا مستهلك — يبقى `reportFieldTasksPerf` |
| `isTasksManagerModuleResolved` | بلا مستهلك — يبقى `getCachedTasksManagerOverlay` |
| إعادة تصدير `QuantumTasksContext` / `QuantumTasksContextValue` من الـ Provider | برميل زائد |
| إعادة تصدير `RequestTaskHelpParams` و `MAX_TASK_RAW_LENGTH` و `AddTaskOptions` من `useQuantumTasks` | بلا مستورد خارجي |
| `formatIqd` | كان يغذّي شارة مصروف ميتة فقط |

### سطح ميت لميزة محذوفة
- شارة IQD الذهبية على بطاقة الأجندة (`expenseSum`) — آخر بقايا `addExpense`. نموذج `expenses` ما زال يُقرأ ويُصفّى في الحارس والتوقيع لأن أقراصاً قديمة قد تحمله.
- فرع `embedded === false` في `TaskCardDocPanel` («حقيبة المستندات») — الإنتاج يمرّ دائماً بالمسار المضمّن.

### تكرار موحَّد (كان مستخرَجاً بلا ربط كامل في الاختبار)
- بطاقة الستارة تُستورد مرة واحدة من `FieldTasksSheetChrome` لا من `FieldTasksBottomSheet`.
- `zIndex: 215` المضمّن حُذف — `CURTAIN_SHEET` أصلاً `z-[215]`.

### تصديرات داخلية أُلغيت (نفس الملف فقط)
أنواع Props للدوال/المكوّنات أعلاه، و`getTaskAgendaDay`، و`snoozedTaskAgendaWeekStart`، و`sanitizeTaskVoiceRef`، و`TaskVoiceFields`، و`SubTaskKind`، ومعاملات الفتح/العون غير المستخدمة خارج الملف.

`useQuantumTasksBackgroundFlush` مربوط في الـ Provider من موجة سابقة — لم يُمسّ عقد التفريغ.

## الاختبارات

Vitest لقسم المهام (أجندة، ستارة، خدمات، Quantum، تسخين، dock surgical، wave3، تخزين، تنبيهات ميدان): **٣٩ ملفاً، ١٧٩ اختباراً — ناجحة**.

قفل الصدق: `tasksCleanlinessHonesty.test.ts` (موجة 2) يمنع عودة الأسماء المحذوفة.

## التقييم

| البُعد | درجة | ملاحظة |
|--------|------|--------|
| أداء | 8 | أقل كود ميت على المسار؛ بلا قياس جهاز/حزمة |
| نظافة | 8 | حذف حقيقي؛ القشرة الفورية ما زالت نسختين عمداً |
| أمان | 8 | لم يُمسّ عقد WIFE/التخزين؛ حارس المصروف ما زال للنصوص القديمة |
| جودة | 8 | تصديرات داخلية أُغلقت؛ `TaskCard` ~٢٣٨ سطراً (تحت حد ٢٥٠) |
| موبايل | 8 | لم تُضعَف 44px / لوحة المفاتيح / safe-area |
| صدق | 9 | انظر الحدود |

**جاهز للانتقال:** نعم لهذه الموجة.

## الحدود — ما لم يُنفَّذ صراحةً

- قشرة الفتح الفوري ما زالت نسختين (React + `innerHTML`) عمداً لأول رسم.
- `expenses` يبقى على `LegalTask` + sanitizer + توقيع البطاقة — بلا واجهة إضافة أو شارة.
- `fieldCurtainDayCountLite` مقابل `listFieldDaySheetTasks`: عمداً (مسار بارد بلا فرز).
- `taskAgendaStatusLite` لا يُوحَّد مع `nlpParser` حتى لا يُسحب المحلّل إلى التنبيهات.
- لم يُشغَّل Playwright ولا جهاز ولا `tsc` كامل.
- `guard-dead-exports.mjs --save` لم يُحدَّث على مستوى المستودع (خط الأساس عالمي وقديم).
- تغيير بصري ضيّق: شارة IQD للمهام التي كان لها مصروف مخزّن لن تظهر. شارة «حتمي» لم تُمسّ.
