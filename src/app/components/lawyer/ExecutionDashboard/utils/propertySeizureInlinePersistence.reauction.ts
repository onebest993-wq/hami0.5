import type { SeizedProperty } from '@/app/types/execution';
import { patchExecutorDecisionRowEverywhere } from '@/app/utils/executorSeizureDecisionQueue';
import {
    headerForProperty,
    persistPropertyPatch,
    TIMELINE_SOURCE,
    type PropertyInlineSaveContext,
} from './propertySeizureInlinePersistence';

export function savePropertyReauctionDefaultInline(
    properties: SeizedProperty[],
    propertyId: string,
    decisionId: string,
    notes: string,
    ctx: PropertyInlineSaveContext,
): boolean {
    const nowIso = new Date().toISOString();
    const notesTrim = String(notes || '').trim();
    const hit = properties.find((x) => String(x.id) === propertyId);
    if (!hit) return false;
    const next = persistPropertyPatch(
        properties,
        propertyId,
        {
            reauctionDefault: { recordedAtIso: nowIso, ...(notesTrim ? { notes: notesTrim } : {}) },
            status: 'published',
            initialAwardBuyerName: undefined,
            initialAwardAmountIqd: null,
            initialAwardRecordedAtIso: undefined,
            noBiddersRecordedAtIso: undefined,
            lastBidderOrBuyerName: undefined,
            finalAwardAmountIqd: null,
        },
        ctx,
    );
    if (!next) return false;
    if (decisionId) {
        const header = headerForProperty(hit);
        patchExecutorDecisionRowEverywhere(decisionId, {
            seizureRequestSavedAt: nowIso,
            seizureRequestDetails: `🔁 تسجيل النكول / إعادة المزايدة — عقار\n${header}${
                notesTrim ? `\nالسبب/الملاحظات:\n${notesTrim}` : ''
            }`,
        });
    }
    ctx.pushTimeline({
        id: ctx.nextTimelineId(),
        date: nowIso.slice(0, 10),
        timestamp: nowIso,
        title: '🔁 تسجيل النكول / إعادة المزايدة — عقار',
        description: `${headerForProperty(hit)}${notesTrim ? `\n${notesTrim}` : ''}`,
        type: 'decision',
        source: TIMELINE_SOURCE,
        metadata: { seizedPropertyId: propertyId, decisionRowId: decisionId || undefined },
    });
    ctx.showToast('تم تسجيل النكول وإعادة فتح مسار المزايدة.', 'success');
    return true;
}
