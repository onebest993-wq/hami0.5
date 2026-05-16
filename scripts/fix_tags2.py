# -*- coding: utf-8 -*-
from pathlib import Path

p = Path(__file__).resolve().parent.parent / "src/app/components/lawyer/Dashboard_Active_Order_File.tsx"
lines = p.read_text(encoding="utf-8").splitlines()
motion_close = "</" + "motion.div>"
motion_open = "<" + "motion.div>"
div_close = "</" + "div>"

for i, line in enumerate(lines):
    if "cassationDecision.decisionDate" in line and i + 1 < len(lines) and motion_close in lines[i + 1]:
        lines[i + 1] = lines[i + 1].replace(motion_close, div_close)
    if "ملخص مرحلة الطعن التمييزي" in line:
        for j in range(i, min(i + 20, len(lines))):
            if lines[j].strip() == motion_close and j > i + 3:
                lines[j] = lines[j].replace(motion_close, div_close)
    if lines[j].strip().startswith(motion_open + ">") and "space-y-3" in lines[j] and "cassation" in "".join(lines[max(0,j-5):j]):
        lines[j] = lines[j].replace(motion_open, "<" + "motion.div>", 1)  # wrong

# fix cassation outer summary wrapper line 4429
for i, line in enumerate(lines):
    if line.strip() == motion_close and i > 0 and "expired" in lines[i - 1]:
        pass
    if "isFinalityNoGrievance" in line and motion_close in line:
        lines[i] = line.replace(motion_close, div_close)

for i, line in enumerate(lines):
    if line.strip() == motion_close:
        prev = "\n".join(lines[max(0, i - 8) : i])
        if "ملخص مرحلة الطعن" in prev and "cassationFilingGateRef" not in prev:
            lines[i] = line.replace(motion_close, div_close)

# revert wrong motion.div open for cassation form
for i, line in enumerate(lines):
    if line.strip() == "<" + "motion.div>":
        if "space-y-3" in line:
            lines[i] = "                                                    <div className=\"space-y-3\">"

text = "\n".join(lines) + "\n"
# close cassation !isFinalized before footer
footer = '                                                    <motion.div className="flex items-center justify-end gap-3 pt-4 border-t border-white/10">'
footer = '                                                    <div className="flex items-center justify-end gap-3 pt-4 border-t border-white/10">'
needle = "                                                    </AnimatePresence>\n\n                                                    <div className=\"flex items-center justify-end gap-3 pt-4 border-t border-white/10\">"
repl = "                                                    </AnimatePresence>\n                                                    )}\n\n                                                    {!isFinalized && (\n                                                    <div className=\"flex items-center justify-end gap-3 pt-4 border-t border-white/10\">"
if needle in text and repl not in text:
    text = text.replace(needle, repl, 1)
# close cassation footer
end_needle = "                                                                    : '🔒 تثبيت مرحلة الطعن التمييزي'}\n                                                        </button>\n                                                        )}\n                                                    </div>"
# find cassation footer end and add )}
if "{!isFinalized && (\n                                                    <div className=\"flex items-center justify-end gap-3 pt-4 border-t border-white/10\">" in text:
    marker = "                                                                    : '🔒 تثبيت مرحلة الطعن التمييزي'}\n                                                            </button>\n                                                        )}\n                                                    </motion.div>"
    marker2 = "                                                                    : '🔒 تثبيت مرحلة الطعن التمييزي'}\n                                                            </button>\n                                                        )}\n                                                    </div>"
    if marker in text and "                                                    )}\n                                                </div>\n                                            </motion.div>\n                                        )}\n                                    </AnimatePresence>\n                                </div>\n                            )}\n\n                            {isFinalized &&" not in text:
        text = text.replace(
            "                                                        )}\n                                                    </div>\n                                                </motion.div>\n                                            </motion.div>\n                                        )}\n                                    </AnimatePresence>\n                                </motion.div>\n                            )}\n\n                            {isFinalized &&",
            "                                                        )}\n                                                    </div>\n                                                    )}\n                                                </motion.div>\n                                            </motion.div>\n                                        )}\n                                    </AnimatePresence>\n                                </motion.div>\n                            )}\n\n                            {isFinalized &&",
        )

p.write_text(text, encoding="utf-8")
print("ok")
