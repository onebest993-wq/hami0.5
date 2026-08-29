export type HqUserStatusFilter =
    | 'all'
    | 'active'
    | 'frozen'
    | 'pending'
    | 'unsubmitted'
    | 'rejected'
    | 'locked'
    | 'deleted'
    | 'name_mismatch';
export type HqUserRoleFilter = 'all' | 'lawyer' | 'moderator' | 'admin';
export type HqUserCreatedFilter = 'all' | '24h' | '7d';

export const HQ_DIRECTORY_PAGE_SIZE = 50;
export const HQ_DIRECTORY_OFFSET_MAX = 50_000;
export const HQ_DIRECTORY_SCAN_CAP = 8_000;
export const HQ_DIRECTORY_SCAN_BATCH = 200;
export const HQ_DIRECTORY_QUERY_MAX = 80;
export const HEADQUARTERS_NOTIFY_RECIPIENT_CAP = 20_000;
export const HEADQUARTERS_NOTIFY_RECIPIENT_PAGE = 500;

const STATUS: readonly HqUserStatusFilter[] = [
    'all',
    'active',
    'frozen',
    'pending',
    'unsubmitted',
    'rejected',
    'locked',
    'deleted',
    'name_mismatch',
];
const ROLE: readonly HqUserRoleFilter[] = ['all', 'lawyer', 'moderator', 'admin'];
const CREATED: readonly HqUserCreatedFilter[] = ['all', '24h', '7d'];

export type HqDirectoryListQuery = {
    q: string;
    status: HqUserStatusFilter;
    role: HqUserRoleFilter;
    created: HqUserCreatedFilter;
    offset: number;
    limit: number;
    includeId: string;
};

export type HqDirectoryListResult = {
    users: import('@/app/domain/admin/AdminUser').AdminUser[];
    matched: number;
    usersTotal: number;
    offset: number;
    limit: number;
    hasMore: boolean;
    matchedExact: boolean;
    capped: boolean;
};

export const EMPTY_HQ_DIRECTORY_QUERY: HqDirectoryListQuery = {
    q: '',
    status: 'all',
    role: 'all',
    created: 'all',
    offset: 0,
    limit: HQ_DIRECTORY_PAGE_SIZE,
    includeId: '',
};

export function needsHqDirectoryPresenceScan(status: HqUserStatusFilter): boolean {
    return (
        status === 'active' ||
        status === 'pending' ||
        status === 'unsubmitted' ||
        status === 'rejected' ||
        status === 'name_mismatch'
    );
}

function clampInt(raw: unknown, fallback: number, min: number, max: number): number {
    const n = typeof raw === 'number' ? raw : Number.parseInt(String(raw ?? ''), 10);
    if (!Number.isFinite(n)) return fallback;
    return Math.min(max, Math.max(min, Math.floor(n)));
}

function asStatus(raw: unknown): HqUserStatusFilter {
    const v = String(raw ?? '').trim() as HqUserStatusFilter;
    return STATUS.includes(v) ? v : 'all';
}

function asRole(raw: unknown): HqUserRoleFilter {
    const v = String(raw ?? '').trim() as HqUserRoleFilter;
    return ROLE.includes(v) ? v : 'all';
}

function asCreated(raw: unknown): HqUserCreatedFilter {
    const v = String(raw ?? '').trim() as HqUserCreatedFilter;
    return CREATED.includes(v) ? v : 'all';
}

export function parseHqDirectoryListQuery(params: {
    get: (key: string) => string | null;
}): HqDirectoryListQuery {
    const q = String(params.get('q') ?? '')
        .trim()
        .slice(0, HQ_DIRECTORY_QUERY_MAX);
    const limit = clampInt(params.get('limit'), HQ_DIRECTORY_PAGE_SIZE, 1, HQ_DIRECTORY_PAGE_SIZE);
    const offset = clampInt(params.get('offset'), 0, 0, HQ_DIRECTORY_OFFSET_MAX);
    const includeId = String(params.get('include') ?? '').trim();
    return {
        q,
        status: asStatus(params.get('status')),
        role: asRole(params.get('role')),
        created: asCreated(params.get('created')),
        offset,
        limit,
        includeId,
    };
}

export function hqDirectorySearchParams(query: HqDirectoryListQuery): string {
    const sp = new URLSearchParams();
    if (query.q) sp.set('q', query.q);
    if (query.status !== 'all') sp.set('status', query.status);
    if (query.role !== 'all') sp.set('role', query.role);
    if (query.created !== 'all') sp.set('created', query.created);
    if (query.offset > 0) sp.set('offset', String(query.offset));
    if (query.limit !== HQ_DIRECTORY_PAGE_SIZE) sp.set('limit', String(query.limit));
    if (query.includeId) sp.set('include', query.includeId);
    const qs = sp.toString();
    return qs ? `/api/admin/users?${qs}` : '/api/admin/users';
}
