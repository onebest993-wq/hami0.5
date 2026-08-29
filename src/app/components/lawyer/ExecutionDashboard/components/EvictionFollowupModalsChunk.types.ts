import type { ExecutionSolidaryAndEvictionFollowupModalsContainerProps } from './ExecutionSolidaryAndEvictionFollowupModalsContainer.types';

export type EvictionFollowupModalsChunkProps = Pick<
    ExecutionSolidaryAndEvictionFollowupModalsContainerProps,
    | 'showEvictionExpenseModal'
    | 'isEvictionExecutionModule'
    | 'setShowEvictionExpenseModal'
    | 'onCloseEvictionExpenseModal'
    | 'evictionExpensePayMode'
    | 'setEvictionExpensePayMode'
    | 'evictionExpenseAmount'
    | 'setEvictionExpenseAmount'
    | 'evictionExpenseNote'
    | 'setEvictionExpenseNote'
    | 'runEvictionExpenseSubmit'
    | 'showEvictionLawyerFeeModal'
    | 'setShowEvictionLawyerFeeModal'
    | 'onCloseEvictionLawyerFeeModal'
    | 'parsedLawyerFees'
    | 'lawyerFeeDisburseMode'
    | 'setLawyerFeeDisburseMode'
    | 'lawyerFeeDisburseNotes'
    | 'setLawyerFeeDisburseNotes'
    | 'runEvictionLawyerFeeSubmit'
    | 'showEvictionResidentialGraceModal'
    | 'setShowEvictionResidentialGraceModal'
    | 'onCloseEvictionResidentialGraceModal'
    | 'graceModalStartYmd'
    | 'setGraceModalStartYmd'
    | 'graceModalEndYmd'
    | 'setGraceModalEndYmd'
    | 'residentialVacateDeadlineMaxIso'
    | 'residentialGraceModalShowPrimarySave'
    | 'submitEvictionResidentialGraceFromModal'
    | 'EXEC_MODAL_BACKDROP_STRONG'
    | 'nestedOverUnifiedZIndex'
>;

export type EvictionExpenseFollowupModalProps = Pick<
    EvictionFollowupModalsChunkProps,
    | 'setShowEvictionExpenseModal'
    | 'onCloseEvictionExpenseModal'
    | 'evictionExpensePayMode'
    | 'setEvictionExpensePayMode'
    | 'evictionExpenseAmount'
    | 'setEvictionExpenseAmount'
    | 'evictionExpenseNote'
    | 'setEvictionExpenseNote'
    | 'runEvictionExpenseSubmit'
    | 'nestedOverUnifiedZIndex'
>;

export type EvictionLawyerFeeFollowupModalProps = Pick<
    EvictionFollowupModalsChunkProps,
    | 'setShowEvictionLawyerFeeModal'
    | 'onCloseEvictionLawyerFeeModal'
    | 'parsedLawyerFees'
    | 'lawyerFeeDisburseMode'
    | 'setLawyerFeeDisburseMode'
    | 'lawyerFeeDisburseNotes'
    | 'setLawyerFeeDisburseNotes'
    | 'runEvictionLawyerFeeSubmit'
    | 'nestedOverUnifiedZIndex'
>;

export type EvictionResidentialGraceFollowupModalProps = Pick<
    EvictionFollowupModalsChunkProps,
    | 'setShowEvictionResidentialGraceModal'
    | 'onCloseEvictionResidentialGraceModal'
    | 'graceModalStartYmd'
    | 'setGraceModalStartYmd'
    | 'graceModalEndYmd'
    | 'setGraceModalEndYmd'
    | 'residentialVacateDeadlineMaxIso'
    | 'residentialGraceModalShowPrimarySave'
    | 'submitEvictionResidentialGraceFromModal'
    | 'EXEC_MODAL_BACKDROP_STRONG'
    | 'nestedOverUnifiedZIndex'
>;
