import type { Dispatch, SetStateAction } from 'react';
import {
    loadLawsuitBootSegments,
    type LawsuitFileSegments,
} from '@/app/domain/lawsuit/lawsuitFilesRepository';
import {
    adoptHydratedLawsuitActive,
    applyLawsuitDurabilityOverlaysToSegments,
    bootHasLawsuitRecords,
    pickRicherLawsuitSegments as pickRicherSegments,
} from '@/app/domain/lawsuit/lawsuitFilesStatePolicy';
import {
    lawsuitSegmentsNeedWarm,
    lawsuitStorageMayHaveUnreadData,
} from '@/app/domain/lawsuit/lawsuitSegmentStorage';
import {
    flushLawsuitDurabilityOverlaysToActive,
    lawsuitDurabilityHasUncommittedWrites,
    mergeLawsuitDurabilityOverlaysInto,
} from '@/app/domain/lawsuit/lawsuitDurabilityOverlay';
import { setLawsuitDecryptBlocked } from '@/app/runtime/lawsuitDecryptBlockedFlag';
import { resolveLawsuitArchiveHydrateDeclaration } from '@/app/hooks/lawsuitArchiveHydrateDeclaration';

export type LawsuitFilesHydrateCycleHost = {
    isStale: () => boolean;
    adoptBootFromStorage: () => void;
    setSegments: Dispatch<SetStateAction<LawsuitFileSegments>>;
    setLawsuitStorageHydrated: (hydrated: boolean) => void;
};

const KEYS_EXIT_BUDGET_MS = 2_000;
const RECOVERY_BUDGET_MS = 2_500;

async function awaitWithBudget<T>(promise: Promise<T>, ms: number): Promise<T | undefined> {
    let timer: ReturnType<typeof setTimeout> | undefined;
    try {
        return await Promise.race([
            promise,
            new Promise<undefined>((resolve) => {
                timer = setTimeout(() => resolve(undefined), ms);
            }),
        ]);
    } catch {
        return undefined;
    } finally {
        if (timer !== undefined) clearTimeout(timer);
    }
}

function markArchiveInteractive(host: LawsuitFilesHydrateCycleHost): void {
    void import('@/app/services/alerts/lawsuitArchivePerfMetrics').then((m) => {
        if (host.isStale()) return;
        m.markLawsuitArchivePerf('interactive');
        m.reportLawsuitArchivePerf();
    });
}

/**
 * نهاية الدورة: إعلان الجاهزية أو حجب الفكّ — لا تُترك فتحات الشبكة إلى الأبد.
 */
async function finishLawsuitArchiveHydrate(
    host: LawsuitFilesHydrateCycleHost,
    input: {
        decryptBlocked: boolean;
        stillColdAfterHydrate: boolean;
        mayDeclareHydrated: boolean;
    },
): Promise<void> {
    if (host.isStale()) return;
    const SecureStoreService = (await import('@/app/services/SecureStoreService')).default;
    let diskSettled = SecureStoreService.isDiskHydrationSettledSync();
    if (!diskSettled) {
        await awaitWithBudget(SecureStoreService.ensureLawsuitKeysReady(), KEYS_EXIT_BUDGET_MS);
        if (host.isStale()) return;
        host.adoptBootFromStorage();
        diskSettled = true;
    }

    const after = applyLawsuitDurabilityOverlaysToSegments(loadLawsuitBootSegments());
    const pending = mergeLawsuitDurabilityOverlaysInto(after.active);
    const hasVisible =
        bootHasLawsuitRecords(after) || pending.length > 0 || after.active.length > 0;
    const stillUnread = lawsuitSegmentsNeedWarm();
    const decision = resolveLawsuitArchiveHydrateDeclaration({
        hasVisibleRecords: hasVisible,
        mayDeclareHydrated: input.mayDeclareHydrated,
        decryptBlocked: input.decryptBlocked,
        stillColdAfterHydrate: input.stillColdAfterHydrate || (!hasVisible && stillUnread),
        diskHydrationSettled: diskSettled,
    });

    if (decision.markDecryptBlocked) setLawsuitDecryptBlocked(true);
    else setLawsuitDecryptBlocked(false);

    if (decision.declareHydrated) {
        host.setLawsuitStorageHydrated(true);
        markArchiveInteractive(host);
    }
}

