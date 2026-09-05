import React, {
    useCallback,
    useEffect,
    useMemo,
    useRef,
    useState,
    type ComponentType,
    type ReactNode,
} from 'react';
import { createLawyerDashboardWorkspaceHeavyStubs } from '@/app/hooks/lawyerDashboard/lawyerDashboardWorkspaceStubs';
import { createLawyerDashboardWorkspaceStemStubs } from '@/app/hooks/lawyerDashboard/lawyerDashboardWorkspaceStemStubs';
import type { LawyerDashboardWorkspaceStem } from '@/app/hooks/lawyerDashboard/lawyerDashboardWorkspaceStem.types';
import type { LawsuitLifecycleMutationKind } from '@/app/domain/lawsuit/lawsuitLifecycleTransaction';
import { recordLawsuitLifecycleE2e } from '@/app/runtime/lawsuitLifecycleE2eProbe';
import type {
    LawyerDashboardWorkspaceHeavy,
} from '@/app/hooks/lawyerDashboard/useLawyerDashboardWorkspaceHeavy';
import {
    LawyerDashboardWorkspaceContext,
    type LawyerDashboardWorkspaceProviderParams,
    type LawyerDashboardWorkspaceValue,
} from '@/app/hooks/lawyerDashboard/lawyerDashboardWorkspaceContext';

export type {
    LawyerDashboardWorkspaceProviderParams,
    LawyerDashboardWorkspaceValue,
} from '@/app/hooks/lawyerDashboard/lawyerDashboardWorkspaceContext';
export { useLawyerDashboardWorkspace } from '@/app/hooks/lawyerDashboard/lawyerDashboardWorkspaceContext';

const HEAVY_STUB = createLawyerDashboardWorkspaceHeavyStubs();
const STEM_STUB = createLawyerDashboardWorkspaceStemStubs();

function loadWorkspaceStemLayer() {
    return import('@/app/hooks/lawyerDashboard/LawyerDashboardWorkspaceStemLayer');
}

void loadWorkspaceStemLayer();

type StemLayerProps = {
    localAutoSave: boolean;
    backgroundRuntimeEnabled: boolean;
    onStemChange: (stem: LawyerDashboardWorkspaceStem) => void;
};

type HeavyLayerProps = {
    params: LawyerDashboardWorkspaceProviderParams;
    stem: LawyerDashboardWorkspaceStem;
    onHeavyChange: (heavy: LawyerDashboardWorkspaceHeavy) => void;
};

type LawyerDashboardWorkspaceProviderProps = LawyerDashboardWorkspaceProviderParams & {
    enabled: boolean;
    children: ReactNode;
};

/**
 * أول رسم: stub بلا hydrate دعاوى. StemLayer يُحمَّل بعد commit.
 * mutations/execution/dossier تبقى ديناميكية بعد interactive.
 */
