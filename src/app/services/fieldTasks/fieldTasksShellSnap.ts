/**
 * فتح/إغلاق ستارة الميدان وأجندة المهام لحظياً.
 * المصدر البصري: html[data-hami-field-tasks-open] / html[data-hami-tasks-manager-open]
 */

const SHEET_ATTR = 'data-hami-field-tasks-open';
const MANAGER_ATTR = 'data-hami-tasks-manager-open';
const SHEET_SELECTOR = '[data-field-tasks-root]';
const MANAGER_SELECTOR = '[data-testid="tasks-manager-overlay"]';
export const TASKS_MANAGER_INSTANT_CHROME_ID = 'hami-tasks-manager-instant-chrome';

export function isFieldTasksShellSnappedOpen(): boolean {
    if (typeof document === 'undefined') return false;
    return document.documentElement.getAttribute(SHEET_ATTR) === '1';
}

export function snapFieldTasksShellOpen(): boolean {
    if (typeof document === 'undefined') return false;
    document.documentElement.setAttribute(SHEET_ATTR, '1');
    document.documentElement.removeAttribute(MANAGER_ATTR);
    return Boolean(document.querySelector(SHEET_SELECTOR));
}

export function snapFieldTasksShellClose(): void {
    if (typeof document === 'undefined') return;
    document.documentElement.removeAttribute(SHEET_ATTR);
}

export function isTasksManagerShellSnappedOpen(): boolean {
    if (typeof document === 'undefined') return false;
    return document.documentElement.getAttribute(MANAGER_ATTR) === '1';
}

export function snapTasksManagerShellOpen(): boolean {
    if (typeof document === 'undefined') return false;
    document.documentElement.setAttribute(MANAGER_ATTR, '1');
    document.documentElement.removeAttribute(SHEET_ATTR);
    return Boolean(document.querySelector(MANAGER_SELECTOR));
}

export function snapTasksManagerShellClose(): void {
    if (typeof document === 'undefined') return;
    document.documentElement.removeAttribute(MANAGER_ATTR);
    document.getElementById(TASKS_MANAGER_INSTANT_CHROME_ID)?.remove();
}
