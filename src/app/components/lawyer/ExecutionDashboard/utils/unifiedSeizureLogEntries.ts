import type { UnifiedSeizureLogEntry } from '@/app/components/lawyer/execution/UnifiedSeizureLogModal';
import {
    buildSalarySeizureDescriptionText,
    resolveSalarySeizureSubject,
} from '@/app/components/lawyer/ExecutionDashboard/utils/salarySeizureDisplayUtils';
import type {
    ExecutionFile,
    SeizedMovable,
    SeizedProperty,
    ThirdPartySeizure,
} from '@/app/types/execution';
import {
    isExecutorRowEffectivelyApproved,
    isExecutorRowRejectedAndFinal,
    readExecutorDecisionsArray,
} from '@/app/utils/executorSeizureDecisionQueue';

export type UnifiedSeizureLogBuildInput = {
    viewExecutionData: ExecutionFile | null | undefined;
    decisionsStorageExecutionId?: string;
    executionId?: string;
    activeDebtorIsDeceased: boolean;
    realEstateSeizureRegistryAssets: unknown[];
    salarySeizureRegistryAssets: unknown[];
    movableSeizureRegistryAssets: unknown[];
    seizedMovablesForSeizureLog: SeizedMovable[];
    thirdPartySeizureRegistryAssets: unknown[];
    thirdPartySeizuresUi: ThirdPartySeizure[];
};

export type UnifiedSeizureTabCounts = {
    property: number;
    salary: number;
    movable: number;
    third_party: number;
};

function sortEntries(entries: UnifiedSeizureLogEntry[]): UnifiedSeizureLogEntry[] {
    return entries.slice().sort((a, b) => {
        const aa = a.dateYmd || '';
        const bb = b.dateYmd || '';
        return bb.localeCompare(aa, undefined, { numeric: true });
    });
}

