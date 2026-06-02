import { describe, expect, it } from 'vitest';
import {
    INVESTIGATION_ARTICLE_130_DECISIONS,
    INVESTIGATION_TIMELINE_CATEGORIES,
    INVESTIGATION_TIMELINE_OTHER_CATEGORY,
    buildCriminalActionParties,
    isComplainantAlsoAccused,
    filterDefendantStatusOptions,
    formatCriminalStageLabel,
    formatDefendantStatusLabel,
    formatDefendantStatusShortLabel,
    formatProceduralStageLabel,
    getDefendantStatusSelectOptions,
    isDetentionArrestCategory,
    buildConcernedParties,
    caseStageFromStoredStage,
    formatInvestigationLogStatusLabel,
    formatLawyerRequestStatusLabel,
    isInvestigationAffidavitTimelineCategory,
    normalizeInvestigationLogStatus,
    normalizeTimelineCategoryForDisplay,
    LEGACY_MERGED_STATEMENTS_TIMELINE_CATEGORY,
    INVESTIGATION_AFFIDAVIT_TIMELINE_CATEGORY,
    isInvestigationNonPersonalCategory,
    isInvestigationPersonalDefendantCategory,
    isInvestigationTimelineCategory,
    isInvalidTimelineTitlePlaceholder,
    isTimelineNextDateInvalid,
    isValidJuvenileDetentionPlacement,
    juvenileDetentionPlacementLabel,
    normalizeDefendantStatusForJuvenileToggle,
    formatInvestigationDepositLocation,
    formatTrialCourtHeaderPrimary,
    resolveCourtDisplayName,
    resolveDefendantStatusCaseType,
    resolveDefendantStatusProceduralStage,
    syncStoredStageFromJourneyCaseStage,
    resolveInvestigationTimelineEventType,
    isInvestigationMergeBucket,
    resolveMergeComparisonStage,
    resolveMergeStageBucket,
    resolveMergeEligibilityStage,
    resolveOperationalCaseStage,
    resolveStageListLabel,
    resolveTimelineEventTitle,
} from './criminalStageUtils';
import {
    buildRequestFatalLockMessage,
    isLawyerRequestFinalStatus,
    isLawyerRequestLocked,
    isLawyerRequestPending,
    resolveLawyerRequestIsLocked,
} from './lawyerRequestStatusMachine';

describe('lawyer request status state machine', () => {
    it('isLawyerRequestPending only for unlocked pending requests', () => {
        expect(isLawyerRequestPending({ status: 'pending' })).toBe(true);
        expect(isLawyerRequestPending({ status: 'pending', isLocked: true })).toBe(false);
        expect(isLawyerRequestPending({ status: 'approved' })).toBe(false);
    });

    it('isLawyerRequestLocked respects isLocked and legacy decisionArchived', () => {
        expect(isLawyerRequestLocked({ status: 'approved', isLocked: true })).toBe(true);
        expect(isLawyerRequestLocked({ status: 'rejected', decisionArchived: true })).toBe(true);
        expect(isLawyerRequestLocked({ status: 'rejected' })).toBe(false);
    });

    it('buildRequestFatalLockMessage includes status label', () => {
        expect(buildRequestFatalLockMessage('approved')).toContain('تم القبول (موافقة)');
        expect(buildRequestFatalLockMessage('rejected')).toContain('تم الرفض');
        expect(buildRequestFatalLockMessage('approved')).toContain('تنبيه قانوني');
    });

    it('isLawyerRequestFinalStatus and resolveLawyerRequestIsLocked', () => {
        expect(isLawyerRequestFinalStatus('pending')).toBe(false);
        expect(isLawyerRequestFinalStatus('approved')).toBe(true);
        expect(resolveLawyerRequestIsLocked({ isLocked: true })).toBe(true);
        expect(resolveLawyerRequestIsLocked({ decisionArchived: true })).toBe(true);
    });
});

