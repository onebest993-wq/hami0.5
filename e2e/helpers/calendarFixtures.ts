import type { Page } from '@playwright/test';
import { CALENDAR_PERF_BUDGET } from '@/app/services/calendar/calendarPerfBudget';
import { prepareBootE2E, suppressWeeklyBackupReminder } from './bootFixtures';
import { writeE2eSecureStoreKey } from './secureStoreE2EFixtures';

/** يجهّز جلسة E2E لرادار المواعيد — إقلاع سريع + بدون toasts حاجبة */
export async function prepareCalendarE2E(page: Page): Promise<void> {
    await prepareBootE2E(page);
    await suppressWeeklyBackupReminder(page);
    await page.context().grantPermissions(['notifications']).catch(() => undefined);
    await page.route('**/api/kv-proxy**', async (route) => {
        await route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify({ ok: true, value: null }),
        });
    });
}

export const E2E_CALENDAR_USER_ID = 'dev-user-uuid-1';
export const CALENDAR_LOCAL_KEY = 'hami:calendar:events:v1';
/** يُستبدل بتاريخ اليوم المحلي داخل المتصفح عند البذر */
export const E2E_CALENDAR_TODAY = 'TODAY';

const SECURE_STORE_DB = 'hami-secure-store';
const SECURE_STORE_VERSION = 2;
const SECURE_KV_STORE = 'secure_kv';

type E2eCalendarEvent = {
    id: string;
    userId: string;
    title: string;
    date: string;
    time?: string;
    endTime?: string;
    type: 'hearing' | 'deadline' | 'consultation' | 'execution' | 'custom';
    location?: string;
    notes?: string;
    createdAt: string;
    updatedAt: string;
    sourceModule?:
        | 'lawsuit'
        | 'execution'
        | 'urgent'
        | 'transaction'
        | 'criminal'
        | 'threading'
        | 'task'
        | 'note'
        | 'manual';
    sourceEntityId?: string;
    sourceEventId?: string;
    reminderMinutesBefore?: number | null;
    isCompleted?: boolean;
};

export function buildE2eCalendarEvent(overrides: Partial<E2eCalendarEvent> = {}): E2eCalendarEvent {
    const now = new Date().toISOString();
    return {
        id: 'e2e-radar-event-1',
        userId: E2E_CALENDAR_USER_ID,
        title: 'موعد E2E تجريبي',
        date: E2E_CALENDAR_TODAY,
        time: '10:00',
        type: 'custom',
        location: 'محكمة اختبار',
        notes: '',
        createdAt: now,
        updatedAt: now,
        ...overrides,
    };
}

export function buildE2eBridgedLawsuitEvent(
    sourceEntityId: string,
    overrides: Partial<E2eCalendarEvent> = {},
): E2eCalendarEvent {
    return buildE2eCalendarEvent({
        id: 'e2e-bridged-lawsuit-1',
        title: 'جلسة — مرافعة مدنية E2E',
        type: 'hearing',
        time: '09:00',
        location: 'محكمة اختبار',
        sourceModule: 'lawsuit',
        sourceEntityId,
        sourceEventId: 'hearing_e2e_1',
        ...overrides,
    });
}

export async function seedCalendarEvents(page: Page, events: E2eCalendarEvent[] = [buildE2eCalendarEvent()]) {
    const payload = JSON.stringify(events);
    await page.addInitScript(
        ({ key, raw, dbName, dbVersion, storeName, todayToken }) => {
            const now = new Date();
            const ymd = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
            let stored = raw;
            try {
                const parsed = JSON.parse(raw) as Array<{ date?: string }>;
                if (Array.isArray(parsed)) {
                    stored = JSON.stringify(
                        parsed.map((event) => (event?.date === todayToken ? { ...event, date: ymd } : event)),
                    );
                }
            } catch {
                stored = raw;
            }
            localStorage.setItem(key, stored);
            try {
                const req = indexedDB.open(dbName, dbVersion);
                req.onupgradeneeded = () => {
                    const db = req.result;
                    if (!db.objectStoreNames.contains(storeName)) {
                        db.createObjectStore(storeName);
                    }
                };
                req.onsuccess = () => {
                    const db = req.result;
                    const tx = db.transaction(storeName, 'readwrite');
                    tx.objectStore(storeName).put(stored, key);
                    tx.oncomplete = () => db.close();
                };
            } catch {
                /* ignore */
            }
        },
        {
            key: CALENDAR_LOCAL_KEY,
            raw: payload,
            dbName: SECURE_STORE_DB,
            dbVersion: SECURE_STORE_VERSION,
            storeName: SECURE_KV_STORE,
            todayToken: E2E_CALENDAR_TODAY,
        },
    );
}

