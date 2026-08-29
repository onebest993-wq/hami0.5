import type { Page } from '@playwright/test';
import { expect } from '@playwright/test';
import { selectArchiveJurisdictionTab } from './archiveE2EFixtures';
import { openLawsuitsWorkspace, seedLawyerFiles, bootCivilLawsuitsScreenE2E, resetCivilLawsuitsScreenForE2E } from './civilLawsuitFixtures';
import { applyE2eBootHomeLayoutAtRuntime, bootToLawyerHome } from './bootFixtures';
import { dismissProductivityBlockers } from './productivityE2EFixtures';
import { writeE2eSecureStoreKey } from './secureStoreE2EFixtures';

export const E2E_CRIMINAL_CASE_ID = 'e2e-criminal-case-1';
const CRIMINAL_STORE_KEY = 'hami:criminal:store';
const CRIMINAL_META_KEY = 'hami:criminal:meta';
const CRIMINAL_STORE_PERSIST_VERSION = 49;
const E2E_LAWYER_ID = 'dev-user-uuid-1';
const CRIMINAL_BRIDGE_ACTIVATE_EVENT = 'hami:criminal-dashboard-bridge-activate';

export const CRIMINAL_E2E_TEST_IDS = {
    dossier: 'criminal-dashboard-dossier',
    back: 'criminal-dashboard-back',
    exit: 'criminal-dashboard-exit',
    headerTrash: 'criminal-header-trash',
    trashModal: 'criminal-trash-modal',
    archiveTabCriminal: 'archive-tab-criminal',
    caseCard: (id: string) => `criminal-case-${id}`,
} as const;

/** إضبارة جنائية كاملة الشكل — متوافقة مع criminalStore و CriminalDashboard */
export function buildE2eCriminalCase(ownerLawyerId: string = E2E_LAWYER_ID) {
    return {
        id: E2E_CRIMINAL_CASE_ID,
        ownerLawyerId,
        createdAt: '2026-01-01T00:00:00.000Z',
        basics: {
            role: 'وكيل المشتكي',
            ourRepresentation: 'complainant_side',
            stage: 'مرحلة التحقيق',
            legalArticle: '413',
            crimeType: 'جنحة',
        },
        location: {
            investigationCourtName: 'محكمة تحقيق الكرخ',
            investigationPapersAt: 'مركز شرطة',
            policeStationName: 'الجمهوري',
            baseRegisterNumberAndDate: '1/2026',
            investigationOfficeName: '',
            investigationDossierNumber: '',
            courtName: '',
            caseNumber: '',
            publicProsecutionNumber: '',
            trialJudgeName: '',
            nextHearingDate: '',
        },
        complainants: [
            {
                id: 'e2e-complainant-1',
                fullName: 'مشتكي E2E',
                address: '',
                phone: '',
                isJuvenile: false,
                isUnderSeven: false,
                birthDate: '',
                guardianName: '',
                guardianRelationship: '',
            },
        ],
        unknownDefendant: false,
        defendants: [
            {
                id: 'e2e-defendant-1',
                fullName: 'متهم E2E',
                status: 'موقوف',
                address: '',
                investigationStatus: 'active',
            },
        ],
        statements: [],
        timelineEvents: [],
        investigationLogs: [],
        lawyerRequests: [],
        physicalLocation: 'investigator_room',
        isMutualComplaint: false,
        legalArticleHistory: [],
        caseStage: 'investigation',
        isFrozen: false,
    };
}

export function buildE2eCriminalStoreJson(ownerLawyerId: string = E2E_LAWYER_ID) {
    const criminalCase = buildE2eCriminalCase(ownerLawyerId);
    return JSON.stringify({
        state: {
            casesById: {
                [criminalCase.id]: criminalCase,
            },
            pendingSeveranceContext: null,
            draft: {},
        },
        version: CRIMINAL_STORE_PERSIST_VERSION,
    });
}

async function resolveE2eSessionLawyerId(page: Page): Promise<string> {
    return page.evaluate(() => {
        try {
            for (const key of Object.keys(localStorage)) {
                if (!key.includes('-auth-token')) continue;
                const raw = localStorage.getItem(key);
                if (!raw) continue;
                const parsed = JSON.parse(raw) as { user?: { id?: string } };
                const id = String(parsed?.user?.id ?? '').trim();
                if (id) return id;
            }
        } catch {
            /* ignore */
        }
        return 'guest-lawyer-1';
    });
}

