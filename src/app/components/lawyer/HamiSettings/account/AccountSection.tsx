import React, { memo } from 'react';
import { Shield, User } from 'lucide-react';
import { SmartDialog } from '@/app/components/ui/SmartDialog';
import { SmartToast } from '@/app/components/ui/SmartToast';
import {
    buildHamiSupportMailtoUrl,
    buildHamiSupportWhatsAppUrl,
} from '@/app/constants/supportContacts';
import { SectionHeader, SettingCard, SettingRow } from '../settings-ui';

export type AccountSectionProps = {
    onClose: () => void;
    onLogout?: () => void;
    onOpenProfile?: () => void;
    onOpenPrivacy?: () => void;
};

export const AccountSection = memo(function AccountSection({
    onClose,
    onLogout,
    onOpenProfile,
    onOpenPrivacy,
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
        <div data-testid="settings-section-account">
            <SectionHeader title="الحساب" subtitle="الملف والدعم" icon={User} />
            <SettingCard>
                <SettingRow
                    icon={User}
                    label="الملف المهني"
                    action={
                        <button
                            type="button"
                            onClick={() => {
                                if (!onOpenProfile) return;
                                onClose();
                                onOpenProfile();
                            }}
                            className="text-[#E6C673] text-xs font-bold"
                        >
                            فتح
                        </button>
                    }
                />
                <SettingRow
                    icon={Shield}
                    label="سياسة الخصوصية"
                    action={
                        <button
                            type="button"
                            onClick={() => {
                                if (!onOpenPrivacy) {
                                    SmartToast.warning('تعذر فتح سياسة الخصوصية');
                                    return;
                                }
                                onClose();
                                onOpenPrivacy();
                            }}
                            className="text-white/50 text-xs hover:text-white"
                        >
                            عرض
                        </button>
                    }
                />
                <SettingRow
                    icon={User}
                    label="الدعم الفني"
                    action={
                        <div className="flex items-center gap-2">
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
                            <button
                                type="button"
                                onClick={() =>
                                    openExternal(buildHamiSupportMailtoUrl(), 'تم فتح البريد')
                                }
                                className="text-white/50 text-xs hover:text-white"
                            >
                                بريد
                            </button>
                        </div>
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
