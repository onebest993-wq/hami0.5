import React from 'react';
import type { SeizedMovable, SeizedProperty } from '@/app/types/execution';
import type { SeizureAssetKind } from '@/app/domain/seizure/seizureWorkflowTypes';
import { getSeizureAssetPlugin } from '@/app/domain/seizure/seizureAssetPlugins';
import { findSeizureDecisionForEntity } from '@/app/domain/seizure/seizureWorkflowDecisionQueries';
import { isDecisionResolvedApproved } from '@/app/domain/seizure/seizureWorkflowStatus';
import { CollapsibleWorkflowToggle } from '../CollapsibleWorkflowToggle';
import {
    expertCommitteeSizeLabelAr,
    readExpertCommitteeSize,
} from '../../utils/expertCommitteeUtils';
import { formatNumberInput } from '@/app/utils/execution/amountInput';
import {
    ensureMovableInList,
    type MovableInlineSaveContext,
} from '../../utils/movableSeizureInlinePersistence';
import { type PropertyInlineSaveContext } from '../../utils/propertySeizureInlinePersistence';

export const FIELD =
    'w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-[11px] text-slate-100 outline-none';

export const THEME = {
    movable: {
        btnSave:
            'w-full rounded-xl border border-sky-500/35 bg-sky-500/10 py-2 text-[10px] font-black text-sky-100 hover:bg-sky-500/15',
        markTitle: 'text-sky-200',
        publicationTitle: 'text-sky-200',
        awardSelected: 'border-sky-500/40 bg-sky-500/15 text-sky-100',
    },
    property: {
        btnSave:
            'w-full rounded-xl border border-emerald-500/35 bg-emerald-500/10 py-2 text-[10px] font-black text-emerald-100 hover:bg-emerald-500/15',
        markTitle: 'text-amber-200',
        publicationTitle: 'text-amber-200',
        awardSelected: 'border-emerald-500/40 bg-emerald-500/15 text-emerald-100',
    },
} as const;

export type SeizureInlineSectionKey =
    | 'mark'
    | 'experts'
    | 'auction'
    | 'publication'
    | 'auction_result'
    | 'reauction_default';

export type MovableExpertDecisionSubtype = 'movable_expert' | 'movable_expert_committee';
export type PropertyExpertDecisionSubtype = 'property_expert' | 'property_expert_committee';
export type SeizureExpertDecisionSubtype =
    | MovableExpertDecisionSubtype
    | PropertyExpertDecisionSubtype;

export type SeizureInlineEntity = SeizedMovable | SeizedProperty;

export type SeizureInlineSectionsCoreProps = {
    assetKind: SeizureAssetKind;
    entity: SeizureInlineEntity;
    entities: SeizureInlineEntity[];
    decisions: Array<Record<string, unknown>>;
    saveCtx: MovableInlineSaveContext | PropertyInlineSaveContext;
    focusKey?: string | null;
    pendingDecisionId?: string | null;
    section?: SeizureInlineSectionKey;
    embedded?: boolean;
    expertDecisionSubtype?: SeizureExpertDecisionSubtype;
};

export function buildExpertNameSlots(entity: SeizureInlineEntity): string[] {
    const size = readExpertCommitteeSize(entity);
    const names = Array.isArray(entity.expertNames)
        ? entity.expertNames.map((x) => String(x || '').trim())
        : [];
    return Array.from({ length: size }, (_, i) => names[i] || '');
}

export function initialExpertPrice(entity: SeizureInlineEntity, assetKind: SeizureAssetKind): string {
    if (entity.expertEstimatedAmountIqd != null && Number(entity.expertEstimatedAmountIqd) > 0) {
        return formatNumberInput(String(entity.expertEstimatedAmountIqd));
    }
    if (
        assetKind === 'property' &&
        entity.estimatedPriceIqd != null &&
        Number(entity.estimatedPriceIqd) > 0
    ) {
        return formatNumberInput(String(entity.estimatedPriceIqd));
    }
    return '';
}

export function hasExpertReportSaved(entity: SeizureInlineEntity, assetKind: SeizureAssetKind): boolean {
    const hasDate = Boolean(String(entity.expertReportDateYmd || '').trim());
    const hasExpertAmt =
        entity.expertEstimatedAmountIqd != null && Number(entity.expertEstimatedAmountIqd) > 0;
    if (assetKind === 'movable') return hasDate && hasExpertAmt;
    const hasEstimated =
        entity.estimatedPriceIqd != null && Number(entity.estimatedPriceIqd) > 0;
    return hasDate && (hasExpertAmt || hasEstimated);
}

export function resolveEntitiesForSave(
    assetKind: SeizureAssetKind,
    saveCtx: MovableInlineSaveContext | PropertyInlineSaveContext,
    entities: SeizureInlineEntity[],
    entity: SeizureInlineEntity,
): SeizureInlineEntity[] {
    if (assetKind === 'movable') {
        const ctx = saveCtx as MovableInlineSaveContext;
        return ensureMovableInList(
            ctx.readMovables?.() ?? (entities as SeizedMovable[]),
            entity as SeizedMovable,
        );
    }
    return entities;
}

export const InlineSectionShell: React.FC<{
    embedded?: boolean;
    sectionId?: string;
    focusKey?: string | null;
    title: string;
    titleClassName: string;
    defaultExpanded?: boolean;
    children: React.ReactNode;
}> = ({ embedded, sectionId, focusKey, title, titleClassName, defaultExpanded, children }) => {
    if (embedded) {
        return (
            <div className="space-y-2">
                <p className={`text-[10px] font-black text-right ${titleClassName}`}>{title}</p>
                {children}
            </div>
        );
    }
    return (
        <CollapsibleWorkflowToggle
            sectionId={sectionId}
            focusKey={focusKey}
            title={title}
            titleClassName={titleClassName}
            defaultExpanded={defaultExpanded}
        >
            {children}
        </CollapsibleWorkflowToggle>
    );
};

