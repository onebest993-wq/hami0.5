import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
    isTasksDatePickerGraceActive,
    markTasksDatePickerOpening,
} from '@/app/components/lawyer/dashboard/tasksManager/tasksDatePickerGrace';

describe('tasksDatePickerGrace', () => {
    beforeEach(() => {
        vi.useFakeTimers();
    });

    it('is inactive by default', () => {
        expect(isTasksDatePickerGraceActive()).toBe(false);
    });

    it('stays active briefly after markTasksDatePickerOpening', () => {
        markTasksDatePickerOpening();
        expect(isTasksDatePickerGraceActive()).toBe(true);
        vi.advanceTimersByTime(3_999);
        expect(isTasksDatePickerGraceActive()).toBe(true);
        vi.advanceTimersByTime(2);
        expect(isTasksDatePickerGraceActive()).toBe(false);
    });
});
