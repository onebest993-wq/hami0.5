import { describe, expect, it } from 'vitest';
import {
    buildAbscondingSeveranceJourney,
    materializeSeveredChildView,
    resolveCriminalCaseForDisplay,
    severanceBannerText,
    severanceReasonLabel,
} from './caseSeveranceView';
import type { CriminalCase } from './criminalStore';

function minimalCase(overrides: Partial<CriminalCase> = {}): CriminalCase {
    return {
        id: 'parent-1',
        createdAt: '2026-01-01',
        basics: { role: 'وكيل المشتكي', ourRepresentation: 'complainant_side', stage: 'مرحلة التحقيق', legalArticle: '413', crimeType: 'جنحة' },
        location: {
            investigationCourtName: 'محكمة',
            investigationPapersAt: 'مكتب تحقيق قضائي',
            policeStationName: '',
            baseRegisterNumberAndDate: '10/2026',
            investigationOfficeName: '',
            investigationDossierNumber: 'D-1',
            courtName: '',
            caseNumber: '',
        },
        complainants: [{ id: 'c1', fullName: 'مشتكي', address: '', phone: '' }],
        unknownDefendant: false,
        defendants: [{ id: 'd1', fullName: 'متهم 1', address: '', birthYear: '1990', status: 'موقوف' }],
        statements: [],
        timelineEvents: [],
        investigationLogs: [],
        lawyerRequests: [],
        physicalLocation: 'custom',
        isMutualComplaint: false,
        legalArticleHistory: [],
        ...overrides,
    } as CriminalCase;
}

describe('caseSeveranceView', () => {
    it('materializeSeveredChildView keeps child independent from parent fields', () => {
        const parent = minimalCase({
            complainants: [{ id: 'cp', fullName: 'مشتكي الأم', address: '', phone: '' }],
            timelineEvents: [
                { id: 'old', date: '2026-05-01', type: 'investigation', category: 'تدوين', title: 'قديم', description: 'x' },
            ],
            statements: [
                {
                    id: 'st1',
                    date: '2026-05-01',
                    giverType: 'defendant',
                    giverName: 'متهم 1',
                    content: 'إفادة قديمة',
                },
            ],
        });
        const child = minimalCase({
            id: 'child-1',
            isSeveredChild: true,
            parentCaseId: 'parent-1',
            severanceReason: 'unrelated_crimes_or_acts',
            severedAt: '2026-06-01',
            complainants: [{ id: 'cc', fullName: 'مشتكي الابنة', address: '', phone: '' }],
            defendants: [{ id: 'd2', fullName: 'متهم مفرّق', address: '', birthYear: '1991', status: 'موقوف' }],
            timelineEvents: [
                { id: 'own', date: '2026-06-20', type: 'decision', category: 'جلسة', title: 'جديد', description: 'z' },
            ],
            statements: [],
        });

        const view = materializeSeveredChildView(parent, child);
        expect(view.timelineEvents.map((e) => e.id)).toEqual(['own']);
        expect(view.statements).toHaveLength(0);
        expect(view.complainants[0]?.fullName).toBe('مشتكي الابنة');
        expect(child.timelineEvents.length).toBe(1);
    });

    it('builds absconding journey with evading and absentia nodes', () => {
        const j = buildAbscondingSeveranceJourney('2026-07-01');
        expect(j.some((n) => n.stage === 'evading_arrest')).toBe(true);
        expect(j.some((n) => n.stage === 'absentia_trial' && n.status === 'current')).toBe(true);
    });

    it('formats banner by severance reason', () => {
        const parent = minimalCase({ location: { ...minimalCase().location, baseRegisterNumberAndDate: '55/2026' } });
        const substantive = minimalCase({
            isSeveredChild: true,
            parentCaseId: parent.id,
            severanceReason: 'justice_interests',
        });
        const absconding = minimalCase({
            isSeveredChild: true,
            parentCaseId: parent.id,
            severanceReason: 'defendant_absconding',
        });
        const other = minimalCase({
            isSeveredChild: true,
            parentCaseId: parent.id,
            severanceReason: 'other',
            severanceReasonDetail: 'سبب خاص',
        });
        expect(severanceBannerText(substantive, parent)).toContain('مقتضيات حسن سير العدالة');
        expect(severanceBannerText(absconding, parent)).toContain('غيابية');
        expect(severanceBannerText(other, parent)).toContain('سبب خاص');
    });

    it('uses custom detail for other severance reason label', () => {
        expect(severanceReasonLabel('other', 'تفصيل يدوي')).toBe('تفصيل يدوي');
        expect(severanceReasonLabel('juvenile_mixed_with_adult')).toContain('حدث');
    });

    it('resolveCriminalCaseForDisplay keeps severed child independent from parent complainants', () => {
        const parent = minimalCase();
        const child = minimalCase({
            id: 'c2',
            isSeveredChild: true,
            parentCaseId: 'parent-1',
            severedAt: '2026-06-01',
            complainants: [{ id: 'cx', fullName: 'خاص بالابنة', address: '', phone: '' }],
        });
        const resolved = resolveCriminalCaseForDisplay(child, { 'parent-1': parent, c2: child });
        expect(resolved?.complainants[0]?.fullName).toBe('خاص بالابنة');
    });
});
