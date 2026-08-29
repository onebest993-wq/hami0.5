/**
 * Persist migrate — lawyer request normalizer
 */
import type { LawyerRequest } from './criminalCaseModel';
import { createCriminalId as createId } from './criminalIdUtils';
import { normalizeGuarantorDetails } from './criminalGuarantorModel';
import { isLawyerRequestFinalStatus } from './lawyerRequestStatusMachine';
import { normalizeOrderEnforcementTracking } from './orderEnforcementEngine';
import { asRecord, nestedRecord } from './criminalStorePersistMigrateUtils';

export function normalizePersistLawyerRequests(arr: unknown): LawyerRequest[] {
    if (!Array.isArray(arr)) return [];
    return arr.map((it) => {
        if (!it || typeof it !== 'object') {
            return {
                id: createId(),
                requestDate: new Date().toISOString().slice(0, 10),
                type: '',
                lawyerNote: String(it ?? ''),
                status: 'pending',
            };
        }
        const o = asRecord(it);
        const statusRaw = String(o.status ?? 'pending');
        const status: LawyerRequest['status'] =
            statusRaw === 'approved' || statusRaw === 'rejected' || statusRaw === 'executed'
                ? statusRaw
                : 'pending';
        const rawIds = Array.isArray(o.defendantIds) ? o.defendantIds : [];
        const ids = Array.isArray(rawIds)
            ? rawIds.map((x: unknown) => String(x ?? '').trim()).filter((x: string) => x.length > 0)
            : [];
        const judgeMargin =
            typeof o.judgeMargin === 'string' && o.judgeMargin.trim()
                ? o.judgeMargin.trim()
                : undefined;
        const decisionDate =
            typeof o.decisionDate === 'string' && o.decisionDate.trim()
                ? o.decisionDate.trim()
                : undefined;
        const hasRecordedFinalDecision =
            isLawyerRequestFinalStatus(status) &&
            Boolean(judgeMargin) &&
            Boolean(decisionDate);
        const isLocked =
            o.isLocked === true ||
            o.decisionArchived === true ||
            hasRecordedFinalDecision;
        return {
            id: String(o.id ?? createId()),
            requestDate: String(o.requestDate ?? new Date().toISOString().slice(0, 10)),
            type: String(o.type ?? ''),
            lawyerNote: String(o.lawyerNote ?? ''),
            status,
            judgeMargin,
            decisionDate,
            defendantIds: ids.length ? Array.from(new Set(ids)) : undefined,
            isLocked,
            decisionArchived:
                o.decisionArchived === true || hasRecordedFinalDecision ? true : undefined,
            proceduralTemplate:
                typeof o.proceduralTemplate === 'string' ? o.proceduralTemplate : undefined,
            isAppealable: o.isAppealable === true ? true : undefined,
            detentionStartDate:
                typeof o.detentionStartDate === 'string' && o.detentionStartDate.trim()
                    ? o.detentionStartDate.trim()
                    : undefined,
            detentionEndDate:
                typeof o.detentionEndDate === 'string' && o.detentionEndDate.trim()
                    ? o.detentionEndDate.trim()
                    : undefined,
            legalArticleBasis:
                typeof o.legalArticleBasis === 'string' && o.legalArticleBasis.trim()
                    ? o.legalArticleBasis.trim()
                    : undefined,
            orderEnforcement: normalizeOrderEnforcementTracking(o.orderEnforcement),
            margins: (() => {
                if (!Array.isArray(o.margins)) return undefined;
                const rows = o.margins
                    .map((m: unknown) => {
                        if (!m || typeof m !== 'object') return null;
                        const row = asRecord(m);
                        const text = String(row.text ?? '').trim();
                        if (!text) return null;
                        return {
                            id: String(row.id ?? createId()),
                            date: String(row.date ?? new Date().toISOString().slice(0, 10)),
                            text,
                        };
                    })
                    .filter(Boolean) as { id: string; date: string; text: string }[];
                return rows.length ? rows : undefined;
            })(),
            attachments: (() => {
                if (!Array.isArray(o.attachments)) return undefined;
                const rows = o.attachments
                    .map((a: unknown) => {
                        if (!a || typeof a !== 'object') return null;
                        const row = asRecord(a);
                        const name = String(row.name ?? '').trim();
                        if (!name) return null;
                        return { id: String(row.id ?? createId()), name };
                    })
                    .filter(Boolean) as { id: string; name: string }[];
                return rows.length ? rows : undefined;
            })(),
            isStarred: o.isStarred === true ? true : undefined,
        };
    });
};

