import { DeviceTrustService } from '@/app/domain/admin/deviceTrust';
import { hqMutatingFetch } from '@/app/services/admin/hqSecureFetch';
import { clearPrimedHeadquartersStatus } from '@/app/services/admin/hqDevSessionPrime';

/**
 * ينسى ثقة هذا المتصفح في المقر: سحب الصف على الخادم أولاً ثم الكاش المحلي.
 * إن فشل الخادم يبقى الجهاز موثّقاً — لا نغادر المقر حتى ينجح السحب.
 * لا يمسح بصمة الجهاز — الدخول التالي لنفس الأصل يطلب الرمز.
 */
export async function endHeadquartersTrustedSession(): Promise<{ revoked: boolean }> {
    try {
        const data = await hqMutatingFetch<{ ok?: boolean }>('/api/admin/devices', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ action: 'revoke_current' }),
        });
        if (!data?.ok) return { revoked: false };
        DeviceTrustService.revokeDeviceTrust();
        clearPrimedHeadquartersStatus();
        return { revoked: true };
    } catch {
        return { revoked: false };
    }
}