describe('investigation timeline categories and governance', () => {
    it('exposes exactly 4 Article 130 stage-closer decision labels', () => {
        expect(INVESTIGATION_ARTICLE_130_DECISIONS).toHaveLength(4);
        expect(INVESTIGATION_ARTICLE_130_DECISIONS.map((o) => o.label)).toEqual([
            'إحالة إلى محكمة الموضوع',
            'غلق الدعوى نهائياً',
            'غلق الدعوى مؤقتاً',
            'انقضاء / سقوط الدعوى الجزائية',
        ]);
    });

    it('exposes concise investigation-only dropdown options (8 after unified detention)', () => {
        expect(INVESTIGATION_TIMELINE_CATEGORIES).toHaveLength(8);
        expect(INVESTIGATION_TIMELINE_CATEGORIES.at(-1)).toBe(INVESTIGATION_TIMELINE_OTHER_CATEGORY);
    });

    it('recognizes only sanctioned investigation categories', () => {
        expect(isInvestigationTimelineCategory('تدوين أقوال المتهم')).toBe(true);
        expect(isInvestigationTimelineCategory('مخاطبة مراجع رسمية')).toBe(true);
        expect(isInvestigationTimelineCategory('إصدار أمر قبض/توقيف')).toBe(false);
    });

    it('resolveTimelineEventTitle falls back to category and rejects placeholder titles', () => {
        expect(resolveTimelineEventTitle('تدوين أقوال المتهم', '')).toBe('تدوين أقوال المتهم');
        expect(resolveTimelineEventTitle('تدوين أقوال المتهم', '!!!')).toBe('تدوين أقوال المتهم');
        expect(resolveTimelineEventTitle('تدوين أقوال المتهم', 'fff')).toBe('تدوين أقوال المتهم');
        expect(resolveTimelineEventTitle(INVESTIGATION_TIMELINE_OTHER_CATEGORY, 'مخاطبة أمنية')).toBe('مخاطبة أمنية');
    });

    it('normalizeTimelineCategoryForDisplay maps legacy merged affidavit label', () => {
        expect(normalizeTimelineCategoryForDisplay(LEGACY_MERGED_STATEMENTS_TIMELINE_CATEGORY)).toBe(
            INVESTIGATION_AFFIDAVIT_TIMELINE_CATEGORY,
        );
        expect(normalizeTimelineCategoryForDisplay('تدوين أقوال (مشتكي / شاهد / متهم)')).toBe(
            INVESTIGATION_AFFIDAVIT_TIMELINE_CATEGORY,
        );
    });

    it('isInvalidTimelineTitlePlaceholder flags empty and symbol-only titles', () => {
        expect(isInvalidTimelineTitlePlaceholder('')).toBe(true);
        expect(isInvalidTimelineTitlePlaceholder('???')).toBe(true);
        expect(isInvalidTimelineTitlePlaceholder('إفادة شاهد')).toBe(false);
    });

    it('isTimelineNextDateInvalid when next review precedes event date', () => {
        expect(isTimelineNextDateInvalid('2026-05-10', '2026-05-09')).toBe(true);
        expect(isTimelineNextDateInvalid('2026-05-10', '2026-05-10')).toBe(false);
        expect(isTimelineNextDateInvalid('2026-05-10', '2026-05-11')).toBe(false);
        expect(isTimelineNextDateInvalid('2026-05-10', '')).toBe(false);
    });

    it('resolveInvestigationTimelineEventType maps قرار categories to decision', () => {
        expect(resolveInvestigationTimelineEventType('قرار توقيف / تمديد توقيف')).toBe('decision');
        expect(resolveInvestigationTimelineEventType('تدوين إفادة (مشتكي / شاهد)')).toBe('investigation');
        expect(resolveInvestigationTimelineEventType('مخاطبة مراجع رسمية')).toBe('investigation');
    });

    it('splits personal defendant actions from non-personal investigation actions', () => {
        expect(isInvestigationPersonalDefendantCategory('طلب إخلاء سبيل بكفالة / بتعهد')).toBe(true);
        expect(isInvestigationNonPersonalCategory('مخاطبة مراجع رسمية')).toBe(true);
        expect(isInvestigationNonPersonalCategory('تدوين أقوال المتهم')).toBe(false);
    });

    it('isDetentionArrestCategory includes new investigation arrest wording', () => {
        expect(isDetentionArrestCategory('إصدار أمر (استقدام / قبض وتحري)')).toBe(true);
    });

    it('isInvestigationAffidavitTimelineCategory matches current and legacy labels', () => {
        expect(isInvestigationAffidavitTimelineCategory(INVESTIGATION_AFFIDAVIT_TIMELINE_CATEGORY)).toBe(true);
        expect(isInvestigationAffidavitTimelineCategory('تدوين إفادة (مشتكي / مخبر / شاهد)')).toBe(true);
    });

    it('buildConcernedParties merges complainants and defendants', () => {
        const parties = buildConcernedParties(
            [{ id: 'c1', fullName: 'أحمد' }],
            [{ id: 'd1', fullName: 'علي' }],
        );
        expect(parties).toHaveLength(2);
        expect(parties.map((p) => p.id).sort()).toEqual(['c1', 'd1']);
    });

    it('formatLawyerRequestStatusLabel returns Iraqi court-facing labels', () => {
        expect(formatLawyerRequestStatusLabel('pending')).toBe('قيد النظر');
        expect(formatLawyerRequestStatusLabel('approved')).toBe('تم القبول (موافقة)');
        expect(formatLawyerRequestStatusLabel('rejected')).toBe('تم الرفض');
    });

    it('isTimelineNextDateInvalid flags decision date before request date', () => {
        expect(isTimelineNextDateInvalid('2026-05-20', '2026-05-10')).toBe(true);
        expect(isTimelineNextDateInvalid('2026-05-20', '2026-05-20')).toBe(false);
        expect(isTimelineNextDateInvalid('2026-05-20', '2026-05-25')).toBe(false);
    });

    it('normalizeInvestigationLogStatus migrates legacy pending/completed', () => {
        expect(normalizeInvestigationLogStatus('pending')).toBe('awaiting_response');
        expect(normalizeInvestigationLogStatus('completed')).toBe('response_received');
        expect(formatInvestigationLogStatusLabel('returned_for_revision')).toBe('أُعيد للتعديل');
    });
});

