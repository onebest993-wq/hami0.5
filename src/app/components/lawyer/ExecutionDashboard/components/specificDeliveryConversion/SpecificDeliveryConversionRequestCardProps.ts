import type { InlineActionGateKey } from '../../types';
import type { SpecificDeliveryItem } from '@/app/utils/specificDeliveryItemsUtils';

export interface SpecificDeliveryConversionRequestCardProps {
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
    specificDeliveryFinancialized?: boolean;
    onConversionItemDeclared?: (itemId: string) => void;
}
