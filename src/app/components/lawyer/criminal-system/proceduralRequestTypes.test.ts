import { describe, expect, it } from 'vitest';
import type { JudicialDecision } from '@/app/types/criminal';
import {
    COMPLAINT_COURT_REFERRAL_TEMPLATE,
    SUMMON_ORDER_TEMPLATE,
    ARREST_ORDER_TEMPLATE,
    ARREST_SUMMON_TEMPLATE,
    CASSATION_APPEALABLE_PREPARATORY_TEMPLATES,
    CUSTOM_JUDICIAL_DECISION_TYPE,
    CUSTOM_LAWYER_MOTION_TYPE,
    DETENTION_DECISION_TEMPLATE,
    JUDICIAL_DECISION_TEMPLATES,
    judicialDecisionModalTemplates,
    lawyerMotionModalTemplates,
    LAWYER_MOTION_DROPDOWN_TEMPLATES,
    isDecisionCassationAppealable,
    isDetentionDecisionTemplate,
    resolveRequestEntryLane,
    resolveStoredRequestTypeFields,
    resolveOrderEnforcementKindFromTemplate,
} from './proceduralRequestTypes';
import { canOpenCassationAppealModal } from './judicialDecisionsEngine';

function baseDecision(partial: Partial<JudicialDecision>): JudicialDecision {
    return {
        id: 'jd1',
        issuedAt: '2026-05-01',
        title: 'قرار',
        summary: '—',
        decisionType: 'preparatory',
        appeals: [],
        isLocked: true,
        ...partial,
    };
}

