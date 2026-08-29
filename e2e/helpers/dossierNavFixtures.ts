import type { Page } from '@playwright/test';
import { expect } from '@playwright/test';
import { CIVIL_LAWSUIT_TEST_IDS } from '@/app/components/lawyer/smart-modal/smartFile/civilLawsuitTestIds';
import { lawyerDashboardReady } from './lawyerDashboardLocators';

/**
 * يغلق إضبارة الدعوى عبر الزر الظاهر فعلياً:
 * - الوضع النافذي (فتح من البحث الشامل / overlay): `smart-file-exit`
 * - التنقل المتداخل (سلة مهملات / ربط قضية): `smart-file-back`
 *
 * يطابق resolveDossierHeaderNavVisibility في التطبيق.
 */
export async function dismissSmartFileDossier(page: Page): Promise<void> {
    const dossier = page.getByTestId(CIVIL_LAWSUIT_TEST_IDS.dossier);
    await expect(dossier).toBeVisible({ timeout: 20_000 });

    const exitBtn = page.getByTestId(CIVIL_LAWSUIT_TEST_IDS.dossierExit);
    const backBtn = page.getByTestId(CIVIL_LAWSUIT_TEST_IDS.dossierBack);

    const exitVisible = await exitBtn.isVisible({ timeout: 4_000 }).catch(() => false);
    if (exitVisible) {
        await exitBtn.scrollIntoViewIfNeeded();
        await exitBtn.click({ force: true });
    } else {
        await expect(backBtn).toBeVisible({ timeout: 10_000 });
        await backBtn.scrollIntoViewIfNeeded();
        await backBtn.click({ force: true });
    }

    await expect(dossier).toBeHidden({ timeout: 20_000 });
    await expect(lawyerDashboardReady(page)).toBeVisible({ timeout: 15_000 });
}

/** @deprecated استخدم dismissSmartFileDossier */
export const closeSmartFileDossier = dismissSmartFileDossier;
