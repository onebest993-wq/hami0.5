import { describe, expect, it } from 'vitest';
import type { CriminalDefendant } from './criminalStore';
import {
    buildJuvenileMixedSplitDraftSnapshots,
    resolveInvestigationLocationPatchForPartyMix,
    shouldAutoSplitJuvenileMixedDraft,
    STANDARD_INVESTIGATION_COURT_NAME,
} from './juvenileMixedCaseSplitEngine';
import { JUVENILE_INVESTIGATION_COURT_NAME } from './juvenileInvestigationRules';

function def(id: string, isJuvenile: boolean): CriminalDefendant {
    return {
        id,
        fullName: `متهم ${id}`,
        address: '',
        birthYear: '',
        status: '',
        detentionAuthority: '',
        detentionExpiryDate: '',
        detentionHistoryLog: [],
        totalDetentionDays: 0,
        isJuvenile,
    };
}

describe('juvenileMixedCaseSplitEngine', () => {
    it('patches court for juveniles_only and mixed', () => {
        expect(resolveInvestigationLocationPatchForPartyMix('juveniles_only')).toEqual({
            investigationCourtName: JUVENILE_INVESTIGATION_COURT_NAME,
            investigationPapersAt: 'مكتب تحقيق قضائي',
        });
        expect(resolveInvestigationLocationPatchForPartyMix('mixed')).toEqual({
            investigationCourtName: STANDARD_INVESTIGATION_COURT_NAME,
        });
        expect(resolveInvestigationLocationPatchForPartyMix('adults_only')).toBeNull();
    });

    it('never auto-splits on save — single dossier for mixed parties', () => {
        expect(
            shouldAutoSplitJuvenileMixedDraft([def('a', false), def('j', true)], 'مرحلة التحقيق'),
        ).toBe(false);
        expect(shouldAutoSplitJuvenileMixedDraft([def('j', true)], 'مرحلة التحقيق')).toBe(false);
        expect(
            shouldAutoSplitJuvenileMixedDraft([def('a', false), def('j', true)], 'محكمة الجنح'),
        ).toBe(false);
    });

    it('builds adult and juvenile snapshots with shared register', () => {
        const { adultDraft, juvenileDraft } = buildJuvenileMixedSplitDraftSnapshots({
            basics: {
                role: '',
                ourRepresentation: 'complainant_side',
                stage: 'مرحلة التحقيق',
                legalArticle: '413',
                crimeType: 'جنحة',
            },
            location: {
                investigationCourtName: STANDARD_INVESTIGATION_COURT_NAME,
                investigationPapersAt: 'مكتب تحقيق قضائي',
                policeStationName: '',
                baseRegisterNumberAndDate: '88/2026',
                investigationOfficeName: 'مكتب 1',
                investigationDossierNumber: 'D-88',
                courtName: '',
                caseNumber: '',
                publicProsecutionNumber: '',
                trialJudgeName: '',
                nextHearingDate: '',
            },
            complainants: [],
            unknownDefendant: false,
            defendants: [def('a', false), def('j', true)],
            statements: [],
            otherEvidenceItems: [],
            timelineEvents: [],
            investigationLogs: [],
            proceduralContainers: [],
            lawyerRequests: [],
            trials: [],
            trialDepositions: [],
            physicalLocation: 'investigator_room',
            isMutualComplaint: false,
        });
        expect(adultDraft.defendants).toHaveLength(1);
        expect(juvenileDraft.defendants).toHaveLength(1);
        expect(adultDraft.location.baseRegisterNumberAndDate).toBe('88/2026');
        expect(juvenileDraft.location.baseRegisterNumberAndDate).toBe('88/2026');
        expect(adultDraft.location.investigationCourtName).toBe(STANDARD_INVESTIGATION_COURT_NAME);
        expect(juvenileDraft.basics.stage).toBe('تحقيق الأحداث');
        expect(juvenileDraft.location.investigationCourtName).toBe(JUVENILE_INVESTIGATION_COURT_NAME);
    });
});
