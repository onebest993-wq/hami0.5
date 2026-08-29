import type { InlineActionGateKey } from '@/app/components/lawyer/ExecutionDashboard/types';

/** تبويب المخاطبات — مشترك لكل مسارات محضر المتابعة وليس لنوع مطالبة واحد */
export interface CommunicationsTabProps {
    decisionsStorageExecutionId: string;
    /** يحسّن قراءة/حفظ قرارات المنفذ عبر الإضبارة الأب/الفرع وجميع أنواع المطالبة */
    executionData?: Record<string, unknown> | null;
    showToast: (message: string, type: 'success' | 'error' | 'warning' | 'info') => void;
    pushTimelineEvent: (event: {
        id: string;
        type: string;
        title: string;
        description: string;
        date: string;
        timestamp?: string;
        source?: string;
        metadata?: Record<string, unknown>;
    }) => void;
    nextTimelineId: () => string;
    showSoftFieldProcedures?: boolean;
    showEncroachmentSurveyor?: boolean;
    showSpecificDeliverySurveyor?: boolean;
    inlineActionGateKey?: InlineActionGateKey | null;
    setInlineActionGateKey?: (key: InlineActionGateKey | null) => void;
    onEncroachmentExpenseRecorded?: (
        row: import('@/app/utils/encroachmentRemovalRequests').EncroachmentCaseExpenseRow,
    ) => void;
}

export type CommunicationResultDraft = {
    purpose: string;
    letterNum: string;
    letterDate: string;
    result: string;
};

export type CommunicationAwaitingUiState = {
    noResponseFlow?: 'choose' | 'confirm_same' | 'edit';
    noResponseEditDate?: string;
    noResponseEditBody?: string;
    confirmingResend?: boolean;
    responseFormOpen?: boolean;
    /** تأكيد تجاهل متابعة النتيجة */
    confirmDismiss?: boolean;
};