export function LawyerDashboardWorkspaceProvider({
    enabled,
    children,
    archiveType,
    setArchiveType,
    localAutoSave,
    backgroundRuntimeEnabled,
    ...heavyParams
}: LawyerDashboardWorkspaceProviderProps) {
    const [stem, setStem] = useState<LawyerDashboardWorkspaceStem>(STEM_STUB);
    const [stemLive, setStemLive] = useState(false);
    const [heavySlice, setHeavySlice] = useState<LawyerDashboardWorkspaceHeavy>(HEAVY_STUB);
    const [StemLayer, setStemLayer] = useState<ComponentType<StemLayerProps> | null>(null);
    const [HeavyLayer, setHeavyLayer] = useState<ComponentType<HeavyLayerProps> | null>(null);
    const heavySliceRef = useRef<LawyerDashboardWorkspaceHeavy>(HEAVY_STUB);
    const heavyReadyRef = useRef(false);
    const heavyWaitersRef = useRef(
        new Set<(heavy: LawyerDashboardWorkspaceHeavy | null) => void>(),
    );
    const stemRef = useRef<LawyerDashboardWorkspaceStem>(STEM_STUB);
    const stemLiveRef = useRef(false);
    /*
     * لا تُزامَن stemRef من state في كل رسم — ذلك كان يُعيد كتابة STEM_STUB فوق
     * الجذع الحي بين handleStemChange وتطبيق setStem، فيُرجع commit null ويبدو
     * زر «تأكيد النقل إلى السلة» بلا أثر.
     */

    const lawsuitsHeavyArmedRef = useRef(false);
    if (enabled || heavyParams.showLawsuitsWorkspace || archiveType !== null) {
        lawsuitsHeavyArmedRef.current = true;
    }
    /*
     * فتح المخزن يوقظ الطبقة الثقيلة. إخفاؤه خلف الإضبارة (hideVaultAfterPaint)
     * لا يجوز أن يفكّك useLawsuitFilesState أثناء COMMIT السلة.
     */
    const workspaceHeavyEnabled = lawsuitsHeavyArmedRef.current;

    const settleHeavyWaiters = useCallback((heavy: LawyerDashboardWorkspaceHeavy | null) => {
        for (const settle of heavyWaitersRef.current) settle(heavy);
        heavyWaitersRef.current.clear();
    }, []);

    const handleHeavyChange = useCallback(
        (next: LawyerDashboardWorkspaceHeavy) => {
            heavySliceRef.current = next;
            heavyReadyRef.current = true;
            setHeavySlice(next);
            settleHeavyWaiters(next);
        },
        [settleHeavyWaiters],
    );

    const awaitHeavySlice = useCallback(async (): Promise<LawyerDashboardWorkspaceHeavy | null> => {
        if (heavyReadyRef.current) return heavySliceRef.current;
        if (!workspaceHeavyEnabled) return null;
        return new Promise((resolve) => {
            let settled = false;
            const finish = (heavy: LawyerDashboardWorkspaceHeavy | null) => {
                if (settled) return;
                settled = true;
                window.clearTimeout(timeout);
                heavyWaitersRef.current.delete(finish);
                resolve(heavy);
            };
            const timeout = window.setTimeout(() => finish(null), 15_000);
            heavyWaitersRef.current.add(finish);
        });
    }, [workspaceHeavyEnabled]);

    const awaitStemLive = useCallback(async (timeoutMs = 8_000): Promise<boolean> => {
        const isLive = () =>
            stemLiveRef.current &&
            stemRef.current.commitLawsuitLifecycleMutation !==
                STEM_STUB.commitLawsuitLifecycleMutation;
        if (isLive()) return true;
        const started = Date.now();
        while (Date.now() - started < timeoutMs) {
            await new Promise<void>((resolve) => {
                window.setTimeout(resolve, 40);
            });
            if (isLive()) return true;
        }
        return isLive();
    }, []);

    const isStemCommitLive = useCallback((): boolean => {
        return (
            stemLiveRef.current &&
            stemRef.current.commitLawsuitLifecycleMutation !==
                STEM_STUB.commitLawsuitLifecycleMutation
        );
    }, []);

    const commitViaStem = useCallback(
        async (
            kind: LawsuitLifecycleMutationKind,
            ids: readonly (string | number)[],
        ): Promise<boolean> => {
            if (!isStemCommitLive()) {
                recordLawsuitLifecycleE2e('stem-stub', {
                    kind,
                    ids: ids.map(String).join(','),
                    extra: `live=${stemLiveRef.current ? '1' : '0'}`,
                });
                return false;
            }
            recordLawsuitLifecycleE2e('stem-commit', {
                kind,
                ids: ids.map(String).join(','),
                extra: `live=${stemLiveRef.current ? '1' : '0'}`,
            });
            const next = await stemRef.current.commitLawsuitLifecycleMutation(kind, ids);
            if (!next) {
                recordLawsuitLifecycleE2e('stem-no-next', {
                    kind,
                    ids: ids.map(String).join(','),
                });
                return false;
            }
            const idSet = new Set(ids.map(String));
            if (kind === 'trash' || kind === 'archive' || kind === 'permanent-delete') {
                const current = stemRef.current.activeFile;
                if (current && idSet.has(String(current.id))) {
                    stemRef.current.setActiveFile(null);
                }
            }
            if (kind === 'trash' || kind === 'archive') {
                return !next.active.some((file) => idSet.has(String(file.id)));
            }
            if (kind === 'restore-trash' || kind === 'restore-archive') {
                return [...idSet].every((id) =>
                    next.active.some((file) => String(file.id) === id),
                );
            }
            const trash = next.trash ?? [];
            return [...idSet].every(
                (id) =>
                    !next.active.some((file) => String(file.id) === id) &&
                    !trash.some((file) => String(file.id) === id),
            );
        },
        [isStemCommitLive],
    );

    const deferredMoveLawsuitToTrash = useCallback<
        LawyerDashboardWorkspaceHeavy['moveLawsuitToTrash']
    >(
        async (fileId) => {
            if (!isStemCommitLive()) {
                recordLawsuitLifecycleE2e('await-stem', { kind: 'trash', ids: String(fileId) });
                await awaitStemLive();
            }
            if (isStemCommitLive()) {
                const ok = await commitViaStem('trash', [fileId]);
                if (ok) return true;
            }
            recordLawsuitLifecycleE2e('no-stem', { kind: 'trash', ids: String(fileId) });
            if (heavyReadyRef.current) {
                return heavySliceRef.current.moveLawsuitToTrash(fileId);
            }
            return (await awaitHeavySlice())?.moveLawsuitToTrash(fileId) ?? false;
        },
        [awaitHeavySlice, awaitStemLive, commitViaStem, isStemCommitLive],
    );
    const deferredRestoreLawsuitFromTrash = useCallback<
        LawyerDashboardWorkspaceHeavy['restoreLawsuitFromTrash']
    >(
        async (fileId) => {
            if (!isStemCommitLive()) await awaitStemLive();
            if (isStemCommitLive()) {
                const ok = await commitViaStem('restore-trash', [fileId]);
                if (ok) return true;
            }
            if (heavyReadyRef.current) {
                return heavySliceRef.current.restoreLawsuitFromTrash(fileId);
            }
            return (await awaitHeavySlice())?.restoreLawsuitFromTrash(fileId) ?? false;
        },
        [awaitHeavySlice, awaitStemLive, commitViaStem, isStemCommitLive],
    );
    const deferredArchiveLawsuit = useCallback<
        LawyerDashboardWorkspaceHeavy['archiveLawsuit']
    >(
        async (fileId) => {
            if (!isStemCommitLive()) await awaitStemLive();
            if (isStemCommitLive()) {
                const ok = await commitViaStem('archive', [fileId]);
                if (ok) return true;
            }
            if (heavyReadyRef.current) {
                return heavySliceRef.current.archiveLawsuit(fileId);
            }
            return (await awaitHeavySlice())?.archiveLawsuit(fileId) ?? false;
        },
        [awaitHeavySlice, awaitStemLive, commitViaStem, isStemCommitLive],
    );
    const deferredRestoreArchivedLawsuit = useCallback<
        LawyerDashboardWorkspaceHeavy['restoreArchivedLawsuit']
    >(
        async (fileId) => {
            if (!isStemCommitLive()) await awaitStemLive();
            if (isStemCommitLive()) {
                const ok = await commitViaStem('restore-archive', [fileId]);
                if (ok) return true;
            }
            if (heavyReadyRef.current) {
                return heavySliceRef.current.restoreArchivedLawsuit(fileId);
            }
            return (await awaitHeavySlice())?.restoreArchivedLawsuit(fileId) ?? false;
        },
        [awaitHeavySlice, awaitStemLive, commitViaStem, isStemCommitLive],
    );
    const deferredPermanentlyDeleteLawsuits = useCallback<
        LawyerDashboardWorkspaceHeavy['permanentlyDeleteLawsuits']
    >(
        async (ids) => {
            if (!isStemCommitLive()) await awaitStemLive();
            if (isStemCommitLive()) {
                const ok = await commitViaStem('permanent-delete', ids);
                if (ok) return true;
            }
            if (heavyReadyRef.current) {
                return heavySliceRef.current.permanentlyDeleteLawsuits(ids);
            }
            return (await awaitHeavySlice())?.permanentlyDeleteLawsuits(ids) ?? false;
        },
        [awaitHeavySlice, awaitStemLive, commitViaStem, isStemCommitLive],
    );

    const handleStemChange = useCallback((next: LawyerDashboardWorkspaceStem) => {
        stemRef.current = next;
        stemLiveRef.current = true;
        setStem(next);
        setStemLive(true);
    }, []);

    useEffect(() => {
        let cancelled = false;
        void loadWorkspaceStemLayer()
            .then((mod) => {
                if (!cancelled) setStemLayer(() => mod.LawyerDashboardWorkspaceStemLayer);
            })
            .catch(() => undefined);
        return () => {
            cancelled = true;
        };
    }, []);

    useEffect(() => {
        if (!workspaceHeavyEnabled) {
            heavyReadyRef.current = false;
            heavySliceRef.current = HEAVY_STUB;
            setHeavySlice(HEAVY_STUB);
            setHeavyLayer(null);
            settleHeavyWaiters(null);
            return;
        }
        let cancelled = false;
        void import('@/app/hooks/lawyerDashboard/LawyerDashboardWorkspaceHeavyLayer')
            .then((mod) => {
                if (!cancelled) setHeavyLayer(() => mod.LawyerDashboardWorkspaceHeavyLayer);
            })
            .catch(() => {
                if (!cancelled) settleHeavyWaiters(null);
            });
        return () => {
            cancelled = true;
        };
    }, [settleHeavyWaiters, workspaceHeavyEnabled]);

    const value = useMemo((): LawyerDashboardWorkspaceValue => {
        return {
            ...stem,
            ...heavySlice,
            moveLawsuitToTrash: deferredMoveLawsuitToTrash,
            restoreLawsuitFromTrash: deferredRestoreLawsuitFromTrash,
            archiveLawsuit: deferredArchiveLawsuit,
            restoreArchivedLawsuit: deferredRestoreArchivedLawsuit,
            permanentlyDeleteLawsuits: deferredPermanentlyDeleteLawsuits,
            archiveType,
            setArchiveType,
        };
    }, [
        archiveType,
        deferredArchiveLawsuit,
        deferredMoveLawsuitToTrash,
        deferredPermanentlyDeleteLawsuits,
        deferredRestoreArchivedLawsuit,
        deferredRestoreLawsuitFromTrash,
        heavySlice,
        setArchiveType,
        stem,
    ]);

    const providerParams = useMemo(
        (): LawyerDashboardWorkspaceProviderParams => ({
            localAutoSave,
            backgroundRuntimeEnabled,
            archiveType,
            setArchiveType,
            user: heavyParams.user,
            authUserId: heavyParams.authUserId,
            refreshAppAlerts: heavyParams.refreshAppAlerts,
            showLawsuitsWorkspace: heavyParams.showLawsuitsWorkspace,
            criminalBridge: heavyParams.criminalBridge,
            onOpenCriminalDashboard: heavyParams.onOpenCriminalDashboard,
            bumpSearchIndex: heavyParams.bumpSearchIndex,
            selectCase: heavyParams.selectCase,
            closeNotepad: heavyParams.closeNotepad,
        }),
        [
            archiveType,
            backgroundRuntimeEnabled,
            heavyParams.authUserId,
            heavyParams.bumpSearchIndex,
            heavyParams.closeNotepad,
            heavyParams.criminalBridge,
            heavyParams.onOpenCriminalDashboard,
            heavyParams.refreshAppAlerts,
            heavyParams.selectCase,
            heavyParams.showLawsuitsWorkspace,
            heavyParams.user,
            localAutoSave,
            setArchiveType,
        ],
    );

    return (
        <LawyerDashboardWorkspaceContext.Provider value={value}>
            {StemLayer ? (
                <StemLayer
                    localAutoSave={localAutoSave}
                    backgroundRuntimeEnabled={backgroundRuntimeEnabled}
                    onStemChange={handleStemChange}
                />
            ) : null}
            {workspaceHeavyEnabled && stemLive && HeavyLayer ? (
                <HeavyLayer params={providerParams} stem={stem} onHeavyChange={handleHeavyChange} />
            ) : null}
            {children}
        </LawyerDashboardWorkspaceContext.Provider>
    );
}
