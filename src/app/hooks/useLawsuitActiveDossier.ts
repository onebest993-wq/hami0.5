import { useCallback, useMemo, type Dispatch, type SetStateAction } from 'react';
import type { FileData } from '@/app/components/lawyer/LawyerShared';
import type { ExecutionFile } from '@/app/components/lawyer/LawyerDashboardParts/types';
import { isFileData, isRecord, resolveOpenableFileData } from '@/app/components/lawyer/LawyerDashboardParts/utils';
import { persistLawsuitFiles } from '@/app/domain/lawsuit/lawsuitFilesRepository';
import {
    patchParentIncidentalFromChildJudgment,
    readActiveStageJudgment,
} from '@/app/components/lawyer/smart-modal/smartFile/incidentalCaseLinking';
import { resolveCaseLinkPeerNav } from '@/app/components/lawyer/smart-modal/smartFile/caseLinking';
import { syncLawsuitFileToCalendar } from '@/app/services/calendarDossierSync';
import { SmartToast } from '@/app/components/ui/SmartToast';
import { debug } from '@/app/utils/debug';
import { prefetchSmartFileModal } from '@/app/utils/lazyComponents';

type ActiveFile = FileData | ExecutionFile | null;

export type UseLawsuitActiveDossierOptions = {
    files: FileData[];
    setFiles: Dispatch<SetStateAction<FileData[]>>;
    activeFile: ActiveFile;
    setActiveFile: Dispatch<SetStateAction<ActiveFile>>;
    userId?: string | null;
    refreshAppAlerts: () => void | Promise<void>;
    selectCase: (caseId: string) => void;
    openExecutionArchiveFile: (file: unknown) => boolean;
};

function publishCivilFileAuditLog(before: FileData, updatedFile: FileData): void {
    try {
        void import('@/app/services/auditLogPublisher').then(({ AuditLog }) => {
            const clientName = updatedFile.parties?.find((p) => p.isClient)?.name?.trim();
            const caseNo = String(updatedFile.caseNo ?? '').trim() || clientName || undefined;

            if (before.status && updatedFile.status && before.status !== updatedFile.status) {
                if (updatedFile.status !== 'deleted') {
                    AuditLog.civil.statusChanged({
                        caseId: updatedFile.id,
                        caseNo,
                        fromStatus: String(before.status),
                        toStatus: String(updatedFile.status),
                    });
                }
            }

            const beforeStages = Array.isArray((before as { stages?: unknown[] }).stages)
                ? (before as { stages: unknown[] }).stages.length
                : 0;
            const afterStages = Array.isArray((updatedFile as { stages?: unknown[] }).stages)
                ? (updatedFile as { stages: unknown[] }).stages.length
                : 0;
            if (afterStages > beforeStages) {
                const lastStage = (updatedFile as { stages?: Array<{ stageName?: string }> }).stages?.[
                    afterStages - 1
                ];
                AuditLog.civil.stageAdded({
                    caseId: updatedFile.id,
                    caseNo,
                    stageName: lastStage?.stageName || 'مرحلة جديدة',
                });
            }

            const countTimeline = (file: FileData): number => {
                const stages = (file as { stages?: Array<{ timeline?: unknown[] }> }).stages ?? [];
                let n = 0;
                for (const s of stages) {
                    if (Array.isArray(s?.timeline)) n += s.timeline.length;
                }
                return n;
            };
            const beforeTimeline = countTimeline(before);
            const afterTimeline = countTimeline(updatedFile);
            if (afterTimeline > beforeTimeline) {
                const stages =
                    (updatedFile as {
                        stages?: Array<{ timeline?: Array<{ id?: string; date?: string; title?: string }> }>;
                    }).stages ?? [];
                const beforeIds = new Set<string>();
                const beforeStagesArr =
                    (before as { stages?: Array<{ timeline?: Array<{ id?: string }> }> }).stages ?? [];
                for (const s of beforeStagesArr) {
                    for (const t of s?.timeline ?? []) {
                        if (t?.id) beforeIds.add(String(t.id));
                    }
                }
                for (const s of stages) {
                    for (const ev of s?.timeline ?? []) {
                        if (!ev?.id || beforeIds.has(String(ev.id))) continue;
                        if (ev.date) {
                            AuditLog.civil.hearingAdded({
                                caseId: updatedFile.id,
                                caseNo,
                                date: ev.date,
                                title: ev.title,
                            });
                        }
                    }
                }
            }

            type TaskShape = { id?: string; title?: string; dueDate?: string; isCompleted?: boolean };
            const collectTasks = (file: FileData): TaskShape[] => {
                const stages = (file as { stages?: Array<{ tasks?: TaskShape[] }> }).stages ?? [];
                const out: TaskShape[] = [];
                for (const s of stages) {
                    if (Array.isArray(s?.tasks)) out.push(...s.tasks);
                }
                return out;
            };
            const beforeTasks = collectTasks(before);
            const afterTasks = collectTasks(updatedFile);
            const beforeMap = new Map(beforeTasks.map((t) => [String(t.id ?? ''), t] as const));
            for (const t of afterTasks) {
                const prev = beforeMap.get(String(t.id ?? ''));
                if (prev && !prev.isCompleted && t.isCompleted && t.title) {
                    AuditLog.civil.taskCompleted({
                        caseId: updatedFile.id,
                        caseNo,
                        title: t.title,
                    });
                } else if (!prev && t.title) {
                    AuditLog.civil.taskAdded({
                        caseId: updatedFile.id,
                        caseNo,
                        title: t.title,
                        dueDate: t.dueDate,
                    });
                }
            }
        });
    } catch {
        /* silent */
    }
}

