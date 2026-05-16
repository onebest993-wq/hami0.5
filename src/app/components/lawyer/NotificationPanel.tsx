import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Bell, AlertTriangle, Sparkles, FileText, CheckCircle2, Camera, MessageCircle, Clock, ShieldAlert, type LucideIcon } from 'lucide-react';
import { useNotificationStore } from '@/app/stores/notificationStore';
import type { NotificationModel } from '@/app/infrastructure/NotificationRepository';
import { projectId, publicAnonKey } from '@/utils/supabase/info';
import { TIMING } from '@/app/utils/constants';
import { SmartToast } from '@/app/components/ui/SmartToast';
import { SmartDialog } from '@/app/components/ui/SmartDialog';

interface NotificationPanelProps {
    isOpen: boolean;
    onClose: () => void;
    userId: string;
    onNavigate: (path: string, payload: Record<string, unknown>) => void;
}

type TabType = 'urgent' | 'messages' | 'system';

export const NotificationPanel = ({ isOpen, onClose, userId, onNavigate }: NotificationPanelProps) => {
    const notifications = useNotificationStore((s) => s.notifications);
    const fetchNotifications = useNotificationStore((s) => s.fetchNotifications);
    const markAsRead = useNotificationStore((s) => s.markAsRead);
    const [activeTab, setActiveTab] = useState<TabType>('urgent');

    // CRITICAL FIX: Poll for notifications every 30s (with proper cleanup)
    useEffect(() => {
        // Only fetch and poll when panel is open and userId exists
        if (!isOpen || !userId) return;
        
        // Initial fetch
        fetchNotifications(userId);
        
        // Poll every 30 seconds
        const interval = setInterval(() => {
            fetchNotifications(userId);
        }, TIMING.NOTIFICATION_POLL);
        
        // Cleanup on unmount or when dependencies change
        return () => clearInterval(interval);
    }, [userId, isOpen, fetchNotifications]); // Added fetchNotifications to dependencies

    // Filter Logic
    const filteredNotifications = notifications.filter(n => {
        if (activeTab === 'urgent') return n.type === 'deadline' || !n.isRead;
        if (activeTab === 'messages') return n.type === 'new_document' || n.type === 'ai_insight';
        if (activeTab === 'system') return n.type === 'system_alert';
        return true;
    });

    const handleTap = async (notification: NotificationModel) => {
        if (!notification.isRead) await markAsRead(userId, notification.id);
        
        onClose(); // Close sheet
        
        // Routing Logic
        switch (notification.type) {
            case 'deadline': onNavigate('case_details', notification.actionPayload); break;
            case 'ai_insight': onNavigate('ai_drafter', notification.actionPayload); break;
            case 'new_document': onNavigate('vault', notification.actionPayload); break;
            default: break;
        }
    };

    // Client Request Logic (Twilio/WhatsApp)
    const handleClientRequest = async (e: React.MouseEvent, notif: NotificationModel) => {
        e.stopPropagation();
        const clientPhone = await SmartDialog.prompt("أدخل رقم هاتف الموكل (مثال: +9647800000000):", '');
        if (!clientPhone) return;

        const message = "أهلاً بك، يرجى إرسال صورة القيد أو سند الطابو لإكمال ملف دعواكم.";
        try {
             const response = await fetch(`https://${projectId}.supabase.co/functions/v1/make-server-f09713ba/comms-dispatcher`, {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${publicAnonKey}`, 'Content-Type': 'application/json' },
                body: JSON.stringify({ to: clientPhone, message: message, channel: 'whatsapp' })
            });
            const data = await response.json();
            if (data.success) SmartToast.success("تم إرسال الطلب للموكل بنجاح (Simulation) ✅");
            else throw new Error(data.error);
        } catch {
            window.open(`https://wa.me/${clientPhone.replace('+','')}?text=${encodeURIComponent(message)}`, '_blank');
        }
    };

    const handleScan = (e: React.MouseEvent) => {
        e.stopPropagation();
        onClose();
        onNavigate('scan_document', {});
    };

    return (
        <AnimatePresence>
            {isOpen && (
                <>
                    {/* Backdrop (Click to close) */}
                    <motion.div 
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={onClose}
                        className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100]"
                    />
                    
                    {/* Bottom Sheet Panel */}
                    <motion.div 
                        initial={{ y: '100%' }}
                        animate={{ y: 0 }}
                        exit={{ y: '100%' }}
                        transition={{ type: "spring", damping: 25, stiffness: 200 }}
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
                                    مركز التنبيهات
                                </h2>
                                <p className="text-white/40 text-sm mt-1">تابع آخر التحديثات والمواعيد الحاسمة</p>
                            </div>
                            <button type="button" onClick={onClose} className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center text-white/50 hover:bg-white/10 hover:text-white transition-colors">
                                <X size={20} />
                            </button>
                        </div>

                        {/* Tabs */}
                        <div className="px-6 py-4 flex gap-4 overflow-x-auto no-scrollbar">
                            <TabButton 
                                active={activeTab === 'urgent'} 
                                onClick={() => setActiveTab('urgent')} 
                                icon={<ShieldAlert size={16} />} 
                                label="عاجل ومهم" 
                                count={notifications.filter(n => n.type === 'deadline' && !n.isRead).length}
                            />
                            <TabButton 
                                active={activeTab === 'messages'} 
                                onClick={() => setActiveTab('messages')} 
                                icon={<MessageCircle size={16} />} 
                                label="الرسائل والذكاء" 
                                count={notifications.filter(n => n.type === 'ai_insight' && !n.isRead).length}
                            />
                            <TabButton 
                                active={activeTab === 'system'} 
                                onClick={() => setActiveTab('system')} 
                                icon={<Clock size={16} />} 
                                label="النظام" 
                            />
                        </div>

                        {/* Notifications List */}
                        <div className="flex-1 overflow-y-auto p-6 space-y-4 custom-scrollbar bg-[#0B1021]/50">
                            {filteredNotifications.length === 0 ? (
                                <div className="flex flex-col items-center justify-center h-full text-white/20 min-h-[300px]">
                                    <Bell size={64} className="mb-6 opacity-20" />
                                    <p className="text-lg font-medium">لا توجد تنبيهات في هذا القسم</p>
                                </div>
                            ) : (
                                filteredNotifications.map((notif) => {
                                    const isMissingDoc = notif.title.includes("ناقص") || notif.type === 'new_document';
                                    return (
                                        <motion.div
                                            key={notif.id}
                                            layout
                                            initial={{ opacity: 0, scale: 0.95 }}
                                            animate={{ opacity: 1, scale: 1 }}
                                            className={`
                                                relative p-5 rounded-2xl border cursor-pointer group hover:scale-[1.02] transition-all backdrop-blur-md
                                                ${notif.type === 'deadline' ? 'bg-red-500/[0.08] border-red-500/30 shadow-lg shadow-red-950/20' : 
                                                  notif.type === 'ai_insight' ? 'bg-[#E6C673]/[0.08] border-[#E6C673]/30 shadow-lg shadow-amber-950/20' :
                                                  'bg-white/[0.03] border-white/10 shadow-lg'}
                                            `}
                                            onClick={() => handleTap(notif)}
                                        >
                                            <div className="flex items-start gap-4">
                                                {/* Icon Box */}
                                                <div className={`p-3 rounded-xl shrink-0 ${
                                                    notif.type === 'deadline' ? 'bg-red-500/20 text-red-400' :
                                                    notif.type === 'ai_insight' ? 'bg-[#E6C673]/20 text-[#E6C673]' :
                                                    'bg-white/10 text-white/60'
                                                }`}>
                                                    {notif.type === 'deadline' ? <AlertTriangle size={24} /> :
                                                     notif.type === 'ai_insight' ? <Sparkles size={24} /> :
                                                     notif.type === 'new_document' ? <FileText size={24} /> :
                                                     <CheckCircle2 size={24} />}
                                                </div>

                                                <div className="flex-1">
                                                    <div className="flex justify-between items-start">
                                                        <h3 className={`font-bold text-base mb-1 ${
                                                            notif.type === 'deadline' ? 'text-red-400' :
                                                            notif.type === 'ai_insight' ? 'text-[#E6C673]' :
                                                            'text-white'
                                                        }`}>
                                                            {notif.title}
                                                        </h3>
                                                        <span className="text-[10px] text-white/30 font-mono">
                                                            {new Date(notif.createdAt).toLocaleTimeString('ar-IQ', { hour: '2-digit', minute:'2-digit' })}
                                                        </span>
                                                    </div>
                                                    
                                                    <p className="text-sm text-white/70 leading-relaxed pl-4 border-l-2 border-white/5 my-2">
                                                        {notif.message}
                                                    </p>

                                                    {/* Action Buttons for Document Requests */}
                                                    {isMissingDoc && (
                                                        <div className="mt-4 flex gap-3">
                                                            <button type="button" 
                                                                onClick={handleScan}
                                                                className="flex-1 py-2.5 backdrop-blur-md bg-[#E6C673]/20 hover:bg-[#E6C673]/30 text-[#E6C673] font-bold rounded-xl flex items-center justify-center gap-2 transition-all border border-[#E6C673]/30 shadow-lg shadow-[#E6C673]/10 text-xs"
                                                            >
                                                                <Camera size={14} />
                                                                مسح المستند
                                                            </button>
                                                            <button type="button" 
                                                                onClick={(e) => handleClientRequest(e, notif)}
                                                                className="flex-1 py-2.5 backdrop-blur-md bg-white/[0.05] hover:bg-white/[0.1] text-white font-bold rounded-xl flex items-center justify-center gap-2 transition-all border border-white/10 shadow-lg text-xs"
                                                            >
                                                                <MessageCircle size={14} />
                                                                مراسلة الموكل
                                                            </button>
                                                        </div>
                                                    )}
                                                </div>
                                            </div>

                                            {/* Unread Indicator */}
                                            {!notif.isRead && (
                                                <div className="absolute top-5 left-5 w-2.5 h-2.5 rounded-full bg-red-500 animate-pulse shadow-[0_0_15px_#EF4444]" />
                                            )}
                                        </motion.div>
                                    );
                                })
                            )}
                        </div>
                    </motion.div>
                </>
            )}
        </AnimatePresence>
    );
};

const TabButton = ({ active, onClick, icon, label, count }: { active: boolean, onClick: () => void, icon: React.ReactNode, label: string, count?: number }) => (
    <button type="button" 
        onClick={onClick}
        className={`
            flex items-center gap-2 px-5 py-3 rounded-2xl transition-all whitespace-nowrap relative
            ${active 
                ? 'bg-[#E6C673] text-black font-bold shadow-[0_4px_20px_rgba(230,198,115,0.3)]' 
                : 'bg-white/5 text-white/60 hover:bg-white/10'}
        `}
    >
        {icon}
        <span>{label}</span>
        {count && count > 0 && (
            <span className={`
                ml-2 w-5 h-5 flex items-center justify-center text-[10px] rounded-full font-bold
                ${active ? 'bg-black text-[#E6C673]' : 'bg-red-500 text-white'}
            `}>
                {count}
            </span>
        )}
    </button>
);
