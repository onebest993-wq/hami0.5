// @ts-nocheck
import type React from 'react';
import type { ExecutionFile, SeizedMovable, SeizedProperty, TimelineEvent } from '@/app/types/execution';
import type { UnifiedLedgerTotalParams } from '@/app/slices/financial/ledgerPublic';
import { buildSeizureRegistryDraftPatch } from '@/app/components/lawyer/ExecutionDashboard/helpers/seizureRegistryBridge';
import {
    getExecutorDecisionRowById,
    patchExecutorDecisionRow,
    readSeizureRequestTarget,
} from '@/app/utils/executorSeizureDecisionQueue';
import {
    buildExpertObjectionEntityPatch,
    readExpertCommitteeSize,
    parseExpertObjectionKindFromPayload,
} from '@/app/components/lawyer/ExecutionDashboard/utils/expertCommitteeUtils';
import {
    creditMovableProceedsForExecution,
    creditMovableSaleProceedsToTrustLedger,
} from '@/app/components/lawyer/ExecutionDashboard/utils/movableSeizureFinancialUtils';
import {
    creditPropertyProceedsForExecution,
    creditPropertySaleProceedsToTrustLedger,
    syncSoldPropertyProceedsToTrustLedger,
} from '@/app/components/lawyer/ExecutionDashboard/utils/propertySeizureFinancialUtils';
import {
    normalizePropertySeizureStatus,
    parseSeizedPropertyIdFromDecision,
} from '@/app/components/lawyer/ExecutionDashboard/utils/propertySeizureWorkflowUtils';

export type SeizureDecisionOutcomeDetail = {
    executionId?: string;
    decisionId?: string;
    requestKind?: string;
    outcome?: 'approved' | 'rejected';
};

export type SeizureDecisionOutcomeContext = {
    executionDataId?: string;
    executionId?: string;
    decisionsStorageExecutionId?: string;
    nextTimelineId: () => string;
    applyThirdPartySeizuresFromPatch: (patch: Record<string, unknown>) => void;
    executionDataRef: React.MutableRefObject<ExecutionFile | null>;
    persistExecutionMergeRef: React.MutableRefObject<((patch: Record<string, unknown>) => void) | null>;
    pushTimelineEventRef: React.MutableRefObject<
        ((event: TimelineEvent, options?: { mergePatch?: Record<string, unknown> }) => void) | null
    >;
    seizureMatrixLedgerParamsRef: React.MutableRefObject<UnifiedLedgerTotalParams | null>;
    focusSeizurePropertyInlineRef: React.MutableRefObject<(decisionId: string, subject?: string) => void>;
    focusSeizureMovableInlineRef: React.MutableRefObject<(decisionId: string, subject?: string) => void>;
    focusSeizureThirdPartyInlineRef: React.MutableRefObject<(decisionId: string, subject?: string) => void>;
    focusSeizureNoticeInlineRef: React.MutableRefObject<(decisionId: string, subject?: string) => void>;
    openSeizureRequestsTabRef: React.MutableRefObject<() => void>;
    setShowCoerciveActionForm: React.Dispatch<React.SetStateAction<string | null>>;
    setSeizureDetailCompletion: React.Dispatch<
        React.SetStateAction<{
            decisionRowId: string;
            assetId: string;
            actionType: 'salary' | 'property' | 'vehicle';
        } | null>
    >;
    setShowUnifiedExecutionModal: (open: boolean) => void;
    setUnifiedLedgerRevision: React.Dispatch<React.SetStateAction<number>>;
    showToast: (message: string, type: 'success' | 'error' | 'warning' | 'info') => void;
};

