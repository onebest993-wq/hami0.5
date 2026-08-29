import type { Page } from '@playwright/test';
import {
    HAMI_SECURE_KV_STORE,
    HAMI_SECURE_STORE_DB,
    HAMI_SECURE_STORE_VERSION,
    writeE2eSecureStoreKey,
} from './secureStoreE2EFixtures';

export const E2E_EXEC_PERSIST_ID = 'e2e-exec-storage-persist-1';
export const EXECUTION_FILES_KEY = 'executionFiles';
export const E2E_OWNER_ID = 'dev-user-uuid-1';

const SECURE_KV_STORE = HAMI_SECURE_KV_STORE;

export type E2eExecutionSeed = {
    id: string;
    fileNumber: string;
    fileYear?: string;
    directorate: string;
    executionNumber?: string;
    docNumber?: string;
    docType?: string;
    type?: string;
    status?: string;
    debtors?: Array<{ id: string; name: string; type?: string }>;
    creditors?: Array<{ id: string; name: string; isClient?: boolean }>;
    timelineEvents?: Array<{ id: string; title: string }>;
    claimType?: string;
    updatedAt: string;
};

export function buildE2eExecutionIndexRow(overrides: Partial<E2eExecutionSeed> = {}): E2eExecutionSeed {
    const now = new Date().toISOString();
    return {
        id: E2E_EXEC_PERSIST_ID,
        fileNumber: '880',
        fileYear: '2026',
        directorate: 'فهرس قديم E2E',
        executionNumber: '880',
        docNumber: '2026/تنفيذ/880',
        docType: 'حكم',
        type: 'execution',
        status: 'active',
        debtors: [{ id: 'd1', name: 'مدين E2E تخزين', type: 'natural_person' }],
        creditors: [{ id: 'c1', name: 'دائن E2E تخزين' }],
        timelineEvents: [],
        updatedAt: '2026-01-01T00:00:00.000Z',
        ...overrides,
    };
}

export function buildE2eExecutionLiveBlob(overrides: Partial<E2eExecutionSeed> = {}): E2eExecutionSeed {
    return buildE2eExecutionIndexRow({
        directorate: 'بلوب حيّ E2E',
        timelineEvents: [{ id: 'ev-persist-e2e', title: 'حدث E2E تخزين موحّد' }],
        updatedAt: '2026-06-25T14:00:00.000Z',
        ...overrides,
    });
}

function putSecureKv(key: string, value: string): Promise<void> {
    return new Promise((resolve, reject) => {
        try {
            const req = indexedDB.open(HAMI_SECURE_STORE_DB, HAMI_SECURE_STORE_VERSION);
            req.onupgradeneeded = () => {
                const db = req.result;
                if (!db.objectStoreNames.contains(SECURE_KV_STORE)) {
                    db.createObjectStore(SECURE_KV_STORE);
                }
            };
            req.onsuccess = () => {
                const db = req.result;
                const tx = db.transaction(SECURE_KV_STORE, 'readwrite');
                tx.objectStore(SECURE_KV_STORE).put(value, key);
                tx.oncomplete = () => {
                    db.close();
                    resolve();
                };
                tx.onerror = () => reject(tx.error);
            };
            req.onerror = () => reject(req.error);
        } catch (e) {
            reject(e);
        }
    });
}

const EXECUTION_INDEX_LS_KEYS = [
    EXECUTION_FILES_KEY,
    'hami-execution-files',
    'execution_files',
    'lawyer_execution_files',
] as const;

