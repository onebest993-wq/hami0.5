import { beforeEach, describe, expect, it } from 'vitest';
import {
    CryptoService,
    WRAP_KDF_ITERATIONS,
    WRAP_KDF_ITERATIONS_LEGACY,
} from '@/app/services/CryptoService';
import {
    clearLawsuitArchivePerfMarks,
    getLawsuitArchivePerfSnapshot,
    markLawsuitArchivePerf,
} from '@/app/services/alerts/lawsuitArchivePerfMetrics';

describe('CryptoService wrap KDF cost path', () => {
    beforeEach(() => {
        CryptoService.destroy();
        try {
            sessionStorage.clear();
            localStorage.clear();
        } catch {
            /* ignore */
        }
    });

    it('initialize source prefers persistent IDB before session wrap (PBKDF2)', async () => {
        const fs = await import('node:fs');
        const path = await import('node:path');
        const src = fs.readFileSync(
            path.join(process.cwd(), 'src/app/services/CryptoService.ts'),
            'utf8',
        );
        const idbIdx = src.indexOf('tryRestoreKeyFromPersistentStore');
        const sessionIdx = src.indexOf(
            'const restoredSession = await this.tryRestoreKeyFromSession()',
        );
        expect(idbIdx).toBeGreaterThan(0);
        expect(sessionIdx).toBeGreaterThan(idbIdx);
    });

    it('second initialize with same wrap is near-instant (memory hit)', async () => {
        await CryptoService.initialize('perf-wrap-cred-a');
        const cipher = await CryptoService.encrypt('سرّ الأداء');

        const t0 = performance.now();
        await CryptoService.initialize('perf-wrap-cred-a');
        const warmMs = performance.now() - t0;

        expect(await CryptoService.decrypt(cipher)).toBe('سرّ الأداء');
        expect(warmMs).toBeLessThan(50);
    });

    it('exports dual wrap iteration constants (new < legacy)', () => {
        expect(WRAP_KDF_ITERATIONS).toBe(310_000);
        expect(WRAP_KDF_ITERATIONS_LEGACY).toBe(600_000);
        expect(WRAP_KDF_ITERATIONS).toBeLessThan(WRAP_KDF_ITERATIONS_LEGACY);
    });
});

describe('lawsuitArchivePerfMetrics', () => {
    beforeEach(() => {
        clearLawsuitArchivePerfMarks();
    });

    it('measures open→keys-ready from real performance marks', () => {
        markLawsuitArchivePerf('open-request');
        markLawsuitArchivePerf('keys-ready');
        const snap = getLawsuitArchivePerfSnapshot();
        expect(snap.openToKeysReadyMs).not.toBeNull();
        expect(snap.openToKeysReadyMs!).toBeGreaterThanOrEqual(0);
    });
});
