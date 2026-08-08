/**
 * ═══════════════════════════════════════════════════════════════════════════
 * ⏱️ ExecutionTimelineSection - Timeline Events Display
 * ═══════════════════════════════════════════════════════════════════════════
 * 
 * Displays chronological timeline of execution events
 * يعرض الخط الزمني الزمني لأحداث التنفيذ
 * 
 * @version 1.0.0
 * @author Hami Legal System - Modular Architecture
 */

import React, { useState, useMemo } from 'react';
import { motion } from 'motion/react';
import {
    Clock,
    Calendar,
    Activity,
    DollarSign,
    Bell,
    Scale,
    FileText,
    MessageSquare,
    Plus,
    Filter,
    Download,
} from '@/app/components/ui/lucideIcons';
import type { TimelineEvent } from './types';

// ═══════════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════════

export interface ExecutionTimelineSectionProps {
    events: TimelineEvent[];
    onAddEvent?: () => void;
    onViewEvent?: (event: TimelineEvent) => void;
    onExportTimeline?: () => void;
}

// ═══════════════════════════════════════════════════════════════════════════
// EVENT ICON MAPPER
// ═══════════════════════════════════════════════════════════════════════════

const getEventIcon = (type: TimelineEvent['type']) => {
    const iconMap = {
        payment: { Icon: DollarSign, color: 'text-green-400 bg-green-500/20 border-green-500/30' },
        notification: { Icon: Bell, color: 'text-blue-400 bg-blue-500/20 border-blue-500/30' },
        procedure: { Icon: FileText, color: 'text-amber-400 bg-amber-500/20 border-amber-500/30' },
        court: { Icon: Scale, color: 'text-purple-400 bg-purple-500/20 border-purple-500/30' },
        note: { Icon: MessageSquare, color: 'text-gray-400 bg-gray-500/20 border-gray-500/30' }
    };

    return iconMap[type] || iconMap.note;
};

// ═══════════════════════════════════════════════════════════════════════════
// TIMELINE EVENT CARD
// ═══════════════════════════════════════════════════════════════════════════

interface TimelineEventCardProps {
    event: TimelineEvent;
    isFirst: boolean;
    isLast: boolean;
    onView?: (event: TimelineEvent) => void;
}

const TimelineEventCard: React.FC<TimelineEventCardProps> = ({ 
    event, 
    isFirst, 
    isLast, 
    onView 
}) => {
    const { Icon, color } = getEventIcon(event.type);

    return (
        <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            className="relative flex gap-4"
        >
            {/* Timeline Line */}
            {!isLast && (
                <div className="absolute right-[19px] top-12 bottom-0 w-0.5 bg-gradient-to-b from-navy-600 to-transparent" />
            )}

            {/* Icon */}
            <div className={`relative z-10 flex-shrink-0 w-10 h-10 rounded-lg border ${color} flex items-center justify-center`}>
                <Icon className="w-5 h-5" />
            </div>

            {/* Content */}
            <div 
                className="flex-1 bg-navy-800/50 border border-navy-700 rounded-xl p-4 hover:border-gold-500/30 transition-all cursor-pointer group"
                onClick={() => onView?.(event)}
            >
                {/* Header */}
                <div className="flex items-start justify-between mb-2">
                    <div>
                        <h4 className="text-base font-semibold text-white mb-1">
                            {event.title}
                        </h4>
                        <div className="flex items-center gap-2 text-sm text-gray-400">
                            <Calendar className="w-3 h-3" />
                            <span>{new Date(event.date).toLocaleDateString('ar-IQ', {
                                year: 'numeric',
                                month: 'long',
                                day: 'numeric',
                                weekday: 'long'
                            })}</span>
                        </div>
                    </div>

                    {/* Time Badge */}
                    <div className="flex items-center gap-1.5 px-2 py-1 bg-navy-900/50 rounded-lg text-xs text-gray-400">
                        <Clock className="w-3 h-3" />
                        <span>{new Date(event.date).toLocaleTimeString('ar-IQ', {
                            hour: '2-digit',
                            minute: '2-digit'
                        })}</span>
                    </div>
                </div>

                {/* Description */}
                {event.description && (
                    <p className="text-sm text-gray-300 mb-3 line-clamp-2">
                        {event.description}
                    </p>
                )}

                {/* Metadata */}
                {event.metadata && Object.keys(event.metadata).length > 0 && (
                    <div className="flex flex-wrap gap-2 pt-3 border-t border-navy-700">
                        {Object.entries(event.metadata).map(([key, value]) => (
                            <div key={key} className="flex items-center gap-1.5 text-xs">
                                <span className="text-gray-500">{key}:</span>
                                <span className="text-gray-300">{String(value)}</span>
                            </div>
                        ))}
                    </div>
                )}

                {/* First Event Badge */}
                {isFirst && (
                    <div className="absolute top-2 left-2">
                        <span className="px-2 py-0.5 bg-gold-500/20 text-gold-400 text-xs rounded-full border border-gold-500/30">
                            أحدث حدث
                        </span>
                    </div>
                )}
            </div>
        </motion.div>
    );
};

