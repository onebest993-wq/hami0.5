import { describe, expect, it } from 'vitest';
import {
    parseWorkCloudCheckpointPayload,
} from '@/app/services/cloud/workCloudCheckpoint';

describe('parseWorkCloudCheckpointPayload', () => {
    it('يرفض الحمولة بلا إصدار', () => {
        expect(parseWorkCloudCheckpointPayload({ lawsuits: [] })).toBeNull();
    });

    it('يقبل نقطة العمل v1', () => {
        const parsed = parseWorkCloudCheckpointPayload({
            v: 1,
            savedAt: '2026-08-29T12:00:00.000Z',
            lawsuits: [{ id: 'a' }],
            execution: [],
            notes: [{ id: 'n' }],
        });
        expect(parsed).toEqual({
            v: 1,
            savedAt: '2026-08-29T12:00:00.000Z',
            lawsuits: [{ id: 'a' }],
            execution: [],
            notes: [{ id: 'n' }],
        });
    });
});
