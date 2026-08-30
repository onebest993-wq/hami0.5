import {
    HQ_DIRECTORY_PAGE_SIZE as HQ_DIRECTORY_PAGE_SIZE_CANON,
    HQ_DIRECTORY_QUERY_MAX,
    type HqUserCreatedFilter,
    type HqUserRoleFilter,
    type HqUserStatusFilter,
} from '@/app/domain/admin/hqDirectoryQuery';

export type { HqUserCreatedFilter, HqUserRoleFilter, HqUserStatusFilter };
export {
    foldHqUserSearchText,
    matchesHqUserCreatedFilter,
    matchesHqUserQuery,
    matchesHqUserStatusFilter,
} from '@/app/domain/admin/hqDirectoryMatch';

/** سقف أمان قديم — الدليل يُصفَّح بدل قطع صامت بعد هذا العدد */
export const HQ_DIRECTORY_RENDER_CAP = 250;
export const HQ_DIRECTORY_PAGE_SIZE = HQ_DIRECTORY_PAGE_SIZE_CANON;
export const HQ_USER_QUERY_MAX = HQ_DIRECTORY_QUERY_MAX;
