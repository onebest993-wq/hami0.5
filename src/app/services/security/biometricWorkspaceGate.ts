/**
 * قفل المكتب لهذه العملية: بعد تفعيل البصمة في الإعدادات لا نُقفل فوراً،
 * وبعد الفتح البيومتري نعتبر الجلسة مفتوحة حتى الخلفية/الخمول/الخروج.
 */
let workspaceUnlockedThisProcess = false;

export function markBiometricWorkspaceUnlocked(): void {
    workspaceUnlockedThisProcess = true;
}

export function clearBiometricWorkspaceUnlock(): void {
    workspaceUnlockedThisProcess = false;
}

export function isBiometricWorkspaceUnlocked(): boolean {
    return workspaceUnlockedThisProcess;
}

export function resetBiometricWorkspaceGateForTests(): void {
    workspaceUnlockedThisProcess = false;
}