function seedExecutionStorageInitScript(
    page: Page,
    indexPayload: Record<string, unknown>,
    blobPayload: Record<string, unknown>,
): Promise<void> {
    const dossierId = String(indexPayload.id ?? blobPayload.id ?? '');
    if (!dossierId) {
        return Promise.reject(new Error('seedExecutionStorage: dossier id is required'));
    }
    const blobKey = `execution_${dossierId}`;
    return page.addInitScript(
        async ({
            filesKey,
            indexRow,
            blobKey,
            blobRow,
            legacyKeys,
            ownerId,
            dbName,
            dbVersion,
            storeName,
        }) => {
            const indexRaw = JSON.stringify([indexRow]);
            const blobRaw = JSON.stringify(blobRow);
            const ownerIndexKey = `${filesKey}:${ownerId}`;
            const scopedBlobKey = `${blobKey}:u:${ownerId}`;

            const writeLs = (key, value) => {
                try {
                    localStorage.setItem(key, value);
                } catch {
                    /* ignore */
                }
            };

            for (const k of legacyKeys) writeLs(k, indexRaw);
            writeLs(filesKey, indexRaw);
            writeLs(ownerIndexKey, indexRaw);
            try {
                for (let i = 0; i < localStorage.length; i += 1) {
                    const k = localStorage.key(i);
                    if (k && k.startsWith(`${filesKey}:`)) writeLs(k, indexRaw);
                }
            } catch {
                /* ignore */
            }
            writeLs(blobKey, blobRaw);
            writeLs(scopedBlobKey, blobRaw);

            const putKv = (key, value) =>
                new Promise((resolve) => {
                    try {
                        const req = indexedDB.open(dbName, dbVersion);
                        req.onupgradeneeded = () => {
                            const db = req.result;
                            if (!db.objectStoreNames.contains(storeName)) {
                                db.createObjectStore(storeName);
                            }
                        };
                        req.onerror = () => resolve();
                        req.onsuccess = () => {
                            const db = req.result;
                            if (!db.objectStoreNames.contains(storeName)) {
                                db.close();
                                resolve();
                                return;
                            }
                            const tx = db.transaction(storeName, 'readwrite');
                            tx.objectStore(storeName).put(value, key);
                            tx.oncomplete = () => {
                                db.close();
                                resolve();
                            };
                            tx.onerror = () => {
                                db.close();
                                resolve();
                            };
                        };
                    } catch {
                        resolve();
                    }
                });

            await Promise.all([
                putKv(filesKey, indexRaw),
                putKv(ownerIndexKey, indexRaw),
                putKv(blobKey, blobRaw),
                putKv(scopedBlobKey, blobRaw),
            ]);
        },
        {
            filesKey: EXECUTION_FILES_KEY,
            indexRow: indexPayload,
            blobKey,
            blobRow: blobPayload,
            legacyKeys: [...EXECUTION_INDEX_LS_KEYS],
            ownerId: E2E_OWNER_ID,
            dbName: HAMI_SECURE_STORE_DB,
            dbVersion: HAMI_SECURE_STORE_VERSION,
            storeName: HAMI_SECURE_KV_STORE,
        },
    );
}

/** يزرع فهرساً وبلوباً متطابقين لإضبارة مخصّصة — قبل page.goto */
export async function seedExecutionStorageForFile(
    page: Page,
    file: Record<string, unknown>,
): Promise<void> {
    const id = String(file.id ?? '').trim();
    if (!id) throw new Error('seedExecutionStorageForFile: file.id is required');
    const now = new Date().toISOString();
    const payload: Record<string, unknown> = {
        timelineEvents: [],
        seizedAssets: [],
        caseNotesLog: [],
        caseTasksPending: [],
        financialLedger: [],
        status: 'active',
        updatedAt: now,
        type: 'execution',
        ...file,
        id,
    };
    await seedExecutionStorageInitScript(page, payload, payload);
}

/** يزرع فهرساً وبلوباً متطابقين — لفتح المخزن من الرئيسية */
export async function seedSyncedExecutionStorage(page: Page): Promise<void> {
    const payload = buildE2eExecutionLiveBlob();
    await seedExecutionStorageInitScript(page, payload, payload);
}

/** يزرع فهرساً قديماً وبلوباً أحدث — يجب استدعاؤه قبل page.goto (addInitScript) */
export async function seedDivergedExecutionStorage(page: Page): Promise<void> {
    const indexRow = buildE2eExecutionIndexRow();
    const liveBlob = buildE2eExecutionLiveBlob();
    await seedExecutionStorageInitScript(page, indexRow, liveBlob);
}

export async function triggerExecutionStorageReconcile(page: Page): Promise<{
    indexRowsHealed: number;
    blobsHealed: number;
}> {
    await page.waitForFunction(
        () =>
            typeof (window as unknown as { __hamiReconcileExecutionStorage?: unknown })
                .__hamiReconcileExecutionStorage === 'function',
        undefined,
        { timeout: 30_000 },
    );
    const result = await page.evaluate(async () => {
        const fn = (
            window as unknown as {
                __hamiReconcileExecutionStorage?: () => Promise<{
                    indexRowsHealed?: number;
                    blobsHealed?: number;
                }>;
            }
        ).__hamiReconcileExecutionStorage;
        if (!fn) return { ok: false as const };
        const r = await fn();
        return { ok: true as const, ...r };
    });
    if (!result.ok) {
        throw new Error('__hamiReconcileExecutionStorage hook unavailable');
    }
    return {
        indexRowsHealed: result.indexRowsHealed ?? 0,
        blobsHealed: result.blobsHealed ?? 0,
    };
}

