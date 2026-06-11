/**
 * NotificationPanel — إشعارات المنتدى والنظام
 *
 * سجل النشاطات (audit_log) أُزيل من المنتج.
 * التبويبات: المنتدى | النظام
 */
import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
    X,
    Bell,
    AlertTriangle,
    Sparkles,
    FileText,
    Camera,
    MessageCircle,
    Inbox,
    CheckCheck,
    AtSign,
    BadgeCheck,
    Settings as SettingsIcon,
} from 'lucide-react';
import { useNotificationStore } from '@/app/stores/notificationStore';
import {
    deriveNotificationCategory,
    type NotificationCategory,
    type NotificationModel,
} from '@/app/infrastructure/NotificationRepository';
import { projectId, publicAnonKey } from '@/utils/supabase/info';
import { getLawyerSettingsSnapshot } from '@/app/services/settings/settingsRuntime';
import { TIMING } from '@/app/utils/constants';
import { SmartToast } from '@/app/components/ui/SmartToast';
import { SmartDialog } from '@/app/components/ui/SmartDialog';
import { formatNotificationForCard } from '@/app/services/notificationMessageFormat';

interface NotificationPanelProps {
    isOpen: boolean;
    onClose: () => void;
    userId: string;
    onNavigate: (path: string, payload: Record<string, unknown>) => void;
}

type TabType = 'forum' | 'system';

// ============================================================
// Theming (per-category color + icon)
// ============================================================
type CategoryTheme = {
    label: string;
    icon: React.ReactNode;
    /** color text + ring tint (Tailwind class fragments) */
    tone: {
        text: string;
        bg: string;
        ring: string;
    };
};

const CATEGORY_THEMES: Record<'forum' | 'system' | 'document' | 'ai', CategoryTheme> = {
    forum: {
        label: 'المنتدى',
        icon: <MessageCircle size={18} />,
        tone: { text: 'text-violet-300', bg: 'bg-violet-500/10', ring: 'ring-violet-500/30' },
    },
    document: {
        label: 'مستندات',
        icon: <FileText size={18} />,
        tone: { text: 'text-amber-300', bg: 'bg-amber-500/10', ring: 'ring-amber-500/30' },
    },
    ai: {
        label: 'ذكاء',
        icon: <Sparkles size={18} />,
        tone: { text: 'text-amber-300', bg: 'bg-amber-500/10', ring: 'ring-amber-500/30' },
    },
    system: {
        label: 'النظام',
        icon: <SettingsIcon size={18} />,
        tone: { text: 'text-white/70', bg: 'bg-white/5', ring: 'ring-white/10' },
    },
};

// ============================================================
// Time grouping helpers
// ============================================================
type TimeBucket = 'today' | 'yesterday' | 'older';

function getTimeBucket(iso: string, now: Date): TimeBucket {
    const created = new Date(iso);
    if (!Number.isFinite(created.getTime())) return 'older';
    const dayStart = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
    const today = dayStart(now);
    const cDay = dayStart(created);
    if (cDay === today) return 'today';
    if (cDay === today - 24 * 60 * 60 * 1000) return 'yesterday';
    return 'older';
}

const BUCKET_LABELS: Record<TimeBucket, string> = {
    today: 'اليوم',
    yesterday: 'الأمس',
    older: 'أقدم',
};

// ============================================================
// Forum/system filtering helpers
// ============================================================
function isForumNotification(n: NotificationModel): boolean {
    const cat = deriveNotificationCategory(n);
    return cat === 'forum';
}

function isSystemNotification(n: NotificationModel): boolean {
    const cat = deriveNotificationCategory(n);
    return cat === 'system' || cat === 'ai' || cat === 'document';
}

function resolveNotificationTheme(n: NotificationModel): CategoryTheme {
    const cat = deriveNotificationCategory(n);
    if (cat === 'forum') return CATEGORY_THEMES.forum;
    if (cat === 'document') return CATEGORY_THEMES.document;
    if (cat === 'ai') return CATEGORY_THEMES.ai;
    return CATEGORY_THEMES.system;
}

