import type { ExecutionFile } from '@/app/types/execution';
import {
    isMaritalFurnitureDeliveryStatusRecorded,
    readMaritalFurnitureItems,
    sumUndeliveredMaritalFurnitureTotal,
} from '@/app/utils/maritalFurniture';
import { resolveMaritalFurnitureClaimExecutionData } from '@/app/components/lawyer/ExecutionDashboard/utils/resolveExecutionFinancialHubPrincipal';

export function resolveMaritalFurnitureFinancialSyncPatch(input: {
    executionData: ExecutionFile | Record<string, unknown>;
    executionId?: string;
    decisionsStorageExecutionId?: string;
    maritalFurnitureItemsForFollowup: unknown;
}): { debtAmount: number; totalAmount: number } | null {
    const mergedView = resolveMaritalFurnitureClaimExecutionData(
        input.executionData,
        input.executionId,
        input.decisionsStorageExecutionId,
    ) as ExecutionFile | Record<string, unknown>;

    const followupItems = Array.isArray(input.maritalFurnitureItemsForFollowup)
        ? (input.maritalFurnitureItemsForFollowup as Parameters<typeof sumUndeliveredMaritalFurnitureTotal>[0])
        : readMaritalFurnitureItems(mergedView);

    const items =
        readMaritalFurnitureItems({
            ...mergedView,
            maritalFurnitureItems:
                followupItems.length > 0
                    ? followupItems
                    : (mergedView as ExecutionFile).maritalFurnitureItems,
        }) || readMaritalFurnitureItems(mergedView);

    const mergedForStatus = {
        ...input.executionData,
        maritalFurnitureItems: items,
    };
    const deliveryRecorded = isMaritalFurnitureDeliveryStatusRecorded(mergedForStatus);
    const expectedFinancial = deliveryRecorded ? sumUndeliveredMaritalFurnitureTotal(items) : 0;

    const storedDebt = Math.round(
        Number((mergedView as ExecutionFile).debtAmount ?? input.executionData.debtAmount) || 0,
    );
    const storedTotal = Math.round(
        Number((mergedView as ExecutionFile).totalAmount ?? input.executionData.totalAmount) || 0,
    );
    const storedFinancial = Math.max(storedDebt, storedTotal);

    // لا تُصفّر مبالغاً محفوظة بسبب تأخر عرض القطع عن التخزين
    if (expectedFinancial === 0 && storedFinancial > 0) {
        return null;
    }

    if (storedDebt === expectedFinancial && storedTotal === expectedFinancial) {
        return null;
    }

    return { debtAmount: expectedFinancial, totalAmount: expectedFinancial };
}
