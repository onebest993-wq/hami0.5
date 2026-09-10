import SecureStoreService from '@/app/services/SecureStoreService';
import {
    LAWSUIT_FILES_ACTIVE_KEY,
    LAWSUIT_FILES_ARCHIVED_KEY,
    LAWSUIT_FILES_INDEX_KEY,
    LAWSUIT_FILES_STORAGE_KEY,
    LAWSUIT_FILES_TRASH_KEY,
} from '@/app/domain/dossier/dossierStorageKeys';
import {
    isPoorerLawsuitActiveList,
    mergeRicherLawsuitActiveRespectingHeldIds,
    parseLawsuitActiveFiles,
} from './lawsuitActiveDurability';
import { collectHeldOutOfActiveIds } from './lawsuitFilesStatePolicy';
import { readSecureOrDrainLegacySync } from '@/app/services/storage/readSecureOrDrainLegacySync';
import { readLawsuitDossierTombstoneIds } from '@/app/utils/lawsuitDossierTombstones';

const LAWSUIT_DURABLE_KEYS = [
    LAWSUIT_FILES_ACTIVE_KEY,
    LAWSUIT_FILES_INDEX_KEY,
    LAWSUIT_FILES_STORAGE_KEY,
    LAWSUIT_FILES_ARCHIVED_KEY,
    LAWSUIT_FILES_TRASH_KEY,
] as const;

/** مهلة انتظار الطابور — إنشاء دعوى يحتاج تثبيتاً موثوقاً لا UX فقط */
export const LAWSUIT_FLUSH_TIMEOUT_MS = 5_000;
export const LAWSUIT_COMMIT_TIMEOUT_MS = 8_000;
export const LAWSUIT_COMMIT_DEBOUNCE_MS = 400;

export type LawsuitCommitOptions = {
    timeoutMs?: number;
    /** إن وُجد: يجب أن يظهر هذا المعرّف في المقطع النشط على القرص */
    requireActiveFileId?: string | number | null;
    debounceMs?: number;
};

export type LawsuitCommitResult = {
    ok: boolean;
    reason?: 'timeout' | 'verify-failed' | 'write-failed';
};

function raceWithTimeout(work: Promise<void>, timeoutMs: number): Promise<boolean> {
    if (timeoutMs <= 0) {
        return work.then(() => true);
    }
    return new Promise<boolean>((resolve) => {
        let settled = false;
        const finish = (ok: boolean) => {
            if (settled) return;
            settled = true;
            resolve(ok);
        };
        const timer = setTimeout(() => finish(false), timeoutMs);
        void work.then(
            () => {
                clearTimeout(timer);
                finish(true);
            },
            () => {
                clearTimeout(timer);
                finish(false);
            },
        );
    });
}

/**
 * انتظار وصول كتابات إضابير الدعوى إلى IndexedDB — قبل إغلاق أو إعادة تحميل.
 * @returns true إذا اكتمل خلال المهلة، false إذا انتهت المهلة (الكتابة قد تستمر بالخلفية).
 */
export async function flushLawsuitWorkspacePersist(
    timeoutMs = LAWSUIT_FLUSH_TIMEOUT_MS,
): Promise<boolean> {
    SecureStoreService.flushHeavyPersistPending();
    const work = (async () => {
        await SecureStoreService.waitForAllPendingPersist();
        await Promise.all(
            LAWSUIT_DURABLE_KEYS.map((key) => SecureStoreService.waitForPendingSetItem(key)),
        );
    })();
    return raceWithTimeout(work, timeoutMs);
}

/**
 * إعادة دفع صريح من ذاكرة القراءة المتزامنة إلى IndexedDB (تشفير + قرص).
 * @returns عدد المفاتيح التي أُعيدت كتابتها فعلاً
 */
