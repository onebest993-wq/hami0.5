import type { SeizedAsset } from '@/app/types/execution';
import { getLocalTodayYmd } from '@/app/utils/executionStateMachine';
import { SEIZURE_INLINE_FOCUS_EVENT } from '@/app/components/lawyer/ExecutionDashboard/utils/seizureInlineFocusUtils';

export type PendingSeizureDraftActionType = 'salary' | 'property' | 'vehicle';

/** مسودة طلب حجز مرتبطة بقرار المنفذ — موحّدة بين تبويب الحجز والإجراءات الجبرية */
export function buildPendingSeizureDraftAsset(input: {
    decisionId: string;
    actionType: PendingSeizureDraftActionType;
    activeDebtorIsDeceased?: boolean;
    details?: Record<string, string>;
}): SeizedAsset {
    const decisionId = String(input.decisionId || '').trim();
    const dayYmd = getLocalTodayYmd();
    const typeLabel =
        input.actionType === 'salary'
            ? input.activeDebtorIsDeceased
              ? 'طلب حجز الحوافز والمخصصات (قيد البت)'
              : 'طلب حجز راتب (قيد البت)'
            : input.actionType === 'vehicle'
              ? 'طلب حجز مال منقول (قيد البت)'
              : 'طلب حجز عقار (قيد البت)';
    const uiKind = input.actionType === 'vehicle' ? 'vehicle' : input.actionType;
    const detailsWithDecision: Record<string, string> = {
        ...(input.details || {}),
        decisionRowId: decisionId,
        seizureUiKind: uiKind,
    };
    const asset: SeizedAsset = {
        id: `draft_${decisionId}`,
        type: typeLabel,
        details: detailsWithDecision,
        status: 'pending',
        seizureDate: dayYmd,
    };
    const desc = String(input.details?.description || '').trim();
    if (desc) asset.description = desc;
    return asset;
}

export function mergeSeizureDraftPatch(
    existingDrafts: Record<string, SeizedAsset> | undefined | null,
    decisionId: string,
    draft: SeizedAsset,
): Record<string, SeizedAsset> {
    const did = String(decisionId || '').trim();
    if (!did) return { ...(existingDrafts || {}) };
    return { ...(existingDrafts || {}), [did]: draft };
}

/** يفتح نموذج إكمال الحجز بعد موافقة المنفذ */
export function dispatchOpenSeizureCompletion(executionId: string, decisionId: string): void {
    const exId = String(executionId || '').trim();
    const did = String(decisionId || '').trim();
    if (!exId || !did) return;
    try {
        window.dispatchEvent(
            new CustomEvent('hami-open-seizure-completion', {
                detail: { executionId: exId, decisionId: did },
            }),
        );
    } catch {
        /* ignore */
    }
}

function dispatchSeizureInlineFocusEvent(
    eventName: string,
    executionId: string,
    decisionId: string,
    subject?: string,
): void {
    const exId = String(executionId || '').trim();
    const did = String(decisionId || '').trim();
    if (!exId || !did) return;
    try {
        window.dispatchEvent(
            new CustomEvent(eventName, {
                detail: {
                    executionId: exId,
                    decisionId: did,
                    subject: String(subject || '').trim(),
                },
            }),
        );
    } catch {
        /* ignore */
    }
}

/** يفتح تبويب الحجز ويركّز نموذج إكمال العقار inline */
export function dispatchPropertySeizureInlineFocus(
    executionId: string,
    decisionId: string,
    subject?: string,
): void {
    dispatchSeizureInlineFocusEvent(
        SEIZURE_INLINE_FOCUS_EVENT.property,
        executionId,
        decisionId,
        subject,
    );
}

/** يفتح تبويب الحجز ويركّز نموذج إكمال المنقول inline */
export function dispatchMovableSeizureInlineFocus(
    executionId: string,
    decisionId: string,
    subject?: string,
): void {
    dispatchSeizureInlineFocusEvent(
        SEIZURE_INLINE_FOCUS_EVENT.movable,
        executionId,
        decisionId,
        subject,
    );
}

/** يفتح تبويب الحجز ويركّز نموذج إكمال حجز لدى الغير inline */
export function dispatchThirdPartySeizureInlineFocus(
    executionId: string,
    decisionId: string,
    subject?: string,
): void {
    dispatchSeizureInlineFocusEvent(
        SEIZURE_INLINE_FOCUS_EVENT.thirdParty,
        executionId,
        decisionId,
        subject,
    );
}

/** يفتح نموذج إكمال بيانات الكفيل بعد موافقة المنفذ */
export function dispatchOpenGuarantorRequestCompletion(
    executionId: string,
    decisionId?: string,
): void {
    const exId = String(executionId || '').trim();
    if (!exId) return;
    const did = String(decisionId || '').trim();
    try {
        window.dispatchEvent(
            new CustomEvent('hami-open-guarantor-details', {
                detail: { executionId: exId, ...(did ? { decisionId: did } : {}) },
            }),
        );
    } catch {
        /* ignore */
    }
}

/** يوجّه تركيز inline لحجز الكفيل حسب نوع الأصل */
export function dispatchGuarantorSeizureInlineFocusRoute(
    executionId: string,
    decisionId: string,
    kind: 'salary' | 'movable' | 'property',
    subject?: string,
): void {
    const exId = String(executionId || '').trim();
    const did = String(decisionId || '').trim();
    if (!exId || !did) return;
    if (kind === 'property') {
        dispatchPropertySeizureInlineFocus(exId, did, subject);
        return;
    }
    if (kind === 'movable') {
        dispatchMovableSeizureInlineFocus(exId, did, subject);
        return;
    }
    dispatchOpenSeizureCompletion(exId, did);
}

/** دمج payload قرار الحجز دون فقدان حقول سابقة (لربط seizedPropertyId / seizedMovableId) */
export function mergeSeizureDecisionPayloadJson(
    existingJson: string | undefined | null,
    patch: Record<string, unknown>,
): string {
    try {
        const prev = existingJson ? (JSON.parse(String(existingJson)) as Record<string, unknown>) : {};
        return JSON.stringify({ ...prev, ...patch });
    } catch {
        return JSON.stringify(patch);
    }
}
