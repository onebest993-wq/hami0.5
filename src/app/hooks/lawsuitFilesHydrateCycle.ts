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

export type LawsuitFilesHydrateCycleHost = {
    isStale: () => boolean;
    adoptBootFromStorage: () => void;
    setSegments: Dispatch<SetStateAction<LawsuitFileSegments>>;
    setLawsuitStorageHydrated: (hydrated: boolean) => void;
};

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
                    await SecureStoreService.ensureLawsuitKeysReady();
                } else if (!hydrateSettledNow()) {
                    /* in-flight فكّ — لا getItem مكرر */
                } else {
                    const {
                        LAWSUIT_FILES_ACTIVE_KEY,
                        LAWSUIT_FILES_INDEX_KEY,
                    } = await import(
                        '@/app/services/dossierPersistence/dossierStorageKeys'
                    );
                    await SecureStoreService.ensureLawsuitKeysReady();
                    await Promise.all([
                        SecureStoreService.getItem(LAWSUIT_FILES_ACTIVE_KEY),
                        SecureStoreService.getItem(LAWSUIT_FILES_INDEX_KEY),
                    ]);
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
                const recovered = await recoverLawsuitWorkspaceFromLocalDisk({
                    includeCloud: false,
                    fullPersistReady: false,
                });
                if (isStale()) return;
                if (recovered.ok) {
                    setSegments((prev) => pickRicherSegments(prev, recovered.segments));
                } else if (recovered.diagnosis.decryptLikelyBroken) {
                    try {
                        const { CryptoService } = await import('@/app/services/CryptoService');
                        await CryptoService.initialize();
                        if (isStale()) return;
                        const retried = await recoverLawsuitWorkspaceFromLocalDisk({
                            includeCloud: false,
                            fullPersistReady: false,
                        });
                        if (isStale()) return;
                        if (retried.ok) {
                            setSegments((prev) => pickRicherSegments(prev, retried.segments));
                        } else if (retried.diagnosis.decryptLikelyBroken) {
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

        /*
         * لا تُعلن الجاهزية إن بقي مشفّر على القرص دون فكّ —
         * وإلا تظهر «لا توجد ملفات» بينما البيانات موجودة (إخفاء كاذب).
         */
        if (decryptBlocked && !isStale()) {
            setLawsuitDecryptBlocked(true);
        } else {
            setLawsuitDecryptBlocked(false);
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

        if (mayDeclareHydrated) {
            setLawsuitStorageHydrated(true);
            void import('@/app/services/alerts/lawsuitArchivePerfMetrics').then((m) => {
                m.markLawsuitArchivePerf('interactive');
                m.reportLawsuitArchivePerf();
            });
        }
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
        if (mayDeclareHydratedAfterError) {
            setLawsuitStorageHydrated(true);
        }
    }
}
