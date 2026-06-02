import React from 'react';
import { Bell, Briefcase, Database, Shield, User } from 'lucide-react';
import type { AppSettingsState } from '@/app/services/settings';
import { SectionHeader, SettingCard, SettingRow, Toggle } from './settings-ui';

export type NotificationsSectionProps = {
    settings: AppSettingsState;
    patchNotifications: (partial: Partial<AppSettingsState['notifications']>) => void;
};

export function NotificationsSection({ settings, patchNotifications }: NotificationsSectionProps) {
    return (
        <>
            <SectionHeader title="الإشعارات" subtitle="تحكم دقيق بكل قناة وتنبيه" icon={Bell} />
            <SettingCard>
                <SettingRow
                    icon={Bell}
                    label="تفعيل الإشعارات"
                    subLabel="المفتاح الرئيسي لكل التنبيهات"
                    action={
                        <Toggle
                            checked={settings.notifications.master}
                            onChange={(v) => patchNotifications({ master: v })}
                        />
                    }
                />
                <SettingRow icon={Briefcase} label="الدعاوى والقضايا" action={<Toggle checked={settings.notifications.lawsuits} onChange={(v) => patchNotifications({ lawsuits: v })} disabled={!settings.notifications.master} />} />
                <SettingRow icon={Shield} label="التنفيذ" action={<Toggle checked={settings.notifications.execution} onChange={(v) => patchNotifications({ execution: v })} disabled={!settings.notifications.master} />} />
                <SettingRow icon={Bell} label="التقويم والمواعيد" action={<Toggle checked={settings.notifications.calendar} onChange={(v) => patchNotifications({ calendar: v })} disabled={!settings.notifications.master} />} />
                <SettingRow icon={User} label="المجتمع والمكتبة" action={<Toggle checked={settings.notifications.community} onChange={(v) => patchNotifications({ community: v })} disabled={!settings.notifications.master} />} />
                <SettingRow icon={Database} label="المالية والمعاملات" action={<Toggle checked={settings.notifications.financial} onChange={(v) => patchNotifications({ financial: v })} disabled={!settings.notifications.master} />} />
                <SettingRow icon={Bell} label="إشعارات الدفع" action={<Toggle checked={settings.notifications.pushEnabled} onChange={(v) => patchNotifications({ pushEnabled: v })} disabled={!settings.notifications.master} />} />
                <SettingRow icon={Bell} label="الصوت" action={<Toggle checked={settings.notifications.sound} onChange={(v) => patchNotifications({ sound: v })} disabled={!settings.notifications.master} />} />
                <SettingRow icon={Bell} label="اهتزاز الجهاز" action={<Toggle checked={settings.notifications.vibrate} onChange={(v) => patchNotifications({ vibrate: v })} disabled={!settings.notifications.master} />} />
                <SettingRow
                    icon={Bell}
                    label="ساعات الهدوء"
                    subLabel={`${settings.notifications.quietHoursStart} — ${settings.notifications.quietHoursEnd}`}
                    isLast
                    action={<Toggle checked={settings.notifications.quietHours} onChange={(v) => patchNotifications({ quietHours: v })} disabled={!settings.notifications.master} />}
                />
                {settings.notifications.quietHours && (
                    <div className="px-4 pb-4 flex gap-2">
                        <input
                            type="time"
                            value={settings.notifications.quietHoursStart}
                            onChange={(e) => patchNotifications({ quietHoursStart: e.target.value })}
                            className="flex-1 bg-white/5 border border-white/10 rounded-lg py-2 text-white text-sm"
                        />
                        <input
                            type="time"
                            value={settings.notifications.quietHoursEnd}
                            onChange={(e) => patchNotifications({ quietHoursEnd: e.target.value })}
                            className="flex-1 bg-white/5 border border-white/10 rounded-lg py-2 text-white text-sm"
                        />
                    </div>
                )}
            </SettingCard>
        </>
    );
}

