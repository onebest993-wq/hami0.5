import { reconcileBiometricSessionLockEnabled } from '@/app/services/security/biometricSessionService';
import type { SecuritySettings } from '@/app/services/settings/types';

type SettingsSecurityRuntimeHandlers = {
    patchSecurity: (patch: Partial<SecuritySettings>) => void;
};

/**
 * Side effects that must follow persisted security flags — not only UI toggles.
 * Runs at boot/rehydrate and whenever security settings change.
 */
export async function applySettingsSecurityRuntime(
    security: SecuritySettings,
    handlers?: SettingsSecurityRuntimeHandlers,
): Promise<'ok' | 'biometric-reset'> {
    if (security.localOnlyMode) {
        const { RealtimeService } = await import('@/app/services/RealtimeService');
        await RealtimeService.unsubscribeAll();
        try {
            const { supabase } = await import('@/app/lib/supabase-client');
            await supabase.removeAllChannels();
            supabase.realtime?.disconnect?.();
        } catch {
            /* العميل قد لا يكون مهيأً بعد */
        }
    }

    const reconcile = reconcileBiometricSessionLockEnabled(security.biometricLock);
    if (reconcile === 'reset') {
        handlers?.patchSecurity({ biometricLock: false });
        return 'biometric-reset';
    }

    return 'ok';
}
