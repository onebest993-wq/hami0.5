# تخفيف + ضغط تصميمي — قسم الدعاوى (إغلاق محدّث)

**تاريخ:** 2026-08-21 (تحديث zero-deduct)  
**إذن المستخدم:** تخفيف/تحيف/ضغط + إغلاق فجوات الخصم #1–20.  
**لا commit في هذه الموجة.**

تفاصيل البنود Done/Skipped: `.audit/PHASE_LAWSUITS_ZERO_DEDUCT_CLOSURE.md`.

---

## كود (eager→lazy) — موجات 1–3 + zero-deduct

| موجة | أثر ملموس |
|------|-----------|
| 1–3 | تأخير secondary · hub archive · SmartFile hubs · TrialsTab · Personal chrome · AOF Quick Log · trialSessionsDisplay · Appeal/Cross lazy |
| **zero-deduct** | heavy warm `includeSecondary:false` · display helpers خارج engine لمسارات خفيفة · requests-tab preload مؤجّل · archive lite+lazy card · MainPanel lazy ToDo/Civil/Incidental/Personal · JudicialNotification lazy · hot-modal prefetch مُليَّن |

Prefetch-on-intent **محفوظ**. لا قياس gzip/vite رقمي.

---

## تصميم (كثافة + لمس)

| هدف | نتيجة |
|-----|--------|
| close / chip / PartyChip / ToDo / Timeline delete / AOF+urgent | ≥44px |
| ARCHIVE_CHIP_BASE | 36→44 |
| DossierHeaderNavButtons compact | ≥44 |
| Judgment body / sessionHub / Trash empty / Urgent error / Timeline empty | أكتف بلا redesign هوية |

محفوظ: navy `#0A0F1C` · gold `#E6C673` · Tajawal/RTL · SmartJudgmentModal keep-mounted.

---

## تقييم الأبعاد (واقعي)

| البُعد | درجة | ملاحظة |
|--------|------|--------|
| أداء | 8.5/10 | zero-deduct slimming فوق موجات 1–3 |
| نظافة | 9/10 | partyContext typed + NC_FIELD_ERROR demote + lite archive path |
| أمان | 8/10 | لا تغيير مسارات صلاحيات |
| جودة كود | 8.5/10 | display/lite splits؛ اختبارات هيكل محدّثة |
| موبايل | 9/10 | touch floors مكتملة لبنود القائمة |
| صدق | 9.5/10 | INTENTIONAL_KEEP معلن في ZERO_DEDUCT |

**جاهز لإغلاق leftovers الكثافة + فجوات الخصم القابلة للإصلاح داخل نطاق الدعاوى/المستعجل/SmartFile:** نعم.

---

## اختبارات مركّزة

- `src/app/runtime/__tests__/heavyDashboardSectionWarm.test.ts`
- `src/app/components/lawyer/criminal-system/__tests__/criminalDashboardLazyRegistry.test.ts`
- `src/app/components/lawyer/ArchivePortal/__tests__/lawsuitArchiveTouchTargetFloors.test.ts`
- `src/app/components/lawyer/smart-modal/__tests__/smartFileTouchTargetFloors.test.ts`
- `src/app/domain/urgent/__tests__/urgentSectionStructure.test.ts`
- `src/app/components/lawyer/criminal-system/trialSessionsEngine.test.ts`

**تشغيل 2026-08-21:** 6 files · **58 passed**.
