import React from 'react';
import type { SeizedMovable } from '@/app/types/execution';
import type { MovableInlineSaveContext } from '../utils/movableSeizureInlinePersistence';
import {
    SeizureInlineSectionsCore,
    type MovableExpertDecisionSubtype,
    type SeizureInlineSectionKey,
} from './seizureInlineSections/SeizureInlineSectionsCore';

export type MovableInlineSectionKey = SeizureInlineSectionKey;
export type { MovableExpertDecisionSubtype };

export type MovableSeizureInlineSectionsProps = {
    movable: SeizedMovable;
    movables: SeizedMovable[];
    decisions: Array<Record<string, unknown>>;
    saveCtx: MovableInlineSaveContext;
    focusKey?: string | null;
    pendingDecisionId?: string | null;
    section?: MovableInlineSectionKey;
    embedded?: boolean;
    expertDecisionSubtype?: MovableExpertDecisionSubtype;
};

/** غلاف رفيع — المنطق في SeizureInlineSectionsCore(assetKind: 'movable'). */
export const MovableSeizureInlineSections: React.FC<MovableSeizureInlineSectionsProps> = ({
    movable,
    movables,
    decisions,
    saveCtx,
    focusKey,
    pendingDecisionId,
    section,
    embedded,
    expertDecisionSubtype,
}) => (
    <SeizureInlineSectionsCore
        assetKind="movable"
        entity={movable}
        entities={movables}
        decisions={decisions}
        saveCtx={saveCtx}
        focusKey={focusKey}
        pendingDecisionId={pendingDecisionId}
        section={section}
        embedded={embedded}
        expertDecisionSubtype={expertDecisionSubtype}
    />
);
