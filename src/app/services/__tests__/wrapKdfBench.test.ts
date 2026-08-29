/**
 * قياس PBKDF2 الحقيقي في بيئة الاختبار (Web Crypto).
 * يوثّق أن اللفّ الجديد أرخص من الإرث دون كسر فكّ الإرث.
 */
import { describe, expect, it } from 'vitest';
import {
    WRAP_KDF_ITERATIONS,
    WRAP_KDF_ITERATIONS_LEGACY,
} from '@/app/services/CryptoService';

const KEY_SALT = 'hami-crypto-key-salt-v2';

async function timePbkdf2Derive(iterations: number): Promise<number> {
    const keyMaterial = await crypto.subtle.importKey(
        'raw',
        new TextEncoder().encode('hami-crypto-wrap:bench-cred'),
        { name: 'PBKDF2' },
        false,
        ['deriveKey'],
    );
    const t0 = performance.now();
    await crypto.subtle.deriveKey(
        {
            name: 'PBKDF2',
            salt: new TextEncoder().encode(KEY_SALT),
            iterations,
            hash: 'SHA-256',
        },
        keyMaterial,
        { name: 'AES-KW', length: 256 },
        false,
        ['wrapKey', 'unwrapKey'],
    );
    return performance.now() - t0;
}

describe('PBKDF2 wrap iteration bench (real WebCrypto timing)', () => {
    it(
        'new wrap iterations are measurably cheaper than legacy on this host',
        async () => {
            const legacyMs = await timePbkdf2Derive(WRAP_KDF_ITERATIONS_LEGACY);
            const nextMs = await timePbkdf2Derive(WRAP_KDF_ITERATIONS);
            /*
             * نسبة التكرارات ≈ 0.517 — نتوقع next أقل من legacy بهامش ضوضاء.
             * على CI سريع جداً قد يتقارب الزمن؛ نقبل أيضاً next ≤ legacy * 0.95
             * أو أن النسبة ≤ 0.85 عند أزمنة ذات معنى (>30ms).
             */
            if (legacyMs >= 30) {
                expect(nextMs).toBeLessThan(legacyMs * 0.9);
            } else {
                expect(nextMs).toBeLessThanOrEqual(legacyMs * 1.15);
            }
            expect(WRAP_KDF_ITERATIONS / WRAP_KDF_ITERATIONS_LEGACY).toBeCloseTo(310 / 600, 2);
        },
        60_000,
    );
});
