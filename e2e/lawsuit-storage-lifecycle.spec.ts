import { expect, test, type Page } from '@playwright/test';
import {
    bootCivilLawsuitsE2E,
    E2E_CIVIL_FILE_ID,
    openLawsuitsWorkspace,
    prepareCivilLawsuitsE2E,
    rebootLawyerDashboardAfterReload,
} from './helpers/civilLawsuitFixtures';
import { selectArchiveLifecycleView } from './helpers/archiveE2EFixtures';

const ACTIVE_KEY = 'lawyer_files_active';
const ARCHIVED_KEY = 'lawyer_files_archived';
const TRASH_KEY = 'lawyer_files_trash';
const MONOLITH_KEY = 'lawyer_files';
const TOMBSTONES_KEY = 'hami:lawsuit:dossier-tombstones:v1';
const FILE_ID = String(E2E_CIVIL_FILE_ID);

async function readSecureArray(page: Page, key: string): Promise<Array<Record<string, unknown>>> {
    return page.evaluate(async (storageKey) => {
        const bridge = (window as Window & {
            __hamiE2eSecureStore?: {
                getItem: (key: string) => Promise<string | null>;
                getItemFromDisk?: (key: string) => Promise<string | null>;
            };
        }).__hamiE2eSecureStore;
        let raw: string | null = null;
        if (bridge?.getItemFromDisk) {
            raw = await bridge.getItemFromDisk(storageKey);
        } else if (bridge) {
            raw = await bridge.getItem(storageKey);
        } else {
            const mod = await import('/src/app/services/SecureStoreService.ts');
            const service = mod.default;
            raw = await service.getItem(storageKey);
        }
        if (!raw) return [];
        const parsed: unknown = JSON.parse(raw);
        return Array.isArray(parsed) ? (parsed as Array<Record<string, unknown>>) : [];
    }, key);
}

function ids(rows: Array<Record<string, unknown>>): string[] {
    return rows.map((row) => String(row.id ?? row)).sort();
}

function openWorkspace(page: Page) {
    return page.locator('[data-testid="lawsuits-workspace"][data-open="true"]:visible');
}

async function reloadToLawsuits(page: Page) {
    await page.reload({ waitUntil: 'domcontentloaded' });
    await rebootLawyerDashboardAfterReload(page);
    await openLawsuitsWorkspace(page);
    await expect(openWorkspace(page)).toBeVisible({ timeout: 30_000 });
}

