import type { Page } from '@playwright/test';
import { CALENDAR_PERF_BUDGET } from '@/app/services/calendar/calendarPerfBudget';
import { GUEST_LAWYER_ID } from '@/app/utils/guestLawyerSession';
import { prepareBootE2E, suppressWeeklyBackupReminder } from './bootFixtures';

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

/** يطابق جلسة VITE_SHELL_AUTH_OPEN — لا `dev-user-uuid-1` */
export const E2E_CALENDAR_USER_ID = GUEST_LAWYER_ID;
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
        ({ key, raw, todayToken, ownerId }) => {
            const now = new Date();
            const ymd = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
            let stored = raw;
            try {
                const parsed = JSON.parse(raw) as Array<{ date?: string; userId?: string }>;
                if (Array.isArray(parsed)) {
                    stored = JSON.stringify(
                        parsed.map((event) => ({
                            ...event,
                            userId: ownerId,
                            date: event?.date === todayToken ? ymd : event.date,
                        })),
                    );
                }
            } catch {
                stored = raw;
            }
            /* leftover فقط — نص صريح في IndexedDB يُصنَّف unread فيحجب المرآة */
            localStorage.setItem(key, stored);
        },
        {
            key: CALENDAR_LOCAL_KEY,
            raw: payload,
            todayToken: E2E_CALENDAR_TODAY,
            ownerId: E2E_CALENDAR_USER_ID,
        },
    );
}

/** بعد الإقلاع: يكتب كاش SecureStore المفكوك بهوية الجلسة */
export async function commitCalendarEventsSeed(
    page: Page,
    events: E2eCalendarEvent[] = [buildE2eCalendarEvent()],
): Promise<void> {
    await primeCalendarEventsOnPage(page, events);
}

export async function hydrateCalendarEventsForE2E(
    page: Page,
    events: E2eCalendarEvent[] = [buildE2eCalendarEvent()],
): Promise<void> {
    await primeCalendarEventsOnPage(page, events);
}

/** يُزامِن أحداث التقويم بعد تحميل اللوحة — localStorage + حدث تحديث */
export async function primeCalendarEventsOnPage(
    page: Page,
    events: E2eCalendarEvent[] = [buildE2eCalendarEvent()],
): Promise<void> {
    const raw = JSON.stringify(events);
    await page.evaluate(
        ({ key, payload, calendarUpdatedEvent, todayToken, fallbackUserId }) => {
            const now = new Date();
            const ymd = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
            let ownerId = fallbackUserId;
            try {
                for (let i = 0; i < localStorage.length; i += 1) {
                    const storageKey = localStorage.key(i);
                    if (!storageKey || !storageKey.includes('-auth-token')) continue;
                    const parsed = JSON.parse(localStorage.getItem(storageKey) ?? 'null') as {
                        user?: { id?: string };
                        currentSession?: { user?: { id?: string } };
                    };
                    const uid = parsed?.user?.id ?? parsed?.currentSession?.user?.id;
                    if (typeof uid === 'string' && uid.trim()) {
                        ownerId = uid.trim();
                        break;
                    }
                }
            } catch {
                ownerId = fallbackUserId;
            }
            let stored = payload;
            try {
                const parsed = JSON.parse(payload) as Array<{ date?: string; userId?: string }>;
                if (Array.isArray(parsed)) {
                    stored = JSON.stringify(
                        parsed.map((event) => ({
                            ...event,
                            userId: ownerId,
                            date: event?.date === todayToken ? ymd : event.date,
                        })),
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
            fallbackUserId: E2E_CALENDAR_USER_ID,
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
