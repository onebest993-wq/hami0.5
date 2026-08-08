import { describe, expect, it } from 'vitest';
import { collectLawsuitCreationSparkNudges } from '@/app/spark/procedural/lawsuitCreationNudgeRules';
import { LAWSUIT_CREATION_DOSSIER_KEY } from '@/app/spark/context/lawsuitCreationSparkContext';
import { collectExecutionCreationSparkNudges } from '@/app/spark/procedural/executionCreationNudgeRules';
import { pickExecutionCreationSparkNudgeQueue } from '@/app/spark/engine/sparkExecutionCreationHybridEngine';
import { buildExecutionCreationSparkContext } from '@/app/spark/context/executionCreationSparkContext';
import { collectCriminalCreationSparkNudges } from '@/app/spark/procedural/criminalCreationNudgeRules';
import { buildCriminalCreationSparkContext } from '@/app/spark/context/criminalCreationSparkContext';
import { makeInitialDraft } from '@/app/components/lawyer/criminal-system/criminalCaseDraftFactory';

const baseLawsuitCtx = {
    dossierKey: LAWSUIT_CREATION_DOSSIER_KEY,
    jurisdiction: 'civil' as const,
    caseDetails: {
        court: 'محكمة بداءة',
        type: 'دين',
        stage: 'بداءة بدرجة أولى',
        claimValue: '',
        retrialTargetStage: '',
        firstHearingDate: '',
    },
    parties1: [{ id: 'p1', name: 'مدعي', status: '', isClient: false, phone: '', address: '' }],
    parties2: [{ id: 'p2', name: 'مدعى', status: '', isClient: false, phone: '', address: '' }],
    incidentalFilingPartyId: '',
    incidentalOpposingPartyId: '',
    incidentalSpawnContext: null,
};

describe('spark creation nudge rules', () => {
    it('ينبّه عند غياب موكّل في إنشاء الدعوى', () => {
        const nudges = collectLawsuitCreationSparkNudges(baseLawsuitCtx);
        expect(nudges.some((n) => n.kind === 'lawsuit.creation_client_missing')).toBe(true);
    });

    it('ينبّه عند نقص مديرية التنفيذ', () => {
        const nudges = collectExecutionCreationSparkNudges(
            buildExecutionCreationSparkContext({
                directorate: '',
                fileNumber: '',
                docType: 'حكم',
                docNumber: '',
                judgmentDate: '',
                classification: 'مدني',
                claimType: 'استحصال دين مالي',
                activeClaimTypes: ['استحصال دين مالي'],
                claimAmountsByType: {},
                totalAmount: '',
                debtors: [{ name: 'مدين', address: 'بغداد', isClient: false }],
                creditors: [{ name: 'موكل', address: '', isClient: true }],
                isDocumentBlocked: false,
                submissionDate: '2026-08-05',
            }),
        );
        expect(nudges.some((n) => n.kind === 'execution.creation_directorate_incomplete')).toBe(true);
    });

    it('ينبّه عند تعارض تواريخ النفقة في إنشاء التنفيذ', () => {
        const ctx = buildExecutionCreationSparkContext({
            directorate: 'بغداد',
            fileNumber: '123',
            docType: 'حكم',
            docNumber: '1/2026',
            judgmentDate: '2026-01-01',
            classification: 'أحوال شخصية',
            claimType: 'نفقة',
            activeClaimTypes: ['نفقة'],
            claimAmountsByType: {},
            totalAmount: '',
            debtors: [{ name: 'مدين', address: 'بغداد', isClient: false }],
            creditors: [{ name: 'موكل', address: '', isClient: true }],
            isDocumentBlocked: false,
            submissionDate: '2026-08-05',
            alimony: {
                beneficiary: 'زوجة فقط',
                lawsuitDate: '2026-08-05',
                executionDate: '2026-02-05',
                wifeMonthly: '300000',
                childrenMonthly: '',
                childrenCount: '1',
                includesPastCalc: false,
                pastStartDate: '',
                judgmentDate: '',
                submissionDate: '',
                calculated: null,
            },
        });
        const nudges = pickExecutionCreationSparkNudgeQueue(ctx, 8);
        expect(
            nudges.some(
                (n) =>
                    n.kind === 'execution.creation_alimony_timeline' ||
                    n.kind === 'coherence.timeline',
            ),
        ).toBe(true);
    });

    it('ينبّه عند غياب موكّل في إنشاء الإضبارة الجزائية', () => {
        const draft = makeInitialDraft();
        draft.basics.stage = 'مرحلة التحقيق';
        const nudges = collectCriminalCreationSparkNudges(
            buildCriminalCreationSparkContext({
                draft,
                stage: draft.basics.stage,
                isSeveranceMode: false,
                isReferralStage: false,
                isPublicProsecutionComplainant: false,
                investigationPartyMix: 'adults_only',
                investigationLocationIncomplete: false,
                identifiedDefendantSaveIncomplete: false,
                complainantGuardianDataIncomplete: false,
                mixedUnknownWithIdentified: false,
                allDefendantsUnknownOnly: false,
            }),
        );
        expect(nudges.some((n) => n.kind === 'criminal.creation_client_missing')).toBe(true);
    });

    it('ينبّه عند مادة ٣ بدون تاريخ اكتشاف', () => {
        const draft = makeInitialDraft();
        draft.basics.stage = 'مرحلة التحقيق';
        draft.basics.ourRepresentation = 'complainant_side';
        draft.isArticle3Offense = true;
        draft.crimeDiscoveryDate = '';
        const nudges = collectCriminalCreationSparkNudges(
            buildCriminalCreationSparkContext({
                draft,
                stage: draft.basics.stage,
                isSeveranceMode: false,
                isReferralStage: false,
                isPublicProsecutionComplainant: false,
                investigationPartyMix: 'adults_only',
                investigationLocationIncomplete: false,
                identifiedDefendantSaveIncomplete: false,
                complainantGuardianDataIncomplete: false,
                mixedUnknownWithIdentified: false,
                allDefendantsUnknownOnly: false,
            }),
        );
        expect(nudges.some((n) => n.kind === 'criminal.creation_article3_discovery')).toBe(true);
    });
});
