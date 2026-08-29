const STORAGE_PREFIX = 'hami:dash-frame1:v1:';
const SCHEMA = 1;
const MAX_COUNT = 9_999;

export type DashboardFrame1DiskSnapshot = {
    v: number;
    unreadCount: number;
    forumUnreadCount: number;
    pendingFieldTasksCount: number;
    secretaryAlertCount: number;
    pinnedCount: number;
    urgentAlertsCount: number;
    writtenAt: number;
};

function clampCount(value: unknown): number {
    const n = typeof value === 'number' && Number.isFinite(value) ? value : 0;
    return Math.max(0, Math.min(MAX_COUNT, Math.floor(n)));
}

function storageKey(userId: string): string {
    return `${STORAGE_PREFIX}${userId}`;
}

function emptySnapshot(): DashboardFrame1DiskSnapshot {
    return {
        v: SCHEMA,
        unreadCount: 0,
        forumUnreadCount: 0,
        pendingFieldTasksCount: 0,
        secretaryAlertCount: 0,
        pinnedCount: 0,
        urgentAlertsCount: 0,
        writtenAt: 0,
    };
}

function parseSnapshot(raw: string | null): DashboardFrame1DiskSnapshot | null {
    if (!raw) return null;
    try {
        const parsed = JSON.parse(raw) as Partial<DashboardFrame1DiskSnapshot>;
        if (!parsed || parsed.v !== SCHEMA) return null;
        return {
            v: SCHEMA,
            unreadCount: clampCount(parsed.unreadCount),
            forumUnreadCount: clampCount(parsed.forumUnreadCount),
            pendingFieldTasksCount: clampCount(parsed.pendingFieldTasksCount),
            secretaryAlertCount: clampCount(parsed.secretaryAlertCount),
            pinnedCount: clampCount(parsed.pinnedCount),
            urgentAlertsCount: clampCount(parsed.urgentAlertsCount),
            writtenAt: typeof parsed.writtenAt === 'number' ? parsed.writtenAt : 0,
        };
    } catch {
        return null;
    }
}

export function peekDashboardFrame1Snapshot(
    userId: string | null | undefined,
): DashboardFrame1DiskSnapshot | null {
    const uid = userId?.trim();
    if (!uid || typeof localStorage === 'undefined') return null;
    try {
        return parseSnapshot(localStorage.getItem(storageKey(uid)));
    } catch {
        return null;
    }
}

export function patchDashboardFrame1Snapshot(
    userId: string | null | undefined,
    patch: Partial<
        Pick<
            DashboardFrame1DiskSnapshot,
            'unreadCount' | 'forumUnreadCount' | 'pendingFieldTasksCount' | 'secretaryAlertCount' | 'pinnedCount' | 'urgentAlertsCount'
        >
    >,
): DashboardFrame1DiskSnapshot | null {
    const uid = userId?.trim();
    if (!uid || typeof localStorage === 'undefined') return null;
    const prev = peekDashboardFrame1Snapshot(uid) ?? emptySnapshot();
    const next: DashboardFrame1DiskSnapshot = {
        ...prev,
        v: SCHEMA,
        writtenAt: Date.now(),
    };
    if (patch.unreadCount != null) next.unreadCount = clampCount(patch.unreadCount);
    if (patch.forumUnreadCount != null) next.forumUnreadCount = clampCount(patch.forumUnreadCount);
    if (patch.pendingFieldTasksCount != null) {
        next.pendingFieldTasksCount = clampCount(patch.pendingFieldTasksCount);
    }
    if (patch.secretaryAlertCount != null) {
        next.secretaryAlertCount = clampCount(patch.secretaryAlertCount);
    }
    if (patch.pinnedCount != null) next.pinnedCount = clampCount(patch.pinnedCount);
    if (patch.urgentAlertsCount != null) next.urgentAlertsCount = clampCount(patch.urgentAlertsCount);
    try {
        localStorage.setItem(storageKey(uid), JSON.stringify(next));
    } catch {
        return prev.writtenAt > 0 ? prev : null;
    }
    return next;
}

export function resetDashboardFrame1SnapshotForTests(userId?: string | null): void {
    if (typeof localStorage === 'undefined') return;
    if (userId?.trim()) {
        localStorage.removeItem(storageKey(userId.trim()));
        return;
    }
    const toRemove: string[] = [];
    for (let i = 0; i < localStorage.length; i += 1) {
        const key = localStorage.key(i);
        if (key?.startsWith(STORAGE_PREFIX)) toRemove.push(key);
    }
    for (const key of toRemove) localStorage.removeItem(key);
}
