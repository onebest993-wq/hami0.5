import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import {
    isForumAddQuestionFilePickerGraceActive,
    markForumAddQuestionFilePickerOpening,
    resetForumAddQuestionFilePickerGraceForTests,
} from '../forumAddQuestionFilePickerGrace';

describe('forumAddQuestionFilePickerGrace', () => {
    beforeEach(() => {
        vi.useFakeTimers();
        resetForumAddQuestionFilePickerGraceForTests();
    });

    afterEach(() => {
        vi.useRealTimers();
    });

    it('activates grace window after opening picker', () => {
        expect(isForumAddQuestionFilePickerGraceActive()).toBe(false);
        markForumAddQuestionFilePickerOpening();
        expect(isForumAddQuestionFilePickerGraceActive()).toBe(true);
        vi.advanceTimersByTime(3_100);
        expect(isForumAddQuestionFilePickerGraceActive()).toBe(false);
    });
});
