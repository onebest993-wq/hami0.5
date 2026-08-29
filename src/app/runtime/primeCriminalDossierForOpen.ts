/**
 * تهيئة فتح الإضبارة الجزائية قبل إظهار الطبقة:
 * 1) انتظار hydrate الـ store (الحقن قبله يُمسَح)
 * 2) حقن السجل sync من القرص / فهرس البطاقات
 * 3) تحميل chunk اللوحة حتى لا يظهر BootChrome في الـ Portal
 */

import { injectCriminalCaseIntoMap } from '@/app/utils/criminalCaseStoreInject';
import { isCriminalCaseCardIndexStub } from '@/app/utils/criminalCaseCardIndex';

const HYDRATE_WAIT_MS = 2_500;
/** ميزانية تهيئة خلفية بعد commit البوابة — لا تحجب النقرة */
const PRIME_BUDGET_MS = 2_000;

function findCaseInMap(
    casesById: Record<string, unknown>,
    caseId: string,
): unknown | null {
    if (casesById[caseId] != null) return casesById[caseId];
    for (const row of Object.values(casesById)) {
        if (row && typeof row === 'object' && String((row as { id?: unknown }).id ?? '').trim() === caseId) {
            return row;
        }
    }
    return null;
}

function waitForCriminalStoreHydration(
    useCriminalStore: {
        persist?: {
            hasHydrated?: () => boolean;
            onFinishHydration?: (cb: () => void) => () => void;
            rehydrate?: () => Promise<unknown> | void;
        };
    },
    timeoutMs: number,
): Promise<void> {
    if (typeof useCriminalStore.persist?.hasHydrated !== 'function') {
        return Promise.resolve();
    }
    if (useCriminalStore.persist.hasHydrated()) {
        return Promise.resolve();
    }
    try {
        void useCriminalStore.persist.rehydrate?.();
    } catch {
        /* ignore */
    }
    return new Promise((resolve) => {
        let settled = false;
        const finish = () => {
            if (settled) return;
            settled = true;
            resolve();
        };
        const unsub = useCriminalStore.persist?.onFinishHydration?.(finish);
        window.setTimeout(() => {
            try {
                unsub?.();
            } catch {
                /* ignore */
            }
            finish();
        }, timeoutMs);
    });
}

/**
 * Inject into casesById with stub/full policy:
 * card-index stubs are display-only (marked) and must not overwrite a full case;
 * a later full shard load upgrades the stub. Persist skips stub shard writes.
 */
export function injectCaseIntoStore(
    useCriminalStore: {
        getState: () => { casesById?: Record<string, unknown> };
        setState: (partial: { casesById: Record<string, unknown> }) => void;
    },
    caseId: string,
    row: { id?: string } & Record<string, unknown>,
    options?: { fromCardIndex?: boolean },
): boolean {
    const live = (useCriminalStore.getState().casesById ?? {}) as Record<string, unknown>;
    const { next, injected } = injectCriminalCaseIntoMap(live, caseId, row, options);
    if (!injected) return false;
    useCriminalStore.setState({ casesById: next });
    return true;
}

/**
 * يجهّز الـ store + chunk قبل setCriminalDashboardCaseId.
 * لا يرمي — الفشل يُبتلع ويفتح المسار كحد أقصى بعد الميزانية.
 */
export async function primeCriminalDossierForOpen(caseId: string): Promise<void> {
    const trimmed = String(caseId ?? '').trim();
    if (!trimmed || typeof window === 'undefined') return;

    const work = (async () => {
        const modulePromise = import('@/app/runtime/criminalDashboardLoader')
            .then((m) => m.loadCriminalDashboardModule())
            .catch(() => undefined);

        const storePromise = (async () => {
            const [storage, storeMod] = await Promise.all([
                import('@/app/utils/criminalCasesStorage'),
                import('@/app/components/lawyer/criminal-system/criminalStore'),
            ]);
            const useCriminalStore = storeMod.useCriminalStore;
            await waitForCriminalStoreHydration(useCriminalStore, HYDRATE_WAIT_MS);

            const liveMap = (useCriminalStore.getState().casesById ?? {}) as Record<string, unknown>;
            const existing = findCaseInMap(liveMap, trimmed);
            const existingIsFull = existing != null && !isCriminalCaseCardIndexStub(existing);
            if (existingIsFull) {
                return;
            }

            let row =
                storage.loadCriminalCaseRecordByIdSync(trimmed) ??
                (await storage.loadCriminalCaseRecordByIdAsync(trimmed).catch(() => null));
            let fromCardIndex = false;

            if (!row) {
                const indexHit = storage
                    .loadCriminalCasesCardIndexSync()
                    .find((entry) => String(entry.id ?? '').trim() === trimmed);
                if (indexHit) {
                    row = indexHit as unknown as typeof row;
                    fromCardIndex = true;
                }
            }

            if (row) {
                injectCaseIntoStore(
                    useCriminalStore as {
                        getState: () => { casesById?: Record<string, unknown> };
                        setState: (partial: { casesById: Record<string, unknown> }) => void;
                    },
                    trimmed,
                    row as { id?: string } & Record<string, unknown>,
                    { fromCardIndex },
                );
            }

            // ترقية خلفية إن كان الحقن من فهرس خفيف فقط (يستبدل الـ stub بالسجل الكامل)
            void storage.loadCriminalCaseRecordByIdAsync(trimmed).then((full) => {
                if (!full) return;
                injectCaseIntoStore(
                    useCriminalStore as {
                        getState: () => { casesById?: Record<string, unknown> };
                        setState: (partial: { casesById: Record<string, unknown> }) => void;
                    },
                    trimmed,
                    full as { id?: string } & Record<string, unknown>,
                    { fromCardIndex: false },
                );
            });
        })().catch(() => undefined);

        await Promise.all([modulePromise, storePromise]);
    })();

    await Promise.race([
        work,
        new Promise<void>((resolve) => {
            window.setTimeout(resolve, PRIME_BUDGET_MS);
        }),
    ]);
}
