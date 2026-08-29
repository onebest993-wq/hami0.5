import type { UnifiedSeizureLogEntry } from '@/app/components/lawyer/execution/unifiedSeizureLogEntryTypes';
import type { ThirdPartySeizure, ThirdPartySeizureAsset } from '@/app/types/execution';
import {
    readExecutorDecisionsArray,
    readSeizureRequestTarget,
} from '@/app/utils/executorSeizureDecisionQueue';
import type { UnifiedSeizureLogBuildInput } from '@/app/components/lawyer/ExecutionDashboard/utils/unifiedSeizureLogEntriesTypes';
import {
    executorSeizureDecisionStatusLabel,
    mergeThirdPartySeizureSources,
    seizureDecisionMatchesLogKind,
    shouldIncludeExecutorSeizureDecisionRow,
} from '@/app/components/lawyer/ExecutionDashboard/utils/unifiedSeizureLogEntryInternalHelpers';

export function buildUnifiedSeizureLogThirdPartyEntries(
    input: UnifiedSeizureLogBuildInput,
): UnifiedSeizureLogEntry[] {
    const entries: UnifiedSeizureLogEntry[] = [];

    const thirdPartyCombined = mergeThirdPartySeizureSources(
        input.thirdPartySeizuresUi,
        (input.viewExecutionData as { thirdPartySeizures?: ThirdPartySeizure[] } | null | undefined)
            ?.thirdPartySeizures,
    );

    const thirdPartyUiKeys = new Set<string>();
    for (const s of thirdPartyCombined) {
        const id = String(s?.id || '').trim();
        const did = String(s?.decisionRowId || '').trim();
        if (id) thirdPartyUiKeys.add(id);
        if (did) thirdPartyUiKeys.add(did);
    }

    for (const a of input.thirdPartySeizureRegistryAssets as ThirdPartySeizureAsset[]) {
        const isPlaceholder = /بانتظار\s*الإكمال/i.test(String(a?.thirdPartyName ?? ''));
        if (isPlaceholder) continue;
        const assetId = String(a?.id || '').trim();
        const assetDecisionId = String(a?.decisionRowId || '').trim();
        const dedupKey = assetDecisionId || assetId;
        if (dedupKey && thirdPartyUiKeys.has(dedupKey)) continue;
        const statusLabel =
            a.status === 'waiting'
                ? 'بانتظار الاستلام'
                : a.status === 'received'
                  ? 'تم الاستلام'
                  : a.status === 'archived'
                    ? 'مؤرشف'
                    : String(a.status || '—');
        const desc = [
            `الطرف: ${String(a.thirdPartyName || '').trim()}`,
            a.expectedAmountIqd != null
                ? `المبلغ المتوقع: ${Number(a.expectedAmountIqd).toLocaleString('ar-IQ')} د.ع`
                : null,
            String(a.letterDetails || '').trim() ? `تفاصيل الكتاب:\n${String(a.letterDetails || '').trim()}` : null,
        ]
            .filter(Boolean)
            .join('\n');
        entries.push({
            id: `third_party:${String(a.id)}`,
            kind: 'third_party',
            dateYmd: String(a.received_at_iso || '').slice(0, 10) || String(a.archived_at_ymd || '') || '',
            title: 'حجز مال المدين لدى الغير',
            statusLabel,
            statusCode: String(a.status || ''),
            description: desc,
            entityId: String(a.id),
        });
    }

    for (const s of thirdPartyCombined) {
        const id = String(s?.id || '').trim();
        if (!id) continue;
        const thirdPartyName = String(s?.thirdPartyName || '').trim() || 'جهة غير محددة';
        const status = String(s?.status || '').trim();
        const replyStatus = String(s?.replyStatus || '').trim();
        const statusLabel =
            status === 'funds_received'
                ? 'تم التسليم'
                : status === 'replied' && replyStatus === 'denied'
                  ? 'نفي وجود رصيد — مُغلق'
                  : Boolean(s?.funds_delivery_deferred)
                    ? 'بانتظار التسليم'
                    : status === 'notified'
                      ? 'بانتظار الإجابة'
                      : status === 'replied' && replyStatus === 'acknowledged'
                        ? 'إقرار بوجود رصيد'
                        : status || '—';
        const requested =
            typeof s?.requestedAmountIqd === 'number' &&
            Number.isFinite(s.requestedAmountIqd) &&
            s.requestedAmountIqd > 0
                ? `${Math.trunc(s.requestedAmountIqd).toLocaleString('ar-IQ')} د.ع`
                : '';
        const transferred =
            typeof s?.transferredAmountIqd === 'number' &&
            Number.isFinite(s.transferredAmountIqd) &&
            s.transferredAmountIqd > 0
                ? `${Math.trunc(s.transferredAmountIqd).toLocaleString('ar-IQ')} د.ع`
                : '';
        const isClosed = (status === 'replied' && replyStatus === 'denied') || status === 'funds_received';
        const desc = isClosed
            ? ''
            : [
                  `الجهة: ${thirdPartyName}`,
                  requested ? `المبلغ المطلوب: ${requested}` : null,
                  transferred ? `المبلغ المحوّل: ${transferred}` : null,
                  String((s as { notes?: string }).notes || '').trim()
                      ? `ملاحظات:\n${String((s as { notes?: string }).notes).trim()}`
                      : null,
              ]
                  .filter(Boolean)
                  .join('\n');
        entries.push({
            id: `third_party_ui:${id}`,
            kind: 'third_party',
            dateYmd: String(s?.notificationDateIso || '').slice(0, 10) || '',
            title: `حجز لدى الغير — ${thirdPartyName}`,
            statusLabel,
            statusCode: status || replyStatus || '',
            description: desc,
            entityId: id,
        });
    }

    const thirdPartyDecisionsExId = String(
        input.decisionsStorageExecutionId || input.viewExecutionData?.id || ''
    ).trim();
    if (thirdPartyDecisionsExId && thirdPartyDecisionsExId !== 'default' && thirdPartyDecisionsExId !== 'undefined') {
        const rows = readExecutorDecisionsArray(thirdPartyDecisionsExId) as Array<Record<string, unknown>>;
        for (const row of rows) {
            const did = String(row?.id || '').trim();
            if (!did || thirdPartyUiKeys.has(did)) continue;
            if (String(row?.requestKind || '').trim() !== 'seizure') continue;
            if (readSeizureRequestTarget(row) === 'guarantor') continue;
            let rowSubtype = String(row?.seizureSubtype || '').trim();
            if (!rowSubtype && /غير|لدى الغير/i.test(`${String(row?.title || '')}\n${String(row?.body || '')}`)) {
                rowSubtype = 'third_party';
            }
            if (!seizureDecisionMatchesLogKind(rowSubtype, 'third_party')) continue;
            if (!shouldIncludeExecutorSeizureDecisionRow(row)) continue;
            thirdPartyUiKeys.add(did);
            const ymd = String(row?.resolvedAt || row?.date || '').slice(0, 10) || '';
            entries.push({
                id: `third_party_decision:${did}`,
                kind: 'third_party',
                dateYmd: ymd,
                title: String(row?.title || '').trim() || 'حجز مال المدين لدى الغير',
                statusLabel: executorSeizureDecisionStatusLabel(row),
                statusCode: 'seized',
                description:
                    String(row?.seizureRequestDetails || row?.body || '').trim() ||
                    'طلب حجز لدى الغير — بانتظار إكمال بيانات السجل',
                entityId: did,
            });
        }
    }

    return entries;
}
