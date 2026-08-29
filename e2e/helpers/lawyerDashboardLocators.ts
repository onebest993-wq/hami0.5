import type { Locator, Page } from '@playwright/test';

/** لوحة جاهزة — `.first()` يتجنّب strict-mode عند شجرة مزدوجة مؤقتة بعد إغلاق الإضبارة */
export function lawyerDashboardReady(page: Page): Locator {
    return page.getByTestId('lawyer-dashboard-ready').first();
}