export async function hydrateCalendarEventsForE2E(
    page: Page,
    events: E2eCalendarEvent[] = [buildE2eCalendarEvent()],
): Promise<void> {
    const raw = JSON.stringify(events);
    await writeE2eSecureStoreKey(page, CALENDAR_LOCAL_KEY, raw);
    await primeCalendarEventsOnPage(page, events);
}

/** يُزامِن أحداث التقويم بعد تحميل اللوحة — localStorage + حدث تحديث */
export async function primeCalendarEventsOnPage(
    page: Page,
    events: E2eCalendarEvent[] = [buildE2eCalendarEvent()],
): Promise<void> {
    const raw = JSON.stringify(events);
    await page.evaluate(
        ({ key, payload, calendarUpdatedEvent, todayToken }) => {
            const now = new Date();
            const ymd = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
            let stored = payload;
            try {
                const parsed = JSON.parse(payload) as Array<{ date?: string }>;
                if (Array.isArray(parsed)) {
                    stored = JSON.stringify(
                        parsed.map((event) => (event?.date === todayToken ? { ...event, date: ymd } : event)),
                    );
                }
            } catch {
                stored = payload;
            }
            const bridge = (
                window as Window & {
                    __hamiE2eSecureStore?: { setItemSync?: (k: string, v: string) => boolean };
                }
            ).__hamiE2eSecureStore;
            if (bridge?.setItemSync) {
                bridge.setItemSync(key, stored);
                try {
                    localStorage.removeItem(key);
                } catch {
                    /* ignore */
                }
            } else {
                localStorage.setItem(key, stored);
            }
            window.dispatchEvent(new CustomEvent(calendarUpdatedEvent));
        },
        {
            key: CALENDAR_LOCAL_KEY,
            payload: raw,
            calendarUpdatedEvent: 'hami:calendar-updated',
            todayToken: E2E_CALENDAR_TODAY,
        },
    );
}

/** ms من open-request → interactive — للـ E2E */
export async function readCalendarOpenToInteractiveMs(
    page: Page,
): Promise<number | null> {
    return page.evaluate(() => {
        const open = performance.getEntriesByName('hami:calendar:open-request', 'mark')[0];
        const interactive = performance.getEntriesByName('hami:calendar:interactive', 'mark')[0];
        if (!open || !interactive) return null;
        return Math.round(interactive.startTime - open.startTime);
    });
}

export const E2E_CALENDAR_COLD_OPEN_MS = CALENDAR_PERF_BUDGET.openToInteractiveMs.ciColdMax;
export const E2E_CALENDAR_CACHED_OPEN_MS = CALENDAR_PERF_BUDGET.openToInteractiveMs.ciCachedMax;

export async function clearCalendarEvents(page: Page) {
    await page.addInitScript(
        ({ key, dbName, dbVersion, storeName }) => {
            localStorage.removeItem(key);
            try {
                const open = indexedDB.open(dbName, dbVersion);
                open.onupgradeneeded = () => {
                    const db = open.result;
                    if (!db.objectStoreNames.contains(storeName)) {
                        db.createObjectStore(storeName);
                    }
                };
                open.onsuccess = () => {
                    const db = open.result;
                    const tx = db.transaction(storeName, 'readwrite');
                    tx.objectStore(storeName).delete(key);
                    tx.oncomplete = () => db.close();
                };
            } catch {
                /* ignore */
            }
        },
        {
            key: CALENDAR_LOCAL_KEY,
            dbName: SECURE_STORE_DB,
            dbVersion: SECURE_STORE_VERSION,
            storeName: SECURE_KV_STORE,
        },
    );
}
