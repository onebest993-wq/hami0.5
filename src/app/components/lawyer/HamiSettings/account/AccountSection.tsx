import React, { memo } from 'react';
import { User } from 'lucide-react';
import { SmartDialog } from '@/app/components/ui/SmartDialog';
import { SmartToast } from '@/app/components/ui/SmartToast';
import { buildHamiSupportWhatsAppUrl } from '@/app/constants/supportContacts';
import { SettingCard, SettingRow } from '../settings-ui';

export type AccountSectionProps = {
    onClose: () => void;
    onLogout?: () => void;
};

export const AccountSection = memo(function AccountSection({
    onClose,
    onLogout,
}: AccountSectionProps) {
    const openExternal = (url: string, label: string) => {
        const opened = window.open(url, '_blank', 'noopener,noreferrer');
        if (!opened) {
            window.location.assign(url);
        }
        SmartToast.success(label);
    };

    const requestLogout = async () => {
        if (!onLogout) return;
        const ok = await SmartDialog.confirm('ستُنهى جلسة تسجيل الدخول على هذا الجهاز.', {
            title: 'تسجيل الخروج؟',
            confirmText: 'خروج',
            cancelText: 'إلغاء',
        });
        if (!ok) return;
        onClose();
        onLogout();
    };

    return (
        <div data-testid="settings-section-account" data-settings-interactive="true">
            <SettingCard>
                <SettingRow
                    icon={User}
                    label="الدعم الفني"
                    action={
                        <button
                            type="button"
                            onClick={() =>
                                openExternal(
                                    buildHamiSupportWhatsAppUrl('مرحباً، أحتاج دعماً فنياً في تطبيق حامي'),
                                    'تم فتح واتساب',
                                )
                            }
                            className="text-[#25D366] text-xs font-bold hover:text-[#3fe07a]"
                        >
                            واتساب
                        </button>
                    }
                />
                {onLogout ? (
                    <SettingRow
                        icon={User}
                        label="تسجيل الخروج"
                        isLast
                        action={
                            <button
                                type="button"
                                onClick={() => void requestLogout()}
                                data-testid="settings-account-logout"
                                aria-label="تسجيل الخروج"
                                className="text-rose-400 text-xs font-bold min-h-[44px]"
                            >
                                خروج
                            </button>
                        }
                    />
                ) : null}
            </SettingCard>
        </div>
    );
});
