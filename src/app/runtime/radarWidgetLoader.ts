import type { ComponentProps, ComponentType } from 'react';

type EventFormModule = typeof import('@/app/components/lawyer/SmartLegalRadar/EventForm');
type CalendarGridModule = typeof import('@/app/components/lawyer/SmartLegalRadar/CalendarGrid');

type EventFormProps = ComponentProps<EventFormModule['EventForm']>;
type CalendarGridProps = ComponentProps<CalendarGridModule['CalendarGrid']>;

export type RadarEventFormComponent = ComponentType<EventFormProps>;
export type RadarCalendarGridComponent = ComponentType<CalendarGridProps>;

let eventFormModulePromise: Promise<EventFormModule> | null = null;
let calendarGridModulePromise: Promise<CalendarGridModule> | null = null;
let cachedEventForm: RadarEventFormComponent | null = null;
let cachedCalendarGrid: RadarCalendarGridComponent | null = null;

export function isRadarEventFormResolved(): boolean {
    return cachedEventForm !== null;
}

export function isRadarCalendarGridResolved(): boolean {
    return cachedCalendarGrid !== null;
}

export function getCachedRadarEventForm(): RadarEventFormComponent | null {
    return cachedEventForm;
}

export function getCachedRadarCalendarGrid(): RadarCalendarGridComponent | null {
    return cachedCalendarGrid;
}

export function resetRadarWidgetLoaderForTests(): void {
    eventFormModulePromise = null;
    calendarGridModulePromise = null;
    cachedEventForm = null;
    cachedCalendarGrid = null;
}

function ensureEventFormModule(): Promise<EventFormModule> {
    if (!eventFormModulePromise) {
        eventFormModulePromise = import('@/app/components/lawyer/SmartLegalRadar/EventForm').then((mod) => {
            if (mod?.EventForm) cachedEventForm = mod.EventForm;
            return mod;
        });
    }
    return eventFormModulePromise;
}

function ensureCalendarGridModule(): Promise<CalendarGridModule> {
    if (!calendarGridModulePromise) {
        calendarGridModulePromise = import('@/app/components/lawyer/SmartLegalRadar/CalendarGrid').then((mod) => {
            if (mod?.CalendarGrid) cachedCalendarGrid = mod.CalendarGrid;
            return mod;
        });
    }
    return calendarGridModulePromise;
}

export function loadRadarEventFormModule(): Promise<EventFormModule> {
    return ensureEventFormModule();
}

export function loadRadarCalendarGridModule(): Promise<CalendarGridModule> {
    return ensureCalendarGridModule();
}

export function prefetchRadarEventForm(): void {
    if (typeof window === 'undefined') return;
    void ensureEventFormModule();
    void import('@/app/services/calendar/calendarCloudLoader').then((m) => {
        m.prefetchCalendarCloudModule();
    });
}

export function prefetchRadarCalendarGrid(): void {
    if (typeof window === 'undefined') return;
    void ensureCalendarGridModule();
}

export function prefetchRadarWidgets(): void {
    if (typeof window === 'undefined') return;
    void ensureEventFormModule();
    void ensureCalendarGridModule();
}