async function forceRewriteLawsuitKeysFromMemory(): Promise<number> {
    let rewritten = 0;
    const keys = [
        LAWSUIT_FILES_ACTIVE_KEY,
        LAWSUIT_FILES_INDEX_KEY,
        LAWSUIT_FILES_ARCHIVED_KEY,
        LAWSUIT_FILES_TRASH_KEY,
    ] as const;

    for (const key of keys) {
        let plain = readSecureOrDrainLegacySync(key);
        if (plain == null && SecureStoreService.hasItemSync(key)) {
            try {
                plain = await SecureStoreService.getItem(key);
            } catch {
                continue;
            }
        }
        if (plain == null) continue;

        /*
         * لا تدفع ذاكرة أفقر فوق قرص أغنى — هذا كان مسار مسح الإضابير عند الإنشاء.
         * لا تُعد إحياء معرّف في أرشيف/tombstone أو سلة-فقط (لا تكرار سلة∩نشط).
         * تفريغ النشط مسموح فقط إن كل معرّفات القرص عليها tombstone حقيقي.
         */
        if (key === LAWSUIT_FILES_ACTIVE_KEY) {
            try {
                const diskPlain = await SecureStoreService.getItemFromDisk(key);
                const memFiles = parseLawsuitActiveFiles(plain);
                const diskFiles = parseLawsuitActiveFiles(diskPlain);
                const heldOutOfActive = collectHeldOutOfActiveIdsForRewrite(memFiles, diskFiles);
                if (isPoorerLawsuitActiveList(memFiles, diskFiles)) {
                    const merged = mergeRicherLawsuitActiveRespectingHeldIds(
                        memFiles,
                        diskFiles,
                        heldOutOfActive,
                    );
          if (
                    merged.length === 0 && diskFiles.length > 0
                ) {
                        const tombstones = safeTombstoneIds();
                        let allTrulyTombstoned = diskFiles.length > 0;
                        for (const row of diskFiles) {
                            const id = String(row.id ?? '').trim();
                            if (id && !tombstones.has(id)) {
                                allTrulyTombstoned = false;
                                break;
                            }
                        }
                        if (!allTrulyTombstoned) {
                            /* أبقِ القرص — لا تسمحShrink بـ [] بسبب تكرار سلة */
                            plain = diskPlain ?? plain;
                        } else {
                            plain = JSON.stringify(merged);
                            SecureStoreService.setItemSync(key, plain, {
                                allowVerifiedEmptyOverwrite: true,
                            });
                        }
                    } else {
                        plain = JSON.stringify(merged);
                        SecureStoreService.setItemSync(key, plain, {
                            allowShrink: merged.length < diskFiles.length,
                        });
                    }
                }
            } catch {
                /* المتابعة بالكتابة من الذاكرة */
            }
        }

        try {
            const allowShrinkWrite =
                key !== LAWSUIT_FILES_ACTIVE_KEY ||
                parseLawsuitActiveFiles(plain).length > 0 ||
                parseLawsuitActiveFiles(readSecureOrDrainLegacySync(key)).length === 0;
            if (!allowShrinkWrite) {
                continue;
            }
            await Promise.race([
                SecureStoreService.setItem(key, plain, {
                    allowShrink: key !== LAWSUIT_FILES_ACTIVE_KEY,
                }),
                new Promise<never>((_, reject) => {
                    setTimeout(() => reject(new Error('rewrite-timeout')), 2_000);
                }),
            ]);
            rewritten += 1;
        } catch {
            /* مفتاح واحد لا يُسقط التثبيت كله */
        }
    }
    return rewritten;
}

function safeTombstoneIds(): Set<string> {
    try {
        return readLawsuitDossierTombstoneIds();
    } catch {
        return new Set();
    }
}

/**
 * معرّفات خارج النشط عمداً — فضّل اتحاد الذاكرة+القرص النشطين حتى لا
 * تُفرَّغ الكتابة حين تكون الذاكرة فارغة والسلة تحمل نفس المعرّفات.
 */
function collectHeldOutOfActiveIdsForRewrite(
    memActive: ReturnType<typeof parseLawsuitActiveFiles>,
    diskActive: ReturnType<typeof parseLawsuitActiveFiles>,
): Set<string> {
    const preferActive = new Set<string>();
    for (const row of memActive) {
        const id = String(row.id ?? '').trim();
        if (id) preferActive.add(id);
    }
    for (const row of diskActive) {
        const id = String(row.id ?? '').trim();
        if (id) preferActive.add(id);
    }
    return collectHeldOutOfActiveIds({
        trash: parseLawsuitActiveFiles(readSecureOrDrainLegacySync(LAWSUIT_FILES_TRASH_KEY)),
        archived: parseLawsuitActiveFiles(
            readSecureOrDrainLegacySync(LAWSUIT_FILES_ARCHIVED_KEY),
        ),
        includeTombstones: true,
        preferActiveIds: preferActive,
    });
}

function parseActiveIds(raw: string | null): Set<string> {
    if (!raw) return new Set();
    try {
        const parsed: unknown = JSON.parse(raw);
        if (!Array.isArray(parsed)) return new Set();
        return new Set(
            parsed
                .map((row) =>
                    row && typeof row === 'object' && 'id' in row
                        ? String((row as { id: unknown }).id)
                        : '',
                )
                .filter(Boolean),
        );
    } catch {
        return new Set();
    }
}

