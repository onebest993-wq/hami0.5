import React from 'react';
import { Gavel } from '@/app/components/ui/icons/Gavel';
import { X } from '@/app/components/ui/icons/X';
import { useBodyScrollLock } from '@/app/utils/bodyScrollLock';
import {
    EXEC_MODAL_BACKDROP_SAFE_PAD,
    EXEC_MODAL_CLOSE_BTN_CLASS,
    EXEC_MODAL_COERCIVE_SHELL_MAX,
    EXEC_MODAL_HEADER_SAFE_TOP,
} from '../executionModalMobileShell';
import { ExecutionCoerciveActionsModalBody } from './ExecutionCoerciveActionsModalBody';

export type { ExecutionCoerciveActionsModalContainerProps } from './ExecutionCoerciveActionsModalContainer.types';
import type { ExecutionCoerciveActionsModalContainerProps } from './ExecutionCoerciveActionsModalContainer.types';

export const ExecutionCoerciveActionsModalContainer: React.FC<ExecutionCoerciveActionsModalContainerProps> = ({
    showCoerciveModal,
    setShowCoerciveModal,
    onCloseCoerciveModal,
    followupEmployeeFinancialSalaryOnlyCoercive,
    followupMonetaryCoerciveLimitedOnly,
    activeDebtorIsEmployee,
    executionCoerciveButtonDisabled,
    daysSinceNoticeCalculated,
    remaining,
    handleCoerciveAction,
    isDebtorGovernmentEmployee,
    isDebtorFreelancer,
    isNonFinancialClaim,
    showToast,
}) => {
    useBodyScrollLock(showCoerciveModal);

    const closeCoerciveModal = () => {
        if (typeof onCloseCoerciveModal === 'function') {
            onCloseCoerciveModal();
        } else {
            setShowCoerciveModal?.(false);
        }
    };

    if (!showCoerciveModal) return null;

    return (
        <div
            className={`fixed inset-0 z-[100] flex items-center justify-center bg-black/70 p-4 ${EXEC_MODAL_BACKDROP_SAFE_PAD}`}
            onClick={() => closeCoerciveModal()}
        >
            <div
                className={`w-full max-w-md overflow-y-auto rounded-3xl border-2 border-rose-500/40 bg-[#0B1120] ${EXEC_MODAL_COERCIVE_SHELL_MAX}`}
                onClick={(e) => e.stopPropagation()}
            >
                <div
                    className={`sticky top-0 z-10 flex items-center justify-between border-b border-rose-500/30 bg-[#0B1120] p-4 ${EXEC_MODAL_HEADER_SAFE_TOP}`}
                >
                    <button
                        type="button"
                        onClick={() => closeCoerciveModal()}
                        className={EXEC_MODAL_CLOSE_BTN_CLASS}
                    >
                        <X size={20} className="text-white" />
                    </button>
                    <h2 className="text-rose-400 font-bold text-lg flex items-center gap-2">
                        <Gavel size={20} />
                        {followupEmployeeFinancialSalaryOnlyCoercive
                            ? 'طلبات حجز — تنفيذ مالي (موظف)'
                            : followupMonetaryCoerciveLimitedOnly
                              ? 'طلبات حجز مال — راتب وعقار ومنقول'
                              : 'التنفيذ الجبري والإكراه'}
                    </h2>
                </div>
                
                <ExecutionCoerciveActionsModalBody
                    followupEmployeeFinancialSalaryOnlyCoercive={followupEmployeeFinancialSalaryOnlyCoercive}
                    followupMonetaryCoerciveLimitedOnly={followupMonetaryCoerciveLimitedOnly}
                    activeDebtorIsEmployee={activeDebtorIsEmployee}
                    executionCoerciveButtonDisabled={executionCoerciveButtonDisabled}
                    daysSinceNoticeCalculated={daysSinceNoticeCalculated}
                    remaining={remaining}
                    handleCoerciveAction={handleCoerciveAction}
                    isDebtorGovernmentEmployee={isDebtorGovernmentEmployee}
                    isDebtorFreelancer={isDebtorFreelancer}
                    isNonFinancialClaim={isNonFinancialClaim}
                    showToast={showToast}
                    closeCoerciveModal={closeCoerciveModal}
                />
            </div>
        </div>
    );
};
