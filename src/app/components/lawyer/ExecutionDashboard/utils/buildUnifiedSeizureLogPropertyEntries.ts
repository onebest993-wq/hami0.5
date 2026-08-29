import type { UnifiedSeizureLogEntry } from '@/app/components/lawyer/execution/unifiedSeizureLogEntryTypes';
import type { RealEstateSeizureAsset, SeizedProperty } from '@/app/types/execution';
import {
    readExecutorDecisionsArray,
    readSeizureRequestTarget,
} from '@/app/utils/executorSeizureDecisionQueue';
import { mergeSeizedPropertyLists } from '@/app/components/lawyer/ExecutionDashboard/utils/executionPhoneBodyExecutionDataMerge';
import type { UnifiedSeizureLogBuildInput } from '@/app/components/lawyer/ExecutionDashboard/utils/unifiedSeizureLogEntriesTypes';
import {
    executorSeizureDecisionStatusLabel,
    seizureDecisionMatchesLogKind,
    shouldIncludeExecutorSeizureDecisionRow,
} from '@/app/components/lawyer/ExecutionDashboard/utils/unifiedSeizureLogEntryInternalHelpers';

export type BuildUnifiedSeizureLogPropertyResult = {
    entries: UnifiedSeizureLogEntry[];
    linkedPropertyDecisionIds: Set<string>;
};

