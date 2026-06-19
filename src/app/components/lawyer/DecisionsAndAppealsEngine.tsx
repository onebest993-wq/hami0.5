import React from 'react';
import { TooltipProvider } from '@/app/components/ui/tooltip';
import { DECISIONS_APPEALS_TOOLTIP_DELAY_MS } from './DecisionsAndAppealsEngine/utils';
import { DecisionsAppealsHubView } from './DecisionsAndAppealsEngine/components/DecisionsAppealsHubView';
import { DecisionsAppealsAddDecisionModal } from './DecisionsAndAppealsEngine/components/DecisionsAppealsAddDecisionModal';
import { DecisionsAppealsAppealDetailModal } from './DecisionsAndAppealsEngine/components/DecisionsAppealsAppealDetailModal';
import { useDecisionsAppealsEngineController } from './DecisionsAndAppealsEngine/hooks/useDecisionsAppealsEngineController';
import type { DecisionsAndAppealsEngineProps } from './DecisionsAndAppealsEngine/engine/decisionsEngineTypes';

export type { DecisionsDispatcherHubProps } from './DecisionsAndAppealsEngine/engine/decisionsEngineTypes';

export const DecisionsAndAppealsEngine: React.FC<DecisionsAndAppealsEngineProps> = (props) => {
    const { hubView, addModal, appealDetailModal } = useDecisionsAppealsEngineController(props);

    return (
        <TooltipProvider delayDuration={DECISIONS_APPEALS_TOOLTIP_DELAY_MS}>
            <div className="flex min-h-0 flex-1 flex-col gap-3">
                <DecisionsAppealsHubView {...hubView} />
                <DecisionsAppealsAddDecisionModal {...addModal} />
                <DecisionsAppealsAppealDetailModal {...appealDetailModal} />
            </div>
        </TooltipProvider>
    );
};
