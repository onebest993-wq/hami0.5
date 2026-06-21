import React from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { HeaderSearchTrigger } from './HeaderSearchTrigger';
import { HeaderNotificationsTrigger } from './HeaderNotificationsTrigger';
import { HeaderSettingsTrigger } from './HeaderSettingsTrigger';
import { HeaderProfileTrigger } from './HeaderProfileTrigger';
import { useAuthUser } from '@/app/context/AuthContext';
import { useLawyerProfileHeader } from '@/app/hooks/useLawyerProfileHeader';
import { resolveCalendarUserId } from '@/app/services/calendarBridge';

interface HeaderProps {
    shouldShow: boolean;
    unreadCount: number;
    onProfileClick: () => void;
    onProfilePointerEnter?: () => void;
    onSearchClick: () => void;
    onSearchPointerEnter?: () => void;
    onNotificationsClick: () => void;
    onNotificationsPointerEnter?: () => void;
    onSettingsClick: () => void;
    onSettingsPointerEnter?: () => void;
}

export const Header: React.FC<HeaderProps> = ({
    shouldShow,
    unreadCount,
    onProfileClick,
    onProfilePointerEnter,
    onSearchClick,
    onSearchPointerEnter,
    onNotificationsClick,
    onNotificationsPointerEnter,
    onSettingsClick,
    onSettingsPointerEnter,
}) => {
    const user = useAuthUser();
    const meta = (user?.user_metadata ?? {}) as Record<string, unknown>;
    const { displayName, title, avatarUrl } = useLawyerProfileHeader(
        resolveCalendarUserId(user?.id ?? null),
        meta,
    );

    return (
        <AnimatePresence>
            {shouldShow && (
                <motion.header
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.22 }}
                    className="fixed top-0 left-0 right-0 z-50 h-[84px] flex items-center justify-between px-4 sm:px-5 pointer-events-none"
                >
                    <HeaderProfileTrigger
                        displayName={displayName}
                        title={title}
                        avatarUrl={avatarUrl}
                        onClick={onProfileClick}
                        onPointerEnter={onProfilePointerEnter}
                    />

                    <nav
                        className="pointer-events-auto flex items-center gap-2 px-2.5 py-2 rounded-[1.35rem] hami-sovereign-glass hami-sovereign-rim hami-home-themed-border border border-white/[0.08] shadow-[0_12px_40px_rgba(0,0,0,0.35)]"
                        aria-label="أدوات اللوحة"
                    >
                        <HeaderSearchTrigger onClick={onSearchClick} onPointerEnter={onSearchPointerEnter} />
                        <span className="w-px h-7 bg-white/[0.08] shrink-0" aria-hidden />
                        <HeaderNotificationsTrigger
                            unreadCount={unreadCount}
                            onClick={onNotificationsClick}
                            onPointerEnter={onNotificationsPointerEnter}
                        />
                        <span className="w-px h-7 bg-white/[0.08] shrink-0" aria-hidden />
                        <HeaderSettingsTrigger
                            onClick={onSettingsClick}
                            onPointerEnter={onSettingsPointerEnter}
                        />
                    </nav>
                </motion.header>
            )}
        </AnimatePresence>
    );
};
