/**
 * E2E fixtures — مزامنة سحابة الدعاوى (mock BFF + استدعاء cloudSyncEngine على dev)
 */
import type { Page, Route } from '@playwright/test';
import {
    buildE2eCivilLawsuitFile,
    buildE2eSecondCivilLawsuitFile,
    E2E_CIVIL_FILE_ID,
    E2E_CIVIL_FILE_ID_2,
    LAWYER_FILES_KEY,
    seedLawyerFiles,
    SUPABASE_AUTH_KEY,
} from './civilLawsuitFixtures';
import { prepareProductivityE2E } from './productivityE2EFixtures';
import { writeE2eSecureStoreKey } from './secureStoreE2EFixtures';

const LAWSUIT_TOMBSTONES_KEY = 'hami:lawsuit:dossier-tombstones:v1';

export type MockLawsuitCloudRow = {
    external_id: string;
    case_no?: string;
    court?: string;
    stage?: string;
    status?: string;
    updated_at?: string;
};

type LawsuitCloudRouteState = {
    rows: MockLawsuitCloudRow[];
    upserts: unknown[];
};

function lawsuitListBody(rows: MockLawsuitCloudRow[]) {
    return JSON.stringify({ ok: true, rows });
}

export async function installLawsuitCloudSyncRoutes(
    page: Page,
    initialRows: MockLawsuitCloudRow[] = [],
): Promise<LawsuitCloudRouteState> {
    const state: LawsuitCloudRouteState = { rows: [...initialRows], upserts: [] };

    await page.route('**/api/auth/session**', async (route) => {
        await route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify({
                ok: true,
                session: { user: { id: 'e2e-lawyer-1', email: 'e2e@hami.test' } },
            }),
        });
    });

    await page.route('**/api/lawsuit-files/list**', async (route: Route) => {
        await route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: lawsuitListBody(state.rows),
        });
    });

    await page.route('**/api/lawsuit-files/upsert**', async (route: Route) => {
        try {
            const body = route.request().postDataJSON() as { external_id?: string };
            state.upserts.push(body);
        } catch {
            /* ignore */
        }
        await route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify({ ok: true }),
        });
    });

    await page.route('**/api/lawsuit-files/delete**', async (route: Route) => {
        await route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify({ ok: true }),
        });
    });

    return state;
}

export async function prepareLawsuitCloudSyncE2E(page: Page): Promise<LawsuitCloudRouteState> {
    await prepareProductivityE2E(page);
    await page.addInitScript(() => {
        try {
            const key = 'lawyer_settings';
            const raw = localStorage.getItem(key);
            const settings = raw ? (JSON.parse(raw) as Record<string, unknown>) : {};
            const security = (settings.security as Record<string, unknown> | undefined) ?? {};
            security.localOnlyMode = false;
            settings.security = security;
            localStorage.setItem(key, JSON.stringify(settings));
        } catch {
            /* ignore */
        }
    });
    await seedLawyerFiles(page);
    return installLawsuitCloudSyncRoutes(page);
}

/** يتطلّب dev server (E2E_USE_PREVIEW=0) — لا يعمل على preview المجمّع */
export async function ensureE2eLawyerAuthSession(page: Page): Promise<void> {
    await page.evaluate((authKey) => {
        const expiresAt = Math.floor(Date.now() / 1000) + 60 * 60;
        localStorage.setItem(
            authKey,
            JSON.stringify({
                access_token: 'e2e-dev-access-token-with-length-ok-abc',
                refresh_token: 'e2e-dev-refresh-token',
                expires_at: expiresAt,
                expires_in: 3600,
                token_type: 'bearer',
                user: {
                    id: 'dev-user-uuid-1',
                    email: 'dev@local',
                    role: 'authenticated',
                    user_metadata: { accountType: 'lawyer', fullName: 'E2E Dev' },
                },
            }),
        );
    }, SUPABASE_AUTH_KEY);
}

export async function runLawsuitCloudSyncInPage(page: Page): Promise<{
    ok: boolean;
    skipped?: boolean;
    error?: string;
}> {
    return page.evaluate(async () => {
        try {
            const mod = await import('/src/app/services/cloudSyncEngine.ts');
            const can = await mod.canRunCloudSync({ allowWhenRealtimeActive: true });
            if (!can) {
                return { ok: false, skipped: true, error: 'canRunCloudSync=false' };
            }
            const result = await mod.performCloudSyncBucket('lawyer_files');
            return {
                ok: Boolean(result.ok),
                skipped: Boolean(result.skipped),
                error: result.error instanceof Error ? result.error.message : result.error ? String(result.error) : undefined,
            };
        } catch (err) {
            return { ok: false, error: err instanceof Error ? err.message : String(err) };
        }
    });
}

