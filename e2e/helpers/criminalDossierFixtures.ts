import type { Page } from '@playwright/test';
import { expect } from '@playwright/test';
import { ensureLawyerDashboard, openLawsuitsWorkspace, seedLawyerFiles } from './civilLawsuitFixtures';

export const E2E_CRIMINAL_CASE_ID = 'e2e-criminal-case-1';
const CRIMINAL_STORE_KEY = 'hami:criminal:store';
const CRIMINAL_STORE_PERSIST_VERSION = 49;

export const CRIMINAL_E2E_TEST_IDS = {
    dossier: 'criminal-dashboard-dossier',
    back: 'criminal-dashboard-back',
    archiveTabCriminal: 'archive-tab-criminal',
    caseCard: (id: string) => `criminal-case-${id}`,
} as const;

/** إضبارة جنائية كاملة الشكل — متوافقة مع criminalStore و CriminalDashboard */
export function buildE2eCriminalCase() {
    return {
        id: E2E_CRIMINAL_CASE_ID,
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

export async function seedCriminalCases(page: Page): Promise<void> {
    const criminalCase = buildE2eCriminalCase();
    await seedLawyerFiles(page);
    await page.addInitScript(
        ({ storeKey, storeJson }) => {
            localStorage.setItem(storeKey, storeJson);
        },
        {
            storeKey: CRIMINAL_STORE_KEY,
            storeJson: JSON.stringify({
                state: {
                    casesById: {
                        [criminalCase.id]: criminalCase,
                    },
                    pendingSeveranceContext: null,
                    draft: {},
                },
                version: CRIMINAL_STORE_PERSIST_VERSION,
            }),
        },
    );
}

/** يفتح الإضبارة الجنائية من مساحة عمل الدعاوى */
export async function openCriminalDossierFromWorkspace(page: Page): Promise<void> {
    await openLawsuitsWorkspace(page);
    await page.getByTestId(CRIMINAL_E2E_TEST_IDS.archiveTabCriminal).click({ timeout: 15_000 });
    const card = page.getByTestId(CRIMINAL_E2E_TEST_IDS.caseCard(E2E_CRIMINAL_CASE_ID));
    await expect(card).toBeVisible({ timeout: 25_000 });
    await card.getByRole('button', { name: 'فتح الإضبارة' }).click({ timeout: 15_000 });
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
}
