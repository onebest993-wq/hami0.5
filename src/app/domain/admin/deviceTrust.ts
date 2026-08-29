/**
 * Domain — Trusted Device for Admin Headquarters.
 * Local UUID is a UX cache only. Authority is `admin_trusted_devices` via BFF.
 */

import { getOrCreateDeviceId } from '@/app/security/deviceId';

const TRUST_CACHE_KEY = 'hami:admin:trusted_device_v1';
const TRUST_FLAG_KEY = 'hami:admin:trusted_device_flag_v1';

function canUseLocalStorage(): boolean {
    try {
        return typeof window !== 'undefined' && typeof window.localStorage !== 'undefined';
    } catch {
        return false;
    }
}

/**
 * Trusted-device gate helpers used by Admin Headquarters presentation layer.
 */
export class DeviceTrustService {
    static readonly storageKey = TRUST_CACHE_KEY;

    /** Stable browser fingerprint shared with WIFE `x-wife-device-id`. */
    static getDeviceFingerprint(): string {
        return getOrCreateDeviceId();
    }

    /** Local cache only — not authoritative. Fingerprint must still match this browser. */
    static isDeviceTrustedLocally(): boolean {
        if (!canUseLocalStorage()) return false;
        try {
            if (window.localStorage.getItem(TRUST_FLAG_KEY) !== '1') return false;
            const cached = window.localStorage.getItem(TRUST_CACHE_KEY)?.trim() || '';
            if (!cached) return false;
            return cached === DeviceTrustService.getDeviceFingerprint();
        } catch {
            return false;
        }
    }

    /** @deprecated Prefer isDeviceTrustedLocally / server status — kept for older callers. */
    static isDeviceTrusted(): boolean {
        return DeviceTrustService.isDeviceTrustedLocally();
    }

    /**
     * Marks this browser as trusted in local cache after server verify succeeds.
     * Returns the fingerprint that was trusted.
     */
    static trustThisDevice(fingerprint?: string): string {
        const id = (fingerprint ?? DeviceTrustService.getDeviceFingerprint()).trim();
        if (canUseLocalStorage()) {
            try {
                window.localStorage.setItem(TRUST_CACHE_KEY, id);
                window.localStorage.setItem(TRUST_FLAG_KEY, '1');
            } catch {
                /* cache only — server trust is authoritative */
            }
        }
        return id;
    }

    static revokeDeviceTrust(): void {
        if (!canUseLocalStorage()) return;
        try {
            window.localStorage.removeItem(TRUST_CACHE_KEY);
            window.localStorage.removeItem(TRUST_FLAG_KEY);
        } catch {
            /* ignore */
        }
    }

    static getTrustedDeviceId(): string | null {
        if (!canUseLocalStorage()) return null;
        try {
            const raw = window.localStorage.getItem(TRUST_CACHE_KEY);
            return raw?.trim() || null;
        } catch {
            return null;
        }
    }
}
