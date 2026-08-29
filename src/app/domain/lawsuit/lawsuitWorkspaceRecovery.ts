import type { FileData } from './lawsuitFileTypes';
import {
    reloadLawsuitFilesFromStorage,
    type LawsuitFileSegments,
} from '@/app/domain/lawsuit/lawsuitFilesRepository';
import { applyLawsuitMonolithicMergeToSegments } from '@/app/domain/lawsuit/lawsuitSegmentStorage';
import { loadLawsuitFilesRaw } from '@/app/utils/lawsuitFilesStorage';
import SecureStoreService from '@/app/services/SecureStoreService';
import {
    LAWSUIT_FILES_ACTIVE_KEY,
    LAWSUIT_FILES_ARCHIVED_KEY,
    LAWSUIT_FILES_INDEX_KEY,
    LAWSUIT_FILES_STORAGE_KEY,
    LAWSUIT_FILES_STORAGE_KEYS_LEGACY,
    LAWSUIT_FILES_TRASH_KEY,
    LAWSUIT_SEGMENT_WARM_KEYS,
} from '@/app/services/dossierPersistence/dossierStorageKeys';
import { readSecureOrDrainLegacySync } from '@/app/services/storage/readSecureOrDrainLegacySync';

const ENCRYPTED_PREFIX = 'hami_enc_v2:';

export type LawsuitRecoveryDiagnosis = {
    diskCipherPresent: boolean;
    diskActiveCount: number;
    memoryActiveCount: number;
    monolithicCount: number;
    backupCount: number;
    cloudCount: number;
    legacyLocalCount: number;
    decryptLikelyBroken: boolean;
};

export type LawsuitRecoveryResult = {
    ok: boolean;
    segments: LawsuitFileSegments;
    source:
        | 'active'
        | 'monolithic'
        | 'backup'
        | 'cloud'
        | 'legacy-ls'
        | 'emergency'
        | 'none';
    diagnosis: LawsuitRecoveryDiagnosis;
    message: string;
};

export type LawsuitRecoveryOptions = {
    /** افتراضي true — بعد الفشل المحلي تُجرَّب نقطة العمل/المزامنة إن كانت حيّة */
    includeCloud?: boolean;
    /** افتراضي false — لا تنتظر فك الجزائي/المنتدى. true لمسار الترحيل الشامل فقط. */
    fullPersistReady?: boolean;
};

function emptySegments(): LawsuitFileSegments {
    try {
        return reloadLawsuitFilesFromStorage();
    } catch {
        return {
            active: [],
            archived: null,
            trash: null,
            index: {
                v: 1,
                entries: {},
                counts: { active: 0, archived: 0, trash: 0 },
            },
        };
    }
}

function parseFilesArray(raw: string | null | undefined): FileData[] {
    if (!raw) return [];
    try {
        const parsed: unknown = JSON.parse(raw);
        return Array.isArray(parsed) ? (parsed as FileData[]) : [];
    } catch {
        return [];
    }
}

async function safeGetItem(key: string): Promise<string | null> {
    try {
        return await SecureStoreService.getItem(key);
    } catch {
        return null;
    }
}

async function safePeek(key: string): Promise<string | null> {
    try {
        return await SecureStoreService.peekRawFromDisk(key);
    } catch {
        return null;
    }
}

async function safeGetFromDisk(key: string): Promise<string | null> {
    try {
        return await SecureStoreService.getItemFromDisk(key);
    } catch {
        return null;
    }
}

function readLegacyLocalStorageArrays(): FileData[] {
    if (typeof window === 'undefined') return [];
    const keys = [LAWSUIT_FILES_STORAGE_KEY, ...LAWSUIT_FILES_STORAGE_KEYS_LEGACY];
    const merged: FileData[] = [];
    const seen = new Set<string>();
    try {
        for (const key of keys) {
            const raw = readSecureOrDrainLegacySync(key);
            if (!raw || raw.startsWith(ENCRYPTED_PREFIX)) continue;
            const rows = parseFilesArray(raw);
            for (const row of rows) {
                const id = String(row?.id ?? '');
                if (!id || seen.has(id)) continue;
                seen.add(id);
                merged.push(row);
            }
        }
    } catch {
        /* ignore */
    }
    return merged;
}

