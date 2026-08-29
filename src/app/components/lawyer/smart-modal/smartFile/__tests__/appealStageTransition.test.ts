import { describe, expect, it } from 'vitest';
import type { CaseStage, Party } from '../../../LawyerShared';
import {
    applyAppealStageTransition,
    applyCassationRemand,
    applyCorrectionComplete,
    applyCorrectionRejected,
    flipPartiesForAppealStage,
    migrateAppealIncidentalCases,
    normalizeLegacyCassationRemandStages,
    resolveAppealStageName,
    resolveCassationRemandTarget,
    resolveOpponentAsAppellant,
    shouldShowFirstInstanceIncidentalUi,
} from '../appealStageTransition';
import { shouldShowOpponentAppealRegisterButton } from '../judgmentTypes';

const baseParties: Party[] = [
    { id: 1, name: 'أحمد الموكل', role: 'المدعي', isClient: true, side: 'right' },
    { id: 2, name: 'علي الخصم', role: 'المدعى عليه', isClient: false, side: 'left' },
];

const baseStage = {
    id: 'stage_1',
    name: 'البداءة',
    stageName: 'البداءة',
    status: 'active',
    caseNo: '10/2026',
    court: 'كرخ',
    parties: baseParties,
    timeline: [
        {
            id: 'note_1',
            type: 'note' as const,
            date: '2026-01-01',
            title: 'ملاحظة مهمة',
            details: 'نص الملاحظة',
        },
        {
            id: 'dec_1',
            type: 'decision' as const,
            date: '2026-02-01',
            title: 'حكم',
            details: 'قرار',
        },
    ],
    attachments: [{ id: 'att_1', attachedProperty: 'سند', status: 'فعّال' }],
    incidentalCases: [
        {
            id: 'inc_1',
            type: 'counter' as const,
            partyName: 'دعوى متقابلة',
            date: '2026-01-15',
            status: 'active' as const,
            linkedFileId: 99,
            linkedCaseNo: '20/2026',
        },
        {
            id: 'inc_2',
            type: 'thirdParty' as const,
            partyName: 'خالد',
            date: '2026-01-20',
            status: 'active' as const,
            thirdPartyEntryMode: 'selfClaim' as const,
        },
    ],
    isPleadingsClosed: true,
    awaitingOpponentAppeal: true,
    finalDecision: 'محسومة لصالح الموكل - بانتظار الطعن',
} as unknown as CaseStage;

