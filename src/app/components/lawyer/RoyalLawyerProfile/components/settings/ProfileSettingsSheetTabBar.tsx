import React, { memo } from 'react';
import { LayoutGrid, Lock, Palette } from 'lucide-react';
import type { ProfileSettingsTab } from '@/app/components/lawyer/RoyalLawyerProfile/hooks/useProfileSettingsSheetState';

const TAB_META: { id: ProfileSettingsTab; label: string; icon: React.ElementType }[] = [
    { id: 'privacy', label: 'الخصوصية', icon: Lock },
    { id: 'appearance', label: 'المظهر', icon: Palette },
    { id: 'containers', label: 'الحاويات', icon: LayoutGrid },
];

export const PROFILE_SETTINGS_TAB_IDS: ProfileSettingsTab[] = ['privacy', 'appearance', 'containers'];

type ProfileSettingsSheetTabBarProps = {
    activeTab: ProfileSettingsTab;
    onTabChange: (tab: ProfileSettingsTab) => void;
    onTabKeyDown: (event: React.KeyboardEvent) => void;
};

export const ProfileSettingsSheetTabBar = memo(function ProfileSettingsSheetTabBar({
    activeTab,
    onTabChange,
    onTabKeyDown,
}: ProfileSettingsSheetTabBarProps) {
    return (
        <div className="px-4 pb-3">
            <div
                className="profile-settings-luxury-card p-1 flex gap-1"
                role="tablist"
                aria-label="تبويبات الاستوديو"
                onKeyDown={onTabKeyDown}
            >
                {TAB_META.map((t) => {
                    const Icon = t.icon;
                    const active = activeTab === t.id;
                    return (
                        <button
                            key={t.id}
                            id={`profile-settings-tab-${t.id}`}
                            type="button"
                            role="tab"
                            aria-selected={active}
                            tabIndex={active ? 0 : -1}
                            data-testid={`profile-settings-tab-${t.id}`}
                            onClick={() => onTabChange(t.id)}
                            data-active={active}
                            className="profile-settings-tab flex items-center justify-center gap-1.5 min-h-[44px]"
                        >
                            <Icon size={13} strokeWidth={2.2} />
                            {t.label}
                        </button>
                    );
                })}
            </div>
        </div>
    );
});
