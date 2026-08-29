import type { HqMailHealth } from '@/app/components/admin/HqMailHealthStrip';
import {
    HQ_STATUS_CONTENT_GAP_KEYS,
    type HqStatusContentGapKey,
} from '@/app/domain/admin/hqStatusGaps';
import { clampHqCount, stripHqControlChars } from '@/app/domain/admin/hqSafeText';

export type HeadquartersSystemState = 'connected' | 'degraded' | 'down';

export type HqLiveOverview = {
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
    /** مفاتيح فشل عدّها — الصفر المخزّن ليس واقعاً. */
    contentGaps: string[];
    fetchedAt: string | null;
    stale: boolean;
    /** رفض 401/403 — القاعدة لم تُفحص، وليست متوقفة. */
    sessionRequired: boolean;
};

export type HeadquartersLiveStatus = Omit<HqLiveOverview, 'system'> & {
    system: HeadquartersSystemState | 'checking';
    mail: HqMailHealth | null;
};

function parseMail(raw: unknown): HqMailHealth | null {
    if (!raw || typeof raw !== 'object') return null;
    const mail = raw as { configured?: unknown; channel?: unknown; mailboxMasked?: unknown };
    const channel = stripHqControlChars(mail.channel ?? 'none', 32);
    const mailboxMasked = stripHqControlChars(mail.mailboxMasked, 80);
    return {
        configured: Boolean(mail.configured),
        channel: channel || 'none',
        mailboxMasked,
    };
}

const ZERO_COUNTS: Omit<HqLiveOverview, 'system' | 'db' | 'kvOk' | 'fetchedAt' | 'stale'> = {
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
    sessionRequired: false,
};

export const CHECKING_HQ_STATUS: HeadquartersLiveStatus = {
    system: 'checking',
    db: false,
    kvOk: false,
    ...ZERO_COUNTS,
    fetchedAt: null,
    stale: false,
    sessionRequired: false,
    mail: null,
};

export const DOWN_HQ_STATUS: HeadquartersLiveStatus = {
    ...CHECKING_HQ_STATUS,
    system: 'down',
};

export const SESSION_HQ_STATUS: HeadquartersLiveStatus = {
    ...DOWN_HQ_STATUS,
    sessionRequired: true,
};

export function isHqStatusSessionDenied(error: unknown): boolean {
    if (!error || typeof error !== 'object') return false;
    const status = Number((error as { status?: unknown }).status);
    return status === 401 || status === 403;
}

/** ألواح المقر لا تُجلب حتى يتّصل النبض بجلسة حقيقية — وإلا يملأ المتصفح 401. */
export function isHqAdminLiveReady(
    live: Pick<HeadquartersLiveStatus, 'system' | 'sessionRequired'>,
    skipLiveProbe = false,
): boolean {
    return !skipLiveProbe && live.system === 'connected' && !live.sessionRequired;
}

export type HqContentGapKey = HqStatusContentGapKey;

const HQ_CONTENT_GAP_SET = new Set<string>(HQ_STATUS_CONTENT_GAP_KEYS);

export function parseHqContentGaps(raw: unknown): HqContentGapKey[] {
    if (!Array.isArray(raw)) return [];
    const out: HqContentGapKey[] = [];
    for (const item of raw) {
        const key = stripHqControlChars(item, 40);
        if (!HQ_CONTENT_GAP_SET.has(key)) continue;
        if (out.includes(key as HqContentGapKey)) continue;
        out.push(key as HqContentGapKey);
        if (out.length >= HQ_STATUS_CONTENT_GAP_KEYS.length) break;
    }
    return out;
}

export function hqHasContentGap(
    gaps: readonly string[] | undefined,
    key: HqContentGapKey,
): boolean {
    return Boolean(gaps?.includes(key));
}

/** صفر فاشل يُعرض شرطة — لا يُقرأ كفراغ حقيقي. */
export function hqCountOrDash(
    value: number,
    gaps: readonly string[] | undefined,
    key: HqContentGapKey,
): number | string {
    return hqHasContentGap(gaps, key) ? '—' : clampHqCount(value);
}

export function pendingHqReportsTotal(status: {
    pendingReports: number;
    pendingCommentReports: number;
}): number {
    return clampHqCount(status.pendingReports) + clampHqCount(status.pendingCommentReports);
}

export function hqReportsTotalOrDash(status: {
    pendingReports: number;
    pendingCommentReports: number;
    contentGaps?: readonly string[];
}): number | string {
    if (
        hqHasContentGap(status.contentGaps, 'pendingReports') ||
        hqHasContentGap(status.contentGaps, 'pendingCommentReports')
    ) {
        return '—';
    }
    return pendingHqReportsTotal(status);
}

export function pendingHqActionTotal(status: {
    pendingVerification: number;
    pendingReports: number;
    pendingCommentReports: number;
}): number {
    return clampHqCount(status.pendingVerification) + pendingHqReportsTotal(status);
}

