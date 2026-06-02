import { describe, expect, it } from 'vitest';
import type { CriminalCase, Statement, TimelineEvent, InvestigationLog, LawyerRequest } from './criminalStore';
import type { JudicialDecision } from '@/app/types/criminal';
import {
    MergeValidationError,
    validateCaseMerge,
    consolidatePartiesAfterMerge,
    prepareMergedCaseTransaction,
    formatMergeProvenanceBadge,
} from './caseMergeMigration';

// ─────────────────────────────────────────────────────────────
//  Helpers — مولدات أضابير اختبارية مَع قيم افتراضية مَعقولة
// ─────────────────────────────────────────────────────────────

function makeParty(id: string, name: string) {
    return { id, fullName: name, address: '', birthYear: '', status: '' as const, detentionAuthority: '', detentionExpiryDate: '', detentionHistoryLog: [], totalDetentionDays: 0 };
}

function makeStatement(id: string, name: string): Statement {
    return { id, date: '2026-05-10', giverType: 'complainant', giverName: name, content: 'أَدلى بأقواله' };
}

function makeTimelineEvent(id: string, category: string, date = '2026-05-10'): TimelineEvent {
    return { id, date, type: 'investigation', category, title: category, description: `تفاصيل ${id}` };
}

function makeInvestigationLog(id: string): InvestigationLog {
    return { id, date: '2026-05-12', category: 'official_letter', title: 'مخاطبة', details: 'تفاصيل', status: 'awaiting_response' };
}

function makeLawyerRequest(id: string): LawyerRequest {
    return { id, requestDate: '2026-05-12', type: 'طلب تكفيل', lawyerNote: 'نص الطلب', status: 'pending' };
}

function makeJudicialDecision(id: string): JudicialDecision {
    return { id, issuedAt: '2026-05-12', title: 'قرار', summary: 'ملخص', decisionType: 'dispositive', appeals: [], isLocked: false };
}

function makeCase(over: Partial<CriminalCase> & { id: string }): CriminalCase {
    return {
        id: over.id,
        createdAt: '2026-05-01',
        basics: { role: '', ourRepresentation: '', stage: 'مرحلة التحقيق', legalArticle: '', crimeType: '' } as CriminalCase['basics'],
        location: { caseNumber: `${over.id.toUpperCase()}-001` } as CriminalCase['location'],
        complainants: [],
        unknownDefendant: false,
        defendants: [],
        statements: [],
        timelineEvents: [],
        investigationLogs: [],
        proceduralContainers: [],
        lawyerRequests: [],
        trials: [],
        trialDepositions: [],
        physicalLocation: 'investigation_court' as CriminalCase['physicalLocation'],
        isMutualComplaint: false,
        ...over,
    } as CriminalCase;
}

const baseParent = makeCase({
    id: 'parent',
    location: { caseNumber: '123/2026' } as CriminalCase['location'],
    complainants: [{ id: 'pc1', fullName: 'علي حامد كاظم', address: '', phone: '' }],
    defendants: [makeParty('pd1', 'مشكو منه واحد')],
    statements: [makeStatement('s-parent', 'علي حامد كاظم')],
    timelineEvents: [makeTimelineEvent('t-parent', 'تدوين أقوال المتهم')],
    investigationLogs: [makeInvestigationLog('il-parent')],
    lawyerRequests: [makeLawyerRequest('lr-parent')],
    judicialDecisions: [makeJudicialDecision('jd-parent')],
});

const baseChild = makeCase({
    id: 'child',
    location: { caseNumber: '456/2026' } as CriminalCase['location'],
    complainants: [
        { id: 'cc1', fullName: 'علي حامد كاظم', address: 'ت', phone: '' }, // تَكرار مع الأم
        { id: 'cc2', fullName: 'سالم محمد', address: '', phone: '' }, // جَديد
    ],
    defendants: [makeParty('cd1', 'مشكو منه جديد'), makeParty('cd2', 'مشكو منه واحد') /* تَكرار مع الأم */],
    statements: [makeStatement('s-child', 'سالم محمد')],
    timelineEvents: [makeTimelineEvent('t-child', 'تدوين أقوال المشتكي', '2026-05-20')],
    investigationLogs: [makeInvestigationLog('il-child')],
    lawyerRequests: [makeLawyerRequest('lr-child')],
    judicialDecisions: [makeJudicialDecision('jd-child')],
});

const REASON = 'وحدة الواقعة والأطراف — نَفس الجريمة بأكثر من ملف';
const FIXED_NOW = '2026-05-26';
const createId = (() => {
    let i = 0;
    return () => `evt_${++i}`;
})();

