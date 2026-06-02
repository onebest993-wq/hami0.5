import React from 'react';
import { Shield, User } from 'lucide-react';
import { SmartToast } from '@/app/components/ui/SmartToast';
import { SectionHeader, SettingCard, SettingRow } from './settings-ui';

export type AccountSectionProps = {
    onClose: () => void;
    onLogout?: () => void;
    onOpenProfile?: () => void;
    onOpenPrivacy?: () => void;
    onOpenSupport?: () => void;
};

export function AccountSection({ onClose, onLogout, onOpenProfile, onOpenPrivacy, onOpenSupport }: AccountSectionProps) {
    return (
        <>
            <SectionHeader title="الحساب" subtitle="الملف والدعم" icon={User} />
            <SettingCard>
                <SettingRow
                    icon={User}
                    label="الملف المهني"
                    subLabel="تبويب الملف داخل التطبيق"
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
                    subLabel="نص السياسة داخل التطبيق"
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
                    subLabel="بريد الدعم: support@hami.app"
                    action={
                        <button
                            type="button"
                            onClick={() => {
                                if (onOpenSupport) {
                                    onClose();
                                    onOpenSupport();
                                    return;
                                }
                                window.open('mailto:support@hami.app?subject=%D8%AF%D8%B9%D9%85%20%D9%81%D9%86%D9%8A%20-%20%D8%AD%D8%A7%D9%85%D9%8A');
                                SmartToast.success('تم فتح البريد');
                            }}
                            className="text-white/50 text-xs hover:text-white"
                        >
                            تواصل
                        </button>
                    }
                />
                {onLogout && (
                    <SettingRow
                        icon={User}
                        label="تسجيل الخروج"
                        isLast
                        action={
                            <button
                                type="button"
                                onClick={() => {
                                    onClose();
                                    onLogout();
                                }}
                                className="text-rose-400 text-xs font-bold"
                            >
                                خروج
                            </button>
                        }
                    />
                )}
            </SettingCard>
        </>
    );
}

