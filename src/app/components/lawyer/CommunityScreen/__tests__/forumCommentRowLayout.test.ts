import { describe, expect, it } from 'vitest';

import { forumCommentRowIndentClass, forumCommentRowThreadClass } from '../forumCommentRowLayout';

describe('forumCommentRowLayout', () => {
    it('يحدّد إزاحة الخيط حسب العمق', () => {
        expect(forumCommentRowIndentClass(0)).toBe('');
        expect(forumCommentRowIndentClass(1)).toBe('mr-8');
        expect(forumCommentRowIndentClass(2)).toBe('mr-16');
        expect(forumCommentRowIndentClass(3)).toBe('mr-24');
        expect(forumCommentRowThreadClass(0)).toBe('');
        expect(forumCommentRowThreadClass(1)).toContain('border-r-2');
    });
});
