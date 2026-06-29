import type { Page } from '@playwright/test';
import { HOME_HUB_PERF_BUDGET } from '@/app/services/alerts/homeHubPerfBudget';
import { E2E_CIVIL_FILE_ID } from './civilLawsuitFixtures';
import { buildE2eCalendarEvent, clearCalendarEvents, primeCalendarEventsOnPage, seedCalendarEvents } from './calendarFixtures';

export { clearCalendarEvents, primeCalendarEventsOnPage, seedCalendarEvents };

export const WORKSPACE_PINS_KEY = 'hami:workspace:pins:v1';
export const E2E_HUB_PIN_ID = String(E2E_CIVIL_FILE_ID);

/** تاريخ/وقت بغداد — حساب ثابت بلا Intl لتفادي اختلاف WebKit */
function baghdadDateTimeParts(d: Date): { date: string; time: string } {
    const BAGHDAD_OFFSET_MS = 3 * 60 * 60 * 1000;
    const baghdad = new Date(d.getTime() + BAGHDAD_OFFSET_MS);
    const date = `${baghdad.getUTCFullYear()}-${String(baghdad.getUTCMonth() + 1).padStart(2, '0')}-${String(baghdad.getUTCDate()).padStart(2, '0')}`;
    const time = `${String(baghdad.getUTCHours()).padStart(2, '0')}:${String(baghdad.getUTCMinutes()).padStart(2, '0')}`;
    return { date, time };
}

export function buildE2eHubRadarCalendarEvent() {
    const future = new Date(Date.now() + 2 * 60 * 60 * 1000);
    const { date, time } = baghdadDateTimeParts(future);
    return buildE2eCalendarEvent({
        title: 'موعد E2E تجريبي',
        date,
        time,
    });
}

export type E2eWorkspacePin = {
    id: string;
    type: 'lawsuit' | 'criminal' | 'execution' | 'transaction' | 'threading' | 'urgent' | 'notepad' | 'task' | 'hub';
    title: string;
    clientName: string;
    caseNumber: string;
    routePath: string;
};

export function buildE2eWorkspacePin(overrides: Partial<E2eWorkspacePin> = {}): E2eWorkspacePin {
    return {
        id: E2E_HUB_PIN_ID,
        type: 'lawsuit',
        title: 'دعوى E2E مثبتة',
        clientName: 'مدعي اختبار',
        caseNumber: '100/2026',
        routePath: `workspace:lawsuit:${encodeURIComponent(E2E_HUB_PIN_ID)}`,
        ...overrides,
    };
}

export async function clearWorkspacePins(page: Page) {
    await page.addInitScript((key: string) => {
        localStorage.removeItem(key);
        try {
            const open = indexedDB.open('hami-secure-store', 2);
            open.onsuccess = () => {
                const db = open.result;
                const tx = db.transaction('secure_kv', 'readwrite');
                tx.objectStore('secure_kv').delete(key);
                tx.oncomplete = () => db.close();
            };
        } catch {
            /* ignore */
        }
    }, WORKSPACE_PINS_KEY);
}

export async function seedWorkspacePins(page: Page, pins: E2eWorkspacePin[] = [buildE2eWorkspacePin()]) {
    const raw = JSON.stringify({ state: { pinnedItems: pins }, version: 0 });
    await page.addInitScript(
        ({ key, payload }) => {
            localStorage.setItem(key, payload);
            try {
                const req = indexedDB.open('hami-secure-store', 2);
                req.onupgradeneeded = () => {
                    const db = req.result;
                    if (!db.objectStoreNames.contains('secure_kv')) {
                        db.createObjectStore('secure_kv');
                    }
                };
                req.onsuccess = () => {
                    const db = req.result;
                    const tx = db.transaction('secure_kv', 'readwrite');
                    tx.objectStore('secure_kv').put(payload, key);
                    tx.oncomplete = () => db.close();
                };
            } catch {
                /* ignore */
            }
        },
        { key: WORKSPACE_PINS_KEY, payload: raw },
    );
}

export const E2E_HOME_HUB_COLD_OPEN_MS = HOME_HUB_PERF_BUDGET.openToInteractiveMs.ciColdMax;
export const E2E_HOME_HUB_CACHED_OPEN_MS = HOME_HUB_PERF_BUDGET.openToInteractiveMs.ciCachedMax;

export async function readHomeHubOpenToInteractiveMs(page: Page): Promise<number | null> {
    return page.evaluate(() => {
        const open = performance.getEntriesByName('hami:home-hub:open-request', 'mark')[0];
        const interactive = performance.getEntriesByName('hami:home-hub:interactive', 'mark')[0];
        if (!open || !interactive) return null;
        return Math.round(interactive.startTime - open.startTime);
    });
}

export async function clearHomeHubPerfMarksInPage(page: Page): Promise<void> {
    await page.evaluate(() => {
        for (const phase of ['open-request', 'first-paint', 'interactive'] as const) {
            performance.clearMarks(`hami:home-hub:${phase}`);
        }
    });
}