async function readEmergencyBackupArrays(): Promise<FileData[]> {
    const keys = [
        `emergency_backup_${LAWSUIT_FILES_STORAGE_KEY}`,
        `backup_${LAWSUIT_FILES_STORAGE_KEY}`,
        `emergency_backup_${LAWSUIT_FILES_ACTIVE_KEY}`,
        `backup_${LAWSUIT_FILES_ACTIVE_KEY}`,
    ];
    for (const key of keys) {
        const raw = await safeGetItem(key);
        if (!raw) continue;
        try {
            const parsed: unknown = JSON.parse(raw);
            if (Array.isArray(parsed)) return parsed as FileData[];
            if (parsed && typeof parsed === 'object' && 'data' in parsed) {
                const data = (parsed as { data: unknown }).data;
                if (Array.isArray(data)) return data as FileData[];
            }
        } catch {
            /* continue */
        }
    }
    return [];
}

async function applyRecoveredPayload(
    files: FileData[],
    source: LawsuitRecoveryResult['source'],
): Promise<LawsuitRecoveryResult | null> {
    if (!Array.isArray(files) || files.length === 0) return null;
    try {
        applyLawsuitMonolithicMergeToSegments(files);
        await awaitLawsuitWorkspaceCommit({ timeoutMs: 8_000 });
    } catch {
        try {
            applyLawsuitMonolithicMergeToSegments(files);
        } catch {
            return null;
        }
    }
    const segments = reloadLawsuitFilesFromStorage();
    const ok =
        segments.active.length > 0 ||
        segments.index.counts.active > 0 ||
        segments.index.counts.archived > 0 ||
        segments.index.counts.trash > 0;
    if (!ok) return null;
    return {
        ok: true,
        segments,
        source,
        diagnosis: {
            diskCipherPresent: false,
            diskActiveCount: segments.active.length,
            memoryActiveCount: segments.active.length,
            monolithicCount: files.length,
            backupCount: 0,
            cloudCount: 0,
            legacyLocalCount: 0,
            decryptLikelyBroken: false,
        },
        message:
            segments.active.length > 0
                ? `تمت استعادة ${segments.active.length} إضبارة نشطة`
                : 'تمت الاستعادة — راجع الأرشيف أو السلة من الفلاتر',
    };
}

/**
 * استعادة جذرية متعددة المصادر — لا ترمي أبداً.
 */
