import { describe, expect, it, vi, beforeEach } from 'vitest';
import { queryMicrophonePermission } from '@/app/services/platform/queryMicrophonePermission';

describe('queryMicrophonePermission', () => {
    beforeEach(() => {
        vi.unstubAllGlobals();
    });

    it('يُرجع granted عند موافقة Permissions API', async () => {
        vi.stubGlobal('navigator', {
            mediaDevices: { getUserMedia: vi.fn() },
            permissions: {
                query: vi.fn().mockResolvedValue({ state: 'granted', onchange: null }),
            },
        });

        await expect(queryMicrophonePermission()).resolves.toBe('granted');
    });

    it('يُرجع denied عند رفض Permissions API', async () => {
        vi.stubGlobal('navigator', {
            mediaDevices: { getUserMedia: vi.fn() },
            permissions: {
                query: vi.fn().mockResolvedValue({ state: 'denied', onchange: null }),
            },
        });

        await expect(queryMicrophonePermission()).resolves.toBe('denied');
    });

    it('يُرجع denied عند حجب Permissions-Policy على المستند', async () => {
        vi.stubGlobal('navigator', {
            mediaDevices: { getUserMedia: vi.fn() },
            permissions: {
                query: vi.fn().mockResolvedValue({ state: 'prompt', onchange: null }),
            },
        });
        vi.stubGlobal('document', {
            permissionsPolicy: {
                allowsFeature: (feature: string) => feature !== 'microphone',
            },
        });

        await expect(queryMicrophonePermission()).resolves.toBe('denied');
    });

    it('يُرجع granted عند وجود تسمية جهاز صوتي (بعد منح الإذن سابقاً)', async () => {
        vi.stubGlobal('navigator', {
            mediaDevices: {
                getUserMedia: vi.fn(),
                enumerateDevices: vi.fn().mockResolvedValue([
                    { kind: 'audioinput', label: 'Built-in Microphone', deviceId: 'mic-1' },
                ]),
            },
            permissions: {
                query: vi.fn().mockResolvedValue({ state: 'prompt', onchange: null }),
            },
        });

        await expect(queryMicrophonePermission()).resolves.toBe('granted');
    });

    it('يُرجع unsupported عند غياب getUserMedia', async () => {
        vi.stubGlobal('navigator', {});
        await expect(queryMicrophonePermission()).resolves.toBe('unsupported');
    });
});