describe('criminalStageUtils juvenile stage labels', () => {
    it('uses dedicated juvenile investigation/trial labels from stored stage', () => {
        expect(formatCriminalStageLabel('تحقيق الأحداث', false)).toBe('تحقيق - أحداث');
        expect(formatCriminalStageLabel('محكمة الأحداث', false)).toBe('محكمة - أحداث');
        expect(formatProceduralStageLabel('investigation', true)).toBe('مرحلة التحقيق');
        expect(formatProceduralStageLabel('juvenile_investigation', true)).toBe('تحقيق - أحداث');
    });

    it('keeps base labels when isJuvenile is false', () => {
        expect(formatCriminalStageLabel('مرحلة التحقيق', false)).toBe('مرحلة التحقيق');
        expect(formatCriminalStageLabel('محكمة الجنح', false)).toBe('محكمة الجنح');
    });

    it('resolveStageListLabel preserves stored stage labels', () => {
        expect(resolveStageListLabel('محكمة الجنايات', true)).toBe('محكمة الجنايات');
        expect(resolveStageListLabel('تحقيق الأحداث', true)).toBe('تحقيق - أحداث');
    });

    it('formatInvestigationDepositLocation merges entity type with name', () => {
        expect(
            formatInvestigationDepositLocation({
                investigationPapersAt: 'مركز شرطة',
                policeStationName: 'الجمهوري',
                investigationOfficeName: '',
                investigationCourtName: '',
            }),
        ).toBe('مركز شرطة الجمهوري');
    });

    it('formatTrialCourtHeaderPrimary combines stage label with court name', () => {
        expect(
            formatTrialCourtHeaderPrimary('misdemeanor', {
                courtName: 'محكمة جنح الكرخ',
                courtCaseNumber: '120/2026',
            }),
        ).toBe('محكمة جنح الكرخ');
        expect(
            formatTrialCourtHeaderPrimary('misdemeanor', {
                courtName: 'الكرخ',
                courtCaseNumber: '566565',
            }),
        ).toBe('محكمة الجنح — الكرخ');
    });

    it('formatTrialCourtHeaderPrimary does not embed case number in primary title', () => {
        expect(
            formatTrialCourtHeaderPrimary('misdemeanor', {
                courtName: '',
                courtCaseNumber: '566565',
            }),
        ).toBe('محكمة الجنح');
    });

    it('resolveCourtDisplayName prefers stored court name', () => {
        expect(
            resolveCourtDisplayName('محكمة الجنح', {
                hasJuvenileDefendant: true,
                storedCourtName: 'محكمة جنح الكرخ',
            }),
        ).toBe('محكمة جنح الكرخ');
    });

    it('resolveCourtDisplayName falls back to merged label when juvenile and no stored name', () => {
        expect(resolveCourtDisplayName('محكمة الجنح', { hasJuvenileDefendant: true })).toBe('محكمة الجنح');
    });

    it('maps juvenile detention placement labels', () => {
        expect(juvenileDetentionPlacementLabel('juvenile_observation')).toContain('دار ملاحظة الأحداث');
        expect(juvenileDetentionPlacementLabel('rehabilitation_school')).toContain('مدرسة تأهيل');
        expect(isValidJuvenileDetentionPlacement('juvenile_observation')).toBe(true);
        expect(isDetentionArrestCategory('إصدار أمر قبض/توقيف')).toBe(true);
    });
});

