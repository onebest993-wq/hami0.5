import type { FileData, Party } from '../LawyerShared';
import type { LegalCase } from '@/app/stores/caseStore';
import type { ArchiveType } from '@/app/types/common';
import type { ExecutionFile } from './types';

export function mapFileStatusToCaseStatus(status: FileData['status']): LegalCase['status'] {
    if (status === 'deleted') return 'deleted';
    if (status === 'archived' || status === 'archived_stage') return 'archived';
    return 'active';
}

export function isFileData(value: unknown): value is FileData {
    if (!value || typeof value !== 'object') return false;
    const v = value as Record<string, unknown>;
    return (
        typeof v.id === 'number' &&
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

    const extractPartyName = (p: unknown): string => {
        if (!p) return '';
        if (typeof p === 'string') return p.trim();
        if (!isRecord(p)) return '';
        const n = p.name;
        return typeof n === 'string' ? n.trim() : '';
    };

    const coerceParty = (p: unknown, fallbackId: number, fallbackRole: string): Party => {
        if (isRecord(p)) {
            const name = typeof p.name === 'string' ? p.name : '';
            const role = typeof p.role === 'string' ? p.role : fallbackRole;
            const isClient = typeof p.isClient === 'boolean' ? p.isClient : false;
            const phone = typeof p.phone === 'string' ? p.phone : undefined;
            const address = typeof p.address === 'string' ? p.address : undefined;
            const pid = typeof p.id === 'number' ? p.id : fallbackId;
            return { id: pid, name, role, isClient, phone, address };
        }
        return { id: fallbackId, name: '', role: fallbackRole, isClient: false };
    };

    const partiesFromValue = (): Party[] => {
        if (Array.isArray(v.parties) && v.parties.length > 0) {
            return v.parties.map((p, i) => coerceParty(p, i + 1, i === 0 ? 'الدائن' : 'المدين'));
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

    const history = Array.isArray(v.history) ? (v.history as FileData['history']) : [];
    const notes = Array.isArray(v.notes) ? (v.notes as FileData['notes']) : [];
    const images = Array.isArray(v.images) ? (v.images as FileData['images']) : [];
    const date = typeof v.date === 'string' ? v.date : new Date().toISOString();

    return {
        ...v,
        id,
        type: 'execution',
        status,
        caseNo,
        court,
        parties: partiesResult,
        creditors: creditorsFromParties.length > 0 ? creditorsFromParties : [],
        debtors: debtorsFromParties.length > 0 ? debtorsFromParties : [],
        history,
        notes,
        images,
        date,
        fileNumber,
        fileYear,
    } as ExecutionFile;
}

export function coerceExecutionFile(input: Record<string, unknown>, id: number): ExecutionFile {
    const caseNo =
        typeof input.caseNo === 'string'
            ? input.caseNo
            : typeof input.fileNumber === 'string'
              ? input.fileNumber
              : 'تنفيذ جديد';
    const court = typeof input.court === 'string' ? input.court : 'محكمة التنفيذ';
    const status =
        input.status === 'active' || input.status === 'archived' || input.status === 'archived_stage' || input.status === 'deleted' || input.status === 'paused'
            ? input.status
            : 'active';
    const parties = Array.isArray(input.parties) ? (input.parties as Party[]) : [];
    const history = Array.isArray(input.history) ? (input.history as FileData['history']) : [];
    const notes = Array.isArray(input.notes) ? (input.notes as FileData['notes']) : [];
    const images = Array.isArray(input.images) ? (input.images as FileData['images']) : [];
    const date = typeof input.date === 'string' ? input.date : new Date().toISOString();

    return {
        ...input,
        id,
        type: 'execution',
        status,
        caseNo,
        court,
        parties,
        history,
        notes,
        images,
        date,
    } as ExecutionFile;
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
