import type { CommunitySection } from '@/app/components/lawyer/CommunityScreen/communitySectionState';

/** FAB «النشر» على التغذية أو داخل مجموعة — لا على دليل المجموعات/المستودع */
export function shouldShowForumFeedPublishFab(
    activeSection: CommunitySection,
    activeGroupId: string | null,
): boolean {
    return activeSection === 'forum' || (activeSection === 'groups' && Boolean(activeGroupId));
}
