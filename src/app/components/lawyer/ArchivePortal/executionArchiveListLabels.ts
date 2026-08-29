import { isEvictionClaim } from '@/app/utils/isEvictionClaim';
import { resolvePartyStoredName } from '@/app/utils/executionPartyNormalize';
import type { LooseArchiveFile } from './types';

type ArchiveLabelFile = {
    creditors?: unknown;
    debtors?: unknown;
    parties?: unknown;
    creditor?: unknown;
    clientName?: unknown;
    debtor?: unknown;
    opponentName?: unknown;
    caseNo?: unknown;
    fileNumber?: unknown;
    fileYear?: unknown;
    year?: unknown;
    party_multiplicity?: { additionalDebtors?: Array<{ isClient?: boolean }> };
};

function splitCaseNoParts(caseNo: string | undefined): { number: string; year: string } {
    const raw = String(caseNo || '').trim();
    if (!raw) return { number: '', year: '' };
    const slash = raw.split('/').map((p) => p.trim()).filter(Boolean);
    if (slash.length >= 2) {
        return { number: slash[0], year: slash[slash.length - 1] };
    }
    return { number: raw, year: '' };
}

function asPartyList(value: unknown): Array<{ role?: string; isClient?: boolean }> {
    return Array.isArray(value) ? (value as Array<{ role?: string; isClient?: boolean }>) : [];
}

function joinPartyNames(
    parties: Array<{ role?: string; isClient?: boolean }>,
    role: 'creditor' | 'debtor',
): string {
    const isCreditor = role === 'creditor';
    const filtered = parties.filter((p) => {
        const r = String(p.role || '').trim();
        if (isCreditor) return r === 'الدائن' || r.includes('دائن');
        return r === 'المدين' || r.includes('مدين');
    });
    const names = filtered.map((p) => resolvePartyStoredName(p)).filter(Boolean);
    if (names.length > 0) return names.join(' · ');
    return 'غير محدد';
}

export function formatExecutionArchiveCreditorLabel(file: ArchiveLabelFile): string {
    const creditors = asPartyList(file.creditors);
    const clientNames = creditors
        .filter((p) => p.isClient === true)
        .map((p) => resolvePartyStoredName(p))
        .filter(Boolean);
    if (clientNames.length > 0) return clientNames.join(' · ');
    const all = creditors.map((p) => resolvePartyStoredName(p)).filter(Boolean);
    if (all.length > 0) return all.join(' · ');
    const fromParties = joinPartyNames(asPartyList(file.parties), 'creditor');
    return fromParties !== 'غير محدد'
        ? fromParties
        : resolvePartyStoredName(file.creditor) ||
              resolvePartyStoredName(file.clientName) ||
              'غير محدد';
}

export function formatExecutionArchiveDebtorLabel(file: ArchiveLabelFile): string {
    const debtors = asPartyList(file.debtors);
    const names = debtors.map((p) => resolvePartyStoredName(p)).filter(Boolean);
    if (names.length > 0) return names.join(' · ');
    const fromParties = joinPartyNames(asPartyList(file.parties), 'debtor');
    return fromParties !== 'غير محدد'
        ? fromParties
        : resolvePartyStoredName(file.debtor) ||
              resolvePartyStoredName(file.opponentName) ||
              'غير محدد';
}

/** اسم موكل المحامي عند تمثيل المدين */
export function formatExecutionArchiveClientDebtorLabel(file: ArchiveLabelFile): string {
    const debtors = asPartyList(file.debtors);
    const clientNames = debtors
        .filter((p) => p.isClient === true)
        .map((p) => resolvePartyStoredName(p))
        .filter(Boolean);
    if (clientNames.length > 0) return clientNames.join(' · ');
    const additional = file.party_multiplicity?.additionalDebtors;
    if (Array.isArray(additional)) {
        const extra = additional
            .filter((p) => p.isClient === true)
            .map((p) => resolvePartyStoredName(p))
            .filter(Boolean);
        if (extra.length > 0) return extra.join(' · ');
    }
    return formatExecutionArchiveDebtorLabel(file);
}

export function resolveExecutionArchiveFileNumberYear(file: ArchiveLabelFile): {
    fileNumber: string;
    year: string;
} {
    const split = splitCaseNoParts(typeof file.caseNo === 'string' ? file.caseNo : undefined);
    const fileNumber =
        String(file.fileNumber || '').trim() || split.number || String(file.caseNo || '').trim() || 'غير محدد';
    const year =
        String(file.fileYear || file.year || '').trim() || split.year || String(new Date().getFullYear());
    return { fileNumber, year };
}

export function inferArchiveEvictionPremisesUse(input: {
    explicit?: 'commercial' | 'residential' | null;
    propertyTypeText?: string | null;
}): 'commercial' | 'residential' {
    if (input.explicit === 'commercial' || input.explicit === 'residential') return input.explicit;
    const t = (input.propertyTypeText || '').toLowerCase();
    if (/تجاري|محل|معرض|مكتب\s*تجاري|دكان|بازار/.test(t)) return 'commercial';
    return 'residential';
}

export function formatArchiveClaimTypeArabic(
    claimType: string | undefined | null,
    premisesUse: 'commercial' | 'residential',
): string {
    const c = (claimType || '').trim();
    if (!c) return '—';
    const lower = c.toLowerCase();
    if (lower === 'eviction' || isEvictionClaim(c)) {
        return premisesUse === 'commercial' ? 'تخلية — محل تجاري' : 'تخلية — عقار سكني';
    }
    if (c === 'نفقة') return 'نفقة مستمرة';
    if (c === 'تسليم ولد' || c.includes('تسليم ولد')) return 'نزع حضانة';
    return c;
}

export function formatExecutionArchiveClassificationDisplay(file: LooseArchiveFile): string {
    const classification = String(file.classification || '').trim();
    const category = String((file as { category?: string }).category || '').trim();
    if (classification === 'شرعي' || classification === 'أحوال شخصية') return 'شرعي / أحوال شخصية';
    if (classification === 'مدني') return 'مدني';
    if (classification && classification !== 'none') return classification;
    if (category === 'sharia' || category === 'personal') return 'شرعي / أحوال شخصية';
    if (category === 'civil') return 'مدني';
    return '';
}

export function resolveArchiveCourtHaystack(file: LooseArchiveFile): string {
    const courtRaw = file.court;
    if (typeof courtRaw === 'string') return courtRaw;
    if (courtRaw && typeof courtRaw === 'object' && 'name' in courtRaw) {
        return String((courtRaw as { name?: string }).name ?? '');
    }
    return '';
}

export function executionArchiveSearchHaystack(file: LooseArchiveFile): string {
    return [
        file.fileNumber || file.caseNo,
        formatExecutionArchiveCreditorLabel(file),
        formatExecutionArchiveDebtorLabel(file),
        file.claimType || file.docType,
        resolveArchiveCourtHaystack(file),
        file.status,
        file.relationship,
        resolvePartyStoredName(file.linkedDebtor) || file.linkedDebtor,
        file.amount ?? file.totalAmount ?? 0,
    ]
        .filter((part) => part != null && String(part).trim() !== '')
        .join(' ');
}
