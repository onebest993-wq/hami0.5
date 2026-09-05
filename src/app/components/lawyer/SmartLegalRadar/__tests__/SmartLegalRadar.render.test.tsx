import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { act, render, screen } from '@testing-library/react';
import { SmartLegalRadar } from '@/app/components/lawyer/SmartLegalRadar';
import { RadarErrorBoundary } from '@/app/components/lawyer/SmartLegalRadar/RadarErrorBoundary';
import {
    resetCalendarEventsCacheForTests,
    setCachedCalendarEvents,
} from '@/app/services/calendar/calendarEventsCache';
import { resetCalendarShellSessionForTests } from '@/app/services/calendar/calendarShellSession';
import type { CalendarEvent } from '@/app/services/cloud/lawyerCalendarTypes';

vi.mock('@/app/services/calendar/calendarCloudRuntime', () => ({
    fetchCalendarEvents: vi.fn(async () => []),
    saveCalendarEvent: vi.fn(),
    updateCalendarEvent: vi.fn(),
    deleteCalendarEvent: vi.fn(),
    prefetchCalendarCloudModule: vi.fn(),
}));

vi.mock('@/app/services/SecureStoreService', () => ({
    default: {
        getItemSync: () => null,
        setItemSync: () => true,
        isUnreadSync: () => false,
        getItem: async () => null,
        ensurePersistedReady: () => Promise.resolve(),
    },
}));

vi.mock('@/app/services/calendar/calendarEventsWarm', () => ({
    awaitCalendarWarmIfInflight: vi.fn(() => Promise.resolve()),
}));

vi.mock('@/app/observability/sentryClient', () => ({
    sentryCaptureException: vi.fn(),
}));

describe('SmartLegalRadar — طلاء أولي', () => {
    beforeEach(() => {
        localStorage.clear();
        resetCalendarEventsCacheForTests();
        resetCalendarShellSessionForTests();
    });

    it('يرسم الرادار الحي بدل شاشة الخطأ', async () => {
        await act(async () => {
            render(<SmartLegalRadar onBack={() => undefined} userId="lawyer-radar-1" />);
        });
        expect(screen.getByTestId('smart-legal-radar')).toBeInTheDocument();
        expect(screen.getByTestId('radar-back')).toBeInTheDocument();
        expect(screen.getByTestId('radar-week-strip')).toBeInTheDocument();
        expect(screen.queryByTestId('radar-error-fallback')).not.toBeInTheDocument();
    });

    it('لا يسقط عند صف مخزّن بلا تاريخ', async () => {
        const spy = vi.spyOn(console, 'error').mockImplementation(() => undefined);
        setCachedCalendarEvents('lawyer-radar-1', [
            {
                id: 'bad',
                userId: 'lawyer-radar-1',
                title: 'فاسد',
            } as CalendarEvent,
            {
                id: 'ok',
                userId: 'lawyer-radar-1',
                title: 'جلسة',
                date: '2026-08-30',
                type: 'custom',
                createdAt: '2026-01-01T00:00:00.000Z',
                updatedAt: '2026-01-01T00:00:00.000Z',
            },
        ]);
        await act(async () => {
            render(
                <RadarErrorBoundary onBack={() => undefined}>
                    <SmartLegalRadar onBack={() => undefined} userId="lawyer-radar-1" />
                </RadarErrorBoundary>,
            );
        });
        expect(screen.getByTestId('smart-legal-radar')).toBeInTheDocument();
        expect(screen.queryByTestId('radar-error-fallback')).not.toBeInTheDocument();
        spy.mockRestore();
    });
});
