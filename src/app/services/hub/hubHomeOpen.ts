import { SmartToast } from '@/app/components/ui/SmartToast';
import { isRealSignedIn } from '@/app/services/auth/shellAuth';
import { prefetchHubArchiveIntentImmediate } from '@/app/hooks/lawyerDashboard/hubArchivePrefetchGate';
import {
    hubShellFeature,
    openHubArchiveFromShell,
    type HubArchiveId,
} from './hubShellNavigation';

const HUB_ARCHIVE_ROUTE_IDS: Record<string, HubArchiveId> = {
    execution: 'execution',
    lawsuit: 'lawsuit',
    transaction: 'transaction',
};

export function resolveHubArchiveRouteId(id: string): HubArchiveId | null {
    return HUB_ARCHIVE_ROUTE_IDS[id] ?? null;
}

/** فتح بطاقة hub من الرئيسية — تحقق دخول + prefetch قبل التنفيذ */
export function openHubArchiveFromHomeTile(
    rawId: string,
    userId: string | null | undefined,
    onOpen: (archiveId: HubArchiveId) => void,
): boolean {
    const archiveId = resolveHubArchiveRouteId(rawId);
    if (!archiveId) return false;

    /** المعاملات: افتح أولاً ثم سخّن — prefetch قبل onOpen كان يؤخر الإطار الأول */
    if (archiveId === 'transaction') {
        const opened = openHubArchiveFromShell({
            signedIn: isRealSignedIn(userId),
            archiveId,
            onSignedOut: () =>
                SmartToast.error(`يرجى تسجيل الدخول أولاً لاستخدام ${hubShellFeature(archiveId)}`),
            onOpen,
        });
        /* التسخين الثقيل داخل openTransactionsHub — هنا prefetch خفيف بعد الفتح فقط */
        if (opened) {
            queueMicrotask(() => prefetchHubArchiveIntentImmediate(archiveId, userId));
        }
        return opened;
    }

    prefetchHubArchiveIntentImmediate(archiveId, userId);

    return openHubArchiveFromShell({
        signedIn: isRealSignedIn(userId),
        archiveId,
        onSignedOut: () =>
            SmartToast.error(`يرجى تسجيل الدخول أولاً لاستخدام ${hubShellFeature(archiveId)}`),
        onOpen,
    });
}
