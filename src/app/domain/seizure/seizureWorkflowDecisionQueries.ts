import {
    DECISIONS_RELOAD_EVENT,
    isExecutorHubRowInactiveForGoverning,
    patchExecutorDecisionRow,
} from '@/app/utils/executorSeizureDecisionQueue';
import { isExecutorRowApprovedWorkflowActive } from '@/app/utils/executorRequestAppealSync';
import {
    isDecisionPending,
    isDecisionResolvedApproved,
    normalizeSeizureWorkflowStatus,
} from './seizureWorkflowStatus';
import type { SeizureAssetPlugin } from './seizureAssetPlugins';
import { parseSeizedEntityIdFromDecision } from './seizureAssetPlugins';
import type { SeizureEntityBase, SeizureWorkflowHistoryLine } from './seizureWorkflowTypes';

export function findSeizureDecisionForEntity(
    decisions: Array<Record<string, unknown>>,
    plugin: SeizureAssetPlugin,
    subtype: string,
    entityId: string,
    opts?: { pendingOnly?: boolean },
): Record<string, unknown> | null {
    const eid = String(entityId || '').trim();
    const st = String(subtype || '').trim();
    if (!st) return null;
    const hits = decisions.filter((r) => {
        if (isExecutorHubRowInactiveForGoverning(r, decisions)) return false;
        if (String(r?.requestKind || '') !== 'seizure') return false;
        if (String(r?.seizureSubtype || '').trim() !== st) return false;
        if (eid) {
            const linked = parseSeizedEntityIdFromDecision(plugin, r);
            if (linked && linked !== eid) return false;
        }
        if (opts?.pendingOnly) return isDecisionPending(r);
        return true;
    });
    if (hits.length === 0) return null;
    return hits.reduce((acc, cur) => {
        const a = String(
            (acc as { resolvedAt?: string; date?: string }).resolvedAt ??
                (acc as { date?: string }).date ??
                '',
        );
        const b = String(
            (cur as { resolvedAt?: string; date?: string }).resolvedAt ??
                (cur as { date?: string }).date ??
                '',
        );
        return b.localeCompare(a, undefined, { numeric: true }) > 0 ? cur : acc;
    }, hits[0]!);
}

export function listPendingSeizureDecisionsForEntity(
    decisions: Array<Record<string, unknown>>,
    plugin: SeizureAssetPlugin,
    entityId: string,
): Array<Record<string, unknown>> {
    const eid = String(entityId || '').trim();
    return decisions.filter((r) => {
        if (isExecutorHubRowInactiveForGoverning(r, decisions)) return false;
        if (String(r?.requestKind || '') !== 'seizure') return false;
        if (eid) {
            const linked = parseSeizedEntityIdFromDecision(plugin, r);
            if (linked && linked !== eid) return false;
        }
        return isDecisionPending(r);
    });
}

export function findApprovedUnsavedSeizureDecision(
    decisions: Array<Record<string, unknown>>,
    plugin: SeizureAssetPlugin,
    subtype: string,
    entityId: string,
): Record<string, unknown> | null {
    const row = findSeizureDecisionForEntity(decisions, plugin, subtype, entityId);
    if (!row || !isDecisionResolvedApproved(row, decisions)) return null;
    if (String(row.seizureRequestSavedAt || '').trim()) return null;
    if (!isExecutorRowApprovedWorkflowActive(row, decisions)) return null;
    return row;
}

export function isStaleInitSeizureDecision(
    plugin: SeizureAssetPlugin,
    row: Record<string, unknown>,
    entity: SeizureEntityBase,
): boolean {
    let subtype = String(row?.seizureSubtype || '').trim();
    if (!subtype) {
        const text = `${String(row?.title || '')}\n${String(row?.body || '')}`;
        if (plugin.staleInitTextRegex.test(text)) {
            subtype = plugin.initSubtypes[0] || '';
        }
    }
    if (!plugin.initSubtypes.includes(subtype)) return false;
    return Boolean(String(entity?.id || '').trim());
}

