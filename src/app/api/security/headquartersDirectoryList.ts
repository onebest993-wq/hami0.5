import type { SupabaseClient } from '@supabase/supabase-js';
import type { AdminUser } from '@/app/domain/admin/AdminUser';
import {
    EMPTY_HQ_DIRECTORY_QUERY,
    HEADQUARTERS_NOTIFY_RECIPIENT_CAP,
    HEADQUARTERS_NOTIFY_RECIPIENT_PAGE,
    HQ_DIRECTORY_SCAN_BATCH,
    HQ_DIRECTORY_SCAN_CAP,
    needsHqDirectoryPresenceScan,
    type HqDirectoryListQuery,
    type HqDirectoryListResult,
} from '@/app/domain/admin/hqDirectoryQuery';
import {
    matchesHqUserCreatedFilter,
    matchesHqUserQuery,
    matchesHqUserStatusFilter,
} from '@/app/components/admin/hqUserFilters';
import { parseAdminVerificationStatus, resolveHqDirectoryKycStatus } from '@/app/domain/admin/hqUserPresence';
import { isPostgresUuidSubject } from './postgresUuidSubject.ts';
import {
    isHeadquartersAdminRole,
    isHeadquartersProtectedAdminId,
    mapHeadquartersUser,
} from './headquartersUserMap.ts';
import { withHeadquartersProfileColumns } from './headquartersProfileSelect.ts';
import { hqFrozenProfilesOrFilter, hqLoginLockedProfilesOrFilter } from './headquartersStatus.ts';
import { kvReadUserStatusMapByKeys, type HqKvVerificationHint } from './kvStoreAdmin.ts';

type AuthIdentity = {
    email: string;
    fullName: string;
    familyName: string;
    phone: string;
    governorate: string;
    lawyerBarRoom: string;
    appVerificationStatus: ReturnType<typeof parseAdminVerificationStatus>;
};

const EMPTY_AUTH_IDENTITY: AuthIdentity = {
    email: '',
    fullName: '',
    familyName: '',
    phone: '',
    governorate: '',
    lawyerBarRoom: '',
    appVerificationStatus: 'none',
};

type ProfileChain = {
    eq: (column: string, value: string | boolean) => ProfileChain;
    or: (filters: string) => ProfileChain;
    gte: (column: string, value: string) => ProfileChain;
    in: (column: string, values: string[]) => ProfileChain;
    order: (column: string, opts: { ascending: boolean }) => ProfileChain;
    range: (
        from: number,
        to: number,
    ) => Promise<{ data: unknown; error: { message?: string } | null; count?: number | null }>;
};

function escapeIlike(raw: string): string {
    return raw.replace(/\\/g, '\\\\').replace(/[%_,()]/g, ' ').replace(/\s+/g, ' ').trim();
}

function isEmailQuery(q: string): boolean {
    return q.includes('@') && q.length >= 5 && q.length <= 80;
}

function normalizePhoneQuery(q: string): string {
    return q.replace(/[\s-]/g, '');
}

function isPhoneQuery(q: string): boolean {
    const d = normalizePhoneQuery(q);
    return /^0[0-9]{9,11}$/.test(d) || /^\+964[0-9]{8,11}$/.test(d);
}

async function lookupAuthSubjectId(admin: SupabaseClient, q: string): Promise<string | null> {
    try {
        if (isEmailQuery(q)) {
            const { data, error } = await admin.rpc('hq_lookup_auth_email', { p_email: q.trim() });
            const id = String(data ?? '').trim();
            if (!error && isPostgresUuidSubject(id)) return id;
        }
        if (isPhoneQuery(q)) {
            const { data, error } = await admin.rpc('hq_lookup_auth_phone', {
                p_phone: normalizePhoneQuery(q),
            });
            const id = String(data ?? '').trim();
            if (!error && isPostgresUuidSubject(id)) return id;
        }
    } catch {
        /* البحث بالاسم يبقى */
    }
    return null;
}

async function loadPageIdentities(
    admin: SupabaseClient,
    ids: string[],
): Promise<Map<string, AuthIdentity>> {
    const map = new Map<string, AuthIdentity>();
    const uuidIds = ids.filter((id) => isPostgresUuidSubject(id));
    if (uuidIds.length === 0) return map;
    try {
        const { data, error } = await admin.rpc('hq_directory_identities', { p_ids: uuidIds });
        if (error || !Array.isArray(data)) return map;
        for (const row of data) {
            if (!row || typeof row !== 'object') continue;
            const rec = row as Record<string, unknown>;
            const id = String(rec.id ?? '').trim();
            if (!isPostgresUuidSubject(id)) continue;
            map.set(id, {
                email: String(rec.email ?? '').trim(),
                fullName: '',
                familyName: String(rec.family_name ?? '').trim().slice(0, 160),
                phone: String(rec.phone ?? '').trim().slice(0, 20),
                governorate: String(rec.governorate ?? '').trim().slice(0, 40),
                lawyerBarRoom: String(rec.lawyer_bar_room ?? '').trim().slice(0, 80),
                appVerificationStatus: parseAdminVerificationStatus(rec.app_verification_status),
            });
        }
    } catch {
        /* الأسماء على profiles تكفي — البريد يُستكمل في الإضبارة */
    }
    return map;
}

