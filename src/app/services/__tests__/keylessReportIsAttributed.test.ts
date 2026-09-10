/**
 * بلاغ «جلسة بلا مفتاح» يُنسب إلى محامٍ، أو لا يُطلق.
 *
 * `hasPersistenceFailed()` رايةُ جلسةٍ واحدة (`failureCount > 0`)، فبلاغٌ واحد يجعل
 * الجلسة كلّها تبدو فاشلة. ومسار الدخول يمرّ بنافذة هويةٍ فارغة قبل أن تُضبط الهوية
 * (`authProviderRuntime.ts:283` ثم `:284`)، فيبلغ فحصُ الـciphertext تلك النافذة.
 *
 * وحين مُنعت الجلسة العابرة من تبنّي مفتاح محامٍ آخر (`FINDING-022`) صارت النافذة
 * تصل إلى «رفض السكّ» فتُطلق بلاغاً منسوباً إلى `master-key-v3` — أي إلى لا أحد —
 * **على كل عودةٍ عادية لمحامٍ إلى جهازه**. وذلك يُفرغ الراية من معناها قبل أن تُعرض
 * في الواجهة أصلاً (قرارٌ معلَّق لصاحب المشروع).
 *
 * فالقاعدة: لا هوية ⇒ لا بلاغ. والحالة الحقيقية تُبلَّغ في النداء التالي.
 */
import 'fake-indexeddb/auto';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const signals: Array<{ key: string; reason: string }> = [];
vi.mock('@/app/services/persistenceFailureSignal', async (importOriginal) => {
    const actual = await importOriginal<Record<string, unknown>>();
    return {
        ...actual,
        signalPersistenceFailure: (key: string, reason: string) => {
            signals.push({ key, reason });
        },
    };
});

import { CryptoService } from '@/app/services/CryptoService';
import SecureStoreService from '@/app/services/SecureStoreService';
import { setLiveAuthUserId } from '@/app/utils/liveAuthUserId';
import { LAWSUIT_FILES_STORAGE_KEY } from '@/app/domain/dossier/dossierStorageKeys';

async function seedLawyerAThenLogOut(): Promise<void> {
    CryptoService.destroy();
    localStorage.clear();
    sessionStorage.clear();
    SecureStoreService.deleteItemSync(LAWSUIT_FILES_STORAGE_KEY);
    SecureStoreService.dropMemoryMirrorsForTests();
    await new Promise<void>((resolve) => {
        const req = indexedDB.deleteDatabase('hami-crypto-keystore');
        req.onsuccess = () => resolve();
        req.onerror = () => resolve();
        req.onblocked = () => resolve();
    });

    setLiveAuthUserId('lawyer-A');
    await CryptoService.initialize();
    await SecureStoreService.setItem(LAWSUIT_FILES_STORAGE_KEY, JSON.stringify({ o: 'A' }));
    CryptoService.destroy();
    signals.length = 0;
}

describe('بلاغ الجلسة بلا مفتاح يُنسب أو لا يُطلق', () => {
    beforeEach(() => {
        signals.length = 0;
    });

    it('عودة المحامي نفسه إلى جهازه لا تُطلق بلاغاً — والمفتاح يُستعاد', async () => {
        await seedLawyerAThenLogOut();

        setLiveAuthUserId(null);
        await CryptoService.initialize();
        setLiveAuthUserId('lawyer-A');
        await CryptoService.initialize();

        expect(CryptoService.hasMasterKey()).toBe(true);
        expect(signals).toEqual([]);
    });

    it('ولا تُطلق بلاغاً في نافذة الهوية وحدها', async () => {
        await seedLawyerAThenLogOut();

        setLiveAuthUserId(null);
        await CryptoService.initialize();

        expect(signals).toEqual([]);
    });

    /* الضابط الذي يمنع القاعدة من أن تصير إسكاتاً */

    it('ضابط — المحامي الثاني بلا مفتاح فوق بيانات الأوّل: البلاغ يصل، ومنسوباً إليه', async () => {
        await seedLawyerAThenLogOut();

        setLiveAuthUserId(null);
        await CryptoService.initialize();
        setLiveAuthUserId('lawyer-B');
        await CryptoService.initialize();

        expect(CryptoService.hasMasterKey()).toBe(false);
        expect(signals.length).toBeGreaterThan(0);
        expect(signals.every((s) => s.key === 'master-key-v3:u:lawyer-B')).toBe(true);
        expect(signals[0].reason).toBe('encrypt-or-write-failed');
    });
});
