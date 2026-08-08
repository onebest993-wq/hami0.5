import { SmartDialog } from '@/app/components/ui/SmartDialog';
import { SmartToast } from '@/app/components/ui/SmartToast';
import {
    verifyBiometricSessionUnlock,
} from '@/app/services/security/biometricSessionService';
import { getLawyerSettingsSnapshot } from '@/app/services/settings/settingsRuntime';

export type VerifySensitiveSettingsOptions = {
    /** نص يُطلب كتابته حرفياً عند غياب البيومتري */
    confirmPhrase: string;
    promptMessage?: string;
    title?: string;
};

const CHALLENGE_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

function randomChallengeToken(length = 4): string {
    const bytes = new Uint8Array(length);
    if (typeof crypto !== 'undefined' && typeof crypto.getRandomValues === 'function') {
        crypto.getRandomValues(bytes);
    } else {
        for (let i = 0; i < length; i += 1) bytes[i] = Math.floor(Math.random() * 256);
    }
    let out = '';
    for (let i = 0; i < length; i += 1) {
        out += CHALLENGE_ALPHABET[bytes[i]! % CHALLENGE_ALPHABET.length]!;
    }
    return out;
}

/**
 * يولّد عبارة تأكيد لمرة واحدة (أساس + رمز عشوائي) حتى لا تُخمَّن العبارة الثابتة
 * عند غياب البيومتري.
 */
export function mintSensitiveConfirmChallenge(basePhrase: string): {
    confirmPhrase: string;
    promptMessage: string;
} {
    const token = randomChallengeToken(4);
    const confirmPhrase = `${basePhrase.trim()}-${token}`;
    return {
        confirmPhrase,
        promptMessage: `اكتب «${confirmPhrase}» حرفياً للمتابعة:`,
    };
}

async function verifyWithBiometric(security: ReturnType<typeof getLawyerSettingsSnapshot>['security']): Promise<boolean | null> {
    if (!security.biometricLock) return null;

    const biometricOk = await verifyBiometricSessionUnlock();
    if (biometricOk === true) return true;
    if (biometricOk === false) {
        SmartToast.warning('تعذّر التحقق البيومتري — ألغِ العملية أو فعّل البصمة من جديد');
        return false;
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