describe('defendant status triple filter (caseType × proceduralStage × isJuvenile)', () => {
    it('juvenile gets dedicated legal status options (not adult core list)', () => {
        const values = filterDefendantStatusOptions({
            caseType: 'felony',
            proceduralStage: 'trial',
            isJuvenile: true,
        });
        expect(values).toEqual([]);
        const opts = getDefendantStatusSelectOptions({
            isJuvenile: true,
            crimeType: 'جناية',
            stage: 'محكمة الجنايات',
        });
        expect(opts.map((o) => o.label)).toEqual([
            'حر',
            'مستقدم',
            'هارب',
            'موقوف (دار الملاحظة)',
            'مسلّم لوليه / لضامنه',
        ]);
        expect(opts.map((o) => o.value)).toEqual([
            'حر',
            'مستقدم',
            'هارب',
            'juvenile_detention',
            'provisional_delivery',
        ]);
        expect(opts.map((o) => o.value)).not.toContain('مكفل');
    });

    it('misdemeanor investigation adult: five statuses including حر and مستقدم', () => {
        const values = filterDefendantStatusOptions({
            caseType: 'misdemeanor',
            proceduralStage: 'investigation',
            isJuvenile: false,
        });
        expect(values).toEqual(['حر', 'مستقدم', 'هارب', 'موقوف', 'مكفل']);
    });

    it('misdemeanor trial adult: no حر or مستقدم', () => {
        const values = filterDefendantStatusOptions({
            caseType: 'misdemeanor',
            proceduralStage: 'trial',
            isJuvenile: false,
        });
        expect(values).toEqual(['موقوف', 'مكفل', 'هارب']);
        expect(values).not.toContain('حر');
        expect(values).not.toContain('مستقدم');
    });

    it('felony adult never shows حر or مستقدم in investigation or trial', () => {
        for (const proceduralStage of ['investigation', 'trial'] as const) {
            const values = filterDefendantStatusOptions({
                caseType: 'felony',
                proceduralStage,
                isJuvenile: false,
            });
            expect(values).toEqual(['موقوف', 'مكفل', 'هارب']);
            expect(values).not.toContain('حر');
            expect(values).not.toContain('مستقدم');
        }
    });

    it('syncStoredStageFromJourneyCaseStage preserves juvenile investigation/trial stored labels', () => {
        expect(
            syncStoredStageFromJourneyCaseStage('investigation', 'تحقيق الأحداث'),
        ).toBe('تحقيق الأحداث');
        expect(
            syncStoredStageFromJourneyCaseStage('investigation', 'مرحلة التحقيق'),
        ).toBe('مرحلة التحقيق');
        expect(syncStoredStageFromJourneyCaseStage('investigation', '')).toBe('مرحلة التحقيق');
        expect(syncStoredStageFromJourneyCaseStage('misdemeanor', 'محكمة الأحداث')).toBe(
            'محكمة الأحداث',
        );
        expect(syncStoredStageFromJourneyCaseStage('misdemeanor', 'محكمة الجنح')).toBe('محكمة الجنح');
    });

    it('resolves procedural stage from stored stage string', () => {
        expect(resolveDefendantStatusProceduralStage('مرحلة التحقيق')).toBe('investigation');
        expect(resolveDefendantStatusProceduralStage('تحقيق الأحداث')).toBe('investigation');
        expect(resolveDefendantStatusProceduralStage('')).toBe('investigation');
        expect(resolveDefendantStatusProceduralStage('محكمة الجنح')).toBe('trial');
        expect(caseStageFromStoredStage('محكمة الجنايات')).toBe('felony');
        expect(caseStageFromStoredStage('محكمة الجنح')).toBe('misdemeanor');
        expect(caseStageFromStoredStage('محكمة الأحداث')).toBe('misdemeanor');
        expect(caseStageFromStoredStage('تحقيق الأحداث')).toBe('investigation');
        expect(resolveDefendantStatusCaseType({ crimeType: 'جناية', stage: 'مرحلة التحقيق' })).toBe('felony');
        expect(resolveDefendantStatusCaseType({ crimeType: 'جنحة', stage: 'محكمة الجنح' })).toBe('misdemeanor');
    });

    it('formats juvenile-specific stored statuses with legal labels', () => {
        expect(formatDefendantStatusShortLabel('juvenile_detention')).toBe('موقوف (دار الملاحظة)');
        expect(formatDefendantStatusShortLabel('provisional_delivery')).toBe('مسلّم لوليه / لضامنه');
        expect(formatDefendantStatusLabel('provisional_delivery')).toContain('مسلّم');
    });

    it('normalizes status when toggling juvenile flag', () => {
        expect(normalizeDefendantStatusForJuvenileToggle('موقوف', true)).toBe('juvenile_detention');
        expect(normalizeDefendantStatusForJuvenileToggle('مكفل', true)).toBe('');
        expect(normalizeDefendantStatusForJuvenileToggle('juvenile_detention', false)).toBe('حر');
    });
});