/**
 * دورة فكّ/دمج/استعادة عند إقلاع مساحة الدعاوى.
 * eager-hydrate لا يُعامل كقائمة نشطة إلا بعد إخراج معرّفات السلة/الأرشيف.
 */
export async function runLawsuitFilesHydrateCycle(
    host: LawsuitFilesHydrateCycleHost,
): Promise<void> {
    const { isStale, adoptBootFromStorage, setSegments, setLawsuitStorageHydrated } = host;
    try {
        const {
            awaitLawsuitFilesEagerHydrate,
            isLawsuitFilesEagerHydrateSettled,
        } = await import('@/app/runtime/lawsuitFilesEagerHydrate');
        const hydrated = await awaitLawsuitFilesEagerHydrate(2_500);
        if (isStale()) return;

        setSegments((prev) => {
            const bootWithPending = applyLawsuitDurabilityOverlaysToSegments(
                loadLawsuitBootSegments(),
            );
            const candidate = adoptHydratedLawsuitActive(bootWithPending, hydrated);
            return pickRicherSegments(prev, candidate);
        });

        const afterBoot = loadLawsuitBootSegments();
        let stillCold =
            !bootHasLawsuitRecords(afterBoot) &&
            (lawsuitSegmentsNeedWarm() ||
                lawsuitStorageMayHaveUnreadData(afterBoot.index) ||
                !isLawsuitFilesEagerHydrateSettled());

        /*
         * مخرج من التحميل العالق: إن بقيت المفاتيح باردة بعد مهلة قصيرة،
         * أعد التسخين مرة ثم أعلن hydrated حتى لا تبقى شبكة الأرشيف معلّقة.
         */
        if (stillCold && !isStale()) {
            try {
                const SecureStoreService = (
                    await import('@/app/services/SecureStoreService')
                ).default;
                const {
                    isLawsuitFilesEagerHydrateSettled: hydrateSettledNow,
                } = await import('@/app/runtime/lawsuitFilesEagerHydrate');
                /*
                 * التحميل ما زال جارياً — لا تُكدَّس استعادة/سحابة فوقه.
                 * حدث التسخين أو اكتمال hydrate يملأ الشبكة.
                 */
                if (!hydrateSettledNow() && lawsuitSegmentsNeedWarm()) {
                    await awaitWithBudget(
                        SecureStoreService.ensureLawsuitKeysReady(),
                        KEYS_EXIT_BUDGET_MS,
                    );
                } else if (!hydrateSettledNow()) {
                    /* in-flight فكّ — لا getItem مكرر */
                } else {
                    const {
                        LAWSUIT_FILES_ACTIVE_KEY,
                        LAWSUIT_FILES_INDEX_KEY,
                    } = await import(
                        '@/app/domain/dossier/dossierStorageKeys'
                    );
                    await awaitWithBudget(
                        SecureStoreService.ensureLawsuitKeysReady(),
                        KEYS_EXIT_BUDGET_MS,
                    );
                    await awaitWithBudget(
                        Promise.all([
                            SecureStoreService.getItem(LAWSUIT_FILES_ACTIVE_KEY),
                            SecureStoreService.getItem(LAWSUIT_FILES_INDEX_KEY),
                        ]),
                        KEYS_EXIT_BUDGET_MS,
                    );
                }
                if (isStale()) return;
                adoptBootFromStorage();
            } catch {
                /* ignore — نُنهي التحميل أدناه */
            }
        }

        if (isStale()) return;

        let decryptBlocked = false;
        const afterRecoverRaw = loadLawsuitBootSegments();
        const afterRecoverCheck = applyLawsuitDurabilityOverlaysToSegments(afterRecoverRaw);
        const pendingVisible = afterRecoverCheck.active;
        if (pendingVisible.length > afterRecoverRaw.active.length) {
            setSegments((prev) => pickRicherSegments(prev, afterRecoverCheck));
        }
        if (
            !bootHasLawsuitRecords(afterRecoverCheck) &&
            pendingVisible.length === 0 &&
            hydrated.length === 0
        ) {
            try {
                await flushLawsuitDurabilityOverlaysToActive();
                const { recoverLawsuitWorkspaceFromLocalDisk } = await import(
                    '@/app/domain/lawsuit/lawsuitWorkspaceRecovery'
                );
                const recovered = await awaitWithBudget(
                    recoverLawsuitWorkspaceFromLocalDisk({
                        includeCloud: false,
                        fullPersistReady: false,
                    }),
                    RECOVERY_BUDGET_MS,
                );
                if (isStale()) return;
                if (recovered?.ok) {
                    setSegments((prev) => pickRicherSegments(prev, recovered.segments));
                } else if (recovered?.diagnosis.decryptLikelyBroken) {
                    try {
                        const { CryptoService } = await import('@/app/services/CryptoService');
                        await awaitWithBudget(CryptoService.initialize(), KEYS_EXIT_BUDGET_MS);
                        if (isStale()) return;
                        const retried = await awaitWithBudget(
                            recoverLawsuitWorkspaceFromLocalDisk({
                                includeCloud: false,
                                fullPersistReady: false,
                            }),
                            RECOVERY_BUDGET_MS,
                        );
                        if (isStale()) return;
                        if (retried?.ok) {
                            setSegments((prev) => pickRicherSegments(prev, retried.segments));
                        } else if (retried?.diagnosis.decryptLikelyBroken) {
                            decryptBlocked = true;
                        }
                    } catch {
                        decryptBlocked = true;
                    }
                } else {
                    void recoverLawsuitWorkspaceFromLocalDisk({
                        includeCloud: true,
                        fullPersistReady: false,
                    })
                        .then((cloudRecovered) => {
                            if (isStale()) return;
                            if (cloudRecovered.ok) {
                                setSegments((prev) =>
                                    pickRicherSegments(prev, cloudRecovered.segments),
                                );
                                setLawsuitStorageHydrated(true);
                            }
                        })
                        .catch(() => undefined);
                }
            } catch {
                /* ignore */
            }
        }

        const afterHydrate = loadLawsuitBootSegments();
        const pendingAfterHydrate = mergeLawsuitDurabilityOverlaysInto(afterHydrate.active);
        const stillColdAfterHydrate =
            !decryptBlocked &&
            lawsuitSegmentsNeedWarm() &&
            afterHydrate.active.length === 0 &&
            pendingAfterHydrate.length === 0 &&
            hydrated.length === 0;

        const mayDeclareHydrated =
            !stillColdAfterHydrate &&
            (!lawsuitDurabilityHasUncommittedWrites() ||
                pendingAfterHydrate.length > 0 ||
                bootHasLawsuitRecords(afterHydrate));

        await finishLawsuitArchiveHydrate(host, {
            decryptBlocked,
            stillColdAfterHydrate,
            mayDeclareHydrated,
        });
    } catch {
        if (isStale()) return;
        adoptBootFromStorage();
        const afterError = loadLawsuitBootSegments();
        const pendingAfterError = mergeLawsuitDurabilityOverlaysInto(afterError.active);
        const coldAfterError =
            lawsuitSegmentsNeedWarm() &&
            afterError.active.length === 0 &&
            pendingAfterError.length === 0;
        const mayDeclareHydratedAfterError =
            !coldAfterError &&
            (!lawsuitDurabilityHasUncommittedWrites() ||
                pendingAfterError.length > 0 ||
                bootHasLawsuitRecords(afterError));
        await finishLawsuitArchiveHydrate(host, {
            decryptBlocked: false,
            stillColdAfterHydrate: coldAfterError,
            mayDeclareHydrated: mayDeclareHydratedAfterError,
        });
    }
}
