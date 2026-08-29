/**
 * إقلاع موحّد لاختبارات E2E — التنفيذ (يتبع executionDashboard.spec.ts)
 */
import type { Locator, Page } from '@playwright/test';
import { expect } from '@playwright/test';
import { seedLawyerFiles } from './civilLawsuitFixtures';
import { gotoLawyerHomeE2E, collectFatalBootPageErrors } from './bootFixtures';
import { dismissProductivityBlockers, prepareProductivityE2E } from './productivityE2EFixtures';
import { seedExecutionStorageForFile } from './executionStorageFixtures';

export type ExecutionE2EBootOptions = {
    executionFile: Record<string, unknown>;
    collectPageErrors?: boolean;
};

type ExecDossierCrashWindow = Window & { __HAMI_EXEC_DOSSIER_CRASH?: string };

/**
 * نقرة أصلية موثوقة مع useScrollSafePress:
 * pointerdown→pointerup يستدعي onPress مرة، وclick يُبتلع عبر handledRef.
 * Playwright pointermove بعد scroll كان يُحسب سحباً فيفشل فتح الأرشيف على preview.
 */
export async function clickNativeElement(locator: Locator): Promise<void> {
    await locator.evaluate((el) => {
        const target = el as HTMLElement;
        target.scrollIntoView({ block: 'center', inline: 'center' });
        const rect = target.getBoundingClientRect();
        const x = rect.left + Math.max(rect.width / 2, 1);
        const y = rect.top + Math.max(rect.height / 2, 1);
        const common = {
            bubbles: true,
            cancelable: true,
            composed: true,
            clientX: x,
            clientY: y,
            button: 0,
            pointerId: 1,
            pointerType: 'mouse',
            isPrimary: true,
        };
        target.dispatchEvent(new PointerEvent('pointerdown', { ...common, buttons: 1 }));
        target.dispatchEvent(new PointerEvent('pointerup', { ...common, buttons: 0 }));
        target.click();
    });
}

export async function clickHubArchiveTileNative(page: Page, testId: string): Promise<void> {
    const tile = page.getByTestId(testId);
    await expect(tile).toBeVisible({ timeout: 25_000 });
    await expect(tile).toBeEnabled({ timeout: 10_000 });
    await clickNativeElement(tile);
}

async function expectNoExecutionDossierCrash(page: Page): Promise<void> {
    const fallback = page.getByTestId('execution-dossier-error-fallback');
    if (!(await fallback.isVisible().catch(() => false))) return;
    const msg = await page
        .evaluate(() => {
            const w = window as unknown as ExecDossierCrashWindow;
            const attr = document
                .querySelector('[data-testid="execution-dossier-error-fallback"]')
                ?.getAttribute('data-error-message');
            return w.__HAMI_EXEC_DOSSIER_CRASH || attr || '';
        })
        .catch(() => '');
    throw new Error(`تعذّر تحميل الإضبارة التنفيذية${msg ? `: ${msg}` : ''}`);
}

/** يُجهّز الجلسة ويعيد أخطاء الصفحة الحرجة إن طُلب جمعها */
export async function bootExecutionLawyerShell(
    page: Page,
    options: ExecutionE2EBootOptions,
): Promise<string[]> {
    const pageErrors: string[] = [];
    if (options.collectPageErrors !== false) {
        page.on('pageerror', (err) => pageErrors.push(err.message));
    }

    await prepareProductivityE2E(page);
    await seedLawyerFiles(page);
    await seedExecutionStorageForFile(page, options.executionFile);

    await expect(async () => {
        await gotoLawyerHomeE2E(page);
    }).toPass({ timeout: 90_000 });
    await dismissProductivityBlockers(page);

    return collectFatalBootPageErrors(pageErrors);
}

