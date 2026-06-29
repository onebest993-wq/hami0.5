import React, { memo } from 'react';
import { HeaderSearchTrigger } from './HeaderSearchTrigger';
import { HeaderNotificationsTrigger } from './HeaderNotificationsTrigger';
import { HeaderSettingsTrigger } from './HeaderSettingsTrigger';

export type HeaderToolbarNavProps = {
    unreadCount: number;
    onSearchClick: () => void;
    onSearchPointerEnter?: () => void;
    onSearchPointerDown?: () => void;
    onNotificationsClick: () => void;
    onNotificationsPointerEnter?: () => void;
    onNotificationsPointerDown?: () => void;
    onSettingsClick: () => void;
    onSettingsPointerEnter?: () => void;
    onSettingsPointerDown?: () => void;
};

export const HeaderToolbarNav = memo(function HeaderToolbarNav({
    unreadCount,
    onSearchClick,
    onSearchPointerEnter,
    onSearchPointerDown,
    onNotificationsClick,
    onNotificationsPointerEnter,
    onNotificationsPointerDown,
    onSettingsClick,
    onSettingsPointerEnter,
    onSettingsPointerDown,
}: HeaderToolbarNavProps) {
    return (
        <nav
            className="pointer-events-auto flex items-center gap-2 px-2.5 py-2 rounded-[1.35rem] hami-sovereign-glass hami-sovereign-rim hami-home-themed-border border border-white/[0.08] shadow-[0_12px_40px_rgba(0,0,0,0.35)]"
            aria-label="أدوات اللوحة"
            data-testid="header-toolbar-nav"
        >
            <HeaderSearchTrigger
                onClick={onSearchClick}
                onPointerEnter={onSearchPointerEnter}
                onPointerDown={onSearchPointerDown}
            />
            <span className="w-px h-7 bg-white/[0.08] shrink-0" aria-hidden />
            <HeaderNotificationsTrigger
                unreadCount={unreadCount}
                onClick={onNotificationsClick}
                onPointerEnter={onNotificationsPointerEnter}
                onPointerDown={onNotificationsPointerDown}
            />
            <span className="w-px h-7 bg-white/[0.08] shrink-0" aria-hidden />
            <HeaderSettingsTrigger
                onClick={onSettingsClick}
                onPointerEnter={onSettingsPointerEnter}
                onPointerDown={onSettingsPointerDown}
            />
        </nav>
    );
});
