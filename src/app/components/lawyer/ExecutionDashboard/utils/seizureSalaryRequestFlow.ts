import type { SeizedAsset } from '@/app/types/execution';
import { getLocalTodayYmd } from '@/app/utils/executionStateMachine';

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

/** أُزيل تركيز الإكمال — no-op للحفاظ على استيرادات قديمة إن وُجدت */
export function dispatchOpenSeizureCompletion(_executionId: string, _decisionId: string): void {}
export function dispatchSalarySeizureInlineFocus(
    _executionId: string,
    _decisionId: string,
    _subject?: string,
): void {}
export function dispatchPropertySeizureInlineFocus(
    _executionId: string,
    _decisionId: string,
    _subject?: string,
): void {}
export function dispatchMovableSeizureInlineFocus(
    _executionId: string,
    _decisionId: string,
    _subject?: string,
): void {}
export function dispatchThirdPartySeizureInlineFocus(
    _executionId: string,
    _decisionId: string,
    _subject?: string,
): void {}
export function dispatchGuarantorSeizureInlineFocusRoute(
    _executionId: string,
    _decisionId: string,
    _kind: 'salary' | 'movable' | 'property',
    _subject?: string,
): void {}

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

/** دمج payload قرار الحجز دون فقدان حقول سابقة */
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
