import { describe, expect, it, vi } from 'vitest';
import {
    ensureMovableInList,
    saveMovableMarkInline,
    type MovableInlineSaveContext,
} from '../movableSeizureInlinePersistence';

describe('movableSeizureInlinePersistence', () => {
    it('ensureMovableInList adds optimistic row when list is stale', () => {
        const movable = {
            id: 'sm_d1',
            decisionRowId: 'd1',
            movableDescription: 'سيارة',
            movableLocation: 'بغداد',
            judicialCustodianName: 'حارس',
            status: 'seized',
        } as never;
        const list = ensureMovableInList([], movable);
        expect(list).toHaveLength(1);
        expect(list[0].id).toBe('sm_d1');
    });

    it('saveMovableMarkInline persists when movable only exists in optimistic row', () => {
        const movable = {
            id: 'sm_d1',
            decisionRowId: 'd1',
            movableDescription: 'سيارة',
            movableLocation: 'بغداد',
            judicialCustodianName: 'حارس',
            status: 'seized',
        } as never;
        const persistMovables = vi.fn(() => true);
        const ctx: MovableInlineSaveContext = {
            dossierId: 'ex-1',
            showToast: vi.fn(),
            persistMovables,
            readMovables: () => [],
            pushTimeline: vi.fn(),
            nextTimelineId: () => 'tl-1',
        };
        const ok = saveMovableMarkInline(
            ensureMovableInList([], movable),
            'sm_d1',
            { letterNo: '123', ymd: '2026-08-04', entity: 'مديرية' },
            ctx,
        );
        expect(ok).toBe(true);
        expect(persistMovables).toHaveBeenCalled();
        const saved = persistMovables.mock.calls[0][0][0];
        expect(saved.seizureMarkLetterNumber).toBe('123');
    });

    it('treats persist result undefined as success (legacy handlers)', () => {
        const movable = {
            id: 'sm_d1',
            decisionRowId: 'd1',
            movableDescription: 'سيارة',
            movableLocation: 'بغداد',
            judicialCustodianName: 'حارس',
            status: 'seized',
        } as never;
        const persistMovables = vi.fn(() => undefined);
        const ctx: MovableInlineSaveContext = {
            dossierId: 'ex-1',
            showToast: vi.fn(),
            persistMovables,
            readMovables: () => [],
            pushTimeline: vi.fn(),
            nextTimelineId: () => 'tl-1',
        };
        const ok = saveMovableMarkInline(
            ensureMovableInList([], movable),
            'sm_d1',
            { letterNo: '123', ymd: '2026-08-04', entity: 'مديرية' },
            ctx,
        );
        expect(ok).toBe(true);
    });
});
