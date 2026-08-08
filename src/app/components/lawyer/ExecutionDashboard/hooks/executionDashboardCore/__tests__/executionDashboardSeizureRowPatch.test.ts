import { describe, expect, it } from 'vitest';
import type { SeizedAsset } from '@/app/types/execution';
import {
    buildSeizureAssetRowReleasePatch,
    mapSeizedAssetReleased,
    mapSeizedAssetReleaseUndone,
    resolveCoerciveActionsAfterRelease,
    resolveCoerciveActionsAfterReleaseUndo,
} from '../executionDashboardSeizureRowPatch';

const salaryAsset = {
    id: 'a1',
    type: '💼 حجز الراتب',
    status: 'seized',
    details: { seizureUiKind: 'salary', decisionRowId: 'd1' },
} as SeizedAsset;

describe('executionDashboardSeizureRowPatch', () => {
    it('mapSeizedAssetReleased locks row and strips decorators', () => {
        const { cleanedType, nextAsset } = mapSeizedAssetReleased(salaryAsset, '2026-06-26');
        expect(cleanedType).toBe('💼 حجز الراتب');
        expect(nextAsset.status).toBe('released');
        expect(nextAsset.seizure_record_locked).toBe(true);
        expect(nextAsset.released_at_ymd).toBe('2026-06-26');
    });

    it('mapSeizedAssetReleaseUndone restores seized state', () => {
        const released = {
            ...salaryAsset,
            status: 'released',
            seizure_record_locked: true,
            released_at_ymd: '2026-06-26',
        } as SeizedAsset;
        const { nextAsset } = mapSeizedAssetReleaseUndone(released);
        expect(nextAsset.status).toBe('seized');
        expect(nextAsset.seizure_record_locked).toBe(false);
        expect(nextAsset.released_at_ymd).toBeNull();
    });

    it('resolveCoerciveActionsAfterRelease removes salary key', () => {
        expect(resolveCoerciveActionsAfterRelease(['salary', 'travel'], salaryAsset)).toEqual(['travel']);
    });

    it('resolveCoerciveActionsAfterReleaseUndo re-adds salary key', () => {
        expect(resolveCoerciveActionsAfterReleaseUndo(['travel'], salaryAsset)).toEqual(['travel', 'salary']);
    });

    it('buildSeizureAssetRowReleasePatch returns next assets and timeline event', () => {
        const patch = buildSeizureAssetRowReleasePatch(
            [salaryAsset],
            salaryAsset,
            ['salary', 'travel'],
            '2026-06-26',
            () => 'timeline-1',
        );
        expect(patch).not.toBeNull();
        expect(patch?.nextAssets[0].status).toBe('released');
        expect(patch?.nextActiveCoerciveActions).toEqual(['travel']);
        expect(patch?.timelineEvent.id).toBe('timeline-1');
        expect(patch?.timelineEvent.title).toContain('فك حجز');
    });

    it('buildSeizureAssetRowReleasePatch returns null when row is locked', () => {
        const locked = { ...salaryAsset, seizure_record_locked: true } as SeizedAsset;
        expect(
            buildSeizureAssetRowReleasePatch([locked], locked, [], '2026-06-26', () => 't1'),
        ).toBeNull();
    });
});
