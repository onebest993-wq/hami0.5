/**
 * ═══════════════════════════════════════════════════════════════════════════
 * ✏️ Timeline Edit Modal - نافذة تعديل السجل الزمني
 * ═══════════════════════════════════════════════════════════════════════════
 * 
 * مكون تعديل أحداث السجل الزمني في الإضبارة
 * 
 * @version 1.0.0
 * @author Hami Legal System - Modular Architecture
 */

import React, { useState, useEffect } from 'react';
import { X, Calendar, Clock, FileText, User, Building2, Car, Home, DollarSign } from 'lucide-react';
import type { TimelineEvent } from '@/app/types/execution';

// ═══════════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════════

export interface TimelineEditModalProps {
    /** حالة ظهور النافذة */
    visible: boolean;
    /** حدث السجل الحالي للتحرير */
    timelineEvent: TimelineEvent | null;
    /** دالة إغلاق النافذة */
    onClose: () => void;
    /** دالة حفظ التعديلات */
    onSave: (event: TimelineEvent) => void;
    /** دالة حذف الحدث */
    onDelete: (id: string) => void;
}

// ═══════════════════════════════════════════════════════════════════════════
// COMPONENT
// ═══════════════════════════════════════════════════════════════════════════

/**
 * نافذة تعديل حدث السجل الزمني
 */
