import type { FileData, Party } from '../LawyerShared';
import type { LegalCase } from '@/app/stores/caseStore';
import type { ArchiveType } from '@/app/types/common';
import type { ExecutionFile } from './types';
import {
    normalizeExecutionParty,
    normalizeExecutionPartyList,
    resolvePartyStoredName,
} from '@/app/utils/executionPartyNormalize';

export function mapFileStatusToCaseStatus(status: FileData['status']): LegalCase['status'] {
    if (status === 'deleted') return 'deleted';
    if (status === 'archived' || status === 'archived_stage') return 'archived';
    return 'active';
}

function hasValidFileId(id: unknown): boolean {
    return (
        (typeof id === 'number' && Number.isFinite(id)) ||
        (typeof id === 'string' && id.trim().length > 0)
    );
}

export function isFileData(value: unknown): value is FileData {
    if (!value || typeof value !== 'object') return false;
    const v = value as Record<string, unknown>;
    return (
        hasValidFileId(v.id) &&
        (v.type === 'lawsuit' || v.type === 'transaction' || v.type === 'execution') &&
        typeof v.caseNo === 'string' &&
        typeof v.court === 'string' &&
        Array.isArray(v.parties) &&
        typeof v.status === 'string'
    );
}

export function isRecord(value: unknown): value is Record<string, unknown> {
    return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

export function coerceExecutionFilePreserveId(input: unknown): ExecutionFile {
    const v = isRecord(input) ? input : {};
    const idRaw = v.id;
    const id: string | number =
        typeof idRaw === 'number'
            ? idRaw
            : typeof idRaw === 'string' && idRaw.trim()
              ? idRaw.trim()
              : Date.now();

    const statusRaw = v.status;
    const status: FileData['status'] =
        statusRaw === 'active' ||
        statusRaw === 'archived' ||
        statusRaw === 'archived_stage' ||
        statusRaw === 'deleted' ||
        statusRaw === 'paused'
            ? statusRaw
            : 'active';

    const fileNumber = typeof v.fileNumber === 'string' ? v.fileNumber : undefined;
    const fileYear =
        typeof v.fileYear === 'string' || typeof v.fileYear === 'number' ? String(v.fileYear) : undefined;
    const caseNo =
        typeof v.caseNo === 'string'
            ? v.caseNo
            : fileNumber && fileYear
              ? `${fileNumber}/${fileYear}`
              : fileNumber
                ? fileNumber
                : typeof v.case_no === 'string'
                  ? v.case_no
                  : 'تنفيذ';

    const court =
        typeof v.court === 'string'
            ? v.court
            : typeof v.directorate === 'string'
              ? v.directorate
              : 'محكمة التنفيذ';

    const extractPartyName = (p: unknown): string => resolvePartyStoredName(p);

    const coerceParty = (p: unknown, fallbackId: number, fallbackRole: string): Party =>
        normalizeExecutionParty(p, fallbackId, fallbackRole);

    const partiesFromValue = (): Party[] => {
        if (Array.isArray(v.parties) && v.parties.length > 0) {
            return v.parties
                .map((p, i) => coerceParty(p, i + 1, i === 0 ? 'الدائن' : 'المدين'))
                .filter((p) => p.name.trim().length > 0);
        }
        const creditorName =
            extractPartyName(v.creditor) ||
            extractPartyName(v.clientName) ||
            (Array.isArray(v.creditors) ? extractPartyName(v.creditors[0]) : '') ||
            '';
        const debtorName =
            extractPartyName(v.debtor) ||
            extractPartyName(v.opponentName) || (Array.isArray(v.debtors) ? extractPartyName(v.debtors[0]) : '') || '';

        const creditorIsClient = (() => {
            if (isRecord(v.creditor) && typeof v.creditor.isClient === 'boolean') return v.creditor.isClient;
            if (Array.isArray(v.creditors) && isRecord(v.creditors[0])) {
                const ic = v.creditors[0].isClient;
                if (typeof ic === 'boolean') return ic;
            }
            return false;
        })();
        const debtorIsClient = (() => {
            if (isRecord(v.debtor) && typeof v.debtor.isClient === 'boolean') return v.debtor.isClient;
            if (Array.isArray(v.debtors) && isRecord(v.debtors[0])) {
                const ic = v.debtors[0].isClient;
                if (typeof ic === 'boolean') return ic;
            }
            return false;
        })();

        const creditorPhone = isRecord(v.creditor) ? (typeof v.creditor.phone === 'string' ? v.creditor.phone : undefined) : undefined;
        const creditorAddress = isRecord(v.creditor) ? (typeof v.creditor.address === 'string' ? v.creditor.address : undefined) : undefined;
        const creditorId = isRecord(v.creditor) ? (typeof v.creditor.id === 'number' ? v.creditor.id : 1) : 1;
        const debtorPhone = isRecord(v.debtor) ? (typeof v.debtor.phone === 'string' ? v.debtor.phone : undefined) : undefined;
        const debtorAddress = isRecord(v.debtor) ? (typeof v.debtor.address === 'string' ? v.debtor.address : undefined) : undefined;
        const debtorId = isRecord(v.debtor) ? (typeof v.debtor.id === 'number' ? v.debtor.id : 2) : 2;

        const creditorParty: Party = {
            id: creditorId,
            name: creditorName,
            role: 'الدائن',
            isClient: creditorIsClient,
            phone: creditorPhone,
            address: creditorAddress,
        };
        const debtorParty: Party = {
            id: debtorId,
            name: debtorName,
            role: 'المدين',
            isClient: debtorIsClient,
            phone: debtorPhone,
            address: debtorAddress,
        };
        return [creditorParty, debtorParty].filter((p) => p.name.trim().length > 0);
    };

    const partiesResult = partiesFromValue();
    const creditorsFromParties = partiesResult.filter((p) => p.role === 'الدائن');
    const debtorsFromParties = partiesResult.filter((p) => p.role === 'المدين');
    const creditorsNormalized = normalizeExecutionPartyList(v.creditors, 'الدائن');
    const debtorsNormalized = normalizeExecutionPartyList(v.debtors, 'المدين');
    const partiesCreditors = normalizeExecutionPartyList(v.parties, 'الدائن').filter(
        (p) => p.role === 'الدائن',
    );
    const partiesDebtors = normalizeExecutionPartyList(v.parties, 'المدين').filter(
        (p) => p.role === 'المدين',
    );
    const creditorsResolved =
        creditorsFromParties.length > 0
            ? creditorsFromParties
            : creditorsNormalized.length > 0
              ? creditorsNormalized
              : partiesCreditors;
    /** يفضّل مصفوفة debtors الصريحة — تحمل isEmployee/occupation؛ المشتق من creditor/debtor يفقدها */
    const debtorsResolved =
        debtorsNormalized.length > 0
            ? debtorsNormalized
            : debtorsFromParties.length > 0
              ? debtorsFromParties
              : partiesDebtors;

    const history = Array.isArray(v.history) ? (v.history as FileData['history']) : [];
    const notes = Array.isArray(v.notes) ? (v.notes as FileData['notes']) : [];
    const images = Array.isArray(v.images) ? (v.images as FileData['images']) : [];
    const date = typeof v.date === 'string' ? v.date : new Date().toISOString();

    const DOC_TYPES_AS_EXEC_TYPE = new Set([
        'قرارات وأحكام المحاكم',
        'الأوراق التجارية',
        'الحجج الشرعية',
        'تنفيذ الأحكام الأجنبية',
        'السندات المتضمنة إقراراً بدين',
    ]);
    let executionType =
        typeof v.executionType === 'string' ? String(v.executionType).trim() : undefined;
    if (executionType && DOC_TYPES_AS_EXEC_TYPE.has(executionType)) {
        const cl = typeof v.classification === 'string' ? v.classification : '';
        executionType =
            cl === 'شرعي'
                ? 'شرعي / أحوال شخصية'
                : cl === 'مدني'
                  ? 'مدني'
                  : undefined;
    }

    return {
        ...v,
        id,
        type: 'execution',
        status,
        caseNo,
        court,
        executionType,
        parties:
            partiesResult.length > 0
                ? partiesResult
                : [...creditorsResolved, ...debtorsResolved],
        creditors: creditorsResolved,
        debtors: debtorsResolved,
        history,
        notes,
        images,
        date,
        fileNumber,
        fileYear,
    } as ExecutionFile;
}

/** تطبيع إضبارة تنفيذ قبل العرض أو الحفظ في activeFile */
export function normalizeExecutionFileRecord(input: unknown): ExecutionFile {
    return coerceExecutionFilePreserveId(input);
}

/** فتح ملف نشط — يضمن تطبيع أطراف التنفيذ */
export function coerceActiveFileTarget(target: unknown): FileData | ExecutionFile {
    if (isRecord(target) && target.type === 'execution') {
        return normalizeExecutionFileRecord(target);
    }
    return target as FileData | ExecutionFile;
}

export function coerceExecutionFile(input: Record<string, unknown>, id: number): ExecutionFile {
    const idRaw = input.id;
    const resolvedId: string | number =
        typeof idRaw === 'number'
            ? idRaw
            : typeof idRaw === 'string' && idRaw.trim()
              ? idRaw.trim()
              : id;
    return normalizeExecutionFileRecord({
        ...input,
        id: resolvedId,
        type: 'execution',
    });
}

export function coerceLawsuitStage(value: unknown): 'بداءة' | 'استئناف' | 'تمييز' {
    const raw = typeof value === 'string' ? value : '';
    if (raw.includes('تمييز')) return 'تمييز';
    if (raw.includes('استئناف')) return 'استئناف';
    return 'بداءة';
}

export function hexToRgba(hex: string, alpha: number): string {
    const h = (hex || '').trim();
    const a = Math.min(1, Math.max(0, alpha));
    const m = /^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/.exec(h);
    if (!m) return `rgba(0,0,0,${a})`;
    const raw = m[1];
    const full = raw.length === 3 ? raw.split('').map((c) => c + c).join('') : raw;
    const r = parseInt(full.slice(0, 2), 16);
    const g = parseInt(full.slice(2, 4), 16);
    const b = parseInt(full.slice(4, 6), 16);
    return `rgba(${r},${g},${b},${a})`;
}

export function getNavUnderlayStyle(bgColor: string): { background: string } {
    return {
        background: `linear-gradient(to top, ${bgColor} 0%, ${hexToRgba(bgColor, 0.94)} 60%, rgba(0,0,0,0) 100%)`,
    } as const;
}

export function lawyerOverlayToArchivePortalType(t: Exclude<string, 'client_requests' | null>): ArchiveType {
    switch (t) {
        case 'execution':
            return 'executions';
        case 'criminal_cases':
        case 'criminal':
            return 'criminal';
        case 'lawsuit':
            return 'lawsuits';
        case 'transaction':
            return 'transaction';
        case 'deleted':
            return 'deleted';
        case 'all':
            return 'all';
        default: {
            const _exhaustive: never = t as never;
            void _exhaustive;
            return 'all';
        }
    }
}
