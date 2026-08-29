import { describe, expect, it } from 'vitest';
import { LazyCoerciveTab } from '../../executionDashboardLazyRegistryShell';
import { buildFollowupModalSnapshotInput } from '../buildFollowupModalSnapshotInput';

describe('buildFollowupModalSnapshotInput', () => {
    it('enriches from full chunk scope including lazy tab components', () => {
        const scope = {
            LazyCoerciveTab,
            unifiedModalTab: 'personal',
            followupModalChipTablistRef: { current: null },
        };

        const snapshot = buildFollowupModalSnapshotInput(scope);

        expect(snapshot.CoerciveTab).toBe(LazyCoerciveTab);
        expect(snapshot.followupSpecialization).toBeTruthy();
        expect(Array.isArray(snapshot.effectiveFollowupModalTabs)).toBe(true);
    });
});