export function buildUnifiedSeizureLogPropertyEntries(
    input: UnifiedSeizureLogBuildInput,
): BuildUnifiedSeizureLogPropertyResult {
    const entries: UnifiedSeizureLogEntry[] = [];

    const seizedProperties = mergeSeizedPropertyLists(
        Array.isArray((input.viewExecutionData as { seizedProperties?: unknown })?.seizedProperties)
            ? ((input.viewExecutionData as { seizedProperties?: SeizedProperty[] }).seizedProperties as SeizedProperty[])
            : [],
        [],
    );

    for (const p of seizedProperties) {
        const ymd = String(p.seizedAtIso || '').slice(0, 10) || '';
        const rawStatus = String(p.status || '');
        const status =
            rawStatus === 'estimated'
                ? 'valued'
                : rawStatus === 'auction_scheduled'
                  ? 'published'
                  : rawStatus;
        const statusLabel =
            status === 'sold'
                ? 'مباع'
                : status === 'initial_award'
                  ? 'إحالة أولية'
                  : status === 'estimation_objected'
                    ? 'تم الاعتراض'
                    : status === 'no_bidders'
                      ? 'لا راغب'
                      : status === 'published'
                        ? 'قيد النشر والمزايدة'
                        : status === 'valued'
                          ? 'تم التقدير'
                          : 'محجوز';
        const descParts: string[] = [];
        descParts.push(`رقم العقار: ${String(p.propertyNumber || '').trim()}`);
        descParts.push(`الجنس: ${String(p.propertyGender || '').trim()}`);
        if (p.estimatedPriceIqd != null && Number.isFinite(Number(p.estimatedPriceIqd))) {
            descParts.push(`قيمة التقدير: ${Number(p.estimatedPriceIqd).toLocaleString('ar-IQ')} د.ع`);
        }
        if (String(p.deedNotes || '').trim()) {
            descParts.push(`تفاصيل السند:\n${String(p.deedNotes || '').trim()}`);
        }
        if (
            (p.expertEstimatedAmountIqd != null && Number.isFinite(Number(p.expertEstimatedAmountIqd))) ||
            (Array.isArray(p.expertNames) && p.expertNames.length > 0) ||
            String(p.expertReportDateYmd || '').trim()
        ) {
            const est =
                p.expertEstimatedAmountIqd != null && Number.isFinite(Number(p.expertEstimatedAmountIqd))
                    ? Number(p.expertEstimatedAmountIqd).toLocaleString('ar-IQ') + ' د.ع'
                    : '';
            const names = Array.isArray(p.expertNames) && p.expertNames.length > 0 ? p.expertNames.join('، ') : '';
            const d = String(p.expertReportDateYmd || '').trim();
            descParts.push(
                `تقرير الخبراء:${est ? ` ${est}` : ''}${d ? ` — تاريخ: ${d}` : ''}${names ? ` — الخبراء: ${names}` : ''}`.trim()
            );
        } else if (p.experts?.expertName) {
            descParts.push(
                `تقرير الخبراء: ${String(p.experts.expertName)}${
                    p.experts.estimatedPriceIqd != null && Number.isFinite(Number(p.experts.estimatedPriceIqd))
                        ? ` — ${Number(p.experts.estimatedPriceIqd).toLocaleString('ar-IQ')} د.ع`
                        : ''
                }`
            );
        }
        const auctionDate = String(p.auctionDateYmd || p.auction?.auctionDateYmd || '').trim();
        if (auctionDate) descParts.push(`موعد المزايدة: ${auctionDate}`);
        if (p.auctionDepositAmountIqd != null && Number.isFinite(Number(p.auctionDepositAmountIqd))) {
            descParts.push(`التأمينات القانونية (10%): ${Number(p.auctionDepositAmountIqd).toLocaleString('ar-IQ')} د.ع`);
        }
        if (status === 'initial_award') {
            const b = String(p.initialAwardBuyerName || '').trim();
            const a =
                p.initialAwardAmountIqd != null && Number.isFinite(Number(p.initialAwardAmountIqd))
                    ? Number(p.initialAwardAmountIqd)
                    : null;
            if (b) {
                descParts.push(
                    `رسو المزاد (إحالة أولية): ${b}${a != null ? ` — ${Number(a).toLocaleString('ar-IQ')} د.ع` : ''}`
                );
            }
        } else {
            const buyer = String(p.lastBidderOrBuyerName || p.award?.buyerName || '').trim();
            const awardAmt =
                p.finalAwardAmountIqd != null && Number.isFinite(Number(p.finalAwardAmountIqd))
                    ? Number(p.finalAwardAmountIqd)
                    : p.award?.awardAmountIqd != null && Number.isFinite(Number(p.award.awardAmountIqd))
                      ? Number(p.award.awardAmountIqd)
                      : null;
            if (buyer) {
                descParts.push(
                    `الإحالة: ${buyer}${awardAmt != null ? ` — ${Number(awardAmt).toLocaleString('ar-IQ')} د.ع` : ''}`
                );
            }
        }
        if (String(p.reauctionDefault?.notes || '').trim()) {
            descParts.push(`نكول/إعادة مزايدة: ${String(p.reauctionDefault?.notes || '').trim()}`);
        }

        entries.push({
            id: `property:${String(p.id)}`,
            kind: 'property',
            dateYmd: ymd,
            title: `عقار — رقم ${String(p.propertyNumber || '').trim()}`,
            statusLabel,
            statusCode: String(p.status || ''),
            description: descParts.filter(Boolean).join('\n'),
            entityId: String(p.id),
        });
    }

    const linkedPropertyDecisionIds = new Set(
        seizedProperties.map((p) => String(p.decisionRowId || '').trim()).filter(Boolean)
    );
    const linkedPropertyIds = new Set(seizedProperties.map((p) => String(p.id || '').trim()).filter(Boolean));

    for (const asset of input.realEstateSeizureRegistryAssets as RealEstateSeizureAsset[]) {
        const did = String(asset?.decisionRowId || '').trim();
        const assetId = String(asset?.id || '').trim();
        if (assetId && linkedPropertyIds.has(assetId)) continue;
        if (did && linkedPropertyDecisionIds.has(did)) continue;
        if (did) linkedPropertyDecisionIds.add(did);
        const label = String(asset?.propertyNoAndDistrict || asset?.propertyGender || '').trim() || 'عقار';
        entries.push({
            id: `real_estate:${String(asset?.id || did || label)}`,
            kind: 'property',
            dateYmd: '',
            title: `عقار — ${label}`,
            statusLabel: String(asset?.status || '') === 'sold' ? 'مباع' : 'محجوز',
            statusCode: String(asset?.status || 'seized'),
            description: [
                label ? `رقم العقار والمقاطعة: ${label}` : null,
                asset?.propertyGender ? `الجنس: ${String(asset.propertyGender)}` : null,
                String(asset?.deedNotes || '').trim() ? `تفاصيل السند:\n${String(asset.deedNotes).trim()}` : null,
            ]
                .filter(Boolean)
                .join('\n'),
            entityId: String(asset?.id || did || ''),
        });
    }

    const decisionsExId = String(input.decisionsStorageExecutionId || input.viewExecutionData?.id || '').trim();
    if (decisionsExId && decisionsExId !== 'default' && decisionsExId !== 'undefined') {
        const rows = readExecutorDecisionsArray(decisionsExId) as Array<Record<string, unknown>>;
        for (const row of rows) {
            const did = String(row?.id || '').trim();
            if (!did || linkedPropertyDecisionIds.has(did)) continue;
            if (String(row?.requestKind || '').trim() !== 'seizure') continue;
            if (readSeizureRequestTarget(row) === 'guarantor') continue;
            let rowSubtype = String(row?.seizureSubtype || '').trim();
            if (!rowSubtype && /عقار/i.test(`${String(row?.title || '')}\n${String(row?.body || '')}`)) {
                rowSubtype = 'property';
            }
            if (!seizureDecisionMatchesLogKind(rowSubtype, 'property')) continue;
            if (!shouldIncludeExecutorSeizureDecisionRow(row)) continue;
            linkedPropertyDecisionIds.add(did);
            const ymd = String(row?.resolvedAt || row?.date || '').slice(0, 10) || '';
            entries.push({
                id: `property_decision:${did}`,
                kind: 'property',
                dateYmd: ymd,
                title: String(row?.title || '').trim() || 'طلب حجز عقار',
                statusLabel: executorSeizureDecisionStatusLabel(row),
                statusCode: 'seized',
                description:
                    String(row?.seizureRequestDetails || row?.body || '').trim() ||
                    'طلب حجز عقار — بانتظار إكمال بيانات السجل',
                entityId: did,
            });
        }
    }

    return { entries, linkedPropertyDecisionIds };
}
