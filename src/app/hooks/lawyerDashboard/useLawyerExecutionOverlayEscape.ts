import { useEffect, useRef } from 'react';
import { registerNativeBackHandler } from '@/app/runtime/capacitorAppLifecycle';
import { hasExecutionArchiveTrashDialogsLayer } from '@/app/components/lawyer/ArchivePortal/executionArchiveTrashDialogsLayer';
import { hasExecutionArchivePreviewLayer } from '@/app/components/lawyer/ArchivePortal/executionArchivePreviewLayer';

type ExecutionDossierBackModule =
    typeof import('@/app/components/lawyer/ExecutionDashboard/utils/executionDossierBackHandlerRegistry');

type ExecutionDashboardStoreMod = typeof import('@/app/stores/executionDashboardStore');

let executionStoreMod: ExecutionDashboardStoreMod | null = null;
let executionStoreLoad: Promise<ExecutionDashboardStoreMod> | null = null;

/** تسخين كسول — لا يسحب المخزن إلى stem اللوحة */
function warmExecutionDashboardStore(): void {
    if (executionStoreMod || executionStoreLoad) return;
    executionStoreLoad = import('@/app/stores/executionDashboardStore')
        .then((m) => {
            executionStoreMod = m;
            return m;
        })
        .catch(() => null as unknown as ExecutionDashboardStoreMod);
}

function warmExecutionDossierBackModule(): Promise<ExecutionDossierBackModule> {
    return import(
        '@/app/components/lawyer/ExecutionDashboard/utils/executionDossierBackHandlerRegistry'
    );
}

function hasExecutionDashboardModalStateOpen(): boolean {
    const getState = executionStoreMod?.useExecutionDashboardStore?.getState;
    if (!getState) return false;
    const modalState = getState().modals;
    return Object.values(modalState).some(Boolean);
}

function hasNestedBlockingDialog(): boolean {
    if (typeof document === 'undefined') {
        return false;
    }

    const dialogNodes = document.querySelectorAll('[role="dialog"], [role="alertdialog"]');
    return dialogNodes.length > 0;
}

export type UseLawyerExecutionOverlayEscapeParams = {
    archiveOpen: boolean;
    executionFileOpen: boolean;
    executionCreateOpen?: boolean;
    onCloseArchive: () => void;
    onCloseExecutionFile: () => void;
    onCloseExecutionCreate?: () => void;
};

export function resolveExecutionOverlayBackAction(input: {
    archiveOpen: boolean;
    executionFileOpen: boolean;
    executionCreateOpen: boolean;
}): 'close-file' | 'close-create' | 'close-archive' | null {
    if (input.executionFileOpen) return 'close-file';
    if (input.executionCreateOpen) return 'close-create';
    if (input.archiveOpen) return 'close-archive';
    return null;
}

/** Escape + زر الرجوع الأصلي يغلقان أرشيف التنفيذ أو نموذج الإنشاء أو الإضبارة (الأعلى أولاً) */
export function useLawyerExecutionOverlayEscape({
    archiveOpen,
    executionFileOpen,
    executionCreateOpen = false,
    onCloseArchive,
    onCloseExecutionFile,
    onCloseExecutionCreate,
}: UseLawyerExecutionOverlayEscapeParams): void {
    const backModuleRef = useRef<ExecutionDossierBackModule | null>(null);

    useEffect(() => {
        if (!archiveOpen && !executionFileOpen && !executionCreateOpen) return;

        if (executionFileOpen || archiveOpen) {
            warmExecutionDashboardStore();
            void warmExecutionDossierBackModule().then((m) => {
                backModuleRef.current = m;
            });
        }

        const closeTopLayer = (): boolean => {
            if (executionFileOpen) {
                if (backModuleRef.current?.runExecutionDossierBackFromRegistryOrStore()) {
                    return true;
                }
                if (hasExecutionDashboardModalStateOpen() || hasNestedBlockingDialog()) {
                    return false;
                }
            }
            const action = resolveExecutionOverlayBackAction({
                archiveOpen,
                executionFileOpen,
                executionCreateOpen,
            });
            if (action === 'close-file') {
                onCloseExecutionFile();
                return true;
            }
            if (action === 'close-create') {
                onCloseExecutionCreate?.();
                return true;
            }
            if (action === 'close-archive') {
                if (hasExecutionArchiveTrashDialogsLayer() || hasExecutionArchivePreviewLayer()) {
                    return false;
                }
                onCloseArchive();
                return true;
            }
            return false;
        };

        const onKeyDown = (event: KeyboardEvent) => {
            if (event.key !== 'Escape') return;
            if (event.defaultPrevented) return;
            if (!closeTopLayer()) return;
            event.preventDefault();
        };

        window.addEventListener('keydown', onKeyDown);
        const unregisterNativeBack = registerNativeBackHandler(() => closeTopLayer());
        return () => {
            window.removeEventListener('keydown', onKeyDown);
            unregisterNativeBack();
        };
    }, [
        archiveOpen,
        executionFileOpen,
        executionCreateOpen,
        onCloseArchive,
        onCloseExecutionFile,
        onCloseExecutionCreate,
    ]);
}
