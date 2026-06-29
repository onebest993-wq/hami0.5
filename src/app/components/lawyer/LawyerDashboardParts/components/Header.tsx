import React, { memo, useLayoutEffect } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { HeaderToolbarNav } from './HeaderToolbarNav';
import { HeaderProfileTrigger } from './HeaderProfileTrigger';
import { useAuthUser } from '@/app/context/AuthContext';
import { useReduceMotion } from '@/app/hooks/useReduceMotion';
import { resolveCalendarUserId } from '@/app/services/calendarBridge';
import { hydrateLawyerDashboardHeaderShellChunks } from '@/app/hooks/lawyerDashboard/headerShellIntentWarm';

export interface HeaderProps {
    shouldShow: boolean;
    unreadCount: number;
    onProfileClick: () => void;
    onProfilePointerEnter?: () => void;
    onProfilePointerDown?: () => void;
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
    const reduceMotion = useReduceMotion();
    const user = useAuthUser();
    const meta = (user?.user_metadata ?? {}) as Record<string, unknown>;
    const calendarUserId = resolveCalendarUserId(user?.id ?? null);

    useLayoutEffect(() => {
        if (!shouldShow || !calendarUserId) return;
        hydrateLawyerDashboardHeaderShellChunks(calendarUserId);
    }, [shouldShow, calendarUserId]);

    return (
        <AnimatePresence>
            {shouldShow ? (
                <motion.header
                    initial={reduceMotion ? false : { opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={reduceMotion ? undefined : { opacity: 0 }}
                    transition={{ duration: reduceMotion ? 0 : 0.22 }}
                    className="fixed top-0 left-0 right-0 z-50 h-[84px] flex items-center justify-between px-4 sm:px-5 pointer-events-none"
                >
                    <HeaderProfileTrigger
                        userId={calendarUserId}
                        userMetadata={meta}
                        onClick={onProfileClick}
                        onPointerEnter={onProfilePointerEnter}
                        onPointerDown={onProfilePointerDown}
                    />

                    <HeaderToolbarNav
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
                </motion.header>
            ) : null}
        </AnimatePresence>
    );
});
