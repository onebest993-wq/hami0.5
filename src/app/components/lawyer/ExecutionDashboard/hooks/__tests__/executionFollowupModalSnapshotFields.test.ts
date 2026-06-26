import { describe, expect, it } from 'vitest';
import { assignExecutionFollowupModalSnapshotScope } from '../executionFollowupModalSnapshotFields';

describe('assignExecutionFollowupModalSnapshotScope', () => {
    it('copies followup snapshot fields including refs into chunk scope', () => {
        const chipRef = { current: null as HTMLDivElement | null };
        const sectionRef = { current: null as HTMLDivElement | null };
        const target: Record<string, unknown> = {};
        assignExecutionFollowupModalSnapshotScope(target, {
            followupModalChipTablistRef: chipRef,
            followupModalSectionTabsRef: sectionRef,
            unifiedModalTab: 'seizure_requests',
            noise: 'ignored',
        });
        expect(target.followupModalChipTablistRef).toBe(chipRef);
        expect(target.followupModalSectionTabsRef).toBe(sectionRef);
        expect(target.unifiedModalTab).toBe('seizure_requests');
        expect(target.noise).toBeUndefined();
    });
});
