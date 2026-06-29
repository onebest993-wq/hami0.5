import { describe, expect, it } from 'vitest';
import { buildExecutionShareCatalog, buildLawsuitShareCatalog } from '../caseShareCatalogBuilder';
import { resolveVisibleCatalog, DEFAULT_SECTION_VISIBILITY } from '../caseShareVisibility';
import type { FileData } from '@/app/components/lawyer/LawyerShared';

describe('caseShareCatalogBuilder', () => {
    it('builds sections for notes, timeline, and documents', () => {
        const file = {
            id: 1,
            caseNo: '100/2024',
            court: 'محكمة الرصافة',
            parties: [{ id: 1, name: 'علي', role: 'مدعي', isClient: true }],
            notes: [{ id: 10, text: 'ملاحظة سرية', meta: 'مهمة', stageCtx: 'ابتدائي', date: '2024' }],
            images: [{ url: 'x', name: 'عقد.pdf' }],
            stages: [
                {
                    stageName: 'ابتدائي',
                    timeline: [
                        {
                            id: 'ev1',
                            type: 'appointment',
                            date: '2024-01-01',
                            title: 'جلسة',
                            details: 'مرافعة',
                        },
                    ],
                },
            ],
        } as unknown as FileData;

        const catalog = buildLawsuitShareCatalog(file);
        expect(catalog.some((s) => s.key === 'notes')).toBe(true);
        expect(catalog.some((s) => s.key === 'timeline')).toBe(true);
        expect(catalog.some((s) => s.key === 'documents')).toBe(true);
    });

    it('buildExecutionShareCatalog always exposes execution consult sections', () => {
        const catalog = buildExecutionShareCatalog({ id: 'exec-1', notes: [] } as never);
        expect(catalog).toHaveLength(7);
        expect(catalog.map((s) => s.key)).toEqual([
            'followup',
            'decisions',
            'notes',
            'appointments',
            'documents',
            'timeline',
            'financial',
        ]);
    });

    it('resolveVisibleCatalog hides picked items', () => {
        const catalog = buildLawsuitShareCatalog({
            id: 1,
            caseNo: '1',
            court: 'c',
            parties: [],
            notes: [
                { id: 1, text: 'a', meta: 'n1', stageCtx: '', date: '' },
                { id: 2, text: 'b', meta: 'n2', stageCtx: '', date: '' },
            ],
            images: [],
        } as unknown as FileData);

        const visible = resolveVisibleCatalog(
            catalog,
            { ...DEFAULT_SECTION_VISIBILITY, notes: 'pick' },
            ['note:1'],
        );
        const notes = visible.find((s) => s.key === 'notes');
        expect(notes?.items.some((i) => i.id === 'note:1')).toBe(false);
        expect(notes?.items.some((i) => i.id === 'note:2')).toBe(true);
    });
});
