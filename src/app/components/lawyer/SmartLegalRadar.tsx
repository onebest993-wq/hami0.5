import React, { useState, useMemo, useCallback } from 'react';
import {
    Calendar, Plus, AlertTriangle, Bot, Loader2
} from 'lucide-react';
import { motion } from 'motion/react';
import { useCalendarData } from '@/app/components/lawyer/hooks/useCalendarData';
import { SmartToast } from '@/app/components/ui/SmartToast';
import { RadarHeader, MonthNav } from './SmartLegalRadar/RadarHeader';
import { CalendarGrid, EmptyState } from './SmartLegalRadar/CalendarGrid';
import { EventCard } from './SmartLegalRadar/EventCard';
import { EventForm } from './SmartLegalRadar/EventForm';
import { EMPTY_FORM, getDayName, todayYmd, timeValue } from './SmartLegalRadar/utils';
import type { EventFormData } from './SmartLegalRadar/utils';
import type { UnifiedEvent } from '@/app/components/lawyer/hooks/useCalendarData';

interface SmartLegalRadarProps {
    onBack: () => void;
    userId: string;
}

export const SmartLegalRadar: React.FC<SmartLegalRadarProps> = ({ onBack, userId }) => {
    const today = new Date();
    const [viewYear, setViewYear] = useState(today.getFullYear());
    const [viewMonth, setViewMonth] = useState(today.getMonth());
    const [selectedDate, setSelectedDate] = useState<string>(todayYmd());
    const [showForm, setShowForm] = useState(false);
    const [editingEvent, setEditingEvent] = useState<UnifiedEvent | null>(null);
    const [formData, setFormData] = useState<EventFormData>(EMPTY_FORM);
    const [saving, setSaving] = useState(false);
    const [showFullMonth, setShowFullMonth] = useState(false);

    const {
        allEvents,
        customEvents,
        getEventsForDate,
        getDatesWithEvents,
        addEvent,
        deleteEvent,
        updateEvent,
        loading,
        error: calendarError,
    } = useCalendarData(userId);

    const daysInMonth = useMemo(() => new Date(viewYear, viewMonth + 1, 0).getDate(), [viewYear, viewMonth]);
    const firstDayOfMonth = useMemo(() => new Date(viewYear, viewMonth, 1).getDay(), [viewYear, viewMonth]);
    const datesWithEvents = useMemo(() => getDatesWithEvents(viewYear, viewMonth), [getDatesWithEvents, viewYear, viewMonth]);
    const allEventsForMonth = useMemo(() => {
        const prefix = `${viewYear}-${String(viewMonth + 1).padStart(2, '0')}`;
        return allEvents.filter((e) => e.date.startsWith(prefix));
    }, [viewYear, viewMonth, allEvents]);
    const selectedEvents = useMemo(() => {
        if (!selectedDate) return [];
        const d = new Date(selectedDate + 'T12:00:00');
        if (isNaN(d.getTime())) return [];
        return getEventsForDate(d).sort((a, b) => timeValue(a.time) - timeValue(b.time));
    }, [getEventsForDate, selectedDate]);

    const prevMonth = useCallback(() => {
        if (viewMonth === 0) { setViewYear((y) => y - 1); setViewMonth(11); }
        else { setViewMonth((m) => m - 1); }
    }, [viewMonth]);

    const nextMonth = useCallback(() => {
        if (viewMonth === 11) { setViewYear((y) => y + 1); setViewMonth(0); }
        else { setViewMonth((m) => m + 1); }
    }, [viewMonth]);

    const goToToday = useCallback(() => {
        const now = new Date();
        setViewYear(now.getFullYear());
        setViewMonth(now.getMonth());
        setSelectedDate(todayYmd());
    }, []);

    const handleDateClick = useCallback((day: number) => {
        const y = viewYear;
        const m = String(viewMonth + 1).padStart(2, '0');
        const d = String(day).padStart(2, '0');
        setSelectedDate(`${y}-${m}-${d}`);
    }, [viewYear, viewMonth]);

    const openAddForm = useCallback(() => {
        setEditingEvent(null);
        setFormData({ ...EMPTY_FORM, date: selectedDate, time: '' });
        setShowForm(true);
    }, [selectedDate]);

    const openEditForm = useCallback((event: UnifiedEvent) => {
        setEditingEvent(event);
        setFormData({
            title: event.title,
            date: event.date,
            time: event.time || '',
            type: event.type,
            location: event.location || '',
            notes: event.notes || '',
            clientName: event.clientName || '',
            clientPhone: '',
        });
        setShowForm(true);
    }, []);

    const handleFormChange = useCallback((field: keyof EventFormData, value: string) => {
        setFormData((prev) => ({ ...prev, [field]: value }));
    }, []);

    const handleSave = useCallback(async () => {
        if (!formData.title.trim() || !formData.date) {
            SmartToast.warning('العنوان والتاريخ مطلوبان');
            return;
        }
        setSaving(true);
        try {
            if (editingEvent && editingEvent.source === 'calendar') {
                const calId = editingEvent.id.replace('cal_', '');
                const existing = customEvents.find((e) => e.id === calId);
                if (existing) {
                    await updateEvent({
                        ...existing,
                        title: formData.title.trim(),
                        date: formData.date,
                        time: formData.time || undefined,
                        type: formData.type,
                        location: formData.location.trim() || undefined,
                        notes: formData.notes.trim() || undefined,
                        clientName: formData.clientName.trim() || undefined,
                        clientPhone: formData.clientPhone.trim() || undefined,
                    });
                }
                SmartToast.success('تم تحديث الموعد');
            } else {
                await addEvent({
                    userId,
                    title: formData.title.trim(),
                    date: formData.date,
                    time: formData.time || undefined,
                    type: formData.type,
                    location: formData.location.trim() || undefined,
                    notes: formData.notes.trim() || undefined,
                    clientName: formData.clientName.trim() || undefined,
                    clientPhone: formData.clientPhone.trim() || undefined,
                });
                SmartToast.success('تم إضافة الموعد');
            }
            setShowForm(false);
            setEditingEvent(null);
        } catch {
            SmartToast.error('فشل حفظ الموعد');
        } finally {
            setSaving(false);
        }
    }, [formData, editingEvent, userId, addEvent, updateEvent, customEvents]);

    const handleDelete = useCallback(async (event: UnifiedEvent) => {
        if (event.source !== 'calendar') {
            SmartToast.info('يمكن حذف المواعيد المخصصة فقط');
            return;
        }
        setSaving(true);
        try {
            const calId = event.id.replace('cal_', '');
            await deleteEvent(calId);
            SmartToast.success('تم حذف الموعد');
            if (editingEvent?.id === event.id) {
                setShowForm(false);
                setEditingEvent(null);
            }
        } catch {
            SmartToast.error('فشل حذف الموعد');
        } finally {
            setSaving(false);
        }
    }, [deleteEvent, editingEvent]);

    const handleFormDelete = useCallback(() => {
        if (editingEvent) handleDelete(editingEvent);
    }, [editingEvent, handleDelete]);

    const conflictMessage = useMemo(() => {
        if (selectedEvents.length < 2) return null;
        const timed = selectedEvents.filter((e) => e.time);
        for (let i = 1; i < timed.length; i++) {
            const prev = timed[i - 1];
            const curr = timed[i];
            const pVal = timeValue(prev.time);
            const cVal = timeValue(curr.time);
            const gap = cVal - pVal;
            if (gap < 60 && gap >= 0 && prev.location && curr.location && prev.location !== curr.location) {
                return `تنبيه ذكي: تعارض زمني/مكاني محتمل بين "${prev.title}" و "${curr.title}". المسافة بين الموقعين لا تسمح بالوصول في الوقت المحدد.`;
            }
        }
        return null;
    }, [selectedEvents]);

    const aiBriefing = useMemo(() => {
        if (selectedEvents.length === 0) return null;
        const critical = selectedEvents.filter((e) => e.type === 'deadline' || e.type === 'hearing');
        const consultations = selectedEvents.filter((e) => e.type === 'consultation');
        const parts: string[] = [];
        parts.push(`لديك (${selectedEvents.length}) مواعيد`);
        if (critical.length > 0) {
            const names = critical.map((e) => `"${e.title}"`).join('، ');
            parts.push(`الجلسات المهمة: ${names}`);
        }
        if (consultations.length > 0) parts.push(`لديك ${consultations.length} استشارات`);
        if (conflictMessage) parts.push('لديك تعارض محتمل في المواعيد يتطلب تدخلك.');
        return parts.join('. ');
    }, [selectedEvents, conflictMessage]);

    if (loading) {
        return (
            <div className="flex flex-col h-full bg-[#0B1021]">
                <RadarHeader {...{onBack, viewYear, viewMonth, onPrevMonth: prevMonth, onNextMonth: nextMonth, onGoToToday: goToToday, showFullMonth, onToggleFullMonth: () => setShowFullMonth(!showFullMonth)}} />
                <div className="flex-1 flex items-center justify-center">
                    <Loader2 size={40} className="text-indigo-400 animate-spin" />
                </div>
            </div>
        );
    }

    return (
        <div className="flex flex-col h-full bg-[#0B1021] overflow-hidden">
            <RadarHeader
                onBack={onBack}
                viewYear={viewYear} viewMonth={viewMonth}
                onPrevMonth={prevMonth} onNextMonth={nextMonth}
                onGoToToday={goToToday}
                showFullMonth={showFullMonth}
                onToggleFullMonth={() => setShowFullMonth(!showFullMonth)}
            />

            <div className="flex-1 overflow-y-auto scrollbar-hide p-4 pb-32">
                {calendarError && (
                    <div className="mb-4 p-3 rounded-lg bg-rose-500/10 border border-rose-500/20 text-rose-300 text-sm">
                        {calendarError}
                    </div>
                )}

                <MonthNav
                    viewYear={viewYear} viewMonth={viewMonth}
                    onPrevMonth={prevMonth} onNextMonth={nextMonth}
                    onGoToToday={goToToday}
                    showFullMonth={showFullMonth}
                    onToggleFullMonth={() => setShowFullMonth(!showFullMonth)}
                />

                {showFullMonth && (
                    <CalendarGrid
                        viewYear={viewYear} viewMonth={viewMonth}
                        firstDayOfMonth={firstDayOfMonth} daysInMonth={daysInMonth}
                        selectedDate={selectedDate}
                        allEventsForMonth={allEventsForMonth}
                        onDateClick={handleDateClick}
                    />
                )}

                <div className="space-y-4">
                    <div className="flex items-center justify-between">
                        <h2 className="text-white font-bold flex items-center gap-2">
                            <Calendar size={16} className="text-indigo-400" />
                            {selectedDate ? (
                                <span>{getDayName(selectedDate)} — {selectedDate}</span>
                            ) : 'اختر تاريخاً'}
                        </h2>
                        <button type="button"
                            onClick={openAddForm}
                            className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-bold transition-all shadow-lg shadow-indigo-900/30"
                        >
                            <Plus size={16} />
                            إضافة موعد
                        </button>
                    </div>

                    {selectedEvents.length > 0 && aiBriefing && (
                        <motion.div
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="bg-gradient-to-r from-indigo-900/40 to-slate-900 border border-indigo-500/30 rounded-xl p-5 flex gap-4 items-start shadow-lg relative overflow-hidden"
                        >
                            <div className="absolute top-0 right-0 w-20 h-20 bg-indigo-500/20 blur-2xl rounded-full -mr-10 -mt-10 pointer-events-none" />
                            <div className="w-10 h-10 rounded-full bg-indigo-500/20 flex items-center justify-center shrink-0 border border-indigo-500/30 mt-1">
                                <Bot size={20} className="text-indigo-400" />
                            </div>
                            <div className="flex-1">
                                <h3 className="text-indigo-300 font-bold text-sm mb-1">تحليل الذكاء الاصطناعي لليوم</h3>
                                <p className="text-white/90 text-sm leading-relaxed">{aiBriefing}</p>
                            </div>
                        </motion.div>
                    )}

                    {conflictMessage && (
                        <div className="bg-rose-950/30 border border-rose-500/40 text-rose-300 text-sm p-3 rounded-lg flex items-start gap-2">
                            <AlertTriangle size={16} className="shrink-0 mt-0.5" />
                            <span>{conflictMessage}</span>
                        </div>
                    )}

                    {selectedEvents.length === 0 ? (
                        <EmptyState />
                    ) : (
                        <div className="space-y-3">
                            {selectedEvents.map((event, idx) => (
                                <EventCard
                                    key={event.id}
                                    event={event}
                                    index={idx}
                                    onEdit={openEditForm}
                                    onDelete={handleDelete}
                                />
                            ))}
                        </div>
                    )}
                </div>
            </div>

            <EventForm
                show={showForm}
                onClose={() => { if (!saving) { setShowForm(false); setEditingEvent(null); } }}
                formData={formData}
                editingEvent={editingEvent}
                saving={saving}
                onFormChange={handleFormChange}
                onSave={handleSave}
                onDelete={handleFormDelete}
            />
        </div>
    );
};
