import { SecureAPIClient } from '@/app/services/SecureAPIClient';
import { isNotificationServerSyncEnabled } from '@/app/services/notifications/notificationServerSync';

type HealthResponse = {
    ok?: boolean;
    ready?: boolean;
    supabaseEnabled?: boolean;
    schema?: { ok?: boolean; inbox?: boolean; events?: boolean; inboxView?: boolean };
};

let probed = false;

/** مرة واحدة لكل جلسة — تحذير إذا schema غير جاهز في الإنتاج. */
export async function probeNotificationProductionReadinessOnce(): Promise<boolean | null> {
    if (probed || !isNotificationServerSyncEnabled()) return null;
    probed = true;

    try {
        const res = await SecureAPIClient.fetchSecure<HealthResponse>('/api/notifications/health', {
            method: 'GET',
        });
        if (res?.ready === true) return true;

        if (import.meta.env.PROD) {
            console.warn(
                '[hami:notifications] schema not ready — run: npm run db:shell-notifications',
            );
        }
        return false;
    } catch {
        return null;
    }
}

export function resetNotificationReadinessProbeForTests(): void {
    probed = false;
}
