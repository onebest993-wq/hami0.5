import type { AdminTabId } from '@/app/components/admin/hqTabs';
import type {
    HqUserCreatedFilter,
    HqUserRoleFilter,
    HqUserStatusFilter,
} from '@/app/components/admin/hqUserFilters';

export type { HqUserCreatedFilter } from '@/app/components/admin/hqUserFilters';

export type HqVerificationFilter = 'pending' | 'active' | 'rejected' | 'all';
export type HqForumTab = 'stats' | 'posts' | 'bans';
export type HqForumPostKind = 'all' | 'pinned' | 'locked';
export type HqReportFocus = 'all' | 'posts' | 'comments';

export type HqJumpOpts = {
    userStatus?: HqUserStatusFilter;
    userRole?: HqUserRoleFilter;
    userId?: string;
    userCreated?: HqUserCreatedFilter;
    verificationStatus?: HqVerificationFilter;
    forumTab?: HqForumTab;
    forumPostKind?: HqForumPostKind;
    reportFocus?: HqReportFocus;
};

export type HqJumpHandler = (tab: AdminTabId, opts?: HqJumpOpts) => void;