export function hqActionTotalOrDash(status: {
    pendingVerification: number;
    pendingReports: number;
    pendingCommentReports: number;
    contentGaps?: readonly string[];
}): number | string {
    if (hqHasContentGap(status.contentGaps, 'pendingVerification')) return '—';
    const reports = hqReportsTotalOrDash(status);
    if (reports === '—') return '—';
    return pendingHqActionTotal(status);
}

export function parseHeadquartersLiveStatus(data: unknown): HeadquartersLiveStatus {
    const rec = data && typeof data === 'object' ? (data as Record<string, unknown>) : {};
    const system: HeadquartersSystemState =
        rec.system === 'connected' || rec.system === 'degraded' || rec.system === 'down'
            ? rec.system
            : 'down';
    const db = rec.db == null ? system !== 'down' : Boolean(rec.db);
    const kvOk = rec.kvOk == null ? system === 'connected' : Boolean(rec.kvOk);
    const usersTotal = clampHqCount(rec.usersTotal);
    const usersFrozen = clampHqCount(rec.usersFrozen);
    const usersLocked = clampHqCount(rec.usersLocked);
    const usersActive =
        rec.usersActive == null
            ? Math.max(0, usersTotal - usersFrozen - usersLocked)
            : clampHqCount(rec.usersActive);
    const contentGaps = parseHqContentGaps(rec.contentGaps);
    return {
        system,
        db,
        kvOk,
        pendingVerification: clampHqCount(rec.pendingVerification),
        verificationApproved: clampHqCount(rec.verificationApproved),
        verificationRejected: clampHqCount(rec.verificationRejected),
        pendingReports: clampHqCount(rec.pendingReports),
        pendingCommentReports: clampHqCount(rec.pendingCommentReports),
        usersTotal,
        usersFrozen,
        usersLocked,
        usersActive,
        usersLawyer: clampHqCount(rec.usersLawyer),
        usersModerator: clampHqCount(rec.usersModerator),
        usersAdmin: clampHqCount(rec.usersAdmin),
        usersNew24h: clampHqCount(rec.usersNew24h),
        usersNew7d: clampHqCount(rec.usersNew7d),
        forumPosts: clampHqCount(rec.forumPosts),
        forumComments: clampHqCount(rec.forumComments),
        forumBans: clampHqCount(rec.forumBans),
        forumBansActive: clampHqCount(rec.forumBansActive),
        forumDocuments: clampHqCount(rec.forumDocuments),
        forumPinned: clampHqCount(rec.forumPinned),
        forumLocked: clampHqCount(rec.forumLocked),
        verificationCapped: Boolean(rec.verificationCapped),
        contentPartial: Boolean(rec.contentPartial) || contentGaps.length > 0,
        contentGaps,
        fetchedAt: null,
        stale: false,
        sessionRequired: false,
        mail: parseMail(rec.mail),
    };
}

export function markHqStatusFetched(
    parsed: HeadquartersLiveStatus,
    fetchedAt: string,
): HeadquartersLiveStatus {
    return { ...parsed, fetchedAt, stale: false, sessionRequired: false };
}

export function markHqStatusFetchFailed(
    prev: HeadquartersLiveStatus,
    reason: 'session' | 'down' = 'down',
): HeadquartersLiveStatus {
    if (prev.fetchedAt) {
        return { ...prev, system: 'down', stale: true, sessionRequired: reason === 'session' };
    }
    return reason === 'session' ? SESSION_HQ_STATUS : DOWN_HQ_STATUS;
}

export function toHqLiveOverview(live: HeadquartersLiveStatus): HqLiveOverview | null {
    if (live.system === 'checking') return null;
    return {
        system: live.system,
        db: live.db,
        kvOk: live.kvOk,
        pendingVerification: live.pendingVerification,
        verificationApproved: live.verificationApproved,
        verificationRejected: live.verificationRejected,
        pendingReports: live.pendingReports,
        pendingCommentReports: live.pendingCommentReports,
        usersTotal: live.usersTotal,
        usersFrozen: live.usersFrozen,
        usersLocked: live.usersLocked,
        usersActive: live.usersActive,
        usersLawyer: live.usersLawyer,
        usersModerator: live.usersModerator,
        usersAdmin: live.usersAdmin,
        usersNew24h: live.usersNew24h,
        usersNew7d: live.usersNew7d,
        forumPosts: live.forumPosts,
        forumComments: live.forumComments,
        forumBans: live.forumBans,
        forumBansActive: live.forumBansActive,
        forumDocuments: live.forumDocuments,
        forumPinned: live.forumPinned,
        forumLocked: live.forumLocked,
        verificationCapped: live.verificationCapped,
        contentPartial: live.contentPartial,
        contentGaps: live.contentGaps,
        fetchedAt: live.fetchedAt,
        stale: live.stale,
        sessionRequired: Boolean(live.sessionRequired),
    };
}