describe('appealStageTransition', () => {
    it('maps استئناف to الاستئناف on civil absent-objection stage with بداءة history', () => {
        const stages = [
            { stageName: 'بداءة بدرجة أولى' },
            { stageName: 'الاعتراض على الحكم الغيابي' },
        ];
        expect(
            resolveAppealStageName('استئناف', {
                sourceStageName: 'الاعتراض على الحكم الغيابي',
                stages,
            }),
        ).toBe('الاستئناف');
    });

    it('maps استئناف to تمييز on personal-status dossier objection stage', () => {
        expect(
            resolveAppealStageName('استئناف', {
                sourceStageName: 'اعتراض على الحكم الغيابي',
                file: { lawsuitJurisdiction: 'personal' },
            }),
        ).toBe('تمييز');
    });

    it('flips plaintiff to appellee when defendant appeals', () => {
        const flipped = flipPartiesForAppealStage(baseParties, 'المدعى عليه', 'استئناف');
        expect(flipped[0]?.role).toContain('المستأنف عليه');
        expect(flipped[0]?.name).toBe('أحمد الموكل');
        expect(flipped[0]?.side).toBe('left');
        expect(flipped[1]?.role).toContain('المستأنف');
        expect(flipped[1]?.name).toBe('علي الخصم');
        expect(flipped[1]?.side).toBe('right');
    });

    it('resolves opponent appellant from lawyer side', () => {
        expect(resolveOpponentAsAppellant('المدعي', [])).toBe('المدعى عليه');
        expect(resolveOpponentAsAppellant('المدعى عليه', [])).toBe('المدعي');
        expect(resolveOpponentAsAppellant('المدعي', baseParties)).toBe('المدعى عليه');
    });

    it('resolves opponent appellant on absent objection from original sides', () => {
        const objectionParties: Party[] = [
            {
                id: 1,
                name: 'موكل',
                role: 'المعترض عليه بالحكم الغيابي (المدعي)',
                isClient: true,
                side: 'left',
            },
            {
                id: 2,
                name: 'خصم',
                role: 'المعترض على الحكم الغيابي (المدعى عليه)',
                isClient: false,
                side: 'right',
            },
        ];
        expect(resolveOpponentAsAppellant(null, objectionParties)).toBe('المدعى عليه');

        const flipped = flipPartiesForAppealStage(
            objectionParties,
            resolveOpponentAsAppellant(null, objectionParties),
            'استئناف',
        );
        expect(flipped.find((p) => p.id === 1)?.role).toContain('المستأنف عليه');
        expect(flipped.find((p) => p.id === 2)?.role).toContain('المستأنف');
    });

    it('locks previous stage with clean appeal timeline and no counterclaim carryover', () => {
        const { updatedStages, newActiveIndex } = applyAppealStageTransition(
            [baseStage],
            0,
            baseStage,
            {
                appealType: 'استئناف',
                appellant: 'المدعى عليه',
                filingDate: '2026-03-01',
                newCaseNumber: '55/س/2026',
                newCourt: 'استئناف بغداد',
            },
        );

        expect(updatedStages).toHaveLength(2);
        expect(newActiveIndex).toBe(1);
        expect(updatedStages[0]?.status).toBe('locked');
        expect(updatedStages[0]?.awaitingOpponentAppeal).toBe(false);

        const next = updatedStages[1]!;
        expect(next.stageName).toBe('الاستئناف');
        expect(next.isPleadingsClosed).toBe(false);
        expect(next.timeline).toHaveLength(1);
        expect(next.timeline?.[0]?.title).toContain('فتح إضبارة');
        expect(next.timeline?.some((e) => e.title === 'ملاحظة مهمة')).toBe(false);
        expect(next.attachments).toHaveLength(1);
        expect(next.incidentalCases?.some((c) => c.type === 'counter')).toBe(false);
        expect(next.incidentalCases?.some((c) => c.type === 'joinder_appeal')).toBe(true);
    });

    it('leaves absent-objection case number empty when not entered', () => {
        const firstInstance = { ...baseStage, caseNo: '111/ب/2026' } as CaseStage;
        const { updatedStages } = applyAppealStageTransition([firstInstance], 0, firstInstance, {
            appealType: 'اعتراض على الحكم الغيابي',
            appellant: 'المدعى عليه',
            filingDate: '2026-03-01',
            newCaseNumber: '',
        });
        expect(updatedStages[1]?.caseNo).toBe('');
        expect(updatedStages[1]?.isUnderObjection).toBe(true);
    });

    it('keeps an entered absent-objection case number', () => {
        const firstInstance = { ...baseStage, caseNo: '111/ب/2026' } as CaseStage;
        const { updatedStages } = applyAppealStageTransition([firstInstance], 0, firstInstance, {
            appealType: 'اعتراض على الحكم الغيابي',
            appellant: 'المدعى عليه',
            filingDate: '2026-03-01',
            newCaseNumber: '111/ب/اعتراضية/2026',
        });
        expect(updatedStages[1]?.caseNo).toBe('111/ب/اعتراضية/2026');
    });

    it('hides opponent appeal button on locked or appeal stages', () => {
        expect(
            shouldShowOpponentAppealRegisterButton(
                { ...baseStage, status: 'locked', stageName: 'البداءة' },
                'بانتظار الطعن',
            ),
        ).toBe(false);
        expect(
            shouldShowOpponentAppealRegisterButton(
                { isPleadingsClosed: true, stageName: 'الاستئناف', status: 'active' },
                'نشطة',
            ),
        ).toBe(false);
    });

    it('shows incidental UI only on open first instance', () => {
        expect(shouldShowFirstInstanceIncidentalUi('البداءة', false)).toBe(true);
        expect(shouldShowFirstInstanceIncidentalUi('الاستئناف', false)).toBe(false);
        expect(shouldShowFirstInstanceIncidentalUi('البداءة', true)).toBe(false);
    });

    it('migrates only third party incidental cases', () => {
        const migrated = migrateAppealIncidentalCases(baseStage.incidentalCases);
        expect(migrated).toHaveLength(1);
        expect(migrated[0]?.type).toBe('joinder_appeal');
    });

    it('remands direct cassation to first instance when no prior appeal exists', () => {
        const firstInstance = {
            ...baseStage,
            id: 'stage_first',
            stageName: 'البداءة',
            status: 'completed',
            parties: baseParties,
        } as CaseStage;
        const cassation = {
            ...baseStage,
            id: 'stage_cass',
            stageName: 'التمييز',
            status: 'active',
            parties: [
                { id: 1, name: 'أحمد', role: 'المميز', isClient: true, side: 'right' },
                { id: 2, name: 'علي', role: 'المميز عليه', isClient: false, side: 'left' },
            ],
        } as CaseStage;
        const stages = [firstInstance, cassation];

        const target = resolveCassationRemandTarget(stages, 1);
        expect(target.remandLayer).toBe('first_instance');
        expect(target.stageName).toBe('البداءة');
        expect(target.sourceStageIndex).toBe(0);

        const { updatedStages, newActiveIndex } = applyCassationRemand(stages, 1);
        expect(updatedStages).toHaveLength(2);
        expect(newActiveIndex).toBe(0);
        expect(updatedStages[0]?.stageName).toBe('البداءة');
        expect(updatedStages[0]?.status).toBe('active');
        expect(updatedStages[0]?.wasReopened).toBe(true);
        expect(updatedStages[0]?.timeline?.length).toBeGreaterThan(0);
        expect(updatedStages[0]?.parties?.[0]?.role).toBe('المدعي');
        expect(updatedStages[1]?.status).toBe('completed');
    });

    it('remands cassation to appeal when appeal stage existed before cassation', () => {
        const firstInstance = {
            ...baseStage,
            id: 'stage_first',
            stageName: 'البداءة',
            status: 'completed',
        } as CaseStage;
        const appealTimeline = [{ id: 'ev1', type: 'session', date: '2026-01-01', title: 'جلسة' }];
        const appeal = {
            ...baseStage,
            id: 'stage_appeal',
            stageName: 'الاستئناف',
            status: 'locked',
            caseNo: '50/2026',
            court: 'استئناف بغداد',
            timeline: appealTimeline,
        } as CaseStage;
        const cassation = {
            ...baseStage,
            id: 'stage_cass',
            stageName: 'التمييز',
            status: 'active',
        } as CaseStage;
        const stages = [firstInstance, appeal, cassation];

        const target = resolveCassationRemandTarget(stages, 2);
        expect(target.remandLayer).toBe('appeal');
        expect(target.stageName).toBe('الاستئناف');
        expect(target.sourceStageIndex).toBe(1);

        const { updatedStages, newActiveIndex } = applyCassationRemand(stages, 2);
        expect(updatedStages).toHaveLength(3);
        expect(newActiveIndex).toBe(1);
        expect(updatedStages[1]?.stageName).toBe('الاستئناف');
        expect(updatedStages[1]?.status).toBe('active');
        expect(updatedStages[1]?.wasReopened).toBe(true);
        expect(updatedStages[1]?.caseNo).toBe('50/2026');
        expect(updatedStages[1]?.court).toBe('استئناف بغداد');
        expect(updatedStages[1]?.timeline?.length).toBeGreaterThan(appealTimeline.length);
        expect(updatedStages[2]?.status).toBe('completed');
    });

    it('remands personal status cassation to أحوال شخصية with preserved parties', () => {
        const personalStage = {
            ...baseStage,
            id: 'stage_personal',
            stageName: 'أحوال شخصية',
            status: 'locked',
            parties: baseParties,
            timeline: [{ id: 'ps_note', type: 'note', date: '2026-01-01', title: 'ملاحظة أحوال' }],
        } as CaseStage;
        const cassation = {
            ...baseStage,
            id: 'stage_cass',
            stageName: 'تمييز',
            status: 'active',
            parties: [
                { id: 1, name: 'أحمد', role: 'المميز', isClient: true, side: 'right' },
                { id: 2, name: 'علي', role: 'المميز عليه', isClient: false, side: 'left' },
            ],
        } as CaseStage;
        const stages = [personalStage, cassation];

        const target = resolveCassationRemandTarget(stages, 1);
        expect(target.stageName).toBe('أحوال شخصية');
        expect(target.sourceStageIndex).toBe(0);

        const { updatedStages, newActiveIndex } = applyCassationRemand(stages, 1);
        expect(newActiveIndex).toBe(0);
        expect(updatedStages[0]?.stageName).toBe('أحوال شخصية');
        expect(updatedStages[0]?.status).toBe('active');
        expect(updatedStages[0]?.wasReopened).toBe(true);
        expect(updatedStages[0]?.parties?.[0]?.role).toBe('المدعي');
        expect(updatedStages[0]?.timeline?.some((e) => e.id === 'ps_note')).toBe(true);
        expect(updatedStages[1]?.status).toBe('completed');
    });

    it('merges legacy duplicate remand appeal stage on normalize', () => {
        const stages = [
            { id: '1', stageName: 'البداءة', status: 'locked', timeline: [] },
            {
                id: '2',
                stageName: 'الاستئناف',
                status: 'locked',
                timeline: [{ id: 'old', type: 'session', date: '2026-01-01', title: 'جلسة قديمة' }],
            },
            {
                id: '3',
                stageName: 'التمييز',
                status: 'completed',
                finalDecision: 'منقوض (إعادة للمحاكمة)',
                timeline: [],
            },
            {
                id: '4',
                stageName: 'الاستئناف',
                status: 'active',
                wasReopened: true,
                timeline: [{ id: 'remand', type: 'milestone', date: '2026-06-01', title: 'بعد النقض' }],
            },
        ] as CaseStage[];

        const normalized = normalizeLegacyCassationRemandStages(stages);
        expect(normalized).toHaveLength(3);
        expect(normalized[1]?.status).toBe('active');
        expect(normalized[1]?.wasReopened).toBe(true);
        expect(normalized[1]?.timeline?.some((e) => e.id === 'old')).toBe(true);
        expect(normalized[1]?.timeline?.some((e) => e.id === 'remand')).toBe(true);
    });

    it('rejects correction request and finalizes dossier without reopening litigation', () => {
        const cassation = {
            ...baseStage,
            id: 'stage_cass',
            stageName: 'التمييز',
            status: 'completed',
            finalDecision: 'مكتسبة الدرجة القطعية',
        } as CaseStage;
        const correction = {
            ...baseStage,
            id: 'stage_corr',
            stageName: 'تصحيح قرار',
            status: 'active',
            isPleadingsClosed: false,
        } as CaseStage;
        const stages = [cassation, correction];

        const { updatedStages } = applyCorrectionRejected(stages, 1, {
            outcome: 'رد طلب التصحيح',
        });
        expect(updatedStages[1]?.status).toBe('completed');
        expect(updatedStages[1]?.finalDecision).toContain('مكتسبة الدرجة القطعية');
        expect(updatedStages[1]?.timeline?.[0]?.title).toContain('رد طلب التصحيح');
    });

    it('accepts correction and returns to last pleading stage (not cassation)', () => {
        const appeal = {
            ...baseStage,
            id: 'stage_appeal',
            stageName: 'الاستئناف',
            status: 'locked',
        } as CaseStage;
        const cassation = {
            ...baseStage,
            id: 'stage_cass',
            stageName: 'التمييز',
            status: 'completed',
            finalDecision: 'مكتسبة الدرجة القطعية',
        } as CaseStage;
        const correction = {
            ...baseStage,
            id: 'stage_corr',
            stageName: 'تصحيح قرار',
            status: 'active',
            isPleadingsClosed: false,
        } as CaseStage;
        const stages = [appeal, cassation, correction];

        const { updatedStages, newActiveIndex, targetStageName } = applyCorrectionComplete(stages, 2, {
            outcome: 'قبول طلب التصحيح',
        });
        expect(newActiveIndex).toBe(0);
        expect(targetStageName).toBe('الاستئناف');
        expect(updatedStages[0]?.status).toBe('active');
        expect(updatedStages[0]?.wasReopened).toBe(true);
        expect(updatedStages[2]?.status).toBe('completed');
    });
});