export function useLawsuitActiveDossier({
    files,
    setFiles,
    activeFile,
    setActiveFile,
    userId,
    refreshAppAlerts,
    selectCase,
    openExecutionArchiveFile,
}: UseLawsuitActiveDossierOptions) {
    const openArchiveFile = useCallback(
        (f: unknown): boolean => {
            if (isRecord(f) && f.type === 'execution') {
                return openExecutionArchiveFile(f);
            }
            const resolved = resolveOpenableFileData(f, files);
            if (!resolved) {
                SmartToast.error('تعذّر فتح الإضبارة — تحقق من بيانات الملف');
                return false;
            }
            prefetchSmartFileModal();
            selectCase(resolved.id.toString());
            setActiveFile(resolved);
            return true;
        },
        [files, openExecutionArchiveFile, selectCase, setActiveFile],
    );

    const handleUpdateFile = useCallback(
        (updatedFile: FileData) => {
            const updatedId = String((updatedFile as FileData & { id?: unknown }).id ?? '');
            const normalizedFile: FileData = {
                ...updatedFile,
                parties: Array.isArray(updatedFile.parties) ? updatedFile.parties : [],
            } as FileData;
            const mergeFile = (prev: FileData): FileData => ({ ...prev, ...normalizedFile, id: prev.id });

            const before = files.find((f) => String(f.id) === updatedId);

            let parentIncidentalPatch: FileData | null = null;
            const childLink = normalizedFile.incidentalLink;
            if (childLink && before) {
                const beforeJudgment = readActiveStageJudgment(before);
                const afterJudgment = readActiveStageJudgment(normalizedFile);
                const judgmentJustClosed =
                    afterJudgment?.isClosed &&
                    afterJudgment.finalDecision &&
                    (!beforeJudgment?.isClosed ||
                        beforeJudgment.finalDecision !== afterJudgment.finalDecision);
                if (judgmentJustClosed) {
                    const parentFile = files.find((f) => f.id === childLink.parentFileId);
                    if (parentFile) {
                        parentIncidentalPatch = patchParentIncidentalFromChildJudgment(
                            parentFile,
                            childLink.incidentalId,
                            {
                                finalDecision: afterJudgment.finalDecision!,
                                linkedCaseNo: String(normalizedFile.caseNo || '').trim(),
                                judgmentDate: afterJudgment.decisionDate,
                            },
                        ) as FileData | null;
                    }
                }
            }

            setFiles((prev) => {
                const withChild = prev.map((f) => (String(f.id) === updatedId ? mergeFile(f) : f));
                const next = parentIncidentalPatch
                    ? withChild.map((f) =>
                          f.id === parentIncidentalPatch!.id ? parentIncidentalPatch! : f,
                      )
                    : withChild;
                return persistLawsuitFiles(next);
            });

            setActiveFile((prev) => {
                if (parentIncidentalPatch && prev && prev.id === parentIncidentalPatch.id) {
                    return parentIncidentalPatch;
                }
                if (prev && String(prev.id) === updatedId) {
                    return mergeFile(prev as FileData);
                }
                return normalizedFile;
            });

            if (parentIncidentalPatch) {
                const label =
                    childLink?.type === 'counter' ? 'الدعوى المتقابلة' : 'الدعوى المنضمة';
                SmartToast.success(`تم حسم ${label} — نُقلت نتيجة الحكم من الإضبارة المرتبطة ✅`);
                if (userId) {
                    void import('@/app/services/lawyer-cloud').then(({ LawyerDB }) => {
                        LawyerDB.saveCase(
                            userId,
                            parentIncidentalPatch as unknown as Record<string, unknown>,
                        ).catch(debug.error);
                    });
                }
                syncLawsuitFileToCalendar(
                    parentIncidentalPatch as unknown as Record<string, unknown>,
                    userId,
                );
            }

            if (userId) {
                void import('@/app/services/lawyer-cloud').then(({ LawyerDB }) => {
                    LawyerDB.saveCase(
                        userId,
                        normalizedFile as unknown as Record<string, unknown>,
                    ).catch(debug.error);
                });
            }
            syncLawsuitFileToCalendar(normalizedFile as unknown as Record<string, unknown>, userId);

            if (before) {
                publishCivilFileAuditLog(before, normalizedFile);
            }

            void refreshAppAlerts();
        },
        [files, refreshAppAlerts, setActiveFile, setFiles, userId],
    );

    const caseLinkNav = useMemo(
        () =>
            resolveCaseLinkPeerNav(
                activeFile && isFileData(activeFile) ? activeFile : null,
                files,
            ),
        [activeFile, files],
    );

    return {
        openArchiveFile,
        handleUpdateFile,
        caseLinkNav,
    };
}