export function handleSeizureDecisionOutcomeEvent(e: Event, ctx: SeizureDecisionOutcomeContext): void {
    const ce = e as CustomEvent<{
        executionId?: string;
        decisionId?: string;
        requestKind?: string;
        outcome?: 'approved' | 'rejected';
    }>;
    const myId = String(ctx.executionDataId ?? ctx.executionId ?? '').trim();
    const storageId = String(ctx.decisionsStorageExecutionId ?? '').trim();
    const evId = String(ce.detail?.executionId ?? '').trim();
    const allowedIds = new Set(
        [myId, storageId, String(ctx.executionId ?? '').trim()].filter(
            (x) => x && x !== 'undefined' && x !== 'null'
        )
    );
    if (!evId || !allowedIds.has(evId)) return;
    if (String(ce.detail?.outcome || '') !== 'approved') return;
    const decisionId = String(ce.detail?.decisionId ?? '').trim();
    if (!decisionId) return;

    let decisionRow: Record<string, unknown> | null = null;
    for (const lookupId of [storageId, myId, evId]) {
        if (!lookupId) continue;
        const hit = getExecutorDecisionRowById(lookupId, decisionId) as Record<string, unknown> | null;
        if (hit) {
            decisionRow = hit;
            break;
        }
    }
    if (!decisionRow) return;
    let subtype = String(decisionRow?.seizureSubtype || '').trim();
    const decisionText = `${String(decisionRow?.title || '')}\n${String(decisionRow?.body || '')}`;
    if (!subtype && /عقار/i.test(decisionText)) {
        subtype = 'property';
    }
    if (!subtype && /إشارة/i.test(decisionText)) {
        subtype = 'notice';
    }
    if (!subtype && /الغير|طرف ثالث/i.test(decisionText)) {
        subtype = 'third_party';
    }

    const rawJson = String(decisionRow?.seizurePayloadJson || '').trim();
    let seizedPropertyId = '';
    let seizedMovableId = '';
    let movableDescription = '';
    let movableLocation = '';
    let judicialCustodianName = '';
    if (rawJson) {
        try {
            const v = JSON.parse(rawJson) as any;
            seizedPropertyId = String(v?.seizedPropertyId ?? '').trim();
            seizedMovableId = String(v?.seizedMovableId ?? '').trim();
            movableDescription = String(v?.movableDescription ?? '').trim();
            movableLocation = String(v?.movableLocation ?? '').trim();
            judicialCustodianName = String(v?.judicialCustodianName ?? '').trim();
        } catch {
            seizedPropertyId = '';
            seizedMovableId = '';
            movableDescription = '';
            movableLocation = '';
            judicialCustodianName = '';
        }
    }

    const requestKind = String(ce.detail?.requestKind ?? decisionRow?.requestKind ?? '').trim();
    const savedAtEarly = String(decisionRow?.seizureRequestSavedAt || '').trim();
    const seizureTarget = readSeizureRequestTarget(decisionRow);
    if (seizureTarget === 'guarantor' && requestKind === 'seizure' && !savedAtEarly) {
        const draftPatch = buildSeizureRegistryDraftPatch(
            ctx.executionDataRef.current as Record<string, unknown> | null | undefined,
            decisionId,
            subtype,
            decisionRow as Record<string, unknown>
        );
        if (draftPatch) {
            ctx.persistExecutionMergeRef.current?.(draftPatch);
        }
        ctx.setShowCoerciveActionForm(null);
        ctx.setSeizureDetailCompletion(null);
        ctx.setShowUnifiedExecutionModal(true);
        ctx.openSeizureRequestsTabRef.current();
        const focusKind: 'salary' | 'movable' | 'property' =
            subtype === 'property'
                ? 'property'
                : subtype === 'salary'
                  ? 'salary'
                  : 'movable';
        try {
            const exId = String(storageId || myId || evId).trim();
            window.dispatchEvent(
                new CustomEvent('hami-focus-guarantor-seizure-inline', {
                    detail: { executionId: exId, decisionId, kind: focusKind },
                })
            );
        } catch {
            /* ignore */
        }
        return;
    }
    const isBasicSeizureSubtype =
        subtype === 'property' ||
        subtype === 'movable' ||
        subtype === 'movable_auction' ||
        subtype === 'third_party';
    if ((requestKind === 'seizure' || isBasicSeizureSubtype) && !savedAtEarly && isBasicSeizureSubtype) {
        const draftPatch = buildSeizureRegistryDraftPatch(
            ctx.executionDataRef.current as Record<string, unknown> | null | undefined,
            decisionId,
            subtype,
            decisionRow as Record<string, unknown>
        );
        if (draftPatch) {
            ctx.persistExecutionMergeRef.current?.(draftPatch);
            ctx.applyThirdPartySeizuresFromPatch(draftPatch);
        }
        if (subtype === 'property') {
            ctx.focusSeizurePropertyInlineRef.current(
                decisionId,
                String(decisionRow?.title || '').trim()
            );
            return;
        }
        if (subtype === 'third_party') {
            ctx.focusSeizureThirdPartyInlineRef.current(
                decisionId,
                String(decisionRow?.title || '').trim()
            );
            return;
        }
        if (subtype === 'movable_auction' || subtype === 'movable') {
            ctx.focusSeizureMovableInlineRef.current(
                decisionId,
                String(decisionRow?.title || '').trim()
            );
            return;
        }
    }

    if (
        requestKind === 'seizure' &&
        subtype === 'notice' &&
        !savedAtEarly
    ) {
        ctx.focusSeizureNoticeInlineRef.current(
            decisionId,
            String(decisionRow?.title || '').trim()
        );
        return;
    }

    if (subtype === 'movable_auction' && !seizedMovableId) {
        const desc = movableDescription;
        const loc = movableLocation;
        const cust = judicialCustodianName;
        if (!desc || !loc) return;
        const nowIso = new Date().toISOString();
        const prev = (ctx.executionDataRef.current?.seizedMovables || []) as SeizedMovable[];
        const existingIdx = prev.findIndex((x) => String(x.decisionRowId || '') === decisionId);
        const next: SeizedMovable[] = [...prev];
        const entityId = existingIdx >= 0 ? String(next[existingIdx].id) : `sm_${decisionId}`;
        const nextRow: SeizedMovable = {
            id: entityId,
            decisionRowId: decisionId,
            movableDescription: desc,
            movableLocation: loc,
            judicialCustodianName: cust,
            status: 'seized',
            seizedAtIso: nowIso,
            subject: String(decisionRow?.title || '').trim() || undefined,
        };
        if (existingIdx >= 0) next[existingIdx] = { ...next[existingIdx], ...nextRow };
        else next.unshift(nextRow);
        ctx.persistExecutionMergeRef.current?.({ seizedMovables: next });
        const updatedPayloadJson = (() => {
            try {
                const prevJson = rawJson ? (JSON.parse(rawJson) as any) : {};
                return JSON.stringify({ ...prevJson, seizedMovableId: entityId, movableDescription: desc, movableLocation: loc, judicialCustodianName: cust });
            } catch {
                return JSON.stringify({ seizedMovableId: entityId, movableDescription: desc, movableLocation: loc, judicialCustodianName: cust });
            }
        })();
        patchExecutorDecisionRow(myId, decisionId, {
            seizureRequestSavedAt: nowIso,
            seizureRequestDetails: [
                `وصف المال المنقول: ${desc}`,
                `المكان: ${loc}`,
                cust ? `الحارس القضائي: ${cust}` : null,
            ]
                .filter(Boolean)
                .join('\n'),
            seizurePayloadJson: updatedPayloadJson,
        });
        ctx.pushTimelineEventRef.current?.({
            id: ctx.nextTimelineId(),
            date: nowIso.slice(0, 10),
            timestamp: nowIso,
            title: '📦 قبول حجز مال منقول — إنشاء بطاقة',
            description: [
                `وصف المال المنقول: ${desc}`,
                `المكان: ${loc}`,
                cust ? `الحارس القضائي: ${cust}` : null,
            ]
                .filter(Boolean)
                .join('\n'),
            type: 'decision',
            source: 'محضر المتابعة — الأموال المحجوزة',
            metadata: { seizedMovableId: entityId, decisionRowId: decisionId, seizureSubtype: subtype },
        });
        return;
    }
    if (!seizedPropertyId && !seizedMovableId) return;

    const nowIso = new Date().toISOString();
    if (seizedPropertyId) {
        if (
            subtype === 'property_expert' ||
            subtype === 'property_expert_committee' ||
            subtype === 'property_auction' ||
            subtype === 'property_reauction_default'
        ) {
            if (String(decisionRow?.seizureRequestSavedAt || '').trim()) return;
            const step =
                subtype === 'property_expert' || subtype === 'property_expert_committee'
                    ? 'experts'
                    : subtype === 'property_auction'
                      ? 'auction'
                      : 'reauction_default';
            const dispatchId = myId || storageId || evId;
            try {
                window.dispatchEvent(
                    new CustomEvent('hami-property-inline-focus', {
                        detail: {
                            executionId: dispatchId,
                            propertyId: seizedPropertyId,
                            step,
                            decisionId,
                        },
                    })
                );
            } catch {
                /* ignore */
            }
            return;
        }

        const prev = (ctx.executionDataRef.current?.seizedProperties || []) as SeizedProperty[];
        const idx = prev.findIndex((x) => String(x.id) === seizedPropertyId);
        if (idx < 0) return;
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
            return;
        }

        if (subtype === 'property_final_award') {
            const buyerName = String(
                cur.initialAwardBuyerName || cur.lastBidderOrBuyerName || cur.award?.buyerName || ''
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
            return;
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
                ...(subtype === 'property_proceeds_disburse'
                    ? { proceedsDisburseCompletedAtIso: nowIso }
                    : {}),
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
            return;
        }
        return;
    }

    if (seizedMovableId) {
        if (
            subtype === 'movable_expert' ||
            subtype === 'movable_expert_committee' ||
            subtype === 'movable_auction_date' ||
            subtype === 'movable_reauction_default'
        ) {
            if (String(decisionRow?.seizureRequestSavedAt || '').trim()) return;
            const step =
                subtype === 'movable_expert' || subtype === 'movable_expert_committee'
                    ? 'experts'
                    : subtype === 'movable_auction_date'
                      ? 'auction'
                      : 'reauction_default';
            const dispatchId = myId || storageId || evId;
            try {
                window.dispatchEvent(
                    new CustomEvent('hami-movable-inline-focus', {
                        detail: {
                            executionId: dispatchId,
                            movableId: seizedMovableId,
                            step,
                            decisionId,
                        },
                    })
                );
            } catch {
                /* ignore */
            }
            return;
        }

        const prev = (ctx.executionDataRef.current?.seizedMovables || []) as SeizedMovable[];
        const idx = prev.findIndex((x) => String(x.id) === seizedMovableId);
        if (idx < 0) return;
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
            return;
        }

        if (subtype === 'movable_final_award') {
            const buyerName = String(
                cur.initialAwardBuyerName || cur.lastBidderOrBuyerName || cur.award?.buyerName || ''
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
                    'success'
                );
            } else if (!trustCredit.ok && amt != null) {
                ctx.showToast(
                    'تمت الإحالة لكن تعذّر إيداع الحصيلة في الأمانات — تحقق من مبلغ البيع.',
                    'warning'
                );
            }
            return;
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
            return;
        }
    }
}
