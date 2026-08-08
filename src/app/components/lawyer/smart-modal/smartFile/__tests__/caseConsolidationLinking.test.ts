import { describe, expect, it } from 'vitest';
import type { FileData } from '../../../LawyerShared';
import {
    assertDistinctConsolidationPair,
    assertConsolidationStageCompatibility,
    addExternalConsolidationRef,
    listConsolidationCandidates,
    mergeLawsuitFilesForConsolidation,
    resolveConsolidationMergedOpenTarget,
    resolveOpenLawsuitFileIdentity,
} from '../caseConsolidationLinking';

const base = (id: number, caseNo: string): FileData =>
    ({
        id,
        type: 'lawsuit',
        status: 'active',
        caseNo,
        court: 'بداءة الكرخ',
        parties: [{ id: 1, name: `موكل ${id}`, role: 'مدعي', isClient: true }],
        history: [],
        notes: [],
        images: [],
        date: '2026-01-01',
    }) as FileData;

describe('caseConsolidationLinking', () => {
    it('excludes the open file from candidates (numeric and string ids)', () => {
        const files = [base(1, '11/ب/100'), base(2, '11/ب/200')];
        expect(listConsolidationCandidates(files, 1)).toHaveLength(1);
        expect(listConsolidationCandidates(files, 1)[0]?.id).toBe(2);
        expect(listConsolidationCandidates(files, '1')).toHaveLength(1);
        expect(listConsolidationCandidates(files, 1)[0]?.caseNo).toBe('11/ب/200');
    });

    it('returns empty candidates when current id is invalid', () => {
        const files = [base(1, '11/ب/100')];
        expect(listConsolidationCandidates(files, NaN)).toEqual([]);
        expect(listConsolidationCandidates(files, undefined)).toEqual([]);
    });

    it('resolves open file identity from pool not stale stage text', () => {
        const files = [base(5, '11/ب/2024')];
        const identity = resolveOpenLawsuitFileIdentity(
            { id: '5', caseNo: 'عغفعفغ' },
            { id: 5, caseNo: 'عغفعفغ' },
            files,
        );
        expect(identity.fileId).toBe(5);
        expect(identity.caseNo).toBe('11/ب/2024');
        expect(identity.clientName).toBe('موكل 5');
    });

    it('rejects self-consolidation pairs', () => {
        expect(assertDistinctConsolidationPair(3, 3)).toBeNull();
        expect(assertDistinctConsolidationPair('4', '4')).toBeNull();
        expect(assertDistinctConsolidationPair(2, '2')).toBeNull();
        expect(assertDistinctConsolidationPair(2, 5)).toEqual({ primary: 2, secondary: 5 });
    });

    it('keeps primary court and case number when merging with existing file', () => {
        const primary = {
            ...base(1, '11/ب/100'),
            court: 'محكمة بداءة الكرخ',
            judge: 'القاضي أ',
            docType: 'مدنية',
            stages: [{ id: 's1', stageName: 'البداءة', caseNo: '11/ب/100', court: 'محكمة بداءة الكرخ', judge: 'القاضي أ', docType: 'مدنية', timeline: [] }],
            activeStageIndex: 0,
        } as FileData;
        const secondary = {
            ...base(2, '11/ب/200'),
            court: 'محكمة أخرى',
            judge: 'قاضي ثان',
            stages: [{ id: 's2', stageName: 'البداءة', caseNo: '11/ب/200', court: 'محكمة أخرى', judge: 'قاضي ثان', timeline: [] }],
            activeStageIndex: 0,
        } as FileData;

        const mergeResult = mergeLawsuitFilesForConsolidation(primary, secondary, {
            consolidationDate: '2026-06-01',
            notes: 'اختبار',
        });
        expect('error' in mergeResult).toBe(false);
        if ('error' in mergeResult) return;
        const { mergedPrimary } = mergeResult;

        expect(mergedPrimary.caseNo).toBe('11/ب/100');
        expect(mergedPrimary.court).toBe('محكمة بداءة الكرخ');
        expect(mergedPrimary.judge).toBe('القاضي أ');
        expect(mergedPrimary.docType).toBe('مدنية');
        expect(mergedPrimary.consolidationSecondaryRefs?.[0]?.caseNo).toBe('11/ب/200');
    });

    it('rejects merge across different litigation degrees', () => {
        const primary = {
            ...base(1, '11/ب/100'),
            stages: [{ id: 's1', stageName: 'البداءة', timeline: [] }],
            activeStageIndex: 0,
        } as FileData;
        const secondary = {
            ...base(2, '11/ب/200'),
            stages: [{ id: 's2', stageName: 'الاستئناف', timeline: [] }],
            activeStageIndex: 0,
        } as FileData;

        const result = mergeLawsuitFilesForConsolidation(primary, secondary, {
            consolidationDate: '2026-06-01',
        });
        expect(result).toEqual({
            error: expect.stringContaining('لا يجوز توحيد دعاوى بدرجات تقاضٍ مختلفة'),
        });
    });

    it('lists only candidates at the same litigation degree', () => {
        const files = [
            { ...base(1, '11/ب/100'), stages: [{ id: 's1', stageName: 'بداءة بدرجة أولى', timeline: [] }], activeStageIndex: 0 },
            { ...base(2, '11/ب/200'), stages: [{ id: 's2', stageName: 'بداءة بدرجة أولى', timeline: [] }], activeStageIndex: 0 },
            { ...base(3, '11/ب/300'), stages: [{ id: 's3', stageName: 'الاستئناف', timeline: [] }], activeStageIndex: 0 },
        ] as FileData[];
        const candidates = listConsolidationCandidates(files, 1);
        expect(candidates).toHaveLength(1);
        expect(candidates[0]?.id).toBe(2);
    });

    it('assertConsolidationStageCompatibility blocks mixed degrees', () => {
        const primary = {
            ...base(4, '4/ب'),
            stages: [{ id: 's1', stageName: 'البداءة', timeline: [] }],
            activeStageIndex: 0,
        } as FileData;
        const secondary = {
            ...base(5, '5/ب'),
            stages: [{ id: 's2', stageName: 'التمييز', timeline: [] }],
            activeStageIndex: 0,
        } as FileData;
        expect(assertConsolidationStageCompatibility(primary, secondary).ok).toBe(false);
    });

    it('merges notes, images, and history from both dossiers', () => {
        const primary = {
            ...base(1, '11/ب/100'),
            notes: [{ id: 1, text: 'ملاحظة أ', meta: '', stageCtx: '', date: '2026-01-02' }],
            images: [{ url: '/a.png', name: 'a' }],
            history: [{ id: 1, stage: 'بداءة', result: 'جلسة', date: '2026-01-01' }],
            stages: [
                {
                    id: 's1',
                    stageName: 'البداءة',
                    timeline: [{ id: 't1', type: 'note', date: '2026-01-01', title: 'أ' }],
                },
            ],
            activeStageIndex: 0,
        } as FileData;
        const secondary = {
            ...base(2, '11/ب/200'),
            notes: [{ id: 2, text: 'ملاحظة ب', meta: '', stageCtx: '', date: '2026-01-03' }],
            images: [{ url: '/b.png', name: 'b' }],
            history: [{ id: 2, stage: 'بداءة', result: 'حكم', date: '2026-02-01' }],
            stages: [
                {
                    id: 's2',
                    stageName: 'البداءة',
                    timeline: [{ id: 't2', type: 'note', date: '2026-02-01', title: 'ب' }],
                },
            ],
            activeStageIndex: 0,
        } as FileData;

        const mergeResult = mergeLawsuitFilesForConsolidation(primary, secondary, {
            consolidationDate: '2026-06-01',
        });
        expect('error' in mergeResult).toBe(false);
        if ('error' in mergeResult) return;
        const { mergedPrimary, archivedSecondary } = mergeResult;

        expect(mergedPrimary.notes).toHaveLength(2);
        expect(mergedPrimary.images).toHaveLength(2);
        expect(mergedPrimary.history).toHaveLength(2);
        expect(mergedPrimary.stages?.[0]?.timeline).toHaveLength(3);
        expect(archivedSecondary.status).toBe('archived');
        expect(archivedSecondary.consolidationMergedInto).toBe(1);
    });

    it('redirects open target from archived merged dossier to unified primary', () => {
        const files = [
            {
                ...base(1, '11/ب/100'),
                consolidationSecondaryRefs: [{ id: 'c1', caseNo: '11/ب/200', isExternal: false }],
            },
            {
                ...base(2, '11/ب/200'),
                status: 'archived',
                consolidationMergedInto: 1,
            },
        ] as FileData[];

        const redirected = resolveConsolidationMergedOpenTarget(files, files[1]!);
        expect(redirected.id).toBe(1);
        expect(redirected.caseNo).toBe('11/ب/100');
    });

    it('adds external consolidation ref without changing primary identity', () => {
        const primary = {
            ...base(3, '22/ب/300'),
            court: 'محكمة الرصافة',
            docType: 'مدنية',
            stages: [{ id: 's1', stageName: 'البداءة', caseNo: '22/ب/300', court: 'محكمة الرصافة', docType: 'مدنية', timeline: [] }],
            activeStageIndex: 0,
        } as FileData;

        const updated = addExternalConsolidationRef(primary, {
            peerCaseNo: '99/ب/999',
            consolidationDate: '2026-06-02',
            notes: 'مرجع خارجي',
        });

        expect(updated.caseNo).toBe('22/ب/300');
        expect(updated.court).toBe('محكمة الرصافة');
        expect(updated.consolidationSecondaryRefs?.[0]?.caseNo).toBe('99/ب/999');
        expect(updated.consolidationSecondaryRefs?.[0]?.isExternal).toBe(true);
    });
});
