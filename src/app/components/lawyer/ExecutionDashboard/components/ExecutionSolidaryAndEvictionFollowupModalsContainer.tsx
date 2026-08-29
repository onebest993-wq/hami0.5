import React from 'react';
import { createPortal } from 'react-dom';
import { X } from '@/app/components/ui/icons/X';
import { ExecutionNamedOverlayInstantFrame } from './executionOverlayInstantPresets';
import {
    EXEC_MODAL_BACKDROP_SAFE_PAD,
    EXEC_MODAL_CLOSE_BTN_CLASS,
    EXEC_MODAL_HEADER_SAFE_TOP,
} from '../executionModalMobileShell';
import { PreloadableOverlayGate } from '@/app/components/lawyer/ExecutionDashboard/preloadableOverlayGate';
import { LazyEvictionFollowupModalsChunk } from '../executionEvictionFollowupLazy';

export type {
    SolidaryTargetDebtorRow,
    EvictionExpensePayMode,
    LawyerFeeDisburseMode,
    ExecutionSolidaryAndEvictionFollowupModalsContainerProps,
} from './ExecutionSolidaryAndEvictionFollowupModalsContainer.types';
import type { ExecutionSolidaryAndEvictionFollowupModalsContainerProps } from './ExecutionSolidaryAndEvictionFollowupModalsContainer.types';

export const ExecutionSolidaryAndEvictionFollowupModalsContainer: React.FC<
    ExecutionSolidaryAndEvictionFollowupModalsContainerProps
> = (props) => {
    const {
        showSolidaryCoerciveTargetModal,
        solidaryCoerciveActionPending,
        setShowSolidaryCoerciveTargetModal,
        onCloseSolidaryCoerciveTargetModal,
        setSolidaryCoerciveActionPending,
        EXEC_MODAL_BACKDROP_STRONG,
        nestedOverUnifiedZIndex,
        allDebtorsUnified,
        coerciveSubjectRef,
        saveCoerciveActionRef,
        buildInitialExecutorSeizureDetails,
        setShowCoerciveActionForm,
        isEvictionExecutionModule,
        showEvictionExpenseModal,
        showEvictionLawyerFeeModal,
        showEvictionResidentialGraceModal,
    } = props;

    const closeSolidaryCoerciveTargetModal = () => {
        if (typeof onCloseSolidaryCoerciveTargetModal === 'function') {
            onCloseSolidaryCoerciveTargetModal();
        } else {
            setShowSolidaryCoerciveTargetModal?.(false);
        }
        setSolidaryCoerciveActionPending?.(null);
    };

    const needEvictionChunk =
        isEvictionExecutionModule &&
        (showEvictionExpenseModal ||
            showEvictionLawyerFeeModal ||
            showEvictionResidentialGraceModal);

    return (
        <>
            {showSolidaryCoerciveTargetModal &&
                solidaryCoerciveActionPending &&
                typeof document !== 'undefined' &&
                createPortal(
                    <div
                        className={`fixed inset-0 flex items-center justify-center p-4 ${EXEC_MODAL_BACKDROP_STRONG} ${EXEC_MODAL_BACKDROP_SAFE_PAD}`}
                        style={{ zIndex: nestedOverUnifiedZIndex }}
                        role="presentation"
                        onClick={(e) => {
                            if (e.target === e.currentTarget) {
                                closeSolidaryCoerciveTargetModal();
                            }
                        }}
                    >
                        <div
                            dir="rtl"
                            className="w-full max-w-md rounded-3xl border border-amber-500/40 bg-[#0B1120] shadow-md"
                            onClick={(e) => e.stopPropagation()}
                            role="dialog"
                            aria-label="توجيه الإجراء ضد مدين"
                        >
                            <div
                                className={`flex items-center justify-between border-b border-amber-500/30 p-4 ${EXEC_MODAL_HEADER_SAFE_TOP}`}
                            >
                                <button
                                    type="button"
                                    onClick={closeSolidaryCoerciveTargetModal}
                                    className={`${EXEC_MODAL_CLOSE_BTN_CLASS} hover:bg-amber-500/20`}
                                    aria-label="إغلاق"
                                >
                                    <X size={20} className="text-white" />
                                </button>
                                <h2 className="text-lg font-bold text-amber-400 text-right">
                                    توجيه الإجراء ضد من؟
                                </h2>
                            </div>
                            <p className="px-4 pt-3 text-right text-[11px] leading-relaxed text-slate-400">
                                ذمة متضامنة: اختر المدين المستهدف قبل تسجيل الطلب أو المسودة المرسلة لمنفذ العدل.
                            </p>
                            <ul className="max-h-[min(48dvh,320px)] space-y-2 overflow-y-auto overscroll-contain p-4">
                                {allDebtorsUnified
                                    .filter((r) => !r.cleared)
                                    .map((r) => (
                                        <li key={r.id}>
                                            <button
                                                type="button"
                                                className="w-full rounded-xl border border-slate-600/50 bg-slate-900/60 p-3 text-right text-sm font-semibold text-white transition-colors hover:border-amber-500/40 hover:bg-slate-800/80"
                                                onClick={() => {
                                                    const act = solidaryCoerciveActionPending;
                                                    if (!act) return;
                                                    coerciveSubjectRef.current = {
                                                        id: r.id,
                                                        name: r.name,
                                                    };
                                                    closeSolidaryCoerciveTargetModal();
                                                    if (
                                                        ['salary', 'property', 'vehicle'].includes(
                                                            act,
                                                        )
                                                    ) {
                                                        saveCoerciveActionRef.current(
                                                            act,
                                                            buildInitialExecutorSeizureDetails(act),
                                                        );
                                                    } else {
                                                        setShowCoerciveActionForm(act);
                                                    }
                                                }}
                                            >
                                                {r.name}
                                            </button>
                                        </li>
                                    ))}
                            </ul>
                        </div>
                    </div>,
                    document.body,
                )}

            {needEvictionChunk ? (
                <PreloadableOverlayGate
                    lazy={LazyEvictionFollowupModalsChunk}
                    lazyProps={props}
                    fallback={
                        <ExecutionNamedOverlayInstantFrame
                            title={
                                showEvictionExpenseModal
                                    ? 'مصاريف التخلية'
                                    : showEvictionLawyerFeeModal
                                      ? 'أتعاب المحامي'
                                      : 'مهلة السكن'
                            }
                            onClose={() => {
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
                />
            ) : null}
        </>
    );
};