export async function openExecutionArchiveFromHome(page: Page): Promise<void> {
    const shell = page.getByTestId('execution-archive-shell');
    await expect(async () => {
        await dismissProductivityBlockers(page);
        await clickHubArchiveTileNative(page, 'hub-archive-execution');
        await expect(shell).toHaveAttribute('aria-hidden', 'false', { timeout: 8_000 });
        await expect(shell).toHaveAttribute('data-open', 'true');
        await expect(shell).not.toHaveAttribute('inert');
        await expect(shell).toBeVisible({ timeout: 8_000 });
        await expect(page.getByRole('heading', { name: /مخزن الأضابير التنفيذية/i })).toBeVisible({
            timeout: 8_000,
        });
    }).toPass({ timeout: 45_000 });
}

export async function openExecutionDossierByRowText(page: Page, rowPattern: RegExp): Promise<void> {
    const memo = page.getByTestId('execution-followup-memo');
    await expect(async () => {
        await expectNoExecutionDossierCrash(page);
        if (await memo.isVisible().catch(() => false)) return;

        // بطاقة الأرشيف قد تكون في DOM ومغطاة/خارج الشاشة — لا نعتمد على isVisible فقط
        const card = page
            .getByTestId('execution-archive-shell')
            .getByTestId('execution-archive-card')
            .filter({ hasText: rowPattern })
            .first();
        await expect(card).toBeAttached({ timeout: 15_000 });
        await card.scrollIntoViewIfNeeded().catch(() => undefined);

        const openSurface = card.getByTestId('execution-archive-card-open').first();
        if ((await openSurface.count()) > 0) {
            await clickNativeElement(openSurface);
        } else {
            await clickNativeElement(card);
        }
        await expect(memo).toBeVisible({ timeout: 12_000 });
    }).toPass({ timeout: 60_000 });
    await expectNoExecutionDossierCrash(page);
}

export async function openExecutionFollowupModal(page: Page): Promise<void> {
    const memo = page.getByTestId('execution-followup-memo');
    await expect(memo).toBeVisible({ timeout: 15_000 });
    await clickNativeElement(memo);
    await expect(page.getByTestId('execution-followup-modal')).toBeVisible({ timeout: 20_000 });
}

export async function clickExecutionFollowupTab(
    page: Page,
    tabLabel: RegExp,
    tabId?: string,
): Promise<void> {
    const modal = page.getByTestId('execution-followup-modal');
    const tab = tabId
        ? modal.locator(`[data-followup-tab="${tabId}"]`)
        : modal.getByRole('tab', { name: tabLabel }).first();
    await tab.scrollIntoViewIfNeeded();
    await expect(tab).toBeVisible({ timeout: 15_000 });
    await tab.click();
}

export async function saveExecutionNoteE2E(page: Page, noteText: string): Promise<void> {
    await page.getByRole('button', { name: /ملاحظات|المذكرات/i }).first().click({ timeout: 15_000 });
    const notesModal = page.getByTestId('execution-notes-modal');
    await expect(notesModal).toBeVisible({ timeout: 15_000 });

    const composePane = page.getByTestId('execution-notes-pane-compose');
    await composePane.click();

    const composer = page.getByTestId('execution-notes-modal-composer');
    await expect(composer).toBeVisible({ timeout: 10_000 });
    await page.getByTestId('dossier-note-title').fill(noteText);
    const editor = composer.getByTestId('dossier-note-editor').locator('[contenteditable]').first();
    await editor.click();
    const bodyText = `${noteText} — تفاصيل`;
    await editor.evaluate((el, text) => {
        el.innerHTML = `<p>${text}</p>`;
        el.dispatchEvent(new InputEvent('input', { bubbles: true }));
    }, bodyText);
    await expect(page.getByTestId('dossier-note-save')).toBeEnabled({ timeout: 5_000 });
    await page.getByTestId('dossier-note-save').click();
    await expect(page.getByText(new RegExp(`إضافة ملاحظة.*${noteText.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}`))).toBeVisible({
        timeout: 15_000,
    });
}
