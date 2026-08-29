import type { ExecutionFile } from '@/app/types/execution';

export function applyUnifiedSummonsDebtorNotification(input: {
    date: string;
    purpose: string | undefined;
    isHolidayExtension: boolean | undefined;
    evictionMeta: { forCollection?: boolean; branch?: unknown } | undefined;
    initialNoticeLawyerFeesIncluded: boolean | undefined;
    notifyOpts: unknown;
    unifiedSummonsTargetDebtorKey: string | null | undefined;
    primaryDebtorKeyResolved: string | null | undefined;
    isEvictionExecutionModule: boolean;
    setManualGraceCalendarExtra: (v: boolean) => void;
    executionData: ExecutionFile | null | undefined;
    notificationCount: number;
    onUpdate: ((file: ExecutionFile) => void) | undefined;
    buildDebtorNoticePatchForKey: (
        executionData: ExecutionFile,
        targetDebtorKey: string | null | undefined,
        primaryDebtorKeyResolved: string | null | undefined,
        patch: { notificationDate: string },
    ) => Record<string, unknown>;
    executionStorageKey: (id: string) => string;
    storageCache: { set: (key: string, value: unknown) => void };
    notifyDebtorSafe: (
        date: string,
        evictionMeta: unknown,
        initialNoticeLawyerFeesIncluded: boolean | undefined,
        purpose: string | undefined,
        notifyOpts: unknown,
    ) => void;
}) {
    const {
        date,
        purpose,
        isHolidayExtension,
        evictionMeta,
        initialNoticeLawyerFeesIncluded,
        notifyOpts,
        unifiedSummonsTargetDebtorKey,
        primaryDebtorKeyResolved,
        isEvictionExecutionModule,
        setManualGraceCalendarExtra,
        executionData,
        notificationCount,
        onUpdate,
        buildDebtorNoticePatchForKey,
        executionStorageKey,
        storageCache,
        notifyDebtorSafe,
    } = input;

    const targetDebtorKey = unifiedSummonsTargetDebtorKey;
    const targetIsPrimary = targetDebtorKey === primaryDebtorKeyResolved;
    if (isHolidayExtension && !isEvictionExecutionModule) {
        setManualGraceCalendarExtra(true);
    }
    const nextHoliday = isEvictionExecutionModule
        ? false
        : Boolean(isHolidayExtension || executionData?.isHolidayExtension);
    const initialFeesPatch =
        notificationCount === 0 &&
        isEvictionExecutionModule &&
        typeof initialNoticeLawyerFeesIncluded === 'boolean'
            ? {
                  eviction_initial_notice_lawyer_fees_included: initialNoticeLawyerFeesIncluded,
              }
            : {};
    if (onUpdate && executionData?.id) {
        onUpdate({
            ...executionData,
            ...(targetIsPrimary ? { debtorNotificationDate: date } : {}),
            ...buildDebtorNoticePatchForKey(
                executionData,
                targetDebtorKey,
                primaryDebtorKeyResolved,
                { notificationDate: date },
            ),
            isHolidayExtension: nextHoliday,
            ...initialFeesPatch,
            ...(isEvictionExecutionModule && notificationCount >= 1 && evictionMeta !== undefined
                ? {
                      eviction_last_summons_for_collection: Boolean(evictionMeta.forCollection),
                      eviction_last_collection_summons_branch: evictionMeta.forCollection
                          ? evictionMeta.branch
                          : null,
                  }
                : {}),
            updatedAt: new Date().toISOString(),
        } as ExecutionFile);
    }
    try {
        const key = executionStorageKey(String(executionData!.id));
        const merged = {
            ...executionData,
            ...(targetIsPrimary ? { debtorNotificationDate: date } : {}),
            ...buildDebtorNoticePatchForKey(
                executionData as ExecutionFile,
                targetDebtorKey,
                primaryDebtorKeyResolved,
                { notificationDate: date },
            ),
            isHolidayExtension: nextHoliday,
            ...initialFeesPatch,
            ...(isEvictionExecutionModule && notificationCount >= 1 && evictionMeta !== undefined
                ? {
                      eviction_last_summons_for_collection: Boolean(evictionMeta.forCollection),
                      eviction_last_collection_summons_branch: evictionMeta.forCollection
                          ? evictionMeta.branch
                          : null,
                  }
                : {}),
            updatedAt: new Date().toISOString(),
        };
        storageCache.set(key, merged);
    } catch {
        /* ignore */
    }
    notifyDebtorSafe(
        date,
        evictionMeta,
        initialNoticeLawyerFeesIncluded,
        purpose,
        notifyOpts,
    );
}
