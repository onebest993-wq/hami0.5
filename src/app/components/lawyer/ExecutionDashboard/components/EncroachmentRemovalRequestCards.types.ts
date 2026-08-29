import type { InlineActionGateKey } from '../types';
import type { EncroachmentCaseExpenseRow } from '@/app/utils/encroachmentRemovalRequests';

export type EncroachmentRemovalCardsVariant = 'full' | 'surveyor_only';

export interface EncroachmentRemovalRequestCardsProps {
    variant?: EncroachmentRemovalCardsVariant;
    decisionsStorageExecutionId: string;
    inlineActionGateKey: InlineActionGateKey | null;
    setInlineActionGateKey: (key: InlineActionGateKey | null) => void;
    showToast: (
        message: string,
        type: 'success' | 'error' | 'warning' | 'info',
        opts?: { decisionsLink?: boolean }
    ) => void;
    onExpenseRecorded?: (row: EncroachmentCaseExpenseRow) => void;
}

export const PROCEDURE_BUTTON_CLASS =
    'w-full text-right rounded-2xl px-4 py-3.5 transition-colors border bg-[#0A1122]/80 border-white/5 hover:border-[#E6C673]/35';
