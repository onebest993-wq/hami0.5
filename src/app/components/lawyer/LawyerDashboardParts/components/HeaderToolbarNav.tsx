import React, { memo, useLayoutEffect, useRef } from 'react';
import { HeaderSearchTrigger } from './HeaderSearchTrigger';
import { HeaderNotificationsTrigger } from './HeaderNotificationsTrigger';
import { HeaderSettingsTrigger } from './HeaderSettingsTrigger';
import { HeaderToolbarReveal } from './HeaderToolbarReveal';
import { useHeaderToolsDismiss } from './useHeaderToolsDismiss';
import { useHeaderToolsReveal } from './useHeaderToolsReveal';
import { blurFocusWithin, inertProps } from '@/app/utils/inertProps';

export type HeaderToolbarNavProps = {
    interactive?: boolean;
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
    interactive = true,
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
    const navRef = useRef<HTMLElement>(null);
    const toolsRef = useRef<HTMLDivElement>(null);
    const { open, bloom, toggle, close, navPointer } = useHeaderToolsReveal();
    useHeaderToolsDismiss({ open, close, navRef });

    useLayoutEffect(() => {
        if (open) return;
        const tools = toolsRef.current;
        const nav = navRef.current;
        if (!tools || !nav) return;
        const active = document.activeElement;
        if (!(active instanceof HTMLElement) || !tools.contains(active)) return;
        blurFocusWithin(tools);
        const reveal = nav.querySelector('[data-testid="header-tools-reveal"]');
        if (reveal instanceof HTMLButtonElement) {
            reveal.focus({ preventScroll: true });
        }
    }, [open]);

    return (
        <nav
            ref={navRef}
            className={`hami-header-tool-strip ${interactive ? 'pointer-events-auto' : 'pointer-events-none'}`}
            aria-label="أدوات اللوحة"
            data-testid="header-toolbar-nav"
            data-hami-tools-open={open ? '1' : '0'}
            data-hami-tools-bloom={bloom ? '1' : '0'}
            {...navPointer}
        >
            <HeaderToolbarReveal open={open} unreadCount={unreadCount} onToggle={toggle} />
            <div
                ref={toolsRef}
                id="header-toolbar-tools"
                data-testid="header-toolbar-tools"
                className="hami-header-tool-actions"
                hidden={!open}
                {...inertProps(!open)}
            >
                <HeaderSearchTrigger
                    onClick={onSearchClick}
                    onPointerEnter={onSearchPointerEnter}
                    onPointerDown={onSearchPointerDown}
                />
                <HeaderNotificationsTrigger
                    unreadCount={unreadCount}
                    onClick={onNotificationsClick}
                    onPointerEnter={onNotificationsPointerEnter}
                    onPointerDown={onNotificationsPointerDown}
                />
                <HeaderSettingsTrigger
                    onClick={onSettingsClick}
                    onPointerEnter={onSettingsPointerEnter}
                    onPointerDown={onSettingsPointerDown}
                />
            </div>
        </nav>
    );
});