export async function readExecutionIndexRow(
    page: Page,
    dossierId: string = E2E_EXEC_PERSIST_ID,
): Promise<Record<string, unknown> | null> {
    const fromApp = await page.evaluate(
        ({ id }) => {
            const load = (
                window as unknown as { __hamiLoadExecutionFilesIndex?: () => unknown[] }
            ).__hamiLoadExecutionFilesIndex;
            if (typeof load !== 'function') return null;
            try {
                const rows = load();
                if (!Array.isArray(rows)) return null;
                const row = rows.find((r) => r && String((r as { id?: unknown }).id ?? '') === id);
                return row && typeof row === 'object'
                    ? ({ ...(row as Record<string, unknown>) } as Record<string, unknown>)
                    : null;
            } catch {
                return null;
            }
        },
        { id: dossierId },
    );
    if (fromApp) return fromApp;

    return page.evaluate(
        async ({ filesKey, id }) => {
            const legacyKey = 'execution_files';
            const parse = (raw: string | null | undefined): Record<string, unknown> | null => {
                if (!raw) return null;
                try {
                    const rows = JSON.parse(raw) as Array<Record<string, unknown>>;
                    return rows.find((r) => String(r.id ?? '') === id) ?? null;
                } catch {
                    return null;
                }
            };

            const score = (row: Record<string, unknown> | null): number => {
                if (!row) return 0;
                const tl = Array.isArray(row.timelineEvents) ? row.timelineEvents.length : 0;
                const ts = Date.parse(String(row.updatedAt || ''));
                return tl * 1_000_000 + (Number.isNaN(ts) ? 0 : ts);
            };

            const pickBest = (
                ...candidates: Array<Record<string, unknown> | null>
            ): Record<string, unknown> | null => {
                let best: Record<string, unknown> | null = null;
                let bestScore = -1;
                for (const c of candidates) {
                    const s = score(c);
                    if (s > bestScore) {
                        bestScore = s;
                        best = c;
                    }
                }
                return best;
            };

            const lsCandidates: Array<Record<string, unknown> | null> = [
                parse(localStorage.getItem(filesKey)),
                parse(localStorage.getItem(legacyKey)),
            ];
            try {
                for (let i = 0; i < localStorage.length; i += 1) {
                    const k = localStorage.key(i);
                    if (!k || k === filesKey || k === legacyKey) continue;
                    if (k.startsWith(`${filesKey}:`)) {
                        lsCandidates.push(parse(localStorage.getItem(k)));
                    }
                }
            } catch {
                /* ignore */
            }

            return pickBest(...lsCandidates);
        },
        { filesKey: EXECUTION_FILES_KEY, id: dossierId },
    );
}