async function dumpLifecycle(page: Page): Promise<string> {
    return page.evaluate(async () => {
        const w = window as Window & {
            __hamiLawsuitLifecycleLast?: unknown;
            __hamiLawsuitLifecycleLog?: unknown;
            __hamiE2eSecureStore?: {
                getItem: (key: string) => Promise<string | null>;
            };
        };
        const keys = [
            'lawyer_files_active',
            'lawyer_files_trash',
            'lawyer_files_index',
            'lawyer_files',
        ];
        const summarize = (raw: string | null) => {
            if (raw == null) return null;
            return {
                len: raw.length,
                prefix: raw.slice(0, 24),
                enc: raw.startsWith('hami_enc_v2:'),
            };
        };
        const idbGet = (dbName: string, version: number, storeName: string, key: string) =>
            new Promise<string | null>((resolve) => {
                try {
                    const req = indexedDB.open(dbName, version);
                    req.onerror = () => resolve(null);
                    req.onsuccess = () => {
                        const db = req.result;
                        if (!db.objectStoreNames.contains(storeName)) {
                            db.close();
                            resolve(null);
                            return;
                        }
                        const tx = db.transaction(storeName, 'readonly');
                        const getReq = tx.objectStore(storeName).get(key);
                        getReq.onsuccess = () => {
                            db.close();
                            const val = getReq.result;
                            resolve(typeof val === 'string' ? val : val == null ? null : 'non-string');
                        };
                        getReq.onerror = () => {
                            db.close();
                            resolve(null);
                        };
                    };
                } catch {
                    resolve(null);
                }
            });
        const cryptoRecords = await new Promise<Array<Record<string, unknown>>>((resolve) => {
            try {
                const req = indexedDB.open('hami-crypto-keystore', 1);
                req.onerror = () => resolve([]);
                req.onsuccess = () => {
                    const db = req.result;
                    if (!db.objectStoreNames.contains('crypto_keys')) {
                        db.close();
                        resolve([]);
                        return;
                    }
                    const tx = db.transaction('crypto_keys', 'readonly');
                    const getReq = tx.objectStore('crypto_keys').getAll();
                    getReq.onsuccess = () => {
                        db.close();
                        const rows = Array.isArray(getReq.result) ? getReq.result : [];
                        resolve(
                            rows.map((row: { id?: unknown; key?: unknown; raw?: unknown; v?: unknown }) => ({
                                id: row?.id ?? null,
                                v: row?.v ?? null,
                                hasCryptoKey: typeof CryptoKey !== 'undefined' && row?.key instanceof CryptoKey,
                                rawLen: typeof row?.raw === 'string' ? row.raw.length : 0,
                            })),
                        );
                    };
                    getReq.onerror = () => {
                        db.close();
                        resolve([]);
                    };
                };
            } catch {
                resolve([]);
            }
        });
        const decrypted: Record<string, string | null> = {};
        const local: Record<string, ReturnType<typeof summarize>> = {};
        const idb: Record<string, ReturnType<typeof summarize>> = {};
        for (const key of keys) {
            decrypted[key] = w.__hamiE2eSecureStore
                ? await w.__hamiE2eSecureStore.getItem(key)
                : localStorage.getItem(key);
            local[key] = summarize(localStorage.getItem(key));
            idb[key] = summarize(await idbGet('hami-secure-store', 2, 'secure_kv', key));
        }
        return JSON.stringify({
            probe: w.__hamiLawsuitLifecycleLast ?? null,
            log: w.__hamiLawsuitLifecycleLog ?? [],
            decrypted,
            local,
            idb,
            cryptoRecords,
            skipSeed: sessionStorage.getItem('hami:e2e-lawsuit-segments-seeded'),
            authLs: (() => {
                try {
                    for (let i = 0; i < localStorage.length; i++) {
                        const key = localStorage.key(i);
                        if (!key || !key.includes('-auth-token')) continue;
                        const parsed = JSON.parse(localStorage.getItem(key) ?? 'null') as {
                            user?: { id?: string };
                        } | null;
                        if (parsed?.user?.id) return parsed.user.id;
                    }
                } catch {
                    /* ignore */
                }
                return null;
            })(),
            mockUser: (() => {
                try {
                    const raw = localStorage.getItem('hami:dev-mock-user');
                    if (!raw) return null;
                    return (JSON.parse(raw) as { id?: string }).id ?? null;
                } catch {
                    return null;
                }
            })(),
            dialog: Boolean(document.querySelector('[data-testid="lawsuit-trash-confirm-dialog"]')),
            phase: document
                .querySelector('[data-testid="lawsuit-trash-confirm-dialog"]')
                ?.getAttribute('data-lifecycle-commit'),
            workspaceOpen: Boolean(
                document.querySelector('[data-testid="lawsuits-workspace"][data-open="true"]'),
            ),
            card: Boolean(document.querySelector('[data-testid="lawsuit-file-990001"]')),
        });
    });
}

async function confirmMoveToTrash(page: Page) {
    const workspace = openWorkspace(page);
    await expect(workspace.getByTestId(`lawsuit-file-${FILE_ID}`)).toBeVisible({
        timeout: 45_000,
    });
    await workspace.getByTestId(`lawsuit-file-${FILE_ID}-trash`).click();
    await expect(page.getByTestId('lawsuit-trash-confirm-dialog')).toBeVisible({
        timeout: 15_000,
    });
    await page.getByTestId('lawsuit-trash-confirm-submit').click();
    await expect(openWorkspace(page)).toBeVisible();
    try {
        await expect.poll(async () => ids(await readSecureArray(page, TRASH_KEY)), {
            timeout: 25_000,
        }).toContain(FILE_ID);
    } catch (error) {
        throw new Error(`${String(error)}\nDUMP ${await dumpLifecycle(page)}`);
    }
    expect(ids(await readSecureArray(page, ACTIVE_KEY))).not.toContain(FILE_ID);
    try {
        await expect(page.getByTestId('lawsuit-trash-confirm-dialog')).toBeHidden({
            timeout: 20_000,
        });
    } catch (error) {
        throw new Error(`${String(error)}\nDUMP ${await dumpLifecycle(page)}`);
    }
    if (!(await openWorkspace(page).isVisible())) {
        await openLawsuitsWorkspace(page);
    }
    await expect(openWorkspace(page)).toBeVisible({ timeout: 30_000 });
    await expect(openWorkspace(page).getByTestId(`lawsuit-file-${FILE_ID}`)).toBeHidden({
        timeout: 20_000,
    });
}

