import type { ExecutionFile } from '@/app/types/execution';

export type DebtorNoticeStateSnapshot = {
    notificationDate: string | null;
    memoAnchorDate: string | null;
    activeNoticeState: string | null;
    voluntaryPeriodEndDeclared: boolean;
    absenceBadgeDismissed: boolean;
};

export type DebtorSummonsMarker =
    | {
          id: string;
          date: string;
          purpose: string;
          recordedAt?: string;
          badgeHiddenAt?: string;
          periodEndedAt?: string;
      }
    | null;

export function areDebtorSummonsMarkersEqual(a: DebtorSummonsMarker, b: DebtorSummonsMarker): boolean {
    if (a === b) return true;
    if (!a && !b) return true;
    if (!a || !b) return false;
    return (
        a.id === b.id &&
        a.date === b.date &&
        a.purpose === b.purpose &&
        String(a.recordedAt ?? '') === String(b.recordedAt ?? '') &&
        String(a.badgeHiddenAt ?? '') === String(b.badgeHiddenAt ?? '') &&
        String(a.periodEndedAt ?? '') === String(b.periodEndedAt ?? '')
    );
}

function normalizeYmd(v: unknown): string | null {
    const s = String(v ?? '').trim();
    if (!s) return null;
    return /^\d{4}-\d{2}-\d{2}$/.test(s) ? s : null;
}

function readStringMapValue(
    map: Record<string, string> | undefined,
    key: string
): string | null {
    if (!map) return null;
    const v = normalizeYmd(map[key]);
    return v;
}

function readNoticeStateMapValue(
    map: Record<string, string> | undefined,
    key: string
): string | null {
    if (!map) return null;
    const v = String(map[key] ?? '').trim();
    return v || null;
}

function readBooleanMapValue(
    map: Record<string, boolean> | undefined,
    key: string
): boolean | null {
    if (!map || !(key in map)) return null;
    return Boolean(map[key]);
}

export function getDebtorNoticeStateForKey(
    file: ExecutionFile | null | undefined,
    debtorKey: string,
    primaryDebtorKey: string
): DebtorNoticeStateSnapshot {
    const dk = String(debtorKey);
    const pk = String(primaryDebtorKey);
    const d0 = file?.debtors?.[0];
    const fallbackDate =
        normalizeYmd(file?.debtorNotificationDate) || normalizeYmd(d0?.notificationDate) || null;
    const notificationDate =
        readStringMapValue(file?.debtor_notification_date_by_debtor, dk) ||
        (dk === pk ? fallbackDate : null);
    const memoAnchorDate =
        readStringMapValue(file?.execution_memo_anchor_date_by_debtor, dk) ||
        (dk === pk ? normalizeYmd(file?.execution_memo_anchor_date) : null);
    const activeNoticeState =
        readNoticeStateMapValue(file?.active_notice_state_by_debtor, dk) ||
        (dk === pk ? String(file?.activeNoticeState ?? '').trim() || null : null);
    const voluntaryPeriodEndDeclared =
        readBooleanMapValue(file?.notice_voluntary_period_end_declared_by_debtor, dk) ??
        (dk === pk ? Boolean(file?.notice_voluntary_period_end_declared) : false);
    const absenceBadgeDismissed =
        readBooleanMapValue(file?.debtor_absence_badge_dismissed_by_debtor, dk) ??
        (dk === pk ? Boolean(file?.debtor_absence_badge_dismissed) : false);
    return {
        notificationDate,
        memoAnchorDate,
        activeNoticeState,
        voluntaryPeriodEndDeclared,
        absenceBadgeDismissed,
    };
}

