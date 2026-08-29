import type { InlineActionGateKey } from '../types';
import type { SpecificDeliveryCaseExpenseRow } from '@/app/utils/specificDeliveryPropertyExpertRequest';
import type { SpecificDeliveryItem } from '@/app/utils/specificDeliveryItemsUtils';

export interface SpecificDeliveryMovableValuationExpertCardProps {
    decisionsStorageExecutionId: string;
    inlineActionGateKey: InlineActionGateKey | null;
    setInlineActionGateKey: (key: InlineActionGateKey | null) => void;
    showToast: (
        message: string,
        type: 'success' | 'error' | 'warning' | 'info',
        opts?: { decisionsLink?: boolean }
    ) => void;
    specificDeliveryItemName?: string;
    specificDeliveryItems?: SpecificDeliveryItem[] | null;
    onExpenseRecorded?: (row: SpecificDeliveryCaseExpenseRow) => void;
    onValuationFinancialized?: (amount: number, itemId?: string) => void;
    hasPendingDeliveryItems?: boolean;
}

export function buildExpertNameSlots(
    row: Record<string, unknown> | null,
    required: number
): string[] {
    const names = Array.isArray(row?.expertNames)
        ? row!.expertNames!.map((x) => String(x || '').trim())
        : [];
    return Array.from({ length: required }, (_, i) => names[i] || '');
}
