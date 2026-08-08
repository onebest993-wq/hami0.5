import React from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { Search, Bell, Settings } from '@/app/components/ui/lucideIcons';
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
                    <div className="flex items-center gap-3 pointer-events-auto cursor-pointer group" onClick={onProfileClick}>
                        <div className="w-[50px] h-[50px] rounded-full border-[2px] border-[#D4AF37] overflow-hidden shadow-[0_0_15px_rgba(212,175,55,0.3)] group-hover:scale-105 transition-transform bg-black">
                            <img src="https://images.unsplash.com/photo-1560250097-0b93528c311a?auto=format&fit=crop&q=80" className="w-full h-full object-cover" />
                        </div>
                        <div className="flex flex-col items-start justify-center">
                            <span className="text-white font-bold text-lg leading-tight drop-shadow-md" style={CAIRO_FONT_STYLE}>الأستاذ أحمد</span>
                            <span className="text-white/60 text-xs font-medium" style={CAIRO_FONT_STYLE}>المحامي والمستشار القانوني</span>
                        </div>
                    </div>

                    <div className="flex items-center gap-3 pointer-events-auto">
                        <button type="button"
                            onClick={onSearchClick}
                            className="w-[40px] h-[40px] rounded-full flex items-center justify-center text-white border border-white/10 hover:bg-[#0F172A] transition-colors relative group"
                            style={HEADER_BTN_BG_STYLE}
                        >
                            <div className="absolute inset-0 bg-white/5 opacity-0 group-hover:opacity-100 transition-opacity rounded-full" />
                            <Search size={20} strokeWidth={1.5} />
                        </button>

                        <button type="button"
                            onClick={onNotificationsClick}
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

                        <button type="button"
                            onClick={onSettingsClick}
                            className="w-[40px] h-[40px] rounded-full flex items-center justify-center text-white border border-white/10 hover:bg-[#0F172A] transition-colors"
                            style={HEADER_BTN_BG_STYLE}
                        >
                            <Settings size={20} strokeWidth={1.5} />
                        </button>
                    </div>
                </motion.div>
            )}
        </AnimatePresence>
    );
};