// ─────────────────────────────────────────────────────────────
//  Tests
// ─────────────────────────────────────────────────────────────

describe('caseMergeMigration — validation', () => {
    it('رفض الضَم الذاتي', () => {
        expect(() => validateCaseMerge(baseParent, baseParent, REASON)).toThrow(MergeValidationError);
        try {
            validateCaseMerge(baseParent, baseParent, REASON);
        } catch (err) {
            expect((err as MergeValidationError).code).toBe('self_merge');
        }
    });

    it('رفض غياب الأم', () => {
        expect(() => validateCaseMerge(undefined, baseChild, REASON)).toThrow(/الإضبارة الأم غير موجودة/);
    });

    it('رفض غياب الطفل', () => {
        expect(() => validateCaseMerge(baseParent, undefined, REASON)).toThrow(/المراد ضمها غير موجودة/);
    });

    it('رفض الضَم العابر للمَراحل', () => {
        const otherStage = makeCase({
            id: 'child-misd',
            basics: { ...baseChild.basics, stage: 'محكمة الجنح' } as CriminalCase['basics'],
        });
        expect(() => validateCaseMerge(baseParent, otherStage, REASON)).toThrow(/مَراحل إجرائية مختلفة|مراحل إجرائية مختلفة/);
    });

    it('رفض ضَم إضبارة مُجمَّدة سابقاً بِسَبب ضَم آخر', () => {
        const previouslyMerged = makeCase({ id: 'child-merged', dossierStatus: 'merged', mergedIntoCaseId: 'other-parent' });
        expect(() => validateCaseMerge(baseParent, previouslyMerged, REASON)).toThrow(/مُغلقة سابقاً|مغلقة سابقاً/);
    });

    it('رفض ضَم إلى أم مُجمَّدة سابقاً', () => {
        const mergedParent = makeCase({ id: 'p-frozen', dossierStatus: 'merged' });
        expect(() => validateCaseMerge(mergedParent, baseChild, REASON)).toThrow(/الأم نفسها مُغلقة|الأم نفسها مغلقة/);
    });

    it('يسمح بضَم إضبارة مفرّعة عند تطابق المرحلة', () => {
        const severed = makeCase({
            id: 'sev',
            parentCaseId: 'someParent',
            isSeveredChild: true,
            basics: { stage: 'مرحلة التحقيق' } as CriminalCase['basics'],
        });
        expect(() => validateCaseMerge(baseParent, severed, REASON)).not.toThrow();
    });

    it('يسمح بضَم أمّ تفريق عند تطابق المرحلة', () => {
        const sevParent = makeCase({
            id: 'spv',
            severedChildCaseIds: ['c1'],
            basics: { stage: 'مرحلة التحقيق' } as CriminalCase['basics'],
        });
        expect(() => validateCaseMerge(baseParent, sevParent, REASON)).not.toThrow();
    });

    it('رفض ضَم نَفس الطِفل مَرّتين (already_merged_to_parent)', () => {
        const parentWithChild = makeCase({ ...baseParent, mergedCaseIds: ['child'] });
        expect(() => validateCaseMerge(parentWithChild, baseChild, REASON)).toThrow(/مضمومة بالفعل/);
    });

    it('رفض السبب الفارغ', () => {
        expect(() => validateCaseMerge(baseParent, baseChild, '   ')).toThrow(MergeValidationError);
        try {
            validateCaseMerge(baseParent, baseChild, '');
        } catch (err) {
            expect((err as MergeValidationError).code).toBe('empty_reason');
        }
    });

});

describe('caseMergeMigration — consolidatePartiesAfterMerge', () => {
    it('يَحذف التَكرار في المشتكين والمتهمين', () => {
        const result = consolidatePartiesAfterMerge(baseParent, baseChild);
        const complainantNames = result.complainants.map((c) => c.fullName);
        const defendantNames = result.defendants.map((d) => d.fullName);
        expect(complainantNames).toEqual(['علي حامد كاظم', 'سالم محمد']);
        expect(defendantNames).toEqual(['مشكو منه واحد', 'مشكو منه جديد']);
        expect(result.deduplicatedComplainants).toBe(1);
        expect(result.deduplicatedDefendants).toBe(1);
        expect(result.addedComplainants).toBe(1);
        expect(result.addedDefendants).toBe(1);
    });

    it('لا يُضيف اسماً فارغاً بَعد التَّطبيع', () => {
        const childEmpty = makeCase({ id: 'ce', complainants: [{ id: 'x', fullName: '   ', address: '', phone: '' }] });
        const result = consolidatePartiesAfterMerge(baseParent, childEmpty);
        expect(result.complainants.map((c) => c.fullName)).toEqual(['علي حامد كاظم']);
    });

    it('يَتجاهل اختلاف المسافات والحالة عند المقارنة', () => {
        const childWeirdSpacing = makeCase({
            id: 'cws',
            complainants: [{ id: 'x', fullName: '  علي  حامد   كاظم ', address: '', phone: '' }],
        });
        const result = consolidatePartiesAfterMerge(baseParent, childWeirdSpacing);
        expect(result.complainants).toHaveLength(1);
        expect(result.deduplicatedComplainants).toBe(1);
    });
});

