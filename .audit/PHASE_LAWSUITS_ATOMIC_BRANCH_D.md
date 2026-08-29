# Branch D — تبويب مستعجل (Workspace)

**مصدر:** [Atomic audit Branch D urgent](8a5b9db0-e1b1-432f-8ddd-cda4b48ed475)  
**إغلاق:** `PHASE_LAWSUITS_ATOMIC_BRANCH_D_CLOSURE.md`  
**جاهز للانتقال:** نعم (E0) — موبايل بصري معلّق

## Findings High — مُغلقة

| ID | Issue | حالة |
|----|--------|------|
| D1 | `focusCaseId` يُقفل بعد أول تطبيق — لا يعيد الفتح عند A→B | ✅ |
| D2 | Escape/native-back يغلق المخزن فوق إضبارة/نموذج المستعجل | ✅ |
| D3 | ازدواج حفظ patchCase + saveState (سباق) | ✅ |
| D4 | DEV_FALLBACK يرحّل قضايا dev إلى مستخدم حقيقي | ✅ (DEV فقط) |

≠ FastTrack داخل SmartFile (فرع B).
