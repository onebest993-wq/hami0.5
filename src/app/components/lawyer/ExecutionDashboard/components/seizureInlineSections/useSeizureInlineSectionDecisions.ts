import React from 'react';
import type { SeizureAssetKind } from '@/app/domain/seizure/seizureWorkflowTypes';
import { getSeizureAssetPlugin } from '@/app/domain/seizure/seizureAssetPlugins';
import { findSeizureDecisionForEntity } from '@/app/domain/seizure/seizureWorkflowDecisionQueries';
import { isDecisionResolvedApproved } from '@/app/domain/seizure/seizureWorkflowStatus';
import type {
    SeizureExpertDecisionSubtype,
    SeizureInlineSectionKey,
} from './seizureInlineSectionsShared';

export function useSeizureInlineSectionDecisions(args: {
    assetKind: SeizureAssetKind;
    entityId: string;
    decisions: Array<Record<string, unknown>>;
    expertDecisionSubtype?: SeizureExpertDecisionSubtype;
    pendingDecisionId?: string | null;
    focusKey?: string | null;
    section?: SeizureInlineSectionKey;
}) {
    const {
        assetKind,
        entityId,
        decisions,
        expertDecisionSubtype,
        pendingDecisionId,
        focusKey,
        section,
    } = args;
    const plugin = getSeizureAssetPlugin(assetKind);

    const expertDecision = React.useMemo(() => {
        const subtypes: SeizureExpertDecisionSubtype[] = expertDecisionSubtype
            ? [expertDecisionSubtype]
            : assetKind === 'movable'
              ? ['movable_expert', 'movable_expert_committee']
              : ['property_expert', 'property_expert_committee'];
        for (const st of subtypes) {
            const hit = findSeizureDecisionForEntity(decisions, plugin, st, entityId);
            if (
                hit &&
                isDecisionResolvedApproved(hit) &&
                !String(hit.seizureRequestSavedAt || '').trim()
            ) {
                return { row: hit, subtype: st };
            }
        }
        return null;
    }, [assetKind, decisions, entityId, expertDecisionSubtype, plugin]);

    const auctionDecision = React.useMemo(() => {
        const hit = findSeizureDecisionForEntity(
            decisions,
            plugin,
            plugin.auctionSubtype,
            entityId,
        );
        if (
            hit &&
            isDecisionResolvedApproved(hit) &&
            !String(hit.seizureRequestSavedAt || '').trim()
        ) {
            return hit;
        }
        return null;
    }, [decisions, entityId, plugin]);

    const reauctionDecision = React.useMemo(() => {
        const hit = findSeizureDecisionForEntity(
            decisions,
            plugin,
            plugin.reauctionDefaultSubtype,
            entityId,
        );
        if (
            hit &&
            isDecisionResolvedApproved(hit) &&
            !String(hit.seizureRequestSavedAt || '').trim()
        ) {
            return hit;
        }
        return null;
    }, [decisions, entityId, plugin]);

    const pendingIdForSection = React.useCallback(
        (sectionKey: string): string => {
            const pid = String(pendingDecisionId || '').trim();
            if (!pid) return '';
            const fk = String(focusKey || '').trim();
            const sec = String(section || sectionKey).trim();
            if (fk && sec && fk !== sec) return '';
            return pid;
        },
        [pendingDecisionId, focusKey, section],
    );

    const expertDecisionId = String(
        pendingIdForSection('experts') || expertDecision?.row?.id || '',
    ).trim();
    const auctionDecisionId = String(
        pendingIdForSection('auction') || auctionDecision?.id || '',
    ).trim();
    const reauctionDecisionId = String(
        pendingIdForSection('reauction_default') || reauctionDecision?.id || '',
    ).trim();

    return {
        plugin,
        expertDecision,
        auctionDecision,
        reauctionDecision,
        expertDecisionId,
        auctionDecisionId,
        reauctionDecisionId,
    };
}