export function findConflictingPendingSubtype(
    decisions: Array<Record<string, unknown>>,
    plugin: SeizureAssetPlugin,
    entityId: string,
    subtypeToSubmit: string,
): string | null {
    const st = String(subtypeToSubmit || '').trim();
    const group = plugin.exclusiveSubtypeGroups.find((g) => g.includes(st));
    if (!group) return null;
    for (const other of group) {
        if (other === st) continue;
        const row = findSeizureDecisionForEntity(decisions, plugin, other, entityId, {
            pendingOnly: true,
        });
        if (row) return other;
    }
    return null;
}

export function conflictingSubtypeLabelAr(plugin: SeizureAssetPlugin, subtype: string): string {
    return plugin.subtypeLabelAr[String(subtype || '').trim()] || subtype;
}

export function withdrawPendingDecisionsForStep(
    dossierId: string,
    decisions: Array<Record<string, unknown>>,
    plugin: SeizureAssetPlugin,
    entityId: string,
    subtypes: string[],
): number {
    const exId = String(dossierId || '').trim();
    if (!exId) return 0;
    let count = 0;
    for (const subtype of subtypes) {
        const row = findSeizureDecisionForEntity(decisions, plugin, subtype, entityId, {
            pendingOnly: true,
        });
        const decisionId = String(row?.id || '').trim();
        if (!decisionId) continue;
        try {
            patchExecutorDecisionRow(exId, decisionId, {
                isArchived: true,
                executorOutcome: 'withdrawn',
            } as Record<string, unknown>);
            count += 1;
        } catch {
            /* ignore */
        }
    }
    if (count > 0) {
        try {
            window.dispatchEvent(new Event(DECISIONS_RELOAD_EVENT));
        } catch {
            /* ignore */
        }
    }
    return count;
}

function fmtIqdAr(n: unknown): string {
    const v = Number(n);
    if (!Number.isFinite(v) || v <= 0) return '—';
    return `${Math.trunc(v).toLocaleString('ar-IQ')} د.ع`;
}

function pushDecisionHistory(
    lines: SeizureWorkflowHistoryLine[],
    decisions: Array<Record<string, unknown>>,
    plugin: SeizureAssetPlugin,
    entityId: string,
    subtypes: string[],
): void {
    for (const subtype of subtypes) {
        const row = findSeizureDecisionForEntity(decisions, plugin, subtype, entityId);
        if (!row || !isDecisionResolvedApproved(row)) continue;
        const title = String(row.title || row.requestTitle || '').trim();
        const details = String(row.seizureRequestDetails || row.body || '').trim();
        if (title) lines.push({ label: 'قرار المنفذ', value: title });
        if (details) {
            const short = details.length > 280 ? `${details.slice(0, 277)}…` : details;
            lines.push({ label: 'ما تم تنفيذه', value: short });
        }
        return;
    }
}

