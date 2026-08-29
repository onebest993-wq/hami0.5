import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
    consumePendingOsNotifyIntent,
    consumePendingOsNotifyResolution,
    decodeOsNotifyQueryPayload,
    extractOsNotificationTapData,
    resolveOsNotificationTap,
    resolveOsNotificationTapIntent,
    stashPendingOsNotifyIntent,
    HAMI_OS_NOTIFY_PENDING_KEY,
    HAMI_OS_NOTIFICATION_OPEN_PANEL_EVENT,
} from '@/app/services/notifications/notificationOsTapRouting';

describe('notificationOsTapRouting', () => {
    beforeEach(() => {
        sessionStorage.clear();
    });

    it('يستخرج extra من إشعار Capacitor', () => {
        expect(
            extractOsNotificationTapData({
                id: 1,
                title: 'تذكير',
                extra: { type: 'calendar-reminder', eventId: 'ev-9' },
            }),
        ).toEqual({ type: 'calendar-reminder', eventId: 'ev-9' });
    });

    it('يوجّه تذكير التقويم إلى schedule مع eventId', () => {
        expect(
            resolveOsNotificationTapIntent({
                extra: { type: 'calendar-reminder', eventId: 'ev-1', evil: '<script>' },
            }),
        ).toEqual({ path: 'schedule', payload: { eventId: 'ev-1' } });
        expect(
            resolveOsNotificationTap({
                extra: { type: 'calendar-reminder', eventId: 'ev-1' },
            }),
        ).toEqual({
            navigate: { path: 'schedule', payload: { eventId: 'ev-1' } },
            openPanel: false,
            focusNotificationId: null,
        });
    });

    it('يوجّه مسار path صريحاً ضمن allowlist فقط', () => {
        expect(resolveOsNotificationTapIntent({ data: { path: 'community', postId: 'p1' } })).toEqual(
            {
                path: 'community',
                payload: { postId: 'p1' },
            },
        );
        expect(resolveOsNotificationTapIntent({ data: { path: 'evil' } })).toBeNull();
    });

    it('يوجّه منتدى forum و execution/lawsuit', () => {
        expect(resolveOsNotificationTapIntent({ data: { type: 'forum', postId: 'p9' } })).toEqual({
            path: 'community',
            payload: { postId: 'p9', type: 'forum' },
        });
        expect(resolveOsNotificationTapIntent({ data: { type: 'execution', caseNo: '1/ك/2024' } })).toEqual({
            path: 'execution_home',
            payload: { type: 'execution', caseNo: '1/ك/2024' },
        });
        expect(resolveOsNotificationTapIntent({ data: { type: 'lawsuit', caseNo: '2/ب/2024' } })).toEqual({
            path: 'lawsuit_home',
            payload: { type: 'lawsuit', caseNo: '2/ب/2024' },
        });
    });

    it('يرفض حمولة بلا وجهة آمنة للتنقّل ويفتح اللوحة', () => {
        expect(resolveOsNotificationTapIntent({ title: 'عام' })).toBeNull();
        expect(resolveOsNotificationTap({ title: 'عام' })).toEqual({
            navigate: null,
            openPanel: true,
            focusNotificationId: null,
        });
    });

    it('يفتح اللوحة مع تركيز عند notificationId بلا deep-link', () => {
        expect(
            resolveOsNotificationTap({
                data: { notificationId: 'notif-42', title: 'تنبيه نظام' },
            }),
        ).toEqual({
            navigate: null,
            openPanel: true,
            focusNotificationId: 'notif-42',
        });
    });

    it('path=notifications يفتح اللوحة بلا تنقّل ميزة', () => {
        expect(
            resolveOsNotificationTap({
                data: { path: 'notifications', notificationId: 'n-9' },
            }),
        ).toEqual({
            navigate: null,
            openPanel: true,
            focusNotificationId: 'n-9',
        });
    });

    it('لا يفتح اللوحة لمعاينة نظام os-preview', () => {
        expect(resolveOsNotificationTap({ extra: { type: 'os-preview' } })).toEqual({
            navigate: null,
            openPanel: false,
            focusNotificationId: null,
        });
    });

    it('يخزّن ويستهلك intent معلّق من sessionStorage', () => {
        stashPendingOsNotifyIntent({
            extra: { type: 'calendar-reminder', eventId: 'ev-2' },
        });
        expect(sessionStorage.getItem(HAMI_OS_NOTIFY_PENDING_KEY)).toBeTruthy();
        expect(consumePendingOsNotifyIntent()).toEqual({
            path: 'schedule',
            payload: { eventId: 'ev-2' },
        });
        expect(consumePendingOsNotifyIntent()).toBeNull();
    });

    it('يخزّن فتح اللوحة معلّقاً مع focus', () => {
        stashPendingOsNotifyIntent({
            data: { notificationId: 'pending-1', channel: 'secretary' },
        });
        expect(consumePendingOsNotifyResolution()).toEqual({
            navigate: null,
            openPanel: true,
            focusNotificationId: 'pending-1',
        });
    });

    it('bind يُستدعى عبر الحدث الأصلي', async () => {
        const onNavigate = vi.fn();
        const opened = vi.fn();
        window.addEventListener(HAMI_OS_NOTIFICATION_OPEN_PANEL_EVENT, opened);

        const { bindNotificationOsTapBridge } = await import(
            '@/app/services/notifications/bindNotificationOsTapBridge'
        );
        const unbind = bindNotificationOsTapBridge(onNavigate);
        window.dispatchEvent(
            new CustomEvent('hami:native-notification-received', {
                detail: { extra: { type: 'calendar-reminder', eventId: 'ev-bridge' } },
            }),
        );
        expect(onNavigate).toHaveBeenCalledWith('schedule', { eventId: 'ev-bridge' });
        expect(opened).not.toHaveBeenCalled();
        expect(sessionStorage.getItem('hami:calendar-alarm-pending:v1')).toBe('ev-bridge');

        window.dispatchEvent(
            new CustomEvent('hami:native-notification-received', {
                detail: { data: { notificationId: 'n-bridge', title: 'نظام' } },
            }),
        );
        expect(opened).toHaveBeenCalled();
        expect(sessionStorage.getItem('hami:notification-focus-id:v1')).toBe('n-bridge');

        unbind();
        window.removeEventListener(HAMI_OS_NOTIFICATION_OPEN_PANEL_EVENT, opened);
    });

    it('يرفض معرّف تركيز يكسر مُحدِّد CSS واستعلام JSON المتضخّم', () => {
        expect(
            resolveOsNotificationTap({
                data: { notificationId: 'foo"][data-x="bar', title: 'نظام' },
            }).focusNotificationId,
        ).toBeNull();
        expect(decodeOsNotifyQueryPayload('[' + 'A'.repeat(5000) + ']')).toBeNull();
        expect(decodeOsNotifyQueryPayload(encodeURIComponent('[]'))).toBeNull();
        expect(decodeOsNotifyQueryPayload(encodeURIComponent('{"path":"community","postId":"p1"}'))).toEqual(
            { path: 'community', postId: 'p1' },
        );
    });
});
