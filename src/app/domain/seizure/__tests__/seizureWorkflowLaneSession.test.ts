import { describe, expect, it } from 'vitest';
import {
    readSeizureWorkflowLaneSession,
    writeSeizureWorkflowLaneSession,
} from '@/app/domain/seizure/seizureWorkflowLaneSession';

describe('seizureWorkflowLaneSession', () => {
    it('يحفظ ويقرأ مسار الخطوة الثانية', () => {
        writeSeizureWorkflowLaneSession('movable:test-1', 'auction');
        expect(readSeizureWorkflowLaneSession('movable:test-1')).toBe('auction');
        writeSeizureWorkflowLaneSession('movable:test-1', null);
        expect(readSeizureWorkflowLaneSession('movable:test-1')).toBeNull();
    });
});