function memoryHasLawsuitPayload(): boolean {
    for (const key of LAWSUIT_DURABLE_KEYS) {
        if (readSecureOrDrainLegacySync(key) != null) return true;
        if (SecureStoreService.hasItemSync(key)) return true;
    }
    return false;
}

/** هل يوجد أي بايتات على القرص لمفاتيح الدعاوى؟ (لا تعتمد على المرآة) */
async function diskHasLawsuitPayload(): Promise<boolean> {
    for (const key of LAWSUIT_DURABLE_KEYS) {
        try {
            const raw = await SecureStoreService.peekRawFromDisk(key);
            if (raw != null && String(raw).trim() !== '') return true;
        } catch {
            /* ignore per-key */
        }
    }
    return false;
}

/**
 * تثبيت موثوق لمخزن الدعاوى: flush → إعادة كتابة → تحقّق من **IndexedDB فقط**.
 * المهلة تحدّ الزمن الكلي عبر فحص دوري (لا Promise.race مزدوج يترك العمل معلّقاً).
 */
export async function commitLawsuitWorkspacePersist(
    options: LawsuitCommitOptions = {},
): Promise<LawsuitCommitResult> {
    const timeoutMs = options.timeoutMs ?? LAWSUIT_COMMIT_TIMEOUT_MS;
    const started = Date.now();
    const timedOut = () => Date.now() - started >= timeoutMs;
    try {
        return await commitLawsuitWorkspacePersistInner({
            ...options,
            timeoutMs,
            timedOut,
            started,
        });
    } catch {
        return { ok: false, reason: timedOut() ? 'timeout' : 'write-failed' };
    }
}

async function commitLawsuitWorkspacePersistInner(
    options: LawsuitCommitOptions & { timedOut: () => boolean; started: number },
): Promise<LawsuitCommitResult> {
    const timeoutMs = options.timeoutMs ?? LAWSUIT_COMMIT_TIMEOUT_MS;
    const requireId =
        options.requireActiveFileId != null && String(options.requireActiveFileId).trim() !== ''
            ? String(options.requireActiveFileId)
            : null;
    const { timedOut, started } = options;

    const flushBudget = Math.min(2_000, Math.max(800, Math.floor(timeoutMs * 0.4)));
    const flushed = await flushLawsuitWorkspacePersist(flushBudget);
    if (timedOut()) return { ok: false, reason: 'timeout' };

    if (!flushed) {
        try {
            await forceRewriteLawsuitKeysFromMemory();
        } catch {
            /* المتابعة للتحقق من القرص */
        }
    }
    if (timedOut()) return { ok: false, reason: 'timeout' };

    const syncActive = readSecureOrDrainLegacySync(LAWSUIT_FILES_ACTIVE_KEY);
    if (syncActive == null && !requireId && !memoryHasLawsuitPayload()) {
        if (!(await diskHasLawsuitPayload())) {
            return { ok: true };
        }
    }

    let diskActive: string | null = null;
    try {
        diskActive = await SecureStoreService.getItemFromDisk(LAWSUIT_FILES_ACTIVE_KEY);
    } catch {
        try {
            await forceRewriteLawsuitKeysFromMemory();
            diskActive = await SecureStoreService.getItemFromDisk(LAWSUIT_FILES_ACTIVE_KEY);
        } catch {
            return { ok: false, reason: 'write-failed' };
        }
    }
    if (timedOut()) return { ok: false, reason: 'timeout' };

    if (syncActive != null && (diskActive == null || diskActive.trim() === '')) {
        try {
            await forceRewriteLawsuitKeysFromMemory();
            diskActive = await SecureStoreService.getItemFromDisk(LAWSUIT_FILES_ACTIVE_KEY);
        } catch {
            return { ok: false, reason: 'verify-failed' };
        }
        if (diskActive == null || diskActive.trim() === '') {
            return { ok: false, reason: flushed ? 'verify-failed' : 'timeout' };
        }
    }

    if (requireId) {
        const ids = parseActiveIds(diskActive);
        if (!ids.has(requireId)) {
            const memIds = parseActiveIds(syncActive);
            const deadline = Date.now() + Math.max(400, Math.min(4_000, timeoutMs - (Date.now() - started)));
            while (Date.now() < deadline) {
                if (timedOut()) break;
                try {
                    await forceRewriteLawsuitKeysFromMemory();
                    diskActive = await SecureStoreService.getItemFromDisk(LAWSUIT_FILES_ACTIVE_KEY);
                } catch {
                    break;
                }
                if (parseActiveIds(diskActive).has(requireId)) break;
                await new Promise((r) => setTimeout(r, 120));
            }
            const retryIds = parseActiveIds(diskActive);
            if (!retryIds.has(requireId)) {
                if (memIds.has(requireId)) {
                    /*
                     * الذاكرة تحمل الإضبارة والقرص متأخر — لا نفشل UX بصرامة:
                     * نُبقي جدولة خلفية عبر schedule بعد الإرجاع من طبقة التحذير.
                     */
                    return { ok: false, reason: 'timeout' };
                }
                return { ok: false, reason: 'verify-failed' };
            }
        }
    }

    if (timedOut()) return { ok: false, reason: 'timeout' };

    const indexPlain = readSecureOrDrainLegacySync(LAWSUIT_FILES_INDEX_KEY);
    if (indexPlain != null) {
        try {
            const diskIndex = await SecureStoreService.getItemFromDisk(LAWSUIT_FILES_INDEX_KEY);
            if (diskIndex == null || diskIndex.trim() === '') {
                await Promise.race([
                    SecureStoreService.setItem(LAWSUIT_FILES_INDEX_KEY, indexPlain),
                    new Promise<never>((_, reject) => {
                        setTimeout(() => reject(new Error('index-timeout')), 1_500);
                    }),
                ]).catch(() => undefined);
            }
        } catch {
            /* تجاهل */
        }
    }

    return { ok: true };
}

