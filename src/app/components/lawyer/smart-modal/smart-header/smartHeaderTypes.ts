export interface SmartHeaderProps {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    formData: any;
    onToggleClient?: () => void;
    isPaused?: boolean;
    incidentalCases?: unknown[];
    stages?: unknown[];
    currentStageId?: string;
    pauseReason?: string;
    onResume?: () => void;
    onPause?: () => void;
    status?: string;
    isInterrupted?: boolean;
    interruptionData?: unknown;
    linkedCaseNo?: string;
    onInterrupt?: () => void;
    onAbandon?: () => void;
    onNotification?: () => void;
    onStageClick?: (id: string) => void;
    stageHistory?: unknown[];
    isReadOnly?: boolean;
    hasCrossAppeal?: boolean;
    onCancelCrossAppeal?: () => void;
    onAddCrossAppeal?: () => void;
    notificationStatus?: string;
    onToggleNotification?: () => void;
    caseType?: string;
    onCassationDecision?: (type: string) => void;
    isPleadingsClosed?: boolean;
    wasReopened?: boolean;
    onClosePleadings?: () => void;
    onReopenPleadings?: () => void;
    onRegisterOpponentAppeal?: () => void;
    onCassationAppeal?: () => void;
    hasJudgment?: boolean;
    onDefaultObjection?: () => void;
    onWaiveObjection?: () => void;
    onOtherAppeals?: () => void;
    provisionalOrders?: unknown[];
    onAddProvisionalOrder?: () => void;
    thirdParties?: unknown[];
    representedParty?: unknown;
    onUpdateIncidentalEntryDecision?: (id: string, decision: string) => void;
    crossAppealEligibility?: import('../smartFile/crossAppealEngine').CrossAppealEligibility;
}

/** طرف في شريط الرأس — متوافق مع Party من LawyerShared */
export type HeaderParty = {
    name?: string | null;
    role?: string | null;
    address?: string | null;
    isClient?: boolean;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    [key: string]: any;
};
