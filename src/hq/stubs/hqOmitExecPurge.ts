/** بديل بناء المقر — مسح تنفيذ الجهاز ليس خروج المقر. */
export const EXECUTION_WIPE_KEY_PREFIXES = [] as const;

export function shouldPurgeExecutionLocalKey(): boolean {
    return false;
}

export async function purgeExecutionLocalStateOnLogout(): Promise<void> {
    /* HQ product excludes lawyer execution device state */
}