export function buildSeizureWorkflowStepHistory(
    stepIndex: number,
    entity: SeizureEntityBase,
    decisions: Array<Record<string, unknown>>,
    plugin: SeizureAssetPlugin,
    entityId: string,
): SeizureWorkflowHistoryLine[] {
    const lines: SeizureWorkflowHistoryLine[] = [];
    const txt = (v: unknown) => String(v ?? '').trim() || '—';

    switch (stepIndex) {
        case 0:
            if (entity.seizureMarkLetterNumber) {
                lines.push({ label: 'رقم كتاب الإشارة', value: txt(entity.seizureMarkLetterNumber) });
            }
            if (entity.seizureMarkDate) {
                lines.push({ label: 'تاريخ الإشارة', value: txt(entity.seizureMarkDate) });
            }
            if (entity.seizureMarkEntity) {
                lines.push({ label: 'جهة الإشارة', value: txt(entity.seizureMarkEntity) });
            }
            break;
        case 1:
            pushDecisionHistory(lines, decisions, plugin, entityId, [plugin.expertSubtype]);
            if (Array.isArray(entity.expertNames) && entity.expertNames.length) {
                lines.push({ label: 'الخبراء', value: entity.expertNames.filter(Boolean).join('، ') });
            } else if (entity.experts?.expertName) {
                lines.push({ label: 'الخبير', value: txt(entity.experts.expertName) });
            }
            if (entity.expertReportDateYmd) {
                lines.push({ label: 'تاريخ التقرير', value: txt(entity.expertReportDateYmd) });
            }
            if (entity.expertEstimatedAmountIqd != null) {
                lines.push({ label: 'مبلغ التقدير', value: fmtIqdAr(entity.expertEstimatedAmountIqd) });
            } else if (entity.estimatedPriceIqd != null) {
                lines.push({ label: 'مبلغ التقدير', value: fmtIqdAr(entity.estimatedPriceIqd) });
            }
            break;
        case 2: {
            const objectionKind = String(entity.lastExpertObjectionKind || '').trim();
            if (objectionKind === 'report' || objectionKind === 'experts') {
                pushDecisionHistory(lines, decisions, plugin, entityId, [plugin.expertObjectionSubtype]);
                lines.push({
                    label: 'مسار الاعتراض',
                    value: objectionKind === 'experts' ? 'اعتراض على الخبراء' : 'اعتراض على التقرير',
                });
            } else {
                pushDecisionHistory(lines, decisions, plugin, entityId, [plugin.auctionSubtype]);
                const auctionYmd = String(
                    entity.auctionDateYmd || entity.auction?.auctionDateYmd || '',
                ).trim();
                if (auctionYmd) lines.push({ label: 'موعد المزايدة', value: auctionYmd });
            }
            break;
        }
        case 3:
            pushDecisionHistory(lines, decisions, plugin, entityId, [plugin.expertCommitteeSubtype]);
            if (entity.expertCommitteeSize != null) {
                lines.push({ label: 'عدد الخبراء', value: String(entity.expertCommitteeSize) });
            }
            if (Array.isArray(entity.expertNames) && entity.expertNames.length) {
                lines.push({ label: 'لجنة الخبراء', value: entity.expertNames.filter(Boolean).join('، ') });
            }
            if (entity.expertReportDateYmd) {
                lines.push({ label: 'تاريخ التقرير', value: txt(entity.expertReportDateYmd) });
            }
            if (entity.expertEstimatedAmountIqd != null) {
                lines.push({ label: 'مبلغ التقدير', value: fmtIqdAr(entity.expertEstimatedAmountIqd) });
            }
            break;
        case 4:
            if (entity.newspaperName) lines.push({ label: 'الجريدة', value: txt(entity.newspaperName) });
            if (entity.publicationDateYmd) {
                lines.push({ label: 'تاريخ النشر', value: txt(entity.publicationDateYmd) });
            }
            break;
        case 5:
            if (entity.noBiddersRecordedAtIso) {
                lines.push({ label: 'نتيجة الجلسة', value: 'لا راغب بالشراء' });
            } else if (entity.initialAwardBuyerName || entity.initialAwardAmountIqd != null) {
                lines.push({ label: 'نتيجة الجلسة', value: 'إحالة أولية / رسو مزاد' });
                if (entity.initialAwardBuyerName) {
                    lines.push({ label: 'المشتري', value: txt(entity.initialAwardBuyerName) });
                }
                if (entity.initialAwardAmountIqd != null) {
                    lines.push({ label: 'مبلغ الرسو', value: fmtIqdAr(entity.initialAwardAmountIqd) });
                }
                if (entity.auctionDepositAmountIqd != null) {
                    lines.push({ label: 'التأمينات (10%)', value: fmtIqdAr(entity.auctionDepositAmountIqd) });
                }
            }
            break;
        case 6:
            if (entity.noBiddersRecordedAtIso) {
                lines.push({ label: 'حالة', value: 'تم تسجيل «لا راغب بالشراء»' });
            }
            pushDecisionHistory(lines, decisions, plugin, entityId, [plugin.auctionSubtype]);
            break;
        case 7:
            if (entity.reauctionDefault?.recordedAtIso) {
                pushDecisionHistory(lines, decisions, plugin, entityId, [plugin.reauctionDefaultSubtype]);
                lines.push({ label: 'المسار', value: 'إعادة المزايدة للنكول' });
                if (entity.reauctionDefault.notes) {
                    lines.push({ label: 'ملاحظات', value: txt(entity.reauctionDefault.notes) });
                }
            } else if (
                entity.award?.recordedAtIso ||
                entity.finalAwardAmountIqd != null ||
                entity.status === 'sold'
            ) {
                pushDecisionHistory(lines, decisions, plugin, entityId, [plugin.finalAwardSubtype]);
                lines.push({ label: 'المسار', value: 'إحالة قطعية' });
                const buyer = String(
                    entity.award?.buyerName ||
                        entity.lastBidderOrBuyerName ||
                        entity.initialAwardBuyerName ||
                        '',
                ).trim();
                if (buyer) lines.push({ label: 'المشتري', value: buyer });
                const amt =
                    entity.award?.awardAmountIqd ??
                    entity.finalAwardAmountIqd ??
                    entity.initialAwardAmountIqd;
                if (amt != null) lines.push({ label: 'مبلغ الإحالة', value: fmtIqdAr(amt) });
            }
            if (entity.titleTransferCompletedAtIso && plugin.titleTransferSubtype) {
                pushDecisionHistory(lines, decisions, plugin, entityId, [plugin.titleTransferSubtype]);
                lines.push({
                    label: 'نقل الملكية',
                    value: txt(entity.titleTransferCompletedAtIso).slice(0, 10),
                });
            }
            if (entity.buyerDeliveryCompletedAtIso) {
                pushDecisionHistory(lines, decisions, plugin, entityId, [plugin.buyerDeliverySubtype]);
                lines.push({
                    label: 'التسليم للمشتري',
                    value: txt(entity.buyerDeliveryCompletedAtIso).slice(0, 10),
                });
            }
            if (entity.proceedsDisburseCompletedAtIso) {
                lines.push({
                    label: 'صرف الحصيلة',
                    value: txt(entity.proceedsDisburseCompletedAtIso).slice(0, 10),
                });
            }
            break;
        default:
            break;
    }

    return lines;
}

