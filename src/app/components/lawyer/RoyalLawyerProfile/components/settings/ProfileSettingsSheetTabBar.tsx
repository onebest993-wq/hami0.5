import React, { memo, useRef } from 'react';
import { Palette, Layers } from '@/app/components/ui/lucideIcons';
import type { ProfileSettingsTab } from '@/app/components/lawyer/RoyalLawyerProfile/hooks/useProfileSettingsSheetState';
import { prefetchProfileStudioMainTab } from '@/app/runtime/profileSettingsStudioTabsLoader';

const TAB_META: { id: ProfileSettingsTab; label: string; icon: React.ElementType }[] = [
    { id: 'appearance', label: 'المظهر', icon: Palette },
    { id: 'containers', label: 'المحتويات', icon: Layers },
];

type ProfileSettingsSheetTabBarProps = {
    activeTab: ProfileSettingsTab;
    onTabChange: (tab: ProfileSettingsTab) => void;
    onTabKeyDown: (event: React.KeyboardEvent) => void;
};

/**
 * لا تستخدم preventDefault على pointerdown —
 * على Android/المحاكي يمرّر الـ click التالي إلى خلفية الورقة ويغلق الاستوديو.
 */
export const ProfileSettingsSheetTabBar = memo(function ProfileSettingsSheetTabBar({
    activeTab,
    onTabChange,
    onTabKeyDown,
}: ProfileSettingsSheetTabBarProps) {
    const armedByTouchRef = useRef<ProfileSettingsTab | null>(null);

    return (
        <div className="shrink-0 px-6 pb-3">
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
                            aria-controls={`profile-settings-panel-${t.id}`}
                            tabIndex={active ? 0 : -1}
                            data-testid={`profile-settings-tab-${t.id}`}
                            data-active={active}
                            className="profile-settings-tab flex items-center justify-center gap-1 min-h-[44px] touch-manipulation"
                            style={{ WebkitTapHighlightColor: 'transparent', touchAction: 'manipulation' }}
                            onPointerDown={(event) => {
                                if (event.button !== 0) return;
                                event.stopPropagation();
                                if (!active) prefetchProfileStudioMainTab(t.id);
                                if (event.pointerType === 'touch' || event.pointerType === 'pen') {
                                    armedByTouchRef.current = t.id;
                                    onTabChange(t.id);
                                }
                            }}
                            onPointerEnter={() => {
                                if (!active) prefetchProfileStudioMainTab(t.id);
                            }}
                            onFocus={() => {
                                if (!active) prefetchProfileStudioMainTab(t.id);
                            }}
                            onClick={(event) => {
                                event.stopPropagation();
                                if (armedByTouchRef.current === t.id) {
                                    armedByTouchRef.current = null;
                                    return;
                                }
                                onTabChange(t.id);
                            }}
                        >
                            <Icon size={13} strokeWidth={2.2} className="shrink-0" />
                            <span className="truncate">{t.label}</span>
                        </button>
                    );
                })}
            </div>
        </div>
    );
});
