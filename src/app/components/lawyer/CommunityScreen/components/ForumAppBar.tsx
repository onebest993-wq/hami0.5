import React, { useState, useEffect, useCallback } from 'react';
import { ArrowRight, Briefcase, Search, Bell } from 'lucide-react';
import { SecureAPIClient } from '@/app/services/SecureAPIClient';
import { getLawyerSettingsSnapshot } from '@/app/services/settings/settingsRuntime';

interface ForumAppBarProps {
    onBack?: () => void;
    activeSection: 'forum' | 'repository';
    onSectionChange: (section: 'forum' | 'repository') => void;
    onSearchOpen: () => void;
    userId?: string | null;
}

export const ForumAppBar = ({ onBack, activeSection, onSectionChange, onSearchOpen, userId }: ForumAppBarProps) => {
    const [notifications, setNotifications] = useState<{ id: string; title: string; message: string; read: boolean; postId?: string; createdAt: string }[]>([]);
    const [unreadCount, setUnreadCount] = useState(0);
    const [showNotifPanel, setShowNotifPanel] = useState(false);

    const fetchNotifications = useCallback(async () => {
        if (!userId) return;
        const settings = getLawyerSettingsSnapshot();
        if (!settings.notifications.master || settings.security.decoyMode) return;
        try {
            const data = await SecureAPIClient.fetchSecure<{
                ok: boolean;
                notifications: typeof notifications;
                unreadCount: number;
            }>('/api/forum/notifications', { method: 'GET' });
            if (data.ok) {
                setNotifications(data.notifications.slice(0, 20));
                setUnreadCount(data.unreadCount);
            }
        } catch {
            // silent
        }
    }, [userId]);

    useEffect(() => {
        if (!userId) return;
        fetchNotifications();
        const interval = setInterval(fetchNotifications, 30000);
        return () => clearInterval(interval);
    }, [userId, fetchNotifications]);

    const handleMarkAllRead = async () => {
        if (!userId) return;
        const settings = getLawyerSettingsSnapshot();
        if (!settings.notifications.master || settings.security.decoyMode) return;
        try {
            await SecureAPIClient.fetchSecure('/api/forum/notifications', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action: 'mark_all_read' }),
            });
            setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
            setUnreadCount(0);
        } catch {
            // silent
        }
    };

    return (
        <div className="bg-[#151822]/90 backdrop-blur-md px-4 py-4 flex items-center justify-between border-b border-white/5 shadow-sm sticky top-0 z-10">
            <div className="flex items-center gap-2">
                {onBack && (
                    <button type="button"
                        onClick={onBack}
                        className="w-8 h-8 rounded-full bg-white/5 flex items-center justify-center text-white/70 hover:text-white hover:bg-white/10 transition-colors"
                    >
                        <ArrowRight size={20} />
                    </button>
                )}
                <div className="w-8 h-8 rounded-lg bg-[#E6C673]/20 flex items-center justify-center border border-[#E6C673]/30">
                    <Briefcase size={16} className="text-[#E6C673]" />
                </div>
                <div>
                    <h1 className="text-white font-bold text-lg">منتدى الزملاء المغلق</h1>
                    <p className="text-[#E6C673]/60 text-[10px] tracking-wide">LAWYERS-ONLY HUB</p>
                </div>
            </div>
            <div className="flex items-center gap-2">

                <div className="bg-[#1A1D2D] rounded-xl p-1 flex items-center border border-white/5">
                    <button type="button"
                        onClick={() => onSectionChange('forum')}
                        className={`px-3 py-1.5 rounded-lg text-[11px] font-bold transition-all ${
                            activeSection === 'forum'
                                ? 'bg-[#E6C673]/15 text-[#E6C673]'
                                : 'text-white/40 hover:text-white/70'
                        }`}
                    >
                        المنتدى
                    </button>
                    <button type="button"
                        onClick={() => onSectionChange('repository')}
                        className={`px-3 py-1.5 rounded-lg text-[11px] font-bold transition-all ${
                            activeSection === 'repository'
                                ? 'bg-[#E6C673]/15 text-[#E6C673]'
                                : 'text-white/40 hover:text-white/70'
                        }`}
                    >
                        المستودع
                    </button>
                </div>

                <div className="relative">
                    <button type="button"
                        onClick={() => { if (userId) setShowNotifPanel((v) => !v); }}
                        className="w-10 h-10 rounded-full bg-[#25293C] flex items-center justify-center text-white/70 hover:text-white hover:bg-[#2f3346] transition-colors relative"
                    >
                        <Bell size={20} />
                        {unreadCount > 0 && (
                            <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] flex items-center justify-center bg-red-500 text-white text-[10px] font-bold rounded-full px-1 shadow-lg">
                                {unreadCount > 99 ? '99+' : unreadCount}
                            </span>
                        )}
                    </button>

                    {showNotifPanel && (
                        <>
                            <div className="fixed inset-0 z-40" onClick={() => setShowNotifPanel(false)} />
                            <div className="absolute left-0 top-full mt-2 w-80 z-50 bg-[#1A1D2D] border border-white/10 rounded-2xl shadow-2xl overflow-hidden">
                                <div className="flex items-center justify-between px-4 py-3 border-b border-white/5">
                                    <h3 className="text-white font-bold text-sm">التنبيهات</h3>
                                    <button type="button"
                                        onClick={handleMarkAllRead}
                                        className="text-[#E6C673] text-[11px] font-bold hover:underline"
                                    >
                                        تحديد الكل كمقروء
                                    </button>
                                </div>
                                <div className="max-h-80 overflow-y-auto">
                                    {notifications.length === 0 ? (
                                        <p className="text-gray-500 text-xs text-center py-6">لا توجد تنبيهات</p>
                                    ) : (
                                        notifications.map((n) => (
                                            <div
                                                key={n.id}
                                                className={`px-4 py-3 border-b border-white/5 last:border-0 transition ${
                                                    !n.read ? 'bg-[#E6C673]/5' : ''
                                                }`}
                                            >
                                                <p className="text-white text-xs font-bold">{n.title}</p>
                                                <p className="text-white/50 text-[11px] mt-0.5 line-clamp-1">{n.message}</p>
                                            </div>
                                        ))
                                    )}
                                </div>
                            </div>
                        </>
                    )}
                </div>

                <button type="button"
                    onClick={onSearchOpen}
                    className="w-10 h-10 rounded-full bg-[#25293C] flex items-center justify-center text-white/70 hover:text-white hover:bg-[#2f3346] transition-colors"
                >
                    <Search size={20} />
                </button>
            </div>
        </div>
    );
};
