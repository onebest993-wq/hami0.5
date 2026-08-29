import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useOrderFilePersist } from '../useOrderFilePersist';

const patchCase = vi.fn(async () => undefined);

vi.mock('@/app/services/urgent-actions-db', () => ({
    UrgentActionsDB: {
        patchCase: (...args: unknown[]) => patchCase(...args),
    },
    uuidv4: () => 'evt-test-id',
}));

describe('useOrderFilePersist single-writer', () => {
    beforeEach(() => {
        patchCase.mockClear();
        vi.useFakeTimers();
    });

    afterEach(() => {
        vi.useRealTimers();
    });

    it('does not call patchCase when onCaseUpdated owns list persistence', () => {
        const onCaseUpdated = vi.fn();
        const setCaseData = vi.fn();
        const setCaseEvents = vi.fn();

        const { result } = renderHook(() =>
            useOrderFilePersist({
                caseId: 'case-1',
                userId: 'user-1',
                caseEvents: [],
                setCaseEvents,
                setCaseData,
                onCaseUpdated,
            }),
        );

        act(() => {
            result.current.persistAndMerge({ court: 'محكمة' });
            result.current.persistPatch({ status: 'safe' });
        });

        act(() => {
            vi.advanceTimersByTime(1000);
        });

        expect(onCaseUpdated).toHaveBeenCalledWith('case-1', { court: 'محكمة' });
        expect(patchCase).not.toHaveBeenCalled();
    });

    it('flushPersistPatch mirrors to onCaseUpdated instead of patchCase', async () => {
        const onCaseUpdated = vi.fn();
        const setCaseData = vi.fn();
        const setCaseEvents = vi.fn();

        const { result } = renderHook(() =>
            useOrderFilePersist({
                caseId: 'case-1',
                userId: 'user-1',
                caseEvents: [],
                setCaseEvents,
                setCaseData,
                onCaseUpdated,
            }),
        );

        await act(async () => {
            await result.current.flushPersistPatch({ judgeDecision: 'partially_accepted' });
        });

        expect(onCaseUpdated).toHaveBeenCalledWith('case-1', { judgeDecision: 'partially_accepted' });
        expect(patchCase).not.toHaveBeenCalled();
    });

    it('calls patchCase when there is no onCaseUpdated mirror', async () => {
        const setCaseData = vi.fn();
        const setCaseEvents = vi.fn();

        const { result } = renderHook(() =>
            useOrderFilePersist({
                caseId: 'case-1',
                userId: 'user-1',
                caseEvents: [],
                setCaseEvents,
                setCaseData,
            }),
        );

        act(() => {
            result.current.persistAndMerge({ court: 'محكمة' });
        });

        await act(async () => {
            vi.advanceTimersByTime(1000);
        });

        expect(patchCase).toHaveBeenCalledWith('user-1', 'case-1', { court: 'محكمة' });
    });

    it('flushes queued patchCase on unmount so a closed dossier is not lost', async () => {
        const setCaseData = vi.fn();
        const setCaseEvents = vi.fn();

        const { result, unmount } = renderHook(() =>
            useOrderFilePersist({
                caseId: 'case-1',
                userId: 'user-1',
                caseEvents: [],
                setCaseEvents,
                setCaseData,
            }),
        );

        act(() => {
            result.current.persistAndMerge({ court: 'محكمة' });
        });

        unmount();

        await Promise.resolve();
        expect(patchCase).toHaveBeenCalledWith('user-1', 'case-1', { court: 'محكمة' });
    });
});
