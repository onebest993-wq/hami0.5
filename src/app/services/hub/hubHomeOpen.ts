import { hasLocalAppSession } from '@/app/services/auth/shellAuth';
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

function toastHubSignedOut(archiveId: HubArchiveId): void {
    void import('@/app/components/ui/SmartToast')
        .then((m) => {
            m.SmartToast.error(`يرجى تسجيل الدخول أولاً لاستخدام ${hubShellFeature(archiveId)}`);
        })
        .catch(() => undefined);
}

export function resolveHubArchiveRouteId(id: string): HubArchiveId | null {
    return HUB_ARCHIVE_ROUTE_IDS[id] ?? null;
}

/** فتح بطاقة hub من الرئيسية — افتح أولاً ثم سخّن في نفس الدورة */
export function openHubArchiveFromHomeTile(
    rawId: string,
    userId: string | null | undefined,
    onOpen: (archiveId: HubArchiveId) => void,
): boolean {
    const archiveId = resolveHubArchiveRouteId(rawId);
    if (!archiveId) return false;

    const opened = openHubArchiveFromShell({
        signedIn: hasLocalAppSession(userId),
        archiveId,
        onSignedOut: () => toastHubSignedOut(archiveId),
        onOpen,
    });
    if (opened) {
        prefetchHubArchiveIntentImmediate(archiveId, userId);
    }
    return opened;
}
