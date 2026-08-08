// @ts-nocheck
import type { SeizedProperty } from '@/app/types/execution';
import { patchExecutorDecisionRow } from '@/app/utils/executorSeizureDecisionQueue';
import {
    buildExpertObjectionEntityPatch,
    readExpertCommitteeSize,
    parseExpertObjectionKindFromPayload,
} from '@/app/components/lawyer/ExecutionDashboard/utils/expertCommitteeUtils';
import {
    creditPropertyProceedsForExecution,
    creditPropertySaleProceedsToTrustLedger,
} from '@/app/components/lawyer/ExecutionDashboard/utils/propertySeizureFinancialUtils';
import { dispatchSeizureInlineFocus } from '@/app/domain/seizure/seizureOutcomeFocus';
import type { SeizureDecisionOutcomeContext } from './seizureDecisionOutcomeHandler.types';
import type { SeizureOutcomeResolvedEvent } from './seizureOutcomeResolve';

/** مرحلة سير عمل حجز العقار بعد الموافقة */
export function handleSeizureOutcomePropertyPhase(
    ctx: SeizureDecisionOutcomeContext,
    event: SeizureOutcomeResolvedEvent,
): boolean {
    const { decisionId, decisionRow, resolved, myId, storageId, evId } = event;
    const subtype = resolved.subtype;
    const seizedPropertyId = resolved.seizedPropertyId;
    if (!seizedPropertyId) return false;

    const nowIso = new Date().toISOString();

    if (
        subtype === 'property_expert' ||
        subtype === 'property_expert_committee' ||
        subtype === 'property_auction' ||
        subtype === 'property_reauction_default'
    ) {
        if (String(decisionRow?.seizureRequestSavedAt || '').trim()) return true;
        const step =
            subtype === 'property_expert' || subtype === 'property_expert_committee'
                ? 'experts'
                : subtype === 'property_auction'
                  ? 'auction'
                  : 'reauction_default';
        dispatchSeizureInlineFocus({
            assetKind: 'property',
            executionId: myId || storageId || evId,
            entityId: seizedPropertyId,
            step,
            decisionId,
        });
        return true;
    }

    const prev = (ctx.executionDataRef.current?.seizedProperties || []) as SeizedProperty[];
    const idx = prev.findIndex((x) => String(x.id) === seizedPropertyId);
    if (idx < 0) return false;
    const cur = prev[idx];

    if (subtype === 'property_expert_objection') {
        const rawJson = String(decisionRow?.seizurePayloadJson || '').trim();
        const objectionKind = parseExpertObjectionKindFromPayload(rawJson);
        const objectionPatch = buildExpertObjectionEntityPatch(cur, objectionKind);
        const next = [...prev];
        next[idx] = { ...cur, ...objectionPatch } as SeizedProperty;
        ctx.persistExecutionMergeRef.current?.({ seizedProperties: next });
        const kindLabel =
            objectionKind === 'experts'
                ? 'اعتراض على الخبراء (استبدال)'
                : 'اعتراض على التقرير (زيادة اللجنة)';
        const newSize = readExpertCommitteeSize(next[idx]);
        patchExecutorDecisionRow(myId, decisionId, {
            seizureRequestSavedAt: nowIso,
            seizureRequestDetails: `${kindLabel} — تم قبول المنفذ.\nرقم العقار: ${String(cur.propertyNumber || '').trim()}\nالجنس: ${String(cur.propertyGender || '').trim()}\nعدد الخبراء المطلوب: ${newSize}`,
        });
        ctx.pushTimelineEventRef.current?.({
            id: ctx.nextTimelineId(),
            date: nowIso.slice(0, 10),
            timestamp: nowIso,
            title: '🛡️ قبول الاعتراض على تقدير الخبراء — حجز عقار',
            description: `رقم العقار: ${String(cur.propertyNumber || '').trim()}\n${kindLabel}\nعدد الخبراء المطلوب: ${newSize}`,
            type: 'decision',
            source: 'محضر المتابعة — الأموال المحجوزة',
            metadata: { seizedPropertyId, decisionRowId: decisionId, seizureSubtype: subtype },
        });
        return true;
    }

    if (subtype === 'property_final_award') {
        const buyerName = String(
            cur.initialAwardBuyerName || cur.lastBidderOrBuyerName || cur.award?.buyerName || '',
        ).trim();
        const amt =
            cur.initialAwardAmountIqd != null && Number.isFinite(Number(cur.initialAwardAmountIqd))
                ? Number(cur.initialAwardAmountIqd)
                : cur.finalAwardAmountIqd != null && Number.isFinite(Number(cur.finalAwardAmountIqd))
                  ? Number(cur.finalAwardAmountIqd)
                  : cur.award?.awardAmountIqd != null && Number.isFinite(Number(cur.award.awardAmountIqd))
                    ? Number(cur.award.awardAmountIqd)
                    : null;
        const next = [...prev];
        next[idx] = {
            ...cur,
            status: 'sold',
            lastBidderOrBuyerName: buyerName || cur.lastBidderOrBuyerName,
            finalAwardAmountIqd: amt ?? cur.finalAwardAmountIqd ?? null,
            award:
                buyerName && amt != null
                    ? { buyerName, awardAmountIqd: amt, recordedAtIso: nowIso }
                    : cur.award,
        } as SeizedProperty;
        ctx.persistExecutionMergeRef.current?.({ seizedProperties: next });
        const soldProperty = next[idx];
        const ledgerParams = ctx.seizureMatrixLedgerParamsRef.current;
        const trustCredit = ledgerParams
            ? creditPropertyProceedsForExecution(myId, soldProperty, ledgerParams, nowIso)
            : creditPropertySaleProceedsToTrustLedger({
                  executionId: myId,
                  property: soldProperty,
                  at: nowIso,
              });
        patchExecutorDecisionRow(myId, decisionId, {
            seizureRequestSavedAt: nowIso,
            seizureRequestDetails: `إحالة قطعية — حجز عقار (تم قبول المنفذ).\nالمشتري: ${buyerName || '—'}${
                amt != null ? `\nمبلغ الإحالة: ${Number(amt).toLocaleString('ar-IQ')} د.ع` : ''
            }${
                trustCredit.created
                    ? `\n\n💰 تم إيداع ${trustCredit.amount.toLocaleString('ar-IQ')} د.ع في الأمانات — المتبقي يُحدَّث تلقائياً.`
                    : trustCredit.updated
                      ? `\n\n💰 تم تصحيح حصيلة البيع في الأمانات إلى ${trustCredit.amount.toLocaleString('ar-IQ')} د.ع.`
                      : trustCredit.ok
                        ? '\n\n💰 حصيلة البيع مزامنة مع الأمانات.'
                        : ''
            }`,
        });
        ctx.pushTimelineEventRef.current?.({
            id: ctx.nextTimelineId(),
            date: nowIso.slice(0, 10),
            timestamp: nowIso,
            title: '✅ إحالة قطعية — حجز عقار',
            description: `رقم العقار: ${String(cur.propertyNumber || '').trim()}\nالجنس: ${String(cur.propertyGender || '').trim()}\nالمشتري: ${buyerName || '—'}${
                amt != null ? `\nمبلغ الإحالة: ${Number(amt).toLocaleString('ar-IQ')} د.ع` : ''
            }${
                trustCredit.created
                    ? `\n\nتم إيداع الحصيلة في الأمانات: ${trustCredit.amount.toLocaleString('ar-IQ')} د.ع`
                    : ''
            }`,
            type: 'decision',
            source: 'محضر المتابعة — الأموال المحجوزة',
            metadata: { seizedPropertyId, decisionRowId: decisionId, seizureSubtype: subtype },
        });
        if (trustCredit.created || trustCredit.updated) {
            ctx.setUnifiedLedgerRevision((v) => v + 1);
        }
        return true;
    }

    if (
        subtype === 'property_title_transfer' ||
        subtype === 'property_buyer_delivery' ||
        subtype === 'property_proceeds_disburse'
    ) {
        const next = [...prev];
        next[idx] = {
            ...cur,
            ...(subtype === 'property_title_transfer' ? { titleTransferCompletedAtIso: nowIso } : {}),
            ...(subtype === 'property_buyer_delivery' ? { buyerDeliveryCompletedAtIso: nowIso } : {}),
            ...(subtype === 'property_proceeds_disburse' ? { proceedsDisburseCompletedAtIso: nowIso } : {}),
        } as SeizedProperty;
        ctx.persistExecutionMergeRef.current?.({ seizedProperties: next });
        const label =
            subtype === 'property_title_transfer'
                ? '🏛️ مخاطبة التسجيل العقاري لنقل الملكية'
                : subtype === 'property_buyer_delivery'
                  ? '🏠 التخلية وتسليم العقار للمشتري'
                  : '💰 صرف حصيلة البيع للدائن';
        patchExecutorDecisionRow(myId, decisionId, {
            seizureRequestSavedAt: nowIso,
            seizureRequestDetails: `${label} — تم قبول المنفذ.`,
        });
        ctx.pushTimelineEventRef.current?.({
            id: ctx.nextTimelineId(),
            date: nowIso.slice(0, 10),
            timestamp: nowIso,
            title: label,
            description: `رقم العقار: ${String(cur.propertyNumber || '').trim()}\nالجنس: ${String(cur.propertyGender || '').trim()}`,
            type: 'decision',
            source: 'محضر المتابعة — الأموال المحجوزة',
            metadata: { seizedPropertyId, decisionRowId: decisionId, seizureSubtype: subtype },
        });
        return true;
    }

    return false;
}