function applySqlDirectoryFilters(
    chain: ProfileChain,
    query: HqDirectoryListQuery,
    nowIso: string,
    pinnedId: string | null,
    nameSearch: boolean,
): ProfileChain {
    let next = chain;
    if (pinnedId) {
        return next.eq('id', pinnedId);
    }
    if (query.role !== 'all') {
        next = next.eq('role', query.role);
    }
    if (query.created === '24h') {
        next = next.gte('created_at', new Date(Date.parse(nowIso) - 24 * 60 * 60 * 1000).toISOString());
    } else if (query.created === '7d') {
        next = next.gte('created_at', new Date(Date.parse(nowIso) - 7 * 24 * 60 * 60 * 1000).toISOString());
    }
    if (query.status === 'deleted') {
        next = next.eq('is_deleted', true);
    } else if (query.status === 'locked') {
        next = next.eq('is_deleted', false).or(hqLoginLockedProfilesOrFilter(nowIso));
    } else if (query.status === 'frozen') {
        next = next.eq('is_deleted', false).or(hqFrozenProfilesOrFilter(nowIso));
    } else if (
        query.status === 'pending' ||
        query.status === 'unsubmitted' ||
        query.status === 'rejected'
    ) {
        next = next.eq('is_deleted', false).eq('role', 'lawyer');
    } else if (query.status === 'active' || query.status === 'name_mismatch') {
        next = next.eq('is_deleted', false);
    }
    const tokens = nameSearch
        ? query.q.split(/\s+/).map(escapeIlike).filter((token) => token.length >= 1)
        : [];
    for (const token of tokens) {
        if (isPostgresUuidSubject(token) || isEmailQuery(token) || isPhoneQuery(token)) continue;
        next = next.or(
            `legal_display_name.ilike.%${token}%,previous_legal_display_name.ilike.%${token}%`,
        );
    }
    return next;
}

async function selectProfilePage(
    admin: SupabaseClient,
    query: HqDirectoryListQuery,
    nowIso: string,
    from: number,
    to: number,
    pinnedId: string | null,
) {
    return withHeadquartersProfileColumns((columns) => {
        const selected = admin.from('profiles').select(columns, { count: 'exact' });
        const filtered = applySqlDirectoryFilters(
            selected as unknown as ProfileChain,
            query,
            nowIso,
            pinnedId,
            columns.includes('legal_display_name'),
        );
        return filtered.order('created_at', { ascending: false }).range(from, to);
    });
}

async function mapProfileRows(
    rows: unknown[],
    identities: Map<string, AuthIdentity>,
    verificationMap: Map<string, HqKvVerificationHint> | null,
): Promise<AdminUser[]> {
    const kvAvailable = verificationMap != null;
    const out: AdminUser[] = [];
    for (const row of rows) {
        if (!row || typeof row !== 'object') continue;
        const id = String((row as { id?: unknown }).id ?? '');
        const identity = identities.get(id) ?? EMPTY_AUTH_IDENTITY;
        const kvHint = verificationMap?.get(id);
        const mapped = mapHeadquartersUser(
            row,
            { ...identity, kycSubmittedName: kvHint?.kycName },
            resolveHqDirectoryKycStatus(kvHint?.status, kvAvailable, identity.appVerificationStatus),
        );
        if (mapped) out.push(mapped);
    }
    return out;
}

function rowMatchesQuery(user: AdminUser, query: HqDirectoryListQuery, nowMs: number): boolean {
    if (!matchesHqUserQuery(user, query.q)) return false;
    if (!matchesHqUserStatusFilter(user, query.status)) return false;
    if (query.role !== 'all' && user.role !== query.role) return false;
    if (!matchesHqUserCreatedFilter(user.createdAt, query.created, nowMs)) return false;
    return true;
}

async function hydrateUsers(
    admin: SupabaseClient,
    rows: unknown[],
): Promise<AdminUser[]> {
    const ids: string[] = [];
    for (const row of rows) {
        if (!row || typeof row !== 'object') continue;
        const id = String((row as { id?: unknown }).id ?? '').trim();
        if (isPostgresUuidSubject(id)) ids.push(id);
    }
    let verificationMap: Map<string, HqKvVerificationHint> | null = new Map();
    try {
        verificationMap = await kvReadUserStatusMapByKeys('lawyer-verification:', ids);
    } catch {
        verificationMap = null;
    }
    const identities = await loadPageIdentities(admin, ids);
    return mapProfileRows(rows, identities, verificationMap);
}

function asRowArray(data: unknown): unknown[] {
    return Array.isArray(data) ? data : [];
}

