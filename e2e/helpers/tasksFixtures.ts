import type { Page } from '@playwright/test';

export const QUANTUM_TASKS_STORAGE_KEY = 'hami_quantum_legal_tasks_v1';

/** مفتاح يوم الأسبوع العملي (سبت–خميس) حسب تاريخ الجهاز */
export function workWeekKeyForDate(date = new Date()): string {
    const map: Record<number, string> = {
        6: 'sat',
        0: 'sun',
        1: 'mon',
        2: 'tue',
        3: 'wed',
        4: 'thu',
    };
    return map[date.getDay()] ?? 'wed';
}

type SerializedQuantumTask = {
    id: string;
    rawText: string;
    title: string;
    location: string | null;
    parsedDate: string | null;
    reminderAt: null;
    isFatalDeadline: boolean;
    linkedCaseId: null;
    status: 'pending';
    completedAt: null;
    pinnedToFieldCurtain: boolean;
    fieldCurtainPinnedAt: string | null;
    subTasks: unknown[];
    documentRequirements: unknown[];
    expenses: unknown[];
};

export function buildE2eQuantumTask(overrides: Partial<SerializedQuantumTask> = {}): SerializedQuantumTask {
    const today = new Date();
    today.setHours(12, 0, 0, 0);
    return {
        id: 'e2e-field-task-1',
        rawText: 'مهمة E2E',
        title: 'مهمة E2E ميدانية',
        location: 'محكمة اختبار',
        parsedDate: today.toISOString(),
        reminderAt: null,
        isFatalDeadline: false,
        linkedCaseId: null,
        status: 'pending',
        completedAt: null,
        pinnedToFieldCurtain: false,
        fieldCurtainPinnedAt: null,
        subTasks: [],
        documentRequirements: [],
        expenses: [],
        ...overrides,
    };
}

export async function clearQuantumTasks(page: Page) {
    await page.addInitScript((key: string) => {
        localStorage.removeItem(key);
    }, QUANTUM_TASKS_STORAGE_KEY);
}

export async function seedQuantumTasks(page: Page, tasks: SerializedQuantumTask[] = []) {
    await page.addInitScript(
        ({ key, payload }) => {
            localStorage.setItem(key, JSON.stringify({ tasks: payload }));
        },
        { key: QUANTUM_TASKS_STORAGE_KEY, payload: tasks },
    );
}
