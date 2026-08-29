import React, { memo, useLayoutEffect, useRef } from 'react';
import { HeaderToolbarNav } from './HeaderToolbarNav';
import {
    clearPublishedLawyerHeaderOffset,
    publishLawyerHeaderOffset,
} from '@/app/components/lawyer/LawyerDashboardParts/publishLawyerHeaderOffset';
import { HAMI_SHELL_CONTAINER } from '@/app/components/lawyer/dashboard/lawyerShellLayout';

export interface HeaderProps {
    shouldShow: boolean;
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
}

export const Header = memo(function Header({
    shouldShow,
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
}: HeaderProps) {
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

        const resizeObserver =
            typeof ResizeObserver !== 'undefined' ? new ResizeObserver(syncOffset) : null;
        resizeObserver?.observe(node);

        window.addEventListener('resize', syncOffset, { passive: true });
        const visualViewport = window.visualViewport;
        visualViewport?.addEventListener('resize', syncOffset);
        return () => {
            resizeObserver?.disconnect();
            window.removeEventListener('resize', syncOffset);
            visualViewport?.removeEventListener('resize', syncOffset);
            /* لا تُمسح الإزاحة عند إعادة التركيب — يمنع رعشة الشبكة تحت الهيدر */
        };
    }, [shouldShow]);

    return (
        <header
            ref={headerRef}
            className="hami-lawyer-header fixed top-0 left-0 right-0 z-[100] flex items-center justify-center hami-shell-gutter-x"
            data-header-visible={shouldShow ? 'true' : 'false'}
            style={{
                opacity: shouldShow ? 1 : 0,
                visibility: shouldShow ? 'visible' : 'hidden',
                pointerEvents: shouldShow ? 'auto' : 'none',
            }}
            aria-hidden={!shouldShow}
        >
            <div className={HAMI_SHELL_CONTAINER}>
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
            </div>
        </header>
    );
});