// ═══════════════════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ═══════════════════════════════════════════════════════════════════════════

type TimelineFilter = 'all' | TimelineEvent['type'];

export const ExecutionTimelineSection = React.memo<ExecutionTimelineSectionProps>(({
    events = [],
    onAddEvent,
    onViewEvent,
    onExportTimeline
}) => {
    const [filterType, setFilterType] = React.useState<TimelineFilter>('all');
    const [sortOrder, setSortOrder] = React.useState<'asc' | 'desc'>('desc');

    // Filter and sort events with useMemo for performance
    const filteredAndSortedEvents = React.useMemo(() => {
        let result = [...events];

        // Filter by type
        if (filterType !== 'all') {
            result = result.filter(event => event.type === filterType);
        }

        // Sort by date
        result.sort((a, b) => {
            const comparison = new Date(a.date).getTime() - new Date(b.date).getTime();
            return sortOrder === 'asc' ? comparison : -comparison;
        });

        return result;
    }, [events, filterType, sortOrder]);

    // Calculate event statistics with useMemo
    const eventStats = React.useMemo(
        () => ({
            total: events.length,
            payments: events.filter((e) => e.type === 'payment').length,
            notifications: events.filter((e) => e.type === 'notification').length,
            procedures: events.filter((e) => e.type === 'procedure').length,
            /** نوع الحدث في النموذج هو `court` وليس `hearing` */
            court: events.filter((e) => e.type === 'court').length,
            notes: events.filter((e) => e.type === 'note').length,
        }),
        [events]
    );

    // ─────────────────────────────────────────────────────────────────────────
    // RENDER
    // ─────────────────────────────────────────────────────────────────────────

    return (
        <div className="space-y-6">
            {/* Section Header */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-purple-600 rounded-xl flex items-center justify-center">
                        <Activity className="w-5 h-5 text-white" />
                    </div>
                    <div>
                        <h3 className="text-lg font-bold text-white">الخط الزمني</h3>
                        <p className="text-sm text-gray-400">{events.length} حدث مسجل</p>
                    </div>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-2">
                    {onExportTimeline && (
                        <button type="button"
                            onClick={onExportTimeline}
                            className="flex items-center gap-2 px-3 py-2 bg-navy-800 hover:bg-navy-700 border border-navy-700 rounded-lg transition-colors text-sm text-gray-300"
                        >
                            <Download className="w-4 h-4" />
                            <span>تصدير</span>
                        </button>
                    )}
                    {onAddEvent && (
                        <button type="button"
                            onClick={onAddEvent}
                            className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-gold-500 to-gold-600 hover:from-gold-600 hover:to-gold-700 text-navy-900 font-semibold rounded-lg transition-all duration-200 shadow-lg shadow-gold-500/20"
                        >
                            <Plus className="w-4 h-4" />
                            <span>إضافة حدث</span>
                        </button>
                    )}
                </div>
            </div>

            {/* Event Type Stats */}
            <div className="grid grid-cols-5 gap-3">
                <div className="bg-navy-800/30 border border-navy-700 rounded-lg p-3 text-center">
                    <DollarSign className="w-5 h-5 text-green-400 mx-auto mb-1" />
                    <p className="text-xs text-gray-400 mb-0.5">مدفوعات</p>
                    <p className="text-lg font-bold text-white">{eventStats.payments}</p>
                </div>
                <div className="bg-navy-800/30 border border-navy-700 rounded-lg p-3 text-center">
                    <Bell className="w-5 h-5 text-blue-400 mx-auto mb-1" />
                    <p className="text-xs text-gray-400 mb-0.5">تبليغات</p>
                    <p className="text-lg font-bold text-white">{eventStats.notifications}</p>
                </div>
                <div className="bg-navy-800/30 border border-navy-700 rounded-lg p-3 text-center">
                    <FileText className="w-5 h-5 text-amber-400 mx-auto mb-1" />
                    <p className="text-xs text-gray-400 mb-0.5">إجراءات</p>
                    <p className="text-lg font-bold text-white">{eventStats.procedures}</p>
                </div>
                <div className="bg-navy-800/30 border border-navy-700 rounded-lg p-3 text-center">
                    <Scale className="w-5 h-5 text-purple-400 mx-auto mb-1" />
                    <p className="text-xs text-gray-400 mb-0.5">محكمة</p>
                    <p className="text-lg font-bold text-white">{eventStats.court}</p>
                </div>
                <div className="bg-navy-800/30 border border-navy-700 rounded-lg p-3 text-center">
                    <MessageSquare className="w-5 h-5 text-gray-400 mx-auto mb-1" />
                    <p className="text-xs text-gray-400 mb-0.5">ملاحظات</p>
                    <p className="text-lg font-bold text-white">{eventStats.notes}</p>
                </div>
            </div>

            {/* Filter */}
            <div className="flex items-center gap-2">
                <Filter className="w-4 h-4 text-gray-500" />
                <select
                    value={filterType}
                    onChange={(e) => setFilterType(e.target.value as TimelineFilter)}
                    className="flex-1 bg-navy-800 border border-navy-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-gold-500"
                >
                    <option value="all">جميع الأحداث ({eventStats.total})</option>
                    <option value="payment">مدفوعات فقط ({eventStats.payments})</option>
                    <option value="notification">تبليغات فقط ({eventStats.notifications})</option>
                    <option value="procedure">إجراءات فقط ({eventStats.procedures})</option>
                    <option value="court">أحداث المحكمة فقط ({eventStats.court})</option>
                    <option value="note">ملاحظات فقط ({eventStats.notes})</option>
                </select>
            </div>

            {/* Timeline List */}
            <div className="space-y-4">
                {filteredAndSortedEvents.length > 0 ? (
                    filteredAndSortedEvents.map((event, index) => (
                        <TimelineEventCard
                            key={event.id}
                            event={event}
                            isFirst={index === 0}
                            isLast={index === filteredAndSortedEvents.length - 1}
                            onView={onViewEvent}
                        />
                    ))
                ) : (
                    <div className="text-center py-12 bg-navy-900/30 border border-dashed border-navy-700 rounded-xl">
                        <Activity className="w-12 h-12 text-gray-600 mx-auto mb-3" />
                        <p className="text-gray-400 mb-4">
                            {filterType === 'all' ? 'لا توجد أحداث مسجلة' : 'لا توجد أحداث من هذا النوع'}
                        </p>
                        {onAddEvent && filterType === 'all' && (
                            <button type="button"
                                onClick={onAddEvent}
                                className="px-4 py-2 bg-gold-500 hover:bg-gold-600 text-navy-900 font-semibold rounded-lg transition-colors"
                            >
                                إضافة أول حدث
                            </button>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
});

// ═══════════════════════════════════════════════════════════════════════════
// EXPORTS
// ═══════════════════════════════════════════════════════════════════════════

export default ExecutionTimelineSection;