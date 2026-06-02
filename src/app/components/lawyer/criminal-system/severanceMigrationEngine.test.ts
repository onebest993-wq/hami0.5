import { describe, expect, it } from 'vitest';
import type { CriminalCase } from './criminalStore';
import {
    buildSeverancePartyIdMaps,
    partitionJudicialDecisionsForSeverance,
    partitionLawyerRequestsForSeverance,
    partitionTimelineEventsForSeverance,
    remapLawyerRequestForSeveredChild,
    shouldMigrateExclusivePartyItem,
} from './severanceMigrationEngine';

function minimalParent(): CriminalCase {
    return {
        id: 'parent-1',
        createdAt: '2026-01-01',
        basics: { role: 'وكيل المشتكي', ourRepresentation: 'complainant_side', stage: 'مرحلة التحقيق', legalArticle: '413', crimeType: 'جنحة' },
        location: {
            investigationCourtName: 'محكمة',
            investigationPapersAt: 'مكتب',
            policeStationName: '',
            baseRegisterNumberAndDate: '1/2026',
            investigationOfficeName: '',
            investigationDossierNumber: 'D-1',
            courtName: '',
            caseNumber: '',
        },
        complainants: [
            {
                id: 'c-cross',
                fullName: 'مشتكي متقابل',
                address: '',
                phone: '',
                isCrossComplaint: true,
                counterComplaintTargetDefendantIds: ['d2'],
            },
            { id: 'c1', fullName: 'مشتكي أصلي', address: '', phone: '' },
        ],
        unknownDefendant: false,
        defendants: [
            { id: 'd1', fullName: 'علي', address: '', birthYear: '1990', status: 'موقوف' },
            { id: 'd2', fullName: 'باسم', address: '', birthYear: '1991', status: 'مكفل' },
        ],
        statements: [],
        timelineEvents: [],
        investigationLogs: [],
        lawyerRequests: [],
        physicalLocation: 'custom',
        isMutualComplaint: false,
        legalArticleHistory: [],
    } as CriminalCase;
}

describe('severanceMigrationEngine', () => {
    it('migrates defendant-exclusive requests and blocks shared ones', () => {
        const parent = minimalParent();
        const allowed = new Set(['d2']);
        const { kept, migrated } = partitionLawyerRequestsForSeverance(
            [
                {
                    id: 'req-d2',
                    requestDate: '2026-04-01',
                    type: 'حبس',
                    lawyerNote: 'حصري',
                    status: 'executed',
                    defendantIds: ['d2'],
                },
                {
                    id: 'req-both',
                    requestDate: '2026-04-02',
                    type: 'طلب',
                    lawyerNote: 'مشترك',
                    status: 'pending',
                    defendantIds: ['d1', 'd2'],
                },
                {
                    id: 'req-general',
                    requestDate: '2026-04-03',
                    type: 'عام',
                    lawyerNote: 'بدون أطراف',
                    status: 'pending',
                },
            ],
            allowed,
            parent,
        );
        expect(migrated.map((r) => r.id)).toEqual(['req-d2']);
        expect(kept.map((r) => r.id)).toEqual(['req-both', 'req-general']);
    });

    it('migrates cross-complainant asset seizure when targets are severed only', () => {
        const parent = minimalParent();
        const allowed = new Set(['d2']);
        expect(
            shouldMigrateExclusivePartyItem(['c-cross'], allowed, parent),
        ).toBe(true);
        expect(
            shouldMigrateExclusivePartyItem(['c1'], allowed, parent),
        ).toBe(false);
        const { migrated } = partitionLawyerRequestsForSeverance(
            [
                {
                    id: 'req-seize',
                    requestDate: '2026-04-04',
                    type: 'حجز أموال',
                    lawyerNote: 'على المتقابل',
                    status: 'executed',
                    assetSeizure: {
                        perDefendant: [{ defendantId: 'c-cross', assets: [{ id: 'a1', description: 'مبلغ' }] }],
                    },
                },
            ],
            allowed,
            parent,
        );
        expect(migrated).toHaveLength(1);
    });

    it('remaps defendant ids on migrated requests', () => {
        const maps = buildSeverancePartyIdMaps(
            minimalParent(),
            [{ id: 'child-d2', fullName: 'باسم', address: '', birthYear: '1991', status: 'مكفل' }],
            ['d2'],
            [{ id: 'child-c-cross', fullName: 'مشتكي متقابل', address: '', phone: '' }],
        );
        const remapped = remapLawyerRequestForSeveredChild(
            {
                id: 'req-d2',
                requestDate: '2026-04-01',
                type: 'أمر قبض',
                lawyerNote: 'x',
                status: 'executed',
                defendantIds: ['d2'],
            },
            maps,
            { caseId: 'parent-1', caseNumber: '10/2026' },
        );
        expect(remapped.defendantIds).toEqual(['child-d2']);
        expect(remapped.mergedFromCaseId).toBe('parent-1');
    });

    it('migrates defendant-exclusive timeline events', () => {
        const parent = minimalParent();
        const allowed = new Set(['d2']);
        const { kept, migrated } = partitionTimelineEventsForSeverance(
            [
                {
                    id: 'tl-shared',
                    date: '2026-04-01',
                    type: 'investigation',
                    category: 'عام',
                    title: 'عام',
                    description: 'x',
                },
                {
                    id: 'tl-d2',
                    date: '2026-04-02',
                    type: 'decision',
                    category: 'قرار',
                    title: 'حصري',
                    description: 'y',
                    defendantIds: ['d2'],
                },
            ],
            allowed,
            parent,
        );
        expect(migrated.map((e) => e.id)).toEqual(['tl-d2']);
        expect(kept.map((e) => e.id)).toEqual(['tl-shared']);
    });

    it('considers beneficiaryPartyIds for judicial decisions', () => {
        const parent = minimalParent();
        const allowed = new Set(['d2']);
        const { migrated, kept } = partitionJudicialDecisionsForSeverance(
            [
                {
                    id: 'jd-d2',
                    issuedAt: '2026-04-05',
                    title: 'قرار',
                    summary: 'x',
                    decisionType: 'preparatory',
                    appeals: [],
                    isLocked: true,
                    beneficiaryPartyIds: ['d2'],
                },
                {
                    id: 'jd-both',
                    issuedAt: '2026-04-06',
                    title: 'مشترك',
                    summary: 'y',
                    decisionType: 'preparatory',
                    appeals: [],
                    isLocked: true,
                    defendantIds: ['d1', 'd2'],
                },
            ],
            allowed,
            parent,
        );
        expect(migrated.map((d) => d.id)).toEqual(['jd-d2']);
        expect(kept.map((d) => d.id)).toEqual(['jd-both']);
    });
});
