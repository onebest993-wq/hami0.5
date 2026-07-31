import { describe, expect, it, vi, beforeEach } from 'vitest';
import {
    CREDITOR_AGENT_ONLY_PERSIST_KEYS,
    guardCreditorAgentMutation,
    isCreditorAgentOnlyBlocked,
    patchTouchesCreditorAgentOnlyKeys,
} from '../executionAgentPrivilege';
import {
    readScopedDeviceStorageItem,
    scopeExecutionDeviceStorageKey,
} from '@/app/utils/executionDeviceStorageScope';
import { setLiveAuthUserId } from '@/app/utils/liveAuthUserId';

vi.mock('@/app/utils/authStorage', () => ({
    readPersistedSupabaseAuth: () => ({ user: null, session: null }),
    readDevMockUser: () => null,
}));

describe('executionAgentPrivilege', () => {
    it('blocks creditor-only mutations for debtor agent', () => {
        expect(isCreditorAgentOnlyBlocked(true)).toBe(true);
        expect(isCreditorAgentOnlyBlocked(false)).toBe(false);
        const showToast = vi.fn();
        expect(
            guardCreditorAgentMutation({
                isRepresentingDebtor: true,
                showToast,
                actionLabel: 'التسديد',
            }),
        ).toBe(false);
        expect(showToast).toHaveBeenCalled();
        expect(
            guardCreditorAgentMutation({
                isRepresentingDebtor: false,
                showToast,
            }),
        ).toBe(true);
    });

    it('detects creditor-only persist keys', () => {
        expect(patchTouchesCreditorAgentOnlyKeys({ paidDebt: 100 })).toBe(true);
        expect(patchTouchesCreditorAgentOnlyKeys({ seizedAssets: [] })).toBe(true);
        expect(patchTouchesCreditorAgentOnlyKeys({ seizureDraftsByDecisionId: {} })).toBe(true);
        expect(patchTouchesCreditorAgentOnlyKeys({ timelineEvents: [] })).toBe(false);
        expect(patchTouchesCreditorAgentOnlyKeys({ is_creditor_deceased: true })).toBe(false);
        expect(patchTouchesCreditorAgentOnlyKeys({ caseNotesLog: [] })).toBe(false);
    });

    it('does not treat activeCoerciveActions as creditor-only persist key', () => {
        expect(CREDITOR_AGENT_ONLY_PERSIST_KEYS).not.toContain('activeCoerciveActions');
        expect(patchTouchesCreditorAgentOnlyKeys({ activeCoerciveActions: [] })).toBe(false);
    });
});

describe('executionDeviceStorageScope', () => {
    beforeEach(() => {
        setLiveAuthUserId(null);
    });

    it('keeps base key when no user session', () => {
        expect(scopeExecutionDeviceStorageKey('hami:test:1')).toBe('hami:test:1');
    });

    it('scopes key with live auth user id', () => {
        setLiveAuthUserId('user-9');
        expect(scopeExecutionDeviceStorageKey('hami:test:1')).toBe('hami:test:1:u:user-9');
    });

    it('reads scoped first then legacy', () => {
        setLiveAuthUserId('user-9');
        const store: Record<string, string> = {
            'hami:test:1': 'legacy',
        };
        expect(
            readScopedDeviceStorageItem((k) => store[k] ?? null, 'hami:test:1'),
        ).toBe('legacy');
        store['hami:test:1:u:user-9'] = 'scoped';
        expect(
            readScopedDeviceStorageItem((k) => store[k] ?? null, 'hami:test:1'),
        ).toBe('scoped');
    });
});
