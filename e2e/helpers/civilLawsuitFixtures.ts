import type { Page } from '@playwright/test';
import { expect } from '@playwright/test';

export const E2E_CIVIL_FILE_ID = 990_001;
export const LAWYER_FILES_KEY = 'lawyer_files';
const SUPABASE_AUTH_KEY = 'sb-wldjvjnodvyodmgbgzab-auth-token';
const LAST_SCREEN_KEY = 'hami:last-screen';

/** ملف دعوى مدنية كامل الشكل — متوافق مع isFileData و SmartFileModal */
export function buildE2eCivilLawsuitFile() {
    return {
        id: E2E_CIVIL_FILE_ID,
        type: 'lawsuit',
        status: 'active',
        caseNo: '100/2026',
        court: 'محكمة اختبار',
        docType: 'مدنية',
        date: '1/1/2026',
        parties: [{ id: 1, name: 'مدعي اختبار', role: 'مدعي', isClient: true, side: 'right' }],
        history: [],
        notes: [],
        images: [],
        stages: [
            {
                id: 's1',
                name: 'البداءة',
                stageName: 'البداءة',
                status: 'active',
                caseNo: '100/2026',
                court: 'محكمة اختبار',
                parties: [{ id: 1, name: 'مدعي اختبار', role: 'مدعي', isClient: true, side: 'right' }],
                timeline: [],
                tasks: [],
            },
        ],
        activeStageIndex: 0,
    };
}

export async function seedLawyerFiles(page: Page) {
    await page.addInitScript(
        ({ storageKey, file, authKey, lastScreenKey }) => {
            let files: unknown[] = [];
            try {
                const raw = localStorage.getItem(storageKey);
                if (raw) {
                    const parsed = JSON.parse(raw);
                    if (Array.isArray(parsed)) files = parsed;
                }
            } catch {
                /* ignore */
            }
            const hasSeed = files.some(
                (f) => f && typeof f === 'object' && (f as { id?: number }).id === file.id,
            );
            if (!hasSeed) {
                localStorage.setItem(storageKey, JSON.stringify([file]));
            }
            sessionStorage.setItem(lastScreenKey, 'lawyer');
            const expiresAt = Math.floor(Date.now() / 1000) + 60 * 60;
            localStorage.setItem(
                authKey,
                JSON.stringify({
                    access_token: 'e2e-dev-access-token',
                    refresh_token: 'e2e-dev-refresh-token',
                    expires_at: expiresAt,
                    expires_in: 3600,
                    token_type: 'bearer',
                    user: {
                        id: 'dev-user-uuid-1',
                        email: 'dev@local',
                        role: 'authenticated',
                        user_metadata: { role: 'lawyer', fullName: 'E2E Dev', systemRole: 'lawyer' },
                    },
                }),
            );
        },
        {
            storageKey: LAWYER_FILES_KEY,
            file: buildE2eCivilLawsuitFile(),
            authKey: SUPABASE_AUTH_KEY,
            lastScreenKey: LAST_SCREEN_KEY,
        },
    );
}

/** يصل إلى لوحة المحامي الرئيسية بعد splash / auth / إضبارة مفتوحة */
export async function ensureLawyerDashboard(page: Page) {
    const hub = page.getByTestId('hub-archive-lawsuit');
    if (await hub.isVisible().catch(() => false)) {
        return;
    }

    const dossierBack = page.getByTestId('smart-file-back');
    if (await dossierBack.isVisible({ timeout: 3_000 }).catch(() => false)) {
        await dossierBack.click();
        if (await hub.isVisible({ timeout: 10_000 }).catch(() => false)) {
            return;
        }
    }

    await page
        .waitForFunction(
            () => {
                const hasHub = !!document.querySelector('[data-testid="hub-archive-lawsuit"]');
                const hasBypass = Array.from(document.querySelectorAll('button')).some((b) =>
                    (b.textContent || '').includes('تخطي المطور'),
                );
                return hasHub || hasBypass;
            },
            { timeout: 25_000 },
        )
        .catch(() => undefined);

    if (await hub.isVisible().catch(() => false)) {
        return;
    }

    const devBypass = page.getByRole('button', { name: /تخطي المطور/i });
    if (await devBypass.isVisible({ timeout: 5_000 }).catch(() => false)) {
        await devBypass.click();
    }

    await expect(hub).toBeVisible({ timeout: 45_000 });
}

