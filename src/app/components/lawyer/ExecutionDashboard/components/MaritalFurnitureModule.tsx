import React from 'react';
import { formatMaritalFurnitureIqd } from '@/app/utils/maritalFurniture';
import { MaritalFurnitureLauncherCard } from './maritalFurniture/MaritalFurnitureLauncherCard';
import { MaritalFurnitureWorkspaceBody } from './maritalFurniture/MaritalFurnitureWorkspaceBody';
import { MaritalFurnitureWorkspaceSheet } from './maritalFurniture/MaritalFurnitureWorkspaceSheet';
import { useMaritalFurnitureModuleState } from './maritalFurniture/useMaritalFurnitureModuleState';

export type { MaritalFurnitureModuleProps } from './maritalFurniture/maritalFurnitureModuleTypes';

export const MaritalFurnitureModule: React.FC<
    import('./maritalFurniture/maritalFurnitureModuleTypes').MaritalFurnitureModuleProps
> = (props) => {
    const state = useMaritalFurnitureModuleState(props);

    return (
        <>
            <MaritalFurnitureLauncherCard
                itemCount={state.displayItems.length}
                lockedCount={state.lockedDeliveryCount}
                totalLabel={formatMaritalFurnitureIqd(
                    state.deliveryRecorded ? state.remainingListTotal : state.total,
                )}
                deliveredLabel={
                    state.deliveryRecorded && state.deliveredTotal > 0
                        ? formatMaritalFurnitureIqd(state.deliveredTotal)
                        : undefined
                }
                scheduleHint={state.scheduleHint}
                onOpen={state.openWorkspace}
                locked={state.locked}
            />
            <MaritalFurnitureWorkspaceSheet
                open={state.workspaceOpen}
                onClose={state.requestCloseWorkspace}
                headerActions={state.headerActions}
            >
                <MaritalFurnitureWorkspaceBody {...state} />
            </MaritalFurnitureWorkspaceSheet>

            {state.sectionConfirmDialog}
        </>
    );
};