export function buildDebtorNoticePatchForKey(
    file: ExecutionFile,
    debtorKey: string,
    primaryDebtorKey: string,
    next: Partial<DebtorNoticeStateSnapshot>
): Record<string, unknown> {
    const dk = String(debtorKey);
    const isPrimary = dk === String(primaryDebtorKey);
    const notificationMap = { ...(file.debtor_notification_date_by_debtor ?? {}) };
    const memoMap = { ...(file.execution_memo_anchor_date_by_debtor ?? {}) };
    const activeStateMap = { ...(file.active_notice_state_by_debtor ?? {}) };
    const endMap = { ...(file.notice_voluntary_period_end_declared_by_debtor ?? {}) };
    const dismissedMap = { ...(file.debtor_absence_badge_dismissed_by_debtor ?? {}) };

    if (next.notificationDate !== undefined) {
        const ymd = normalizeYmd(next.notificationDate);
        if (ymd) notificationMap[dk] = ymd;
        else delete notificationMap[dk];
    }
    if (next.memoAnchorDate !== undefined) {
        const ymd = normalizeYmd(next.memoAnchorDate);
        if (ymd) memoMap[dk] = ymd;
        else delete memoMap[dk];
    }
    if (next.activeNoticeState !== undefined) {
        const v = String(next.activeNoticeState ?? '').trim();
        if (v) activeStateMap[dk] = v;
        else delete activeStateMap[dk];
    }
    if (next.voluntaryPeriodEndDeclared !== undefined) {
        endMap[dk] = Boolean(next.voluntaryPeriodEndDeclared);
    }
    if (next.absenceBadgeDismissed !== undefined) {
        dismissedMap[dk] = Boolean(next.absenceBadgeDismissed);
    }

    const patch: Record<string, unknown> = {
        debtor_notification_date_by_debtor: notificationMap,
        execution_memo_anchor_date_by_debtor: memoMap,
        active_notice_state_by_debtor: activeStateMap,
        notice_voluntary_period_end_declared_by_debtor: endMap,
        debtor_absence_badge_dismissed_by_debtor: dismissedMap,
    };

    if (isPrimary) {
        if (next.notificationDate !== undefined) {
            patch.debtorNotificationDate = normalizeYmd(next.notificationDate);
        }
        if (next.memoAnchorDate !== undefined) {
            patch.execution_memo_anchor_date = normalizeYmd(next.memoAnchorDate);
        }
        if (next.activeNoticeState !== undefined) {
            const v = String(next.activeNoticeState ?? '').trim();
            patch.activeNoticeState = v || null;
        }
        if (next.voluntaryPeriodEndDeclared !== undefined) {
            patch.notice_voluntary_period_end_declared = Boolean(next.voluntaryPeriodEndDeclared);
        }
        if (next.absenceBadgeDismissed !== undefined) {
            patch.debtor_absence_badge_dismissed = Boolean(next.absenceBadgeDismissed);
        }
    }
    return patch;
}

/** المدين مُبلَّغ — شرط مسبق للإحضار الجبري والحبس التنفيذي */
export function isDebtorNotifiedForCoerciveActions(
    file: ExecutionFile | null | undefined,
    debtorKey: string,
    primaryDebtorKey: string,
): boolean {
    const notice = getDebtorNoticeStateForKey(file, debtorKey, primaryDebtorKey);
    if (notice.notificationDate || notice.memoAnchorDate) return true;
    if (getDebtorSummonsMarkerForKey(file, debtorKey, primaryDebtorKey)) return true;
    if (getDebtorNotificationCountForKey(file, debtorKey, primaryDebtorKey) > 0) return true;
    return false;
}

export function getDebtorNotificationCountForKey(
    file: ExecutionFile | null | undefined,
    debtorKey: string,
    primaryDebtorKey: string
): number {
    const dk = String(debtorKey);
    const pk = String(primaryDebtorKey);
    const scoped = file?.notification_count_by_debtor?.[dk];
    if (typeof scoped === 'number' && Number.isFinite(scoped)) return Math.max(0, scoped);
    if (dk === pk) {
        const legacy = Number(file?.notificationCount ?? 0);
        return Number.isFinite(legacy) ? Math.max(0, legacy) : 0;
    }
    return 0;
}

