/**
 * محاكاة طاقم مهاجمين متزامن: توقيع، CSRF، KV، عزل العمل المحلي، التشفير، الخفة.
 * النتيجة المتوقعة: رفض أو قصر محلي — بلا تسريب وبلا تكلفة على المسار المحلي.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import {
    verifyCsrfToken,
    verifyWifeSignature,
    resetWifeValidatorCachesForTests,
} from '@/app/api/security/wifeValidator.ts';
import { resetNonceStoreForTests } from '@/app/api/security/wifeNonceStore.ts';
import { resetStolenTokenServerForTests } from '@/app/api/security/stolenTokenServer.ts';
import { resetWifeRateLimitStoreForTests } from '@/app/api/security/wifeRateLimitStore.ts';
import { resetCsrfServerStoreForTests } from '@/app/api/security/csrfServerStore.ts';
import { isKeyOwnedBy, isPrefixOwnedBy } from '@/app/security/kvProxyKeyOwnership';
import { isWifeProtectedApiUrl } from '@/app/security/wifeFetchGuard';
import { kvPrefixSortBounds } from '@/app/api/security/kvStoreAdmin.ts';
import { isWorkLocalKvMaterial } from '@/app/services/settings/lawyerWorkCloudGate';
import {
    fallsBackToPlaintextBySize,
    isWarmEncryptAlwaysKey,
    shouldEncryptValue,
    ENCRYPT_MAX_BYTES,
} from '@/app/services/secureStorageKeys';
import { BOOT_SHELL_WARM_KEYS } from '@/app/services/dossierPersistence/protectedStorageKeys';
import {
    ALL_BFF_ENDPOINTS,
    ATTACKER_ID,
    ATTACKER_TOKEN,
    CSRF_ATTACKER,
    VICTIM_ID,
    buildEndpointUrl,
    primeDrillCsrf,
    resetWifeDrillEnv,
    stubSupabaseAuth,
    unsignedRequest,
} from './wifeRedTeamHelpers.ts';

const BASE = 'https://app.test';
const OVERSIZE = 'x'.repeat(ENCRYPT_MAX_BYTES + 8);

function resetAll(): void {
    resetWifeValidatorCachesForTests();
    resetNonceStoreForTests();
    resetStolenTokenServerForTests();
    resetWifeRateLimitStoreForTests();
    resetCsrfServerStoreForTests();
}

describe('☠️ CREW WAVE 1 — فيضان غير موقَّع متزامن على كل BFF', () => {
    beforeEach(async () => {
        resetAll();
        resetWifeDrillEnv();
        stubSupabaseAuth(ATTACKER_ID);
        await primeDrillCsrf(ATTACKER_ID);
    });
    afterEach(() => {
        vi.unstubAllGlobals();
    });

    it('كل المسارات ترفض الطلب بلا توقيع في موجة واحدة', async () => {
        const verdicts = await Promise.all(
            ALL_BFF_ENDPOINTS.map(async (ep) => {
                const url = buildEndpointUrl(BASE, ep);
                const req = unsignedRequest(url, ep.method, ep.body ?? '');
                return verifyWifeSignature(req, ATTACKER_TOKEN);
            }),
        );
        expect(verdicts.every((ok) => ok === false)).toBe(true);
        expect(verdicts.length).toBeGreaterThan(40);
    });
});

describe('☠️ CREW WAVE 2 — حركة جانبية KV + عزل العمل', () => {
    it('لا يُسمح بمسح follow: أو user: لكل المستخدمين', () => {
        expect(isPrefixOwnedBy('follow:', ATTACKER_ID, 'read')).toBe(false);
        expect(isPrefixOwnedBy('user:', ATTACKER_ID, 'read')).toBe(false);
        expect(isPrefixOwnedBy(`user:${VICTIM_ID}:`, ATTACKER_ID, 'read')).toBe(false);
        expect(isPrefixOwnedBy(`follow:${VICTIM_ID}:`, ATTACKER_ID, 'read')).toBe(false);
        expect(isPrefixOwnedBy(`follow:${ATTACKER_ID}:`, ATTACKER_ID, 'read')).toBe(true);
        expect(isPrefixOwnedBy('followers:', ATTACKER_ID, 'read')).toBe(false);
        expect(isPrefixOwnedBy(`followers:${VICTIM_ID}:`, ATTACKER_ID, 'read')).toBe(false);
        expect(isPrefixOwnedBy(`followers:${ATTACKER_ID}:`, ATTACKER_ID, 'read')).toBe(true);
        expect(isPrefixOwnedBy('repository:docs:', ATTACKER_ID, 'read')).toBe(false);
        expect(isPrefixOwnedBy(`repository:docs:${VICTIM_ID}:`, ATTACKER_ID, 'read')).toBe(false);
        expect(isKeyOwnedBy('repository:docs:legal-doc-1', ATTACKER_ID, 'read')).toBe(false);
        expect(isKeyOwnedBy(`followers:${VICTIM_ID}:stranger-id`, ATTACKER_ID, 'write')).toBe(false);
    });

    it('بادئة user:<id>: تُحسب عملاً محلياً حتى لا تُسرَّب القضايا مع الملف المهني', () => {
        expect(isWorkLocalKvMaterial(`user:${ATTACKER_ID}:`)).toBe(true);
        expect(isWorkLocalKvMaterial(`user:${ATTACKER_ID}:cases:`)).toBe(true);
        expect(isWorkLocalKvMaterial(`user:${ATTACKER_ID}:profile`)).toBe(false);
        expect(isWorkLocalKvMaterial(`profile:${ATTACKER_ID}`)).toBe(false);
    });

    it('مفتاح الضحية لا يُقرأ ولا يُكتب', () => {
        expect(isKeyOwnedBy(`calendar:${VICTIM_ID}:hearing-1`, ATTACKER_ID, 'read')).toBe(false);
        expect(isKeyOwnedBy(`transactions:${VICTIM_ID}:tx-1`, ATTACKER_ID, 'write')).toBe(false);
        expect(isKeyOwnedBy(`vault:docs:${VICTIM_ID}:secret`, ATTACKER_ID, 'read')).toBe(false);
    });
});

describe('☠️ CREW WAVE 3 — حقن بادئة KV بلا LIKE', () => {
    it('مدى الترتيب لا يلتقط مفاتيح مستخدم آخر حتى مع _ في الاسم', () => {
        const { gte, lt } = kvPrefixSortBounds(`lawyer_files:${ATTACKER_ID}:`);
        const own = `lawyer_files:${ATTACKER_ID}:dossier-1`;
        const victim = `lawyer_files:${VICTIM_ID}:dossier-1`;
        const wildcard = `lawyer_files:${ATTACKER_ID}:%`;
        expect(own >= gte && own < lt).toBe(true);
        expect(victim >= gte && victim < lt).toBe(false);
        expect(wildcard.startsWith(`lawyer_files:${ATTACKER_ID}:`)).toBe(true);
    });
});

describe('☠️ CREW WAVE 4 — CSRF على طلب غير مُغيّر لا يكفي للاختراق', () => {
    beforeEach(async () => {
        resetAll();
        resetWifeDrillEnv();
        stubSupabaseAuth(ATTACKER_ID);
        await primeDrillCsrf(ATTACKER_ID);
    });
    afterEach(() => {
        vi.unstubAllGlobals();
    });

    it('GET آمن يمرّ CSRF دون رأس مُغيّر؛ POST بلا رأس يُرفض', async () => {
        const getReq = new Request('https://app.test/api/forum/posts', { method: 'GET' });
        expect(await verifyCsrfToken(getReq, ATTACKER_TOKEN)).toBe(true);
        const postReq = new Request('https://app.test/api/forum/delete', {
            method: 'POST',
            headers: { cookie: `hami_csrf_token=${CSRF_ATTACKER}` },
            body: '{}',
        });
        expect(await verifyCsrfToken(postReq, ATTACKER_TOKEN)).toBe(false);
    });
});

describe('☠️ CREW WAVE 5 — التشفير عند الراحة لا يسقط على مفاتيح العمل', () => {
    it('lawyerdb والمستعجل والمعاملات فوق الحد تبقى مشفّرة', () => {
        expect(isWarmEncryptAlwaysKey(`hami:lawyerdb:${ATTACKER_ID}:cases`)).toBe(true);
        expect(isWarmEncryptAlwaysKey(`hami:urgentActions:v1:${ATTACKER_ID}`)).toBe(true);
        expect(fallsBackToPlaintextBySize(`hami:lawyerdb:${ATTACKER_ID}:cases`, OVERSIZE)).toBe(false);
        expect(shouldEncryptValue(`hami:transactions:v1`, OVERSIZE)).toBe(true);
        expect(fallsBackToPlaintextBySize('hami:transactions:v1', OVERSIZE)).toBe(false);
        expect(isWarmEncryptAlwaysKey(`hami:transactionsThreading:v1:${ATTACKER_ID}`)).toBe(true);
    });
});

describe('☠️ CREW WAVE 6 — الخفة: لا WIFE على الأصول ولا تسخين lawyerdb في الإقلاع', () => {
    it('الحارس لا يوقّع إلا same-origin /api المحمي', () => {
        Object.defineProperty(window, 'location', {
            value: { origin: 'https://hami.app' },
            configurable: true,
        });
        expect(isWifeProtectedApiUrl('/logo.svg')).toBe(false);
        expect(isWifeProtectedApiUrl('https://fonts.googleapis.com/css')).toBe(false);
        expect(isWifeProtectedApiUrl('/api/kv-proxy')).toBe(true);
        expect(isWifeProtectedApiUrl('https://evil.test/api/kv-proxy')).toBe(false);
    });

    it('قشرة الإقلاع لا تُسخّن lawyerdb ولا المستعجل', () => {
        const boot = [...BOOT_SHELL_WARM_KEYS];
        expect(boot.some((k) => k.startsWith('hami:lawyerdb'))).toBe(false);
        expect(boot.some((k) => k.startsWith('hami:urgentActions'))).toBe(false);
        expect(boot).not.toContain('hami:transactions:v1');
    });

    it('محرّك المزامنة يتخطى بلا جلسة عندما العمل المحلي', () => {
        const engine = readFileSync(join(process.cwd(), 'src/app/services/cloudSyncEngine.ts'), 'utf8');
        expect(engine).toContain('isLawyerWorkCloudLive');
        expect(engine).toContain('isLiveEngineBucketEnabled');
        const init = readFileSync(join(process.cwd(), 'src/app/security/SecurityInitializer.tsx'), 'utf8');
        expect(init).not.toContain('void ensureCsrfSessionReady();');
    });
});
