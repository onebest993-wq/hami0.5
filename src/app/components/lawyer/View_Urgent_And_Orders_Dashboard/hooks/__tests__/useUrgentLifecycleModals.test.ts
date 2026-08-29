import { describe, expect, it, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useUrgentLifecycleModals, DEFAULT_URGENT_ARCHIVE_REASON } from '../useUrgentLifecycleModals';
import type { UrgentCase } from '../../../Component_Urgent_Card';

function makeCase(id: string): UrgentCase {
    return {
        id,
        type: 'urgent_action',
        actionType: 'طلب',
        applicantName: 'اختبار',
        court: 'محكمة',
        createdAt: new Date().toISOString(),
        phase: 'pending',
        status: 'safe',
    } as UrgentCase;
}

describe('useUrgentLifecycleModals', () => {
    it('archives case with default reason when empty', () => {
        let cases = [makeCase('c1')];
        const pendingRef = { current: false };
        const setCases = vi.fn((updater: (prev: UrgentCase[]) => UrgentCase[]) => {
            cases = updater(cases);
        });

        const { result } = renderHook(() =>
            useUrgentLifecycleModals({
                cases,
                setCases,
                pendingCasesPersistRef: pendingRef,
            }),
        );

        act(() => {
            result.current.openArchiveModal('c1', 'manual');
        });
        act(() => {
            result.current.confirmArchive();
        });

        expect(cases[0]?.archived).toBe(true);
        expect(cases[0]?.archivedReason).toBe(DEFAULT_URGENT_ARCHIVE_REASON);
        expect(pendingRef.current).toBe(true);
    });

    it('clears archive flags on unarchive', () => {
        let cases = [{ ...makeCase('c1'), archived: true, archivedAt: '2026-01-01', archivedReason: 'x' } as UrgentCase];
        const pendingRef = { current: false };
        const setCases = vi.fn((updater: (prev: UrgentCase[]) => UrgentCase[]) => {
            cases = updater(cases);
        });

        const { result } = renderHook(() =>
            useUrgentLifecycleModals({
                cases,
                setCases,
                pendingCasesPersistRef: pendingRef,
            }),
        );

        act(() => {
            result.current.unarchiveCase('c1');
        });

        expect(cases[0]?.archived).toBe(false);
        expect(cases[0]?.archivedAt).toBeNull();
        expect(pendingRef.current).toBe(true);
    });
});
