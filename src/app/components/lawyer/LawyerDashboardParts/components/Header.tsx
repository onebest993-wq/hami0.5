import React from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { Settings, type LucideIcon } from 'lucide-react';
import { HeaderSearchTrigger } from './HeaderSearchTrigger';
import { HeaderNotificationsTrigger } from './HeaderNotificationsTrigger';
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
}

type HeaderIconButtonProps = {
    icon: LucideIcon;
    label: string;
    onClick: () => void;
    onPointerEnter?: () => void;
    badge?: boolean;
};

function HeaderIconButton({ icon: Icon, label, onClick, onPointerEnter, badge }: HeaderIconButtonProps) {
    return (
        <button
            type="button"
            onClick={onClick}
            onPointerEnter={onPointerEnter}
            aria-label={label}
            title={label}
            className="relative w-10 h-10 rounded-xl flex items-center justify-center text-white/90 border border-white/[0.08] bg-white/[0.04] hover:bg-white/[0.07] hover:border-[#E6C673]/25 transition-all duration-200 active:scale-95"
        >
            <Icon size={20} strokeWidth={1.5} aria-hidden />
            {badge ? (
                <span className="absolute top-2.5 right-2.5 w-2.5 h-2.5 bg-red-500 rounded-full border-2 border-[#0F172A]" />
            ) : null}
        </button>
    );
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
                    initial={{ opacity: 0, y: -20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -20 }}
                    transition={{ duration: 0.2 }}
                    className="fixed top-0 left-0 right-0 z-50 h-[84px] flex items-center justify-between px-4 sm:px-5 pointer-events-none border-b border-white/[0.06] bg-[#050508]/72 backdrop-blur-xl"
                >
                    <HeaderProfileTrigger
                        displayName={displayName}
                        title={title}
                        avatarUrl={avatarUrl}
                        onClick={onProfileClick}
                        onPointerEnter={onProfilePointerEnter}
                    />

                    <nav className="flex items-center gap-3 pointer-events-auto" aria-label="أدوات اللوحة">
                        <HeaderSearchTrigger onClick={onSearchClick} onPointerEnter={onSearchPointerEnter} />
                        <HeaderNotificationsTrigger
                            unreadCount={unreadCount}
                            onClick={onNotificationsClick}
                            onPointerEnter={onNotificationsPointerEnter}
                        />
                        <HeaderIconButton icon={Settings} label="الإعدادات" onClick={onSettingsClick} />
                    </nav>
                </motion.header>
            )}
        </AnimatePresence>
    );
};
