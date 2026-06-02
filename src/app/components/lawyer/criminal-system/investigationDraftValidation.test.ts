import { describe, expect, it } from 'vitest';
import {
    hasDefendantMissingDetentionAuthority,
    isInvestigationDraftLocationIncomplete,
    requiresDetentionAuthorityForStatus,
} from './investigationDraftValidation';

describe('investigationDraftValidation', () => {
    const baseLocation = {
        courtName: '',
        caseNumber: '',
        investigationCourtName: '',
        investigationPapersAt: '' as const,
        investigationOfficeName: '',
        policeStationName: '',
        baseRegisterNumberAndDate: '',
        investigationDossierNumber: '',
        publicProsecutionNumber: '',
        trialJudgeName: '',
        nextHearingDate: '',
    };

    it('requiresDetentionAuthorityForStatus covers detained variants', () => {
        expect(requiresDetentionAuthorityForStatus('موقوف')).toBe(true);
        expect(requiresDetentionAuthorityForStatus('juvenile_detention')).toBe(true);
        expect(requiresDetentionAuthorityForStatus('حر')).toBe(false);
    });

    it('isInvestigationDraftLocationIncomplete enforces court, papers-at, and entity name', () => {
        expect(isInvestigationDraftLocationIncomplete('محكمة الجنح', baseLocation)).toBe(false);
        expect(isInvestigationDraftLocationIncomplete('مرحلة التحقيق', baseLocation)).toBe(true);

        const withCourt = {
            ...baseLocation,
            investigationCourtName: 'محكمة تحقيق الكرخ',
            investigationPapersAt: 'مركز شرطة' as const,
        };
        expect(isInvestigationDraftLocationIncomplete('مرحلة التحقيق', withCourt)).toBe(true);

        const completePolice = {
            ...withCourt,
            policeStationName: 'مركز شرطة الكرخ',
        };
        expect(isInvestigationDraftLocationIncomplete('مرحلة التحقيق', completePolice)).toBe(false);
        expect(isInvestigationDraftLocationIncomplete('تحقيق الأحداث', completePolice)).toBe(false);

        const officeIncomplete = {
            ...withCourt,
            investigationPapersAt: 'مكتب تحقيق قضائي' as const,
            investigationOfficeName: '',
        };
        expect(isInvestigationDraftLocationIncomplete('مرحلة التحقيق', officeIncomplete)).toBe(true);
    });

    it('hasDefendantMissingDetentionAuthority flags detained without authority', () => {
        expect(
            hasDefendantMissingDetentionAuthority([{ status: 'موقوف', detentionAuthority: '' }]),
        ).toBe(true);
        expect(
            hasDefendantMissingDetentionAuthority([
                { status: 'موقوف', detentionAuthority: 'سجن التوقيف' },
            ]),
        ).toBe(false);
        expect(hasDefendantMissingDetentionAuthority([{ status: 'حر', detentionAuthority: '' }])).toBe(
            false,
        );
    });
});