export async function hydrateCriminalStoreForE2E(page: Page): Promise<void> {
    const ownerLawyerId = await resolveE2eSessionLawyerId(page);
    const storeJson = buildE2eCriminalStoreJson(ownerLawyerId);
    await writeE2eSecureStoreKey(page, CRIMINAL_STORE_KEY, storeJson);
    await page.evaluate(
        async ({ storeKey, metaKey, json }) => {
            try {
                localStorage.removeItem(metaKey);
                localStorage.setItem(storeKey, json);
            } catch {
                /* ignore */
            }
            const secure = (
                window as Window & {
                    __hamiE2eSecureStore?: {
                        ensurePersistedReady: () => Promise<void>;
                        setItem: (key: string, value: string) => Promise<void>;
                        deleteItem: (key: string) => Promise<void>;
                    };
                }
            ).__hamiE2eSecureStore;
            if (secure) {
                await secure.ensurePersistedReady();
                await secure.deleteItem(metaKey);
                await secure.setItem(storeKey, json);
            }
            const criminal = (
                window as Window & {
                    __hamiE2eCriminalStore?: {
                        rehydrate: () => Promise<void>;
                    };
                }
            ).__hamiE2eCriminalStore;
            if (criminal) {
                await criminal.rehydrate();
            }
        },
        { storeKey: CRIMINAL_STORE_KEY, metaKey: CRIMINAL_META_KEY, json: storeJson },
    );
}

export async function activateCriminalDashboardBridge(page: Page): Promise<void> {
    await page.evaluate((eventName) => {
        window.dispatchEvent(new Event(eventName));
    }, CRIMINAL_BRIDGE_ACTIVATE_EVENT);
}

export async function seedCriminalCases(page: Page): Promise<void> {
    const storeJson = buildE2eCriminalStoreJson();
    await seedLawyerFiles(page);
    await page.addInitScript(
        ({ storeKey, metaKey, storeJson: json }) => {
            try {
                localStorage.removeItem(metaKey);
                localStorage.setItem(storeKey, json);
            } catch {
                /* ignore */
            }
        },
        {
            storeKey: CRIMINAL_STORE_KEY,
            metaKey: CRIMINAL_META_KEY,
            storeJson,
        },
    );
}

/** يفتح الإضبارة الجنائية من مساحة عمل الدعاوى */
export async function openCriminalDossierFromWorkspace(page: Page): Promise<void> {
    const leftover = page.getByTestId(CRIMINAL_E2E_TEST_IDS.dossier);
    if (await leftover.isVisible({ timeout: 1_000 }).catch(() => false)) {
        const exit = page.getByTestId(CRIMINAL_E2E_TEST_IDS.exit);
        const back = page.getByTestId(CRIMINAL_E2E_TEST_IDS.back);
        if (await exit.isVisible({ timeout: 2_000 }).catch(() => false)) {
            await exit.click({ timeout: 10_000 });
        } else if (await back.isVisible({ timeout: 2_000 }).catch(() => false)) {
            await back.click({ timeout: 10_000 });
        }
        await expect(leftover).toBeHidden({ timeout: 15_000 });
    }
    await openLawsuitsWorkspace(page);
    await activateCriminalDashboardBridge(page);
    await expect(async () => {
        await activateCriminalDashboardBridge(page);
        await hydrateCriminalStoreForE2E(page);
        const ids = await page.evaluate(() => {
            const criminal = (
                window as Window & {
                    __hamiE2eCriminalStore?: { caseIds: () => string[] };
                }
            ).__hamiE2eCriminalStore;
            return criminal?.caseIds() ?? [];
        });
        expect(ids).toContain(E2E_CRIMINAL_CASE_ID);
    }).toPass({ timeout: 60_000 });
    await selectArchiveJurisdictionTab(page, 'criminal');
    const card = page.getByTestId(CRIMINAL_E2E_TEST_IDS.caseCard(E2E_CRIMINAL_CASE_ID));
    await expect(card).toBeVisible({ timeout: 30_000 });
    const clickCard = async () => {
        await card.evaluate((el) => {
            const host = el as HTMLElement;
            host.scrollIntoView({ block: 'center' });
            host.click();
        });
    };
    await clickCard();

    const dossier = page.getByTestId(CRIMINAL_E2E_TEST_IDS.dossier);
    const crash = page.getByTestId('criminal-dossier-error-fallback');
    await expect(async () => {
        if (await crash.isVisible().catch(() => false)) {
            await crash.getByRole('button', { name: 'إغلاق' }).click();
            await expect(crash).toBeHidden({ timeout: 8_000 });
            await clickCard();
        }
        await expect(dossier).toBeVisible({ timeout: 12_000 });
    }).toPass({ timeout: 45_000 });
    await expect(dossier).toHaveAttribute('data-dossier-state', 'ready');
}

export async function prepareCriminalDossierE2E(page: Page): Promise<void> {
    await seedCriminalCases(page);
}

export async function bootCriminalDossierE2E(page: Page): Promise<void> {
    await bootCivilLawsuitsScreenE2E(page);
    await hydrateCriminalStoreForE2E(page);
    await page.reload({ waitUntil: 'domcontentloaded' });
    await applyE2eBootHomeLayoutAtRuntime(page);
    await bootToLawyerHome(page);
    await dismissProductivityBlockers(page);
    await resetCivilLawsuitsScreenForE2E(page);
    await hydrateCriminalStoreForE2E(page);
    await activateCriminalDashboardBridge(page);
}
