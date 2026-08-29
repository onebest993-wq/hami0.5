import { describe, expect, it } from 'vitest';
import { isTaskOnFieldCurtain } from '../fieldCurtain';
import { legalTaskStub as task } from '@/app/services/tasks/__tests__/legalTaskStub';

describe('isTaskOnFieldCurtain', () => {
    it('returns true only when explicitly pinned', () => {
        expect(isTaskOnFieldCurtain(task({ id: '1', title: 'مثبت', pinnedToFieldCurtain: true }))).toBe(true);
        expect(isTaskOnFieldCurtain(task({ id: '2', title: 'موقع', location: 'بغداد' }))).toBe(false);
    });

    it('excludes fatal deadlines even when pinned', () => {
        expect(
            isTaskOnFieldCurtain(
                task({ id: '1', title: 'حتمي', pinnedToFieldCurtain: true, isFatalDeadline: true }),
            ),
        ).toBe(false);
    });
});
