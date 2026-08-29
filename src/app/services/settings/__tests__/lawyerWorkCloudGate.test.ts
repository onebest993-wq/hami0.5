import { afterEach, describe, expect, it, vi } from 'vitest';
import { LAWYER_SETTINGS_V2_DEFAULTS } from '../defaults';
import { isLawyerWorkCloudLive, isWorkLocalKvMaterial } from '../lawyerWorkCloudGate';

describe('isWorkLocalKvMaterial', () => {
    it('يصنّف أقسام العمل المحلية دون الملف المهني والمتابعة', () => {
        expect(isWorkLocalKvMaterial('calendar:u1:e1')).toBe(true);
        expect(isWorkLocalKvMaterial('transactions:u1:t1')).toBe(true);
        expect(isWorkLocalKvMaterial('transactionsThreading:u1:state')).toBe(true);
        expect(isWorkLocalKvMaterial('vault:docs:u1:d1')).toBe(true);
        expect(isWorkLocalKvMaterial('repository:docs:d1')).toBe(true);
        expect(isWorkLocalKvMaterial('user:u1:cases:c1')).toBe(true);
        expect(isWorkLocalKvMaterial('user:u1:notes')).toBe(true);
        expect(isWorkLocalKvMaterial('user:u1:deadlines:d1')).toBe(true);
        expect(isWorkLocalKvMaterial('user:u1:')).toBe(true);
        expect(isWorkLocalKvMaterial('user:u1:cases')).toBe(true);
        expect(isWorkLocalKvMaterial('profile:u1')).toBe(false);
        expect(isWorkLocalKvMaterial('user:u1:profile')).toBe(false);
        expect(isWorkLocalKvMaterial('follow:u1:u2')).toBe(false);
        expect(isWorkLocalKvMaterial('followers:u1:u2')).toBe(false);
        expect(isWorkLocalKvMaterial('notifications:u1')).toBe(false);
    });
});

describe('isLawyerWorkCloudLive', () => {
    afterEach(() => {
        vi.unstubAllEnvs();
    });

    it('يبقى مغلقاً بلا بيئة المزامنة حتى لو الإعدادات تسمح', () => {
        vi.stubEnv('VITE_ENABLE_CLOUD_SYNC', 'false');
        const settings = {
            ...LAWYER_SETTINGS_V2_DEFAULTS,
            data: { ...LAWYER_SETTINGS_V2_DEFAULTS.data, cloudSync: true },
        };
        expect(isLawyerWorkCloudLive(settings)).toBe(false);
    });

    it('يبقى مغلقاً عندما المزامنة في الإعدادات مطفأة', () => {
        vi.stubEnv('VITE_ENABLE_CLOUD_SYNC', 'true');
        expect(isLawyerWorkCloudLive(LAWYER_SETTINGS_V2_DEFAULTS)).toBe(false);
    });

    it('يفتح فقط مع البيئة والإعدادات ودون العزل المحلي', () => {
        vi.stubEnv('VITE_ENABLE_CLOUD_SYNC', 'true');
        const settings = {
            ...LAWYER_SETTINGS_V2_DEFAULTS,
            security: { ...LAWYER_SETTINGS_V2_DEFAULTS.security, localOnlyMode: false },
            data: { ...LAWYER_SETTINGS_V2_DEFAULTS.data, cloudSync: true },
        };
        expect(isLawyerWorkCloudLive(settings)).toBe(true);
    });

    it('يرفض العزل المحلي حتى مع المزامنة', () => {
        vi.stubEnv('VITE_ENABLE_CLOUD_SYNC', 'true');
        const settings = {
            ...LAWYER_SETTINGS_V2_DEFAULTS,
            security: { ...LAWYER_SETTINGS_V2_DEFAULTS.security, localOnlyMode: true },
            data: { ...LAWYER_SETTINGS_V2_DEFAULTS.data, cloudSync: true },
        };
        expect(isLawyerWorkCloudLive(settings)).toBe(false);
    });
});
