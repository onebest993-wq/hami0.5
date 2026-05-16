# -*- coding: utf-8 -*-
from pathlib import Path

p = Path(__file__).resolve().parent.parent / "src/app/components/lawyer/Dashboard_Active_Order_File.tsx"
text = p.read_text(encoding="utf-8")

motion_close = "</" + "motion.div>"
div_close = "</" + "div>"

text = text.replace(
    "formatDateText(grievanceDecision.decisionDate) || '—'}\n                                                                " + motion_close,
    "formatDateText(grievanceDecision.decisionDate) || '—'}\n                                                                " + div_close,
)
text = text.replace(
    "<" + "motion.div>انقضاء مدة التظلم دون تقديم طعن" + motion_close,
    "<" + "motion.div>انقضاء مدة التظلم دون تقديم طعن" + div_close,
)
text = text.replace(
    "isFinalityNoGrievance && <" + "motion.div>اكتساب الدرجة القطعية دون تقديم تظلم" + motion_close,
    "isFinalityNoGrievance && <" + "motion.div>اكتساب الدرجة القطعية دون تقديم تظلم" + div_close,
)
text = text.replace(
    "isFinalityNoGrievance && <" + "motion.div>اكتساب الدرجة القطعية دون تقديم تظلم" + div_close + "\n                                                        " + motion_close,
    "isFinalityNoGrievance && <" + "motion.div>اكتساب الدرجة القطعية دون تقديم تظلم" + div_close + "\n                                                        " + div_close,
)

footer_needle = (
    "                                                    </motion.div>\n\n"
    "                                                    <div className=\"flex items-center justify-end gap-3 pt-4 border-t border-white/10\">"
)
footer_repl = (
    "                                                    </motion.div>\n"
    "                                                    )}\n\n"
    "                                                    <div className=\"flex items-center justify-end gap-3 pt-4 border-t border-white/10\">"
)
if footer_needle in text:
    text = text.replace(footer_needle, footer_repl, 1)

p.write_text(text, encoding="utf-8")
print("done")