/* ——— جدولة موحّدة: autosave يُجمَّع، الطفرات الحرجة تنتظر ——— */

let commitDebounceTimer: ReturnType<typeof setTimeout> | null = null;
let commitChain: Promise<void> = Promise.resolve();
let pendingRequireActiveFileId: string | null = null;

function takePendingRequireId(
    explicit?: string | number | null,
): string | null {
    if (explicit != null && String(explicit).trim() !== '') {
        pendingRequireActiveFileId = null;
        return String(explicit);
    }
    const pending = pendingRequireActiveFileId;
    pendingRequireActiveFileId = null;
    return pending;
}

/**
 * تثبيت مؤجّل بعد كتابات متزامنة متكررة (تعديل/حفظ تلقائي).
 * لا يستبدل `awaitLawsuitWorkspaceCommit` لمسارات الإنشاء/الأرشفة.
 */
export function scheduleLawsuitWorkspaceCommit(options: LawsuitCommitOptions = {}): void {
    if (
        options.requireActiveFileId != null &&
        String(options.requireActiveFileId).trim() !== ''
    ) {
        pendingRequireActiveFileId = String(options.requireActiveFileId);
    }
    const debounceMs = options.debounceMs ?? LAWSUIT_COMMIT_DEBOUNCE_MS;
    if (commitDebounceTimer) clearTimeout(commitDebounceTimer);
    commitDebounceTimer = setTimeout(() => {
        commitDebounceTimer = null;
        const requireId = takePendingRequireId();
        const timeoutMs = options.timeoutMs ?? LAWSUIT_FLUSH_TIMEOUT_MS;
        commitChain = commitChain
            .then(() =>
                commitLawsuitWorkspacePersist({
                    timeoutMs,
                    requireActiveFileId: requireId,
                }).then(() => undefined),
            )
            .catch(() => undefined);
    }, debounceMs);
}

/** إلغاء الجدولة وانتظار التثبيت فوراً — إنشاء، أرشفة، إخفاء تبويب */
export async function awaitLawsuitWorkspaceCommit(
    options: LawsuitCommitOptions = {},
): Promise<LawsuitCommitResult> {
    if (commitDebounceTimer) {
        clearTimeout(commitDebounceTimer);
        commitDebounceTimer = null;
    }
    const requireId = takePendingRequireId(options.requireActiveFileId);
    const timeoutMs = options.timeoutMs ?? LAWSUIT_COMMIT_TIMEOUT_MS;

    /*
     * لا تنتظر طابور autosave المتراكم — كان يصفّ 8ث×N فيبدو الزر معلّقاً ثم يفشل.
     * تثبيت حرج معزول؛ الطابور يُصفَّر بعده حتى لا يُعاد تشغيل commit قديم فوقه.
     */
    const isolated = commitLawsuitWorkspacePersist({
        timeoutMs,
        requireActiveFileId: requireId,
    });
    commitChain = isolated.then(() => undefined).catch(() => undefined);
    return isolated;
}

/** اختبارات فقط — صفّر طابور الجدولة بين الحالات */
export function resetLawsuitCommitSchedulerForTests(): void {
    if (!import.meta.env.VITEST) return;
    if (commitDebounceTimer) clearTimeout(commitDebounceTimer);
    commitDebounceTimer = null;
    pendingRequireActiveFileId = null;
    commitChain = Promise.resolve();
}
