import { SmartToast } from '@/app/components/ui/SmartToast';
import { SmartDialog } from '@/app/components/ui/SmartDialog';
import { ensureSettingsDialogsReady } from '../settingsDialogPrefetch';
import { isCapacitorNativePlatform } from '@/app/runtime/nativePlatform';
import {
    clearBiometricSessionEnrollment,
    enrollBiometricSessionLock,
} from '@/app/services/security/biometricSessionService';
import type { AppSettingsState } from '@/app/services/settings';
import { applySettingsSecurityRuntime } from '@/app/services/settings/settingsSecurityRuntime';

type SecuritySlice = AppSettingsState['security'];

export async function runLocalOnlyToggle(
    enabled: boolean,
    patchLocalOnlyMode: (enabled: boolean) => void,
    security: SecuritySlice,
): Promise<boolean | void> {
    if (enabled) {
        await ensureSettingsDialogsReady();
        const ok = await SmartDialog.confirm(
            'لن يتصل التطبيق بالإنترنت أو السحابة. تبقى القضايا والملاحظات والتنفيذ على هذا الجهاز فقط. يمكنك إلغاء ذلك لاحقاً.',
            { title: 'تفعيل قطع الاتصال؟' },
        );
        if (!ok) return false;
        const { armLocalOnlyNetworkIsolation } = await import(
            '@/app/services/settings/localOnlyNetworkIsolation'
        );
        armLocalOnlyNetworkIsolation(true);
        patchLocalOnlyMode(true);
        void applySettingsSecurityRuntime({
            ...security,
            localOnlyMode: true,
        });
        SmartToast.success('قطع الاتصال — العمل محلياً بالكامل');
        return;
    }
    const { armLocalOnlyNetworkIsolation } = await import(
        '@/app/services/settings/localOnlyNetworkIsolation'
    );
    armLocalOnlyNetworkIsolation(false);
    patchLocalOnlyMode(false);
    SmartToast.info('تم استعادة إمكانية الاتصال');
}

export async function runBiometricLockToggle(
    checked: boolean,
    patchSecurity: (partial: Partial<SecuritySlice>) => void,
    autoLockMinutes: SecuritySlice['autoLockMinutes'],
): Promise<boolean | void> {
    if (!checked) {
        await ensureSettingsDialogsReady();
        const ok = await SmartDialog.confirm(
            'سيُلغى التحقق بالبصمة أو Face ID عند فتح التطبيق.',
            { title: 'إيقاف القفل البيومتري؟' },
        );
        if (!ok) return false;
        clearBiometricSessionEnrollment();
        patchSecurity({ biometricLock: false });
        SmartToast.success('تم إيقاف القفل البيومتري');
        return;
    }

    const loadingToastId = SmartToast.loading('جاري التحقق البيومتري…');
    let outcome: Awaited<ReturnType<typeof enrollBiometricSessionLock>>;
    try {
        outcome = await enrollBiometricSessionLock();
    } finally {
        if (loadingToastId) SmartToast.dismiss(loadingToastId);
    }
    if (outcome.status === 'enrolled') {
        const needsAutoLock = autoLockMinutes === 0;
        patchSecurity({
            biometricLock: true,
            ...(needsAutoLock ? { autoLockMinutes: 5 as const } : {}),
        });
        SmartToast.success(
            needsAutoLock
                ? 'تم تفعيل البصمة مع قفل تلقائي (5 دقائق)'
                : 'تم تفعيل القفل البيومتري',
        );
        return;
    }

    if (outcome.status === 'cancelled') {
        SmartToast.info('لم يُفعَّل القفل البيومتري — ألغيت التحقق أو فشل');
        return false;
    }

    if (outcome.status === 'unavailable') {
        /* لا probeBiometricSession هنا — كان يعلّق المفتاح بعد إخفاء «جاري التحقق» */
        if (isCapacitorNativePlatform()) {
            SmartToast.warning(
                'القفل البيومتري غير متاح في هذا التثبيت — أعد cap:sync:android أو سجّل بصمة في إعدادات الهاتف',
            );
        } else {
            SmartToast.info('القفل البيومتري يتطلب جهازاً يدعم البصمة أو Face ID');
        }
        return false;
    }

    SmartToast.warning('تعذر تفعيل البصمة على هذا الجهاز');
    return false;
}

export async function runScreenshotDeterrentToggle(
    enabled: boolean,
    patchSecurity: (partial: Partial<SecuritySlice>) => void,
): Promise<boolean | void> {
    const { syncNativeScreenshotGuard } = await import(
        '@/app/runtime/screenshotDeterrentRuntime'
    );
    const applied = await syncNativeScreenshotGuard(enabled);
    if (!applied) {
        SmartToast.warning(
            enabled
                ? 'تعذر تفعيل حماية لقطة الشاشة على هذا الجهاز'
                : 'تعذر إيقاف حماية لقطة الشاشة على هذا الجهاز',
        );
        return false;
    }
    patchSecurity({ screenshotDeterrent: enabled });
}

export async function runPrivacyBlurToggle(
    enabled: boolean,
    patchSecurity: (partial: Partial<SecuritySlice>) => void,
    screenshotDeterrent: boolean,
): Promise<boolean | void> {
    const { applyNativePrivacyGuard } = await import('@/app/runtime/nativePrivacyGuard');
    if (!enabled) {
        await ensureSettingsDialogsReady();
        const ok = await SmartDialog.confirm(
            'لن تُموَّه الشاشة عند إخفائها ولن تُغطَّى معاينة المهام في نظام الهاتف.',
            { title: 'إيقاف ضبابية الخصوصية؟' },
        );
        if (!ok) return false;
        const applied = await applyNativePrivacyGuard({
            recentsCover: false,
            windowSecure: screenshotDeterrent,
        });
        if (!applied) {
            SmartToast.warning('تعذر إيقاف حماية شاشة المهام على هذا الجهاز');
            return false;
        }
        patchSecurity({ privacyBlur: false });
        SmartToast.info('أُوقفت ضبابية الخصوصية');
        return;
    }
    const applied = await applyNativePrivacyGuard({
        recentsCover: true,
        windowSecure: true,
    });
    if (!applied) {
        SmartToast.warning('تعذر تفعيل تغطية شاشة المهام — حدّث التطبيق من المتجر أو أعد تثبيته');
        return false;
    }
    patchSecurity({ privacyBlur: true });
    SmartToast.success('ضبابية الخصوصية مفعّلة — الشاشة مغطاة عند الإخفاء وفي شاشة المهام');
}
