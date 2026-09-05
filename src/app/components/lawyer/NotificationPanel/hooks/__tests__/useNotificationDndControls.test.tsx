import React from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { act, renderHook } from '@testing-library/react';
import { LAWYER_SETTINGS_V2_DEFAULTS } from '@/app/services/settings/defaults';
import { publishLawyerSettingsLive } from '@/app/services/settings/settingsSnapshot';
import { LawyerSettingsBootProvider } from '@/app/context/lawyerSettings/LawyerSettingsBootProvider';
import { useNotificationDndControls } from '@/app/components/lawyer/NotificationPanel/hooks/useNotificationDndControls';

vi.mock('@/app/infrastructure/persistence/LocalStorageRepository', () => ({
    persistenceRepository: {
        load: vi.fn(),
        save: vi.fn(),
        flushPending: vi.fn(),
    },
}));

vi.mock('@/app/services/notifications/notificationArrivalSound', () => ({
    primeNotificationArrivalAudio: () => Promise.resolve(),
}));

vi.mock('@/app/services/calendar/calendarReminderAlarmSound', () => ({
    stopHamiLegalReminderAlarm: () => undefined,
}));

function wrapper({ children }: { children: React.ReactNode }) {
    return <LawyerSettingsBootProvider>{children}</LawyerSettingsBootProvider>;
}

describe('useNotificationDndControls تحت BootProvider', () => {
    afterEach(() => {
        act(() => {
            publishLawyerSettingsLive(LAWYER_SETTINGS_V2_DEFAULTS);
        });
    });

    it('تفعيل هدوء يومي يُحفظ رغم أن patchSettings في الإقلاع فارغ', () => {
        act(() => {
            publishLawyerSettingsLive(LAWYER_SETTINGS_V2_DEFAULTS);
        });
        const { result } = renderHook(() => useNotificationDndControls(), { wrapper });
        expect(result.current.notifications.quietHours.enabled).toBe(false);

        act(() => {
            result.current.patchNotifications({
                quietHours: { ...result.current.notifications.quietHours, enabled: true },
            });
        });

        expect(result.current.notifications.quietHours.enabled).toBe(true);
        expect(result.current.notifications.quietHours.start).toBe('22:00');
        expect(result.current.notifications.quietHours.end).toBe('07:00');
    });
});
