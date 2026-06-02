/** طلب فتح قائمة إضابير القضاء الجنائي بعد الدخول (DEV / اختصار من شاشة Auth). */
export const CRIMINAL_CASES_ENTRY_SESSION_KEY = 'hami:lawyer:open-criminal-cases';

export function requestOpenCriminalCasesList(): void {
    try {
        sessionStorage.setItem(CRIMINAL_CASES_ENTRY_SESSION_KEY, '1');
    } catch {
        /* ignore quota / private mode */
    }
}

export function consumeOpenCriminalCasesListRequest(): boolean {
    try {
        const raw = sessionStorage.getItem(CRIMINAL_CASES_ENTRY_SESSION_KEY);
        if (raw !== '1') return false;
        sessionStorage.removeItem(CRIMINAL_CASES_ENTRY_SESSION_KEY);
        return true;
    } catch {
        return false;
    }
}
