import { describe, expect, it, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useUrgentQuickLog } from '../useUrgentQuickLog';
import type { UrgentCase } from '../../../Component_Urgent_Card';

function makeCase(id: string): UrgentCase {
    return {
        id,
        type: 'state_order',
        actionType: 'أمر ولائي',
        applicantName: 'أحمد',
        court: 'محكمة',
        createdAt: new Date().toISOString(),
        phase: 'grievance_window',
        status: 'safe',
    } as UrgentCase;
}

describe('useUrgentQuickLog', () => {
    it('confirms notification and recomputes status', () => {
        let cases = [makeCase('c1')];
        const pendingRef = { current: false };
        const setCases = vi.fn((updater: (prev: UrgentCase[]) => UrgentCase[]) => {
            cases = updater(cases);
        });

        const { result } = renderHook(() => useUrgentQuickLog(cases, setCases, pendingRef));

        act(() => {
            result.current.handleQuickAction('notification', 'c1');
        });
        expect(result.current.quickLogModal.isOpen).toBe(true);

        act(() => {
            result.current.handleQuickLogSubmit({});
        });

        expect(cases[0]?.isNotificationConfirmed).toBe(true);
        expect(pendingRef.current).toBe(true);
        expect(result.current.quickLogModal.isOpen).toBe(false);
    });
});
