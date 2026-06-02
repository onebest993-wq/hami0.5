import React from 'react';
import { motion } from 'motion/react';
import { Clock, MapPin, MessageCircle, Navigation, CheckCircle2, Trash2, ExternalLink } from 'lucide-react';
import { TYPE_STYLES } from './utils';
import type { UnifiedEvent } from '@/app/components/lawyer/hooks/useCalendarData';

interface EventCardProps {
    event: UnifiedEvent;
    index: number;
    highlighted?: boolean;
    onEdit: (event: UnifiedEvent) => void;
    onDelete: (event: UnifiedEvent) => void;
    /** فتح المصدر الأصلي للموعد (الإضبارة/الملاحظة/المهمة) إن كان مربوطاً */
    onOpenSource?: (event: UnifiedEvent) => void;
}

export const EventCard = React.memo(function EventCard({ event, index, highlighted, onEdit, onDelete, onOpenSource }: EventCardProps) {
    const style = TYPE_STYLES[event.type] || TYPE_STYLES.custom;
    const Icon = style.icon;
    const isDiscovered = Boolean(event.bridge?.sourceEventId?.startsWith('field_'));
    const canOpenSource = Boolean(event.isBridged && onOpenSource);
    return (
        <motion.div
            key={event.id}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: index * 0.05 }}
            className={`relative bg-[#1A1E2E] rounded-xl border transition-all overflow-hidden group ${
                highlighted
                    ? 'border-indigo-400/70 ring-2 ring-indigo-400/40'
                    : 'border-white/5 hover:border-indigo-500/30'
            }`}
        >
            <div className="absolute top-0 right-0 bottom-0 w-1.5 bg-gradient-to-b from-indigo-500 to-purple-500 opacity-50" />
            <div className="p-4 pr-6">
                <div className="flex justify-between items-start mb-2">
                    <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                            <Icon size={14} className={style.color} />
                            <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${style.bg} ${style.color} ${style.border} border`}>
                                {style.label}
                            </span>
                            {event.time && (
                                <span className="text-indigo-300 font-bold font-mono text-xs flex items-center gap-1">
                                    <Clock size={12} />
                                    {event.time}
                                </span>
                            )}
                            {event.isCompleted && (
                                <CheckCircle2 size={14} className="text-emerald-400" />
                            )}
                        </div>
                        <h3 className="text-white font-bold">{event.title}</h3>
                        {event.caseNo && (
                            <span className="text-slate-500 text-xs">رقم الدعوى: {event.caseNo}</span>
                        )}
                    </div>
                    <div className="flex gap-1 items-center shrink-0">
                        {isDiscovered && (
                            <span className="text-[10px] font-bold text-amber-300/80 bg-amber-500/10 border border-amber-500/30 px-2 py-0.5 rounded-md">
                                مكتشف تلقائياً
                            </span>
                        )}
                        {canOpenSource && (
                            <button type="button"
                                onClick={() => onOpenSource!(event)}
                                title="فتح المصدر الأصلي"
                                className="p-1.5 rounded-lg hover:bg-indigo-500/20 text-indigo-300/80 hover:text-indigo-200 transition-colors"
                            >
                                <ExternalLink size={14} />
                            </button>
                        )}
                        {event.source === 'calendar' && !isDiscovered && (
                            <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                <button type="button"
                                    onClick={() => onEdit(event)}
                                    className="p-1.5 rounded-lg hover:bg-white/10 text-slate-400 hover:text-white transition-colors"
                                >
                                    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z"/><path d="m15 5 4 4"/></svg>
                                </button>
                                {!event.isBridged && (
                                    <button type="button"
                                        onClick={() => onDelete(event)}
                                        className="p-1.5 rounded-lg hover:bg-rose-500/20 text-slate-400 hover:text-rose-400 transition-colors"
                                    >
                                        <Trash2 size={14} />
                                    </button>
                                )}
                            </div>
                        )}
                    </div>
                </div>
                {event.location && (
                    <div className="flex items-center gap-2 text-white/50 text-sm mb-2">
                        <MapPin size={14} />
                        <span>{event.location}</span>
                    </div>
                )}
                {event.notes && (
                    <p className="text-white/40 text-xs mb-2">{event.notes}</p>
                )}
                {event.clientName && event.clientPhone && (
                    <div className="flex gap-2 mt-2">
                        <button type="button"
                            onClick={() => window.open(`https://wa.me/${event.clientPhone}?text=مرحباً ${event.clientName}، تذكير بالموعد: ${event.title}`, '_blank')}
                            className="flex-1 bg-white/5 hover:bg-emerald-600/20 hover:text-emerald-400 border border-white/5 hover:border-emerald-500/30 text-white/70 py-2 rounded-lg text-xs font-bold flex items-center justify-center gap-2 transition-all"
                        >
                            <MessageCircle size={14} />
                            إشعار الموكل
                        </button>
                        {event.location && (
                            <button type="button"
                                onClick={() => window.open(`https://www.google.com/maps/search/${encodeURIComponent(event.location)}`, '_blank')}
                                className="flex-1 bg-white/5 hover:bg-blue-600/20 hover:text-blue-400 border border-white/5 hover:border-blue-500/30 text-white/70 py-2 rounded-lg text-xs font-bold flex items-center justify-center gap-2 transition-all"
                            >
                                <Navigation size={14} />
                                الاتجاهات
                            </button>
                        )}
                    </div>
                )}
            </div>
        </motion.div>
    );
});
