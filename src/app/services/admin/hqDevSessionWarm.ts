/**
 * تسخين نبض المقر قبل أول رسم للوحة — اختصار التطوير ومسار الرمز/الجهاز الموثّق.
 */
import {
    markHqStatusFetched,
    parseHeadquartersLiveStatus,
} from '@/app/components/admin/hqLiveOverview';
import { sanitizeHqCourtRows } from '@/app/domain/admin/hqCourtStats';
import {
    primeHeadquartersAudit,
    primeHeadquartersCourts,
    primeHeadquartersDevices,
    primeHeadquartersLiveStatus,
} from '@/app/services/admin/hqDevSessionPrime';

const WARM_TIMEOUT_MS = 3_000;

export async function warmLiveHeadquartersApis(): Promise<void> {
    const { SecureAPIClient } = await import('@/app/services/SecureAPIClient');
    const controller = new AbortController();
    const timer = window.setTimeout(() => controller.abort(), WARM_TIMEOUT_MS);
    const get = (path: string) =>
        SecureAPIClient.fetchSecure<unknown>(path, { method: 'GET', signal: controller.signal });
    try {
        const [statusResult, auditResult, devicesResult, statsResult] = await Promise.allSettled([
            get('/api/admin/status'),
            get('/api/admin/audit'),
            get('/api/admin/devices'),
            get('/api/admin/stats'),
        ]);
        if (statusResult.status === 'fulfilled' && statusResult.value) {
            primeHeadquartersLiveStatus(
                markHqStatusFetched(parseHeadquartersLiveStatus(statusResult.value), new Date().toISOString()),
            );
        }
        if (auditResult.status === 'fulfilled' && auditResult.value && typeof auditResult.value === 'object') {
            const rec = auditResult.value as { ok?: boolean; entries?: unknown };
            if (rec.ok && Array.isArray(rec.entries)) primeHeadquartersAudit(rec.entries);
        }
        if (devicesResult.status === 'fulfilled' && devicesResult.value && typeof devicesResult.value === 'object') {
            const rec = devicesResult.value as { ok?: boolean; devices?: unknown };
            if (rec.ok && Array.isArray(rec.devices)) primeHeadquartersDevices(rec.devices);
        }
        if (statsResult.status === 'fulfilled' && statsResult.value && typeof statsResult.value === 'object') {
            const rec = statsResult.value as { ok?: boolean; courts?: unknown };
            if (rec.ok) {
                primeHeadquartersCourts(sanitizeHqCourtRows(rec.courts));
            }
        }
    } finally {
        window.clearTimeout(timer);
    }
}
