/** واجهة خفيفة لمزامنة الإضبارة مع التقويم — بدون سحب dossierSync/SAC إلى المسار البارد. */

type DossierSyncModule = typeof import('@/app/services/calendar/dossierSync');

let dossierSyncPromise: Promise<DossierSyncModule> | null = null;

function loadDossierSync(): Promise<DossierSyncModule> {
    if (!dossierSyncPromise) {
        dossierSyncPromise = import('@/app/services/calendar/dossierSync');
    }
    return dossierSyncPromise;
}

export function syncLawsuitFileToCalendar(
    file: Record<string, unknown>,
    userId?: string | null,
): void {
    void loadDossierSync()
        .then((m) => m.syncLawsuitFileToCalendar(file, userId))
        .catch(() => undefined);
}

export function syncExecutionFileToCalendar(
    file: Record<string, unknown>,
    userId?: string | null,
): void {
    void loadDossierSync()
        .then((m) => m.syncExecutionFileToCalendar(file, userId))
        .catch(() => undefined);
}

export function pruneOrphanedBridgeEvents(userId?: string | null): void {
    void loadDossierSync()
        .then((m) => m.pruneOrphanedBridgeEvents(userId))
        .catch(() => undefined);
}

export function syncLawsuitTimelineAppointment(
    p: Parameters<DossierSyncModule['syncLawsuitTimelineAppointment']>[0],
): void {
    void loadDossierSync()
        .then((m) => m.syncLawsuitTimelineAppointment(p))
        .catch(() => undefined);
}

export function syncLawsuitTaskDue(
    p: Parameters<DossierSyncModule['syncLawsuitTaskDue']>[0],
): void {
    void loadDossierSync()
        .then((m) => m.syncLawsuitTaskDue(p))
        .catch(() => undefined);
}

export function removeAllBridgedEventsForEntity(
    sourceModule: Parameters<DossierSyncModule['removeAllBridgedEventsForEntity']>[0],
    sourceEntityId: string | number,
    userId?: string | null,
): void {
    void loadDossierSync()
        .then((m) => m.removeAllBridgedEventsForEntity(sourceModule, sourceEntityId, userId))
        .catch(() => undefined);
}
