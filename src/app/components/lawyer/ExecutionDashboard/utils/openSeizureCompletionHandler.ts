import type React from 'react';
import type { ExecutionFile, SeizedAsset, SeizedMovable, TimelineEvent } from '@/app/types/execution';
import { getLocalTodayYmd } from '@/app/utils/executionStateMachine';
import {
    getExecutorDecisionRowById,
    patchExecutorDecisionRow,
} from '@/app/utils/executorSeizureDecisionQueue';
import type {
    OpenSeizureCompletionContext,
    OpenSeizureCompletionDetail,
    SeizureDetailCompletionState,
} from './openSeizureCompletionHandler.types';

export type { OpenSeizureCompletionDetail, SeizureDetailCompletionState, OpenSeizureCompletionContext };
function resolveSeizureUiKind(hit: SeizedAsset): 'salary' | 'property' | 'vehicle' {
    const d = (hit.details || {}) as Record<string, unknown>;
    const raw = d.seizureUiKind;
    if (raw === 'salary' || raw === 'property' || raw === 'vehicle') {
        return raw;
    }
    const t = String(hit.type);
    if (/مال منقول|مركبة|منقول/i.test(t)) return 'vehicle';
    if (/عقار/i.test(t)) return 'property';
    if (/راتب|مكافآت|حوافز|خُمس|خمس|استحقاق/i.test(t)) return 'salary';
    return 'property';
}

function handleMovableAuctionSubtype(
    myId: string,
    decisionId: string,
    decisionRow: Record<string, unknown>,
    ctx: OpenSeizureCompletionContext
): boolean {
    const rawJson = String(decisionRow?.seizurePayloadJson || '').trim();
    let desc = '';
    let loc = '';
    let cust = '';
    if (rawJson) {
        try {
            const v = JSON.parse(rawJson) as Record<string, unknown>;
            desc = String(v?.movableDescription ?? '').trim();
            loc = String(v?.movableLocation ?? '').trim();
            cust = String(v?.judicialCustodianName ?? '').trim();
        } catch {
            desc = '';
            loc = '';
            cust = '';
        }
    }
    if (!desc || !loc || !cust) {
        ctx.focusSeizureMovableInlineRef.current(
            decisionId,
            String(decisionRow?.title || '').trim()
        );
        return true;
    }

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
            const prevJson = rawJson ? (JSON.parse(rawJson) as Record<string, unknown>) : {};
            return JSON.stringify({
                ...prevJson,
                seizedMovableId: entityId,
                movableDescription: desc,
                movableLocation: loc,
                judicialCustodianName: cust,
            });
        } catch {
            return JSON.stringify({
                seizedMovableId: entityId,
                movableDescription: desc,
                movableLocation: loc,
                judicialCustodianName: cust,
            });
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
        title: '📦 تثبيت حجز مال منقول (إنشاء بطاقة)',
        description: [
            `وصف المال المنقول: ${desc}`,
            `المكان: ${loc}`,
            cust ? `الحارس القضائي: ${cust}` : null,
        ]
            .filter(Boolean)
            .join('\n'),
        type: 'decision',
        source: 'محضر المتابعة — الأموال المحجوزة',
        metadata: { seizedMovableId: entityId, decisionRowId: decisionId },
    });
    return true;
}

export function handleOpenSeizureCompletionEvent(e: Event, ctx: OpenSeizureCompletionContext): void {
    const ce = e as CustomEvent<OpenSeizureCompletionDetail>;
    const myId = String(ctx.executionDataId ?? ctx.executionId ?? '');
    if (!myId || String(ce.detail?.executionId ?? '') !== myId) return;

    const decisionId = String(ce.detail?.decisionId ?? '').trim();
    if (!decisionId) return;

    const decisionRow = getExecutorDecisionRowById(myId, decisionId) as Record<string, unknown>;
    const subtype = String(decisionRow?.seizureSubtype || '').trim();

    if (subtype === 'property') {
        ctx.focusSeizurePropertyInlineRef.current(
            decisionId,
            String(decisionRow?.title || '').trim()
        );
        return;
    }

    if (subtype === 'movable_auction') {
        if (handleMovableAuctionSubtype(myId, decisionId, decisionRow, ctx)) return;
    }

    if (subtype === 'third_party') {
        ctx.focusSeizureThirdPartyInlineRef.current(
            decisionId,
            String(decisionRow?.title || '').trim()
        );
        return;
    }

    if (subtype === 'notice') {
        ctx.focusSeizureNoticeInlineRef.current(
            decisionId,
            String(decisionRow?.title || '').trim()
        );
        return;
    }

    const assets = ctx.seizedAssetsSnapshotRef.current;
    let hit = assets.find(
        (a) =>
            String((a.details as Record<string, unknown> | undefined)?.decisionRowId) === decisionId &&
            String(a.status) !== 'released'
    );

    if (!hit) {
        const fallbackSubtype = String(decisionRow?.seizureSubtype || '').trim();
        const today = getLocalTodayYmd();
        const now = new Date().toISOString();
        let kind: 'salary' | 'property' | 'vehicle' = 'property';
        if (fallbackSubtype === 'movable' || fallbackSubtype === 'movable_auction') kind = 'vehicle';
        else if (fallbackSubtype === 'salary') kind = 'salary';
        else kind = 'property';

        const baseTypeLabel =
            kind === 'vehicle'
                ? 'طلب حجز مال منقول'
                : kind === 'salary'
                  ? 'طلب حجز راتب'
                  : fallbackSubtype === 'notice'
                    ? 'طلب وضع إشارة الحجز التنفيذي'
                    : fallbackSubtype === 'third_party'
                      ? 'حجز مال المدين لدى الغير'
                      : 'طلب حجز عقار';

        const placeholder: SeizedAsset = {
            id: `inv_${decisionId}_${Date.now()}`,
            type: `${baseTypeLabel} — موافقة المنفذ`,
            status: 'seized',
            seizureDate: today,
            description: '',
            notes: '',
            details: {
                seizureUiKind: kind,
                decisionRowId: decisionId,
                employerName: '',
                salaryAmount: '',
                propertyAddress: '',
                propertyLocation: '',
                vehicleDescription: '',
                vehiclePlate: '',
                movableAssetType: '',
                movableDescription: '',
                movableLocation: '',
                judicialCustodianName: '',
                createdFrom: 'fallback_open_seizure_completion',
                createdAt: now,
            },
        };

        ctx.setSeizedAssets((prev) => {
            const next = [...prev, placeholder];
            queueMicrotask(() => ctx.persistExecutionMergeRef.current?.({ seizedAssets: next }));
            return next;
        });
        hit = placeholder;
    }

    ctx.setSeizureDetailCompletion({
        decisionRowId: decisionId,
        assetId: hit.id,
        actionType: resolveSeizureUiKind(hit),
    });
    ctx.setShowCoerciveActionForm(resolveSeizureUiKind(hit));
}
