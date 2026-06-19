/**
 * E2E: توحيد الدعاوى + ربط الدعوى داخل الإضبارة المدنية
 */
import { test, expect } from '@playwright/test';
import {
    ensureLawyerDashboard,
    openCaseConsolidationModal,
    openCaseLinkModal,
    openCivilDossier,
    seedLawyerFiles,
} from './helpers/civilLawsuitFixtures';

test.describe('Case consolidation and linking', () => {
    test.beforeEach(async ({ page }) => {
        await seedLawyerFiles(page, true);
        await page.goto('/');
        await page.waitForLoadState('domcontentloaded');
        await ensureLawyerDashboard(page, true);
        await openCivilDossier(page);
    });

    test('merges with existing dossier — keeps primary case number and court', async ({ page }) => {
        test.setTimeout(90_000);

        await openCaseConsolidationModal(page);
        await page.getByRole('button', { name: /إضبارة موجودة في المخزن/i }).click();
        await page.getByRole('button', { name: '200/2026' }).click();
        await page.getByRole('button', { name: 'توحيد الدعاوى' }).click();

        await expect(page.getByText('تم توحيد الدعوى', { exact: false }).first()).toBeVisible({ timeout: 15_000 });
        await expect(page.getByText('100/2026').first()).toBeVisible({ timeout: 10_000 });
        await expect(page.getByText('موحدة 200/2026')).toBeVisible({ timeout: 10_000 });
        await expect(page.getByText('محكمة اختبار').first()).toBeVisible({ timeout: 10_000 });
    });

    test('external consolidation reference keeps primary identity', async ({ page }) => {
        test.setTimeout(90_000);

        await openCaseConsolidationModal(page);
        await page.getByRole('button', { name: /تسجيل رقم دعوى مرجعي/i }).click();
        await page.getByPlaceholder('رقم الدعوى المرجعية').fill('555/2026');
        await page.getByRole('button', { name: 'حفظ المرجع' }).click();

        await expect(page.getByText('تم تسجيل المرجع', { exact: false })).toBeVisible({ timeout: 15_000 });
        await expect(page.getByText('100/2026').first()).toBeVisible({ timeout: 10_000 });
        await expect(page.getByText('موحدة 555/2026')).toBeVisible({ timeout: 10_000 });
        await expect(page.getByText('محكمة اختبار').first()).toBeVisible({ timeout: 10_000 });
        await expect(
            page.getByText('دعوى موحّدة (مرجع — غير موجودة في المخزن)'),
        ).toBeVisible({ timeout: 10_000 });
        await expect(page.getByText('555/2026', { exact: true }).first()).toBeVisible({ timeout: 10_000 });
    });

    test('links existing dossier without merging timelines', async ({ page }) => {
        test.setTimeout(90_000);

        await openCaseLinkModal(page);
        await page.getByRole('button', { name: 'إضبارة موجودة' }).click();
        await page.getByRole('button', { name: '200/2026' }).click();
        await page.getByRole('button', { name: 'تأكيد الربط' }).click();

        await expect(page.getByText('تم ربط الدعويين', { exact: false })).toBeVisible({ timeout: 15_000 });
        await expect(page.getByText('100/2026').first()).toBeVisible({ timeout: 10_000 });
        await expect(page.getByText('الانتقال إلى الدعوى المربوطة (200/2026)')).toBeVisible({
            timeout: 10_000,
        });
        await expect(page.getByText('محكمة اختبار').first()).toBeVisible({ timeout: 10_000 });
    });

    test('external case link shows simple reference card', async ({ page }) => {
        test.setTimeout(90_000);

        await openCaseLinkModal(page);
        await page.getByRole('button', { name: /رقم مرجعي/i }).click();
        await page.getByPlaceholder('رقم الدعوى المرجعية').fill('777/2026');
        await page.getByRole('button', { name: 'تأكيد الربط' }).click();

        await expect(page.getByText('تم ربط الدعوى المرقمة', { exact: false }).first()).toBeVisible({
            timeout: 15_000,
        });
        await expect(page.getByText('100/2026').first()).toBeVisible({ timeout: 10_000 });
        await expect(page.getByText('دعوى مربوطة (مرجع)')).toBeVisible({ timeout: 10_000 });
        await expect(page.getByText('777/2026', { exact: true }).first()).toBeVisible({ timeout: 10_000 });
    });
});
