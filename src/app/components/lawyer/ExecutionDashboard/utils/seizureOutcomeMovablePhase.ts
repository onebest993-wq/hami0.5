// @ts-nocheck
import type { SeizedMovable } from '@/app/types/execution';
import { patchExecutorDecisionRow } from '@/app/utils/executorSeizureDecisionQueue';
import {
    buildExpertObjectionEntityPatch,
    readExpertCommitteeSize,
    parseExpertObjectionKindFromPayload,
} from '@/app/components/lawyer/ExecutionDashboard/utils/expertCommitteeUtils';
import {
    creditMovableProceedsForExecution,
    creditMovableSaleProceedsToTrustLedger,
} from '@/app/components/lawyer/ExecutionDashboard/utils/movableSeizureFinancialUtils';
import { dispatchSeizureInlineFocus } from '@/app/domain/seizure/seizureOutcomeFocus';
import type { SeizureDecisionOutcomeContext } from './seizureDecisionOutcomeHandler.types';
import type { SeizureOutcomeResolvedEvent } from './seizureOutcomeResolve';

/** مرحلة سير عمل حجز المال المنقول بعد الموافقة */
export function handleSeizureOutcomeMovablePhase(
    ctx: SeizureDecisionOutcomeContext,
    event: SeizureOutcomeResolvedEvent,
): boolean {
    const { decisionId, decisionRow, resolved, myId, storageId, evId } = event;
    const subtype = resolved.subtype;
    const seizedMovableId = resolved.seizedMovableId;
    if (!seizedMovableId) return false;

    const nowIso = new Date().toISOString();

    if (
        subtype === 'movable_expert' ||
        subtype === 'movable_expert_committee' ||
        subtype === 'movable_auction_date' ||
        subtype === 'movable_reauction_default'
    ) {
        if (String(decisionRow?.seizureRequestSavedAt || '').trim()) return true;
        const step =
            subtype === 'movable_expert' || subtype === 'movable_expert_committee'
                ? 'experts'
                : subtype === 'movable_auction_date'
                  ? 'auction'
                  : 'reauction_default';
        dispatchSeizureInlineFocus({
            assetKind: 'movable',
            executionId: myId || storageId || evId,
            entityId: seizedMovableId,
            step,
            decisionId,
        });
        return true;
    }

    const prev = (ctx.executionDataRef.current?.seizedMovables || []) as SeizedMovable[];
    const idx = prev.findIndex((x) => String(x.id) === seizedMovableId);
    if (idx < 0) return false;
    const cur = prev[idx];

    if (subtype === 'movable_expert_objection') {
        const rawJson = String(decisionRow?.seizurePayloadJson || '').trim();
        const objectionKind = parseExpertObjectionKindFromPayload(rawJson);
        const objectionPatch = buildExpertObjectionEntityPatch(cur as any, objectionKind);
        const next = [...prev];
        next[idx] = { ...cur, ...objectionPatch } as SeizedMovable;
        ctx.persistExecutionMergeRef.current?.({ seizedMovables: next });
        const kindLabel =
            objectionKind === 'experts'
                ? 'اعتراض على الخبراء (استبدال)'
                : 'اعتراض على التقرير (زيادة اللجنة)';
        const newSize = readExpertCommitteeSize(next[idx]);
        patchExecutorDecisionRow(myId, decisionId, {
            seizureRequestSavedAt: nowIso,
            seizureRequestDetails: `${kindLabel} — مال منقول (تم قبول المنفذ).\nوصف المال: ${String(cur.movableDescription || '').trim()}\nالمكان: ${String(cur.movableLocation || '').trim()}\nعدد الخبراء المطلوب: ${newSize}`,
        });
        ctx.pushTimelineEventRef.current?.({
            id: ctx.nextTimelineId(),
            date: nowIso.slice(0, 10),
            timestamp: nowIso,
            title: '🛡️ قبول الاعتراض على تقدير الخبراء — مال منقول',
            description: `وصف المال: ${String(cur.movableDescription || '').trim()}\n${kindLabel}\nعدد الخبراء المطلوب: ${newSize}`,
            type: 'decision',
            source: 'محضر المتابعة — الأموال المحجوزة',
            metadata: { seizedMovableId, decisionRowId: decisionId, seizureSubtype: subtype },
        });
        return true;
    }

    if (subtype === 'movable_final_award') {
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
        } as SeizedMovable;
        ctx.persistExecutionMergeRef.current?.({ seizedMovables: next });
        const soldMovable = next[idx];
        const ledgerParams = ctx.seizureMatrixLedgerParamsRef.current;
        const trustCredit = ledgerParams
            ? creditMovableProceedsForExecution(myId, soldMovable, ledgerParams, nowIso)
            : creditMovableSaleProceedsToTrustLedger({
                  executionId: myId,
                  movable: soldMovable,
                  at: nowIso,
              });
        patchExecutorDecisionRow(myId, decisionId, {
            seizureRequestSavedAt: nowIso,
            seizureRequestDetails: `إحالة قطعية — مال منقول (تم قبول المنفذ).\nالمشتري: ${buyerName || '—'}${
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
            title: '✅ إحالة قطعية — مال منقول',
            description: `وصف المال: ${String(cur.movableDescription || '').trim()}\nالمكان: ${String(cur.movableLocation || '').trim()}\nالمشتري: ${buyerName || '—'}${
                amt != null ? `\nمبلغ الإحالة: ${Number(amt).toLocaleString('ar-IQ')} د.ع` : ''
            }${
                trustCredit.created
                    ? `\n\nتم إيداع الحصيلة في الأمانات: ${trustCredit.amount.toLocaleString('ar-IQ')} د.ع`
                    : ''
            }`,
            type: 'decision',
            source: 'محضر المتابعة — الأموال المحجوزة',
            metadata: {
                seizedMovableId,
                decisionRowId: decisionId,
                seizureSubtype: subtype,
                trustPaymentId: trustCredit.paymentId,
            },
        });
        if (trustCredit.created || trustCredit.updated) {
            ctx.setUnifiedLedgerRevision((v) => v + 1);
            ctx.showToast(
                trustCredit.updated
                    ? `تم تصحيح حصيلة البيع في الأمانات: ${trustCredit.amount.toLocaleString('ar-IQ')} د.ع`
                    : `تم إيداع ${trustCredit.amount.toLocaleString('ar-IQ')} د.ع (حصيلة البيع) في الأمانات — ويُخصم من المتبقي.`,
                'success',
            );
        } else if (!trustCredit.ok && amt != null) {
            ctx.showToast(
                'تمت الإحالة لكن تعذّر إيداع الحصيلة في الأمانات — تحقق من مبلغ البيع.',
                'warning',
            );
        }
        return true;
    }

    if (subtype === 'movable_buyer_delivery' || subtype === 'movable_proceeds_disburse') {
        const next = [...prev];
        next[idx] = {
            ...cur,
            ...(subtype === 'movable_buyer_delivery' ? { buyerDeliveryCompletedAtIso: nowIso } : {}),
            ...(subtype === 'movable_proceeds_disburse' ? { proceedsDisburseCompletedAtIso: nowIso } : {}),
        } as SeizedMovable;
        ctx.persistExecutionMergeRef.current?.({ seizedMovables: next });
        const label =
            subtype === 'movable_buyer_delivery'
                ? '📦 تسليم المال المنقول للمشتري'
                : '💰 صرف حصيلة البيع للدائن (مال منقول)';
        patchExecutorDecisionRow(myId, decisionId, {
            seizureRequestSavedAt: nowIso,
            seizureRequestDetails: `${label} — تم قبول المنفذ.`,
        });
        ctx.pushTimelineEventRef.current?.({
            id: ctx.nextTimelineId(),
            date: nowIso.slice(0, 10),
            timestamp: nowIso,
            title: label,
            description: `وصف المال: ${String(cur.movableDescription || '').trim()}\nالمكان: ${String(cur.movableLocation || '').trim()}`,
            type: 'decision',
            source: 'محضر المتابعة — الأموال المحجوزة',
            metadata: { seizedMovableId, decisionRowId: decisionId, seizureSubtype: subtype },
        });
        return true;
    }

    return false;
}