test.describe('lawsuit storage lifecycle — real browser disk contract', () => {
    test.describe.configure({ timeout: 300_000 });

    test.beforeEach(async ({ page }) => {
        page.on('console', (msg) => {
            const text = msg.text();
            if (text.includes('[lawsuit-lifecycle]') || text.includes('تعذّر')) {
                console.log(`browser: ${text}`);
            }
        });
        await prepareCivilLawsuitsE2E(page);
        await bootCivilLawsuitsE2E(page);
    });

    test('trash → reload → restore → reload → permanent delete → reload', async ({ page }) => {
        await openLawsuitsWorkspace(page);
        await confirmMoveToTrash(page);

        await reloadToLawsuits(page);
        try {
            await expect.poll(async () => ids(await readSecureArray(page, TRASH_KEY)), {
                timeout: 25_000,
            }).toContain(FILE_ID);
        } catch (error) {
            throw new Error(`${String(error)}\nDUMP ${await dumpLifecycle(page)}`);
        }
        expect(ids(await readSecureArray(page, ACTIVE_KEY))).not.toContain(FILE_ID);
        await expect(openWorkspace(page).getByTestId(`lawsuit-file-${FILE_ID}`)).toBeHidden();
        await selectArchiveLifecycleView(page, 'trash');
        await expect(openWorkspace(page).getByTestId(`lawsuit-file-${FILE_ID}`)).toBeVisible({
            timeout: 20_000,
        });

        await openWorkspace(page).getByTestId(`lawsuit-file-${FILE_ID}-restore`).click();
        try {
            await expect.poll(async () => ids(await readSecureArray(page, ACTIVE_KEY)), {
                timeout: 25_000,
            }).toContain(FILE_ID);
        } catch (error) {
            throw new Error(`${String(error)}\nDUMP ${await dumpLifecycle(page)}`);
        }
        await expect(openWorkspace(page).getByTestId(`lawsuit-file-${FILE_ID}-restore`)).toBeHidden({
            timeout: 20_000,
        });
        expect(ids(await readSecureArray(page, TRASH_KEY))).not.toContain(FILE_ID);

        await reloadToLawsuits(page);
        await expect(openWorkspace(page).getByTestId(`lawsuit-file-${FILE_ID}`)).toBeVisible({
            timeout: 30_000,
        });

        await confirmMoveToTrash(page);
        await selectArchiveLifecycleView(page, 'trash');
        await expect(page.getByTestId(`lawsuit-file-${FILE_ID}-select`)).toBeVisible({
            timeout: 20_000,
        });
        await page.getByTestId(`lawsuit-file-${FILE_ID}-select`).click();
        await page.getByTestId('lawsuits-trash-permanent-delete').click();
        await expect(page.getByTestId('lawsuit-permanent-delete-dialog')).toBeVisible();
        await page.getByTestId('lawsuit-permanent-delete-confirm').click();
        await expect(page.getByTestId('lawsuit-permanent-delete-dialog')).toBeHidden({
            timeout: 20_000,
        });

        for (const key of [ACTIVE_KEY, ARCHIVED_KEY, TRASH_KEY, MONOLITH_KEY]) {
            try {
                await expect.poll(async () => ids(await readSecureArray(page, key)), {
                    timeout: 15_000,
                }).not.toContain(FILE_ID);
            } catch (error) {
                throw new Error(`${String(error)}\nkey=${key}\nDUMP ${await dumpLifecycle(page)}`);
            }
        }
        await expect
            .poll(async () => (await readSecureArray(page, TOMBSTONES_KEY)).map(String))
            .toContain(FILE_ID);

        await reloadToLawsuits(page);
        await expect(openWorkspace(page).getByTestId(`lawsuit-file-${FILE_ID}`)).toBeHidden();
        await selectArchiveLifecycleView(page, 'trash');
        await expect(openWorkspace(page).getByTestId(`lawsuit-file-${FILE_ID}`)).toBeHidden();
    });
});