describe('proceduralRequestTypes / cassation appealability', () => {
    it('stores custom lawyer motion with isAppealable flag', () => {
        const stored = resolveStoredRequestTypeFields(CUSTOM_LAWYER_MOTION_TYPE, 'طلب خاص', true);
        expect(stored.type).toBe('طلب خاص');
        expect(stored.proceduralTemplate).toBe(CUSTOM_LAWYER_MOTION_TYPE);
        expect(stored.isAppealable).toBe(true);
    });

    it('stores custom judicial decision with isAppealable flag', () => {
        const stored = resolveStoredRequestTypeFields(CUSTOM_JUDICIAL_DECISION_TYPE, 'تأجيل خاص', true);
        expect(stored.type).toBe('تأجيل خاص');
        expect(stored.proceduralTemplate).toBe(CUSTOM_JUDICIAL_DECISION_TYPE);
        expect(stored.isAppealable).toBe(true);
    });

    it('complaint court referral is not in the cassation whitelist anymore', () => {
        // قائمة بيضاء صارمة جديدة — إحالة الشكوى لا تظهر عليها ايقونة الطعن.
        const stored = resolveStoredRequestTypeFields(COMPLAINT_COURT_REFERRAL_TEMPLATE, '', false);
        expect(stored.isAppealable).toBeUndefined();
        const d = baseDecision({
            title: COMPLAINT_COURT_REFERRAL_TEMPLATE,
            proceduralTemplate: COMPLAINT_COURT_REFERRAL_TEMPLATE,
        });
        expect(isDecisionCassationAppealable(d)).toBe(false);
        expect(CASSATION_APPEALABLE_PREPARATORY_TEMPLATES.has(COMPLAINT_COURT_REFERRAL_TEMPLATE)).toBe(false);
    });

    it('resolveRequestEntryLane splits judicial and lawyer containers', () => {
        expect(resolveRequestEntryLane(SUMMON_ORDER_TEMPLATE)).toBe('judicial');
        expect(resolveRequestEntryLane(CUSTOM_JUDICIAL_DECISION_TYPE)).toBe('judicial');
        expect(resolveRequestEntryLane(CUSTOM_LAWYER_MOTION_TYPE)).toBe('lawyer');
    });

    it('stores legacy custom procedural alias as lawyer motion', () => {
        const stored = resolveStoredRequestTypeFields(CUSTOM_LAWYER_MOTION_TYPE, 'تأجيل خاص', true);
        expect(stored.type).toBe('تأجيل خاص');
        expect(stored.isAppealable).toBe(true);
    });

    it('dispositive decisions are always appealable in UI', () => {
        const d = baseDecision({ decisionType: 'dispositive', title: 'إفراج نهائي' });
        expect(isDecisionCassationAppealable(d)).toBe(true);
        expect(canOpenCassationAppealModal(d)).toBe(true);
    });

    it('allows preparatory detention and bail for cassation', () => {
        for (const title of CASSATION_APPEALABLE_PREPARATORY_TEMPLATES) {
            const d = baseDecision({ title, proceduralTemplate: title });
            expect(isDecisionCassationAppealable(d)).toBe(true);
        }
    });

    it('excludes summon and arrest orders from cassation appeal', () => {
        for (const title of [SUMMON_ORDER_TEMPLATE, ARREST_ORDER_TEMPLATE]) {
            const d = baseDecision({ title, proceduralTemplate: title });
            expect(isDecisionCassationAppealable(d)).toBe(false);
            expect(canOpenCassationAppealModal(d)).toBe(false);
        }
    });

    it('migrates legacy templates to canonical judicial options', () => {
        const stored = resolveStoredRequestTypeFields('إصدار أمر استقدام / قبض', '', false);
        expect(stored.proceduralTemplate).toBe('إصدار أمر (استقدام / قبض وتحري)');
    });

    it('exposes separate summon and arrest judicial templates', () => {
        expect(JUDICIAL_DECISION_TEMPLATES).toContain(SUMMON_ORDER_TEMPLATE);
        expect(JUDICIAL_DECISION_TEMPLATES).toContain(ARREST_ORDER_TEMPLATE);
        expect(JUDICIAL_DECISION_TEMPLATES).not.toContain(ARREST_SUMMON_TEMPLATE);
        expect(resolveOrderEnforcementKindFromTemplate(SUMMON_ORDER_TEMPLATE)).toBe('summons');
        expect(resolveOrderEnforcementKindFromTemplate(ARREST_ORDER_TEMPLATE)).toBe('arrest');
    });

    it('exposes single unified detention judicial template', () => {
        expect(JUDICIAL_DECISION_TEMPLATES).toContain(DETENTION_DECISION_TEMPLATE);
        expect(JUDICIAL_DECISION_TEMPLATES.filter((t) => isDetentionDecisionTemplate(t)).length).toBe(1);
        expect(isDetentionDecisionTemplate('قرار توقيف ابتداءً')).toBe(true);
    });

    it('migrates legacy bail wording to طلب إخلاء سبيل', () => {
        const stored = resolveStoredRequestTypeFields('قرار إخلاء سبيل بكفالة / بتعهد', '', false);
        expect(stored.proceduralTemplate).toBe('طلب إخلاء سبيل بكفالة / بتعهد');
        expect(stored.type).toBe('طلب إخلاء سبيل بكفالة / بتعهد');
    });

    it('limits judicial modal templates to manual entry in trial court', () => {
        // الافتراضي يستثني قالب «حجز الأموال» — لا يَظهر إلا حين يوجد متهم هارب.
        expect(judicialDecisionModalTemplates(false)).toEqual(
            JUDICIAL_DECISION_TEMPLATES.filter((t) => t !== 'حجز الأموال'),
        );
        expect(judicialDecisionModalTemplates(true)).toEqual([CUSTOM_JUDICIAL_DECISION_TYPE]);
        // عند تمرير `includeAssetSeizure` يُحقن قالب «حجز الأموال» في القائمة.
        expect(judicialDecisionModalTemplates(false, { includeAssetSeizure: true })).toEqual(
            JUDICIAL_DECISION_TEMPLATES,
        );
        expect(judicialDecisionModalTemplates(true, { includeAssetSeizure: true })).toEqual([
            'حجز الأموال',
            CUSTOM_JUDICIAL_DECISION_TYPE,
        ]);
    });

    it('limits lawyer motion modal templates to manual entry in trial court', () => {
        expect(lawyerMotionModalTemplates(false)).toEqual(LAWYER_MOTION_DROPDOWN_TEMPLATES);
        expect(lawyerMotionModalTemplates(true)).toEqual([CUSTOM_LAWYER_MOTION_TYPE]);
        expect(lawyerMotionModalTemplates(false, { isAllDefendantsUnknown: true })).toEqual([
            CUSTOM_LAWYER_MOTION_TYPE,
        ]);
    });

    it('limits judicial templates when all defendants are unknown', () => {
        const templates = judicialDecisionModalTemplates(false, {
            isInvestigationPhase: true,
            isAllDefendantsUnknown: true,
        });
        expect(templates).toEqual([
            'غلق الدعوى مؤقتاً (مادة 130)',
            'غلق نهائي موضوعي (مادة 130)',
            CUSTOM_JUDICIAL_DECISION_TYPE,
        ]);
        expect(templates).not.toContain('غلق نهائي شخصي (مادة 130)');
        expect(templates).not.toContain('تفريق وشطر الإضبارة (قرار قضائي)');
    });

    it('never exposes severance in judicial decision templates', () => {
        const templates = judicialDecisionModalTemplates(false, {
            isInvestigationPhase: true,
            isAllDefendantsUnknown: false,
        });
        expect(templates).not.toContain('تفريق وشطر الإضبارة (قرار قضائي)');
        expect(templates).toContain('غلق الدعوى مؤقتاً (مادة 130)');
        expect(templates).toContain('غلق نهائي موضوعي (مادة 130)');
        expect(templates).toContain('غلق نهائي شخصي (مادة 130)');
    });

    it('does not limit judicial templates when unknown is mixed with identified defendants', () => {
        const templates = judicialDecisionModalTemplates(false, {
            isInvestigationPhase: true,
            isAllDefendantsUnknown: false,
        });
        expect(templates.length).toBeGreaterThan(3);
        expect(templates).toContain('غلق الدعوى مؤقتاً (مادة 130)');
        expect(templates).not.toContain('تفريق وشطر الإضبارة (قرار قضائي)');
    });

    it('filters judicial template groups by defendants party mix', async () => {
        const { buildInvestigationJudicialTemplateGroups } = await import('./juvenileInvestigationRules');
        const {
            DETENTION_DECISION_TEMPLATE,
            DEFENDANT_BAIL_TEMPLATE,
            JUVENILE_OBSERVATION_HOME_DECISION_TEMPLATE,
        } = await import('./proceduralRequestTypes');
        const baseOpts = { isInvestigationPhase: true, isAllDefendantsUnknown: false };
        const adultsOnly = buildInvestigationJudicialTemplateGroups(false, {
            ...baseOpts,
            defendantsPartyMix: 'adults_only',
        });
        expect(adultsOnly.common.length).toBeGreaterThan(0);
        expect(adultsOnly.adult.length).toBeGreaterThan(0);
        expect(adultsOnly.juvenile).toEqual([]);
        expect(adultsOnly.common).toContain(SUMMON_ORDER_TEMPLATE);
        expect(adultsOnly.common).toContain(ARREST_ORDER_TEMPLATE);
        expect(adultsOnly.adult).toContain(DETENTION_DECISION_TEMPLATE);
        expect(adultsOnly.adult).toContain(DEFENDANT_BAIL_TEMPLATE);

        const juvenilesOnly = buildInvestigationJudicialTemplateGroups(false, {
            ...baseOpts,
            defendantsPartyMix: 'juveniles_only',
        });
        expect(juvenilesOnly.adult).toEqual([]);
        expect(juvenilesOnly.juvenile.length).toBe(3);
        expect(juvenilesOnly.common).toContain('قرار قضائي مخصص (إدخال يدوي)');
        expect(juvenilesOnly.common).toContain('غلق الدعوى مؤقتاً (مادة 130)');
        expect(juvenilesOnly.common).toContain('قرار قضائي: صلح وتنازل عن الحق الشخصي');
        expect(juvenilesOnly.juvenile).toContain(JUVENILE_OBSERVATION_HOME_DECISION_TEMPLATE);

        const mixed = buildInvestigationJudicialTemplateGroups(false, {
            ...baseOpts,
            defendantsPartyMix: 'mixed',
        });
        expect(mixed.common.length).toBeGreaterThan(0);
        expect(mixed.adult.length).toBeGreaterThan(0);
        expect(mixed.juvenile.length).toBe(3);
        expect(mixed.common).toContain(SUMMON_ORDER_TEMPLATE);
        expect(mixed.common).toContain(ARREST_ORDER_TEMPLATE);
        expect(mixed.common).toContain('غلق الدعوى مؤقتاً (مادة 130)');
        expect(mixed.adult).toContain(DETENTION_DECISION_TEMPLATE);
        expect(mixed.juvenile).not.toContain(SUMMON_ORDER_TEMPLATE);
        expect(mixed.juvenile).not.toContain('غلق الدعوى مؤقتاً (مادة 130)');
    });

    it('resolves investigation judicial entry scope for shared order templates', async () => {
        const {
            encodeInvestigationJudicialSelectValue,
            decodeInvestigationJudicialSelectValue,
            resolveInvestigationJudicialEntryScope,
        } = await import('./juvenileInvestigationRules');

        expect(
            resolveInvestigationJudicialEntryScope(SUMMON_ORDER_TEMPLATE, null, 'adults_only'),
        ).toBe('adult');
        expect(
            resolveInvestigationJudicialEntryScope(SUMMON_ORDER_TEMPLATE, null, 'juveniles_only'),
        ).toBe('juvenile');
        expect(
            resolveInvestigationJudicialEntryScope(SUMMON_ORDER_TEMPLATE, 'adult', 'mixed'),
        ).toBe('adult');
        expect(
            resolveInvestigationJudicialEntryScope(SUMMON_ORDER_TEMPLATE, 'juvenile', 'mixed'),
        ).toBe('juvenile');

        const encoded = encodeInvestigationJudicialSelectValue(
            SUMMON_ORDER_TEMPLATE,
            'adult',
            'mixed',
        );
        expect(decodeInvestigationJudicialSelectValue(encoded)).toEqual({
            template: SUMMON_ORDER_TEMPLATE,
            groupScope: 'adult',
        });
        expect(
            encodeInvestigationJudicialSelectValue(SUMMON_ORDER_TEMPLATE, 'adult', 'adults_only'),
        ).toBe(SUMMON_ORDER_TEMPLATE);
    });

    it('formats judicial labels and resolves stored decision party scope', async () => {
        const {
            formatJudicialDisplayWithPartyScope,
            resolveStoredJudicialDecisionPartyScope,
        } = await import('./juvenileInvestigationRules');

        expect(formatJudicialDisplayWithPartyScope(SUMMON_ORDER_TEMPLATE, 'adult')).toBe(
            'إصدار أمر استقدام (بالغ)',
        );
        expect(formatJudicialDisplayWithPartyScope(SUMMON_ORDER_TEMPLATE, 'juvenile')).toBe(
            'إصدار أمر استقدام (حدث)',
        );

        const adultDecision = {
            id: 'd1',
            title: SUMMON_ORDER_TEMPLATE,
            proceduralTemplate: SUMMON_ORDER_TEMPLATE,
            defendantIds: ['a1'],
            issuedAt: '2026-01-01',
        };
        const defs = [
            { id: 'a1', isJuvenile: false },
            { id: 'j1', isJuvenile: true },
        ];
        expect(resolveStoredJudicialDecisionPartyScope(adultDecision as any, defs, 'mixed')).toBe(
            'adult',
        );
        expect(
            resolveStoredJudicialDecisionPartyScope(
                { ...adultDecision, defendantIds: ['j1'] } as any,
                defs,
                'mixed',
            ),
        ).toBe('juvenile');
    });

    it('formats mixed investigation party scope notice with defendant names', async () => {
        const { formatJudicialPartyScopeNoticeMessage } = await import('./juvenileInvestigationRules');
        expect(formatJudicialPartyScopeNoticeMessage('adult', ['أحمد علي'])).toBe(
            'هذا القرار يخص المتهم البالغ (أحمد علي)',
        );
        expect(formatJudicialPartyScopeNoticeMessage('juvenile', ['سارة محمد'])).toBe(
            'هذا القرار يخص الحدث (سارة محمد)',
        );
        expect(formatJudicialPartyScopeNoticeMessage('adult', ['أحمد', 'كريم'])).toBe(
            'هذا القرار يخص المتهمين البالغين (أحمد، كريم)',
        );
        expect(formatJudicialPartyScopeNoticeMessage('juvenile', ['سارة', 'ليلى'])).toBe(
            'هذا القرار يخص الأحداث (سارة، ليلى)',
        );
    });

    it('excludes juvenile-judge-only templates from the adult investigation list', () => {
        const templates = judicialDecisionModalTemplates(false, {
            isInvestigationPhase: true,
            hasJuvenileDefendant: true,
        });
        expect(templates).not.toContain('إحالة إلى مكتب البحث الاجتماعي');
        expect(templates).not.toContain('قرار إيداع دار الملاحظة');
        expect(templates).not.toContain('تسليم الحدث لوليه بتعهد');
        expect(templates).toContain(SUMMON_ORDER_TEMPLATE);
        expect(templates).toContain(ARREST_ORDER_TEMPLATE);
    });

    it('custom judicial appealability follows isAppealable flag; lawyer motions stay appealable', () => {
        const lawyer = baseDecision({
            title: 'طلب خاص',
            proceduralTemplate: CUSTOM_LAWYER_MOTION_TYPE,
            isAppealable: false,
        });
        const judicialOff = baseDecision({
            title: 'قرار خاص',
            proceduralTemplate: CUSTOM_JUDICIAL_DECISION_TYPE,
            isAppealable: false,
        });
        const judicialOn = baseDecision({
            title: 'قرار خاص',
            proceduralTemplate: CUSTOM_JUDICIAL_DECISION_TYPE,
            isAppealable: true,
        });
        expect(isDecisionCassationAppealable(lawyer)).toBe(true);
        expect(isDecisionCassationAppealable(judicialOff)).toBe(false);
        expect(isDecisionCassationAppealable(judicialOn)).toBe(true);
        expect(canOpenCassationAppealModal(judicialOff)).toBe(false);
        expect(canOpenCassationAppealModal(judicialOn)).toBe(true);
    });

    it('asset seizure and defendant bail are cassation-appealable preparatory templates', () => {
        for (const tpl of ['حجز الأموال', 'تكفيل المتهم']) {
            const d = baseDecision({ title: tpl, proceduralTemplate: tpl });
            expect(isDecisionCassationAppealable(d)).toBe(true);
        }
    });

    it('juvenile judge: only observation home and guardian delivery are auto cassation-appealable', () => {
        for (const tpl of [
            'قرار إيداع دار الملاحظة',
            'تسليم الحدث لوليه بتعهد',
        ]) {
            const stored = resolveStoredRequestTypeFields(tpl, '', false);
            expect(stored.isAppealable).toBe(true);
            expect(isDecisionCassationAppealable(baseDecision({ title: tpl, proceduralTemplate: tpl }))).toBe(
                true,
            );
        }
        for (const tpl of ['إحالة إلى مكتب البحث الاجتماعي', 'أمر تكليف بالحضور', 'أمر قبض']) {
            expect(
                isDecisionCassationAppealable(baseDecision({ title: tpl, proceduralTemplate: tpl })),
            ).toBe(false);
        }
    });
});