export function buildDebtorNotificationCountPatchForKey(
    file: ExecutionFile,
    debtorKey: string,
    primaryDebtorKey: string,
    count: number
): Record<string, unknown> {
    const dk = String(debtorKey);
    const isPrimary = dk === String(primaryDebtorKey);
    const nextCount = Number.isFinite(count) ? Math.max(0, Math.floor(count)) : 0;
    const map = { ...(file.notification_count_by_debtor ?? {}) };
    map[dk] = nextCount;
    return {
        notification_count_by_debtor: map,
        ...(isPrimary ? { notificationCount: nextCount } : {}),
    };
}

export function getDebtorSummonsMarkerForKey(
    file: ExecutionFile | null | undefined,
    debtorKey: string,
    primaryDebtorKey: string
): DebtorSummonsMarker {
    const dk = String(debtorKey);
    const pk = String(primaryDebtorKey);
    const scoped = file?.debtor_summons_marker_by_debtor?.[dk];
    const m = scoped ?? (dk === pk ? file?.debtor_summons_marker ?? null : null);
    if (!m || typeof m !== 'object') return null;
    const id = String((m as { id?: string }).id ?? '').trim();
    const date = String((m as { date?: string }).date ?? '').trim();
    const purpose = String((m as { purpose?: string }).purpose ?? '').trim();
    const recordedAt = String((m as { recordedAt?: string }).recordedAt ?? '').trim();
    const badgeHiddenAt = String((m as { badgeHiddenAt?: string }).badgeHiddenAt ?? '').trim();
    const periodEndedAt = String((m as { periodEndedAt?: string }).periodEndedAt ?? '').trim();
    if (!id || !date) return null;
    return {
        id,
        date,
        purpose: purpose || 'تبليغ',
        ...(recordedAt ? { recordedAt } : {}),
        ...(badgeHiddenAt ? { badgeHiddenAt } : {}),
        ...(periodEndedAt ? { periodEndedAt } : {}),
    };
}

export function buildDebtorSummonsMarkerPatchForKey(
    file: ExecutionFile,
    debtorKey: string,
    primaryDebtorKey: string,
    marker: DebtorSummonsMarker
): Record<string, unknown> {
    const dk = String(debtorKey);
    const isPrimary = dk === String(primaryDebtorKey);
    const map = { ...(file.debtor_summons_marker_by_debtor ?? {}) };
    map[dk] = marker ? { ...marker } : null;
    return {
        debtor_summons_marker_by_debtor: map,
        ...(isPrimary ? { debtor_summons_marker: marker ? { ...marker } : null } : {}),
    };
}

export type DebtorUnservedMemoBadgeContext = {
    isEviction?: boolean;
    debtorAttendedVoluntarily?: boolean;
    voluntaryAttendanceCount?: number;
    noticeVoluntaryPeriodEndOptimistic?: boolean;
    evictionVoluntaryEndOptimistic?: boolean;
};

/** شارة «غير مبلّغ» — لكل مدين على حدة */
export function debtorShowsUnservedMemoBadge(
    file: ExecutionFile | null | undefined,
    debtorKey: string,
    primaryDebtorKey: string,
    ctx: DebtorUnservedMemoBadgeContext = {},
): boolean {
    const dk = String(debtorKey);
    const pk = String(primaryDebtorKey);
    const isPrimary = dk === pk;
    const notice = getDebtorNoticeStateForKey(file, debtorKey, primaryDebtorKey);

    if (getDebtorNotificationCountForKey(file, debtorKey, primaryDebtorKey) > 0) return false;
    if (notice.notificationDate || notice.memoAnchorDate) return false;

    if (isPrimary) {
        if (ctx.debtorAttendedVoluntarily) return false;
        if ((ctx.voluntaryAttendanceCount ?? 0) > 0) return false;
    }

    if (notice.voluntaryPeriodEndDeclared) return false;
    if (isPrimary && ctx.noticeVoluntaryPeriodEndOptimistic) return false;

    if (ctx.isEviction) {
        if (file?.eviction_voluntary_period_end_declared || ctx.evictionVoluntaryEndOptimistic) {
            return false;
        }
    } else if (file?.eviction_voluntary_period_end_declared) {
        return false;
    }

    return true;
}
