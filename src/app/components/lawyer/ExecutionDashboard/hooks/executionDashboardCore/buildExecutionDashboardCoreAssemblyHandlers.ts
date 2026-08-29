import { isExecutionHandlerStubLeaf } from '../executionHandlerClusterStubs';
import { pickCoreAssemblyHandlers } from './pickCoreAssemblyHandlers';
import { pickHandlerClusterAssemblyHandlers } from './pickHandlerClusterAssemblyHandlers';
import { mergeAssemblyDossierFollowupHandlers } from './mergeAssemblyDossierFollowupHandlers';
import { mergeAssemblyHandlerGroup } from './mergeAssemblyHandlerGroup';

const ASSEMBLY_HANDLER_GROUP_KEYS = [
    'evictionResidentialGraceHandlers',
    'policeAssistanceHandlers',
    'breakInventoryHandlers',
    'evictionHeirsMemoHandlers',
] as const;

export type BuildExecutionDashboardCoreAssemblyHandlersInput = {
    handlerCluster: Record<string, unknown>;
    coreRuntimeVars: Record<string, unknown>;
    coreDossierLifecycleActions: Record<string, unknown>;
    coreResidentHandlers: Record<string, unknown>;
};

export function buildExecutionDashboardCoreAssemblyHandlers({
    handlerCluster,
    coreRuntimeVars,
    coreDossierLifecycleActions,
    coreResidentHandlers,
}: BuildExecutionDashboardCoreAssemblyHandlersInput) {
    const clusterHandlers = pickHandlerClusterAssemblyHandlers(handlerCluster);
    const coreHandlers = pickCoreAssemblyHandlers(coreRuntimeVars);
    const residentNotesBag = coreResidentHandlers.notesTasksHandlers;
    const notesTasksHandlers =
        residentNotesBag &&
        typeof residentNotesBag === 'object' &&
        !Array.isArray(residentNotesBag) &&
        !isExecutionHandlerStubLeaf(residentNotesBag)
            ? residentNotesBag
            : coreHandlers.notesTasksHandlers &&
                typeof coreHandlers.notesTasksHandlers === 'object' &&
                !Array.isArray(coreHandlers.notesTasksHandlers) &&
                !isExecutionHandlerStubLeaf(coreHandlers.notesTasksHandlers)
              ? coreHandlers.notesTasksHandlers
              : clusterHandlers.notesTasksHandlers;
    const pinnedNotesHandlers =
        notesTasksHandlers &&
        typeof notesTasksHandlers === 'object' &&
        !Array.isArray(notesTasksHandlers) &&
        !isExecutionHandlerStubLeaf(notesTasksHandlers)
            ? (notesTasksHandlers as Record<string, unknown>)
            : {};
    const coreActions = coreHandlers.dossierLifecycleActions;
    const clusterActions = clusterHandlers.dossierLifecycleActions;
    const dossierLifecycleActions =
        coreActions && typeof coreActions === 'object' && !Array.isArray(coreActions)
            ? coreActions
            : clusterActions && typeof clusterActions === 'object' && !Array.isArray(clusterActions)
              ? clusterActions
              : coreDossierLifecycleActions;
    const dossierFollowupHandlers = mergeAssemblyDossierFollowupHandlers(clusterHandlers, coreHandlers);
    const mergedHandlerGroups: Record<string, unknown> = {};
    for (const key of ASSEMBLY_HANDLER_GROUP_KEYS) {
        const merged = mergeAssemblyHandlerGroup(clusterHandlers, coreHandlers, key);
        if (merged) mergedHandlerGroups[key] = merged;
    }
    const partyDeathHandlersBag = coreHandlers.partyDeathHandlers;
    const flattenedPartyDeathHandlers =
        partyDeathHandlersBag &&
        typeof partyDeathHandlersBag === 'object' &&
        !Array.isArray(partyDeathHandlersBag) &&
        !isExecutionHandlerStubLeaf(partyDeathHandlersBag)
            ? (partyDeathHandlersBag as Record<string, unknown>)
            : {};
    const trashAndPinsBag = coreHandlers.trashAndPinsHandlers;
    const flattenedTrashAndPins =
        trashAndPinsBag &&
        typeof trashAndPinsBag === 'object' &&
        !Array.isArray(trashAndPinsBag) &&
        !isExecutionHandlerStubLeaf(trashAndPinsBag)
            ? (trashAndPinsBag as Record<string, unknown>)
            : {};
    const partyEditBag = coreHandlers.partyEditWorkflow;
    const flattenedPartyEdit =
        partyEditBag &&
        typeof partyEditBag === 'object' &&
        !Array.isArray(partyEditBag) &&
        !isExecutionHandlerStubLeaf(partyEditBag)
            ? (partyEditBag as Record<string, unknown>)
            : {};
    const dossierMetaBag = coreHandlers.dossierMetaWorkflow;
    const flattenedDossierMeta =
        dossierMetaBag &&
        typeof dossierMetaBag === 'object' &&
        !Array.isArray(dossierMetaBag) &&
        !isExecutionHandlerStubLeaf(dossierMetaBag)
            ? (dossierMetaBag as Record<string, unknown>)
            : {};
    return {
        ...clusterHandlers,
        ...coreHandlers,
        ...pinnedNotesHandlers,
        ...mergedHandlerGroups,
        ...flattenedPartyDeathHandlers,
        ...flattenedTrashAndPins,
        ...flattenedPartyEdit,
        ...flattenedDossierMeta,
        notesTasksHandlers,
        dossierLifecycleActions,
        ...(dossierFollowupHandlers ? { dossierFollowupHandlers } : {}),
        handleMemoFollowupClick: coreRuntimeVars.handleMemoFollowupClick,
        openFollowupModalPersisted: coreRuntimeVars.openFollowupModalPersisted,
        commitDossierNote: pinnedNotesHandlers.commitDossierNote,
    };
}
