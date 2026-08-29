/**
 * E2E: إجراءات الدعوى المدنية داخل الإضبارة (مهام إدارية + استمرارية)
 */
import { test, expect } from '@playwright/test';
import {
    E2E_TASK_TITLE,
    addAdministrativeTask,
    bootCivilLawsuitsScreenE2E,
    closeSmartFileDossierToHub,
    openCivilDossier,
    prepareCivilLawsuitsE2E,
} from './helpers/civilLawsuitFixtures';

test.describe('Civil lawsuit procedural', () => {
    test.describe.configure({ timeout: 90_000 });
    test.beforeEach(async ({ page }) => {
        await prepareCivilLawsuitsE2E(page);
        await bootCivilLawsuitsScreenE2E(page);
    });

    test('adds administrative task in dossier', async ({ page }) => {
        await openCivilDossier(page);
        await addAdministrativeTask(page, E2E_TASK_TITLE);
    });

    test('task survives closing and reopening dossier', async ({ page }) => {
        await openCivilDossier(page);
        await addAdministrativeTask(page, E2E_TASK_TITLE);
        await closeSmartFileDossierToHub(page);
        await expect(page.getByTestId('hub-archive-lawsuit')).toBeVisible({ timeout: 15_000 });
        await openCivilDossier(page);
        await expect(page.getByText(E2E_TASK_TITLE)).toBeVisible({ timeout: 15_000 });
    });

    test('toggles task completion', async ({ page }) => {
        await openCivilDossier(page);
        await addAdministrativeTask(page, 'مهمة للإنجاز');

        const row = page.locator('[data-testid^="smart-file-task-row-"]').filter({
            hasText: 'مهمة للإنجاز',
        });
        await row.getByRole('button').first().evaluate((el) => (el as HTMLButtonElement).click());
        await expect(row.locator('.line-through')).toBeVisible({ timeout: 5_000 });
    });
});
