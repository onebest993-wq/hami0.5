import type { SeizedProperty, SeizedPropertyStatus } from '@/app/types/execution';
import {
    normalizePropertySeizureStatus,
    propertyWorkflowActiveStepIndex,
} from './propertySeizureWorkflowUtils';

function clearPropertyPostStep(next: SeizedProperty, targetIdx: number): SeizedProperty {
    if (targetIdx <= 7) {
        next.proceedsDisburseCompletedAtIso = undefined;
        next.buyerDeliveryCompletedAtIso = undefined;
        next.titleTransferCompletedAtIso = undefined;
        next.reauctionDefault = undefined;
        next.award = undefined;
        next.finalAwardAmountIqd = null;
    }
    if (targetIdx <= 6) {
        next.noBiddersRecordedAtIso = undefined;
    }
    if (targetIdx <= 5) {
        next.initialAwardBuyerName = undefined;
        next.initialAwardAmountIqd = null;
        next.auctionDepositAmountIqd = null;
        next.initialAwardRecordedAtIso = undefined;
        next.lastBidderOrBuyerName = undefined;
    }
    if (targetIdx <= 4) {
        next.newspaperName = undefined;
        next.publicationDateYmd = undefined;
    }
    if (targetIdx <= 3) {
        next.expertCommitteeSize = undefined;
    }
    if (targetIdx <= 2) {
        next.expertNames = undefined;
        next.expertReportDateYmd = undefined;
        next.estimatedPriceIqd = null;
        next.expertEstimatedAmountIqd = null;
        next.experts = undefined;
    }
    if (targetIdx <= 0) {
        next.seizureMarkLetterNumber = undefined;
        next.seizureMarkDate = undefined;
        next.seizureMarkEntity = undefined;
    }
    return next;
}

function propertyStatusForTargetStep(
    p: SeizedProperty,
    targetIdx: number
): SeizedPropertyStatus | string {
    if (targetIdx >= 7) {
        return normalizePropertySeizureStatus(String(p.status || '')) === 'sold'
            ? 'sold'
            : 'initial_award';
    }
    if (targetIdx === 6) return 'no_bidders';
    if (targetIdx >= 4) return 'published';
    if (targetIdx === 3) {
        return p.expertCommitteeSize != null ||
            normalizePropertySeizureStatus(String(p.status || '')) === 'estimation_objected'
            ? 'estimation_objected'
            : 'valued';
    }
    if (targetIdx >= 2) return 'valued';
    return 'seized';
}

function buildPropertyRevertToStepIndex(p: SeizedProperty, targetIdx: number): SeizedProperty | null {
    if (targetIdx < 0) return null;
    let next = clearPropertyPostStep({ ...p }, targetIdx);
    next.status = propertyStatusForTargetStep(p, targetIdx) as SeizedPropertyStatus;
    return next;
}

export function buildPropertyWorkflowRevertPatch(p: SeizedProperty): SeizedProperty | null {
    const status = normalizePropertySeizureStatus(String(p.status || ''));
    const activeIdx = propertyWorkflowActiveStepIndex(status, p);
    if (activeIdx <= 0) return null;
    return buildPropertyRevertToStepIndex(p, activeIdx - 1);
}

export function applyPropertyWorkflowRevert(
    properties: SeizedProperty[],
    propertyId: string
): { next: SeizedProperty[]; reverted: SeizedProperty; newActiveIdx: number } | null {
    const pid = String(propertyId || '').trim();
    const idx = properties.findIndex((row) => String(row?.id || '').trim() === pid);
    if (idx < 0) return null;
    const current = properties[idx]!;
    const prevActiveIdx = propertyWorkflowActiveStepIndex(
        normalizePropertySeizureStatus(String(current.status || '')),
        current
    );
    const reverted = buildPropertyWorkflowRevertPatch(current);
    if (!reverted) return null;
    const next = properties.slice();
    next[idx] = reverted;
    const newActiveIdx = propertyWorkflowActiveStepIndex(
        normalizePropertySeizureStatus(String(reverted.status || '')),
        reverted
    );
    if (newActiveIdx >= prevActiveIdx) return null;
    return { next, reverted, newActiveIdx };
}
