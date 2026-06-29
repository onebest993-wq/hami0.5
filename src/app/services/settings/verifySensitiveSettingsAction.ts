import { SmartDialog } from '@/app/components/ui/SmartDialog';
import { SmartToast } from '@/app/components/ui/SmartToast';
import {
    hasNativeBiometricEnrollment,
    verifyNativeBiometricUnlock,
} from '@/app/runtime/nativeBiometricBridge';
import {
    hasStoredBiometricCredential,
    isWebAuthnLockSupported,
    verifyBiometricUnlock,
} from '@/app/services/security/webAuthnLock';
import { getLawyerSettingsSnapshot } from '@/app/services/settings/settingsRuntime';

export type VerifySensitiveSettingsOptions = {
    /** نص يُطلب كتابته حرفياً عند غياب البيومتري */
    confirmPhrase: string;
    promptMessage?: string;
    title?: string;
};

async function verifyWithBiometric(security: ReturnType<typeof getLawyerSettingsSnapshot>['security']): Promise<boolean | null> {
    if (!security.biometricLock) return null;

    if (hasNativeBiometricEnrollment()) {
        try {
            const nativeOk = await verifyNativeBiometricUnlock();
            if (nativeOk === true) return true;
            if (nativeOk === false) {
                SmartToast.warning('تعذّر التحقق البيومتري — ألغِ العملية أو فعّل البصمة من جديد');
                return false;
            }
        } catch {
            SmartToast.warning('تعذّر التحقق البيومتري');
            return false;
        }
    }

    if (isWebAuthnLockSupported() && hasStoredBiometricCredential()) {
        try {
            const ok = await verifyBiometricUnlock();
            if (ok) return true;
            SmartToast.warning('تعذّر التحقق البيومتري — ألغِ العملية أو فعّل البصمة من جديد');
            return false;
        } catch {
            SmartToast.warning('تعذّر التحقق البيومتري');
            return false;
        }
    }

    return null;
}

/** تحقق إضافي قبل مسح/إعادة ضبط — بيومتري إن وُجد، وإلا عبارة تأكيد مكتوبة */
export async function verifySensitiveSettingsAction(options: VerifySensitiveSettingsOptions): Promise<boolean> {
    const { confirmPhrase, promptMessage, title } = options;
    const security = getLawyerSettingsSnapshot().security;

    const biometricResult = await verifyWithBiometric(security);
    if (biometricResult === true) return true;
    if (biometricResult === false) return false;

    const typed = await SmartDialog.prompt(
        promptMessage ?? `اكتب «${confirmPhrase}» للمتابعة:`,
        '',
        { title: title ?? 'تأكيد الهوية', confirmText: 'متابعة', cancelText: 'إلغاء' },
    );
    const normalized = typed?.trim() ?? '';
    if (!normalized) return false;
    if (normalized !== confirmPhrase) {
        SmartToast.warning('نص التأكيد غير صحيح');
        return false;
    }
    return true;
}