describe('cross-complaint roster (شكوى متقابلة)', () => {
    it('isComplainantAlsoAccused: case-level OR per-complainant', () => {
        expect(
            isComplainantAlsoAccused({ isCrossComplaint: false }, { isMutualComplaint: false }),
        ).toBe(false);
        expect(
            isComplainantAlsoAccused({ isCrossComplaint: false }, { isMutualComplaint: true }),
        ).toBe(true);
        expect(
            isComplainantAlsoAccused({ isCrossComplaint: true }, { isMutualComplaint: false }),
        ).toBe(true);
        expect(isComplainantAlsoAccused({}, {})).toBe(false);
    });

    it('buildCriminalActionParties: per-complainant flag includes only marked complainants', () => {
        const complainants = [
            { id: 'c1', fullName: 'مشتكي عادي' },
            { id: 'c2', fullName: 'مشتكي متقابل', isCrossComplaint: true },
        ];
        const defendants = [{ id: 'd1', fullName: 'متهم' }];
        const result = buildCriminalActionParties(complainants, defendants, false);
        // 🛡️ المشتكي العادي خارج القائمة (ليس متهماً)؛ المشتكي المتقابل داخلها.
        expect(result.map((p) => p.id).sort()).toEqual(['c2', 'd1']);
        const c2 = result.find((p) => p.id === 'c2');
        expect(c2?.source).toBe('complainant');
    });

    it('buildCriminalActionParties: case-level isMutualComplaint includes ALL complainants', () => {
        const complainants = [
            { id: 'c1', fullName: 'م1' },
            { id: 'c2', fullName: 'م2' },
        ];
        const defendants = [{ id: 'd1', fullName: 'متهم' }];
        const result = buildCriminalActionParties(complainants, defendants, true);
        expect(result.map((p) => p.id).sort()).toEqual(['c1', 'c2', 'd1']);
    });

    it('buildCriminalActionParties: no flags → defendants only', () => {
        const complainants = [{ id: 'c1', fullName: 'مشتكي' }];
        const defendants = [{ id: 'd1', fullName: 'متهم' }];
        const result = buildCriminalActionParties(complainants, defendants, false);
        expect(result.map((p) => p.id)).toEqual(['d1']);
    });

    it('resolveOperationalCaseStage prefers reopened investigation over stale trial journey node', () => {
        expect(
            resolveOperationalCaseStage({
                caseStage: 'investigation',
                isInvestigationLocked: false,
                basics: { stage: 'مرحلة التحقيق' },
                stageJourney: [{ id: '1', stage: 'felony', label: 'محكمة الجنايات', status: 'current' }],
            }),
        ).toBe('investigation');
    });

    it('resolveOperationalCaseStage keeps locked trial stage from journey', () => {
        expect(
            resolveOperationalCaseStage({
                caseStage: 'misdemeanor',
                isInvestigationLocked: true,
                basics: { stage: 'محكمة الجنح' },
                stageJourney: [{ id: '1', stage: 'misdemeanor', label: 'محكمة الجنح', status: 'current' }],
            }),
        ).toBe('misdemeanor');
    });

    it('resolveMergeStageBucket keeps juvenile and adult investigation separate', () => {
        expect(resolveMergeStageBucket({ basics: { stage: 'مرحلة التحقيق' } })).toBe('investigation');
        expect(resolveMergeStageBucket({ basics: { stage: 'تحقيق الأحداث' } })).toBe('juvenile_investigation');
        expect(resolveMergeStageBucket({ basics: { stage: 'محكمة الأحداث' } })).toBe('juvenile_trial');
        expect(resolveMergeStageBucket({ basics: { stage: 'محكمة الجنح' } })).toBe('misdemeanor');
    });

    it('resolveMergeComparisonStage aligns investigation dossiers with vault labels', () => {
        const lockedStaleJourney = {
            caseStage: 'felony' as const,
            isInvestigationLocked: true,
            basics: { stage: 'مرحلة التحقيق' },
            stageJourney: [{ id: '1', stage: 'felony' as const, status: 'current' as const }],
        };
        expect(isInvestigationMergeBucket(lockedStaleJourney)).toBe(true);
        expect(resolveMergeComparisonStage(lockedStaleJourney)).toBe('investigation');
        expect(resolveMergeComparisonStage({ basics: { stage: 'تحقيق الأحداث' } })).toBe('investigation');
        expect(
            isInvestigationMergeBucket({
                location: { investigationCourtName: 'محكمة تحقيق الديوانية' },
            }),
        ).toBe(true);
        expect(
            resolveMergeComparisonStage({
                basics: { stage: 'محكمة الجنح' },
                caseStage: 'misdemeanor',
            }),
        ).toBe('misdemeanor');
    });

    it('resolveMergeEligibilityStage treats investigation stored stage as investigation when unlocked', () => {
        expect(
            resolveMergeEligibilityStage({
                caseStage: 'felony',
                isInvestigationLocked: false,
                basics: { stage: 'مرحلة التحقيق' },
                stageJourney: [{ id: '1', stage: 'felony', label: 'محكمة الجنايات', status: 'current' }],
            }),
        ).toBe('investigation');
        expect(
            resolveMergeEligibilityStage({
                caseStage: 'felony',
                isInvestigationLocked: true,
                basics: { stage: 'مرحلة التحقيق' },
                stageJourney: [{ id: '1', stage: 'felony', label: 'محكمة الجنايات', status: 'current' }],
            }),
        ).toBe('felony');
        expect(
            resolveMergeEligibilityStage({
                caseStage: 'investigation',
                basics: { stage: 'محكمة الجnaيات' },
                stageJourney: [
                    { id: '1', stage: 'misdemeanor', status: 'past' },
                    { id: '2', stage: 'investigation', status: 'current' },
                ],
            }),
        ).toBe('investigation');
        expect(
            resolveMergeEligibilityStage({
                caseStage: 'investigation',
                isInvestigationLocked: true,
                basics: { stage: 'مرحلة التحقيق' },
                stageJourney: [{ id: '1', stage: 'felony', label: 'محكمة الجنايات', status: 'current' }],
            }),
        ).toBe('investigation');
    });
});
