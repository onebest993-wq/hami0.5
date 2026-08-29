import type { FileData } from '@/app/components/lawyer/LawyerShared';
import { isPersonalStatusFile } from '@/app/components/lawyer/personal-status/personalStatusValidation';
import { loadExecutionFilesRaw } from '@/app/utils/executionFilesStorage';
import { loadLawsuitFilesRaw } from '@/app/utils/lawsuitFilesStorage';
import type { DossierShareSource } from './caseShareTypes';

export class ShareSourceOwnershipError extends Error {
    constructor(message = 'DOSSIER_NOT_OWNED') {
        super(message);
        this.name = 'ShareSourceOwnershipError';
    }
}

const CRIMINAL_OWNERSHIP_TABLE = 'criminal_case_ownership';

async function verifyLawsuitRowOnServer(
    ownerId: string,
    dossierId: string,
): Promise<boolean> {
    try {
        const { getSupabaseAdminClient } = await import('@/app/api/security/supabaseAdminClient');
        const admin = getSupabaseAdminClient();
        if (!admin) return false;

        const { data, error } = await admin
            .from('lawsuit_files')
            .select('external_id')
            .eq('user_id', ownerId)
            .eq('external_id', dossierId)
            .maybeSingle();

        return !error && Boolean(data);
    } catch {
        return false;
    }
}

async function verifyExecutionRowOnServer(ownerId: string, dossierId: string): Promise<boolean> {
    try {
        const { getSupabaseAdminClient } = await import('@/app/api/security/supabaseAdminClient');
        const admin = getSupabaseAdminClient();
        if (!admin) return false;

        const { data, error } = await admin
            .from('execution_files')
            .select('external_id')
            .eq('user_id', ownerId)
            .eq('external_id', dossierId)
            .maybeSingle();

        return !error && Boolean(data);
    } catch {
        return false;
    }
}

/**
 * يتحقق من صف إثبات ملكية جزائية على الخادم (جدول criminal_case_ownership).
 * مُصدَّر للاختبارات ولمسار API.
 */
export async function verifyCriminalRowOnServer(
    ownerId: string,
    dossierId: string,
): Promise<boolean> {
    try {
        const { getSupabaseAdminClient } = await import('@/app/api/security/supabaseAdminClient');
        const admin = getSupabaseAdminClient();
        if (!admin) return false;

        const { data, error } = await admin
            .from(CRIMINAL_OWNERSHIP_TABLE)
            .select('external_id')
            .eq('user_id', ownerId)
            .eq('external_id', dossierId)
            .maybeSingle();

        return !error && Boolean(data);
    } catch {
        return false;
    }
}

function findLawsuitFile(dossierId: string): FileData | null {
    const files = loadLawsuitFilesRaw() as FileData[];
    return files.find((f) => String(f.id) === dossierId) ?? null;
}

function verifyLawsuitModuleOnClient(dossierId: string, module: 'lawsuit' | 'personal'): boolean {
    const hit = findLawsuitFile(dossierId);
    if (!hit) return false;
    const isPersonal = isPersonalStatusFile(hit);
    return module === 'personal' ? isPersonal : !isPersonal;
}

async function verifyCriminalOnClient(dossierId: string): Promise<boolean> {
    const { useCriminalStore } = await import('@/app/components/lawyer/criminal-system/criminalStore');
    const state = useCriminalStore.getState();
    return Boolean(state.casesById[dossierId]);
}

function verifyOnClient(source: DossierShareSource): boolean | Promise<boolean> {
    const dossierId = String(source.dossierId ?? '').trim();
    if (!dossierId) return false;

    switch (source.module) {
        case 'lawsuit':
            return verifyLawsuitModuleOnClient(dossierId, 'lawsuit');
        case 'personal':
            return verifyLawsuitModuleOnClient(dossierId, 'personal');
        case 'execution': {
            const files = loadExecutionFilesRaw() as { id?: string | number }[];
            return files.some((f) => String(f.id) === dossierId);
        }
        case 'criminal':
            return verifyCriminalOnClient(dossierId);
        default:
            return false;
    }
}

async function verifyOnServer(ownerId: string, source: DossierShareSource): Promise<boolean> {
    const dossierId = String(source.dossierId ?? '').trim();
    if (!dossierId) return false;

    switch (source.module) {
        case 'lawsuit':
        case 'personal':
            return verifyLawsuitRowOnServer(ownerId, dossierId);
        case 'execution':
            return verifyExecutionRowOnServer(ownerId, dossierId);
        case 'criminal':
            return verifyCriminalRowOnServer(ownerId, dossierId);
        default:
            return false;
    }
}

/**
 * يتحقق أن المالك يملك الإضبارة فعلاً قبل بناء maskedView.
 * على الخادم: lawsuit/personal/execution عبر جداول الملفات؛ الجزائي عبر criminal_case_ownership.
 */
export async function assertShareSourceOwnedByUser(
    ownerId: string,
    source: DossierShareSource,
): Promise<void> {
    const uid = String(ownerId ?? '').trim();
    if (!uid || !source?.dossierId?.trim()) {
        throw new ShareSourceOwnershipError();
    }

    const ok =
        typeof window === 'undefined'
            ? await verifyOnServer(uid, source)
            : await Promise.resolve(verifyOnClient(source));

    if (!ok) {
        throw new ShareSourceOwnershipError();
    }
}

/** للمسار API: كل الوحدات بما فيها الجزائي بعد إثبات ملكية خادمي */
export function isServerShareCreateAllowed(source: DossierShareSource): boolean {
    return Boolean(source?.module && String(source.dossierId ?? '').trim());
}
