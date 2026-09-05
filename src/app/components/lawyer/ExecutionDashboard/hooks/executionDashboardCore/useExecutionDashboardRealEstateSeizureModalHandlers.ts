/** مسار نافذة ما بعد موافقة حجز العقار أُزيل — واجهة فارغة للتوافق مع التجميع */
import { useCallback, useMemo, type Dispatch, type MutableRefObject, type SetStateAction } from 'react';
import type { RealEstateSeizureAsset, TimelineEvent } from '@/app/types/execution';

export type UseExecutionDashboardRealEstateSeizureModalHandlersParams = {
    decisionsStorageExecutionId: string | undefined;
    realEstateSeizureAssets: RealEstateSeizureAsset[];
    realEstateSeizureModalDecisionId: string | null;
    realEstateSeizureSnapshotRef: MutableRefObject<RealEstateSeizureAsset[]>;
    nextTimelineId: () => string;
    pushTimelineEvent: (
        event: TimelineEvent,
        opts?: { mergePatch?: Record<string, unknown> },
    ) => void;
    showToast: (message: string, type?: string) => void;
    setRealEstateSeizureAssets: Dispatch<SetStateAction<RealEstateSeizureAsset[]>>;
    setShowRealEstateSeizureModal: (show: boolean) => void;
};

export function useExecutionDashboardRealEstateSeizureModalHandlers(
    _params: UseExecutionDashboardRealEstateSeizureModalHandlersParams,
) {
    const realEstateModalInitial = useMemo(() => null, []);
    const saveRealEstateSeizureFromModal = useCallback((_next: RealEstateSeizureAsset) => {}, []);
    return { realEstateModalInitial, saveRealEstateSeizureFromModal };
}