export const TimelineEditModal: React.FC<TimelineEditModalProps> = ({
    visible,
    timelineEvent,
    onClose,
    onSave,
    onDelete,
}) => {
    const [editedEvent, setEditedEvent] = useState<TimelineEvent | null>(null);
    const [title, setTitle] = useState('');
    const [description, setDescription] = useState('');
    const [eventDate, setEventDate] = useState('');
    const [eventType, setEventType] = useState('');

    // تهيئة البيانات عند فتح النافذة
    useEffect(() => {
        if (timelineEvent) {
            setEditedEvent(timelineEvent);
            setTitle(timelineEvent.title || '');
            setDescription(timelineEvent.description || '');
            setEventDate(timelineEvent.date || '');
            setEventType(timelineEvent.type || '');
        }
    }, [timelineEvent]);

    if (!visible || !editedEvent) return null;

    const handleSave = () => {
        const updatedEvent: TimelineEvent = {
            ...editedEvent,
            title,
            description,
            date: eventDate,
            type: eventType,
        };
        onSave(updatedEvent);
        onClose();
    };

    const handleDelete = () => {
        if (editedEvent.id) {
            onDelete(String(editedEvent.id));
            onClose();
        }
    };

    const getEventTypeIcon = (type: string) => {
        switch (type.toLowerCase()) {
            case 'hearing':
            case 'court':
                return <Building2 size={16} className="text-blue-400" />;
            case 'payment':
            case 'financial':
                return <DollarSign size={16} className="text-emerald-400" />;
            case 'meeting':
            case 'consultation':
                return <User size={16} className="text-purple-400" />;
            case 'document':
            case 'filing':
                return <FileText size={16} className="text-amber-400" />;
            case 'seizure':
            case 'enforcement':
                return type.includes('vehicle') ? 
                    <Car size={16} className="text-red-400" /> : 
                    <Home size={16} className="text-orange-400" />;
            default:
                return <Calendar size={16} className="text-slate-400" />;
        }
    };

    const eventTypeOptions = [
        { value: 'hearing', label: 'جلسة محكمة', icon: <Building2 size={14} /> },
        { value: 'payment', label: 'دفعة مالية', icon: <DollarSign size={14} /> },
        { value: 'meeting', label: 'اجتماع', icon: <User size={14} /> },
        { value: 'document', label: 'مستند', icon: <FileText size={14} /> },
        { value: 'seizure_vehicle', label: 'حجز مركبة', icon: <Car size={14} /> },
        { value: 'seizure_property', label: 'حجز عقار', icon: <Home size={14} /> },
        { value: 'other', label: 'أخرى', icon: <Calendar size={14} /> },
    ];

    return (
        <div
            className="fixed inset-0 z-[130] flex items-center justify-center bg-black/60 p-4 backdrop-blur-md"
            dir="rtl"
            onClick={onClose}
            role="presentation"
        >
            <div
                className="flex max-h-[85vh] w-full max-w-md flex-col overflow-hidden rounded-3xl border border-white/10 bg-[#0B1120] shadow-2xl shadow-black/50"
                onClick={(e) => e.stopPropagation()}
                role="dialog"
                aria-label="تعديل حدث السجل الزمني"
            >
                {/* Header */}
                <div className="sticky top-0 z-10 flex shrink-0 items-center justify-between gap-2 border-b border-white/10 bg-gradient-to-l from-slate-950/90 to-[#0B1120] p-3">
                    <button
                        type="button"
                        onClick={onClose}
                        className="rounded-lg border border-white/10 bg-white/[0.03] p-2 text-slate-300 transition-all hover:bg-white/[0.06] hover:text-white"
                        aria-label="إغلاق"
                    >
                        <X size={18} />
                    </button>
                    <h3 className="flex flex-row-reverse items-center gap-2 text-sm font-bold text-slate-100">
                        {getEventTypeIcon(eventType)}
                        تعديل حدث السجل
                    </h3>
                    <button
                        type="button"
                        onClick={onClose}
                        className="w-9 shrink-0 opacity-0"
                        aria-hidden="true"
                    >
                        <X size={18} />
                    </button>
                </div>

                {/* Content */}
                <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 pb-5 pt-4">
                    {/* Event Type */}
                    <div className="mb-4">
                        <label className="mb-2 block text-xs font-semibold text-slate-300">
                            نوع الحدث
                        </label>
                        <div className="grid grid-cols-2 gap-2">
                            {eventTypeOptions.map((option) => (
                                <button
                                    key={option.value}
                                    type="button"
                                    onClick={() => setEventType(option.value)}
                                    className={`flex items-center justify-center gap-2 rounded-xl border p-3 text-xs font-medium transition-all ${
                                        eventType === option.value
                                            ? 'border-blue-500/50 bg-blue-500/10 text-blue-200'
                                            : 'border-white/10 bg-white/[0.03] text-slate-300 hover:bg-white/[0.06]'
                                    }`}
                                >
                                    {option.icon}
                                    {option.label}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Title */}
                    <div className="mb-4">
                        <label className="mb-2 block text-xs font-semibold text-slate-300">
                            عنوان الحدث
                        </label>
                        <input
                            type="text"
                            value={title}
                            onChange={(e) => setTitle(e.target.value)}
                            className="w-full rounded-xl border border-white/10 bg-white/[0.03] px-4 py-3 text-sm text-white placeholder:text-slate-500 focus:border-blue-500/50 focus:outline-none focus:ring-1 focus:ring-blue-500/30"
                            placeholder="أدخل عنوان الحدث"
                            dir="rtl"
                        />
                    </div>

                    {/* Date */}
                    <div className="mb-4">
                        <label className="mb-2 flex items-center gap-2 text-xs font-semibold text-slate-300">
                            <Calendar size={14} />
                            تاريخ الحدث
                        </label>
                        <input
                            type="date"
                            value={eventDate}
                            onChange={(e) => setEventDate(e.target.value)}
                            className="w-full rounded-xl border border-white/10 bg-white/[0.03] px-4 py-3 text-sm text-white placeholder:text-slate-500 focus:border-blue-500/50 focus:outline-none focus:ring-1 focus:ring-blue-500/30"
                            dir="rtl"
                        />
                    </div>

                    {/* Description */}
                    <div className="mb-6">
                        <label className="mb-2 block text-xs font-semibold text-slate-300">
                            وصف الحدث
                        </label>
                        <textarea
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                            rows={4}
                            className="w-full rounded-xl border border-white/10 bg-white/[0.03] px-4 py-3 text-sm text-white placeholder:text-slate-500 focus:border-blue-500/50 focus:outline-none focus:ring-1 focus:ring-blue-500/30"
                            placeholder="أدخل وصفاً مفصلاً للحدث"
                            dir="rtl"
                        />
                    </div>

                    {/* Actions */}
                    <div className="flex flex-col gap-3">
                        <button
                            type="button"
                            onClick={handleSave}
                            className="w-full rounded-xl bg-gradient-to-l from-blue-600 to-blue-700 py-3.5 text-sm font-bold text-white shadow-lg shadow-blue-500/25 transition-all hover:from-blue-700 hover:to-blue-800"
                        >
                            حفظ التعديلات
                        </button>
                        
                        <button
                            type="button"
                            onClick={handleDelete}
                            className="w-full rounded-xl border border-rose-500/25 bg-rose-950/10 py-3 text-sm font-bold text-rose-200 transition-all hover:bg-rose-950/20"
                        >
                            حذف الحدث
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};