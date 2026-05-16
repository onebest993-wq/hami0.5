import React, { useState, useEffect, useCallback } from 'react';
import { Clock, Paperclip, MessageCircle, Check, Sparkles } from 'lucide-react';
import type { TimelineEvent } from '../../LawyerShared';

export const GhostAIInsightDeck = ({ onAction, timeline }: { onAction: (type: string) => void, timeline: TimelineEvent[] }) => {
    const [status, setStatus] = useState<'analyzing' | 'urgent' | 'ready' | 'normal' | 'idle' | 'empty'>('analyzing');
    const [message, setMessage] = useState('');
    const [missingItem, setMissingItem] = useState('');
    const [nextEvent, setNextEvent] = useState<TimelineEvent | null>(null);

    const analyzeFile = useCallback(() => {
        if (!timeline || timeline.length === 0) {
            setStatus('empty');
            return;
        }

        const now = new Date();
        
        // 1. Find Next Hearing
        // We look for 'appointment' type events in the future
        const upcoming = timeline
            .filter(t => t.type === 'appointment' && !t.isDeleted)
            .map(t => {
                // Parse date: Assume YYYY-MM-DD
                const d = new Date(t.date + (t.time ? 'T' + t.time : 'T09:00'));
                return { event: t, date: d };
            })
            .filter(item => item.date > now)
            .sort((a, b) => a.date.getTime() - b.date.getTime());

        const nextHearing = upcoming[0];

        if (nextHearing) {
            setNextEvent(nextHearing.event);
            const hoursToHearing = (nextHearing.date.getTime() - now.getTime()) / (1000 * 60 * 60);
            const isSoon = hoursToHearing < 48;

            // 2. Check for Receipt (Fee)
            // Look for any document with keywords
            const hasReceipt = timeline.some(t => 
                t.type === 'document' && 
                !t.isDeleted &&
                (t.title.includes('وصل') || t.title.includes('رسم') || t.title.includes('قضائي') || t.docCategory === 'evidence')
            );

            if (isSoon) {
                if (!hasReceipt) {
                    setStatus('urgent');
                    setMessage(`لاحظت أن موعد المرافعة ${hoursToHearing < 24 ? 'غداً' : 'قريب'} ولم يتم إرفاق`);
                    setMissingItem('وصل الرسم القضائي');
                } else {
                    setStatus('ready');
                    setMessage(`موعد المرافعة ${hoursToHearing < 24 ? 'غداً' : 'قريب'} والملف مكتمل. أنت جاهز!`);
                }
            } else {
                setStatus('normal');
                setMessage(`المرافعة القادمة بتاريخ ${nextHearing.event.date}. لديك وقت كافٍ للتجهيز.`);
            }
        } else {
            // No upcoming hearings
            setStatus('idle');
            setMessage('لا توجد جلسات مجدولة قريباً. هل ترغب في إضافة إجراء جديد؟');
        }
    }, [timeline]);

    useEffect(() => {
        const timer = setTimeout(() => {
            analyzeFile();
        }, 1500);
        return () => clearTimeout(timer);
    }, [analyzeFile]);

    if (status === 'analyzing') {
        return (
             <div className="bg-gradient-to-r from-[#1A1E2E] to-[#0F172A] rounded-xl border border-[#E6C673]/30 p-4 mb-4 relative overflow-hidden flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-[#E6C673]/5 flex items-center justify-center shrink-0 animate-pulse">
                    <Sparkles size={20} className="text-[#E6C673]/50" />
                </div>
                <div className="flex-1 space-y-2">
                    <div className="h-2 w-1/3 bg-[#E6C673]/10 rounded animate-pulse"></div>
                    <div className="h-2 w-2/3 bg-[#E6C673]/5 rounded animate-pulse"></div>
                </div>
             </div>
        )
    }

    if (status === 'empty') return null;

    return (
        <div className={`
            bg-gradient-to-r from-[#1A1E2E] to-[#0F172A] rounded-xl border p-4 mb-4 relative overflow-hidden group transition-all duration-500
            ${status === 'urgent' ? 'border-red-500/30 shadow-[0_0_15px_rgba(239,68,68,0.1)]' : 'border-[#E6C673]/30 shadow-[0_0_15px_rgba(230,198,115,0.1)]'}
        `}>
            {status === 'urgent' && <div className="absolute inset-0 border border-red-500/20 rounded-xl animate-pulse pointer-events-none"></div>}
            
            <div className="flex items-start gap-3 relative z-10">
                <div className={`
                    w-10 h-10 rounded-lg flex items-center justify-center shrink-0 border shadow-inner transition-colors duration-500
                    ${status === 'urgent' ? 'bg-red-500/10 border-red-500/20 shadow-red-500/5' : 
                      status === 'ready' ? 'bg-green-500/10 border-green-500/20 shadow-green-500/5' : 
                      'bg-[#E6C673]/10 border-[#E6C673]/20 shadow-[#E6C673]/5'}
                `}>
                    <Sparkles size={20} className={`
                        ${status === 'urgent' ? 'text-red-400' : 
                          status === 'ready' ? 'text-green-400' : 
                          'text-[#E6C673]'} animate-pulse
                    `} />
                </div>

                <div className="flex-1">
                    <div className="flex items-center justify-between mb-2" dir="rtl">
                        <h3 className={`text-xs font-bold flex items-center gap-1.5 ${status === 'urgent' ? 'text-red-400' : status === 'ready' ? 'text-green-400' : 'text-[#E6C673]'}`}>
                            تحليل الشبح الذكي
                            <span className="text-lg">🤖</span>
                        </h3>
                        <span className="text-[9px] text-[#E6C673]/60 bg-[#E6C673]/5 px-2 py-0.5 rounded-full border border-[#E6C673]/10 flex items-center gap-1">
                            <div className={`w-1.5 h-1.5 rounded-full animate-pulse ${status === 'urgent' ? 'bg-red-500' : 'bg-green-500'}`}></div>
                            مباشر • Live Analysis
                        </span>
                    </div>

                    <p className="text-xs text-white/90 font-medium leading-relaxed mb-3 pl-1">
                        {message} 
                        {missingItem && <span className="bg-red-500/20 text-red-200 px-1 py-0.5 rounded font-bold mx-1">{missingItem}</span>}
                        {missingItem && 'بعد.'}
                    </p>

                    <div className="flex gap-2 flex-wrap">
                        {status === 'urgent' && (
                            <>
                                <button type="button" 
                                    onClick={() => onAction('document')}
                                    className="flex items-center gap-1.5 px-3 py-1.5 bg-red-500/80 hover:bg-red-500 text-white text-[10px] font-bold rounded-lg transition-all shadow-lg shadow-red-500/20 hover:scale-105 active:scale-95"
                                >
                                    <Paperclip size={12} /> إرفاق الوصل الآن
                                </button>
                                <button type="button" 
                                    onClick={() => onAction('notify_client')}
                                    className="flex items-center gap-1.5 px-3 py-1.5 bg-[#1A1E2E] text-white/80 text-[10px] font-bold rounded-lg border border-white/10 hover:bg-white/5 transition-all hover:border-red-500/50 hover:text-white group/btn"
                                >
                                    <MessageCircle size={12} className="text-red-400 group-hover/btn:text-red-300" /> إبلاغ الموكل بالنقص
                                </button>
                            </>
                        )}
                        
                        {status === 'ready' && (
                            <div className="flex items-center gap-2 text-green-400 text-xs font-bold bg-green-500/10 px-3 py-1.5 rounded-lg border border-green-500/20">
                                <Check size={14} /> كل شيء جاهز، بالتوفيق!
                            </div>
                        )}

                        {(status === 'normal' || status === 'idle') && (
                            <button type="button" 
                                onClick={() => onAction('appointment')}
                                className="flex items-center gap-1.5 px-3 py-1.5 bg-[#1A1E2E] text-white/80 text-[10px] font-bold rounded-lg border border-white/10 hover:bg-white/5 transition-all hover:border-[#E6C673]/50 hover:text-white"
                            >
                                <Clock size={12} className="text-[#E6C673]" /> إضافة تذكير أو موعد
                            </button>
                        )}
                    </div>
                </div>
            </div>
            
            <div className={`absolute -bottom-10 -right-10 w-32 h-32 rounded-full blur-3xl pointer-events-none animate-pulse ${status === 'urgent' ? 'bg-red-500/5' : 'bg-[#E6C673]/5'}`}></div>
        </div>
    );
};
