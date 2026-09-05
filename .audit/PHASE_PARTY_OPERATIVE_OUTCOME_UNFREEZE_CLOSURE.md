# إغلاق طور: تفريد منطوق الحكم (bound|released)

تاريخ: 2026-09-03  
القرار: **فُكّ التجميد** لهذا الطور الضيق فقط بعد طلب المستخدم «تصرف باحترافية» + اختبار كل سيناريوهات الربح/الخسارة/الجزئي بتعدد الأطراف.

مرجع السياسة: `.audit/REPORT_PARTY_JUDGMENT_OUTCOME_INDIVIDUALIZATION.md` §6.

---

## ما أُنجز

### بيانات
- `PartyJudgmentDisposition.operative: 'bound' | 'released'` (افتراضي `bound` عند التطبيع/البذر).
- `coerceJudgmentTypeForReleasedOperatives` يفرض `رد الدعوى جزئياً` عند أي `released`.
- بطاقة المبرَّأ: `laneState = waived` بلا مهل (`partyChallengeLanes`).
- مسارات الطعن المتبقية تستبعد المبرَّأ (`opponentChallengeTracks`).
- م/172: الغياب الملزَم فقط (`art172AppealStay`).
- م/210: لا يحيي `released` (`cassationArt210` + `patchDossierAfterCassationRemand`).

### واجهة (بدون إعادة تصميم)
- في قائمة المدعى عليهم المتعددين: أزرار **إلزام / رد بحقه** بنفس نمط حضوري/غيابي.
- الحفظ والمسارات: coerce في `SmartJudgmentModal` + `applyJudgmentConfirm` + `scenarioWaitAppeal`.
- مزامنة الماسة: رد البعض → `رد الدعوى جزئياً`؛ رد الجميع → `رد الدعوى كلياً` (لا يُترك فوز كامل ظاهراً مع معفى).

### مصلحة الطعن
- `filterAppellantsByAppealInterest` / `partyHasMeritAppealInterest` يسقطان المبرَّأ.
- عند وجود `released`: فلتر الحضور يضم المدعي الموكل (`challengeAppellantEligibility`).

### اختبارات شغّلتها بنفسي (أخضر)
| ملف | محتوى |
|-----|--------|
| `multiPartyOperativeOutcome.matrix.test.ts` | فوز / خسارة / جزئي موحّد / جزئي تفريدي / مدّعون متعددون / اعتراض |
| `interestContractS4.simulation.test.ts` | S4 بعد فك التجميد |
| `multiPartyWinLossContext.simulation.test.ts` | سيناريو المدعي الرابع + released |
| `SmartJudgmentModal.test.tsx` | حفظ مختلط + coerce عند رد بحقه |
| `partyJudgmentDisposition.test.ts` | normalize/align/coerce |
| + وحدات مصلحة الطعن، م/210، form state، wait-appeal مختلط | |

---

## التقييم (واقعي)

| البُعد | الدرجة | ملاحظة |
|--------|--------|--------|
| أداء / استقرار | 8.5/10 | المسارات محاكاة وحدة؛ لا E2E حي لتسجيل دخول |
| نظافة | 8/10 | حقل اختياري على الصف القائم؛ لا محرك نتائج متعدد |
| أمان | 8/10 | coerce دفاعي عند الحفظ؛ لا مسارات سرّية جديدة |
| جودة كود | 8.5/10 | helpers مركزية + فلاتر موجودة مُعاد استخدامها |
| موبايل | 8/10 | أزرار 44px بنفس `toggle` القائم؛ safe-area على المودال كما هو |
| صدق | — | انظر الحدود |

---

## الحدود (صراحة)

- **خارج الطور** ما زال مجمّداً: Soft Lock، دمج ساعتي المهل، `CaseStage.status = EXEMPT`، إضبارة متوازية، تفريد التنفيذ.
- جزئي **موحّد** بلا `released` لا يضم المدعي تلقائياً في فلتر الحضور المختلط (كما قبل) — الضم يكون عند تفريد `released`.
- لا تجربة يدوية في المتصفح من هذه الجلسة؛ الاعتماد على vitest + مسار الحفظ في مودال الحكم.
- S1/S3 fixtures ما زالت بلا مفتاح `operative` في المصدر؛ التطبيع يضيف `bound`. إطفاء الكاسب عبر `operative` لا عبر `CaseStage.EXEMPT`.
- صقل 2026-09-03 لاحقاً: رد الجميع → كلي؛ مزامنة المنطوق في المودال؛ اختبارات أمانة S1/S3 محدّثة.

---

## الموقع

**جاهز للانتقال:** نعم — لهذا الطور الضيق فقط.

**المصداقية:** نُفّذ §6 أ + جوهر ب (إسكات بطاقة + مصلحة + coerce) + م/172/م/210. لم يُنفَّذ زر «استئناف متقابل» جديد ولا تلميح لوحة منفصل — المسارات القائمة تُستخدم بعد تصفية الأطراف.
