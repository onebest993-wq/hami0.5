import React from 'react';
import { LogIn } from '@/app/components/ui/icons/LogIn';
import { LogOut } from '@/app/components/ui/icons/LogOut';
import { ScrollText } from '@/app/components/ui/icons/ScrollText';
import { User } from '@/app/components/ui/icons/User';
import { UserX } from '@/app/components/ui/icons/UserX';
import {
    buildHamiSupportMailtoUrl,
    HAMI_SUPPORT_EMAIL,
} from '@/app/constants/supportContacts';
import { SettingRow } from '../settings-ui/index';
import { AccountDocumentOpenButton } from './AccountDocumentOpenButton';
import type { AccountLegalDocumentId } from './accountLegalContent';
import type { useAccountSectionActions } from './useAccountSectionActions';

type AccountActions = ReturnType<typeof useAccountSectionActions>;

export function AccountSupportRows({
    openSupportLink,
    onOpenLegalDocument,
}: {
    openSupportLink: AccountActions['openSupportLink'];
    onOpenLegalDocument: (id: AccountLegalDocumentId) => void;
}) {
    return (
        <>
            <SettingRow
                icon={User}
                label="الدعم الفني"
                action={
                    <div className="flex gap-2">
                        <button
                            type="button"
                            onClick={() =>
                                openSupportLink(buildHamiSupportMailtoUrl(), 'تم فتح البريد')
                            }
                            data-testid="settings-account-support-email"
                            aria-label={`مراسلة الدعم عبر ${HAMI_SUPPORT_EMAIL}`}
                            className="text-[#E6C673] text-xs font-bold hover:text-[#F7EBC4] min-h-[44px] min-w-[44px] px-2 touch-manipulation inline-flex items-center"
                        >
                            بريد
                        </button>
                    </div>
                }
            />
            <SettingRow
                icon={ScrollText}
                label="الشروط والأحكام وسياسة الاستخدام والخصوصية"
                action={
                    <AccountDocumentOpenButton
                        label="عرض الشروط والأحكام وسياسة الاستخدام والخصوصية"
                        testId="settings-account-open-terms"
                        onOpen={() => onOpenLegalDocument('terms-and-usage')}
                    />
                }
            />
        </>
    );
}

export function AccountSessionRows({
    signedIn,
    onLogout,
    logoutPending,
    deletePhase,
    deleteCountdown,
    cancelDeleteCountdown,
    requestLogin,
    requestLogout,
    requestDeleteAccount,
}: {
    signedIn: boolean;
    onLogout?: (options?: { skipLocalPurge?: boolean }) => void | Promise<void>;
    logoutPending: boolean;
    deletePhase: AccountActions['deletePhase'];
    deleteCountdown: number;
    cancelDeleteCountdown: () => void;
    requestLogin: () => void;
    requestLogout: () => void | Promise<void>;
    requestDeleteAccount: () => void | Promise<void>;
}) {
    return (
        <>
            {signedIn && onLogout ? (
                <SettingRow
                    icon={LogOut}
                    label="تسجيل الخروج"
                    action={
                        <button
                            type="button"
                            disabled={logoutPending || deletePhase !== 'idle'}
                            onClick={() => void requestLogout()}
                            data-testid="settings-account-logout"
                            aria-label="تسجيل الخروج"
                            className="text-rose-400 text-xs font-bold min-h-[44px] min-w-[44px] inline-flex items-center justify-center disabled:opacity-40"
                        >
                            {logoutPending ? 'جاري الخروج…' : 'خروج'}
                        </button>
                    }
                />
            ) : (
                <SettingRow
                    icon={LogIn}
                    label="تسجيل الدخول"
                    isLast
                    action={
                        <button
                            type="button"
                            onClick={requestLogin}
                            data-testid="settings-account-login"
                            aria-label="تسجيل الدخول"
                            className="text-[#E6C673] text-xs font-bold min-h-[44px] min-w-[44px] inline-flex items-center justify-center"
                        >
                            دخول
                        </button>
                    }
                />
            )}
            {signedIn ? (
                <SettingRow
                    icon={UserX}
                    label="مسح الحساب"
                    isLast
                    action={
                        deletePhase === 'countdown' ? (
                            <div className="flex items-center gap-2">
                                <span className="text-amber-400 text-xs font-bold tabular-nums">
                                    {deleteCountdown}
                                </span>
                                <button
                                    type="button"
                                    onClick={cancelDeleteCountdown}
                                    data-testid="settings-account-delete-countdown-cancel"
                                    className="text-white/50 text-xs hover:text-white min-h-[44px] min-w-[44px] px-2 touch-manipulation"
                                >
                                    إلغاء
                                </button>
                            </div>
                        ) : (
                            <button
                                type="button"
                                disabled={deletePhase === 'wiping' || logoutPending}
                                onClick={() => void requestDeleteAccount()}
                                data-testid="settings-account-delete"
                                aria-label="مسح الحساب"
                                className="text-rose-400 text-xs font-bold min-h-[44px] min-w-[44px] inline-flex items-center justify-center disabled:opacity-40"
                            >
                                {deletePhase === 'wiping' ? 'جاري المسح…' : 'مسح'}
                            </button>
                        )
                    }
                />
            ) : null}
        </>
    );
}