export async function listHeadquartersUsers(
    admin: SupabaseClient,
    query: HqDirectoryListQuery = EMPTY_HQ_DIRECTORY_QUERY,
): Promise<HqDirectoryListResult> {
    const nowMs = Date.now();
    const nowIso = new Date(nowMs).toISOString();
    let pinnedId: string | null = null;
    if (isPostgresUuidSubject(query.q)) {
        pinnedId = query.q.trim();
    } else if (isEmailQuery(query.q) || isPhoneQuery(query.q)) {
        pinnedId = await lookupAuthSubjectId(admin, query.q);
        if (!pinnedId) {
            const emptyTotal = await countAllProfiles(admin);
            return {
                users: [],
                matched: 0,
                usersTotal: emptyTotal,
                offset: query.offset,
                limit: query.limit,
                hasMore: false,
                matchedExact: true,
                capped: false,
            };
        }
    }

    const scan = needsHqDirectoryPresenceScan(query.status) && !pinnedId;
    const usersTotal = await countAllProfiles(admin);

    if (!scan) {
        const page = await selectProfilePage(
            admin,
            query,
            nowIso,
            query.offset,
            query.offset + query.limit - 1,
            pinnedId,
        );
        if (page.error) {
            throw new Error(page.error.message || 'Failed to list headquarters users');
        }
        const rows = asRowArray(page.data);
        const mapped = await hydrateUsers(admin, rows);
        const users = mapped.filter((user) => rowMatchesQuery(user, query, nowMs));
        const matched = typeof page.count === 'number' ? page.count : query.offset + users.length;
        return {
            users,
            matched,
            usersTotal,
            offset: query.offset,
            limit: query.limit,
            hasMore: query.offset + users.length < matched,
            matchedExact: typeof page.count === 'number',
            capped: false,
        };
    }

    const matches: AdminUser[] = [];
    let scanned = 0;
    let exhausted = false;
    while (scanned < HQ_DIRECTORY_SCAN_CAP && matches.length < query.offset + query.limit) {
        const to = scanned + HQ_DIRECTORY_SCAN_BATCH - 1;
        const batch = await selectProfilePage(admin, query, nowIso, scanned, to, null);
        if (batch.error) {
            throw new Error(batch.error.message || 'Failed to list headquarters users');
        }
        const rows = asRowArray(batch.data);
        if (rows.length === 0) {
            exhausted = true;
            break;
        }
        const mapped = await hydrateUsers(admin, rows);
        for (const user of mapped) {
            if (rowMatchesQuery(user, query, nowMs)) matches.push(user);
        }
        scanned += rows.length;
        if (rows.length < HQ_DIRECTORY_SCAN_BATCH) {
            exhausted = true;
            break;
        }
    }

    const pageUsers = matches.slice(query.offset, query.offset + query.limit);
    const capped = !exhausted && scanned >= HQ_DIRECTORY_SCAN_CAP;
    const matched = exhausted ? matches.length : Math.max(matches.length, query.offset + pageUsers.length + (capped ? 1 : 0));
    return {
        users: pageUsers,
        matched,
        usersTotal,
        offset: query.offset,
        limit: query.limit,
        hasMore: query.offset + pageUsers.length < matched,
        matchedExact: exhausted,
        capped,
    };
}

async function countAllProfiles(admin: SupabaseClient): Promise<number> {
    try {
        const { count, error } = await admin.from('profiles').select('id', { count: 'exact', head: true });
        if (error || typeof count !== 'number') return 0;
        return count;
    } catch {
        return 0;
    }
}

export async function listHeadquartersNotifyRecipientIds(
    admin: SupabaseClient,
): Promise<{ ids: string[]; capped: boolean }> {
    const ids: string[] = [];
    let offset = 0;
    let sawFullPage = true;
    while (ids.length < HEADQUARTERS_NOTIFY_RECIPIENT_CAP && sawFullPage) {
        const to = offset + HEADQUARTERS_NOTIFY_RECIPIENT_PAGE - 1;
        const { data, error } = await admin
            .from('profiles')
            .select('id, role')
            .eq('is_deleted', false)
            .range(offset, to);
        if (error || !Array.isArray(data)) {
            throw new Error(error?.message || 'Failed to list notify recipients');
        }
        sawFullPage = data.length === HEADQUARTERS_NOTIFY_RECIPIENT_PAGE;
        for (const row of data) {
            const id = String((row as { id?: unknown })?.id ?? '').trim();
            const role = (row as { role?: unknown }).role;
            if (!isPostgresUuidSubject(id) || isHeadquartersProtectedAdminId(id)) continue;
            if (isHeadquartersAdminRole(role)) continue;
            ids.push(id);
            if (ids.length >= HEADQUARTERS_NOTIFY_RECIPIENT_CAP) break;
        }
        offset += data.length;
        if (data.length === 0) break;
    }
    return { ids, capped: ids.length >= HEADQUARTERS_NOTIFY_RECIPIENT_CAP && sawFullPage };
}

export type { HqDirectoryListQuery, HqDirectoryListResult };
