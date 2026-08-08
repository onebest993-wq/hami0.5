import React, { memo, useLayoutEffect, useRef } from 'react';
import { HeaderToolbarNav } from './HeaderToolbarNav';
import { HeaderProfileTrigger } from './HeaderProfileTrigger';
import { useAuthUser } from '@/app/context/AuthContext';
import { resolveCalendarUserId } from '@/app/services/calendar/bridge/lite';
import {
    clearPublishedLawyerHeaderOffset,
    publishLawyerHeaderOffset,
} from '@/app/components/lawyer/LawyerDashboardParts/publishLawyerHeaderOffset';

export interface HeaderProps {
    shouldShow: boolean;
    unreadCount: number;
    onProfileClick: () => void;
    onProfilePointerEnter?: () => void;
    onProfilePointerDown?: () => void;
    /** تبويب الملف مفتوح — لـ aria-expanded فقط */
    profileExpanded?: boolean;
    /** shell الملف جاهز للفتح الفوري */
    profileShellReady?: boolean;
    onSearchClick: () => void;
    onSearchPointerEnter?: () => void;
    onSearchPointerDown?: () => void;
    onNotificationsClick: () => void;
    onNotificationsPointerEnter?: () => void;
    onNotificationsPointerDown?: () => void;
    onSettingsClick: () => void;
    onSettingsPointerEnter?: () => void;
    onSettingsPointerDown?: () => void;
}

export const Header = memo(function Header({
    shouldShow,
    unreadCount,
    onProfileClick,
    onProfilePointerEnter,
    onProfilePointerDown,
    profileExpanded = false,
    profileShellReady = true,
    onSearchClick,
    onSearchPointerEnter,
    onSearchPointerDown,
    onNotificationsClick,
    onNotificationsPointerEnter,
    onNotificationsPointerDown,
    onSettingsClick,
    onSettingsPointerEnter,
    onSettingsPointerDown,
}: HeaderProps) {
    const user = useAuthUser();
    const meta = (user?.user_metadata ?? {}) as Record<string, unknown>;
    const calendarUserId = resolveCalendarUserId(user?.id ?? null);
    const headerRef = useRef<HTMLElement>(null);

    useLayoutEffect(() => {
        const node = headerRef.current;
        if (!node) return;
        if (shouldShow) node.removeAttribute('inert');
        else node.setAttribute('inert', '');
    }, [shouldShow]);

    useLayoutEffect(() => {
        const node = headerRef.current;
        if (!node || !shouldShow) {
            clearPublishedLawyerHeaderOffset();
            return;
        }

        const syncOffset = () => {
            publishLawyerHeaderOffset(node.offsetHeight);
        };

        syncOffset();

        if (typeof ResizeObserver === 'undefined') return;
        const observer = new ResizeObserver(syncOffset);
        observer.observe(node);
        return () => {
            observer.disconnect();
            clearPublishedLawyerHeaderOffset();
        };
    }, [shouldShow]);

    return (
        <header
            ref={headerRef}
            className="hami-lawyer-header fixed top-0 left-0 right-0 z-50 flex items-center justify-between px-3 sm:px-5"
            data-header-visible={shouldShow ? 'true' : 'false'}
            style={{
                opacity: shouldShow ? 1 : 0,
                visibility: shouldShow ? 'visible' : 'hidden',
                pointerEvents: shouldShow ? 'auto' : 'none',
            }}
            aria-hidden={!shouldShow}
        >
            <HeaderProfileTrigger
                interactive={shouldShow}
                userId={calendarUserId}
                userMetadata={meta}
                expanded={profileExpanded}
                shellReady={profileShellReady}
                onClick={onProfileClick}
                onPointerEnter={onProfilePointerEnter}
                onPointerDown={onProfilePointerDown}
            />

            <HeaderToolbarNav
                interactive={shouldShow}
                unreadCount={unreadCount}
                onSearchClick={onSearchClick}
                onSearchPointerEnter={onSearchPointerEnter}
                onSearchPointerDown={onSearchPointerDown}
                onNotificationsClick={onNotificationsClick}
                onNotificationsPointerEnter={onNotificationsPointerEnter}
                onNotificationsPointerDown={onNotificationsPointerDown}
                onSettingsClick={onSettingsClick}
                onSettingsPointerEnter={onSettingsPointerEnter}
                onSettingsPointerDown={onSettingsPointerDown}
            />
        </header>
    );
});
