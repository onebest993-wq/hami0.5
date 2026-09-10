/**
 * حفظ المفتاح الرئيسي على قرصٍ **حقيقي** — المسارات التي أُعلن أنها لا تُبلَغ.
 *
 * `cryptoKeyPersistFailureIsReported` يقيس فرع `!db` وحده، ويقول ذلك صراحةً: «بيئة
 * jsdom بلا `indexedDB`، و`openCryptoDatabase` تُرجع `null` عندها». فبقي من الخمسة
 * ثلاثةٌ لا يبلغها اختبار: `tx.onerror` و`tx.onabort` والاستثناء عند `put`. و`5fba7bbc`
 * شُحن باستثناءٍ معلن على البند ١١ لهذا السبب.
 *
 * **والإجهاض ليس حالةً نادرة:** هو الطريق الذي تسلكه `QuotaExceededError` على جهاز
 * حقيقي — أي أخطر ما يقع لمحامٍ امتلأت حصّة جهازه. وأثره أن مفتاحاً في الذاكرة لا يبلغ
 * القرص، فتعمل الجلسة يوماً كاملاً ثم لا يُقرأ عملها بعد الإقلاع (`FINDING-019`).
 *
 * صار يُبلَغ بعد `f27e5f74`. وهذا الملف يُغلق الاستثناء، ولا يُلمس ملف إنتاج.
 */
import 'fake-indexeddb/auto';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { CryptoService } from '@/app/services/CryptoService';
import {
    __resetPersistenceFailureSignalForTests,
    getLastPersistenceFailure,
    hasPersistenceFailed,
} from '@/app/services/persistenceFailureSignal';

const persistKey = () =>
    (
        CryptoService as unknown as { persistKeyToPersistentStore: () => Promise<void> }
    ).persistKeyToPersistentStore();

/** يُجهض كل معاملة تُفتح داخل النطاق — كما تفعل الحصّة الممتلئة */
function abortEveryTransaction(): () => void {
    const original = IDBDatabase.prototype.transaction;
    const spy = vi
        .spyOn(IDBDatabase.prototype, 'transaction')
        .mockImplementation(function (this: IDBDatabase, ...args: unknown[]) {
            const tx = (original as (...a: unknown[]) => IDBTransaction).apply(this, args);
            /* بعد أن يُسند المستدعي معالجاته في السطر التالي مباشرةً */
            queueMicrotask(() => {
                try {
                    tx.abort();
                } catch {
                    /* أُتمّت قبل الإجهاض */
                }
            });
            return tx;
        } as never);
    return () => spy.mockRestore();
}

describe('حفظ المفتاح على قرص حقيقي', () => {
    beforeEach(async () => {
        CryptoService.destroy();
        await CryptoService.initialize('test-password-123');
        __resetPersistenceFailureSignalForTests();
    });

    it('إجهاض المعاملة يُبلَّغ — وهو مسار الحصّة الممتلئة، وكان غير قابل للتشغيل', async () => {
        const restore = abortEveryTransaction();
        try {
            await persistKey();
        } finally {
            restore();
        }

        expect(hasPersistenceFailed()).toBe(true);
        expect(getLastPersistenceFailure()?.reason).toBe('transaction-failed');
    });

    it('واستثناءٌ عند put يُبلَّغ كذلك ولا يُبتلع', async () => {
        const spy = vi.spyOn(IDBObjectStore.prototype, 'put').mockImplementation(() => {
            throw new DOMException('quota', 'QuotaExceededError');
        });
        try {
            await persistKey();
        } finally {
            spy.mockRestore();
        }

        expect(hasPersistenceFailed()).toBe(true);
        expect(getLastPersistenceFailure()?.reason).toBe('transaction-failed');
        expect(getLastPersistenceFailure()?.key).toBe('master-key-v3');
    });

    /*
     * الضابط الذي لا يستطيعه الملف القديم: على قرصٍ حقيقي **ينجح** الحفظ فلا يُبلَّغ
     * شيء. في jsdom كان كل حفظ يُبلّغ `db-unavailable`، فلم يكن هناك ما يُميّز
     * «أبلغ حين يجب» عن «يُبلّغ دائماً».
     */
    it('ضابط — الحفظ الناجح على قرص حقيقي صامت', async () => {
        await persistKey();

        expect(hasPersistenceFailed()).toBe(false);
        expect(getLastPersistenceFailure()).toBeNull();
    });
});
