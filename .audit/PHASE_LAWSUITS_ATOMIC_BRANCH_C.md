# Branch C — تدقيق أحوال شخصية

**مصدر:** [Atomic audit Branch C](7d1c47f4-1d94-430c-bcb1-0749ee53eddb)  
**جاهز للانتقال:** لا (حتى C1/C2)

## Findings

| ID | Sev | Issue |
|----|-----|--------|
| C1 | High | `caseLinkViewOnly` / `interactionLocked` غير مُمرَّر — أزرار تبقى فعّالة |
| C2 | Med | حفظ شخصي بلا تحقق أسماء الأطراف |
| C3 | Med | `setShowIncidentalModal` ميت لكن الاختبار يفرضه |

## Minimum close
1. قفل view-only كالمدني
2. تحقق أسماء الأطراف عند الحفظ
3. نظافة incidental stub
