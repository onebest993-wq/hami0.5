import { describe, expect, it } from 'vitest';
import {
    FORUM_LAZY_SECTION_MIN_HEIGHT_CLASS,
    forumLazySectionPaneClass,
    shouldMountForumLazySection,
} from '../forumLazySectionMount';

describe('forumLazySectionMount', () => {
    it('يعطي ارتفاعاً أدنى للقسم النشط حتى لا ينهار أثناء التحميل', () => {
        expect(forumLazySectionPaneClass(true)).toBe(`block ${FORUM_LAZY_SECTION_MIN_HEIGHT_CLASS}`);
        expect(forumLazySectionPaneClass(false)).toBe('hidden');
    });

    it('يثبّت المقطع عند التفعيل فوراً دون انتظار أثر لاحق', () => {
        expect(shouldMountForumLazySection(false, true)).toBe(true);
        expect(shouldMountForumLazySection(true, false)).toBe(true);
        expect(shouldMountForumLazySection(false, false)).toBe(false);
    });
});