export async function waitForExecutionIndexReconciled(page: Page): Promise<Record<string, unknown>> {
    const dossierId = E2E_EXEC_PERSIST_ID;
    const expectedTitle = buildE2eExecutionLiveBlob().timelineEvents?.[0]?.title ?? '';

    await page
        .waitForFunction(
            () =>
                typeof (window as unknown as { __hamiLoadExecutionFilesIndex?: unknown })
                    .__hamiLoadExecutionFilesIndex === 'function' &&
                typeof (window as unknown as { __hamiReconcileExecutionStorage?: unknown })
                    .__hamiReconcileExecutionStorage === 'function',
            undefined,
            { timeout: 90_000 },
        )
        .catch(async () => {
            const diag = await page.evaluate(() => {
                const w = window as unknown as Record<string, unknown>;
                return {
                    hasLoad: typeof w.__hamiLoadExecutionFilesIndex === 'function',
                    hasReconcile: typeof w.__hamiReconcileExecutionStorage === 'function',
                };
            });
            throw new Error(
                `execution reconcile hooks missing (load=${diag.hasLoad}, reconcile=${diag.hasReconcile})`,
            );
        });

    const handle = await page.waitForFunction(
        ({ id, expectedTitle }) => {
            const w = window as unknown as {
                __hamiReconcileExecutionStorage?: () => Promise<unknown>;
                __hamiLoadExecutionFilesIndex?: () => unknown[];
            };
            const attempt = async (): Promise<Record<string, unknown> | null> => {
                if (typeof w.__hamiReconcileExecutionStorage === 'function') {
                    try {
                        await w.__hamiReconcileExecutionStorage();
                    } catch {
                        /* ignore */
                    }
                }
                const load = w.__hamiLoadExecutionFilesIndex;
                if (typeof load !== 'function') return null;
                try {
                    const rows = load();
                    if (!Array.isArray(rows)) return null;
                    const row = rows.find(
                        (r) => r && String((r as { id?: unknown }).id ?? '') === id,
                    ) as Record<string, unknown> | undefined;
                    const timeline = row?.timelineEvents;
                    if (!Array.isArray(timeline) || timeline.length === 0) return null;
                    const title = (timeline[0] as { title?: string } | undefined)?.title;
                    if (expectedTitle && title !== expectedTitle) return null;
                    return row ?? null;
                } catch {
                    return null;
                }
            };
            return attempt();
        },
        { id: dossierId, expectedTitle },
        { timeout: 90_000, polling: 500 },
    );

    const row = await handle.jsonValue();
    if (!row || typeof row !== 'object') {
        const diag = await page
            .evaluate(async ({ id }) => {
                const w = window as unknown as {
                    __hamiReconcileExecutionStorage?: () => Promise<unknown>;
                    __hamiLoadExecutionFilesIndex?: () => unknown[];
                };
                let reconcileResult: unknown = null;
                try {
                    reconcileResult = await w.__hamiReconcileExecutionStorage?.();
                } catch (e) {
                    reconcileResult = String(e);
                }
                let rows: unknown = null;
                try {
                    rows = w.__hamiLoadExecutionFilesIndex?.();
                } catch (e) {
                    rows = String(e);
                }
                const match = Array.isArray(rows)
                    ? rows.find((r) => r && String((r as { id?: unknown }).id ?? '') === id)
                    : null;
                return { reconcileResult, match, rowCount: Array.isArray(rows) ? rows.length : -1 };
            }, { id: dossierId })
            .catch((e) => ({ error: String(e) }));
        throw new Error(
            `execution index was not reconciled from live blob within timeout — ${JSON.stringify(diag)}`,
        );
    }
    return row as Record<string, unknown>;
}

export const E2E_DECISION_PERSIST_CARD_ID = 'e2e-decision-persist-card-1';

/** إضبارة تنفيذ + قرار يدوي محفوظ في namespace القرارات */
export async function seedExecutionWithPersistedDecision(page: Page): Promise<void> {
    const payload = buildE2eExecutionLiveBlob({
        claimType: 'استحصال دين مالي',
        creditors: [{ id: 'c1', name: 'دائن E2E تخزين', isClient: true }],
    });
    const execId = E2E_EXEC_PERSIST_ID;
    const blobKey = `execution_${execId}`;
    const nsSlug = 'financial_debt__creditor_agent';
    const nsKey = `${blobKey}_decisions_ns_${nsSlug}`;
    const indexKey = `${blobKey}_decisions_ns_index`;
    const legacyKey = `${blobKey}_decisions`;
    const decisionRows = [
        {
            id: E2E_DECISION_PERSIST_CARD_ID,
            title: 'قرار E2E ثابت',
            body: '',
            date: '2026-06-25',
            resolvedAt: '2026-06-25',
            appealStatus: 'pending',
            executorOutcome: 'approved',
            manualExecutorLedgerEntry: true,
            domainNamespace: nsSlug,
        },
    ];
    const indexPayload = {
        v: 1,
        active: nsSlug,
        legacyMigrated: true,
        migratedAt: '2026-06-25T00:00:00.000Z',
    };

    await seedExecutionStorageInitScript(page, payload, payload);
    await page.addInitScript(
        async ({ nsKey, nsRows, indexKey, indexRow, legacyKey, ownerId, dbName, dbVersion, storeName }) => {
            const nsRaw = JSON.stringify(nsRows);
            const indexRaw = JSON.stringify(indexRow);
            const writeLs = (key, value) => {
                try {
                    localStorage.setItem(key, value);
                } catch {
                    /* ignore */
                }
            };
            writeLs(nsKey, nsRaw);
            writeLs(`${nsKey}:u:${ownerId}`, nsRaw);
            writeLs(indexKey, indexRaw);
            writeLs(`${indexKey}:u:${ownerId}`, indexRaw);
            writeLs(legacyKey, '[]');

            const putKv = (key, value) =>
                new Promise((resolve) => {
                    try {
                        const req = indexedDB.open(dbName, dbVersion);
                        req.onupgradeneeded = () => {
                            const db = req.result;
                            if (!db.objectStoreNames.contains(storeName)) {
                                db.createObjectStore(storeName);
                            }
                        };
                        req.onerror = () => resolve();
                        req.onsuccess = () => {
                            const db = req.result;
                            if (!db.objectStoreNames.contains(storeName)) {
                                db.close();
                                resolve();
                                return;
                            }
                            const tx = db.transaction(storeName, 'readwrite');
                            tx.objectStore(storeName).put(value, key);
                            tx.oncomplete = () => {
                                db.close();
                                resolve();
                            };
                            tx.onerror = () => {
                                db.close();
                                resolve();
                            };
                        };
                    } catch {
                        resolve();
                    }
                });

            await Promise.all([
                putKv(nsKey, nsRaw),
                putKv(`${nsKey}:u:${ownerId}`, nsRaw),
                putKv(indexKey, indexRaw),
                putKv(`${indexKey}:u:${ownerId}`, indexRaw),
                putKv(legacyKey, '[]'),
            ]);
        },
        {
            nsKey,
            nsRows: decisionRows,
            indexKey,
            indexRow: indexPayload,
            legacyKey,
            ownerId: E2E_OWNER_ID,
            dbName: HAMI_SECURE_STORE_DB,
            dbVersion: HAMI_SECURE_STORE_VERSION,
            storeName: HAMI_SECURE_KV_STORE,
        },
    );
}

