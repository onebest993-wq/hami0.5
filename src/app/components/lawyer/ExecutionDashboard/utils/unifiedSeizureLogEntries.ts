// @ts-nocheck
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
    readSeizureRequestTarget,
} from '@/app/utils/executorSeizureDecisionQueue';
import {
    mergeSeizedMovableLists,
    mergeSeizedPropertyLists,
} from '@/app/components/lawyer/ExecutionDashboard/utils/executionPhoneBodyExecutionDataMerge';
import { coalesceDecisionsStorageExecutionId } from '@/app/components/lawyer/ExecutionDashboard/utils/requireDecisionsStorageExecutionId';
import { buildSalarySeizureTabRows } from '@/app/components/lawyer/ExecutionDashboard/utils/salarySeizureTabUtils';
import type { SeizedAsset } from '@/app/types/execution';

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

function list<T>(value: T[] | undefined | null): T[] {
    return Array.isArray(value) ? value : [];
}

function mergeThirdPartySeizureSources(
    ui: ThirdPartySeizure[],
    fromFile: ThirdPartySeizure[] | undefined | null,
): ThirdPartySeizure[] {
    const map = new Map<string, ThirdPartySeizure>();
    for (const s of fromFile || []) {
        const id = String(s?.id || '').trim();
        if (id) map.set(id, s);
    }
    for (const s of ui) {
        const id = String(s?.id || '').trim();
        if (id) map.set(id, s);
    }
    return Array.from(map.values());
}

function readSalaryDecisionRowId(asset: SeizedAsset): string {
    const det =
        typeof asset.details === 'object' && asset.details && !Array.isArray(asset.details)
            ? (asset.details as Record<string, unknown>)
            : null;
    return String(det?.decisionRowId || '').trim();
}

function sortEntries(entries: UnifiedSeizureLogEntry[]): UnifiedSeizureLogEntry[] {
    return entries.slice().sort((a, b) => {
        const aa = a.dateYmd || '';
        const bb = b.dateYmd || '';
        return bb.localeCompare(aa, undefined, { numeric: true });
    });
}

function seizureDecisionMatchesLogKind(
    subtype: string,
    kind: UnifiedSeizureLogEntry['kind']
): boolean {
    const s = String(subtype || '').trim();
    if (kind === 'movable') return s === 'movable' || s === 'movable_auction';
    if (kind === 'property') return s === 'property';
    if (kind === 'salary') return s === 'salary';
    if (kind === 'third_party') return s === 'third_party';
    return false;
}

function guarantorSeizureSubtypeToLogKind(subtype: string): UnifiedSeizureLogEntry['kind'] | null {
    const s = String(subtype || '').trim();
    if (s === 'property') return 'property';
    if (s === 'salary') return 'salary';
    if (s === 'movable' || s === 'movable_auction') return 'movable';
    return null;
}

function inferGuarantorSeizureSubtype(row: Record<string, unknown>): string {
    let rowSubtype = String(row?.seizureSubtype || '').trim();
    if (rowSubtype) return rowSubtype;
    const text = `${String(row?.title || '')}\n${String(row?.body || '')}`;
    if (/عقار/i.test(text)) return 'property';
    if (/راتب|مكافآت|حوافز|مخصصات/i.test(text)) return 'salary';
    if (/منقول|مركبة/i.test(text)) return 'movable';
    return '';
}

function readAssetSeizureTarget(details: Record<string, unknown> | null): string {
    return String(details?.seizureTarget || '').trim();
}

function isExecutorRowPending(row: Record<string, unknown>): boolean {
    const outcome = String(row?.executorOutcome ?? 'pending').trim();
    return !outcome || outcome === 'pending';
}

function shouldIncludeExecutorSeizureDecisionRow(row: Record<string, unknown>): boolean {
    if (isExecutorRowRejectedAndFinal(row as never)) return false;
    if (isExecutorRowEffectivelyApproved(row as never)) return true;
    return isExecutorRowPending(row);
}

function executorSeizureDecisionStatusLabel(row: Record<string, unknown>): string {
    if (String(row?.seizureRequestSavedAt || '').trim()) return 'مسجّل في السجل';
    if (isExecutorRowPending(row)) return 'قيد البت لدى المنفذ';
    return 'موافقة المنفذ — أكمل البيانات';
}