export function filterRelevantPendingDecisions(
    decisions: Array<Record<string, unknown>>,
    plugin: SeizureAssetPlugin,
    entity: SeizureEntityBase,
    entityId: string,
    allowedSubtypes: string[],
): Array<Record<string, unknown>> {
    const allowed = new Set(allowedSubtypes);
    return listPendingSeizureDecisionsForEntity(decisions, plugin, entityId).filter((row) => {
        if (isStaleInitSeizureDecision(plugin, row, entity)) return false;
        const st = String(row?.seizureSubtype || '').trim();
        if (!st) return false;
        return allowed.has(st);
    });
}

export function workflowActiveStepIndex(status: string, entity: SeizureEntityBase): number {
    const norm = normalizeSeizureWorkflowStatus(status);
    if (norm === 'sold') return 7;
    if (norm === 'initial_award') return 7;
    if (norm === 'no_bidders') return 6;
    if (norm === 'published') {
        const needsPub =
            !String(entity.newspaperName || '').trim() ||
            !String(entity.publicationDateYmd || '').trim();
        return needsPub ? 4 : 5;
    }
    if (norm === 'estimation_objected') return 3;
    if (norm === 'valued') return 2;
    if (norm === 'seized') {
        return String(entity.seizureMarkLetterNumber || '').trim() ? 1 : 0;
    }
    return 0;
}

export function executorSubtypesForWorkflowStatus(
    plugin: SeizureAssetPlugin,
    status: string,
    entity: SeizureEntityBase,
): string[] {
    const hasMark = Boolean(String(entity.seizureMarkLetterNumber || '').trim());
    const norm = normalizeSeizureWorkflowStatus(status);

    if (norm === 'sold') return [plugin.finalAwardSubtype];
    if (norm === 'initial_award') {
        return [plugin.finalAwardSubtype, plugin.reauctionDefaultSubtype];
    }
    if (norm === 'no_bidders') return [plugin.auctionSubtype];
    if (norm === 'estimation_objected') return [plugin.expertCommitteeSubtype];
    if (norm === 'valued') return [plugin.auctionSubtype, plugin.expertObjectionSubtype];
    if (norm === 'published') return [];
    if (norm === 'seized') return hasMark ? [plugin.expertSubtype] : [];
    return [];
}

export function executorSubtypesForWorkflowStep(plugin: SeizureAssetPlugin, stepIndex: number): string[] {
    switch (stepIndex) {
        case 1:
            return [plugin.expertSubtype];
        case 2:
            return [plugin.auctionSubtype, plugin.expertObjectionSubtype];
        case 3:
            return [plugin.expertCommitteeSubtype];
        case 6:
            return [plugin.auctionSubtype];
        case 7:
            return [plugin.finalAwardSubtype, plugin.reauctionDefaultSubtype];
        default:
            return [];
    }
}
