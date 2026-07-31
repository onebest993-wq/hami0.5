import type { Page } from '@playwright/test';
import { expect } from '@playwright/test';

export const E2E_EXEC_PERSIST_ID = 'e2e-exec-storage-persist-1';
export const EXECUTION_FILES_KEY = 'executionFiles';

const SECURE_STORE_DB = 'hami-secure-store';
const SECURE_STORE_VERSION = 2;
const SECURE_KV_STORE = 'secure_kv';

export type E2eExecutionSeed = {
    id: string;
    fileNumber: string;
    fileYear?: string;
    directorate: string;
    executionNumber?: string;
    docNumber?: string;
    docType?: string;
    status?: string;
    debtors?: Array<{ id: string; name: string; type?: string }>;
    creditors?: Array<{ id: string; name: string }>;
    timelineEvents?: Array<{ id: string; title: string }>;
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
            const req = indexedDB.open(SECURE_STORE_DB, SECURE_STORE_VERSION);
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

/** يزرع فهرساً وبلوباً متطابقين — لفتح المخزن من الرئيسية */
export async function seedSyncedExecutionStorage(page: Page): Promise<void> {
    const payload = buildE2eExecutionLiveBlob();
    const blobKey = `execution_${E2E_EXEC_PERSIST_ID}`;
    await page.addInitScript(
        ({ filesKey, indexPayload, blobKey, blobPayload }) => {
            const indexRaw = JSON.stringify([indexPayload]);
            for (const k of [
                filesKey,
                'hami-execution-files',
                'execution_files',
                'lawyer_execution_files',
            ]) {
                localStorage.setItem(k, indexRaw);
            }
            localStorage.setItem(blobKey, JSON.stringify(blobPayload));
        },
        {
            filesKey: EXECUTION_FILES_KEY,
            indexPayload: payload,
            blobKey,
            blobPayload: payload,
        },
    );
}

/** يزرع فهرساً قديماً وبلوباً أحدث — يُستدعى بعد الإقلاع ثم reload لضمان ترحيل التخزين */
export async function seedDivergedExecutionStorage(page: Page): Promise<void> {
    const indexRow = buildE2eExecutionIndexRow();
    const liveBlob = buildE2eExecutionLiveBlob();
    const blobKey = `execution_${E2E_EXEC_PERSIST_ID}`;

    await page.evaluate(
        ({ filesKey, indexPayload, blobKey, blobPayload }) => {
            const indexRaw = JSON.stringify([indexPayload]);
            const keys = new Set<string>([
                filesKey,
                'hami-execution-files',
                'execution_files',
                'lawyer_execution_files',
            ]);
            try {
                for (let i = 0; i < localStorage.length; i += 1) {
                    const k = localStorage.key(i);
                    if (k && k.startsWith(`${filesKey}:`)) keys.add(k);
                }
            } catch {
                /* ignore */
            }
            for (const k of keys) {
                localStorage.setItem(k, indexRaw);
            }
            localStorage.setItem(blobKey, JSON.stringify(blobPayload));
            // اسمح بإعادة ترحيل الفهرس العام → المالك بعد الزرع
            localStorage.removeItem('hami:execution:files-owner-migrated:v1');
        },
        {
            filesKey: EXECUTION_FILES_KEY,
            indexPayload: indexRow,
            blobKey,
            blobPayload: liveBlob,
        },
    );

    await page.reload({ waitUntil: 'domcontentloaded' });

    const devBypass = page.getByRole('button', { name: /تخطي المطور/i });
    if (await devBypass.isVisible({ timeout: 8_000 }).catch(() => false)) {
        await devBypass.click();
    }

    await expect(page.getByText(/جاري التحميل/i).first())
        .toBeHidden({ timeout: 25_000 })
        .catch(() => undefined);
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
    await page
        .waitForFunction(
            () =>
                typeof (window as unknown as { __hamiLoadExecutionFilesIndex?: unknown })
                    .__hamiLoadExecutionFilesIndex === 'function',
            undefined,
            { timeout: 30_000 },
        )
        .catch(() => undefined);

    // دفع مصالحة صريحة ثم انتظار ظهور أحداث البلوب في فهرس التطبيق
    await triggerExecutionStorageReconcile(page).catch(() => undefined);

    const deadline = Date.now() + 45_000;
    let ticks = 0;
    while (Date.now() < deadline) {
        const row = await readExecutionIndexRow(page);
        const timeline = row?.timelineEvents;
        if (Array.isArray(timeline) && timeline.length > 0) {
            return row as Record<string, unknown>;
        }
        ticks += 1;
        // إعادة دفع المصالحة كل ~2.5s — يغطي سباق مرآة SecureStore بعد زرع LS
        if (ticks % 5 === 0) {
            await triggerExecutionStorageReconcile(page).catch(() => undefined);
        }
        await page.waitForTimeout(500);
    }
    throw new Error('execution index was not reconciled from live blob within timeout');
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

    await page.addInitScript(
        ({ filesKey, indexPayload, blobKey, blobPayload, nsKey, nsRows, indexKey, indexRow, legacyKey }) => {
            const indexRaw = JSON.stringify([indexPayload]);
            for (const k of [
                filesKey,
                'hami-execution-files',
                'execution_files',
                'lawyer_execution_files',
            ]) {
                localStorage.setItem(k, indexRaw);
            }
            localStorage.setItem(blobKey, JSON.stringify(blobPayload));
            localStorage.setItem(nsKey, JSON.stringify(nsRows));
            localStorage.setItem(indexKey, JSON.stringify(indexRow));
            localStorage.setItem(legacyKey, '[]');
        },
        {
            filesKey: EXECUTION_FILES_KEY,
            indexPayload: payload,
            blobKey,
            blobPayload: payload,
            nsKey,
            nsRows: decisionRows,
            indexKey,
            indexRow: indexPayload,
            legacyKey,
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
        async ({ nsKey, indexKey, legacyKey }) => {
            const readLs = (key: string) => localStorage.getItem(key);
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
            if (nsRaw) await put(nsKey, nsRaw);
            if (indexRaw) await put(indexKey, indexRaw);
            if (legacyRaw) await put(legacyKey, legacyRaw);
        },
        { nsKey, indexKey, legacyKey },
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
