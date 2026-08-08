import { describe, expect, it } from 'vitest';
import { EVICTION_TIMELINE_ACTION_IDS } from '@/app/utils/executionModuleStrategies';
import {
    assertEvictionBranchSubmitAllowed,
    createEmptyEvictionAppealSyncView,
    getEvictionAppealBranchForActionId,
    resolveBreakInventoryWorkflowComplete,
} from '@/app/utils/evictionBranchSignals';
import type { EvictionAppealSyncView } from '@/app/utils/evictionAppealSync';

describe('evictionBranchSignals', () => {
    it('maps timeline action ids to appeal branches', () => {
        expect(getEvictionAppealBranchForActionId(EVICTION_TIMELINE_ACTION_IDS.BREAK_INVENTORY)).toBe(
            'Lock Breaking & Inventory',
        );
        expect(getEvictionAppealBranchForActionId(EVICTION_TIMELINE_ACTION_IDS.CUSTODIAN)).toBe(
            'Judicial Custodian',
        );
    });

    it('blocks submit when appeal sync blocksSubmit', () => {
        const sync: EvictionAppealSyncView = {
            ...createEmptyEvictionAppealSyncView('Lock Breaking & Inventory'),
            blocksSubmit: true,
            followupBlock: { kind: 'pause', message: 'موقوف للتظلم' },
        };
        const result = assertEvictionBranchSubmitAllowed(sync);
        expect(result.ok).toBe(false);
        if (!result.ok) expect(result.message).toContain('موقوف');
    });

    it('allows submit on lifecycle_reset even when blocked', () => {
        const sync: EvictionAppealSyncView = {
            ...createEmptyEvictionAppealSyncView('Field Visit Date'),
            blocked: true,
            followupBlock: { kind: 'lifecycle_reset', message: 'دورة منتهية' },
        };
        expect(assertEvictionBranchSubmitAllowed(sync).ok).toBe(true);
    });

    it('resolveBreakInventoryWorkflowComplete uses governing row', () => {
        const row = {
            id: 'hub-1',
            requestKind: 'eviction_procedure',
            evictionWorkflowKey: 'break_inventory',
            title: 'طلب كسر الأقفال وجرد الأثاث',
            executorOutcome: 'approved',
            breakInventoryFurnitureFinalizedAt: '2026-08-01T00:00:00.000Z',
        };
        expect(
            resolveBreakInventoryWorkflowComplete([row], false),
        ).toBe(true);
    });
});
