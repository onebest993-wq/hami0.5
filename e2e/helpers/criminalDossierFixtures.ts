import type { Page } from '@playwright/test';
import { expect } from '@playwright/test';
import { selectArchiveJurisdictionTab } from './archiveE2EFixtures';
import { ensureLawyerDashboard, openLawsuitsWorkspace, seedLawyerFiles } from './civilLawsuitFixtures';
import { writeE2eSecureStoreKey } from './secureStoreE2EFixtures';

export const E2E_CRIMINAL_CASE_ID = 'e2e-criminal-case-1';
const CRIMINAL_STORE_KEY = 'hami:criminal:store';
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
export function buildE2eCriminalCase() {
    return {
        id: E2E_CRIMINAL_CASE_ID,
        ownerLawyerId: E2E_LAWYER_ID,
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

export function buildE2eCriminalStoreJson() {
    const criminalCase = buildE2eCriminalCase();
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

export async function hydrateCriminalStoreForE2E(page: Page): Promise<void> {
    await writeE2eSecureStoreKey(page, CRIMINAL_STORE_KEY, buildE2eCriminalStoreJson());
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
        ({ storeKey, storeJson: json }) => {
            localStorage.setItem(storeKey, json);
        },
        {
            storeKey: CRIMINAL_STORE_KEY,
            storeJson,
        },
    );
}

/** يفتح الإضبارة الجنائية من مساحة عمل الدعاوى */
export async function openCriminalDossierFromWorkspace(page: Page): Promise<void> {
    await openLawsuitsWorkspace(page);
    await activateCriminalDashboardBridge(page);
    await selectArchiveJurisdictionTab(page, 'criminal');
    const card = page.getByTestId(CRIMINAL_E2E_TEST_IDS.caseCard(E2E_CRIMINAL_CASE_ID));
    await expect(card).toBeVisible({ timeout: 45_000 });
    await card.evaluate((el) => (el as HTMLButtonElement).click());
    await expect(page.getByTestId(CRIMINAL_E2E_TEST_IDS.dossier)).toBeVisible({ timeout: 30_000 });
    await expect(page.getByTestId(CRIMINAL_E2E_TEST_IDS.dossier)).toHaveAttribute(
        'data-dossier-state',
        'ready',
    );
}

export async function prepareCriminalDossierE2E(page: Page): Promise<void> {
    await seedCriminalCases(page);
}

export async function bootCriminalDossierE2E(page: Page): Promise<void> {
    await page.goto('/');
    await ensureLawyerDashboard(page);
    await hydrateCriminalStoreForE2E(page);
    await page.reload({ waitUntil: 'domcontentloaded' });
    await ensureLawyerDashboard(page);
    await activateCriminalDashboardBridge(page);
}
