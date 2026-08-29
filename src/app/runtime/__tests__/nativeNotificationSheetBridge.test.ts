import { beforeEach, describe, expect, it, vi } from 'vitest';

import {
    applyNativeNotificationSheetSettingsPatch,
    buildNativeNotificationSheetPayload,
    isNativeNotificationSheetEnabled,
    primeNativeNotificationSheetData,
} from '@/app/runtime/nativeNotificationSheetBridge';
import { getLawyerSettingsSnapshot } from '@/app/services/settings/settingsSnapshot';

vi.mock('@/app/stores/notificationStore', () => {
    const state = {
        notifications: [
            {
                id: 'n-forum',
                title: 'سؤال',
                message: 'رد جديد',
                type: 'forum_reply',
                isRead: false,
                createdAt: '2026-08-10T10:00:00.000Z',
                actionPayload: {},
            },
            {
                id: 'n-system',
                title: 'نظام',
                message: 'تحديث',
                type: 'system_alert',
                isRead: true,
                createdAt: '2026-08-10T09:00:00.000Z',
                actionPayload: {},
            },
        ],
        hydrateFromLocalPeek: vi.fn(),
    };
    const useNotificationStore = (selector: (s: typeof state) => unknown) => selector(state);
    useNotificationStore.getState = () => state;
    return { useNotificationStore };
});

vi.mock('@/app/components/lawyer/NotificationPanel/utils/notificationFilters', () => ({
    isForumNotification: (n: { type: string }) => n.type.startsWith('forum'),
    isSystemNotification: (n: { type: string }) => n.type.startsWith('system'),
}));

vi.mock('@/app/context/lawyerSettings/lawyerSettingsPersistence', () => ({
    applyLawyerSettingsPatchExternal: vi.fn((mutator: (prev: unknown) => unknown) => mutator({})),
}));

vi.mock('@/app/hooks/lawyerDashboard/notificationIntentWarm', () => ({
    warmNotificationsOnOpen: vi.fn(),
}));

vi.mock('@/app/services/SecureStoreService', () => ({
    default: {
        getItem: vi.fn(() => Promise.resolve(null)),
        getItemSync: vi.fn(() => null),
        setItem: vi.fn(() => Promise.resolve()),
        setItemSync: vi.fn(),
    },
}));

vi.mock('@/app/services/settings/settingsSnapshot', () => {
    const channel = { enabled: true, sound: true, push: true, inApp: true };
    return {
        getLawyerSettingsSnapshot: () => ({
            notifications: {
                masterEnabled: true,
                soundMaster: true,
                vibrateMaster: true,
                sessionMutedUntil: null,
                quietHours: { enabled: false, start: '22:00', end: '07:00' },
                channels: {
                    lawsuits: channel,
                    execution: channel,
                    calendar: channel,
                    community: channel,
                    financial: channel,
                    secretary: channel,
                },
            },
        }),
    };
});

describe('nativeNotificationSheetBridge', () => {
    beforeEach(() => {
        vi.unstubAllEnvs();
    });

    it('isNativeNotificationSheetEnabled يقرأ VITE_NATIVE_NOTIFICATION_SHEET', () => {
        vi.stubEnv('VITE_NATIVE_NOTIFICATION_SHEET', 'true');
        expect(isNativeNotificationSheetEnabled()).toBe(true);
        vi.stubEnv('VITE_NATIVE_NOTIFICATION_SHEET', 'false');
        expect(isNativeNotificationSheetEnabled()).toBe(false);
    });

    it('buildNativeNotificationSheetPayload يبني عدّادات وتسميات القنوات', () => {
        const payload = buildNativeNotificationSheetPayload('lawyer-1');
        expect(payload).not.toBeNull();
        expect(payload?.forumCount).toBe(1);
        expect(payload?.systemCount).toBe(1);
        expect(payload?.unreadCount).toBe(1);
        expect(payload?.channelLabels?.community).toBeTruthy();
        expect(payload?.channelLabels?.secretary).toBeTruthy();
    });

    it('buildNativeNotificationSheetPayload يرفض userId فارغ', () => {
        expect(buildNativeNotificationSheetPayload(null)).toBeNull();
        expect(buildNativeNotificationSheetPayload('   ')).toBeNull();
    });

    it('primeNativeNotificationSheetData يسخّن المخزون المحلي', async () => {
        const { warmNotificationsOnOpen } = await import(
            '@/app/hooks/lawyerDashboard/notificationIntentWarm'
        );
        const { useNotificationStore } = await import('@/app/stores/notificationStore');
        await primeNativeNotificationSheetData('lawyer-1');
        expect(warmNotificationsOnOpen).toHaveBeenCalledWith('lawyer-1');
        expect(useNotificationStore.getState().hydrateFromLocalPeek).toHaveBeenCalledWith('lawyer-1');
    });

    it('applyNativeNotificationSheetSettingsPatch يمرّر كتم الجلسة', async () => {
        const { applyLawyerSettingsPatchExternal } = await import(
            '@/app/context/lawyerSettings/lawyerSettingsPersistence'
        );
        const base = getLawyerSettingsSnapshot();
        vi.mocked(applyLawyerSettingsPatchExternal).mockImplementation((mutator) =>
            mutator(base),
        );

        applyNativeNotificationSheetSettingsPatch({ sessionMuteMinutes: 30 });

        expect(applyLawyerSettingsPatchExternal).toHaveBeenCalled();
        const next = vi.mocked(applyLawyerSettingsPatchExternal).mock.results[0]?.value as {
            notifications: { sessionMutedUntil: string | null };
        };
        expect(next.notifications.sessionMutedUntil).toBeTruthy();
    });
});
