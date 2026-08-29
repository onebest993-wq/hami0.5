import { afterEach, describe, expect, it, vi } from 'vitest';
import { DeviceTrustService } from '@/app/domain/admin/deviceTrust';

describe('DeviceTrustService', () => {
    afterEach(() => {
        DeviceTrustService.revokeDeviceTrust();
    });

    it('starts untrusted when no local flag exists', () => {
        expect(DeviceTrustService.isDeviceTrustedLocally()).toBe(false);
        expect(DeviceTrustService.getTrustedDeviceId()).toBeNull();
    });

    it('trustThisDevice persists fingerprint cache after server verify', () => {
        const id = DeviceTrustService.trustThisDevice();
        expect(id).toBe(DeviceTrustService.getDeviceFingerprint());
        expect(DeviceTrustService.isDeviceTrustedLocally()).toBe(true);
        expect(DeviceTrustService.getTrustedDeviceId()).toBe(id);
        expect(localStorage.getItem(DeviceTrustService.storageKey)).toBe(id);
    });

    it('isDeviceTrustedLocally ignores a cache for a different browser fingerprint', () => {
        DeviceTrustService.trustThisDevice('not-this-browser-device');
        expect(DeviceTrustService.isDeviceTrustedLocally()).toBe(false);
    });

    it('revokeDeviceTrust clears the local cache', () => {
        DeviceTrustService.trustThisDevice('abcdef0123456789');
        DeviceTrustService.revokeDeviceTrust();
        expect(DeviceTrustService.isDeviceTrustedLocally()).toBe(false);
        expect(localStorage.getItem(DeviceTrustService.storageKey)).toBeNull();
    });
});

describe('clientEnv mailboxes', () => {
    afterEach(() => {
        vi.unstubAllEnvs();
        vi.resetModules();
    });

    it('reads masterEmail and supportEmail from Vite env', async () => {
        vi.stubEnv('VITE_ADMIN_MASTER_EMAIL', 'admin-master@example.com');
        vi.stubEnv('VITE_APP_SUPPORT_EMAIL', 'support-desk@example.com');
        vi.stubEnv('VITE_SUPPORT_WHATSAPP', '9647811102199');
        const { clientEnv } = await import('@/config/clientEnv');
        expect(clientEnv.masterEmail).toBe('admin-master@example.com');
        expect(clientEnv.supportEmail).toBe('support-desk@example.com');
        expect(clientEnv.supportWhatsapp).toBe('9647811102199');
    });
});
