/** Phase C Slice 18 — مذكرة إخبار الورثة + تاريخ التبليغ (تخلية) */
import { useCallback } from 'react';
import { EVICTION_TIMELINE_ACTION_IDS } from '@/app/utils/executionModuleStrategies';

export type UseExecutionDashboardEvictionHeirsMemoHandlersParams = {
    evictionHeirsNotificationDateYmd: string;
    setEvictionHeirsNotificationDateYmd: (ymd: string) => void;
    persistExecutionMerge: (patch: Record<string, unknown>) => void;
    appendEvictionProcedure: (input: {
        actionId: string;
        title: string;
        description: string;
    }) => void;
};

export function useExecutionDashboardEvictionHeirsMemoHandlers(
    params: UseExecutionDashboardEvictionHeirsMemoHandlersParams,
) {
    const {
        evictionHeirsNotificationDateYmd,
        setEvictionHeirsNotificationDateYmd,
        persistExecutionMerge,
        appendEvictionProcedure,
    } = params;

    const handleEvictionHeirsNotificationDateChange = useCallback(
        (ymd: string) => {
            setEvictionHeirsNotificationDateYmd(ymd);
            persistExecutionMerge({ eviction_heirs_notification_date_ymd: ymd.trim() ? ymd : null });
        },
        [persistExecutionMerge, setEvictionHeirsNotificationDateYmd],
    );

    const handleIssueHeirsExecutionNoticeMemo = useCallback(() => {
        const ymd = evictionHeirsNotificationDateYmd.trim();
        const datePart = ymd ? `\nتاريخ تبليغ الورثة المسجَّل: ${ymd}.` : '';
        appendEvictionProcedure({
            actionId: EVICTION_TIMELINE_ACTION_IDS.HEIRS_EXECUTION_NOTICE_MEMO,
            title: '📜 إصدار مذكرة إخبار بالتنفيذ للورثة',
            description: `تم إصدار مذكرة إخبار بالتنفيذ لورثة المدين الشاغلين للعقار.${datePart}`,
        });
    }, [appendEvictionProcedure, evictionHeirsNotificationDateYmd]);

    return {
        handleEvictionHeirsNotificationDateChange,
        handleIssueHeirsExecutionNoticeMemo,
    };
}
