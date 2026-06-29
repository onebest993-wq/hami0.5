import type { Page } from '@playwright/test';
import { prepareBootE2E, stripBootFailureLayer } from './bootFixtures';
import { dismissBlockingOverlays } from './notificationFixtures';

/** يجهّز جلسة E2E لأقسام الإنتاجية (مفكرة، مخزن، مهام، منتدى…) */
export async function prepareProductivityE2E(page: Page): Promise<void> {
    await prepareBootE2E(page);
}

/** يزيل طبقات تحجب النقرات قبل التفاعل مع overlay إنتاجي */
export async function dismissProductivityBlockers(page: Page): Promise<void> {
    if (page.isClosed()) return;
    await dismissBlockingOverlays(page);
    if (page.isClosed()) return;
    await stripBootFailureLayer(page);
}
