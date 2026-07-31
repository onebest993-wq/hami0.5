/**
 * تطبيع سجل ملف التنفيذ — مسار خفيف بدون LawyerDashboardParts/utils (caseStore).
 * يُستخدم من مسار ED البارد حتى لا يُسحب LawyerDashboard-*.js ضمن رسم التحميل.
 */
import type { ExecutionFile } from '@/app/types/execution';
import {
    normalizeExecutionParty,
    normalizeExecutionPartyList,
    resolvePartyStoredName,
} from '@/app/utils/executionPartyNormalize';

type SharedParty = {
    id: number;
    name: string;
    role: string;
    isClient: boolean;
    phone?: string;
    address?: string;
};

function isRecord(value: unknown): value is Record<string, unknown> {
    return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function toSharedParty(raw: unknown, fallbackId: number, fallbackRole: string): SharedParty {
    const normalized = normalizeExecutionParty(raw, fallbackId, fallbackRole) as unknown as Record<
        string,
        unknown
    > & {
        id?: string | number;
        name?: string;
        role?: string;
        isClient?: boolean;
        phone?: string;
        address?: string;
    };
    return {
        ...(normalized as unknown as Record<string, unknown>),
        id:
            typeof normalized.id === 'number' && Number.isFinite(normalized.id)
                ? normalized.id
                : fallbackId,
        name: typeof normalized.name === 'string' ? normalized.name : '',
        role: typeof normalized.role === 'string' ? normalized.role : fallbackRole,
        isClient: typeof normalized.isClient === 'boolean' ? normalized.isClient : false,
        phone: typeof normalized.phone === 'string' ? normalized.phone : '',
        address: typeof normalized.address === 'string' ? normalized.address : '',
    } as unknown as SharedParty;
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
    const status =
        statusRaw === 'active' ||
        statusRaw === 'archived' ||
        statusRaw === 'archived_stage' ||
        statusRaw === 'deleted' ||
        statusRaw === 'paused'
            ? statusRaw
            : 'active';

    const fileNumber = typeof v.fileNumber === 'string' ? v.fileNumber : undefined;
    const fileYear =
        typeof v.fileYear === 'string' || typeof v.fileYear === 'number'
            ? String(v.fileYear)
            : undefined;
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

    const coerceParty = (p: unknown, fallbackId: number, fallbackRole: string): SharedParty =>
        toSharedParty(p, fallbackId, fallbackRole);

    const partiesFromValue = (): SharedParty[] => {
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
            extractPartyName(v.opponentName) ||
            (Array.isArray(v.debtors) ? extractPartyName(v.debtors[0]) : '') ||
            '';

        const creditorIsClient = (() => {
            if (isRecord(v.creditor) && typeof v.creditor.isClient === 'boolean')
                return v.creditor.isClient;
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

        const creditorPhone = isRecord(v.creditor)
            ? typeof v.creditor.phone === 'string'
                ? v.creditor.phone
                : undefined
            : undefined;
        const creditorAddress = isRecord(v.creditor)
            ? typeof v.creditor.address === 'string'
                ? v.creditor.address
                : undefined
            : undefined;
        const creditorId = isRecord(v.creditor)
            ? typeof v.creditor.id === 'number'
                ? v.creditor.id
                : 1
            : 1;
        const debtorPhone = isRecord(v.debtor)
            ? typeof v.debtor.phone === 'string'
                ? v.debtor.phone
                : undefined
            : undefined;
        const debtorAddress = isRecord(v.debtor)
            ? typeof v.debtor.address === 'string'
                ? v.debtor.address
                : undefined
            : undefined;
        const debtorId = isRecord(v.debtor)
            ? typeof v.debtor.id === 'number'
                ? v.debtor.id
                : 2
            : 2;

        const creditorParty: SharedParty = {
            id: creditorId,
            name: creditorName,
            role: 'الدائن',
            isClient: creditorIsClient,
            phone: creditorPhone,
            address: creditorAddress,
        };
        const debtorParty: SharedParty = {
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
    const creditorsNormalized = normalizeExecutionPartyList(v.creditors, 'الدائن').map((p, i) =>
        toSharedParty(p, i + 1, 'الدائن'),
    );
    const debtorsNormalized = normalizeExecutionPartyList(v.debtors, 'المدين').map((p, i) =>
        toSharedParty(p, i + 1, 'المدين'),
    );
    const partiesCreditors = normalizeExecutionPartyList(v.parties, 'الدائن')
        .map((p, i) => toSharedParty(p, i + 1, 'الدائن'))
        .filter((p) => p.role === 'الدائن');
    const partiesDebtors = normalizeExecutionPartyList(v.parties, 'المدين')
        .map((p, i) => toSharedParty(p, i + 1, 'المدين'))
        .filter((p) => p.role === 'المدين');
    const creditorsResolved =
        creditorsNormalized.length > 0
            ? creditorsNormalized
            : creditorsFromParties.length > 0
              ? creditorsFromParties
              : partiesCreditors;
    const debtorsResolved =
        debtorsNormalized.length > 0
            ? debtorsNormalized
            : debtorsFromParties.length > 0
              ? debtorsFromParties
              : partiesDebtors;

    const history = Array.isArray(v.history) ? v.history : [];
    const notes = typeof v.notes === 'string' && v.notes.trim() ? v.notes.trim() : undefined;
    const images = Array.isArray(v.images) ? v.images : [];
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
            cl === 'شرعي' ? 'شرعي / أحوال شخصية' : cl === 'مدني' ? 'مدني' : undefined;
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
            creditorsNormalized.length > 0 || debtorsNormalized.length > 0
                ? [...creditorsResolved, ...debtorsResolved]
                : partiesResult.length > 0
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
    } as unknown as ExecutionFile;
}

export function normalizeExecutionFileRecord(input: unknown): ExecutionFile {
    return coerceExecutionFilePreserveId(input);
}
