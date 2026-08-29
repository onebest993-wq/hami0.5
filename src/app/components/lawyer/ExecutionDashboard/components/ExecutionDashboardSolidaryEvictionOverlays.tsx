import React, { Suspense } from 'react';
import { LazyExecutionSolidaryAndEvictionFollowupModalsContainer } from '@/app/components/lawyer/ExecutionDashboard/executionDashboardLazyRegistryOverlays';
import { ExecutionNamedOverlayInstantFrame } from './executionOverlayInstantPresets';
import type { ExecutionSolidaryAndEvictionFollowupModalsContainerProps } from './ExecutionSolidaryAndEvictionFollowupModalsContainer';

export type ExecutionDashboardSolidaryEvictionOverlaysProps =
    ExecutionSolidaryAndEvictionFollowupModalsContainerProps;

/** modals التضامن/إخلاء — chunk lazy منفصل */
export function ExecutionDashboardSolidaryEvictionOverlays(
    props: ExecutionDashboardSolidaryEvictionOverlaysProps,
) {
    const {
        showSolidaryCoerciveTargetModal,
        showEvictionExpenseModal,
        showEvictionLawyerFeeModal,
        showEvictionResidentialGraceModal,
    } = props;

    if (
        !showSolidaryCoerciveTargetModal &&
        !showEvictionExpenseModal &&
        !showEvictionLawyerFeeModal &&
        !showEvictionResidentialGraceModal
    ) {
        return null;
    }

    return (
        <Suspense
            fallback={
                <ExecutionNamedOverlayInstantFrame
                    title={
                        showSolidaryCoerciveTargetModal
                            ? 'تحديد المطلوب ضده'
                            : showEvictionExpenseModal
                              ? 'مصاريف التخلية'
                              : showEvictionLawyerFeeModal
                                ? 'أتعاب المحامي'
                                : 'مهلة السكن'
                    }
                    onClose={() => {
                        if (showSolidaryCoerciveTargetModal) {
                            if (typeof props.onCloseSolidaryCoerciveTargetModal === 'function') {
                                props.onCloseSolidaryCoerciveTargetModal();
                            } else {
                                props.setShowSolidaryCoerciveTargetModal?.(false);
                            }
                            return;
                        }
                        if (showEvictionExpenseModal) {
                            if (typeof props.onCloseEvictionExpenseModal === 'function') {
                                props.onCloseEvictionExpenseModal();
                            } else {
                                props.setShowEvictionExpenseModal?.(false);
                            }
                            return;
                        }
                        if (showEvictionLawyerFeeModal) {
                            if (typeof props.onCloseEvictionLawyerFeeModal === 'function') {
                                props.onCloseEvictionLawyerFeeModal();
                            } else {
                                props.setShowEvictionLawyerFeeModal?.(false);
                            }
                            return;
                        }
                        if (typeof props.onCloseEvictionResidentialGraceModal === 'function') {
                            props.onCloseEvictionResidentialGraceModal();
                        } else {
                            props.setShowEvictionResidentialGraceModal?.(false);
                        }
                    }}
                />
            }
        >
            <LazyExecutionSolidaryAndEvictionFollowupModalsContainer {...props} />
        </Suspense>
    );
}
