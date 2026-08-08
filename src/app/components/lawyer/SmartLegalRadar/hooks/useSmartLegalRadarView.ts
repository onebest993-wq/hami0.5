import { useState, useCallback, useEffect } from 'react';
import { todayYmd } from '@/app/components/lawyer/SmartLegalRadar/utils';
import { prefetchRadarCalendarGrid } from '@/app/runtime/radarWidgetLoader';

export function useSmartLegalRadarView(initialDate?: string) {
    const today = new Date();
    const [viewYear, setViewYear] = useState(today.getFullYear());
    const [viewMonth, setViewMonth] = useState(today.getMonth());
    const [selectedDate, setSelectedDate] = useState<string>(todayYmd());
    const [showFullMonth, setShowFullMonth] = useState(false);

    useEffect(() => {
        if (!initialDate) return;
        const d = new Date(`${initialDate}T12:00:00`);
        if (Number.isNaN(d.getTime())) return;
        setViewYear(d.getFullYear());
        setViewMonth(d.getMonth());
        setSelectedDate(initialDate);
    }, [initialDate]);

    const prevMonth = useCallback(() => {
        if (viewMonth === 0) {
            setViewYear((y) => y - 1);
            setViewMonth(11);
        } else {
            setViewMonth((m) => m - 1);
        }
    }, [viewMonth]);

    const nextMonth = useCallback(() => {
        if (viewMonth === 11) {
            setViewYear((y) => y + 1);
            setViewMonth(0);
        } else {
            setViewMonth((m) => m + 1);
        }
    }, [viewMonth]);

    const goToToday = useCallback(() => {
        const now = new Date();
        setViewYear(now.getFullYear());
        setViewMonth(now.getMonth());
        setSelectedDate(todayYmd());
    }, []);

    const handleDateClick = useCallback(
        (day: number) => {
            const m = String(viewMonth + 1).padStart(2, '0');
            const d = String(day).padStart(2, '0');
            setSelectedDate(`${viewYear}-${m}-${d}`);
        },
        [viewYear, viewMonth],
    );

    const toggleFullMonth = useCallback(() => {
        prefetchRadarCalendarGrid();
        setShowFullMonth((v) => !v);
    }, []);

    const focusDate = useCallback((dateStr: string) => {
        const d = new Date(`${dateStr}T12:00:00`);
        if (Number.isNaN(d.getTime())) return;
        setViewYear(d.getFullYear());
        setViewMonth(d.getMonth());
        setSelectedDate(dateStr);
    }, []);

    return {
        viewYear,
        viewMonth,
        selectedDate,
        showFullMonth,
        prevMonth,
        nextMonth,
        goToToday,
        handleDateClick,
        toggleFullMonth,
        focusDate,
    };
}
