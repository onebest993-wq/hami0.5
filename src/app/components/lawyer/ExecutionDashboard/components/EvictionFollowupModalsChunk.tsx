import React from 'react';
import type { EvictionFollowupModalsChunkProps } from './EvictionFollowupModalsChunk.types';
import { ExecutionNamedOverlayInstantFrame } from './executionOverlayInstantPresets';
import { PreloadableOverlayGate } from '@/app/components/lawyer/ExecutionDashboard/preloadableOverlayGate';
import {
    LazyEvictionExpenseFollowupModal,
    LazyEvictionLawyerFeeFollowupModal,
    LazyEvictionResidentialGraceFollowupModal,
} from '../executionEvictionFollowupLazy';

/** مودالات متابعة التخلية — يُحمَّل كسلاسل عند الحاجة فقط؛ كل مودال further-lazy */
export function EvictionFollowupModalsChunk(p: EvictionFollowupModalsChunkProps) {
    const {
        showEvictionExpenseModal,
        isEvictionExecutionModule,
        showEvictionLawyerFeeModal,
        showEvictionResidentialGraceModal,
        setShowEvictionExpenseModal,
        onCloseEvictionExpenseModal,
        evictionExpensePayMode,
        setEvictionExpensePayMode,
        evictionExpenseAmount,
        setEvictionExpenseAmount,
        evictionExpenseNote,
        setEvictionExpenseNote,
        runEvictionExpenseSubmit,
        setShowEvictionLawyerFeeModal,
        onCloseEvictionLawyerFeeModal,
        parsedLawyerFees,
        lawyerFeeDisburseMode,
        setLawyerFeeDisburseMode,
        lawyerFeeDisburseNotes,
        setLawyerFeeDisburseNotes,
        runEvictionLawyerFeeSubmit,
        setShowEvictionResidentialGraceModal,
        onCloseEvictionResidentialGraceModal,
        graceModalStartYmd,
        setGraceModalStartYmd,
        graceModalEndYmd,
        setGraceModalEndYmd,
        residentialVacateDeadlineMaxIso,
        residentialGraceModalShowPrimarySave,
        submitEvictionResidentialGraceFromModal,
        EXEC_MODAL_BACKDROP_STRONG,
        nestedOverUnifiedZIndex,
    } = p;

    return (
        <>
            {showEvictionExpenseModal && isEvictionExecutionModule ? (
                <PreloadableOverlayGate
                    lazy={LazyEvictionExpenseFollowupModal}
                    lazyProps={{
                        setShowEvictionExpenseModal,
                        onCloseEvictionExpenseModal,
                        evictionExpensePayMode,
                        setEvictionExpensePayMode,
                        evictionExpenseAmount,
                        setEvictionExpenseAmount,
                        evictionExpenseNote,
                        setEvictionExpenseNote,
                        runEvictionExpenseSubmit,
                        nestedOverUnifiedZIndex,
                    }}
                    fallback={
                        <ExecutionNamedOverlayInstantFrame
                            title="مصاريف التخلية"
                            onClose={() => {
                                if (typeof onCloseEvictionExpenseModal === 'function') {
                                    onCloseEvictionExpenseModal();
                                } else {
                                    setShowEvictionExpenseModal?.(false);
                                }
                            }}
                        />
                    }
                />
            ) : null}

            {showEvictionLawyerFeeModal && isEvictionExecutionModule ? (
                <PreloadableOverlayGate
                    lazy={LazyEvictionLawyerFeeFollowupModal}
                    lazyProps={{
                        setShowEvictionLawyerFeeModal,
                        onCloseEvictionLawyerFeeModal,
                        parsedLawyerFees,
                        lawyerFeeDisburseMode,
                        setLawyerFeeDisburseMode,
                        lawyerFeeDisburseNotes,
                        setLawyerFeeDisburseNotes,
                        runEvictionLawyerFeeSubmit,
                        nestedOverUnifiedZIndex,
                    }}
                    fallback={
                        <ExecutionNamedOverlayInstantFrame
                            title="أتعاب المحامي"
                            onClose={() => {
                                if (typeof onCloseEvictionLawyerFeeModal === 'function') {
                                    onCloseEvictionLawyerFeeModal();
                                } else {
                                    setShowEvictionLawyerFeeModal?.(false);
                                }
                            }}
                        />
                    }
                />
            ) : null}

            {showEvictionResidentialGraceModal && isEvictionExecutionModule ? (
                <PreloadableOverlayGate
                    lazy={LazyEvictionResidentialGraceFollowupModal}
                    lazyProps={{
                        setShowEvictionResidentialGraceModal,
                        onCloseEvictionResidentialGraceModal,
                        graceModalStartYmd,
                        setGraceModalStartYmd,
                        graceModalEndYmd,
                        setGraceModalEndYmd,
                        residentialVacateDeadlineMaxIso,
                        residentialGraceModalShowPrimarySave,
                        submitEvictionResidentialGraceFromModal,
                        EXEC_MODAL_BACKDROP_STRONG,
                        nestedOverUnifiedZIndex,
                    }}
                    fallback={
                        <ExecutionNamedOverlayInstantFrame
                            title="مهلة السكن"
                            onClose={() => {
                                if (typeof onCloseEvictionResidentialGraceModal === 'function') {
                                    onCloseEvictionResidentialGraceModal();
                                } else {
                                    setShowEvictionResidentialGraceModal?.(false);
                                }
                            }}
                        />
                    }
                />
            ) : null}
        </>
    );
}