export function buildUnifiedSeizureLogEntries(input: UnifiedSeizureLogBuildInput): UnifiedSeizureLogEntry[] {
    const entries: UnifiedSeizureLogEntry[] = [];

    const seizedProperties = Array.isArray((input.viewExecutionData as any)?.seizedProperties)
        ? (((input.viewExecutionData as any).seizedProperties as SeizedProperty[]) || [])
        : [];

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

    for (const asset of input.realEstateSeizureRegistryAssets as any[]) {
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
            let rowSubtype = String(row?.seizureSubtype || '').trim();
            if (!rowSubtype && /عقار/i.test(`${String(row?.title || '')}\n${String(row?.body || '')}`)) {
                rowSubtype = 'property';
            }
            if (rowSubtype !== 'property') continue;
            if (isExecutorRowRejectedAndFinal(row as any)) continue;
            if (!isExecutorRowEffectivelyApproved(row as any)) continue;
            linkedPropertyDecisionIds.add(did);
            const ymd = String(row?.resolvedAt || row?.date || '').slice(0, 10) || '';
            entries.push({
                id: `property_decision:${did}`,
                kind: 'property',
                dateYmd: ymd,
                title: String(row?.title || '').trim() || 'طلب حجز عقار',
                statusLabel: String(row?.seizureRequestSavedAt || '').trim()
                    ? 'مسجّل في السجل'
                    : 'موافقة المنفذ — أكمل البيانات',
                statusCode: 'seized',
                description:
                    String(row?.seizureRequestDetails || row?.body || '').trim() ||
                    'طلب حجز عقار — بانتظار إكمال بيانات السجل',
                entityId: did,
            });
        }
    }

    for (const asset of input.salarySeizureRegistryAssets as any[]) {
        const det =
            typeof asset?.details === 'object' && asset.details && !Array.isArray(asset.details)
                ? (asset.details as Record<string, unknown>)
                : null;
        const office = String(det?.employerName || '').trim();
        const salary = String(det?.salaryAmount || '').trim();
        const deductionRaw = det?.monthlyDeductionIqd ?? det?.monthlyDeduction ?? null;
        const deductionNum =
            typeof deductionRaw === 'number' && Number.isFinite(deductionRaw) && deductionRaw > 0
                ? Math.trunc(deductionRaw)
                : 0;
        const statusLabel =
            asset.status === 'seized'
                ? 'تم الحجز'
                : asset.status === 'released'
                  ? 'فُك الحجز'
                  : String(asset.status || '—');
        const subject = resolveSalarySeizureSubject(
            asset as Record<string, unknown>,
            input.viewExecutionData ?? null,
            String(input.decisionsStorageExecutionId ?? input.executionId ?? '').trim() || undefined
        );
        const desc = buildSalarySeizureDescriptionText({
            employerName: office,
            salaryAmount: salary,
            monthlyDeductionIqd: deductionNum > 0 ? deductionNum : undefined,
            activeDebtorIsDeceased: input.activeDebtorIsDeceased,
            subject,
        });
        entries.push({
            id: `salary:${String(asset.id)}`,
            kind: 'salary',
            dateYmd: String(asset.seizureDate || ''),
            title: input.activeDebtorIsDeceased ? 'حجز مخصصات/مكافأة' : 'حجز راتب',
            statusLabel,
            statusCode: String(asset.status || ''),
            description: desc,
            entityId: String(asset.id),
        });
    }

    const seenMovableDecisionIds = new Set<string>();
    const seenMovableEntityIds = new Set<string>();

    for (const asset of input.movableSeizureRegistryAssets as any[]) {
        const det =
            typeof asset?.details === 'object' && asset.details && !Array.isArray(asset.details)
                ? (asset.details as Record<string, unknown>)
                : null;
        const linkedDid = String(det?.decisionRowId || asset?.id || '').trim();
        const assetId = String(asset?.id || '').trim();
        if (linkedDid) seenMovableDecisionIds.add(linkedDid);
        if (assetId) seenMovableEntityIds.add(assetId);
        const t = String(det?.movableAssetType || det?.vehicleDescription || '').trim();
        const est = String(det?.movableEstimatedValueIqd || '').trim();
        const notes = String(det?.movableNotes || '').trim();
        const statusLabel =
            asset.status === 'seized'
                ? 'تم الحجز'
                : asset.status === 'released'
                  ? 'فُك الحجز'
                  : String(asset.status || '—');
        const desc = [t ? `المال المنقول: ${t}` : null, est ? `قيمة تقديرية: ${est}` : null, notes ? `ملاحظات:\n${notes}` : null]
            .filter(Boolean)
            .join('\n');
        entries.push({
            id: `movable:${String(asset.id)}`,
            kind: 'movable',
            dateYmd: String(asset.seizureDate || ''),
            title: 'حجز مال منقول',
            statusLabel,
            statusCode: String(asset.status || ''),
            description: desc,
            entityId: String(asset.id),
        });
    }

    for (const m of input.seizedMovablesForSeizureLog) {
        const mid = String(m.id || '').trim();
        const did = String(m.decisionRowId || m.id || '').trim();
        if (mid && seenMovableEntityIds.has(mid)) continue;
        if (did && seenMovableDecisionIds.has(did)) continue;
        if (mid) seenMovableEntityIds.add(mid);
        if (did) seenMovableDecisionIds.add(did);
        const ymd = String(m.seizedAtIso || '').slice(0, 10) || '';
        const statusLabel =
            m.status === 'seized'
                ? 'تم الحجز'
                : m.status === 'released'
                  ? 'فُك الحجز'
                  : String(m.status || '—');
        const desc = [
            String(m.movableDescription || '').trim() ? `وصف المال المنقول: ${String(m.movableDescription || '').trim()}` : null,
            String(m.movableLocation || '').trim() ? `المكان: ${String(m.movableLocation || '').trim()}` : null,
            String(m.judicialCustodianName || '').trim()
                ? `الحارس القضائي: ${String(m.judicialCustodianName || '').trim()}`
                : null,
        ]
            .filter(Boolean)
            .join('\n');
        entries.push({
            id: `movable_entity:${String(m.id)}`,
            kind: 'movable',
            dateYmd: ymd,
            title: 'حجز مال منقول',
            statusLabel,
            statusCode: String(m.status || ''),
            description: desc,
            entityId: String(m.id),
        });
    }

    const movableDecisionsExId = String(
        input.decisionsStorageExecutionId || input.viewExecutionData?.id || ''
    ).trim();
    if (movableDecisionsExId && movableDecisionsExId !== 'default' && movableDecisionsExId !== 'undefined') {
        const rows = readExecutorDecisionsArray(movableDecisionsExId) as Array<Record<string, unknown>>;
        for (const row of rows) {
            const did = String(row?.id || '').trim();
            if (!did || seenMovableDecisionIds.has(did)) continue;
            if (String(row?.requestKind || '').trim() !== 'seizure') continue;
            let rowSubtype = String(row?.seizureSubtype || '').trim();
            if (!rowSubtype && /منقول|مركبة/i.test(`${String(row?.title || '')}\n${String(row?.body || '')}`)) {
                rowSubtype = 'movable';
            }
            if (rowSubtype !== 'movable') continue;
            if (isExecutorRowRejectedAndFinal(row as any)) continue;
            if (!isExecutorRowEffectivelyApproved(row as any)) continue;
            seenMovableDecisionIds.add(did);
            const ymd = String(row?.resolvedAt || row?.date || '').slice(0, 10) || '';
            entries.push({
                id: `movable_decision:${did}`,
                kind: 'movable',
                dateYmd: ymd,
                title: String(row?.title || '').trim() || 'طلب حجز مال منقول',
                statusLabel: String(row?.seizureRequestSavedAt || '').trim()
                    ? 'مسجّل في السجل'
                    : 'موافقة المنفذ — أكمل البيانات',
                statusCode: 'seized',
                description:
                    String(row?.seizureRequestDetails || row?.body || '').trim() ||
                    'طلب حجز مال منقول — بانتظار إكمال بيانات السجل',
                entityId: did,
            });
        }
    }

    const thirdPartyUiKeys = new Set<string>();
    for (const s of input.thirdPartySeizuresUi) {
        const id = String(s?.id || '').trim();
        const did = String(s?.decisionRowId || '').trim();
        if (id) thirdPartyUiKeys.add(id);
        if (did) thirdPartyUiKeys.add(did);
    }

    for (const a of input.thirdPartySeizureRegistryAssets as any[]) {
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

    for (const s of input.thirdPartySeizuresUi) {
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
                  String(s?.notes || '').trim() ? `ملاحظات:\n${String(s.notes).trim()}` : null,
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

    return sortEntries(entries);
}

export function computeUnifiedSeizureTabCounts(entries: UnifiedSeizureLogEntry[]): UnifiedSeizureTabCounts {
    const counts = { property: 0, salary: 0, movable: 0, third_party: 0 };
    for (const e of entries) {
        if (e.kind === 'property') counts.property += 1;
        else if (e.kind === 'salary') counts.salary += 1;
        else if (e.kind === 'movable') counts.movable += 1;
        else if (e.kind === 'third_party') counts.third_party += 1;
    }
    return counts;
}

export function hasUnifiedSeizureLogEntries(entries: UnifiedSeizureLogEntry[]): boolean {
    const counts = computeUnifiedSeizureTabCounts(entries);
    return counts.property + counts.salary + counts.movable + counts.third_party > 0;
}