export function buildUnifiedSeizureLogEntries(input: UnifiedSeizureLogBuildInput): UnifiedSeizureLogEntry[] {
    const entries: UnifiedSeizureLogEntry[] = [];

    const seizedProperties = mergeSeizedPropertyLists(
        Array.isArray((input.viewExecutionData as { seizedProperties?: unknown })?.seizedProperties)
            ? ((input.viewExecutionData as { seizedProperties?: SeizedProperty[] }).seizedProperties as SeizedProperty[])
            : [],
        [],
    );

    const seizedMovablesForLog = mergeSeizedMovableLists(
        list(input.seizedMovablesForSeizureLog),
        Array.isArray((input.viewExecutionData as { seizedMovables?: unknown })?.seizedMovables)
            ? ((input.viewExecutionData as { seizedMovables?: SeizedMovable[] }).seizedMovables as SeizedMovable[])
            : [],
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

    const decisionsExIdForSalary = coalesceDecisionsStorageExecutionId({
        decisionsStorageExecutionId: input.decisionsStorageExecutionId,
        executionId: input.executionId,
        executionData: input.viewExecutionData as Record<string, unknown> | null,
    });
    const salaryDrafts = (input.viewExecutionData?.seizureDraftsByDecisionId || {}) as Record<
        string,
        SeizedAsset
    >;
    const salaryAssetsForLog = buildSalarySeizureTabRows({
        registryAssets: (input.salarySeizureRegistryAssets || []) as SeizedAsset[],
        seizureDraftsByDecisionId: salaryDrafts,
        executionData: input.viewExecutionData ?? null,
        executionId: decisionsExIdForSalary,
    });
    const linkedSalaryDecisionIds = new Set<string>();
    for (const asset of salaryAssetsForLog) {
        const did = readSalaryDecisionRowId(asset);
        if (did) linkedSalaryDecisionIds.add(did);
    }

    for (const asset of salaryAssetsForLog) {
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
            coalesceDecisionsStorageExecutionId({
                decisionsStorageExecutionId: input.decisionsStorageExecutionId,
                executionId: input.executionId,
                executionData: input.viewExecutionData as Record<string, unknown> | null,
            }),
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
            title:
                readAssetSeizureTarget(det) === 'guarantor' || /كفيل|ضامن/i.test(String(asset.type || ''))
                    ? input.activeDebtorIsDeceased
                        ? 'حجز مخصصات/مكافأة الكفيل'
                        : 'حجز راتب الكفيل'
                    : input.activeDebtorIsDeceased
                      ? 'حجز مخصصات/مكافأة'
                      : 'حجز راتب',
            statusLabel,
            statusCode: String(asset.status || ''),
            description: desc,
            entityId: String(asset.id),
        });
    }

    if (decisionsExIdForSalary && decisionsExIdForSalary !== 'default' && decisionsExIdForSalary !== 'undefined') {
        const rows = readExecutorDecisionsArray(decisionsExIdForSalary) as Array<Record<string, unknown>>;
        for (const row of rows) {
            const did = String(row?.id || '').trim();
            if (!did || linkedSalaryDecisionIds.has(did)) continue;
            if (String(row?.requestKind || '').trim() !== 'seizure') continue;
            if (readSeizureRequestTarget(row) === 'guarantor') continue;
            let rowSubtype = String(row?.seizureSubtype || '').trim();
            if (!rowSubtype && /راتب|مكافآت|حوافز|مخصصات/i.test(`${String(row?.title || '')}\n${String(row?.body || '')}`)) {
                rowSubtype = 'salary';
            }
            if (!seizureDecisionMatchesLogKind(rowSubtype, 'salary')) continue;
            if (!shouldIncludeExecutorSeizureDecisionRow(row)) continue;
            linkedSalaryDecisionIds.add(did);
            const ymd = String(row?.resolvedAt || row?.date || '').slice(0, 10) || '';
            entries.push({
                id: `salary_decision:${did}`,
                kind: 'salary',
                dateYmd: ymd,
                title: String(row?.title || '').trim() || (input.activeDebtorIsDeceased ? 'طلب حجز مخصصات' : 'طلب حجز راتب'),
                statusLabel: executorSeizureDecisionStatusLabel(row),
                statusCode: String((row as any).seizureRequestSavedAt ? 'seized' : 'pending'),
                description:
                    String(row?.seizureRequestDetails || row?.body || '').trim() ||
                    'طلب حجز راتب — بانتظار إكمال بيانات السجل',
                entityId: did,
            });
        }
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

    for (const m of seizedMovablesForLog) {
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
                  : m.status === 'published'
                    ? 'قيد النشر والمزايدة'
                    : m.status === 'valued' || m.status === 'estimated'
                      ? 'تم التقدير'
                      : m.status === 'initial_award'
                        ? 'إحالة أولية'
                        : m.status === 'no_bidders'
                          ? 'لا راغب'
                          : m.status === 'sold'
                            ? 'مباع'
                            : m.status === 'estimation_objected'
                              ? 'تم الاعتراض'
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
            if (readSeizureRequestTarget(row) === 'guarantor') continue;
            let rowSubtype = String(row?.seizureSubtype || '').trim();
            if (!rowSubtype && /منقول|مركبة/i.test(`${String(row?.title || '')}\n${String(row?.body || '')}`)) {
                rowSubtype = 'movable';
            }
            if (!seizureDecisionMatchesLogKind(rowSubtype, 'movable')) continue;
            if (!shouldIncludeExecutorSeizureDecisionRow(row)) continue;
            seenMovableDecisionIds.add(did);
            const ymd = String(row?.resolvedAt || row?.date || '').slice(0, 10) || '';
            entries.push({
                id: `movable_decision:${did}`,
                kind: 'movable',
                dateYmd: ymd,
                title: String(row?.title || '').trim() || 'طلب حجز مال منقول',
                statusLabel: executorSeizureDecisionStatusLabel(row),
                statusCode: 'seized',
                description:
                    String(row?.seizureRequestDetails || row?.body || '').trim() ||
                    'طلب حجز مال منقول — بانتظار إكمال بيانات السجل',
                entityId: did,
            });
        }
    }

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

    const guarantorDecisionsExId = coalesceDecisionsStorageExecutionId({
        decisionsStorageExecutionId: input.decisionsStorageExecutionId,
        executionId: input.executionId,
        executionData: input.viewExecutionData as Record<string, unknown> | null,
    });
    if (
        guarantorDecisionsExId &&
        guarantorDecisionsExId !== 'default' &&
        guarantorDecisionsExId !== 'undefined'
    ) {
        const rows = readExecutorDecisionsArray(guarantorDecisionsExId) as Array<Record<string, unknown>>;
        const gf = input.viewExecutionData?.guarantor_followup;
        const guarantorName = String(gf?.guarantor_name || '').trim();
        for (const row of rows) {
            if (readSeizureRequestTarget(row) !== 'guarantor') continue;
            if (String(row?.requestKind || '').trim() !== 'seizure') continue;
            const did = String(row?.id || '').trim();
            if (!did) continue;
            const rowSubtype = inferGuarantorSeizureSubtype(row);
            const kind = guarantorSeizureSubtypeToLogKind(rowSubtype);
            if (!kind) continue;
            if (kind === 'property' && linkedPropertyDecisionIds.has(did)) continue;
            if (kind === 'salary' && linkedSalaryDecisionIds.has(did)) continue;
            if (kind === 'movable' && seenMovableDecisionIds.has(did)) continue;
            if (!shouldIncludeExecutorSeizureDecisionRow(row)) continue;
            const ymd = String(row?.resolvedAt || row?.date || '').slice(0, 10) || '';
            const baseTitle = String(row?.title || '').trim();
            const titlePrefix = guarantorName ? `حجز كفيل — ${guarantorName}` : 'حجز كفيل';
            const title =
                baseTitle && !/كفيل|ضامن/i.test(baseTitle)
                    ? `${titlePrefix} — ${baseTitle}`
                    : baseTitle || titlePrefix;
            entries.push({
                id: `guarantor_decision:${did}`,
                kind,
                dateYmd: ymd,
                title,
                statusLabel: String(row?.seizureRequestSavedAt || '').trim()
                    ? 'مسجّل في السجل'
                    : isExecutorRowPending(row)
                      ? 'قيد البت لدى المنفذ'
                      : 'موافقة المنفذ — أكمل بيانات الكفيل',
                statusCode: String(row?.seizureRequestSavedAt ? 'seized' : isExecutorRowPending(row) ? 'pending' : 'seized'),
                description:
                    String(row?.seizureRequestDetails || row?.body || '').trim() ||
                    'طلب حجز على الكفيل — بانتظار إكمال بيانات السجل',
                entityId: did,
            });
        }
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
