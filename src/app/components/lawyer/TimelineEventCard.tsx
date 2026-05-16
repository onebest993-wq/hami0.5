import React from 'react';
import { motion } from 'motion/react';
import { 
    Eye, FileText, Paperclip, CheckCircle,
    Zap, StickyNote, ListTodo, Calendar, Gavel,
    DollarSign, Scale, Wallet, TrendingUp
} from 'lucide-react';

interface TimelineEvent {
    id: number;
    type: string;
    title: string;
    date: string;
    desc?: string;
    attachmentName?: string;
    attachmentPreview?: string;
    isCompleted?: boolean;
    resultEntered?: boolean;
}

interface TimelineEventCardProps {
    event: TimelineEvent;
    onEventClick: (event: TimelineEvent) => void;
    onAttachmentClick: (preview: string) => void;
    onTaskToggle: (eventId: number) => void;
    onAppealResultClick: () => void;
}

export const TimelineEventCard: React.FC<TimelineEventCardProps> = ({
    event,
    onEventClick,
    onAttachmentClick,
    onTaskToggle,
    onAppealResultClick
}) => {
    // Dynamic colors based on event type
    const colors = {
        system: { 
            dot: 'bg-gradient-to-br from-indigo-400 to-indigo-600', 
            text: 'text-indigo-300', 
            badge: 'bg-indigo-500/20 text-indigo-300 border-indigo-400/30',
            card: 'from-indigo-950/40 to-indigo-900/20',
            icon: Zap
        },
        note: { 
            dot: 'bg-gradient-to-br from-amber-400 to-amber-600', 
            text: 'text-amber-300', 
            badge: 'bg-amber-500/20 text-amber-300 border-amber-400/30',
            card: 'from-amber-950/40 to-amber-900/20',
            icon: StickyNote
        },
        task: { 
            dot: 'bg-gradient-to-br from-purple-400 to-purple-600', 
            text: 'text-purple-300', 
            badge: 'bg-purple-500/20 text-purple-300 border-purple-400/30',
            card: 'from-purple-950/40 to-purple-900/20',
            icon: ListTodo
        },
        appointment: { 
            dot: 'bg-gradient-to-br from-blue-400 to-blue-600', 
            text: 'text-blue-300', 
            badge: 'bg-blue-500/20 text-blue-300 border-blue-400/30',
            card: 'from-blue-950/40 to-blue-900/20',
            icon: Calendar
        },
        decision: { 
            dot: 'bg-gradient-to-br from-rose-400 to-rose-600', 
            text: 'text-rose-300', 
            badge: 'bg-rose-500/20 text-rose-300 border-rose-400/30',
            card: 'from-rose-950/40 to-rose-900/20',
            icon: Gavel
        },
        document: { 
            dot: 'bg-gradient-to-br from-cyan-400 to-cyan-600', 
            text: 'text-cyan-300', 
            badge: 'bg-cyan-500/20 text-cyan-300 border-cyan-400/30',
            card: 'from-cyan-950/40 to-cyan-900/20',
            icon: FileText
        },
        appeal: { 
            dot: 'bg-gradient-to-br from-violet-400 to-violet-600', 
            text: 'text-violet-300', 
            badge: 'bg-violet-500/20 text-violet-300 border-violet-400/30',
            card: 'from-violet-950/40 to-violet-900/20',
            icon: Scale
        },
        payment: { 
            dot: 'bg-gradient-to-br from-emerald-400 to-emerald-600', 
            text: 'text-emerald-300', 
            badge: 'bg-emerald-500/20 text-emerald-300 border-emerald-400/30',
            card: 'from-emerald-950/40 to-emerald-900/20',
            icon: DollarSign
        },
        financial: { 
            dot: 'bg-gradient-to-br from-green-400 to-green-600', 
            text: 'text-green-300', 
            badge: 'bg-green-500/20 text-green-300 border-green-400/30',
            card: 'from-green-950/40 to-green-900/20',
            icon: Wallet
        },
        auction: { 
            dot: 'bg-gradient-to-br from-orange-400 to-orange-600', 
            text: 'text-orange-300', 
            badge: 'bg-orange-500/20 text-orange-300 border-orange-400/30',
            card: 'from-orange-950/40 to-orange-900/20',
            icon: TrendingUp
        }
    };
    
    const style = colors[event.type as keyof typeof colors] || colors.system;
    const IconComponent = style.icon;

    const getEventLabel = (type: string) => {
        const labels: Record<string, string> = {
            note: 'ملاحظة',
            task: 'مهمة',
            appointment: 'موعد',
            decision: 'قرار',
            document: 'مستند',
            appeal: 'طعن',
            payment: 'دفعة مالية',
            financial: 'عملية مالية',
            auction: 'مزاد',
            system: 'نظام'
        };
        return labels[type] || 'نظام';
    };
    
    return (
        <motion.div 
            className="relative"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.3 }}
        >
            {/* Timeline Dot - Enhanced with glow */}
            <div className={`absolute -right-[33px] top-4 w-5 h-5 rounded-full ${style.dot} ring-4 ring-slate-900/50 shadow-lg`}>
                <div className={`absolute inset-0 ${style.dot} rounded-full blur-sm opacity-60`}></div>
            </div>
            
            {/* Content Card - Glassmorphism Style */}
            <div 
                onClick={() => onEventClick(event)}
                className={`bg-gradient-to-br ${style.card} backdrop-blur-xl border border-white/10 rounded-2xl p-5 cursor-pointer hover:border-indigo-400/50 hover:shadow-2xl transition-all duration-300 group relative overflow-hidden`}
            >
                {/* Ambient glow effect */}
                <div className="absolute inset-0 bg-gradient-to-br from-white/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                
                <div className="relative z-10">
                    <div className="flex justify-between items-start mb-3">
                        <div className="flex items-center gap-3">
                            <div className={`bg-gradient-to-br ${style.dot} p-2 rounded-lg shadow-lg`}>
                                <IconComponent size={16} className="text-white" />
                            </div>
                            <div>
                                <span className={`${style.text} font-bold text-sm block`}>
                                    {event.date}
                                </span>
                                <span className={`text-xs ${style.badge} px-3 py-1 rounded-full border inline-block mt-1`}>
                                    {getEventLabel(event.type)}
                                </span>
                            </div>
                        </div>
                        <Eye size={18} className="text-gray-500 group-hover:text-indigo-400 transition-colors" />
                    </div>
                    
                    <p className="text-white font-bold text-base mb-2">{event.title}</p>
                    
                    {/* Description Snippet with Truncation - Enhanced */}
                    {event.desc && (
                        <p className="text-gray-300 text-sm mt-3 line-clamp-2 border-t border-white/10 pt-3 group-hover:text-white transition-colors leading-relaxed">
                            {event.desc}
                        </p>
                    )}
                    
                    {/* Embedded Attachment Display - Enhanced Glassmorphism */}
                    {event.attachmentName && (
                        <div className="mt-4 pt-3 border-t border-white/10">
                            <button type="button"
                                onClick={(e) => {
                                    e.stopPropagation();
                                    if (event.attachmentPreview) {
                                        onAttachmentClick(event.attachmentPreview);
                                    }
                                }}
                                className="flex items-center gap-3 bg-gradient-to-r from-amber-950/30 to-orange-950/30 backdrop-blur-sm border border-amber-500/30 rounded-xl px-4 py-3 hover:border-amber-400/60 hover:shadow-lg hover:shadow-amber-500/20 transition-all w-full text-left group/attach"
                            >
                                <div className="bg-gradient-to-br from-amber-500 to-orange-500 p-2 rounded-lg shadow-lg">
                                    <Paperclip size={14} className="text-white" />
                                </div>
                                <div className="flex-1 min-w-0">
                                    <span className="text-xs text-amber-400/70 block">المرفق</span>
                                    <span className="text-sm text-amber-300 font-bold truncate block">
                                        {event.attachmentName}
                                    </span>
                                </div>
                                <Eye size={16} className="text-amber-400/50 group-hover/attach:text-amber-300 transition-colors flex-shrink-0" />
                            </button>
                        </div>
                    )}
                    
                    {/* Task Checkbox - Enhanced with glassmorphism */}
                    {event.type === 'task' && (
                        <label 
                            className="flex items-center gap-3 mt-4 pt-3 border-t border-white/10 cursor-pointer group/task"
                            onClick={(e) => e.stopPropagation()}
                        >
                            <div className="relative">
                                <input 
                                    type="checkbox" 
                                    checked={event.isCompleted || false}
                                    onChange={() => onTaskToggle(event.id)}
                                    className="w-5 h-5 accent-purple-500 rounded-lg"
                                />
                            </div>
                            <div className="flex-1">
                                <span className={`text-sm font-bold ${event.isCompleted ? 'text-emerald-400' : 'text-purple-400'}`}>
                                    {event.isCompleted ? '✓ مكتملة' : 'قيد التنفيذ'}
                                </span>
                                {event.isCompleted && (
                                    <span className="block text-xs text-emerald-400/60 mt-0.5">تم إنجاز المهمة بنجاح</span>
                                )}
                            </div>
                            {event.isCompleted && <CheckCircle size={18} className="text-emerald-400" />}
                        </label>
                    )}
                    
                    {/* Appeal Result Button - Enhanced glassmorphism */}
                    {event.type === 'appeal' && !event.resultEntered && (
                        <button type="button"
                            onClick={(e) => {
                                e.stopPropagation();
                                onAppealResultClick();
                            }}
                            className="mt-4 w-full bg-gradient-to-r from-indigo-950/40 to-violet-950/40 backdrop-blur-sm hover:from-indigo-900/60 hover:to-violet-900/60 border border-indigo-400/30 hover:border-indigo-400/60 text-indigo-300 px-4 py-3 rounded-xl text-sm font-bold transition-all flex items-center justify-center gap-2 shadow-lg hover:shadow-indigo-500/30 group/appeal"
                        >
                            <FileText size={16} className="group-hover/appeal:scale-110 transition-transform" />
                            إدخال نتيجة الطعن
                        </button>
                    )}
                </div>
            </div>
        </motion.div>
    );
};
