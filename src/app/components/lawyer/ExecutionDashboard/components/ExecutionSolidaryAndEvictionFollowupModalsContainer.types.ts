import type React from 'react';

export type SolidaryTargetDebtorRow = {
    id: string;
    name: string;
    cleared: boolean;
};

export type EvictionExpensePayMode = 'salary_fifth' | 'lump_sum' | 'installments';
export type LawyerFeeDisburseMode = 'salary_fifth' | 'lump_sum' | 'settlement';

export interface ExecutionSolidaryAndEvictionFollowupModalsContainerProps {
    showSolidaryCoerciveTargetModal: boolean;
    solidaryCoerciveActionPending: string | null;
    setShowSolidaryCoerciveTargetModal?: (show: boolean) => void;
    onCloseSolidaryCoerciveTargetModal?: () => void;
    setSolidaryCoerciveActionPending?: (v: string | null) => void;
    EXEC_MODAL_BACKDROP_STRONG: string;
    nestedOverUnifiedZIndex: number;
    allDebtorsUnified: SolidaryTargetDebtorRow[];
    coerciveSubjectRef: React.MutableRefObject<{ id: string; name: string }>;
    saveCoerciveActionRef: React.MutableRefObject<(actionType: string, details: Record<string, string>) => void>;
    buildInitialExecutorSeizureDetails: (actionType: string) => Record<string, string>;
    setShowCoerciveActionForm: (v: string | null) => void;

    showEvictionExpenseModal: boolean;
    isEvictionExecutionModule: boolean;
    setShowEvictionExpenseModal?: (show: boolean) => void;
    onCloseEvictionExpenseModal?: () => void;
    evictionExpensePayMode: EvictionExpensePayMode;
    setEvictionExpensePayMode: React.Dispatch<React.SetStateAction<EvictionExpensePayMode>>;
    evictionExpenseAmount: string;
    setEvictionExpenseAmount: (v: string) => void;
    evictionExpenseNote: string;
    setEvictionExpenseNote: (v: string) => void;
    runEvictionExpenseSubmit: (e: React.MouseEvent<HTMLButtonElement>) => void | Promise<void>;

    showEvictionLawyerFeeModal: boolean;
    setShowEvictionLawyerFeeModal?: (show: boolean) => void;
    onCloseEvictionLawyerFeeModal?: () => void;
    parsedLawyerFees: number;
    lawyerFeeDisburseMode: LawyerFeeDisburseMode;
    setLawyerFeeDisburseMode: React.Dispatch<React.SetStateAction<LawyerFeeDisburseMode>>;
    lawyerFeeDisburseNotes: string;
    setLawyerFeeDisburseNotes: (v: string) => void;
    runEvictionLawyerFeeSubmit: (e: React.MouseEvent<HTMLButtonElement>) => void | Promise<void>;

    showEvictionResidentialGraceModal: boolean;
    setShowEvictionResidentialGraceModal?: (show: boolean) => void;
    onCloseEvictionResidentialGraceModal?: () => void;
    graceModalStartYmd: string;
    setGraceModalStartYmd: (v: string) => void;
    graceModalEndYmd: string;
    setGraceModalEndYmd: (v: string) => void;
    residentialVacateDeadlineMaxIso: string;
    residentialGraceModalShowPrimarySave: boolean;
    submitEvictionResidentialGraceFromModal: () => void;
}
