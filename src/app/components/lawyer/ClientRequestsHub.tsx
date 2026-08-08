import React, { useMemo, useState } from 'react';
import { motion } from 'motion/react';
import { X, MessageCircle, Clock, Inbox, User, CheckCircle } from '@/app/components/ui/lucideIcons';
import { SmartToast } from '@/app/components/ui/SmartToast';
import type { ClientRequestsHubProps, ClientRequest, RequestStatus } from '@/app/types/common';
import {
    useLegalMarketplaceStore,
    formatRequestElapsedArabic,
} from '@/app/stores/legalMarketplaceStore';
import { useBodyScrollLock } from '@/app/utils/bodyScrollLock';

export const ClientRequestsHub = ({ onClose, onConvertToCase }: ClientRequestsHubProps) => {
    const [activeTab, setActiveTab] = useState<RequestStatus>('new');
    const requests = useLegalMarketplaceStore((s) => s.requests);
    const lawyerWallet = useLegalMarketplaceStore((s) => s.lawyerWallet);
    const acceptRequest = useLegalMarketplaceStore((s) => s.acceptRequest);
    const rejectRequest = useLegalMarketplaceStore((s) => s.rejectRequest);
    const setRequestContacting = useLegalMarketplaceStore((s) => s.setRequestContacting);

    useBodyScrollLock(true);

    const typeBadgeClass: Record<string, string> = {
        'قضية تجارية': 'text-amber-500 bg-amber-500/10 border-amber-500/20',
        عقارات: 'text-emerald-500 bg-emerald-500/10 border-emerald-500/20',
        'أحوال شخصية': 'text-rose-500 bg-rose-500/10 border-rose-500/20',
        'نجدة قانونية (SOS)': 'text-rose-400 bg-rose-500/15 border-rose-500/30',
        'استشارة فورية': 'text-amber-400 bg-amber-500/10 border-amber-500/25',
        'خدمة بسعر ثابت': 'text-cyan-400 bg-cyan-500/10 border-cyan-500/25',
    };

    const filteredRequests = useMemo(() => {
        return requests.filter((r) => {
            if (activeTab === 'new') return r.status === 'new';
            if (activeTab === 'contacting') return r.status === 'contacting';
            return (
                r.status === 'archived' ||
                r.status === 'rejected' ||
                r.status === 'accepted'
            );
        });
    }, [requests, activeTab]);

    const handleAccept = (req: ClientRequest) => {
        if (req.status !== 'new' && req.status !== 'contacting') return;
        acceptRequest(req.id);
        const updated = useLegalMarketplaceStore.getState().requests.find((r) => r.id === req.id);
        if (onConvertToCase && updated) {
            onConvertToCase({ ...updated, status: 'accepted' });
        }
        SmartToast.success('تم إنشاء عقد الأتعاب الآلي وفتح الإضبارة بنجاح!');
    };

    const handleReject = (id: string) => {
        rejectRequest(id);
        SmartToast.info('تم رفض الطلب وإعادة المبلغ لمحفظة الضمان');
    };

    const handleContact = (id: string) => {
        setRequestContacting(id);
        window.open('https://wa.me/', '_blank', 'noopener,noreferrer');
    };

    const displayElapsed = (req: ClientRequest) =>
        req.createdAtMs != null ? formatRequestElapsedArabic(req.createdAtMs) : req.createdAt;

    const isTerminal = (req: ClientRequest) =>
        req.status === 'accepted' || req.status === 'rejected' || req.status === 'archived';

    return (
        <div className="fixed inset-0 z-[60] bg-[#0B1021] flex flex-col animate-in slide-in-from-bottom-10 duration-300 font-sans">
            <div className="border-b border-white/10 flex items-center justify-between px-6 pt-[max(1rem,env(safe-area-inset-top))] pb-4 bg-[#0B1021]/95 backdrop-blur-xl sticky top-0 z-50">
                <div className="flex items-center gap-4">
                    <button type="button"
                        onClick={onClose}
                        className="inline-flex items-center justify-center min-h-[44px] min-w-[44px] rounded-full bg-white/5 hover:bg-white/10 transition-colors text-white touch-manipulation"
                    >
                        <X size={24} />
                    </button>
                    <div>
                        <h2 className="text-xl font-bold text-white flex items-center gap-2">
                            <span className="w-8 h-8 rounded-full bg-[#E6C673]/20 flex items-center justify-center text-[#E6C673]">
                                <Inbox size={18} />
                            </span>
                            صندوق طلبات التوكيل
                        </h2>
                        <p className="text-white/40 text-xs mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-1">
                            <span>إدارة الفرص والموكلين الجدد</span>
                            <span className="text-[#E6C673]/90 font-mono tabular-nums">
                                رصيد المستحقات: {lawyerWallet.toLocaleString('ar-IQ')} د.ع
                            </span>
                        </p>
                    </div>
                </div>

                <div className="flex bg-black/20 p-1 rounded-xl">
                    {[
                        { id: 'new', label: 'طلبات جديدة' },
                        { id: 'contacting', label: 'قيد التواصل' },
                        { id: 'archived', label: 'الأرشيف' },
                    ].map((tab) => (
                        <button type="button"
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id as RequestStatus)}
                            className={`min-h-[44px] px-4 py-2 rounded-lg text-sm font-bold transition-all touch-manipulation ${
                                activeTab === tab.id
                                    ? 'bg-[#E6C673] text-black shadow-lg shadow-[#E6C673]/20'
                                    : 'text-white/50 hover:text-white hover:bg-white/5'
                            }`}
                        >
                            {tab.label}
                        </button>
                    ))}
                </div>
            </div>

            <div className="flex-1 overflow-y-auto p-6 bg-gradient-to-b from-[#0B1021] to-[#050510]">
                <div className="max-w-4xl mx-auto space-y-4">
                    {filteredRequests.length === 0 ? (
                        <div className="flex flex-col items-center justify-center h-64 text-white/30">
                            <Inbox size={64} strokeWidth={1} className="mb-4 opacity-50" />
                            <p>لا توجد طلبات في هذه القائمة</p>
                        </div>
                    ) : (
                        filteredRequests.map((req) => (
                            <motion.div
                                key={req.id}
                                layout
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                className="bg-[#151825] border border-white/5 rounded-2xl p-6 relative group hover:border-[#E6C673]/30 transition-all shadow-lg hover:shadow-xl hover:shadow-[#E6C673]/5"
                            >
                                <div className="flex flex-col sm:flex-row justify-between items-start gap-4 mb-4">
                                    <div className="flex items-center gap-4">
                                        <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-indigo-500/20 to-purple-500/20 flex items-center justify-center border border-white/10 shadow-inner">
                                            <User size={28} className="text-indigo-400" />
                                        </div>
                                        <div>
                                            <h3 className="text-lg font-bold text-white">{req.clientName}</h3>
                                            <div className="flex flex-wrap items-center gap-3 text-xs text-white/40 mt-1.5">
                                                <span className="flex items-center gap-1 bg-white/5 px-2 py-1 rounded-md">
                                                    <Clock size={12} className="text-white/60" />
                                                    {displayElapsed(req)}
                                                </span>
                                                <span
                                                    className={`px-2 py-1 rounded-md border text-[10px] font-bold ${
                                                        typeBadgeClass[req.type] ??
                                                        'text-white/60 bg-white/5 border-white/10'
                                                    }`}
                                                >
                                                    {req.type}
                                                </span>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="px-3 py-1 bg-white/5 rounded-full text-xs font-mono text-white/30 border border-white/5">
                                        #{req.id.slice(-8)}
                                    </div>
                                </div>

                                {typeof req.price === 'number' && req.price > 0 && (
                                    <div className="mb-3 px-3 py-2 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-300/90 text-xs font-bold">
                                        💰 رصيد مضمون في محفظة الضمان — {req.price.toLocaleString('ar-IQ')} د.ع
                                    </div>
                                )}

                                <div className="mb-6 pl-[4.5rem]">
                                    <div className="relative">
                                        <div className="absolute top-0 right-full w-4 h-full border-r-2 border-[#E6C673]/20 mr-4" />
                                        <p className="text-white/80 leading-relaxed text-sm bg-black/30 p-4 rounded-xl border border-white/5 shadow-inner">
                                            &quot;{req.description}&quot;
                                        </p>
                                    </div>
                                </div>

                                {!isTerminal(req) ? (
                                    <div className="flex flex-col sm:flex-row items-center gap-3 pt-4 border-t border-white/5 pl-[4.5rem]">
                                        <button type="button"
                                            onClick={() => handleAccept(req)}
                                            className="flex-1 w-full bg-emerald-500/10 hover:bg-emerald-600 hover:text-white text-emerald-400 border border-emerald-500/20 hover:border-emerald-500/50 py-3 rounded-xl font-bold flex items-center justify-center gap-2 transition-all group/btn"
                                        >
                                            <CheckCircle
                                                size={18}
                                                className="group-hover/btn:scale-110 transition-transform"
                                            />
                                            <span className="text-sm">قبول وتحويل لدعوى</span>
                                        </button>

                                        <button type="button"
                                            onClick={() => handleContact(req.id)}
                                            className="flex-1 w-full bg-indigo-500/10 hover:bg-indigo-600 hover:text-white text-indigo-400 border border-indigo-500/20 hover:border-indigo-500/50 py-3 rounded-xl font-bold flex items-center justify-center gap-2 transition-all group/btn"
                                        >
                                            <MessageCircle
                                                size={18}
                                                className="group-hover/btn:scale-110 transition-transform"
                                            />
                                            <span className="text-sm">تواصل (WhatsApp)</span>
                                        </button>

                                        <button type="button"
                                            onClick={() => handleReject(req.id)}
                                            className="w-full sm:w-14 h-12 flex items-center justify-center rounded-xl bg-red-500/10 text-red-500 hover:bg-red-500 hover:text-white border border-red-500/20 transition-all hover:shadow-[0_0_15px_rgba(239,68,68,0.4)]"
                                            title="رفض الطلب"
                                        >
                                            <X size={20} />
                                        </button>
                                    </div>
                                ) : (
                                    <div className="pt-4 border-t border-white/5 pl-[4.5rem] text-white/45 text-sm">
                                        {req.status === 'accepted' && 'تم قبول الطلب وإغلاق الإجراء.'}
                                        {req.status === 'rejected' && 'تم رفض الطلب.'}
                                        {req.status === 'archived' && 'طلب مؤرشف.'}
                                    </div>
                                )}
                            </motion.div>
                        ))
                    )}
                </div>
            </div>
        </div>
    );
};
