import { describe, expect, it } from 'vitest';
import { isFcmServerConfigured, resetFcmServerCacheForTests } from '@/app/services/notifications/fcm/fcmServerSend.server';
import { HAMI_ARRIVAL_SOUND_RAW, HAMI_LEGAL_ALARM_SOUND_RAW } from '@/app/services/notifications/native/hamiNativeSound';

describe('fcmServerSend', () => {
    it('غير مُضبط بدون FCM_SERVICE_ACCOUNT_JSON', () => {
        const prev = process.env.FCM_SERVICE_ACCOUNT_JSON;
        delete process.env.FCM_SERVICE_ACCOUNT_JSON;
        resetFcmServerCacheForTests();
        expect(isFcmServerConfigured()).toBe(false);
        process.env.FCM_SERVICE_ACCOUNT_JSON = prev;
    });

    it('مُضبط مع JSON صالح', () => {
        const prev = process.env.FCM_SERVICE_ACCOUNT_JSON;
        process.env.FCM_SERVICE_ACCOUNT_JSON = JSON.stringify({
            project_id: 'hami-test',
            client_email: 'fcm@hami-test.iam.gserviceaccount.com',
            private_key: '-----BEGIN PRIVATE KEY-----\nMIIB\n-----END PRIVATE KEY-----\n',
        });
        resetFcmServerCacheForTests();
        expect(isFcmServerConfigured()).toBe(true);
        process.env.FCM_SERVICE_ACCOUNT_JSON = prev;
    });
});

describe('hamiNativeSound', () => {
    it('يستخدم اسم raw بدون امتداد وملف wav للقناة', () => {
        expect(HAMI_ARRIVAL_SOUND_RAW).toBe('hami_arrival');
        expect(HAMI_LEGAL_ALARM_SOUND_RAW).toBe('hami_legal_alarm');
    });
});
