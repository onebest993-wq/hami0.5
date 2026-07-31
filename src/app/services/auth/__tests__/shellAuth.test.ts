import { describe, expect, it, vi, afterEach } from 'vitest';
import { GUEST_LAWYER_ID } from '@/app/utils/guestLawyerSession';
import {
    isRealSignedIn,
    isShellAuthBypassed,
    isShellDemoUserId,
    resolveShellAuthUserId,
} from '@/app/services/auth/shellAuth';

describe('shellAuth', () => {
    afterEach(() => {
        vi.unstubAllEnvs();
        vi.stubEnv('VITE_SHELL_AUTH_OPEN', 'false');
    });

    it('treats guest and demo_user as non-auth', () => {
        expect(isShellDemoUserId(GUEST_LAWYER_ID)).toBe(true);
        expect(isShellDemoUserId('demo_user')).toBe(true);
        expect(isShellDemoUserId('lawyer-real-uuid')).toBe(false);
    });

    it('isRealSignedIn rejects guest and empty ids when bypass off', () => {
        expect(isRealSignedIn(null)).toBe(false);
        expect(isRealSignedIn('')).toBe(false);
        expect(isRealSignedIn(GUEST_LAWYER_ID)).toBe(false);
        expect(isRealSignedIn('demo_user')).toBe(false);
    });

    it('isRealSignedIn accepts real user ids', () => {
        expect(isRealSignedIn('a1b2c3d4-e5f6-7890-abcd-ef1234567890')).toBe(true);
        expect(isRealSignedIn('lawyer-1')).toBe(true);
    });

    it('resolveShellAuthUserId prefers auth over display', () => {
        expect(resolveShellAuthUserId('auth-1', GUEST_LAWYER_ID)).toBe('auth-1');
        expect(resolveShellAuthUserId(null, GUEST_LAWYER_ID)).toBe(GUEST_LAWYER_ID);
    });

    it('isShellAuthBypassed is false on production when BFF auth is enabled', () => {
        vi.stubEnv('MODE', 'production');
        vi.stubEnv('PROD', 'true');
        vi.stubEnv('DEV', 'false');
        vi.stubEnv('VITE_SHELL_AUTH_OPEN', '');
        vi.stubEnv('VITE_BFF_AUTH', 'true');
        expect(isShellAuthBypassed()).toBe(false);
    });

    it('isShellAuthBypassed respects VITE_SHELL_AUTH_OPEN=false even in static SPA prod', () => {
        vi.stubEnv('MODE', 'production');
        vi.stubEnv('PROD', 'true');
        vi.stubEnv('DEV', 'false');
        vi.stubEnv('VITE_SHELL_AUTH_OPEN', 'false');
        vi.stubEnv('VITE_BFF_AUTH', '');
        expect(isShellAuthBypassed()).toBe(false);
    });

    it('isShellAuthBypassed respects VITE_SHELL_AUTH_OPEN=true', () => {
        vi.stubEnv('VITE_SHELL_AUTH_OPEN', 'true');
        expect(isShellAuthBypassed()).toBe(true);
        expect(isRealSignedIn(GUEST_LAWYER_ID)).toBe(true);
    });

    it('resolveShellAuthUserId falls back to guest in bypass mode', () => {
        vi.stubEnv('VITE_SHELL_AUTH_OPEN', 'true');
        expect(resolveShellAuthUserId(null, null)).toBe(GUEST_LAWYER_ID);
    });
});
