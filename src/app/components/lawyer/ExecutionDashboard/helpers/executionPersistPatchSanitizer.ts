/** Defense-in-depth: sanitize persist patches before merge/storage */
import { validateDossierMetaDraft } from './dossierMetaValidation';

function stripUnsafeNoteHtml(raw: string): string {
    return String(raw ?? '')
        .replace(/<script\b[\s\S]*?<\/script>/gi, '')
        .replace(/<iframe\b[\s\S]*?<\/iframe>/gi, '')
        .replace(/\son\w+\s*=\s*("[^"]*"|'[^']*'|[^\s>]+)/gi, '');
}

export type ExecutionPersistPatchSanitizeResult =
    | { ok: true; patch: Record<string, unknown> }
    | { ok: false; reason: string };

const FORBIDDEN_KEYS = new Set(['__proto__', 'constructor', 'prototype']);
const MAX_DEPTH = 8;
const MAX_ARRAY_ITEMS = 200;
const MAX_NOTE_BODY = 8000;
const MAX_NOTE_TITLE = 160;
const MAX_PARTY_NAME = 120;
const MAX_PARTY_PHONE = 32;
const MAX_PARTY_ADDRESS = 400;

function isPlainObject(value: unknown): value is Record<string, unknown> {
    return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

/**
 * تنقية صف طرف عند إعادة الدمج (وفاة/إحلال/…).
 * هاتف غير صالح يُفرَّغ بدل رفض الـ patch كاملاً — وإلا تسقط أعلام الوفاة بصمت
 * على بيانات حقيقية ناقصة الهاتف.
 */
function sanitizePartyRow(row: unknown): Record<string, unknown> | null {
    if (!isPlainObject(row)) return null;
    const name = String(row.name ?? '').trim();
    if (!name || name.length > MAX_PARTY_NAME) return null;

    let phone = String(row.phone ?? '').trim();
    if (phone) {
        if (phone.length > MAX_PARTY_PHONE) phone = phone.slice(0, MAX_PARTY_PHONE);
        const digits = phone.replace(/\D/g, '');
        if (digits.length > 0 && digits.length < 7) phone = '';
    }

    let address = String(row.address ?? '').trim();
    if (address.length > MAX_PARTY_ADDRESS) address = address.slice(0, MAX_PARTY_ADDRESS);

    return {
        ...row,
        name,
        phone,
        address,
    };
}

function sanitizePartyList(value: unknown): unknown[] | null {
    if (!Array.isArray(value)) return null;
    if (value.length > MAX_ARRAY_ITEMS) return null;
    const next: Record<string, unknown>[] = [];
    for (const row of value) {
        const sanitized = sanitizePartyRow(row);
        if (!sanitized) return null;
        next.push(sanitized);
    }
    return next;
}

function sanitizeDossierMetaFields(patch: Record<string, unknown>): ExecutionPersistPatchSanitizeResult {
    const limits: Record<string, number> = {
        directorate: 160,
        fileNumber: 40,
        fileYear: 4,
        docNumber: 200,
        classification: 200,
        judgmentDate: 40,
        property_number: 80,
        district: 200,
        property_type: 200,
        full_address: 200,
    };
    for (const [key, max] of Object.entries(limits)) {
        if (!(key in patch)) continue;
        const value = String(patch[key] ?? '').trim();
        if (value.length > max) {
            return { ok: false, reason: `${key} طويل جداً` };
        }
    }
    if ('fileYear' in patch) {
        const year = String(patch.fileYear ?? '').trim();
        if (year && !/^\d{4}$/.test(year)) {
            return { ok: false, reason: 'سنة الإضبارة غير صالحة' };
        }
    }
    const hasFullMeta =
        'directorate' in patch && 'fileNumber' in patch && 'fileYear' in patch;
    if (hasFullMeta) {
        const validation = validateDossierMetaDraft(
            {
                directorate: String(patch.directorate ?? ''),
                fileNumber: String(patch.fileNumber ?? ''),
                fileYear: String(patch.fileYear ?? ''),
                docNumber: String(patch.docNumber ?? ''),
                classification: String(patch.classification ?? ''),
                judgmentDate: String(patch.judgmentDate ?? ''),
                property_number: String(patch.property_number ?? ''),
                district: String(patch.district ?? ''),
                property_type: String(patch.property_type ?? ''),
                full_address: String(patch.full_address ?? ''),
            },
            {
                isEviction: Boolean(
                    patch.property_number || patch.district || patch.property_type,
                ),
            },
        );
        if (!validation?.ok) {
            return { ok: false, reason: validation?.message ?? 'بيانات الإضبارة غير صالحة' };
        }
    }
    return { ok: true, patch };
}

function sanitizeNoteLogRows(value: unknown): unknown[] | null {
    if (!Array.isArray(value)) return null;
    if (value.length > MAX_ARRAY_ITEMS) return null;
    const next: Record<string, unknown>[] = [];
    for (const row of value) {
        if (!isPlainObject(row)) return null;
        const title = String(row.title ?? '').trim();
        const body = stripUnsafeNoteHtml(String(row.body ?? row.bodyHtml ?? '').trim());
        if (title.length > MAX_NOTE_TITLE || body.length > MAX_NOTE_BODY) return null;
        next.push({
            ...row,
            title,
            body,
        });
    }
    return next;
}

function sanitizeTaskRows(value: unknown): unknown[] | null {
    if (!Array.isArray(value)) return null;
    if (value.length > MAX_ARRAY_ITEMS) return null;
    const next: Record<string, unknown>[] = [];
    for (const row of value) {
        if (!isPlainObject(row)) return null;
        const title = String(row.title ?? '').trim();
        const body = String(row.body ?? '').trim();
        if (title.length > MAX_NOTE_TITLE || body.length > MAX_NOTE_BODY) return null;
        next.push({
            ...row,
            title,
            body,
        });
    }
    return next;
}

const SEIZURE_LEDGER_ARRAY_KEYS = [
    'seizedAssets',
    'seizedMovables',
    'seizedProperties',
    'financialLedger',
    'thirdPartySeizures',
    'thirdPartySeizureAssets',
    'realEstateSeizureAssets',
] as const;

const MONEY_FIELD_KEYS = [
    'paidDebt',
    'paidCourtFees',
    'paidDirectorateFees',
    'paidClientFees',
    'settlementAmount',
    'garnishmentAmount',
] as const;

function sanitizeStringLeaves(value: unknown, depth: number): unknown {
    if (depth > MAX_DEPTH) return null;
    if (typeof value === 'string') {
        return stripUnsafeNoteHtml(value).slice(0, MAX_NOTE_BODY);
    }
    if (Array.isArray(value)) {
        if (value.length > MAX_ARRAY_ITEMS) return null;
        return value.map((item) => sanitizeStringLeaves(item, depth + 1));
    }
    if (!isPlainObject(value)) return value;
    const out: Record<string, unknown> = {};
    for (const [key, child] of Object.entries(value)) {
        if (FORBIDDEN_KEYS.has(key)) continue;
        out[key] = sanitizeStringLeaves(child, depth + 1);
    }
    return out;
}

function sanitizeSeizureAndLedgerCollections(
    patch: Record<string, unknown>,
): ExecutionPersistPatchSanitizeResult {
    let next = patch;
    for (const key of SEIZURE_LEDGER_ARRAY_KEYS) {
        if (!(key in next)) continue;
        if (!Array.isArray(next[key])) {
            return { ok: false, reason: `${key} غير صالح` };
        }
        if (next[key].length > MAX_ARRAY_ITEMS) {
            return { ok: false, reason: `${key} يتجاوز الحد` };
        }
        const rows = sanitizeStringLeaves(next[key], 0);
        if (!Array.isArray(rows)) {
            return { ok: false, reason: `${key} غير صالح بعد التنقية` };
        }
        next = { ...next, [key]: rows };
    }
    return { ok: true, patch: next };
}

function sanitizeMoneyFields(patch: Record<string, unknown>): ExecutionPersistPatchSanitizeResult {
    let next = patch;
    for (const key of MONEY_FIELD_KEYS) {
        if (!(key in next)) continue;
        const n = Number(next[key]);
        if (!Number.isFinite(n) || n < 0) {
            return { ok: false, reason: `${key} مبلغ غير صالح` };
        }
        next = { ...next, [key]: n };
    }
    return { ok: true, patch: next };
}

function sanitizeNotesPatch(patch: Record<string, unknown>): ExecutionPersistPatchSanitizeResult {
    let next = patch;
    if ('noteTitle' in next || 'noteBody' in next || 'noteText' in next) {
        const title = String(next.noteTitle ?? '').trim();
        const body = stripUnsafeNoteHtml(String(next.noteBody ?? next.noteText ?? '').trim());
        if (title.length > MAX_NOTE_TITLE || body.length > MAX_NOTE_BODY) {
            return { ok: false, reason: 'محتوى الملاحظة يتجاوز الحد المسموح' };
        }
        next = {
            ...next,
            ...('noteTitle' in next ? { noteTitle: title } : {}),
            ...('noteBody' in next ? { noteBody: body } : {}),
            ...('noteText' in next ? { noteText: body } : {}),
        };
    }
    if ('caseNotesLog' in next) {
        const rows = sanitizeNoteLogRows(next.caseNotesLog);
        if (!rows) return { ok: false, reason: 'سجل الملاحظات غير صالح أو يتجاوز الحد' };
        next = { ...next, caseNotesLog: rows };
    }
    if ('caseTasksPending' in next) {
        const rows = sanitizeTaskRows(next.caseTasksPending);
        if (!rows) return { ok: false, reason: 'سجل المهام غير صالح أو يتجاوز الحد' };
        next = { ...next, caseTasksPending: rows };
    }
    if ('pauseReason' in next) {
        const reason = String(next.pauseReason ?? '').trim();
        if (reason.length > 500) {
            return { ok: false, reason: 'سبب الإيقاف طويل جداً' };
        }
        next = { ...next, pauseReason: reason };
    }
    return { ok: true, patch: next };
}

function deepStripForbidden(value: unknown, depth: number): unknown {
    if (depth > MAX_DEPTH) return null;
    if (Array.isArray(value)) {
        if (value.length > MAX_ARRAY_ITEMS) return null;
        return value.map((item) => deepStripForbidden(item, depth + 1));
    }
    if (!isPlainObject(value)) return value;

    const out: Record<string, unknown> = {};
    for (const [key, child] of Object.entries(value)) {
        if (FORBIDDEN_KEYS.has(key)) continue;
        out[key] = deepStripForbidden(child, depth + 1);
    }
    return out;
}

export function sanitizeExecutionPersistPatch(
    patch: Record<string, unknown>,
): ExecutionPersistPatchSanitizeResult {
    if (!isPlainObject(patch)) {
        return { ok: false, reason: 'patch غير صالح' };
    }

    const stripped = deepStripForbidden(patch, 0);
    if (!isPlainObject(stripped)) {
        return { ok: false, reason: 'patch غير صالح بعد التنقية' };
    }

    let next = { ...stripped };

    if ('creditors' in next) {
        const creditors = sanitizePartyList(next.creditors);
        if (!creditors) return { ok: false, reason: 'قائمة الدائنين غير صالحة' };
        next = { ...next, creditors };
    }
    if ('debtors' in next) {
        const debtors = sanitizePartyList(next.debtors);
        if (!debtors) return { ok: false, reason: 'قائمة المدينين غير صالحة' };
        next = { ...next, debtors };
    }

    const metaResult = sanitizeDossierMetaFields(next);
    if (!metaResult.ok) return metaResult;
    next = metaResult.patch;

    const notesResult = sanitizeNotesPatch(next);
    if (!notesResult.ok) return notesResult;
    next = notesResult.patch;

    const seizureResult = sanitizeSeizureAndLedgerCollections(next);
    if (!seizureResult.ok) return seizureResult;
    next = seizureResult.patch;

    const moneyResult = sanitizeMoneyFields(next);
    if (!moneyResult.ok) return moneyResult;
    next = moneyResult.patch;

    return { ok: true, patch: next };
}
