import React from 'react';
import { Calendar, Paperclip, FileText, Scale, Search as SearchIcon, Clock, PauseCircle, Edit3, Trash2 } from 'lucide-react';
import type { TimelineEvent } from '../../LawyerShared';

export const TimelineFeed = ({ events, onDelete, onEdit }: { events: TimelineEvent[], onDelete?: (id: string) => void, onEdit?: (id: string) => void }) => {
    if (events.length === 0) {
        return (
            <div className="text-center py-12">
                <Clock size={32} className="text-white/10 mx-auto mb-3" />
                <p className="text-white/20 text-sm">لا توجد إجراءات مسجلة حتى الآن</p>
                <p className="text-white/10 text-xs mt-1">استخدم الأزرار أعلاه لإضافة مواعيد، ملاحظات، أو مستندات</p>
            </div>
        );
    }

    // Icon mapping based on event type
    const getEventIcon = (type: string) => {
        switch(type) {
            case 'appointment': return Calendar;
            case 'document': return Paperclip;
            case 'note': return FileText;
            case 'decision': return Scale;
            case 'expert': return SearchIcon;
            default: return FileText;
        }
    };

    const getEventColor = (type: string) => {
        switch(type) {
            case 'appointment': return 'text-blue-400';
            case 'document': return 'text-purple-400';
            case 'note': return 'text-amber-400';
            case 'decision': return 'text-green-400';
            case 'expert': return 'text-teal-400';
            default: return 'text-white/40';
        }
    };

    // 🔥 NEW: Evidentiary Badge Logic
    const getEvidentiaryBadge = (weight: string) => {
        switch (weight) {
            case 'official':
                return { label: 'سند رسمي 🏛️', style: 'border-[#E6C673] text-[#E6C673] bg-[#E6C673]/10' };
            case 'ordinary':
                return { label: 'سند عادي 📄', style: 'border-slate-400 text-slate-300 bg-slate-500/10' };
            case 'beginning':
                return { label: 'مبدأ ثبوت 💡', style: 'border-indigo-400 text-indigo-300 bg-indigo-500/10 border-dashed' };
            default:
                return null;
        }
    };
    
    return (
        <div className="space-y-4 relative before:absolute before:right-4 before:top-6 before:bottom-0 before:w-[2px] before:bg-gradient-to-b before:from-[#D4AF37]/40 before:via-[#D4AF37]/20 before:to-transparent">
            {events.map((event, idx) => {
                const EventIcon = getEventIcon(event.type);
                const iconColor = getEventColor(event.type);
                
                // SPECIAL STYLING FOR STAY/PAUSE EVENTS & INTERRUPTION EVENTS & EXPERT & CROSS-APPEAL & FAST-TRACK & ATTACHMENT
                const extendedEvent = event as TimelineEvent & { 
                    isPause?: boolean; 
                    isInterruption?: boolean; 
                    color?: string; 
                    isFastTrack?: boolean; 
                    isAttachment?: boolean;
                    attachmentStatus?: string;
                    fastTrackStatus?: string;
                };
                const isPauseEvent = extendedEvent.isPause || event.title?.includes('استئخار');
                const isInterruptionEvent = extendedEvent.isInterruption || event.title?.includes('انقطاع السير');
                const isExpertEvent = event.type === 'expert';
                const isCrossAppealEvent = extendedEvent.color === 'teal'; // 🔥 NEW: Cross-Appeal support
                const isFastTrackEvent = extendedEvent.isFastTrack; // 🔥 NEW: Fast-Track support
                const isAttachmentEvent = extendedEvent.isAttachment; // 🔥 NEW: Attachment support
                
                const cardClasses = isPauseEvent 
                    ? 'flex-1 bg-yellow-500/10 backdrop-blur-sm border-l-4 border-yellow-500 rounded-xl p-4 mr-12 hover:border-yellow-400 transition-all group-hover:bg-yellow-500/15 shadow-lg shadow-yellow-500/10'
                    : isInterruptionEvent
                    ? 'flex-1 bg-rose-500/10 backdrop-blur-sm border-l-4 border-rose-500 rounded-xl p-4 mr-12 hover:border-rose-400 transition-all group-hover:bg-rose-500/15 shadow-lg shadow-rose-500/10'
                    : isAttachmentEvent
                    ? 'flex-1 bg-red-500/20 backdrop-blur-sm border-2 border-red-500/70 rounded-xl p-4 mr-12 hover:border-red-400 transition-all group-hover:bg-red-500/25 shadow-xl shadow-red-900/40 ring-2 ring-red-500/30'
                    : isFastTrackEvent
                    ? 'flex-1 bg-amber-500/20 backdrop-blur-sm border-2 border-amber-500/60 rounded-xl p-4 mr-12 hover:border-amber-400 transition-all group-hover:bg-amber-500/25 shadow-xl shadow-amber-900/30 ring-2 ring-amber-500/20'
                    : isExpertEvent || isCrossAppealEvent
                    ? 'flex-1 bg-teal-900/20 backdrop-blur-sm border-l-4 border-teal-500 rounded-xl p-4 mr-12 hover:border-teal-400 transition-all group-hover:bg-teal-500/15 shadow-lg shadow-teal-500/10'
                    : 'flex-1 bg-white/5 backdrop-blur-sm border border-white/10 rounded-xl p-4 mr-12 hover:border-[#D4AF37]/50 transition-all group-hover:bg-white/[0.07] shadow-sm';
                
                const dotClasses = isPauseEvent
                    ? 'absolute right-[11px] top-6 w-3 h-3 rounded-full bg-yellow-500 outline outline-4 outline-[#1A1E2E] z-10 transition-all group-hover:scale-150 group-hover:shadow-[0_0_12px_rgba(234,179,8,0.8)] animate-pulse'
                    : isInterruptionEvent
                    ? 'absolute right-[11px] top-6 w-3 h-3 rounded-full bg-rose-500 outline outline-4 outline-[#1A1E2E] z-10 transition-all group-hover:scale-150 group-hover:shadow-[0_0_12px_rgba(244,63,94,0.8)] animate-pulse'
                    : isAttachmentEvent
                    ? 'absolute right-[11px] top-6 w-4 h-4 rounded-full bg-red-500 outline outline-4 outline-[#1A1E2E] z-10 transition-all group-hover:scale-150 group-hover:shadow-[0_0_18px_rgba(239,68,68,1)] animate-pulse'
                    : isFastTrackEvent
                    ? 'absolute right-[11px] top-6 w-4 h-4 rounded-full bg-amber-500 outline outline-4 outline-[#1A1E2E] z-10 transition-all group-hover:scale-150 group-hover:shadow-[0_0_16px_rgba(245,158,11,1)] animate-pulse'
                    : isExpertEvent || isCrossAppealEvent
                    ? 'absolute right-[11px] top-6 w-3 h-3 rounded-full bg-teal-500 outline outline-4 outline-[#1A1E2E] z-10 transition-all group-hover:scale-150 group-hover:shadow-[0_0_12px_rgba(20,184,166,0.8)]'
                    : `absolute right-[11px] top-6 w-3 h-3 rounded-full ${event.type === 'decision' ? 'bg-green-500' : 'bg-[#D4AF37]'} outline outline-4 outline-[#1A1E2E] z-10 transition-all group-hover:scale-150 group-hover:shadow-[0_0_12px_rgba(212,175,55,0.6)]`;
                
                const evidentiaryBadge = event.evidentiaryWeight ? getEvidentiaryBadge(event.evidentiaryWeight) : null;

                return (
                    <div key={event.id} className="relative flex items-start gap-4 group">
                        {/* Timeline Dot - Right aligned for RTL */}
                        <div className={dotClasses} />
                        
                        {/* Content Card - Dynamic Styling */}
                        <div className={cardClasses}>
                            <div className="flex justify-between items-start mb-2">
                                <div className="flex items-start gap-3 flex-1">
                                    <div className={`w-10 h-10 rounded-lg bg-gradient-to-br from-white/10 to-white/5 flex items-center justify-center shrink-0 ${
                                        isPauseEvent ? 'text-yellow-400 border-yellow-500/30' : 
                                        isInterruptionEvent ? 'text-rose-400 border-rose-500/30' :
                                        isAttachmentEvent ? 'text-red-400 border-red-500/50 shadow-lg shadow-red-500/30' :
                                        isFastTrackEvent ? 'text-amber-400 border-amber-500/50 shadow-lg shadow-amber-500/30' :
                                        isExpertEvent || isCrossAppealEvent ? 'text-teal-400 border-teal-500/30' :
                                        iconColor
                                    } border border-white/10`}>
                                        {isPauseEvent ? <PauseCircle size={18} /> : 
                                         isInterruptionEvent ? <span className="text-lg">🛑</span> :
                                         isAttachmentEvent ? <span className="text-xl animate-pulse">🔒</span> :
                                         isFastTrackEvent ? <span className="text-xl animate-pulse">⚡</span> :
                                         <EventIcon size={18} />}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <h4 className={`font-bold text-sm mb-1 leading-tight ${
                                            isPauseEvent ? 'text-yellow-300' : 
                                            isInterruptionEvent ? 'text-rose-300' :
                                            isAttachmentEvent ? 'text-red-300' :
                                            isFastTrackEvent ? 'text-amber-300' :
                                            isExpertEvent || isCrossAppealEvent ? 'text-teal-300' :
                                            'text-white'
                                        }`}>
                                            {event.title}
                                        </h4>
                                        <div className="flex items-center gap-2 text-[10px] text-white/40 font-medium flex-wrap">
                                            <span>{event.date}</span>
                                            {event.time && <><span>•</span><span>{event.time}</span></>}
                                            
                                            {/* 🔥 NEW: Evidentiary Badge in Timeline */}
                                            {evidentiaryBadge && (
                                                <span className={`px-2 py-0.5 rounded-full border ${evidentiaryBadge.style} font-bold`}>
                                                    {evidentiaryBadge.label}
                                                </span>
                                            )}

                                            {isPauseEvent && (
                                                <span className="bg-yellow-500/20 text-yellow-300 px-2 py-0.5 rounded-full text-[9px] font-bold flex items-center gap-1">
                                                    ⏸️ استئخار نشط
                                                </span>
                                            )}
                                            {isInterruptionEvent && (
                                                <span className="bg-rose-500/20 text-rose-300 px-2 py-0.5 rounded-full text-[9px] font-bold flex items-center gap-1">
                                                    🛑 انقطاع السير
                                                </span>
                                            )}
                                            {isAttachmentEvent && (
                                                <>
                                                    <span className="bg-red-500/30 text-red-200 px-2.5 py-1 rounded-full text-[9px] font-bold flex items-center gap-1 shadow-lg shadow-red-900/30 border border-red-500/50">
                                                        🔒 حجز احتياطي
                                                    </span>
                                                    {extendedEvent.attachmentStatus && (
                                                        <span className="bg-red-900/40 text-red-100 px-2 py-0.5 rounded text-[8px] font-bold border border-red-700/50">
                                                            {extendedEvent.attachmentStatus}
                                                        </span>
                                                    )}
                                                </>
                                            )}
                                            {isFastTrackEvent && (
                                                <>
                                                    <span className="bg-amber-500/30 text-amber-200 px-2.5 py-1 rounded-full text-[9px] font-bold flex items-center gap-1 shadow-lg shadow-amber-900/30 border border-amber-500/50">
                                                        ⚡ إجراء مستعجل
                                                    </span>
                                                    {extendedEvent.fastTrackStatus && (
                                                        <span className="bg-amber-900/40 text-amber-100 px-2 py-0.5 rounded text-[8px] font-bold border border-amber-700/50">
                                                            {extendedEvent.fastTrackStatus}
                                                        </span>
                                                    )}
                                                </>
                                            )}
                                            {isExpertEvent && (
                                                <span className="bg-teal-500/20 text-teal-300 px-2 py-0.5 rounded-full text-[9px] font-bold flex items-center gap-1">
                                                    🔎 خبير قضائي
                                                </span>
                                            )}
                                            {event.type === 'decision' && !isPauseEvent && !isInterruptionEvent && (
                                                <span className="bg-green-500/20 text-green-400 px-2 py-0.5 rounded-full text-[9px] font-bold">قرار قضائي</span>
                                            )}
                                            {event.docCategory && <span className="bg-purple-500/20 text-purple-400 px-2 py-0.5 rounded-full text-[9px] font-bold">{event.docCategory}</span>}
                                            {event.tags && event.tags.length > 0 && (
                                                <div className="flex flex-wrap gap-1 mt-1">
                                                    {event.tags.map((tag: string) => (
                                                        <span key={tag} className="bg-amber-500/10 text-amber-400 border border-amber-500/20 px-1.5 py-0.5 rounded text-[8px] font-bold">
                                                            {tag}
                                                        </span>
                                                    ))}
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>
                                {/* Action Buttons (Hidden if onEdit/onDelete not provided - Read-Only Mode) */}
                                {(onEdit || onDelete) && (
                                    <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity print:hidden">
                                        {onEdit && (
                                            <button type="button" 
                                                onClick={() => onEdit(event.id)} 
                                                className="p-1.5 rounded-lg hover:bg-blue-500/20 text-white/40 hover:text-blue-400 transition-colors"
                                                title="تعديل"
                                            >
                                                <Edit3 size={14}/>
                                            </button>
                                        )}
                                        {onDelete && (
                                            <button type="button" 
                                                onClick={() => onDelete(event.id)} 
                                                className="p-1.5 rounded-lg hover:bg-red-500/10 text-white/30 hover:text-red-400 transition-colors"
                                                title="حذف"
                                            >
                                                <Trash2 size={14}/>
                                            </button>
                                        )}
                                    </div>
                                )}
                            </div>
                            {event.details && (
                                <p className={`text-xs leading-relaxed mr-13 mt-2 border-r-2 pr-3 whitespace-pre-line ${
                                    isPauseEvent 
                                        ? 'text-yellow-200/80 border-yellow-500/30' 
                                        : isInterruptionEvent
                                        ? 'text-rose-200/80 border-rose-500/30'
                                        : isExpertEvent
                                        ? 'text-teal-200/80 border-teal-500/30'
                                        : 'text-white/60 border-[#D4AF37]/20'
                                }`}>
                                    {event.details}
                                </p>
                            )}
                        </div>
                    </div>
                );
            })}
        </div>
    );
};