export async function markLawsuitTombstoneInPage(page: Page, dossierId: string | number): Promise<void> {
    const id = String(dossierId).trim();
    const existing = await readSecureStoreJson(page, LAWSUIT_TOMBSTONES_KEY);
    const ids = Array.isArray(existing)
        ? existing.map((x) => String(x ?? '').trim()).filter(Boolean)
        : [];
    if (!ids.includes(id)) ids.push(id);
    await writeE2eSecureStoreKey(page, LAWSUIT_TOMBSTONES_KEY, JSON.stringify(ids));
}

export async function readSecureStoreJson(page: Page, key: string): Promise<unknown> {
    return page.evaluate(async (storageKey) => {
        const WEB_DB_NAME = 'hami-secure-store';
        const WEB_STORE_NAME = 'secure_kv';
        let raw: string | null = null;
        try {
            raw = localStorage.getItem(storageKey);
        } catch {
            /* ignore */
        }
        if (raw) {
            try {
                return JSON.parse(raw) as unknown;
            } catch {
                return raw;
            }
        }
        return await new Promise<unknown>((resolve) => {
            try {
                const req = indexedDB.open(WEB_DB_NAME, 1);
                req.onerror = () => resolve(null);
                req.onsuccess = () => {
                    const db = req.result;
                    if (!db.objectStoreNames.contains(WEB_STORE_NAME)) {
                        db.close();
                        resolve(null);
                        return;
                    }
                    const tx = db.transaction(WEB_STORE_NAME, 'readonly');
                    const getReq = tx.objectStore(WEB_STORE_NAME).get(storageKey);
                    getReq.onsuccess = () => {
                        const value = getReq.result;
                        db.close();
                        if (typeof value !== 'string') {
                            resolve(value ?? null);
                            return;
                        }
                        try {
                            resolve(JSON.parse(value) as unknown);
                        } catch {
                            resolve(value);
                        }
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
    }, key);
}

export async function seedLawsuitSegmentsInPage(page: Page): Promise<void> {
    const active = { ...buildE2eCivilLawsuitFile(), id: String(E2E_CIVIL_FILE_ID), status: 'active' as const };
    const archived = {
        ...buildE2eSecondCivilLawsuitFile(),
        id: String(E2E_CIVIL_FILE_ID_2),
        status: 'archived' as const,
    };
    const activeId = String(E2E_CIVIL_FILE_ID);
    const archivedId = String(E2E_CIVIL_FILE_ID_2);
    const index = {
        v: 1 as const,
        entries: {
            [activeId]: { segment: 'active' as const, status: 'active' as const },
            [archivedId]: { segment: 'archived' as const, status: 'archived' as const },
        },
        counts: { active: 1, archived: 1, trash: 0 },
    };

    await writeE2eSecureStoreKey(page, 'lawyer_files_active', JSON.stringify([active]));
    await writeE2eSecureStoreKey(page, 'lawyer_files_archived', JSON.stringify([archived]));
    await writeE2eSecureStoreKey(page, 'lawyer_files_trash', JSON.stringify([]));
    await writeE2eSecureStoreKey(page, 'lawyer_files_index', JSON.stringify(index));
    await writeE2eSecureStoreKey(page, LAWYER_FILES_KEY, JSON.stringify([active, archived]));
    await page.evaluate(async ({ active, archived, index, mirrorKey }) => {
        const mod = await import('/src/app/services/SecureStoreService.ts');
        const Svc = mod.default ?? mod.SecureStoreService;
        Svc.setItemSync('lawyer_files_active', JSON.stringify([active]));
        Svc.setItemSync('lawyer_files_archived', JSON.stringify([archived]));
        Svc.setItemSync('lawyer_files_trash', JSON.stringify([]));
        Svc.setItemSync('lawyer_files_index', JSON.stringify(index));
        Svc.setItemSync(mirrorKey, JSON.stringify([active, archived]));
        await Svc.ensurePersistedReady?.();
    }, { active, archived, index, mirrorKey: LAWYER_FILES_KEY });
}

export async function readLawsuitIdsFromSegment(page: Page, segmentKey: string): Promise<string[]> {
    return page.evaluate(async (key) => {
        const mod = await import('/src/app/services/SecureStoreService.ts');
        const Svc = mod.default ?? mod.SecureStoreService;
        await Svc.ensurePersistedReady?.();
        const raw = Svc.getItemSync(key);
        if (!raw) return [];
        try {
            const parsed = JSON.parse(raw) as unknown;
            if (!Array.isArray(parsed)) return [];
            return parsed
                .map((row) => (row && typeof row === 'object' ? String((row as { id?: unknown }).id ?? '') : ''))
                .filter(Boolean);
        } catch {
            return [];
        }
    }, segmentKey);
}

export async function bootLawsuitCloudSyncE2E(page: Page): Promise<LawsuitCloudRouteState> {
    const routes = await prepareLawsuitCloudSyncE2E(page);
    await page.goto('/', { waitUntil: 'domcontentloaded' });
    const active = { ...buildE2eCivilLawsuitFile(), id: String(E2E_CIVIL_FILE_ID) };
    await writeE2eSecureStoreKey(page, LAWYER_FILES_KEY, JSON.stringify([active]));
    return routes;
}
