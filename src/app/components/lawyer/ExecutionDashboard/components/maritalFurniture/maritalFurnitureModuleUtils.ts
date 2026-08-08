import type { MaritalFurnitureItem } from '@/app/types/maritalFurniture';
import { resolveMaritalFurnitureDeliveryOutcome } from '@/app/utils/maritalFurniture';
import { formatMoneyIntegerDisplay } from '@/app/utils/moneyInput';

export function countLockedMaritalFurnitureDeliveryItems(rows: MaritalFurnitureItem[]): number {
    return rows.filter((row) => {
        const outcome = resolveMaritalFurnitureDeliveryOutcome(row);
        return outcome !== 'pending';
    }).length;
}

export function formatMaritalFurnitureCurrency(value: string): string {
    return formatMoneyIntegerDisplay(value);
}
