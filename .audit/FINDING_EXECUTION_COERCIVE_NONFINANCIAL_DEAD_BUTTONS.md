# FINDING — زرّان جبريان غير ماليان بلا onClick في مودال الإجراءات الجبرية

**التاريخ:** ١٠ آب ٢٠٢٦  
**الشدة:** عالية (وظيفي)  
**الحالة:** **مُغلَقة** (١٠ آب ٢٠٢٦ — الجولة ٥)

## الملخص

في `ExecutionCoerciveActionsModalContainer`، عند `isNonFinancialClaim`، زرّا «طلب قوة تنفيذية» و«محضر امتناع» مُنسَّقان ويُعطّلان شرطياً لكن **لا يوجد `onClick`** ولا استدعاء `handleCoerciveAction`.

## الشيفرة

```395:427:src/app/components/lawyer/ExecutionDashboard/components/ExecutionCoerciveActionsModalContainer.tsx
                            <button type="button"
                                disabled={daysSinceNoticeCalculated <= 7 && remaining > 0}
                                className={...}
                            >
                                ...
                                        <p>طلب قوة تنفيذية</p>
                            </button>
                            
                            <button type="button"
                                disabled={daysSinceNoticeCalculated <= 7 && remaining > 0}
                                className={...}
                            >
                                ...
                                        <p>محضر امتناع</p>
                            </button>
```

## الأثر

واجهة تبدو جاهزة؛ لا إجراء عند الضغط حتى بعد انتهاء المهلة.