/** @deprecated use ensureLawyerDashboard */
export async function bypassDevLogin(page: Page) {
    await ensureLawyerDashboard(page);
}

export async function openCivilDossier(page: Page) {
    await page.getByTestId('hub-archive-lawsuit').click();
    await expect(page.getByTestId('lawsuits-workspace')).toBeVisible({ timeout: 15_000 });
    await page.getByTestId(`lawsuit-file-${E2E_CIVIL_FILE_ID}`).click();
    await expect(page.getByTestId('smart-file-dossier')).toBeVisible({ timeout: 20_000 });
}

export const E2E_TASK_TITLE = 'مهمة E2E إدارية';

/** إضافة مهمة إدارية داخل الإضبارة المفتوحة */
export async function addAdministrativeTask(page: Page, title: string = E2E_TASK_TITLE) {
    const addBtn = page.getByTestId('smart-file-task-add');
    await addBtn.scrollIntoViewIfNeeded();
    await addBtn.click();
    await expect(page.getByTestId('smart-file-task-modal')).toBeVisible({ timeout: 10_000 });
    await page.getByTestId('smart-file-task-title').fill(title);
    await page.getByTestId('smart-file-task-submit').click();
    await expect(page.getByTestId('smart-file-task-modal')).toBeHidden({ timeout: 10_000 });
    await expect(page.getByText(title)).toBeVisible({ timeout: 10_000 });
}

export async function readLawyerFilesFromPage(page: Page): Promise<unknown[]> {
    return page.evaluate(
        async ({ storageKey }) => {
            const parse = (raw: string | null) => {
                if (!raw) return [];
                try {
                    const parsed = JSON.parse(raw);
                    return Array.isArray(parsed) ? parsed : [];
                } catch {
                    return [];
                }
            };

            const fromLs = parse(localStorage.getItem(storageKey));
            if (fromLs.length > 0) return fromLs;

            const fromIdb = await new Promise<string | null>((resolve) => {
                try {
                    const req = indexedDB.open('hami-secure-store', 1);
                    req.onerror = () => resolve(null);
                    req.onsuccess = () => {
                        const db = req.result;
                        if (!db.objectStoreNames.contains('secure_kv')) {
                            db.close();
                            resolve(null);
                            return;
                        }
                        const tx = db.transaction('secure_kv', 'readonly');
                        const getReq = tx.objectStore('secure_kv').get(storageKey);
                        getReq.onsuccess = () => {
                            db.close();
                            const val = getReq.result;
                            resolve(typeof val === 'string' ? val : null);
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

            return parse(fromIdb);
        },
        { storageKey: LAWYER_FILES_KEY },
    );
}

export function extractTaskTitlesFromFile(file: unknown): string[] {
    if (!file || typeof file !== 'object') return [];
    const f = file as Record<string, unknown>;
    const titles: string[] = [];
    const pushFrom = (list: unknown) => {
        if (!Array.isArray(list)) return;
        for (const t of list) {
            if (t && typeof t === 'object' && typeof (t as { title?: string }).title === 'string') {
                titles.push((t as { title: string }).title);
            }
        }
    };
    pushFrom(f.tasks);
    if (Array.isArray(f.stages)) {
        for (const stage of f.stages) {
            if (stage && typeof stage === 'object') {
                pushFrom((stage as { tasks?: unknown }).tasks);
            }
        }
    }
    return titles;
}

export async function waitForTaskPersisted(page: Page, fileId: number, title: string, timeoutMs = 8_000) {
    const deadline = Date.now() + timeoutMs;
    while (Date.now() < deadline) {
        const files = await readLawyerFilesFromPage(page);
        const file = files.find((f) => (f as { id?: number }).id === fileId);
        if (extractTaskTitlesFromFile(file).includes(title)) return;
        await page.waitForTimeout(400);
    }
    throw new Error(`Task "${title}" not found in ${LAWYER_FILES_KEY} within ${timeoutMs}ms`);
}