describe('caseMergeMigration — prepareMergedCaseTransaction', () => {
    it('يُرحّل كل السجلات بِختم تَتبّع دائم وَيُجمّد الطِفل', () => {
        const result = prepareMergedCaseTransaction(baseParent, baseChild, REASON, { now: FIXED_NOW, createId });

        // الأم
        const p = result.updatedParent;
        expect(p.statements).toHaveLength(2);
        expect(p.statements?.find((s) => s.id === 's-child')?.mergedFromCaseId).toBe('child');
        expect(p.statements?.find((s) => s.id === 's-child')?.mergedFromCaseNumber).toBe('456/2026');
        expect(p.timelineEvents.find((ev) => ev.id === 't-child')?.mergedFromCaseId).toBe('child');
        expect(p.investigationLogs.find((il) => il.id === 'il-child')?.mergedFromCaseId).toBe('child');
        expect(p.lawyerRequests.find((lr) => lr.id === 'lr-child')?.mergedFromCaseId).toBe('child');
        expect(p.judicialDecisions?.find((jd) => jd.id === 'jd-child')?.mergedFromCaseId).toBe('child');
        expect(p.dossierStatus).toBe('active');
        expect(p.mergedCaseIds).toContain('child');
        expect(p.mergedCasesTexts).toContain('456/2026');
        // حدث بَنر الضَم
        const mergeBanner = p.timelineEvents.find((ev) => ev.category === 'ضم وإغلاق إضبارة');
        expect(mergeBanner).toBeTruthy();
        expect(mergeBanner?.description).toContain('456/2026');
        expect(mergeBanner?.description).toContain(REASON);

        // الطِفل
        const c = result.frozenChild;
        expect(c.dossierStatus).toBe('merged');
        expect(c.isArchived).toBe(true);
        expect(c.isFrozen).toBe(true);
        expect(c.mergedIntoCaseId).toBe('parent');
        expect(c.mergedIntoCaseNumber).toBe('123/2026');
        expect(c.statements).toEqual([]);
        expect(c.timelineEvents).toEqual([]);
        expect(c.investigationLogs).toEqual([]);
        expect(c.lawyerRequests).toEqual([]);
        expect(c.judicialDecisions).toEqual([]);
        expect(c.notes).toContain('123/2026');
        expect(c.notes).toContain(REASON);

        // الملخص
        expect(result.summary.migratedStatements).toBe(1);
        expect(result.summary.migratedTimelineEvents).toBe(1);
        expect(result.summary.migratedJudicialDecisions).toBe(1);
        expect(result.summary.addedDefendants).toBe(1);
    });

    it('لا يُغيّر بَيانات الأم في مَكانها (immutability)', () => {
        const originalParentStatements = baseParent.statements;
        const originalChildTimeline = baseChild.timelineEvents;
        prepareMergedCaseTransaction(baseParent, baseChild, REASON, { now: FIXED_NOW, createId });
        expect(baseParent.statements).toBe(originalParentStatements);
        expect(baseChild.timelineEvents).toBe(originalChildTimeline);
    });

    it('يَرفض الضَم العابر للمَراحل قبل أي تَعديل', () => {
        const trialChild = makeCase({
            ...baseChild,
            basics: { stage: 'محكمة الجنح' } as CriminalCase['basics'],
        });
        expect(() =>
            prepareMergedCaseTransaction(baseParent, trialChild, REASON, { now: FIXED_NOW, createId }),
        ).toThrow(/مراحل إجرائية مختلفة/);
    });
});

describe('caseMergeMigration — formatMergeProvenanceBadge', () => {
    it('يَبني الختم النصي بالصيغة المطلوبة', () => {
        expect(formatMergeProvenanceBadge('456/2026')).toBe('📌 مرحّل من الإضبارة المنضمة: 456/2026');
    });

    it('يَستبدل الفراغ بِنَص افتراضي حِيادي', () => {
        expect(formatMergeProvenanceBadge('')).toBe('📌 مرحّل من الإضبارة المنضمة: إضبارة دون رقم');
    });
});
