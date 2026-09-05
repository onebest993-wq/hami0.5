import type { LawyerDashboardWorkspaceStem } from '@/app/hooks/lawyerDashboard/lawyerDashboardWorkspaceStem.types';

const noop = () => undefined;
const noopAsync = async () => undefined;

/**
 * جذع فارغ لأول رسم — بلا lawsuitFilesRepository / SecureStore hydrate.
 * StemLayer يستبدل القيمة بعد إطار المنزل.
 */
export function createLawyerDashboardWorkspaceStemStubs(): LawyerDashboardWorkspaceStem {
    return {
        activeFile: null,
        setActiveFile: noop as LawyerDashboardWorkspaceStem['setActiveFile'],
        files: [],
        setFiles: noop as LawyerDashboardWorkspaceStem['setFiles'],
        lawsuitSegments: {
            active: [],
            archived: null,
            trash: null,
            index: { v: 1, entries: {}, counts: { active: 0, archived: 0, trash: 0 } },
        },
        setLawsuitSegments: noop as LawyerDashboardWorkspaceStem['setLawsuitSegments'],
        commitLawsuitLifecycleMutation: async () => null,
        lawsuitLifecycleCounts: { active: 0, archived: 0, trash: 0 },
        lawsuitArchivedFiles: null,
        lawsuitTrashFiles: null,
        ensureLawsuitArchivedLoaded: noopAsync,
        ensureLawsuitTrashLoaded: noopAsync,
        reloadLawsuitFiles: () => [],
        lawsuitStorageHydrated: false,
    };
}
