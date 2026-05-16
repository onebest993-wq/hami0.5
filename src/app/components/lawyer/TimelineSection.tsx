import React from 'react';
import { Activity, Globe, Coins, Scale, Calendar, AlertCircle } from 'lucide-react';
import { TimelineEventCard } from './TimelineEventCard';

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

type TimelineFilter = 'all' | 'financial' | 'legal' | 'appointments';

interface TimelineSectionProps {
    timelineEvents: TimelineEvent[];
    timelineFilter: TimelineFilter;
    setTimelineFilter: (filter: TimelineFilter) => void;
    onEventClick: (event: TimelineEvent) => void;
    onAttachmentClick: (preview: string) => void;
    onTaskToggle: (eventId: number) => void;
    onAppealResultClick: () => void;
}

export const TimelineSection: React.FC<TimelineSectionProps> = ({
    timelineEvents,
    timelineFilter,
    setTimelineFilter,
    onEventClick,
    onAttachmentClick,
    onTaskToggle,
    onAppealResultClick
}) => {
    const filterEvents = (events: TimelineEvent[], filter: TimelineFilter) => {
        if (filter === 'all') return events;
        if (filter === 'financial') return events.filter(e => ['payment', 'financial', 'auction'].includes(e.type));
        if (filter === 'legal') return events.filter(e => ['decision', 'appeal', 'document', 'task'].includes(e.type));
        if (filter === 'appointments') return events.filter(e => e.type === 'appointment');
        return events;
    };

    const filteredEvents = filterEvents(timelineEvents, timelineFilter);

    return (
        <div className="w-full bg-gradient-to-br from-slate-900/40 via-indigo-950/30 to-slate-900/40 backdrop-blur-xl border border-indigo-500/20 rounded-2xl p-6 shadow-2xl">
            
            {/* HEADER & SMART FILTERS */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
                <div className="flex items-center gap-3">
                    <div className="bg-gradient-to-br from-indigo-500/20 to-purple-500/20 p-3 rounded-xl backdrop-blur-sm border border-indigo-400/30">
                        <Activity className="text-indigo-300" size={24} />
                    </div>
                    <div>
                        <h2 className="text-xl font-black text-white">السجل الزمني التفاعلي</h2>
                        <p className="text-indigo-400/60 text-xs mt-0.5">تتبع شامل لجميع الإجراءات القانونية</p>
                    </div>
                </div>
                
                {/* Filters (Glassmorphism Pill buttons) */}
                <div className="flex gap-2 overflow-x-auto w-full md:w-auto pb-2 md:pb-0 scrollbar-none">
                    <button type="button" 
                        onClick={() => setTimelineFilter('all')}
                        className={`px-4 py-2 rounded-xl text-sm font-bold whitespace-nowrap transition-all duration-300 ${
                            timelineFilter === 'all' 
                                ? 'bg-gradient-to-r from-indigo-600 to-purple-600 text-white shadow-lg shadow-indigo-500/50' 
                                : 'bg-slate-800/40 border border-slate-700/50 text-slate-400 hover:text-white hover:border-indigo-500/50 backdrop-blur-sm'
                        }`}
                    >
                        <span className="flex items-center gap-2">
                            <Globe size={16} />
                            الكل
                        </span>
                    </button>
                    <button type="button" 
                        onClick={() => setTimelineFilter('financial')}
                        className={`px-4 py-2 rounded-xl text-sm font-bold whitespace-nowrap transition-all duration-300 ${
                            timelineFilter === 'financial' 
                                ? 'bg-gradient-to-r from-emerald-600 to-green-600 text-white shadow-lg shadow-emerald-500/50' 
                                : 'bg-slate-800/40 border border-slate-700/50 text-slate-400 hover:text-white hover:border-emerald-500/50 backdrop-blur-sm'
                        }`}
                    >
                        <span className="flex items-center gap-2">
                            <Coins size={16} />
                            مالي
                        </span>
                    </button>
                    <button type="button" 
                        onClick={() => setTimelineFilter('legal')}
                        className={`px-4 py-2 rounded-xl text-sm font-bold whitespace-nowrap transition-all duration-300 ${
                            timelineFilter === 'legal' 
                                ? 'bg-gradient-to-r from-amber-600 to-orange-600 text-white shadow-lg shadow-amber-500/50' 
                                : 'bg-slate-800/40 border border-slate-700/50 text-slate-400 hover:text-white hover:border-amber-500/50 backdrop-blur-sm'
                        }`}
                    >
                        <span className="flex items-center gap-2">
                            <Scale size={16} />
                            إجراءات
                        </span>
                    </button>
                    <button type="button" 
                        onClick={() => setTimelineFilter('appointments')}
                        className={`px-4 py-2 rounded-xl text-sm font-bold whitespace-nowrap transition-all duration-300 ${
                            timelineFilter === 'appointments' 
                                ? 'bg-gradient-to-r from-rose-600 to-pink-600 text-white shadow-lg shadow-rose-500/50' 
                                : 'bg-slate-800/40 border border-slate-700/50 text-slate-400 hover:text-white hover:border-rose-500/50 backdrop-blur-sm'
                        }`}
                    >
                        <span className="flex items-center gap-2">
                            <Calendar size={16} />
                            مواعيد حرجة
                        </span>
                    </button>
                </div>
            </div>

            {/* THE DYNAMIC TIMELINE FEED */}
            <div className="relative border-r-2 border-indigo-500/30 pr-6 ml-2 space-y-6">
                {filteredEvents.map((event) => (
                    <TimelineEventCard
                        key={event.id}
                        event={event}
                        onEventClick={onEventClick}
                        onAttachmentClick={onAttachmentClick}
                        onTaskToggle={onTaskToggle}
                        onAppealResultClick={onAppealResultClick}
                    />
                ))}
                
                {/* Empty State Message */}
                {filteredEvents.length === 0 && (
                    <div className="text-center py-12">
                        <div className="bg-gradient-to-br from-slate-800/40 to-slate-900/40 backdrop-blur-xl border border-slate-700/50 rounded-2xl p-8 inline-block">
                            <AlertCircle size={48} className="text-slate-500 mx-auto mb-4" />
                            <p className="text-slate-400 text-lg font-bold mb-2">لا توجد أحداث</p>
                            <p className="text-slate-500 text-sm">
                                {timelineFilter === 'financial' && 'لا توجد عمليات مالية مسجلة حتى الآن'}
                                {timelineFilter === 'legal' && 'لا توجد إجراءات قانونية مسجلة حتى الآن'}
                                {timelineFilter === 'appointments' && 'لا توجد مواعيد مسجلة حتى الآن'}
                            </p>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};
