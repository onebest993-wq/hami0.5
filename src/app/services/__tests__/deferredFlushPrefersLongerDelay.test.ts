/**
 * الجولة الأطول تُزيح الأقصر — وإلا حكمت أوّلُ مدّةٍ تُطلب الوتيرةَ كلّها.
 *
 * `scheduleFlush` كانت تُسقط أيّ طلبٍ إن كانت جولةٌ مجدولة. و`setItem` تُعيد إدراج ما
 * ليس `encrypt-or-fail` بنفسها فتطلب ٤٠٠، ثم يطلب هذا الطابور ١٢٠٠ فيصير بلا أثر.
 * فالثابت `RETRY_DELAY_MS = 1_200` كان يَعِد بما لا يملك، والوتيرة الفعلية ٤٠٠.
 *
 * والمضيف هنا **يُجدوِل فعلاً** (يُرجع مُلغياً) — وذلك شرط قياس هذا السلوك: مضيف
 * الاختبارات الأخرى يُرجع `null` فلا تُعدّ جولةٌ مجدولةً قطّ، فلا يظهر الاستبدال.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { CryptoService } from '@/app/services/CryptoService';
import {
    configureCryptoDeferred,
    flushCryptoDeferredWrites,
    queueCryptoDeferredWrite,
    resetCryptoDeferredForTests,
    type CryptoDeferredHost,
} from '@/app/services/secureStoreCryptoDeferred';

type Armed = { delayMs: number; cancelled: boolean };

function installArmingHost() {
    const armed: Armed[] = [];
    const host: CryptoDeferredHost = {
        persist: async () => undefined,
        shouldDropStaleWrite: () => false,
        atomicGateHeld: () => false,
        /* يُجدوِل فعلاً: يُرجع مُلغياً بدل null، فتصير هناك جولةٌ «معلّقة» تُزاح أو لا */
        schedule: (_run, delayMs) => {
            const entry: Armed = { delayMs, cancelled: false };
            armed.push(entry);
            return () => {
                entry.cancelled = true;
            };
        },
        reportError: () => undefined,
        reportGivingUp: () => undefined,
    };
    configureCryptoDeferred(host);
    return armed;
}

describe('جدولة جولات الطابور', () => {
    beforeEach(() => {
        resetCryptoDeferredForTests();
        vi.spyOn(CryptoService, 'hasMasterKey').mockReturnValue(false);
        vi.spyOn(CryptoService, 'initialize').mockResolvedValue(undefined as never);
    });

    afterEach(() => {
        vi.restoreAllMocks();
        resetCryptoDeferredForTests();
    });

    it('طلبٌ أطول يُلغي الجولة الأقصر ويحلّ محلّها', async () => {
        const armed = installArmingHost();

        queueCryptoDeferredWrite('k1', '{"a":1}');
        expect(armed.map((a) => a.delayMs)).toEqual([400]);

        /* بلا مفتاح: الطابور يطلب 1200 والجولة الأقصر معلّقة */
        await flushCryptoDeferredWrites();

        expect(armed.map((a) => a.delayMs)).toEqual([400, 1200]);
        expect(armed[0].cancelled).toBe(true);
        expect(armed[1].cancelled).toBe(false);
    });

    /* الضوابط: الاستبدال في اتجاهٍ واحد فقط */

    it('ضابط — طلبٌ أقصر لا يُزيح جولةً أطول معلّقة', async () => {
        const armed = installArmingHost();

        queueCryptoDeferredWrite('k1', '{"a":1}');
        await flushCryptoDeferredWrites();
        expect(armed.map((a) => a.delayMs)).toEqual([400, 1200]);

        /* كتابةٌ جديدة تطلب 400 — ولا تُقدّم الجولة ولا تُلغيها */
        queueCryptoDeferredWrite('k2', '{"b":2}');

        expect(armed.map((a) => a.delayMs)).toEqual([400, 1200]);
        expect(armed[1].cancelled).toBe(false);
    });

    it('ضابط — مدّةٌ مساوية لا تُزيح ولا تُؤجّل', async () => {
        const armed = installArmingHost();

        queueCryptoDeferredWrite('k1', '{"a":1}');
        queueCryptoDeferredWrite('k2', '{"b":2}');
        queueCryptoDeferredWrite('k3', '{"c":3}');

        expect(armed.map((a) => a.delayMs)).toEqual([400]);
        expect(armed[0].cancelled).toBe(false);
    });
});
