import { useEffect, useRef, useState } from 'react';
import type { CassationType, ProsecutionInterventionBasis } from '@/app/types/criminal';
import type { LegalArticleChange, Statement, TimelineEvent } from './criminalStore';
import type { TrialDeposition } from './trialDepositionsEngine';
import type { VerdictCard } from './verdictCardsEngine';
import type { ProceduralNavTarget } from './proceduralContainersEngine';

type CriminalDashboardIdentityEdit =
    | null
    | {
          mode: 'party';
          kind: 'complainant' | 'defendant';
          id: string;
          fullName: string;
          phone?: string;
          address: string;
      }
    | { mode: 'venue' };

export type CriminalDashboardConfirmAction = {
    title?: string;
    message: string;
    confirmText?: string;
    cancelText?: string;
    onConfirm: () => void;
} | null;

export type CriminalDashboardForfeitureModal = {
    defendantId: string;
    forfeitureNote: string;
} | null;

type UseCriminalDashboardModalUiStateParams = {
    id: string;
};

/**
 * حالة الإدخال/التحرير الخام (state + setters فقط) لمجموعة مودالات وواجهات الـ runtime:
 * التحقيق الابتدائي، التفريق، الإفادات/الأدلة الأخرى/محاضر المرافعة، تحرير الهوية، السلة،
 * إعادة فتح القضية، الإرسال للتمييز، الضم، التعديل القانوني، المصادرة، القرار الختامي للمرحلة،
 * وتنقّل التايم لاين/الإجراءات المرتبطة. المُعالِجات (submit/open) تبقى في الـ runtime.
 * (حالة الغلق الختامي للمرحلة isStageCloserOpen/stageCloserError تبقى في useCriminalStageCloserOrchestrator.)
 */
