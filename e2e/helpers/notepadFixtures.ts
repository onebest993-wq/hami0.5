import type { Locator, Page } from '@playwright/test';
import { expect } from '@playwright/test';
import { dismissProductivityBlockers } from './productivityE2EFixtures';
import { clickRepositoryChrome, closeRepositoryIfOpen, openRepositoryAddMenu, openRepositoryFromDock } from './repositoryFixtures';

export const LAWYER_NOTES_KEY = 'lawyer_notes';

type E2eGlobalNote = {
    id: string | number;
    title: string;
    body: string;
    isPinned: boolean;
    date?: string;
};

export function buildE2eNote(overrides: Partial<E2eGlobalNote> = {}): E2eGlobalNote {
    return {
        id: 'e2e-notepad-note-1',
        title: 'ملاحظة E2E',
        body: 'نص تجريبي للمفكرة',
        isPinned: false,
        date: new Date().toLocaleDateString('ar-EG'),
        ...overrides,
    };
}

export async function clearLawyerNotes(page: Page) {
    await page.addInitScript((key: string) => {
        localStorage.removeItem(key);
    }, LAWYER_NOTES_KEY);
}

export async function seedLawyerNotes(page: Page, notes: E2eGlobalNote[] = []) {
    await page.addInitScript(
        ({ key, payload }) => {
            localStorage.setItem(key, JSON.stringify(payload));
        },
        { key: LAWYER_NOTES_KEY, payload: notes },
    );
}

/** يفتح المستودع الذكي (المفكرة الموحّدة) من أيقونة dockRepository */
export async function openNotepadShellFromHome(page: Page) {
    await dismissProductivityBlockers(page);
    return openRepositoryFromDock(page);
}

export async function closeNotepadShell(page: Page) {
    await closeRepositoryIfOpen(page);
}

export async function fillRepositoryNoteComposer(
    modal: Locator,
    _page: Page,
    title: string,
    body: string,
) {
    await modal.getByTestId('repository-compose-title').fill(title);
    const editor = modal.getByTestId('repository-rich-editor').locator('[contenteditable]');
    await expect(editor).toBeVisible({ timeout: 15_000 });
    await editor.click({ force: true });
    // fill() على contenteditable يعلّق Chromium تحت الحمل — نفس مسار ملاحظات التنفيذ
    await editor.evaluate((el, text) => {
        const node = el as HTMLElement;
        const escaped = text
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;');
        node.innerHTML = `<p>${escaped}</p>`;
        node.dispatchEvent(new InputEvent('input', { bubbles: true }));
    }, body);
    await expect(editor).toContainText(body, { timeout: 8_000 });
}

/** فتح إنشاء بطاقة — عبر قائمة «+ إضافة» */
export async function openRepositoryNoteCreate(modal: Locator) {
    const page = modal.page();
    await openRepositoryAddMenu(page, modal);
    await clickRepositoryChrome(page.getByTestId('repository-note-create'));
}

export async function saveRepositoryNoteComposer(modal: Locator): Promise<void> {
    await clickRepositoryChrome(modal.getByTestId('repository-note-save'));
}
