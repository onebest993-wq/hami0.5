/** Evidence, timeline, investigation, procedural — slice of CriminalStoreState */
import type {
    ExhibitLifecycleStatus,
    InvestigationLog,
    OtherEvidenceItem,
    Statement,
    TimelineEvent,
} from './criminalCaseModel';
import type {
    ProceduralContainer,
    ProceduralSubItem,
    ProceduralSubItemPatch,
} from './proceduralContainersEngine';
import type { SandboxTemplateId } from './proceduralSandboxToolkit';

export type CriminalStoreStateEvidenceActions = {
    addStatement: (caseId: string, statement: Statement) => string | null;
    addOtherEvidenceItem: (caseId: string, item: OtherEvidenceItem) => string | null;
    removeOtherEvidenceItem: (caseId: string, itemId: string) => string | null;
    moveOtherEvidenceToTrash: (caseId: string, itemId: string) => string | null;
    updateStatement: (caseId: string, statementId: string, updatedData: Partial<Omit<Statement, 'id'>>) => void;
    addTimelineEvent: (caseId: string, event: TimelineEvent) => void;
    deleteTimelineEvent: (caseId: string, eventId: string) => void;
    deleteStatement: (caseId: string, statementId: string) => void;
    moveStatementToTrash: (caseId: string, statementId: string) => string | null;
    addInvestigationLog: (caseId: string, log: InvestigationLog) => void;
    updateInvestigationLog: (caseId: string, logId: string, updatedData: Partial<Omit<InvestigationLog, 'id'>>) => void;
    /** إكمال كتاب/تقرير — لا تعديل رجعي للحالة. */
    completeInvestigationLetter: (
    caseId: string,
    logId: string,
    payload: { responseNotes?: string; receivedDate?: string },
    ) => string | null;
    /** تحديث دورة حياة مبرز فقط. */
    updateInvestigationLogExhibitLifecycle: (
    caseId: string,
    logId: string,
    lifecycle: ExhibitLifecycleStatus,
    ) => string | null;
    deleteInvestigationLog: (caseId: string, logId: string) => void;
    moveInvestigationLogToTrash: (caseId: string, logId: string) => string | null;
    setProceduralContainers: (caseId: string, containers: ProceduralContainer[]) => void;
    addRootProceduralContainer: (
    caseId: string,
    input: { title: string; color: string; icon: string },
    ) => void;
    updateProceduralContainer: (
    caseId: string,
    containerId: string,
    patch: Partial<
    Pick<ProceduralContainer, 'title' | 'color' | 'icon' | 'collapsed' | 'pathStatus' | 'pathEndedAt'>
    >,
    ) => void;
    deleteProceduralContainer: (caseId: string, containerId: string) => void;
    moveProceduralContainerToTrash: (caseId: string, containerId: string) => string | null;
    reorderRootProceduralContainers: (caseId: string, fromId: string, toId: string) => void;
    addProceduralSubItem: (caseId: string, parentId: string, item: ProceduralSubItem) => void;
    updateProceduralSubItem: (
    caseId: string,
    parentId: string,
    itemId: string,
    patch: ProceduralSubItemPatch,
    ) => void;
    deleteProceduralSubItem: (caseId: string, parentId: string, itemId: string) => void;
    moveProceduralSubItemToTrash: (caseId: string, parentId: string, itemId: string) => string | null;
    duplicateProceduralSubItem: (caseId: string, parentId: string, itemId: string) => void;
    moveProceduralSubItem: (
    caseId: string,
    fromParentId: string,
    toParentId: string,
    itemId: string,
    toIndex: number,
    ) => void;
    moveProceduralContainer: (
    caseId: string,
    containerId: string,
    newParentId: string | null,
    toIndex: number,
    ) => void;
    advanceProceduralActionPhase: (
    caseId: string,
    parentId: string,
    actionId: string,
    opts?: { spawnChildTitle?: string; spawnChildColor?: string; spawnChildIcon?: string },
    ) => void;
    recordProceduralCanvasAudit: (caseId: string, summary: string) => void;
    applyProceduralSandboxTemplate: (caseId: string, templateId: SandboxTemplateId) => void;
    duplicateProceduralContainer: (caseId: string, containerId: string) => void;
};
