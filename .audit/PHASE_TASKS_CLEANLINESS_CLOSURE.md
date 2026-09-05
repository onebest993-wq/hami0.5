# نظافة قسم المهام — إغلاق صادق

**التاريخ:** ٣٠ آب ٢٠٢٦  
**النطاق:** أجندة المهام + ستارة الميدان + QuantumTasks + مساعدة المهام. بلا معاملات/تنفيذ.

## ما حُذف أو وُحِّد

| عنصر | الحكم |
|------|--------|
| `nlpAddFeedback.ts` + اختباره | ميت — لا مستهلك إنتاج |
| `useAgendaNow.ts` | تكرار `useLiveNow` — الأجندة تستخدم `useLiveNow(true)` |
| `TaskCardExpensePanel` | واجهة ميتة بلا استيراد |
| `parseAmountInput` / `isWeeklyPastDayCompact` | بلا مستهلك إنتاج |
| `listActiveFieldCurtainTasks` / `countActive*` / غلاف `countFieldDaySheetTasks` | إنتاج يستخدم قائمة اليوم + العدّاد الخفيف |
| `TASKS_INK` + تصدير `TASKS_SCROLL_CHROME` | حشو تصدير |
| إعادة تصدير `taskAgendaStatusLite` من `utils.ts` | برميل زائد |
| `addExpense` في QuantumTasks | mutation بلا أي استدعاء |
| تكرار `warmQuantumTasksDiskRead` في `fieldTasksIntentWarm` | يستورد من `fieldTasksLazyImports` |
| `WeeklyDayBlock` مقابل `AgendaWeeklyDayBlock` | نوع واحد |
| `CURTAIN_GLASS_INNER` | = `TASKS_GLASS_PANEL` |

## الاختبارات

Vitest: مجلد `tasksManager/__tests__` + ستارة + Quantum + تسخين + عزل شبكة + dock surgical + worldclass + تخزين — **ناجحة** (٩٦ + ٢٣ في الدفعات المقاسة).

## التقييم

| البُعد | درجة | ملاحظة |
|--------|------|--------|
| أداء | 8 | أقل كود على المسار؛ بلا قياس جهاز |
| نظافة | 8 | حذف حقيقي؛ القشرة الفورية ما زالت نسختين (DOM/React) عمداً |
| أمان | 8 | لم يُمسّ العقد |
| جودة | 8 | ساعة موحّدة؛ أنواع موحّدة |
| موبايل | 8 | لم تُضعَف 44px / لوحة المفاتيح |
| صدق | 9 | انظر الحدود |

**جاهز للانتقال:** نعم لهذه المرحلة.

**حدود:** نموذج `expenses` ما زال يُقرأ ويُعرض كشارة إن وُجد في التخزين — بلا واجهة إضافة. `TaskCard` ما زال ~344 سطراً. قشرة الفتح الفوري مكررة بين React و`innerHTML`. لم يُشغَّل Playwright ولا `tsc` كامل.
