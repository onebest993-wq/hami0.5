/** بديل بناء المقر — مسح إضابير المحامي ليس خروج المقر. */
export async function purgeLocalApplicationData(): Promise<{
    complete: boolean;
    failedStages: string[];
}> {
    return { complete: true, failedStages: [] };
}

export async function wipeAllApplicationData(): Promise<never> {
    throw new Error('HQ product has no lawyer application wipe');
}
