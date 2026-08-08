/**
 * مزامنة منهجية: أي موعد/تاريخ في إضبارة (دعوى، تنفيذ، مستعجل، معاملة، جزائي، Threading)
 * يُرفع إلى التقويم المركزي عبر معرّف ثابت — لا ربط عشوائي لكل زر على حدة.
 */
import {
    flushPendingCalendarSyncs,
    muteCalendarUpdates,
    resolveCalendarUserId,
} from '@/app/services/calendarBridge';
import { TransactionsThreadingDB } from '@/app/services/cloud/lawyerTransactionsCloud';
import { debug } from '@/app/utils/debug';
import type { LegalTask } from '@/app/types/TaskEngine';
import type { DossierSyncStats, LiveCalendarSnapshots, SyncScope } from './types';
import {
    dispatchCalendarUpdated,
    EMPTY_STATS,
    isRecord,
    readEntityId,
} from './shared';
import { shouldExcludeExecutionFromCalendar, shouldExcludeLawsuitFromCalendar } from './exclusions';
import { syncOneExecutionFile } from './executionSync';
import { syncOneLawsuitFile } from './lawsuitSync';
import { syncOneCriminalCase, syncCriminalCases } from './criminalSync';
import { syncThreadingCalendarSnapshot, syncThreadingTasks } from './auxiliarySync';
import { loadExecutionFilesRaw } from '@/app/utils/executionFilesStorage';
import { loadLawsuitFilesRaw } from '@/app/utils/lawsuitFilesStorage';
import {
    pruneOrphanedBridgeEvents,
    purgeExcludedDossierBridgedEvents,
    purgeInactiveEntityBridgedEvents,
    purgeInauthenticBridgedEvents,
    purgeNonWhitelistedBridgedEvents,
    removeAllBridgedEventsForEntity,
} from './prune';
import SecureStoreService from '@/app/services/SecureStoreService';


let reconcileInFlight: Promise<DossierSyncStats> | null = null;

/** تطهير موحّد بعد المزامنة — يُستدعى مرة واحدة بدل تكرار الاستدعاءات */
async function runPostSyncCalendarHygiene(
    uid: string,
    stats: DossierSyncStats,
    includeTasks: boolean,
): Promise<void> {
    stats.purgedInactive += await purgeExcludedDossierBridgedEvents(uid);
    stats.prunedOrphans += await purgeInauthenticBridgedEvents(uid);
    stats.prunedOrphans += await purgeNonWhitelistedBridgedEvents(uid);
    stats.prunedOrphans += await pruneOrphanedBridgeEvents(uid, { includeTasks });
}

async function finishDossierCalendarSync(
    userId: string,
    scope: SyncScope = {},
    live?: LiveCalendarSnapshots,
): Promise<void> {
    await flushPendingCalendarSyncs();
    const includeTasks = scope.includeTasks ?? true;
    await pruneOrphanedBridgeEvents(userId, { includeTasks, live });
    dispatchCalendarUpdated();
}

export function syncDossierFilesIncremental(
    userId: string | null | undefined,
    lawsuitFiles: unknown[],
    executionFiles: unknown[],
): void {
    void ensureCalendarPopulatedFromLiveDossiers({
        lawyerId: userId,
        lawsuitFiles,
        executionFiles,
    });
}

let livePopulateInFlight: Promise<void> | null = null;
type LivePopulateParams = {
    lawyerId: string | null | undefined;
    lawsuitFiles: unknown[];
    executionFiles: unknown[];
    criminalCases?: unknown[];
    globalNotes?: unknown[];
    fieldTasks?: LegalTask[];
};
let latestLivePopulateParams: { params: LivePopulateParams; emitUpdated: boolean } | null = null;

