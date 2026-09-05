import { beforeEach, describe, expect, it, vi } from 'vitest';
import { LazyCoerciveTab } from '../../executionDashboardFollowupTabLazy';
import { buildFollowupModalSnapshotInput } from '../buildFollowupModalSnapshotInput';
import {
    EMPTY_FOLLOWUP_MODAL_SNAPSHOT,
    resolveFollowupModalSnapshotForPaint,
} from '../resolveFollowupModalSnapshotForPaint';
import {
    loadAndCacheFollowupModalSnapshotBuilder,
    resetFollowupModalSnapshotBuilderCacheForTests,
} from '../followupModalSnapshotBuilderCache';

describe('buildFollowupModalSnapshotInput', () => {
    beforeEach(() => {
        resetFollowupModalSnapshotBuilderCacheForTests();
    });

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

    it('لا يبني كيس المحضر بينما النافذة مغلقة', () => {
        const closed = resolveFollowupModalSnapshotForPaint(false, {
            LazyCoerciveTab,
            unifiedModalTab: 'personal',
            followupModalChipTablistRef: { current: null },
        });
        expect(closed).toBe(EMPTY_FOLLOWUP_MODAL_SNAPSHOT);
        expect(closed.CoerciveTab).toBeUndefined();
        expect(closed.unifiedModalTab).toBeUndefined();
    });

    it('يعيد كيس فارغ عند الفتح قبل اكتمال تسخين البنّاء', () => {
        const open = resolveFollowupModalSnapshotForPaint(true, {
            LazyCoerciveTab,
            unifiedModalTab: 'personal',
            followupModalChipTablistRef: { current: null },
        });
        expect(open).toBe(EMPTY_FOLLOWUP_MODAL_SNAPSHOT);
    });

    it('يبني الكيس الكامل في نفس الدورة بعد تسخين البنّاء', async () => {
        await loadAndCacheFollowupModalSnapshotBuilder();
        const open = resolveFollowupModalSnapshotForPaint(true, {
            LazyCoerciveTab,
            unifiedModalTab: 'personal',
            followupModalChipTablistRef: { current: null },
        });
        expect(open).not.toBe(EMPTY_FOLLOWUP_MODAL_SNAPSHOT);
        expect(open.CoerciveTab).toBe(LazyCoerciveTab);
        expect(open.unifiedModalTab).toBe('personal');
    });
});
