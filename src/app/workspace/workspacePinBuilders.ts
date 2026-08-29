import type { WorkspacePinnedItem } from './types';
import { extractCaseRefsFromText } from './extractCaseRefs';
import {
    buildLinkedCaseLookup,
    resolveLinkedCaseMetaFromIndex,
    type LinkedCaseLookupIndex,
} from './resolveLinkedCaseMeta';
import { sanitizePinCaseNumber } from './pinDisplayUtils';
import { recordFromParts, safeEntityId, safeStr } from './workspacePinRecord';

export { buildLawsuitWorkspacePin } from './lawsuitWorkspacePin';
export { buildExecutionWorkspacePin } from './executionWorkspacePin';

export type HubSectionId = 'lawsuit' | 'execution' | 'transaction';

const HUB_SECTION_LABELS: Record<HubSectionId, string> = {
    lawsuit: 'دعاوى',
    execution: 'تنفيذ',
    transaction: 'معاملات',
};

/** تثبيت اختصار قسم من بطاقات الواجهة الرئيسية */
export function buildHubSectionPin(section: HubSectionId): WorkspacePinnedItem {
    const label = HUB_SECTION_LABELS[section];
    return recordFromParts('hub', section, label, '', '');
}

/** معاملات نظام Threading (TransactionsThreadingDB) — منفصلة عن ملفات type:transaction */
export function buildThreadingWorkspacePin(raw: unknown): WorkspacePinnedItem | null {
    if (!raw || typeof raw !== 'object') return null;
    const t = raw as Record<string, unknown>;
    const id = safeEntityId(t.id);
    if (!id) return null;
    const clientName = safeStr(t.clientName);
    const title = safeStr(t.title) || 'معاملة إدارية';
    const dept = safeStr(t.targetDepartment);
    const caseNumber = sanitizePinCaseNumber('', title, dept);
    const label = clientName ? `${title} — ${clientName}` : title;
    return recordFromParts('threading', id, `معاملة إدارية — ${label}`, clientName, caseNumber);
}

export function buildTransactionWorkspacePin(file: unknown): WorkspacePinnedItem | null {
    if (!file || typeof file !== 'object') return null;
    const f = file as Record<string, unknown>;
    if (f.type !== 'transaction') return null;
    const id = safeEntityId(f.id);
    if (!id) return null;
    const caseNumber = sanitizePinCaseNumber(safeStr(f.caseNo) || safeStr(f.fileNumber), safeStr(f.title));
    const parties = Array.isArray(f.parties) ? f.parties : [];
    const clientParty = parties.find((p) => p && typeof p === 'object' && (p as Record<string, unknown>).isClient);
    const clientName = clientParty && typeof clientParty === 'object'
        ? safeStr((clientParty as Record<string, unknown>).name)
        : '';
    const title = caseNumber ? `معاملة — ${caseNumber}` : 'معاملة';
    return recordFromParts('transaction', id, title, clientName, caseNumber);
}

export function buildCriminalWorkspacePin(raw: unknown): WorkspacePinnedItem | null {
    if (!raw || typeof raw !== 'object') return null;
    const c = raw as Record<string, unknown>;
    const id = safeEntityId(c.id);
    if (!id) return null;
    const location = c.location && typeof c.location === 'object' ? (c.location as Record<string, unknown>) : {};
    const basics = c.basics && typeof c.basics === 'object' ? (c.basics as Record<string, unknown>) : {};
    const stage = safeStr(basics.stage);
    const caseNumber = sanitizePinCaseNumber(
        safeStr(c.courtCaseNumber) ||
            safeStr(location.caseNumber) ||
            safeStr(location.investigationDossierNumber),
        stage,
    );
    const defendants = Array.isArray(c.defendants) ? c.defendants : [];
    const complainants = Array.isArray(c.complainants) ? c.complainants : [];
    const rep = safeStr(c.ourRepresentation) || safeStr(basics.ourRepresentation);
    const pool =
        rep === 'defendant_side' || rep === 'defendant'
            ? defendants
            : rep === 'complainant_side' || rep === 'complainant' || rep === 'civil_claimant'
              ? complainants
              : [...complainants, ...defendants];
    let clientName = '';
    for (const p of pool) {
        if (!p || typeof p !== 'object') continue;
        const row = p as Record<string, unknown>;
        if (row.isClient === false) continue;
        const n = safeStr(row.fullName) || safeStr(row.name);
        if (n) {
            clientName = n;
            break;
        }
    }
    if (!clientName) {
        const d0 = defendants[0] && typeof defendants[0] === 'object' ? (defendants[0] as Record<string, unknown>) : null;
        const comp0 =
            complainants[0] && typeof complainants[0] === 'object'
                ? (complainants[0] as Record<string, unknown>)
                : null;
        clientName =
            safeStr(d0?.fullName) || safeStr(d0?.name) || safeStr(comp0?.fullName) || safeStr(comp0?.name);
    }
    const title = stage ? `جزائي — ${stage}` : 'إضبارة جزائية';
    return recordFromParts('criminal', id, title, clientName, caseNumber);
}

export function buildUrgentWorkspacePin(raw: unknown): WorkspacePinnedItem | null {
    if (!raw || typeof raw !== 'object') return null;
    const c = raw as Record<string, unknown>;
    const id = safeEntityId(c.id);
    if (!id) return null;
    const caseNumber = sanitizePinCaseNumber(
        safeStr(c.requestNumber) || safeStr(c.caseNumber),
        safeStr(c.actionType),
    );
    const clientName = safeStr(c.applicantName);
    const actionType = safeStr(c.actionType) || safeStr(c.specificActionType) || 'طلب مستعجل';
    const title = caseNumber ? `${actionType} — ${caseNumber}` : actionType;
    return recordFromParts('urgent', id, title, clientName, caseNumber);
}

export function buildNoteWorkspacePin(note: unknown): WorkspacePinnedItem | null {
    if (!note || typeof note !== 'object') return null;
    const n = note as Record<string, unknown>;
    const id = safeEntityId(n.id);
    if (!id) return null;
    const title = safeStr(n.title) || 'ملاحظة';
    const body = safeStr(n.body) || '';
    const caseNumber = extractCaseRefsFromText(title, body)[0] || '';
    return recordFromParts('notepad', id, `ملاحظة — ${title}`, '', caseNumber);
}

export function buildTaskWorkspacePin(
    task: unknown,
    lawsuitFiles: unknown[] = [],
    executionFiles: unknown[] = [],
    lookupIndex?: LinkedCaseLookupIndex,
): WorkspacePinnedItem | null {
    if (!task || typeof task !== 'object') return null;
    const t = task as Record<string, unknown>;
    const id = safeEntityId(t.id);
    if (!id) return null;
    const title = safeStr(t.title) || safeStr(t.rawText) || 'مهمة';
    const idx = lookupIndex ?? buildLinkedCaseLookup(lawsuitFiles, executionFiles);
    const linked = resolveLinkedCaseMetaFromIndex(safeEntityId(t.linkedCaseId), idx);
    const caseNumber = sanitizePinCaseNumber(
        linked.caseNumber || '',
        title,
        safeStr(t.rawText),
    );
    return recordFromParts('task', id, `مهمة — ${title}`, linked.clientName, caseNumber);
}