/** يكرّر مفاتيح القرارات في IndexedDB بعد الإقلاع */
export async function mirrorPersistedDecisionKeysToIndexedDb(page: Page): Promise<void> {
    const execId = E2E_EXEC_PERSIST_ID;
    const blobKey = `execution_${execId}`;
    const nsSlug = 'financial_debt__creditor_agent';
    const nsKey = `${blobKey}_decisions_ns_${nsSlug}`;
    const indexKey = `${blobKey}_decisions_ns_index`;
    const legacyKey = `${blobKey}_decisions`;

    await page.evaluate(
        async ({ nsKey, indexKey, legacyKey, ownerId }) => {
            const readLs = (key) => localStorage.getItem(key);
            const put = (key: string, value: string) =>
                new Promise<void>((resolve, reject) => {
                    try {
                        const req = indexedDB.open('hami-secure-store', 2);
                        req.onupgradeneeded = () => {
                            const db = req.result;
                            if (!db.objectStoreNames.contains('secure_kv')) {
                                db.createObjectStore('secure_kv');
                            }
                        };
                        req.onsuccess = () => {
                            const db = req.result;
                            const tx = db.transaction('secure_kv', 'readwrite');
                            tx.objectStore('secure_kv').put(value, key);
                            tx.oncomplete = () => {
                                db.close();
                                resolve();
                            };
                            tx.onerror = () => reject(tx.error);
                        };
                        req.onerror = () => reject(req.error);
                    } catch (e) {
                        reject(e);
                    }
                });
            const nsRaw = readLs(nsKey);
            const indexRaw = readLs(indexKey);
            const legacyRaw = readLs(legacyKey);
            if (nsRaw) {
                await put(nsKey, nsRaw);
                await put(`${nsKey}:u:${ownerId}`, nsRaw);
            }
            if (indexRaw) {
                await put(indexKey, indexRaw);
                await put(`${indexKey}:u:${ownerId}`, indexRaw);
            }
            if (legacyRaw) await put(legacyKey, legacyRaw);
        },
        { nsKey, indexKey, legacyKey, ownerId: E2E_OWNER_ID },
    );
}

export async function openDecisionsHubOnDossier(
    page: Page,
    executionId: string,
    tab: 'current' | 'previous' | 'appeals' = 'previous',
): Promise<void> {
    await page.evaluate(
        ({ id, tab }) => {
            window.dispatchEvent(
                new CustomEvent('hami-open-decisions-modal', {
                    detail: { executionId: id, tab },
                }),
            );
        },
        { id: executionId, tab },
    );
}

export { putSecureKv };
