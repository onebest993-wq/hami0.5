import type {
    SeizedMovable,
    SeizedProperty,
    SeizedPropertyStatus,
} from '@/app/types/execution';
import {
    normalizePropertySeizureStatus,
    propertyWorkflowActiveStepIndex,
} from './propertySeizureWorkflowUtils';

/**
 * التراجع خطوة في دورة الحجز — للعقار والمنقول معاً.
 *
 * النوعان يتقاسمان النموذج فعلاً لا تشبيهاً: `SeizedMovableStatus` هو
 * `SeizedPropertyStatus` نفسه، و`workflowActiveStepIndex` محايد تجاه نوع المال
 * (يقرأ newspaperName وpublicationDateYmd وseizureMarkLetterNumber وحدها).
 * لذلك المسح المشترك واحد، ولكل نوع ملحقه الخاص — بلا نسخ ملف ثانٍ.
 */
type SeizedWorkflowEntity = SeizedProperty | SeizedMovable;

/** حقول تُوجد على النوعين — المسح المشترك */
function clearSharedPostStep<T extends SeizedWorkflowEntity>(next: T, targetIdx: number): T {
    if (targetIdx <= 7) {
        next.proceedsDisburseCompletedAtIso = undefined;
        next.buyerDeliveryCompletedAtIso = undefined;
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

/** خاص بالعقار: نقل الملكية والتقدير — لا نظير لهما في المنقول */
function clearPropertyOnlyPostStep(next: SeizedProperty, targetIdx: number): SeizedProperty {
    if (targetIdx <= 7) {
        next.titleTransferCompletedAtIso = undefined;
    }
    if (targetIdx <= 2) {
        next.estimatedPriceIqd = null;
    }
    return next;
}

/**
 * الحالة المقابلة لخطوة هدف — عكس workflowActiveStepIndex.
 * مشتركة: مجموعة الحالات واحدة للنوعين.
 */
function statusForTargetStep(
    entity: SeizedWorkflowEntity,
    targetIdx: number,
): SeizedPropertyStatus | string {
    if (targetIdx >= 7) {
        return normalizePropertySeizureStatus(String(entity.status || '')) === 'sold'
            ? 'sold'
            : 'initial_award';
    }
    if (targetIdx === 6) return 'no_bidders';
    if (targetIdx >= 4) return 'published';
    if (targetIdx === 3) {
        return entity.expertCommitteeSize != null ||
            normalizePropertySeizureStatus(String(entity.status || '')) === 'estimation_objected'
            ? 'estimation_objected'
            : 'valued';
    }
    if (targetIdx >= 2) return 'valued';
    return 'seized';
}

function buildPropertyRevertToStepIndex(p: SeizedProperty, targetIdx: number): SeizedProperty | null {
    if (targetIdx < 0) return null;
    const next = clearPropertyOnlyPostStep(clearSharedPostStep({ ...p }, targetIdx), targetIdx);
    next.status = statusForTargetStep(p, targetIdx) as SeizedPropertyStatus;
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
    return applySeizureWorkflowRevert(properties, propertyId, buildPropertyWorkflowRevertPatch);
}

/**
 * المنقول لا يمسح auctionDateYmd/auction/increase10/lastExpertObjectionKind:
 * الخطوة المالكة لها غير مثبَّتة في مرجع العقار، ومسحها هنا سيكون اجتهاداً على
 * بيانات حجز. تُترك قائمة حتى يُحدَّد سلوكها صراحةً.
 */
function buildMovableRevertToStepIndex(m: SeizedMovable, targetIdx: number): SeizedMovable | null {
    if (targetIdx < 0) return null;
    const next = clearSharedPostStep({ ...m }, targetIdx);
    next.status = statusForTargetStep(m, targetIdx) as SeizedPropertyStatus;
    return next;
}

export function buildMovableWorkflowRevertPatch(m: SeizedMovable): SeizedMovable | null {
    const status = normalizePropertySeizureStatus(String(m.status || ''));
    const activeIdx = propertyWorkflowActiveStepIndex(status, m);
    if (activeIdx <= 0) return null;
    return buildMovableRevertToStepIndex(m, activeIdx - 1);
}

export function applyMovableWorkflowRevert(
    movables: SeizedMovable[],
    movableId: string
): { next: SeizedMovable[]; reverted: SeizedMovable; newActiveIdx: number } | null {
    return applySeizureWorkflowRevert(movables, movableId, buildMovableWorkflowRevertPatch);
}

/**
 * لا تُرجع نتيجة إلا إذا نزل مؤشّر الخطوة فعلاً — يمنع "تراجعاً" يُعيد الحالة
 * نفسها فيبدو للمحامي أنه رجع خطوة وهو لم يرجع.
 */
function applySeizureWorkflowRevert<T extends SeizedWorkflowEntity>(
    rows: T[],
    entityId: string,
    buildPatch: (row: T) => T | null,
): { next: T[]; reverted: T; newActiveIdx: number } | null {
    const id = String(entityId || '').trim();
    const idx = rows.findIndex((row) => String(row?.id || '').trim() === id);
    if (idx < 0) return null;

    const current = rows[idx]!;
    const prevActiveIdx = propertyWorkflowActiveStepIndex(
        normalizePropertySeizureStatus(String(current.status || '')),
        current,
    );
    const reverted = buildPatch(current);
    if (!reverted) return null;

    const newActiveIdx = propertyWorkflowActiveStepIndex(
        normalizePropertySeizureStatus(String(reverted.status || '')),
        reverted,
    );
    if (newActiveIdx >= prevActiveIdx) return null;

    const next = rows.slice();
    next[idx] = reverted;
    return { next, reverted, newActiveIdx };
}
