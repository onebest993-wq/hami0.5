/** نافذة حراسة بعد إغلاق نموذج الإنشاء حتى لا تُبلع نقرة الإغلاق من قشرة المخزن */
export const EXECUTION_CREATE_CLOSE_GUARD_MS = 2_000;
/** تأخير فك التركيب حتى تُستهلك نقرة المتصفح المتأخرة على زر الإنشاء لا على المخزن */
export const EXECUTION_CREATE_UNMOUNT_DELAY_MS = 64;

export function armExecutionCreateCloseGuard(): void {
    if (typeof document === 'undefined') return;
    document.documentElement.setAttribute('data-hami-execution-create-guard', '1');
}

export function clearExecutionCreateCloseGuard(): void {
    if (typeof document === 'undefined') return;
    document.documentElement.removeAttribute('data-hami-execution-create-guard');
}

export function isExecutionCreateCloseGuardArmed(): boolean {
    if (typeof document === 'undefined') return false;
    return document.documentElement.getAttribute('data-hami-execution-create-guard') === '1';
}