async function runLiveCalendarPopulate(
    params: LivePopulateParams,
    options?: { emitUpdated?: boolean },
): Promise<void> {
    const releaseMute = muteCalendarUpdates();
    try {
    // 🛡️ WHITELIST صارم — نُسجّل فقط 4 نقاط دخول صريحة:
    //   1) المدني — "موعد جديد" (timeline.type='appointment')
    //   2) الجزائي — تاريخ الجلسة في تبويب المحاكمات (trials[].date / nextSessionDate)
    //   3) التنفيذ — "إضافة موعد" (timeline.type='appointment')
    //   4) المعاملات — مهلة المهمة في AddTaskBottomSheet (threading.tasks[].deadline)
    // كل ما عداه (notes/field-tasks/urgent/transactions/Sniffer) مُعطَّل.
    const uid = resolveCalendarUserId(params.lawyerId);
    const stats = EMPTY_STATS();
    const liveScope: SyncScope = { whitelistOnly: true, includeTasks: false };

    for (const raw of params.lawsuitFiles) {
        if (isRecord(raw)) syncOneLawsuitFile(raw, uid, stats, liveScope);
    }
    for (const raw of params.executionFiles) {
        if (isRecord(raw)) syncOneExecutionFile(raw, uid, stats, liveScope);
    }
    for (const raw of params.criminalCases ?? []) {
        if (isRecord(raw)) syncOneCriminalCase(raw, uid, stats);
    }

    // ✅ Threading tasks (مهل مهام المعاملات) — مسموح
    try {
        const threading = await TransactionsThreadingDB.getState(uid);
        syncThreadingCalendarSnapshot(
            uid,
            Array.isArray(threading?.transactions) ? threading.transactions : [],
            Array.isArray(threading?.tasks) ? threading.tasks : [],
            Array.isArray(threading?.financeRecords) ? threading.financeRecords : [],
        );
    } catch (err) {
        debug.warn('[calendarDossierSync] threading live sync failed:', err);
    }

    // 🚫 المسارات المُلغاة (لا تُسجَّل في التقويم/البطاقة):
    //    - UrgentActionsDB.cases     → syncUrgentCases
    //    - TransactionDB.steps        → syncTransactions
    //    - globalNotes                → syncGlobalNotesToCalendar
    //    - fieldTasks (مهام الميدان)  → syncFieldTasksToCalendar
    // (المتغيرات unused مقصودة — تخدم التوثيق + الاختبارات)
    void params.globalNotes;
    void params.fieldTasks;

    await flushPendingCalendarSyncs();

    // purgeNonWhitelistedBridgedEvents يُنفَّذ في reconcile/cleanup فقط — ليس في المسار الساخن
    } finally {
        releaseMute();
        if (options?.emitUpdated !== false) {
            dispatchCalendarUpdated();
        }
    }
}

/**
 * يرفع مواعيد الإضابير الحية (من الذاكرة) إلى CalendarDB قبل التنبيهات والرادار.
 * يجب await قبل قراءة CalendarDB في SecretaryOrchestrator.
 */
export async function ensureCalendarPopulatedFromLiveDossiers(
    params: {
        lawyerId: string | null | undefined;
        lawsuitFiles: unknown[];
        executionFiles: unknown[];
        criminalCases?: unknown[];
        globalNotes?: unknown[];
        fieldTasks?: LegalTask[];
    },
    options?: { emitUpdated?: boolean },
): Promise<void> {
    latestLivePopulateParams = { params, emitUpdated: options?.emitUpdated !== false };
    if (livePopulateInFlight) return livePopulateInFlight;

    livePopulateInFlight = (async () => {
        try {
            while (latestLivePopulateParams) {
                const batch = latestLivePopulateParams;
                latestLivePopulateParams = null;
                await runLiveCalendarPopulate(batch.params, { emitUpdated: batch.emitUpdated });
            }
        } finally {
            livePopulateInFlight = null;
            if (latestLivePopulateParams) {
                void ensureCalendarPopulatedFromLiveDossiers(
                    latestLivePopulateParams.params,
                    { emitUpdated: latestLivePopulateParams.emitUpdated },
                );
            }
        }
    })();

    return livePopulateInFlight;
}

export function syncLawsuitFileToCalendar(file: Record<string, unknown>, userId?: string | null): void {
    const uid = resolveCalendarUserId(userId);
    void (async () => {
        const entityId = isRecord(file) ? readEntityId(file) : null;
        if (entityId != null) {
            if (shouldExcludeLawsuitFromCalendar(file)) {
                await removeAllBridgedEventsForEntity('lawsuit', entityId, uid);
                await flushPendingCalendarSyncs();
                await pruneOrphanedBridgeEvents(uid, { includeTasks: false, live: { lawsuitFiles: [file] } });
                dispatchCalendarUpdated();
                return;
            }
            syncOneLawsuitFile(file, uid, EMPTY_STATS(), { includeTasks: true });
        }
        await finishDossierCalendarSync(uid, { includeTasks: true }, { lawsuitFiles: [file] });
    })();
}

/** مزامنة إضبارة تنفيذ واحدة فور حفظها أو استرجاعها */
export function syncExecutionFileToCalendar(
    file: Record<string, unknown>,
    userId?: string | null,
): void {
    const uid = resolveCalendarUserId(userId);
    void (async () => {
        const entityId = isRecord(file) ? readEntityId(file) : null;
        if (entityId != null) {
            if (shouldExcludeExecutionFromCalendar(file)) {
                await removeAllBridgedEventsForEntity('execution', entityId, uid);
                await flushPendingCalendarSyncs();
                await pruneOrphanedBridgeEvents(uid, { includeTasks: false, live: { executionFiles: [file] } });
                dispatchCalendarUpdated();
                return;
            }
            syncOneExecutionFile(file, uid, EMPTY_STATS(), { includeTasks: true });
        }
        await finishDossierCalendarSync(uid, { includeTasks: true }, { executionFiles: [file] });
    })();
}

