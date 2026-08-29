/** ارتفاع حالة المستودع/المجموعات الفارغة — يُستخدم أيضاً أثناء التحميل الكسول حتى لا ينهار القسم */
export const FORUM_LAZY_SECTION_MIN_HEIGHT_CLASS = 'min-h-[min(40vh,22rem)]';

export function forumLazySectionPaneClass(active: boolean): string {
    return active ? `block ${FORUM_LAZY_SECTION_MIN_HEIGHT_CLASS}` : 'hidden';
}

export function shouldMountForumLazySection(mounted: boolean, sectionActive: boolean): boolean {
    return mounted || sectionActive;
}