export async function recoverLawsuitWorkspaceFromLocalDisk(
    options?: LawsuitRecoveryOptions,
): Promise<LawsuitRecoveryResult> {
    const diagnosis: LawsuitRecoveryDiagnosis = {
        diskCipherPresent: false,
        diskActiveCount: 0,
        memoryActiveCount: 0,
        monolithicCount: 0,
        backupCount: 0,
        cloudCount: 0,
        legacyLocalCount: 0,
        decryptLikelyBroken: false,
    };

    const fail = (message: string): LawsuitRecoveryResult => ({
        ok: false,
        segments: emptySegments(),
        source: 'none',
        diagnosis,
        message,
    });

    const includeCloud = options?.includeCloud !== false;
    const fullPersistReady = options?.fullPersistReady === true;

    try {
        try {
            await SecureStoreService.ensureLawsuitKeysReady();
        } catch {
            /* continue */
        }
        if (fullPersistReady) {
            try {
                await SecureStoreService.ensurePersistedReady();
            } catch {
                /* continue */
            }
        }

        for (const key of LAWSUIT_SEGMENT_WARM_KEYS) {
            await safeGetItem(key);
        }

        const peeks = await Promise.all(
            [...LAWSUIT_SEGMENT_WARM_KEYS].map(async (key) => ({
                key,
                raw: await safePeek(key),
            })),
        );
        diagnosis.diskCipherPresent = peeks.some((p) => p.raw?.startsWith(ENCRYPTED_PREFIX));

        /*
         * معلّقات الإنشاء + سجل WAL (SecureStore مشفّر، مع ترحيل بقايا صريحة).
         * كانت تُتجاهل فتظهر الخزنة فارغة رغم وجود إضبارة معلّقة.
         */
        try {
            const {
                flushLawsuitDurabilityOverlaysToActive,
                mergeLawsuitDurabilityOverlaysInto,
                lawsuitDurabilityHasUncommittedWrites,
            } = await import('@/app/domain/lawsuit/lawsuitDurabilityOverlay');
            const { listPendingLawsuitCreates } = await import(
                '@/app/domain/lawsuit/lawsuitPendingCreateStore',
            );
            const pending = listPendingLawsuitCreates();
            if (lawsuitDurabilityHasUncommittedWrites()) {
                await flushLawsuitDurabilityOverlaysToActive();
                let bootPending = reloadLawsuitFilesFromStorage();
                bootPending = {
                    ...bootPending,
                    active: mergeLawsuitDurabilityOverlaysInto(bootPending.active),
                };
                if (bootPending.active.length > 0) {
                    return {
                        ok: true,
                        segments: bootPending,
                        source: 'emergency',
                        diagnosis: {
                            ...diagnosis,
                            diskActiveCount: bootPending.active.length,
                            memoryActiveCount: bootPending.active.length,
                            legacyLocalCount: pending.length,
                        },
                        message: `تمت استعادة ${bootPending.active.length} إضبارة (منها معلّقات إنشاء)`,
                    };
                }
                const appliedPending = await applyRecoveredPayload(pending, 'emergency');
                if (appliedPending) {
                    return {
                        ...appliedPending,
                        diagnosis: {
                            ...diagnosis,
                            ...appliedPending.diagnosis,
                            legacyLocalCount: pending.length,
                        },
                    };
                }
            }
        } catch {
            /* ignore */
        }

        const diskActivePlain = parseFilesArray(await safeGetFromDisk(LAWSUIT_FILES_ACTIVE_KEY));
        const diskMonoPlain = parseFilesArray(await safeGetFromDisk(LAWSUIT_FILES_STORAGE_KEY));
        diagnosis.diskActiveCount = diskActivePlain.length;
        diagnosis.memoryActiveCount = parseFilesArray(
            readSecureOrDrainLegacySync(LAWSUIT_FILES_ACTIVE_KEY),
        ).length;

        if (diskActivePlain.length > diagnosis.memoryActiveCount) {
            try {
                SecureStoreService.setItemSync(
                    LAWSUIT_FILES_ACTIVE_KEY,
                    JSON.stringify(diskActivePlain),
                    { allowShrink: true },
                );
            } catch {
                /* ignore */
            }
        }

        let boot = reloadLawsuitFilesFromStorage();
        try {
            const { mergeLawsuitDurabilityOverlaysInto } = await import(
                '@/app/domain/lawsuit/lawsuitDurabilityOverlay',
            );
            boot = {
                ...boot,
                active: mergeLawsuitDurabilityOverlaysInto(boot.active),
            };
        } catch {
            /* ignore */
        }
        if (boot.active.length > 0 || boot.index.counts.active > 0) {
            return {
                ok: true,
                segments: boot,
                source: 'active',
                diagnosis: {
                    ...diagnosis,
                    diskActiveCount: boot.active.length,
                    memoryActiveCount: boot.active.length,
                },
                message: `تمت استعادة ${boot.active.length} إضبارة نشطة`,
            };
        }

        const monoSync = loadLawsuitFilesRaw() as FileData[];
        diagnosis.monolithicCount = monoSync.length;
        if (monoSync.length > 0) {
            const applied = await applyRecoveredPayload(monoSync, 'monolithic');
            if (applied) return { ...applied, diagnosis: { ...diagnosis, ...applied.diagnosis } };
        }

        if (diskMonoPlain.length > 0) {
            const applied = await applyRecoveredPayload(diskMonoPlain, 'monolithic');
            if (applied) return { ...applied, diagnosis: { ...diagnosis, ...applied.diagnosis } };
        }

        try {
            const { listDossierBackups } = await import(
                '@/app/services/dossierPersistence/dossierBackupStore'
            );
            const backups = await listDossierBackups('lawsuit');
            diagnosis.backupCount = backups.reduce((n, b) => n + (b.payload?.length ?? 0), 0);
            for (const backup of backups) {
                const rows = backup.payload as FileData[];
                if (!rows.length) continue;
                const applied = await applyRecoveredPayload(rows, 'backup');
                if (applied) {
                    return {
                        ...applied,
                        diagnosis: { ...diagnosis, backupCount: diagnosis.backupCount },
                    };
                }
            }
        } catch {
            /* ignore */
        }

        const emergency = await readEmergencyBackupArrays();
        if (emergency.length > 0) {
            const applied = await applyRecoveredPayload(emergency, 'emergency');
            if (applied) return { ...applied, diagnosis };
        }

        const legacy = readLegacyLocalStorageArrays();
        diagnosis.legacyLocalCount = legacy.length;
        if (legacy.length > 0) {
            const applied = await applyRecoveredPayload(legacy, 'legacy-ls');
            if (applied) return { ...applied, diagnosis };
        }

        if (includeCloud) {
            try {
                const { restoreLastWorkCloudCheckpoint } = await import(
                    '@/app/services/cloud/workCloudCheckpoint'
                );
                const restored = await restoreLastWorkCloudCheckpoint();
                if (restored.applied && restored.lawsuits > 0) {
                    boot = reloadLawsuitFilesFromStorage();
                    diagnosis.cloudCount = boot.active.length + boot.index.counts.archived;
                    if (boot.active.length > 0 || boot.index.counts.active > 0 || boot.index.counts.archived > 0) {
                        return {
                            ok: true,
                            segments: boot,
                            source: 'cloud',
                            diagnosis,
                            message: `تمت الاستعادة من آخر نقطة سحابية — ${boot.active.length} إضبارة`,
                        };
                    }
                }
            } catch {
                /* ignore */
            }
            try {
                const { performCloudSyncBucket } = await import('@/app/services/cloudSyncEngine');
                await performCloudSyncBucket(LAWSUIT_FILES_STORAGE_KEY);
                boot = reloadLawsuitFilesFromStorage();
                diagnosis.cloudCount = boot.active.length + boot.index.counts.archived;
                if (boot.active.length > 0 || boot.index.counts.active > 0 || boot.index.counts.archived > 0) {
                    return {
                        ok: true,
                        segments: boot,
                        source: 'cloud',
                        diagnosis,
                        message:
                            boot.active.length > 0
                                ? `تمت الاستعادة من السحابة — ${boot.active.length} إضبارة`
                                : 'تمت الاستعادة من السحابة — راجع الأرشيف/السلة',
                    };
                }
            } catch {
                /* cloud may be offline / unauthenticated */
            }
        }

        diagnosis.decryptLikelyBroken =
            diagnosis.diskCipherPresent &&
            diagnosis.diskActiveCount === 0 &&
            diagnosis.monolithicCount === 0 &&
            diagnosis.backupCount === 0;

        if (diagnosis.decryptLikelyBroken) {
            return fail(
                'وُجدت بيانات مشفّرة على القرص لكن فك التشفير فشل — افتح الإعدادات واستورد نسخة احتياطية للعمل، أو أعد تسجيل الدخول إن كانت السحابة مفعّلة',
            );
        }

        if (diagnosis.backupCount === 0 && diagnosis.cloudCount === 0 && diagnosis.legacyLocalCount === 0) {
            return fail(
                'لا توجد دعاوى في التخزين المحلي ولا في النسخ الاحتياطية — استورد نسخة من الإعدادات إن توفّرت',
            );
        }

        return fail('تعذّر تطبيق بيانات الاستعادة — جرّب نسخة احتياطية من الإعدادات');
    } catch {
        return fail('حدث خطأ أثناء الاستعادة — أعد المحاولة أو استورد نسخة من الإعدادات');
    }
}
