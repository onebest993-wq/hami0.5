import type { SupabaseClient } from '@supabase/supabase-js';
import { HQ_STATUS_CONTENT_GAP_KEYS } from '@/app/domain/admin/hqStatusGaps';
import { kvReadJsonStatusByPrefix } from './kvStoreAdmin.ts';

export type HeadquartersSystemState = 'connected' | 'degraded' | 'down';

export type HeadquartersStatusPayload = {
    system: HeadquartersSystemState;
    db: boolean;
    kvOk: boolean;
    pendingVerification: number;
    verificationApproved: number;
    verificationRejected: number;
    pendingReports: number;
    pendingCommentReports: number;
    usersTotal: number;
    usersFrozen: number;
    usersLocked: number;
    usersActive: number;
    usersLawyer: number;
    usersModerator: number;
    usersAdmin: number;
    usersNew24h: number;
    usersNew7d: number;
    forumPosts: number;
    forumComments: number;
    forumBans: number;
    forumBansActive: number;
    forumDocuments: number;
    forumPinned: number;
    forumLocked: number;
    verificationCapped: boolean;
    contentPartial: boolean;
    /** مفاتيح عُدّت بفشل — لا تُعرض أصفاراً كواقع. */
    contentGaps: string[];
};

type CountBuilder = {
    eq: (column: string, value: string | boolean) => CountBuilder;
    or: (filters: string) => CountBuilder;
    is: (column: string, value: null) => CountBuilder;
    not: (column: string, operator: string, value: null) => CountBuilder;
    gt: (column: string, value: string) => CountBuilder;
    gte: (column: string, value: string) => CountBuilder;
};

async function headCount(
    admin: SupabaseClient,
    table: string,
    filter?: (query: CountBuilder) => CountBuilder,
    columns = '*',
): Promise<number | null> {
    try {
        const base = admin.from(table).select(columns, { count: 'exact', head: true });
        const query = filter ? filter(base as unknown as CountBuilder) : base;
        const { count, error } = await (query as unknown as PromiseLike<{
            count: number | null;
            error: { message?: string } | null;
        }>);
        if (error) return null;
        return typeof count === 'number' ? count : 0;
    } catch {
        return null;
    }
}

function asCount(value: number | null): number {
    if (value == null || !Number.isFinite(value) || value < 0) return 0;
    return Math.min(Math.floor(value), 1_000_000_000);
}

export function emptyHeadquartersStatus(
    system: HeadquartersSystemState = 'down',
): HeadquartersStatusPayload {
    return {
        system,
        db: false,
        kvOk: false,
        pendingVerification: 0,
        verificationApproved: 0,
        verificationRejected: 0,
        pendingReports: 0,
        pendingCommentReports: 0,
        usersTotal: 0,
        usersFrozen: 0,
        usersLocked: 0,
        usersActive: 0,
        usersLawyer: 0,
        usersModerator: 0,
        usersAdmin: 0,
        usersNew24h: 0,
        usersNew7d: 0,
        forumPosts: 0,
        forumComments: 0,
        forumBans: 0,
        forumBansActive: 0,
        forumDocuments: 0,
        forumPinned: 0,
        forumLocked: 0,
        verificationCapped: false,
        contentPartial: true,
        contentGaps: [...HQ_STATUS_CONTENT_GAP_KEYS],
    };
}

export const HQ_FROZEN_PROFILES_LEGACY_OR = 'is_banned.eq.true,is_active.eq.false';

export function hqFrozenProfilesOrFilter(nowIso: string): string {
    return `freeze_until.gt."${nowIso}",and(freeze_until.is.null,or(is_banned.eq.true,is_active.eq.false,status.eq.suspended,status.eq.banned,status.eq.frozen))`;
}

export function hqLoginLockedProfilesOrFilter(nowIso: string): string {
    return `login_blocked.eq.true,login_until.gt."${nowIso}"`;
}

async function countCurrentlyFrozen(
    admin: SupabaseClient,
    nowIso: string,
): Promise<number | null> {
    const accurate = await headCount(admin, 'profiles', (q) =>
        q.eq('is_deleted', false).or(hqFrozenProfilesOrFilter(nowIso)),
    );
    if (accurate != null) return accurate;
    return headCount(admin, 'profiles', (q) => q.eq('is_deleted', false).or(HQ_FROZEN_PROFILES_LEGACY_OR));
}

/**
 * نبض المقر — أعداد head-only رخيصة + مسح KV للتوثيق.
 * جدول أو استعلام فاشل يُدرج في contentGaps ولا يُعرض صفراً كواقع.
 */
