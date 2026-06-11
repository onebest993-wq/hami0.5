import type { ExecutionFile, SeizedMovable, SeizedProperty } from '@/app/types/execution';
import {
    normalizePropertySeizureStatus,
    parseSeizedPropertyIdFromDecision,
} from '@/app/components/lawyer/ExecutionDashboard/utils/propertySeizureWorkflowUtils';
import type { Decision } from './types';

function parseSeizedMovableIdFromDecision(row: Record<string, unknown>): string {
    const rawJson = String(row?.seizurePayloadJson || '').trim();
    if (!rawJson) return '';
    try {
        const v = JSON.parse(rawJson) as { seizedMovableId?: string };
        return String(v?.seizedMovableId ?? '').trim();
    } catch {
        return '';
    }
}

function propertyPastExpertStep(status: string): boolean {
    const norm = normalizePropertySeizureStatus(status);
    return (
        norm === 'valued' ||
        norm === 'estimation_objected' ||
        norm === 'published' ||
        norm === 'no_bidders' ||
        norm === 'initial_award' ||
        norm === 'sold'
    );
}

function propertyPastAuctionScheduleStep(status: string): boolean {
    const norm = normalizePropertySeizureStatus(status);
    return norm === 'published' || norm === 'no_bidders' || norm === 'initial_award' || norm === 'sold';
}

function isPropertySubtypeComplete(subtype: string, property: SeizedProperty): boolean {
    const st = String(subtype || '').trim();
    const status = String(property.status || '');
    if (st === 'property') {
        return Boolean(String(property.propertyNumber || '').trim());
    }
    if (st === 'property_expert' || st === 'property_expert_committee') {
        return (
            propertyPastExpertStep(status) ||
            Boolean(String(property.expertReportDateYmd || '').trim()) ||
            Boolean(property.experts?.recordedAtIso)
        );
    }
    if (st === 'property_expert_objection') {
        return normalizePropertySeizureStatus(status) === 'estimation_objected';
    }
    if (st === 'property_auction') {
        return propertyPastAuctionScheduleStep(status) || Boolean(String(property.auctionDateYmd || '').trim());
    }
    if (st === 'property_final_award') {
        return status === 'sold' || Boolean(property.award?.recordedAtIso) || property.finalAwardAmountIqd != null;
    }
    if (st === 'property_increase_10') {
        return true;
    }
    if (st === 'property_reauction_default') {
        return Boolean(property.reauctionDefault?.recordedAtIso);
    }
    if (st === 'property_title_transfer') {
        return Boolean(String(property.titleTransferCompletedAtIso || '').trim());
    }
    if (st === 'property_buyer_delivery') {
        return Boolean(String(property.buyerDeliveryCompletedAtIso || '').trim());
    }
    if (st === 'property_proceeds_disburse') {
        return Boolean(String(property.proceedsDisburseCompletedAtIso || '').trim());
    }
    return false;
}

function isMovableSubtypeComplete(subtype: string, movable: SeizedMovable): boolean {
    const st = String(subtype || '').trim();
    const status = String(movable.status || '');
    if (st === 'movable_auction') {
        return (
            Boolean(String(movable.movableDescription || '').trim()) &&
            Boolean(String(movable.movableLocation || '').trim())
        );
    }
    if (st === 'movable_expert' || st === 'movable_expert_committee') {
        return (
            propertyPastExpertStep(status) ||
            Boolean(String(movable.expertReportDateYmd || '').trim()) ||
            Boolean(movable.experts?.recordedAtIso)
        );
    }
    if (st === 'movable_expert_objection') {
        return normalizePropertySeizureStatus(status) === 'estimation_objected';
    }
    if (st === 'movable_auction_date') {
        return propertyPastAuctionScheduleStep(status) || Boolean(String(movable.auctionDateYmd || '').trim());
    }
    if (st === 'movable_final_award') {
        return status === 'sold' || Boolean(movable.award?.recordedAtIso);
    }
    if (st === 'movable_increase_10') {
        return true;
    }
    if (st === 'movable_reauction_default') {
        return Boolean(movable.reauctionDefault?.recordedAtIso);
    }
    if (st === 'movable_buyer_delivery') {
        return Boolean(String(movable.buyerDeliveryCompletedAtIso || '').trim());
    }
    if (st === 'movable_proceeds_disburse') {
        return Boolean(String(movable.proceedsDisburseCompletedAtIso || '').trim());
    }
    return false;
}

/** اكتمال إجراء المتابعة المرتبط ببطاقة قرار الحجز — يخفي اختصارات المركز عند الانتهاء */
export function isSeizureDecisionFollowupComplete(
    decision: Decision,
    executionData?: ExecutionFile | null
): boolean {
    if (String(decision.seizureRequestSavedAt || '').trim()) return true;

    const rk = String(decision.requestKind || '').trim();
    if (rk === 'guarantor_request') {
        return (
            Boolean(String((decision as { guarantorDetailsSavedAt?: string }).guarantorDetailsSavedAt || '').trim()) ||
            Boolean(executionData?.guarantor_followup?.details_saved)
        );
    }
    if (rk !== 'seizure') return false;

    const subtype = String(decision.seizureSubtype || '').trim();
    if (!subtype) return false;

    if (subtype === 'salary' || subtype === 'third_party' || subtype === 'notice') {
        return false;
    }

    const row = decision as unknown as Record<string, unknown>;
    const propertyId = parseSeizedPropertyIdFromDecision(row);
    if (propertyId && executionData?.seizedProperties?.length) {
        const property = executionData.seizedProperties.find((p) => String(p.id || '').trim() === propertyId);
        if (property && isPropertySubtypeComplete(subtype, property)) return true;
    }

    const movableId = parseSeizedMovableIdFromDecision(row);
    if (movableId && executionData?.seizedMovables?.length) {
        const movable = executionData.seizedMovables.find((m) => String(m.id || '').trim() === movableId);
        if (movable && isMovableSubtypeComplete(subtype, movable)) return true;
    }

    return false;
}