export async function cleanupCalendarForUser(userId?: string | null): Promise<DossierSyncStats> {
    const { shouldSkipDossierDependentCalendarPurge } = await import(
        '@/app/services/dossierPersistence/storageHydrationGuard'
    );
    await SecureStoreService.ensurePersistedReady();
    if (await shouldSkipDossierDependentCalendarPurge()) {
        return EMPTY_STATS();
    }

    // reconcileAllDossierDates يُشغّل دورة التطهير الكاملة — لا حاجة لـ pre-pass مكرّر
    return reconcileAllDossierDates(resolveCalendarUserId(userId));
}

/**
 * يمسح كل الإضابير المحلية ويرفع المواعيد/المهام ذات التاريخ إلى التقويم (آمن للتكرار).
 *
 * عقد المزامنة (ثابت — لا يتغير بصمت):
 * - المسار الحيّ (ensureCalendarPopulatedFromLiveDossiers): whitelistOnly — 4 نقاط دخول فقط.
 * - حفظ إضبارة واحدة (sync*FileToCalendar): includeTasks — مواعيد + مهام الاستحقاق.
 * - reconcile/cleanup هنا: includeTasks — إعادة بناء كاملة + تطهير اليتامى وغير المصرّح.
 */
export async function reconcileAllDossierDates(userId?: string | null): Promise<DossierSyncStats> {
    if (reconcileInFlight) {
        return reconcileInFlight;
    }

    const uid = resolveCalendarUserId(userId);
    reconcileInFlight = (async () => {
        const stats = EMPTY_STATS();

        const bulkScope: SyncScope = { includeTasks: true };

        try {
            stats.purgedInactive += await purgeInactiveEntityBridgedEvents(uid);

            // 🛡️ WHITELIST: فقط 4 نقاط دخول مسموحة
            for (const raw of loadLawsuitFilesRaw()) {
                if (isRecord(raw)) syncOneLawsuitFile(raw, uid, stats, bulkScope);
            }
            for (const raw of loadExecutionFilesRaw()) {
                if (isRecord(raw)) syncOneExecutionFile(raw, uid, stats, bulkScope);
            }
            syncCriminalCases(uid, stats);
            await syncThreadingTasks(uid, stats);

            await flushPendingCalendarSyncs();
            await runPostSyncCalendarHygiene(uid, stats, true);
            dispatchCalendarUpdated();
        } finally {
            reconcileInFlight = null;
        }

        return stats;
    })();

    return reconcileInFlight;
}

export const CALENDAR_SYNC_RULES = {
    /** مسارات مُفعّلة في المزامنة الحية (whitelist) */
    active: {
        lawsuit: ['timeline.type=appointment — جلسات مدنية'],
        execution: ['timelineEvents.type=appointment — مواعيد تنفيذ'],
        criminal: ['trials[].date / nextSessionDate — جلسات محاكمات'],
        threading: ['tasks.deadline — مهل مهام المعاملات'],
    },
    /** مسارات مُعطّلة — لا تُزامَن؛ تُنظَّف عبر purgeNonWhitelisted/purgeInauthentic */
    disabled: {
        lawsuitLegacy: [
            'tasks.dueDate — مهام استحقاق يدوية',
            'history.date — سجل قديم بدون stages',
            'nextDate / stayReviewDate — مواعيد علوية',
            'notes[].apptDate — ملاحظات مضمّنة',
        ],
        executionTasks: ['caseTasksPending.dueDate — مهام الاستحقاق'],
        urgent: [
            'hearings.sessionDate',
            'hearings.nextSessionDate',
            'sessionDate / deadlineDate / notificationDate',
            'grievanceSessionDate / grievanceFirstHearingDate / phase2FirstHearingDate',
        ],
        transaction: ['steps.appointmentDate'],
        criminalLegacy: ['timelineEvents.date', 'location.nextHearingDate'],
        threadingFinance: ['financeRecords.date'],
        note: ['globalNotes apptDate / reminder_at / date'],
        task: ['quantum field tasks parsedDate / reminderAt'],
        sniffer: [
            'أي *Date / dueDate / *Deadline / date في أي حاوية فرعية',
            'معرّف الجسر: field_<safe_path> — للقراءة فقط من التقويم',
        ],
    },
} as const;