export async function loadHeadquartersStatus(
    admin: SupabaseClient,
    nowMs: number = Date.now(),
): Promise<HeadquartersStatusPayload> {
    const nowIso = new Date(nowMs).toISOString();
    const since24h = new Date(nowMs - 24 * 60 * 60 * 1000).toISOString();
    const since7d = new Date(nowMs - 7 * 24 * 60 * 60 * 1000).toISOString();
    const frozenFilter = hqFrozenProfilesOrFilter(nowIso);
    const lockedFilter = hqLoginLockedProfilesOrFilter(nowIso);

    const [
        usersTotal,
        usersFrozen,
        usersLocked,
        usersFrozenLocked,
        usersLawyer,
        usersModerator,
        usersAdmin,
        usersNew24h,
        usersNew7d,
        pendingReports,
        pendingCommentReports,
        forumPosts,
        forumComments,
        forumBans,
        forumBansPermanent,
        forumBansTimedActive,
        forumDocuments,
        forumPinned,
        forumLocked,
    ] = await Promise.all([
        headCount(admin, 'profiles', (q) => q.eq('is_deleted', false)),
        countCurrentlyFrozen(admin, nowIso),
        headCount(admin, 'profiles', (q) => q.eq('is_deleted', false).or(lockedFilter)),
        headCount(admin, 'profiles', (q) =>
            q.eq('is_deleted', false).or(lockedFilter).or(frozenFilter),
        ),
        headCount(admin, 'profiles', (q) => q.eq('is_deleted', false).eq('role', 'lawyer')),
        headCount(admin, 'profiles', (q) => q.eq('is_deleted', false).eq('role', 'moderator')),
        headCount(admin, 'profiles', (q) => q.eq('is_deleted', false).eq('role', 'admin')),
        headCount(admin, 'profiles', (q) => q.eq('is_deleted', false).gte('created_at', since24h)),
        headCount(admin, 'profiles', (q) => q.eq('is_deleted', false).gte('created_at', since7d)),
        headCount(admin, 'forum_reports', (q) => q.eq('status', 'pending')),
        headCount(admin, 'forum_comment_reports', (q) => q.eq('status', 'pending')),
        headCount(admin, 'forum_posts', (q) => q.is('group_id', null)),
        headCount(admin, 'forum_comments'),
        headCount(admin, 'forum_bans'),
        headCount(admin, 'forum_bans', (q) => q.is('expires_at', null)),
        headCount(admin, 'forum_bans', (q) => q.gt('expires_at', nowIso)),
        headCount(admin, 'forum_posts', (q) => q.is('group_id', null).not('attachment', 'is', null)),
        headCount(admin, 'forum_posts', (q) => q.is('group_id', null).eq('is_pinned', true)),
        headCount(admin, 'forum_posts', (q) => q.is('group_id', null).eq('is_locked', true)),
    ]);

    const db = usersTotal !== null;
    const total = asCount(usersTotal);
    const frozenRaw = asCount(usersFrozen);
    const lockedKnown = usersLocked != null;
    const locked = asCount(usersLocked);
    const overlap = lockedKnown && usersFrozen != null ? asCount(usersFrozenLocked) : 0;
    /**
     * شارة القائمة: القفل يتقدّم على التجميد.
     * العدد المعروض للمجمّد = مجمّد وليس مقفل الدخول.
     */
    const frozen =
        lockedKnown && usersFrozen != null ? Math.max(0, frozenRaw - overlap) : frozenRaw;
    const activeKnown = usersTotal != null && usersFrozen != null;
    const usersActive = activeKnown
        ? Math.max(0, total - frozenRaw - (lockedKnown ? locked : 0) + overlap)
        : 0;

    let kvOk = true;
    let pendingVerification = 0;
    let verificationApproved = 0;
    let verificationRejected = 0;
    let verificationCapped = false;
    try {
        const { statuses, capped } = await kvReadJsonStatusByPrefix('lawyer-verification:');
        verificationCapped = capped;
        for (const status of statuses) {
            if (status === 'pending') pendingVerification += 1;
            else if (status === 'active') verificationApproved += 1;
            else if (status === 'rejected') verificationRejected += 1;
        }
    } catch {
        kvOk = false;
    }

    let system: HeadquartersSystemState = 'down';
    if (db && kvOk) system = 'connected';
    else if (db) system = 'degraded';

    const contentGaps: string[] = [];
    if (usersTotal == null) contentGaps.push('usersTotal');
    if (usersFrozen == null) contentGaps.push('usersFrozen');
    if (!activeKnown) contentGaps.push('usersActive');
    if (!lockedKnown) contentGaps.push('usersLocked');
    if (usersLawyer == null) contentGaps.push('usersLawyer');
    if (usersModerator == null) contentGaps.push('usersModerator');
    if (usersAdmin == null) contentGaps.push('usersAdmin');
    if (usersNew24h == null) contentGaps.push('usersNew24h');
    if (usersNew7d == null) contentGaps.push('usersNew7d');
    if (!kvOk) contentGaps.push('pendingVerification');
    if (pendingReports == null) contentGaps.push('pendingReports');
    if (pendingCommentReports == null) contentGaps.push('pendingCommentReports');
    if (forumPosts == null) contentGaps.push('forumPosts');
    if (forumComments == null) contentGaps.push('forumComments');
    if (forumBans == null) contentGaps.push('forumBans');
    if (forumBansPermanent == null || forumBansTimedActive == null) contentGaps.push('forumBansActive');
    if (forumDocuments == null) contentGaps.push('forumDocuments');
    if (forumPinned == null) contentGaps.push('forumPinned');
    if (forumLocked == null) contentGaps.push('forumLocked');

    return {
        system,
        db,
        kvOk,
        pendingVerification,
        verificationApproved,
        verificationRejected,
        pendingReports: asCount(pendingReports),
        pendingCommentReports: asCount(pendingCommentReports),
        usersTotal: total,
        usersFrozen: frozen,
        usersLocked: locked,
        usersActive,
        usersLawyer: asCount(usersLawyer),
        usersModerator: asCount(usersModerator),
        usersAdmin: asCount(usersAdmin),
        usersNew24h: asCount(usersNew24h),
        usersNew7d: asCount(usersNew7d),
        forumPosts: asCount(forumPosts),
        forumComments: asCount(forumComments),
        forumBans: asCount(forumBans),
        forumBansActive: asCount(forumBansPermanent) + asCount(forumBansTimedActive),
        forumDocuments: asCount(forumDocuments),
        forumPinned: asCount(forumPinned),
        forumLocked: asCount(forumLocked),
        verificationCapped,
        contentPartial: contentGaps.length > 0,
        contentGaps,
    };
}
