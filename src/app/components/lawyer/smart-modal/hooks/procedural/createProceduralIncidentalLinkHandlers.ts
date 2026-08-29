import type {
    ConsolidationSecondaryRef,
    Task,
    TimelineEvent,
} from '../../../LawyerShared';
import { formatConsolidatedChipLabel } from '../../smartFile/caseConsolidationLinking';
import { SmartToast } from '@/app/components/ui/SmartToast';
import { debug } from '@/app/utils/debug';
import type { UseSmartFileProceduralActionsOptions } from '../../smartFile/proceduralTypes';
import { stageTasks, stageTimeline } from '../../smartFile/proceduralTypes';
import { printDossier } from '../../smartFile/printDossier';
import { replaceStageAt } from '../../smartFile/stageImmutable';

export function createProceduralIncidentalLinkHandlers(
    options: UseSmartFileProceduralActionsOptions,
) {
    const {
        stages,
        setStages,
        activeStageIndex,
        parentData,
        setParentData,
        saveToCloud,
        setShowCaseConsolidationModal,
        setShowMaterialErrorModal,
    } = options;

    const handleConsolidationExternalRef = (data: {
        peerCaseNo: string;
        consolidationDate: string;
        notes?: string;
    }) => {
        const stage = stages[activeStageIndex];
        if (!stage) return;
        const primaryCaseNo = String(parentData.caseNo ?? stage.caseNo ?? '').trim();
        const primaryCourt = String(parentData.court ?? stage.court ?? '').trim();
        const primaryJudge = String(parentData.judge ?? stage.judge ?? '').trim();
        const primaryDocType = String(parentData.docType ?? stage.docType ?? '').trim();
        const primaryClaimValue = String(stage.claimValue ?? '').trim();

        const ref: ConsolidationSecondaryRef = {
            id: `cons_ext_${Date.now()}`,
            caseNo: data.peerCaseNo.trim(),
            isExternal: true,
            consolidationDate: data.consolidationDate,
            reason: data.notes,
        };
        const refs = [...(stage.consolidatedSecondaryRefs ?? parentData.consolidationSecondaryRefs ?? []), ref];

        const nextStage = {
            ...stage,
            caseNo: primaryCaseNo || stage.caseNo,
            court: primaryCourt || stage.court,
            judge: primaryJudge || stage.judge,
            docType: primaryDocType || stage.docType,
            claimValue: primaryClaimValue || stage.claimValue,
            consolidatedSecondaryRefs: refs,
            consolidatedWith: formatConsolidatedChipLabel(refs),
            timeline: [
                {
                    id: `consolidation_${Date.now()}`,
                    type: 'milestone',
                    date: data.consolidationDate,
                    title: `🔗 توحيد مرجعي — ${ref.caseNo}`,
                    details: [
                        `تم تسجيل توحيد مرجعي مع الدعوى رقم ${ref.caseNo}`,
                        data.notes ? `السبب: ${data.notes}` : '',
                    ]
                        .filter(Boolean)
                        .join('\n'),
                    isNew: true,
                    tags: ['#توحيد_دعاوى'],
                },
                ...(stageTimeline(stage) || []),
            ],
        };

        const updatedParent = {
            ...parentData,
            caseNo: primaryCaseNo || parentData.caseNo,
            court: primaryCourt || parentData.court,
            judge: primaryJudge || parentData.judge,
            docType: primaryDocType || parentData.docType,
            consolidationSecondaryRefs: refs,
        };
        const updatedStages = replaceStageAt(stages, activeStageIndex, nextStage);
        setParentData(updatedParent);
        setStages(updatedStages);
        saveToCloud(updatedStages, updatedParent);
        SmartToast.success(`تم تسجيل المرجع: ${ref.caseNo}`);
        setShowCaseConsolidationModal(false);
    };

    const handleCaseConsolidation = (data: {
        linkedCaseNo: string;
        consolidationDate: string;
        notes: string;
    }) => {
        handleConsolidationExternalRef({
            peerCaseNo: data.linkedCaseNo,
            consolidationDate: data.consolidationDate,
            notes: data.notes,
        });
    };

    const handleCaseLinkExternal = (data: {
        peerCaseNo: string;
        linkDate: string;
        reason?: string;
    }) => {
        const record = {
            id: `link_ext_${Date.now()}`,
            peerCaseNo: data.peerCaseNo,
            linkDate: data.linkDate,
            reason: data.reason,
            isExternal: true,
        };
        const updatedParent = {
            ...parentData,
            caseLinks: [...(parentData.caseLinks ?? []), record],
        };
        const currentStage = stages[activeStageIndex];
        if (!currentStage) return;
        const nextStage = {
            ...currentStage,
            timeline: [
                {
                    id: `case_link_ext_${Date.now()}`,
                    type: 'milestone' as const,
                    date: data.linkDate,
                    title: `🔗 ربط مرجعي — ${data.peerCaseNo}`,
                    details: [
                        `تم ربط الدعوى المرقمة ${data.peerCaseNo}`,
                        data.reason ? `السبب: ${data.reason}` : '',
                    ]
                        .filter(Boolean)
                        .join('\n'),
                    isNew: true,
                    tags: ['#ربط_دعوى'],
                },
                ...(stageTimeline(currentStage) || []),
            ],
        };
        const updatedStages = replaceStageAt(stages, activeStageIndex, nextStage);
        setParentData(updatedParent);
        setStages(updatedStages);
        saveToCloud(updatedStages, updatedParent);
        SmartToast.success(`تم ربط الدعوى المرقمة: ${data.peerCaseNo}`);
    };

    const handleCorrespondence = (data: { entity: string; date: string; content: string }) => {
        const taskId = `task_corr_${Date.now()}`;
        const newTask: Task = {
            id: taskId,
            title: `مخاطبة — ${data.entity}`,
            details: data.content,
            dueDate: data.date,
            isCompleted: false,
            taskKind: 'correspondence',
            correspondenceEntity: data.entity,
            correspondenceDate: data.date,
            correspondenceContent: data.content,
            correspondenceResponseReceived: null,
        };
        const currentStage = stages[activeStageIndex];
        if (!currentStage) return;
        const nextStage = {
            ...currentStage,
            tasks: [newTask, ...stageTasks(currentStage)],
            timeline: [
                {
                    id: `corr_${Date.now()}`,
                    type: 'note' as const,
                    date: data.date,
                    title: `📨 مخاطبة — ${data.entity}`,
                    details: data.content,
                    isNew: true,
                    tags: ['#مخاطبة'],
                },
                ...(stageTimeline(currentStage) || []),
            ],
        };
        const updatedStages = replaceStageAt(stages, activeStageIndex, nextStage);
        setStages(updatedStages);
        saveToCloud(updatedStages);
        SmartToast.success('تم تسجيل المخاطبة ومتابعتها في المهام');
    };

    const handleCorrespondenceResponse = (taskId: string, received: boolean) => {
        const prevStage = stages[activeStageIndex];
        if (!prevStage) return;
        const nextTasks = stageTasks(prevStage).map((t: Task) => {
            if (t.id !== taskId) return t;
            return {
                ...t,
                correspondenceResponseReceived: received,
                isCompleted: true,
            };
        });
        const nextStage = { ...prevStage, tasks: nextTasks };
        const updatedStages = replaceStageAt(stages, activeStageIndex, nextStage);
        setStages(updatedStages);
        saveToCloud(updatedStages);
        SmartToast.success(received ? 'تم تسجيل استلام الرد' : 'تم تسجيل عدم الرد');
    };

    const handleExportPDF = () => {
        printDossier();
    };

    // طفرات التصحيح المادي تُطبَّق على المرحلة النشطة فقط (لا viewing المؤرشف).
    const handleMaterialErrorCorrection = (data: {
        correctionType: string;
        errorDetails: string;
        requestDate: string;
    }) => {
        try {
            const currentStage = stages[activeStageIndex];
            if (!currentStage) return;

            const newEvent: TimelineEvent = {
                id: Date.now().toString(),
                type: data.correctionType === 'clarification' ? 'note' : 'document',
                title:
                    data.correctionType === 'clarification'
                        ? '📌 طلب توضيح حكم غامض'
                        : '✏️ طلب تصحيح خطأ مادي',
                date: data.requestDate,
                details: data.errorDetails,
            };

            const nextStage = {
                ...currentStage,
                timeline: [...(currentStage.timeline || []), newEvent],
            };
            const updatedStages = replaceStageAt(stages, activeStageIndex, nextStage);
            setStages(updatedStages);
            saveToCloud(updatedStages);

            const successMessage =
                data.correctionType === 'clarification'
                    ? 'تم تسجيل طلب التوضيح بنجاح ✅'
                    : 'تم تسجيل طلب التصحيح بنجاح ✅';

            SmartToast.success(successMessage);
            setShowMaterialErrorModal(null);
        } catch (error) {
            debug.error('❌ خطأ في تسجيل طلب التصحيح/التوضيح:', error);
            SmartToast.error('حدث خطأ أثناء حفظ الطلب');
        }
    };

    return {
        handleConsolidationExternalRef,
        handleCaseConsolidation,
        handleCaseLinkExternal,
        handleCorrespondence,
        handleCorrespondenceResponse,
        handleExportPDF,
        handleMaterialErrorCorrection,
    };
}