export const NotificationPanel = ({
    isOpen,
    onClose,
    userId,
    onNavigate,
}: NotificationPanelProps) => {
    const notifications = useNotificationStore((s) => s.notifications);
    const unreadCount = useNotificationStore((s) => s.unreadCount);
    const fetchNotifications = useNotificationStore((s) => s.fetchNotifications);
    const markAsRead = useNotificationStore((s) => s.markAsRead);
    const markAllAsRead = useNotificationStore((s) => s.markAllAsRead);

    const [activeTab, setActiveTab] = useState<TabType>('forum');
    const [isMarkingAllRead, setIsMarkingAllRead] = useState(false);
    const [settingsVersion, setSettingsVersion] = useState(0);
    const settingsSnapshot = useMemo(
        () => getLawyerSettingsSnapshot(),
        // eslint-disable-next-line react-hooks/exhaustive-deps
        [isOpen, settingsVersion],
    );

    // Polling — مع إيقافه عندما يكون التبويب مخفياً (battery/perf)
    useEffect(() => {
        if (!isOpen || !userId) return;
        if (!settingsSnapshot.notifications.master || settingsSnapshot.security.decoyMode) return;

        fetchNotifications(userId);

        let intervalId: ReturnType<typeof setInterval> | null = null;
        const startPolling = () => {
            if (intervalId != null) return;
            intervalId = setInterval(() => {
                fetchNotifications(userId);
            }, TIMING.NOTIFICATION_POLL);
        };
        const stopPolling = () => {
            if (intervalId != null) {
                clearInterval(intervalId);
                intervalId = null;
            }
        };

        const isVisible = () =>
            typeof document === 'undefined' || document.visibilityState !== 'hidden';

        if (isVisible()) startPolling();

        const onVisibilityChange = () => {
            if (isVisible()) {
                fetchNotifications(userId);
                startPolling();
            } else {
                stopPolling();
            }
        };

        if (typeof document !== 'undefined') {
            document.addEventListener('visibilitychange', onVisibilityChange);
        }

        return () => {
            stopPolling();
            if (typeof document !== 'undefined') {
                document.removeEventListener('visibilitychange', onVisibilityChange);
            }
        };
    }, [
        userId,
        isOpen,
        fetchNotifications,
        settingsSnapshot.notifications.master,
        settingsSnapshot.security.decoyMode,
    ]);

    useEffect(() => {
        if (!isOpen) return;
        if (typeof window === 'undefined') return;
        const onSettingsUpdated = () => setSettingsVersion((v) => v + 1);
        window.addEventListener('hami:settings-updated', onSettingsUpdated);
        return () => window.removeEventListener('hami:settings-updated', onSettingsUpdated);
    }, [isOpen]);

    // ============================================================
    // Memoized filtering & grouping
    // ============================================================
    const visibleNotifications = useMemo(() => {
        if (!settingsSnapshot.notifications.master || settingsSnapshot.security.decoyMode) {
            return [] as NotificationModel[];
        }
        let base: NotificationModel[];
        if (activeTab === 'forum') base = notifications.filter(isForumNotification);
        else base = notifications.filter(isSystemNotification);
        return base;
    }, [
        notifications,
        activeTab,
        settingsSnapshot.notifications.master,
        settingsSnapshot.security.decoyMode,
    ]);

    const groupedByTime = useMemo(() => {
        const now = new Date();
        const groups: Record<TimeBucket, NotificationModel[]> = {
            today: [],
            yesterday: [],
            older: [],
        };
        for (const n of visibleNotifications) {
            groups[getTimeBucket(n.createdAt, now)].push(n);
        }
        return groups;
    }, [visibleNotifications]);

    // عدّادات التبويبات (غير المقروء فقط — لا نُربك المستخدم بأعداد كبيرة)
    const tabCounts = useMemo(() => {
        const forum = notifications.filter((n) => !n.isRead && isForumNotification(n)).length;
        const system = notifications.filter((n) => !n.isRead && isSystemNotification(n)).length;
        return { forum, system };
    }, [notifications]);

    const handleTap = async (notification: NotificationModel) => {
        if (!notification.isRead) await markAsRead(userId, notification.id);
        onClose();
        const cat = deriveNotificationCategory(notification);
        const payload = notification.actionPayload ?? {};
        switch (cat) {
            case 'forum':
                onNavigate('community', payload);
                break;
            case 'document':
                onNavigate('vault', payload);
                break;
            case 'ai':
                onNavigate('ai_drafter', payload);
                break;
            default:
                break;
        }
    };

    const handleClientRequest = async (e: React.MouseEvent, notif: NotificationModel) => {
        e.stopPropagation();
        const clientPhone = await SmartDialog.prompt(
            'أدخل رقم هاتف الموكل (مثال: +9647800000000):',
            '',
        );
        if (!clientPhone) return;

        const message = 'أهلاً بك، يرجى إرسال صورة القيد أو سند الطابو لإكمال ملف دعواكم.';
        try {
            const response = await fetch(
                `https://${projectId}.supabase.co/functions/v1/make-server-f09713ba/comms-dispatcher`,
                {
                    method: 'POST',
                    headers: {
                        Authorization: `Bearer ${publicAnonKey}`,
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({ to: clientPhone, message, channel: 'whatsapp' }),
                },
            );
            const data = await response.json();
            if (data.success) SmartToast.success('تم إرسال الطلب للموكل بنجاح (Simulation) ✅');
            else throw new Error(data.error);
        } catch {
            window.open(
                `https://wa.me/${clientPhone.replace('+', '')}?text=${encodeURIComponent(message)}`,
                '_blank',
            );
        }
        void notif;
    };

    const handleScan = (e: React.MouseEvent) => {
        e.stopPropagation();
        onClose();
        onNavigate('scan_document', {});
    };

    // ============================================================
    // Render
    // ============================================================
    return (
        <AnimatePresence>
            {isOpen && (
                <>
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={onClose}
                        className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100]"
                    />

                    <motion.div
                        initial={{ y: '100%' }}
                        animate={{ y: 0 }}
                        exit={{ y: '100%' }}
                        transition={{ type: 'spring', damping: 25, stiffness: 200 }}
                        className="fixed bottom-0 left-0 right-0 h-[85vh] bg-[#0F121E] rounded-t-[40px] border-t border-[#E6C673]/30 shadow-[0_-10px_50px_rgba(0,0,0,0.8)] z-[110] flex flex-col overflow-hidden"
                    >
                        {/* Drag Handle */}
                        <div className="w-full flex justify-center pt-4 pb-2" onClick={onClose}>
                            <div className="w-16 h-1.5 bg-white/20 rounded-full" />
                        </div>

                        {/* Header */}
                        <div className="px-8 pb-4 flex justify-between items-end border-b border-white/5">
                            <div>
                                <h2 className="text-2xl font-bold text-white flex items-center gap-3">
                                    <Bell className="text-[#E6C673] pointer-events-none" size={28} />
                                    سجل الإشعارات
                                </h2>
                                <p className="text-white/40 text-sm mt-1">
                                    المنتدى وإشعارات النظام — بعيداً عن الرادار
                                </p>
                            </div>
                            <div className="flex items-center gap-2">
                                {unreadCount > 0 && (
                                    <button
                                        type="button"
                                        onClick={async () => {
                                            if (!userId || isMarkingAllRead) return;
                                            setIsMarkingAllRead(true);
                                            try {
                                                await markAllAsRead(userId);
                                            } finally {
                                                setIsMarkingAllRead(false);
                                            }
                                        }}
                                        disabled={isMarkingAllRead}
                                        aria-busy={isMarkingAllRead}
                                        title="تحديد الكل كمقروء"
                                        aria-label="تحديد الكل كمقروء"
                                        className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center text-white/50 hover:bg-[#E6C673]/15 hover:text-[#E6C673] transition-colors disabled:opacity-50"
                                    >
                                        <CheckCheck size={18} />
                                    </button>
                                )}
                                <button
                                    type="button"
                                    onClick={onClose}
                                    className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center text-white/50 hover:bg-white/10 hover:text-white transition-colors"
                                >
                                    <X size={20} />
                                </button>
                            </div>
                        </div>

                        {/* Tabs */}
                        <div className="px-6 py-3 flex gap-3 overflow-x-auto no-scrollbar border-b border-white/5">
                            <TabButton
                                active={activeTab === 'forum'}
                                onClick={() => setActiveTab('forum')}
                                icon={<MessageCircle size={16} />}
                                label="المنتدى"
                                count={tabCounts.forum}
                            />
                            <TabButton
                                active={activeTab === 'system'}
                                onClick={() => setActiveTab('system')}
                                icon={<SettingsIcon size={16} />}
                                label="النظام"
                                count={tabCounts.system}
                            />
                        </div>

                        {/* Body */}
                        <div className="flex-1 overflow-y-auto px-6 py-4 custom-scrollbar bg-[#0B1021]/50">
                            {visibleNotifications.length === 0 ? (
                                <EmptyState tab={activeTab} />
                            ) : (
                                <div className="space-y-6">
                                    {(['today', 'yesterday', 'older'] as TimeBucket[]).map((bucket) => {
                                        const items = groupedByTime[bucket];
                                        if (items.length === 0) return null;
                                        return (
                                            <section key={bucket}>
                                                <h3 className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-3 px-1">
                                                    {BUCKET_LABELS[bucket]}{' '}
                                                    <span className="text-slate-500 font-normal">
                                                        ({items.length})
                                                    </span>
                                                </h3>
                                                <div className="space-y-2">
                                                    {items.map((notif) => (
                                                        <NotificationCard
                                                            key={notif.id}
                                                            notification={notif}
                                                            onTap={handleTap}
                                                            onScan={handleScan}
                                                            onClientRequest={handleClientRequest}
                                                        />
                                                    ))}
                                                </div>
                                            </section>
                                        );
                                    })}
                                </div>
                            )}
                        </div>
                    </motion.div>
                </>
            )}
        </AnimatePresence>
    );
};

// ============================================================
// Subcomponents
// ============================================================
const EmptyState = ({ tab }: { tab: TabType }) => {
    const message =
        tab === 'forum' ? 'لا توجد أحداث منتدى جديدة' : 'لا توجد إشعارات نظام';
    return (
        <div className="flex flex-col items-center justify-center h-full text-white/20 min-h-[300px]">
            <Bell size={64} className="mb-6 opacity-20" />
            <p className="text-lg font-medium">{message}</p>
        </div>
    );
};

const NotificationCard = ({
    notification,
    onTap,
    onScan,
    onClientRequest,
}: {
    notification: NotificationModel;
    onTap: (n: NotificationModel) => void;
    onScan: (e: React.MouseEvent) => void;
    onClientRequest: (e: React.MouseEvent, n: NotificationModel) => void;
}) => {
    const category = deriveNotificationCategory(notification);
    const theme = resolveNotificationTheme(notification);
    const cardLines = formatNotificationForCard(notification);
    const isMissingDoc =
        notification.type === 'new_document' || notification.title.includes('ناقص');
    const unread = !notification.isRead;
    const typeIcon = pickTypeIcon(notification);

    return (
        <motion.button
            type="button"
            layout
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            onClick={() => onTap(notification)}
            className={[
                'group w-full text-right relative px-4 py-3 rounded-2xl transition-all backdrop-blur-md',
                'flex items-start gap-3 ring-1 hover:bg-white/[0.06]',
                unread
                    ? `bg-[#0A0F1C]/70 ${theme.tone.ring} border-r-2 ${borderRightForCategory(category)}`
                    : 'bg-white/[0.015] ring-white/5 border-r-2 border-r-transparent',
            ].join(' ')}
        >
            {/* Icon badge */}
            <div
                className={`shrink-0 w-9 h-9 rounded-lg flex items-center justify-center ${theme.tone.bg} ${theme.tone.text}`}
            >
                {typeIcon ?? theme.icon}
            </div>

            {/* Content */}
            <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-2">
                    <h4
                        className={`text-sm font-semibold leading-snug truncate ${unread ? 'text-white' : 'text-white/70'}`}
                    >
                        {cardLines.eventTitle}
                    </h4>
                    <span className="text-[10px] text-white/30 font-mono shrink-0 tabular-nums">
                        {formatTimeShort(notification.createdAt)}
                    </span>
                </div>

                {cardLines.caseRef ? (
                    <p className="text-[11px] font-semibold text-[#E6C673]/85 mt-1 truncate">
                        {cardLines.caseRef}
                    </p>
                ) : null}

                <p
                    className={`text-xs leading-relaxed mt-1 line-clamp-2 ${unread ? 'text-white/70' : 'text-white/45'}`}
                >
                    {cardLines.detailLine}
                </p>

                <div className="mt-1.5 flex items-center gap-2 text-[10px] text-white/40">
                    <span
                        className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded ${theme.tone.bg} ${theme.tone.text}`}
                    >
                        {theme.icon}
                        {theme.label}
                    </span>
                    {unread && <span className="text-rose-300/70">جديد</span>}
                </div>

                {isMissingDoc && (
                    <div className="mt-2.5 flex gap-2">
                        <button
                            type="button"
                            onClick={onScan}
                            className="flex-1 py-2 bg-[#E6C673]/15 hover:bg-[#E6C673]/25 text-[#E6C673] text-xs font-semibold rounded-lg flex items-center justify-center gap-1.5 transition-colors"
                        >
                            <Camera size={12} />
                            مسح المستند
                        </button>
                        <button
                            type="button"
                            onClick={(e) => onClientRequest(e, notification)}
                            className="flex-1 py-2 bg-white/5 hover:bg-white/10 text-white/80 text-xs font-semibold rounded-lg flex items-center justify-center gap-1.5 transition-colors"
                        >
                            <MessageCircle size={12} />
                            مراسلة الموكل
                        </button>
                    </div>
                )}
            </div>
        </motion.button>
    );
};

const TabButton = ({
    active,
    onClick,
    icon,
    label,
    count,
}: {
    active: boolean;
    onClick: () => void;
    icon: React.ReactNode;
    label: string;
    count?: number;
}) => (
    <button
        type="button"
        onClick={onClick}
        className={[
            'flex items-center gap-2 px-4 py-2.5 rounded-xl transition-all whitespace-nowrap text-sm relative',
            active
                ? 'bg-[#E6C673] text-black font-bold shadow-[0_4px_20px_rgba(230,198,115,0.25)]'
                : 'bg-white/5 text-white/60 hover:bg-white/10',
        ].join(' ')}
    >
        {icon}
        <span>{label}</span>
        {count && count > 0 ? (
            <span
                className={[
                    'min-w-[18px] h-[18px] px-1 flex items-center justify-center text-[10px] rounded-full font-bold',
                    active ? 'bg-black text-[#E6C673]' : 'bg-rose-500 text-white',
                ].join(' ')}
            >
                {count}
            </span>
        ) : null}
    </button>
);

const FilterChip = ({
    active,
    onClick,
    label,
    tone,
}: {
    active: boolean;
    onClick: () => void;
    label: string;
    tone?: string;
}) => (
    <button
        type="button"
        onClick={onClick}
        className={[
            'px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-all',
            active
                ? 'bg-[#E6C673]/20 text-[#E6C673] ring-1 ring-[#E6C673]/40'
                : `bg-white/5 hover:bg-white/10 ${tone ?? 'text-white/60'}`,
        ].join(' ')}
    >
        {label}
    </button>
);

// ============================================================
// Local utilities
// ============================================================
function pickTypeIcon(n: NotificationModel): React.ReactNode | null {
    switch (n.type) {
        case 'forum_mention':
            return <AtSign size={18} />;
        case 'forum_solved':
            return <BadgeCheck size={18} />;
        case 'forum_reply':
            return <MessageCircle size={18} />;
        case 'new_document':
            return <FileText size={18} />;
        case 'ai_insight':
            return <Sparkles size={18} />;
        case 'system_alert':
            return <SettingsIcon size={18} />;
        case 'deadline':
            return <AlertTriangle size={18} />;
        default:
            return null;
    }
}

function borderRightForCategory(c: NotificationCategory): string {
    switch (c) {
        case 'civil':
            return 'border-r-sky-500/50';
        case 'criminal':
            return 'border-r-rose-500/50';
        case 'execution':
            return 'border-r-[#E6C673]/50';
        case 'task':
            return 'border-r-emerald-500/50';
        case 'forum':
            return 'border-r-violet-500/50';
        case 'document':
        case 'ai':
            return 'border-r-amber-500/50';
        default:
            return 'border-r-white/15';
    }
}

function formatTimeShort(iso: string): string {
    const d = new Date(iso);
    if (!Number.isFinite(d.getTime())) return '';
    const now = new Date();
    const sameDay =
        d.getFullYear() === now.getFullYear() &&
        d.getMonth() === now.getMonth() &&
        d.getDate() === now.getDate();
    if (sameDay) {
        return d.toLocaleTimeString('ar-IQ', { hour: '2-digit', minute: '2-digit' });
    }
    return d.toLocaleDateString('ar-IQ', { day: '2-digit', month: '2-digit' });
}

// Unused legacy export kept for compatibility (if anything else imports it)
export type { TabType };
// Aliases for legacy imports (some files may import these symbols)
export const _legacy_Inbox = Inbox;