export function useCriminalDashboardModalUiState({ id }: UseCriminalDashboardModalUiStateParams) {
    const [isInvestigationDecisionOpen, setIsInvestigationDecisionOpen] = useState(false);
    const [investigationDecisionError, setInvestigationDecisionError] = useState('');
    const [isSeveranceOpen, setIsSeveranceOpen] = useState(false);
    const [severanceError, setSeveranceError] = useState('');
    const [isInlineSeveranceFormOpen, setIsInlineSeveranceFormOpen] = useState(false);

    const [linkedTimelineFromProcedural, setLinkedTimelineFromProcedural] = useState<TimelineEvent | null>(null);
    const [proceduralNavTarget, setProceduralNavTarget] = useState<ProceduralNavTarget | null>(null);

    const [isStatementModalOpen, setIsStatementModalOpen] = useState(false);
    const [editingStatement, setEditingStatement] = useState<Statement | null>(null);
    const [isOtherEvidenceFormOpen, setIsOtherEvidenceFormOpen] = useState(false);
    const [isTrialDepositionModalOpen, setIsTrialDepositionModalOpen] = useState(false);
    const [editingTrialDeposition, setEditingTrialDeposition] = useState<TrialDeposition | null>(null);
    const [identityEditError, setIdentityEditError] = useState('');
    const [identityEdit, setIdentityEdit] = useState<CriminalDashboardIdentityEdit>(null);
    const [isTrashModalOpen, setIsTrashModalOpen] = useState(false);

    const [confirmAction, setConfirmAction] = useState<CriminalDashboardConfirmAction>(null);
    const [isReopenCaseOpen, setIsReopenCaseOpen] = useState(false);
    const [reopenCaseReason, setReopenCaseReason] = useState('');
    const [isSendToCassationOpen, setIsSendToCassationOpen] = useState(false);
    const [cassationNumber, setCassationNumber] = useState('');
    const [cassationSentDate, setCassationSentDate] = useState('');
    const [cassationPanelName, setCassationPanelName] = useState('');
    const [cassationType, setCassationType] = useState<CassationType>('criminal_cassation_misdemeanor');
    const [cassationInterventionBasis, setCassationInterventionBasis] =
        useState<ProsecutionInterventionBasis>('prosecutor_general_review');
    const [cassationAppellantIds, setCassationAppellantIds] = useState<string[]>([]);
    const [cassationFilingDetails, setCassationFilingDetails] = useState('');
    const [verdictCassationFilingCard, setVerdictCassationFilingCard] = useState<VerdictCard | null>(null);
    const [isMergeCasesOpen, setIsMergeCasesOpen] = useState(false);
    const [mergeTargetCaseId, setMergeTargetCaseId] = useState('');
    const [mergeReason, setMergeReason] = useState('');

    const [isStageFinalDecisionOpen, setIsStageFinalDecisionOpen] = useState(false);
    const trialFinalDecisionSessionIdRef = useRef<string | null>(null);
    const [stageFinalDecisionError, setStageFinalDecisionError] = useState('');

    const [isLegalEditOpen, setIsLegalEditOpen] = useState(false);
    const [legalArticleNext, setLegalArticleNext] = useState('');
    const [legalChangedBy, setLegalChangedBy] = useState<LegalArticleChange['changedBy']>('trial_court');

    const [forfeitureModal, setForfeitureModal] = useState<CriminalDashboardForfeitureModal>(null);

    useEffect(() => {
        setIsTrashModalOpen(false);
        setIsMergeCasesOpen(false);
        setMergeTargetCaseId('');
        setMergeReason('');
        setIsReopenCaseOpen(false);
        setReopenCaseReason('');
        setIsStageFinalDecisionOpen(false);
        setStageFinalDecisionError('');
        setIsLegalEditOpen(false);
        setConfirmAction(null);
        setForfeitureModal(null);
    }, [id]);

    return {
        isInvestigationDecisionOpen,
        setIsInvestigationDecisionOpen,
        investigationDecisionError,
        setInvestigationDecisionError,
        isSeveranceOpen,
        setIsSeveranceOpen,
        severanceError,
        setSeveranceError,
        isInlineSeveranceFormOpen,
        setIsInlineSeveranceFormOpen,
        linkedTimelineFromProcedural,
        setLinkedTimelineFromProcedural,
        proceduralNavTarget,
        setProceduralNavTarget,
        isStatementModalOpen,
        setIsStatementModalOpen,
        editingStatement,
        setEditingStatement,
        isOtherEvidenceFormOpen,
        setIsOtherEvidenceFormOpen,
        isTrialDepositionModalOpen,
        setIsTrialDepositionModalOpen,
        editingTrialDeposition,
        setEditingTrialDeposition,
        identityEditError,
        setIdentityEditError,
        identityEdit,
        setIdentityEdit,
        isTrashModalOpen,
        setIsTrashModalOpen,
        confirmAction,
        setConfirmAction,
        isReopenCaseOpen,
        setIsReopenCaseOpen,
        reopenCaseReason,
        setReopenCaseReason,
        isSendToCassationOpen,
        setIsSendToCassationOpen,
        cassationNumber,
        setCassationNumber,
        cassationSentDate,
        setCassationSentDate,
        cassationPanelName,
        setCassationPanelName,
        cassationType,
        setCassationType,
        cassationInterventionBasis,
        setCassationInterventionBasis,
        cassationAppellantIds,
        setCassationAppellantIds,
        cassationFilingDetails,
        setCassationFilingDetails,
        verdictCassationFilingCard,
        setVerdictCassationFilingCard,
        isMergeCasesOpen,
        setIsMergeCasesOpen,
        mergeTargetCaseId,
        setMergeTargetCaseId,
        mergeReason,
        setMergeReason,
        isStageFinalDecisionOpen,
        setIsStageFinalDecisionOpen,
        trialFinalDecisionSessionIdRef,
        stageFinalDecisionError,
        setStageFinalDecisionError,
        isLegalEditOpen,
        setIsLegalEditOpen,
        legalArticleNext,
        setLegalArticleNext,
        legalChangedBy,
        setLegalChangedBy,
        forfeitureModal,
        setForfeitureModal,
    };
}

export type CriminalDashboardModalUiState = ReturnType<typeof useCriminalDashboardModalUiState>;
