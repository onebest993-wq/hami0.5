import { describe, expect, it } from 'vitest';
import type { FileData } from '../lawsuitFileTypes';
import {
    applyLawsuitIndexStatusChange,
    buildLawsuitLifecycleIndex,
    buildLawsuitIndexEntryFromFile,
    emptyLawsuitLifecycleIndex,
    rebuildActiveSegmentInIndex,
    removeLawsuitFromIndex,
} from '@/app/domain/lawsuit/lawsuitLifecycleIndex';

const file = (id: number, status: FileData['status'] = 'active'): FileData => ({
    id,
    type: 'lawsuit',
    status,
    caseNo: `2026/ب/${id}`,
    court: 'بداءة الكرخ',
    parties: [],
    history: [],
    notes: [],
    images: [],
    date: '2026-01-01',
});

describe('lawsuitLifecycleIndex', () => {
    it('buildLawsuitLifecycleIndex counts segments', () => {
        const index = buildLawsuitLifecycleIndex(
            [file(1), file(2)],
            [file(3, 'archived')],
            [file(4, 'deleted')],
        );
        expect(index.counts).toEqual({ active: 2, archived: 1, trash: 1 });
    });

    it('applyLawsuitIndexStatusChange updates counts O(1)', () => {
        const base = buildLawsuitLifecycleIndex([file(1)], [], []);
        const next = applyLawsuitIndexStatusChange(
            base,
            '1',
            'active',
            'archived',
            buildLawsuitIndexEntryFromFile(file(1, 'archived')),
        );
        expect(next.counts).toEqual({ active: 0, archived: 1, trash: 0 });
    });

    it('rebuildActiveSegmentInIndex preserves archived/trash entries', () => {
        const base = buildLawsuitLifecycleIndex([file(1)], [file(2, 'archived')], [file(3, 'deleted')]);
        const next = rebuildActiveSegmentInIndex(base, [file(4)]);
        expect(next.counts).toEqual({ active: 1, archived: 1, trash: 1 });
        expect(next.entries['2']?.status).toBe('archived');
        expect(next.entries['3']?.status).toBe('deleted');
    });

    it('removeLawsuitFromIndex decrements trash count', () => {
        const base = buildLawsuitLifecycleIndex([], [], [file(1, 'deleted')]);
        const next = removeLawsuitFromIndex(base, 1);
        expect(next.counts.trash).toBe(0);
        expect(next.entries['1']).toBeUndefined();
    });

    it('emptyLawsuitLifecycleIndex starts at zero', () => {
        expect(emptyLawsuitLifecycleIndex().counts).toEqual({
            active: 0,
            archived: 0,
            trash: 0,
        });
    });
});
