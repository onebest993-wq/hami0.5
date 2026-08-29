import { describe, expect, it, vi } from 'vitest';
import { applyHqMailerEnvFromFiles } from '../adminMailerEnv.ts';

describe('adminMailerEnv', () => {
    it('does not overlay dotenv files onto process.env during unit tests', () => {
        expect(process.env.NODE_ENV).toBe('test');
        const before = process.env.EMAIL_SMTP_PASS;
        applyHqMailerEnvFromFiles();
        expect(process.env.EMAIL_SMTP_PASS).toBe(before);
    });

    it('does not overlay files when Vitest stubs NODE_ENV=production', () => {
        const beforePepper = process.env.ADMIN_OTP_PEPPER;
        vi.stubEnv('NODE_ENV', 'production');
        applyHqMailerEnvFromFiles();
        expect(process.env.ADMIN_OTP_PEPPER).toBe(beforePepper);
        vi.unstubAllEnvs();
    });
});
