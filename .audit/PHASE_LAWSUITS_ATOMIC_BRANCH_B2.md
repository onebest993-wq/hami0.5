# Branch B2 — تدقيق incidental / consolidation / linking

**مصدر:** [Atomic audit Branch B2](dd31bd79-d70e-4ddc-810c-43518f4b4823)  
**جاهز للانتقال:** لا (حتى إصلاح B2-1 و B2-2)

## Findings

| ID | Sev | Issue |
|----|-----|--------|
| B2-1 | High | مقارنة `f.id !== parentFileId` دون normalize |
| B2-2 | High | صف حادثة يُحفظ قبل نجاح NewCase → يتيم عند الإلغاء |
| B2-3 | Med | تكرار منطق التوحيد الخارجي |
| B2-4 | Med | incidental actions ما زال ~567 |

## Minimum close
1. normalizeFileId في save + openUpdate
2. تأجيل/تراجع صف الحادثة
3. اختبارات spawn→save و cancel
