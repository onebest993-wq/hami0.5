import React, { useState, useMemo, useCallback, useEffect } from 'react';
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
import { CALENDAR_REQUEST_SYNC_EVENT } from '@/app/services/calendarBridge.types';
import {
    RADAR_PAGE,
    RADAR_SCROLL,
    RADAR_BTN_GOLD,
    RADAR_GLASS_PANEL,
    RADAR_ICON_GOLD,
    RADAR_ICON_NAVY,
} from './SmartLegalRadar/radarTheme';

interface SmartLegalRadarProps {
    onBack: () => void;
    userId: string;
    initialDate?: string;
    initialEventId?: string;
    /** يفتح المصدر الأصلي لموعد مربوط (إضبارة/ملاحظة/مهمة) */
    onOpenSource?: (sourceModule: string, sourceEntityId: string) => void;
}

export const SmartLegalRadar: React.FC<SmartLegalRadarProps> = ({
    onBack,
    userId,
    initialDate,
    initialEventId,
    onOpenSource,
}) => {
    const today = new Date();
    const [viewYear, setViewYear] = useState(today.getFullYear());
    const [viewMonth, setViewMonth] = useState(today.getMonth());
    const [selectedDate, setSelectedDate] = useState<string>(todayYmd());
    const [showForm, setShowForm] = useState(false);
    const [editingEvent, setEditingEvent] = useState<UnifiedEvent | null>(null);
    const [formData, setFormData] = useState<EventFormData>(EMPTY_FORM);
    const [saving, setSaving] = useState(false);
    const [showFullMonth, setShowFullMonth] = useState(false);
    const [highlightEventId, setHighlightEventId] = useState<string | undefined>(initialEventId);

    useEffect(() => {
        if (!initialDate) return;
        const d = new Date(`${initialDate}T12:00:00`);
        if (Number.isNaN(d.getTime())) return;
        setViewYear(d.getFullYear());
        setViewMonth(d.getMonth());
        setSelectedDate(initialDate);
    }, [initialDate]);

    useEffect(() => {
        if (!initialEventId) return;
        setHighlightEventId(initialEventId);
        const t = window.setTimeout(() => setHighlightEventId(undefined), 8000);
        return () => window.clearTimeout(t);
    }, [initialEventId]);

    useEffect(() => {
        try {
            window.dispatchEvent(new CustomEvent(CALENDAR_REQUEST_SYNC_EVENT));
        } catch {
            /* ignore */
        }
    }, [userId]);

    const {
        allEvents,
        customEvents,
        effectiveUserId,
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
        if (event.bridge?.sourceEventId?.startsWith('field_')) {
            SmartToast.info('هذا التاريخ مكتشف تلقائياً من إضبارته — حرّره من المصدر الأصلي');
            return;
        }
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
                    userId: effectiveUserId,
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
    }, [formData, editingEvent, effectiveUserId, addEvent, updateEvent, customEvents]);

    const handleDelete = useCallback(async (event: UnifiedEvent) => {
        if (event.bridge?.sourceEventId?.startsWith('field_')) {
            SmartToast.info('هذا التاريخ مكتشف تلقائياً من إضبارته — حرّره أو احذفه من المصدر الأصلي');
            return;
        }
        if (event.isBridged) {
            SmartToast.info('هذا الموعد مربوط بإضبارة — احذفه من داخل الإضبارة (الدعوى/التنفيذ)');
            return;
        }
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
            <div className={RADAR_PAGE}>
                <RadarHeader {...{onBack, viewYear, viewMonth, onPrevMonth: prevMonth, onNextMonth: nextMonth, onGoToToday: goToToday, showFullMonth, onToggleFullMonth: () => setShowFullMonth(!showFullMonth)}} />
                <div className="flex-1 flex items-center justify-center">
                    <Loader2 size={40} className={`${RADAR_ICON_GOLD} animate-spin`} />
                </div>
            </div>
        );
    }

    return (
        <div className={RADAR_PAGE}>
            {/* خلفية نيلي + لمسات رصاصي وذهبي */}
            <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden>
                <div className="absolute -top-24 -right-16 w-72 h-72 rounded-full bg-[#1e3a5f]/25 blur-3xl" />
                <div className="absolute top-1/3 -left-20 w-56 h-56 rounded-full bg-[#64748b]/10 blur-3xl" />
                <div className="absolute bottom-32 right-1/4 w-40 h-40 rounded-full bg-[#C9A227]/8 blur-3xl" />
            </div>

            <RadarHeader
                onBack={onBack}
                viewYear={viewYear} viewMonth={viewMonth}
                onPrevMonth={prevMonth} onNextMonth={nextMonth}
                onGoToToday={goToToday}
                showFullMonth={showFullMonth}
                onToggleFullMonth={() => setShowFullMonth(!showFullMonth)}
            />

            <div className={RADAR_SCROLL}>
                {calendarError && (
                    <div className="mb-4 p-3 rounded-xl bg-rose-500/10 border border-rose-500/25 text-rose-300 text-sm">
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
                    <div className="flex items-center justify-between gap-3">
                        <h2 className="text-white/95 font-bold flex items-center gap-2 text-sm sm:text-base">
                            <Calendar size={16} className={RADAR_ICON_GOLD} />
                            {selectedDate ? (
                                <span>{getDayName(selectedDate)} — {selectedDate}</span>
                            ) : (
                                'اختر تاريخاً'
                            )}
                        </h2>
                        <button
                            type="button"
                            onClick={openAddForm}
                            className={RADAR_BTN_GOLD}
                        >
                            <Plus size={16} />
                            إضافة موعد
                        </button>
                    </div>

                    {selectedEvents.length > 0 && aiBriefing && (
                        <motion.div
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            className={`${RADAR_GLASS_PANEL} p-4 flex gap-4 items-start relative overflow-hidden border-[#5b8fd4]/20`}
                        >
                            <div className="absolute top-0 right-0 w-24 h-24 bg-[#C9A227]/10 blur-2xl rounded-full -mr-12 -mt-12 pointer-events-none" />
                            <div className="w-10 h-10 rounded-xl bg-[#1e3a5f]/50 flex items-center justify-center shrink-0 border border-[#5b8fd4]/25">
                                <Bot size={20} className={RADAR_ICON_NAVY} />
                            </div>
                            <div className="flex-1">
                                <h3 className="text-[#E6C673] font-bold text-sm mb-1">ملخص المواعيد لليوم</h3>
                                <p className="text-slate-300 text-sm leading-relaxed">{aiBriefing}</p>
                            </div>
                        </motion.div>
                    )}

                    {conflictMessage && (
                        <div className="bg-rose-950/25 border border-rose-500/35 text-rose-300 text-sm p-3 rounded-xl flex items-start gap-2">
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
                                    highlighted={highlightEventId != null && String(event.id) === String(highlightEventId)}
                                    onEdit={openEditForm}
                                    onDelete={handleDelete}
                                    onOpenSource={onOpenSource ? (ev) => {
                                        const mod = ev.bridge?.sourceModule;
                                        const entId = ev.bridge?.sourceEntityId;
                                        if (mod && entId) onOpenSource(mod, entId);
                                    } : undefined}
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
