import React, { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { Search, Bell, Settings } from 'lucide-react';
import { useAuth } from '@/app/context/AuthContext';
import { useLawyerSettingsOptional } from '@/app/context/LawyerSettingsContext';
import { LAWYER_PROFILE_UPDATED, ProfileDB } from '@/app/services/lawyer-cloud';
import { CAIRO_FONT_STYLE, HEADER_BTN_BG_STYLE } from '../constants';

interface HeaderProps {
    shouldShow: boolean;
    unreadCount: number;
    onProfileClick: () => void;
    onSearchClick: () => void;
    onNotificationsClick: () => void;
    onSettingsClick: () => void;
}

export const Header: React.FC<HeaderProps> = ({
    shouldShow,
    unreadCount,
    onProfileClick,
    onSearchClick,
    onNotificationsClick,
    onSettingsClick,
}) => {
    const { user } = useAuth();
    const lawyerSettings = useLawyerSettingsOptional();
    const maskNames = lawyerSettings?.settings.security.maskSensitiveInPublic ?? false;
    const [displayName, setDisplayName] = useState('المحامي');
    const [title, setTitle] = useState('المحامي والمستشار القانوني');
    const [avatarUrl, setAvatarUrl] = useState('');
    const notificationsLabel = unreadCount > 0 ? `الإشعارات (${unreadCount})` : 'الإشعارات';

    useEffect(() => {
        const uid = user?.id;
        if (!uid) return;

        const refresh = () => {
            void ProfileDB.getProfile(uid).then((p) => {
                const meta = (user?.user_metadata ?? {}) as Record<string, unknown>;
                const metaName = typeof meta.full_name === 'string' ? meta.full_name : '';
                setDisplayName(p.header.name?.trim() || metaName || 'المحامي');
                setTitle(p.header.title?.trim() || 'المحامي والمستشار القانوني');
                setAvatarUrl(p.header.profileImage || '');
            });
        };

        refresh();
        const onProfileUpdated = (ev: Event) => {
            const detail = (ev as CustomEvent<{ userId?: string }>).detail;
            if (!detail?.userId || detail.userId === uid) refresh();
        };
        window.addEventListener(LAWYER_PROFILE_UPDATED, onProfileUpdated);
        return () => window.removeEventListener(LAWYER_PROFILE_UPDATED, onProfileUpdated);
    }, [user?.id, user?.user_metadata]);

    return (
        <AnimatePresence>
            {shouldShow && (
                <motion.div
                    initial={{ opacity: 0, y: -20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -20 }}
                    transition={{ duration: 0.2 }}
                    className="fixed top-0 left-0 right-0 z-50 h-[100px] flex items-center justify-between px-6 pointer-events-none bg-gradient-to-b from-black/60 to-transparent"
                >
                    <div
                        className="flex items-center gap-3 pointer-events-auto cursor-pointer group"
                        onClick={onProfileClick}
                    >
                        <motion.div className="w-[50px] h-[50px] rounded-full border-[2px] border-[#D4AF37] overflow-hidden shadow-[0_0_15px_rgba(212,175,55,0.3)] group-hover:scale-105 transition-transform bg-black flex items-center justify-center">
                            {avatarUrl ? (
                                <img src={avatarUrl} alt="" className="w-full h-full object-cover" />
                            ) : (
                                <span className="text-[#E6C673] font-bold text-lg">{displayName.charAt(0)}</span>
                            )}
                        </motion.div>
                        <div className="flex flex-col items-start justify-center">
                            <span
                                className="text-white font-bold text-lg leading-tight drop-shadow-md"
                                style={CAIRO_FONT_STYLE}
                            >
                                {maskNames ? 'المحامي' : displayName}
                            </span>
                            {!maskNames && title ? (
                                <span className="text-white/60 text-xs font-medium" style={CAIRO_FONT_STYLE}>
                                    {title}
                                </span>
                            ) : null}
                        </div>
                    </div>

                    <div className="flex items-center gap-3 pointer-events-auto">
                        <button
                            type="button"
                            onClick={onSearchClick}
                            aria-label="بحث شامل"
                            title="بحث شامل"
                            className="w-[40px] h-[40px] rounded-full flex items-center justify-center text-white border border-white/10 hover:bg-[#0F172A] transition-colors relative group"
                            style={HEADER_BTN_BG_STYLE}
                        >
                            <div className="absolute inset-0 bg-white/5 opacity-0 group-hover:opacity-100 transition-opacity rounded-full" />
                            <Search size={20} strokeWidth={1.5} />
                        </button>

                        <button
                            type="button"
                            onClick={onNotificationsClick}
                            aria-label={notificationsLabel}
                            title={notificationsLabel}
                            className="w-[40px] h-[40px] rounded-full flex items-center justify-center text-white border border-white/10 hover:bg-[#0F172A] transition-colors relative group"
                            style={HEADER_BTN_BG_STYLE}
                        >
                            <div className="absolute inset-0 bg-white/5 opacity-0 group-hover:opacity-100 transition-opacity rounded-full" />
                            <div className="relative">
                                <Bell size={20} strokeWidth={1.5} />
                                {unreadCount > 0 && (
                                    <div className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-red-500 rounded-full border-2 border-[#0F172A]" />
                                )}
                            </div>
                        </button>

                        <button
                            type="button"
                            onClick={onSettingsClick}
                            aria-label="الإعدادات"
                            title="الإعدادات"
                            className="w-[40px] h-[40px] rounded-full flex items-center justify-center text-white border border-white/10 hover:bg-[#0F172A] transition-colors relative group"
                            style={HEADER_BTN_BG_STYLE}
                        >
                            <div className="absolute inset-0 bg-white/5 opacity-0 group-hover:opacity-100 transition-opacity rounded-full" />
                            <Settings size={20} strokeWidth={1.5} />
                        </button>
                    </div>
                </motion.div>
            )}
        </AnimatePresence>
    );
};
