import { describe, expect, it } from 'vitest';
import { renderHook } from '@testing-library/react';
import {
    collectShellOverlayIntentBags,
    isLocalShellOverlayOpen,
    useExecutionDashboardCoreScopeOverlaySignals,
} from '../useExecutionDashboardCoreScopeOverlaySignals';
import type { ExecutionModalFlags } from '../buildExecutionDashboardModalScope';

const emptyFlags = {} as ExecutionModalFlags;

describe('shell overlay intent — party edit / heirs / death', () => {
    it('isLocalShellOverlayOpen يلتقط editPartyTarget و heirsQuickView و partyDeathModalParty', () => {
        expect(isLocalShellOverlayOpen({ editPartyTarget: { kind: 'debtor', index: 0 } })).toBe(
            true,
        );
        expect(isLocalShellOverlayOpen({ heirsQuickView: { title: 'ورثة', rows: [] } })).toBe(
            true,
        );
        expect(isLocalShellOverlayOpen({ partyDeathModalParty: 'debtor' })).toBe(true);
        expect(isLocalShellOverlayOpen({})).toBe(false);
    });

    it('collectShellOverlayIntentBags يقرأ من partyEditWorkflow و followupOrchestrator عند غياب المفاتيح المسطّحة', () => {
        const bags = collectShellOverlayIntentBags(
            {},
            {},
            {
                partyEditWorkflow: {
                    editPartyTarget: { kind: 'debtor', index: 0 },
                    heirsQuickView: null,
                },
                followupOrchestrator: { partyDeathModalParty: null },
            },
        );
        expect(bags.some((b) => isLocalShellOverlayOpen(b))).toBe(true);
    });

    it('overlayIntentUrgent=true عند editPartyTarget داخل assemblyHandlers فقط (لا SCOPE flat)', () => {
        const { result } = renderHook(() =>
            useExecutionDashboardCoreScopeOverlaySignals({
                scopeLocalFlat: {},
                scopeRestFlat: {},
                executionModalFlags: emptyFlags,
                assemblyHandlers: {
                    editPartyTarget: { kind: 'debtor', index: 0 },
                },
            }),
        );
        expect(result.current.overlayIntentUrgent).toBe(true);
        expect(result.current.shellOverlayStateToken).toContain('ep:1');
    });

    it('overlayIntentUrgent=true عند heirsQuickView داخل partyEditWorkflow', () => {
        const { result } = renderHook(() =>
            useExecutionDashboardCoreScopeOverlaySignals({
                scopeLocalFlat: {},
                scopeRestFlat: {},
                executionModalFlags: emptyFlags,
                assemblyHandlers: {
                    partyEditWorkflow: {
                        heirsQuickView: { title: 'ورثة المدين', rows: [{ name: 'أ' }] },
                    },
                },
            }),
        );
        expect(result.current.overlayIntentUrgent).toBe(true);
        expect(result.current.shellOverlayStateToken).toContain('hq:1');
    });

    it('overlayIntentUrgent=true عند partyDeathModalParty داخل followupOrchestrator', () => {
        const { result } = renderHook(() =>
            useExecutionDashboardCoreScopeOverlaySignals({
                scopeLocalFlat: {},
                scopeRestFlat: {},
                executionModalFlags: emptyFlags,
                assemblyHandlers: {
                    followupOrchestrator: { partyDeathModalParty: 'debtor' },
                },
            }),
        );
        expect(result.current.overlayIntentUrgent).toBe(true);
        expect(result.current.shellOverlayStateToken).toContain('pd:1');
    });

    it('overlayIntentUrgent=false عند غياب كل نوايا النوافذ', () => {
        const { result } = renderHook(() =>
            useExecutionDashboardCoreScopeOverlaySignals({
                scopeLocalFlat: {},
                scopeRestFlat: {},
                executionModalFlags: emptyFlags,
                assemblyHandlers: {
                    partyEditWorkflow: { editPartyTarget: null, heirsQuickView: null },
                    followupOrchestrator: { partyDeathModalParty: null },
                },
            }),
        );
        expect(result.current.overlayIntentUrgent).toBe(false);
    });
});
