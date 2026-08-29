/** Phase C — طلبات الكفيل + حجز المتابعة من محضر المتابعة */
export type { UseExecutionDashboardGuarantorFollowupHandlersParams } from './useExecutionDashboardGuarantorFollowupHandlers.types';
import type { UseExecutionDashboardGuarantorFollowupHandlersParams } from './useExecutionDashboardGuarantorFollowupHandlers.types';
import { useGuarantorFollowupSeizureRequestHandlers } from './guarantorFollowupSeizureRequestHandlers';
import { useGuarantorFollowupDetailsHandlers } from './guarantorFollowupDetailsHandlers';
import { useGuarantorFollowupOpenHandlers } from './guarantorFollowupOpenHandlers';

export function useExecutionDashboardGuarantorFollowupHandlers(
    params: UseExecutionDashboardGuarantorFollowupHandlersParams,
) {
    const { requestFollowupSeizureDecision, requestGuarantorSeizure } =
        useGuarantorFollowupSeizureRequestHandlers(params);
    const { archiveAndClearGuarantor, persistGuarantorFollowupDetails } =
        useGuarantorFollowupDetailsHandlers(params);
    const { handleGuarantorRequestFromFollowup } = useGuarantorFollowupOpenHandlers(params);

    return {
        requestFollowupSeizureDecision,
        handleGuarantorRequestFromFollowup,
        archiveAndClearGuarantor,
        requestGuarantorSeizure,
        persistGuarantorFollowupDetails,
    };
}
