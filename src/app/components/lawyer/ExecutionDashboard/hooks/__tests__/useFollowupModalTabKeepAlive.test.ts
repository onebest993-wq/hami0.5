import { describe, expect, it } from 'vitest';
import { resolveFollowupActivePanelKey, resolveActiveFollowupChipTabId } from '../../followupTabKeepAlive';

describe('resolveFollowupActivePanelKey', () => {
    it('maps personal tab to personal panel when coercive followup is shown', () => {
        expect(
            resolveFollowupActivePanelKey({
                unifiedModalTab: 'personal',
                showPersonalCoerciveFollowupTab: true,
            }),
        ).toBe('personal');
    });

    it('maps personal tab to coercive panel when personal followup is hidden', () => {
        expect(
            resolveFollowupActivePanelKey({
                unifiedModalTab: 'personal',
                showPersonalCoerciveFollowupTab: false,
            }),
        ).toBe('coercive');
    });

    it('passes through standard tabs', () => {
        expect(
            resolveFollowupActivePanelKey({
                unifiedModalTab: 'seizure_requests',
                showPersonalCoerciveFollowupTab: true,
            }),
        ).toBe('seizure_requests');
    });
});

describe('resolveActiveFollowupChipTabId', () => {
    it('highlights coercive chip when personal tab is legacy-routed', () => {
        expect(
            resolveActiveFollowupChipTabId({
                unifiedModalTab: 'personal',
                showPersonalCoerciveFollowupTab: false,
            }),
        ).toBe('coercive');
    });

    it('highlights personal chip when unlocked', () => {
        expect(
            resolveActiveFollowupChipTabId({
                unifiedModalTab: 'personal',
                showPersonalCoerciveFollowupTab: true,
            }),
        ).toBe('personal');
    });

    it('redirects legacy financial tab to seizure_requests panel key', () => {
        expect(
            resolveFollowupActivePanelKey({
                unifiedModalTab: 'financial',
                showPersonalCoerciveFollowupTab: true,
                hideFollowupCoerciveTab: false,
            }),
        ).toBe('seizure_requests');
    });

    it('redirects legacy special tab to admin chip', () => {
        expect(
            resolveActiveFollowupChipTabId({
                unifiedModalTab: 'special',
                showPersonalCoerciveFollowupTab: true,
            }),
        ).toBe('admin');
    });
});
