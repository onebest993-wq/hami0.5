import React from 'react';
import type { SeizedProperty } from '@/app/types/execution';
import type { PropertyInlineSaveContext } from '../utils/propertySeizureInlinePersistence';
import {
    SeizureInlineSectionsCore,
    type PropertyExpertDecisionSubtype,
    type SeizureInlineSectionKey,
} from './seizureInlineSections/SeizureInlineSectionsCore';

export type PropertyInlineSectionKey = SeizureInlineSectionKey;
export type { PropertyExpertDecisionSubtype };

export type PropertySeizureInlineSectionsProps = {
    property: SeizedProperty;
    properties: SeizedProperty[];
    decisions: Array<Record<string, unknown>>;
    saveCtx: PropertyInlineSaveContext;
    focusKey?: string | null;
    pendingDecisionId?: string | null;
    section?: PropertyInlineSectionKey;
    embedded?: boolean;
    expertDecisionSubtype?: PropertyExpertDecisionSubtype;
};

/** غلاف رفيع — المنطق في SeizureInlineSectionsCore(assetKind: 'property'). */
export const PropertySeizureInlineSections: React.FC<PropertySeizureInlineSectionsProps> = ({
    property,
    properties,
    decisions,
    saveCtx,
    focusKey,
    pendingDecisionId,
    section,
    embedded,
    expertDecisionSubtype,
}) => (
    <SeizureInlineSectionsCore
        assetKind="property"
        entity={property}
        entities={properties}
        decisions={decisions}
        saveCtx={saveCtx}
        focusKey={focusKey}
        pendingDecisionId={pendingDecisionId}
        section={section}
        embedded={embedded}
        expertDecisionSubtype={expertDecisionSubtype}
    />
);
