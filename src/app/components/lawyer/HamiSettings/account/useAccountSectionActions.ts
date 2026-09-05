import { useRef, useState } from 'react';
import { SmartDialog } from '@/app/components/ui/SmartDialog';
import { SmartToast } from '@/app/components/ui/SmartToast';
import { isCapacitorNativePlatform } from '@/app/runtime/nativePlatform';
import { openNativeScheme } from '@/app/services/profile/profileContactNavigation';
import { requestAuthGateFromGuest } from '@/app/services/auth/requestAuthGateFromGuest';
import { settingsFlowAbandoned } from '../settingsFlowGuard';
import { useWipeCountdown } from '../hooks/useWipeCountdown';
import { isAllowedSettingsSupportUrl } from './settingsSupportUrl';

const DELETE_ACCOUNT_PHRASE = 'مسح الحساب';

export function useAccountSectionActions(
    onClose: () => void,
    onLogout?: (options?: { skipLocalPurge?: boolean }) => void | Promise<void>,
    resetToDefaults?: () => void,
) {
    const [logoutPending, setLogoutPending] = useState(false);
    const logoutInFlightRef = useRef(false);
    const {
        COUNTDOWN_SECONDS,
        wipePhase,
        setWipePhase,
        countdown,
        setCountdown,
        cancelCountdown,
        waitCountdown,
        beginDangerRequest,
        endDangerRequest,
        sectionActiveRef,
        mountedRef,
    } = useWipeCountdown();

    const openSupportLink = (url: string, label: string) => {
        if (!isAllowedSettingsSupportUrl(url)) {
            SmartToast.warning('رابط الدعم غير صالح');
            return;
        }
        if (isCapacitorNativePlatform()) {
            openNativeScheme(url);
            SmartToast.success(label);
            return;
        }

        const opened = window.open(url, '_blank', 'noopener,noreferrer');
        if (!opened) {
            SmartToast.warning('تعذر فتح الرابط — تحقق من إعدادات النوافذ المنبثقة');
            return;
        }
        SmartToast.success(label);
    };

    const requestLogin = () => {
        onClose();
        requestAuthGateFromGuest('login');
    };

    const requestLogout = async () => {
        if (!onLogout || logoutInFlightRef.current) return;
        logoutInFlightRef.current = true;
        try {
            const ok = await SmartDialog.confirm('ستُنهى جلسات تسجيل الدخول على كل الأجهزة المرتبطة بهذا الحساب.', {
                title: 'تسجيل الخروج؟',
                confirmText: 'خروج',
                cancelText: 'إلغاء',
            });
            if (!ok) return;
            setLogoutPending(true);
            /* أغلق الإعدادات فوراً — لا تنتظر مسح المخزن / شبكة الخروج */
            onClose();
            try {
                await onLogout();
            } catch {
                SmartToast.warning(
                    'خرجت من هذا الجهاز. تعذّر إكمال الخروج بالكامل — أعد المحاولة إن بقيت شاشة الدخول مغلقة',
                );
            } finally {
                setLogoutPending(false);
            }
        } finally {
            logoutInFlightRef.current = false;
        }
    };

    const requestDeleteAccount = async () => {
        if (!resetToDefaults) {
            SmartToast.warning('تعذر بدء مسح الحساب من هذه الجلسة');
            return;
        }
        if (!beginDangerRequest()) return;
        try {
            const okFirst = await SmartDialog.confirm(
                'سيُحذف حسابك نهائياً مع كل القضايا والملاحظات والتنفيذ والمخزن على هذا الجهاز وفي السحابة. لن تتمكن من الدخول بهذا الحساب بعد ذلك.',
                { title: 'مسح الحساب؟', confirmText: 'متابعة', cancelText: 'إلغاء' },
            );
            if (!okFirst || settingsFlowAbandoned(sectionActiveRef)) return;

            const { mintSensitiveConfirmChallenge, verifySensitiveSettingsAction } = await import(
                '@/app/services/settings/verifySensitiveSettingsAction'
            );
            const challenge = mintSensitiveConfirmChallenge(DELETE_ACCOUNT_PHRASE);
            const verified = await verifySensitiveSettingsAction({
                confirmPhrase: challenge.confirmPhrase,
                title: 'تحقق قبل مسح الحساب',
                promptMessage: challenge.promptMessage,
            });
            if (!verified || settingsFlowAbandoned(sectionActiveRef)) return;

            SmartToast.warning(`انتظر ${COUNTDOWN_SECONDS} ثوانٍ قبل التأكيد النهائي`);
            const completed = await waitCountdown();
            if (!completed) {
                if (mountedRef.current) setWipePhase('idle');
                return;
            }
            if (settingsFlowAbandoned(sectionActiveRef)) return;

            const okFinal = await SmartDialog.confirm(
                'هذا تأكيد نهائي. سيُمسح الحساب وبياناته الآن ولا يمكن التراجع.',
                { title: 'التأكيد النهائي', confirmText: 'مسح الحساب', cancelText: 'إلغاء' },
            );
            if (!okFinal) {
                if (mountedRef.current) setWipePhase('idle');
                return;
            }
            if (settingsFlowAbandoned(sectionActiveRef)) return;

            setWipePhase('wiping');
            try {
                const { deleteLawyerAccount } = await import('@/app/services/settings/deleteLawyerAccount');
                await deleteLawyerAccount(resetToDefaults, onLogout);
                SmartToast.success('تم مسح الحساب وبياناته');
                onClose();
            } catch (error) {
                const message = error instanceof Error ? error.message : '';
                if (message === 'account_delete_unauthenticated') {
                    SmartToast.warning('سجّل الدخول بحساب حقيقي لمسح الحساب');
                } else {
                    SmartToast.warning('تعذر مسح الحساب — لم يُحذف من الخادم، يمكنك إعادة المحاولة');
                }
            } finally {
                if (mountedRef.current) {
                    setWipePhase('idle');
                    setCountdown(0);
                }
            }
        } finally {
            endDangerRequest();
        }
    };

    return {
        logoutPending,
        deletePhase: wipePhase,
        deleteCountdown: countdown,
        cancelDeleteCountdown: cancelCountdown,
        openSupportLink,
        requestLogin,
        requestLogout,
        requestDeleteAccount,
    };
}
