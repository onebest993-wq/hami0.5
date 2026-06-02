import React from 'react';
import type { JourneyNode } from '@/app/types/criminal';
import { resolveRecordJourneyStage, resolveRecordJourneyStageLabel } from '../casePhaseFilterEngine';
import { journeyStageBadgeClass } from '../journeyStageVisuals';

export type JourneyStageRecordRef = {
    date?: string;
    requestDate?: string;
    issuedAt?: string;
    attachmentDate?: string;
    proceduralNodeId?: string;
};

export type JourneyStageBadgeProps = {
    item: JourneyStageRecordRef;
    stageJourney: JourneyNode[] | undefined;
    className?: string;
};

/** شارة مرحلة الإصدار — نفس ألوان مسار تتبع الإضبارة. */
export const JourneyStageBadge = ({ item, stageJourney, className }: JourneyStageBadgeProps) => {
    const stage = resolveRecordJourneyStage(item, stageJourney);
    const label = resolveRecordJourneyStageLabel(item, stageJourney);
    return (
        <span className={`${journeyStageBadgeClass(stage)} ${className ?? ''}`} title={`مرحلة الإصدار: ${label}`}>
            {label}
        </span>
    );
};
