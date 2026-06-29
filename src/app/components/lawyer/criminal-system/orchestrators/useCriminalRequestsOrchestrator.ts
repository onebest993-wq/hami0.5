import { useState } from 'react';
import type { LawyerRequest, StageConclusion } from '../criminalStore';
import type { DecisionsPartyScope } from '../juvenileInvestigationRules';
import type { PartyBailDraft, PartyDetentionDraft } from '../components/concernedPartyDecisionPickerDraft';
import type { SeizedAssetDraft as AssetSeizureDraftLocal } from '../components/RequestModalEntryLanes';
import type { LawyerRequestModalMode } from '../lawyerRequestStatusMachine';
import type { CriminalRequestsOrchestratorSlice } from './criminalOrchestratorSliceTypes';

/** حالة مودال الطلبات (قضائية + محامي) — المرحلة الأولى من التفكيك */
export function useCriminalRequestsOrchestrator(): CriminalRequestsOrchestratorSlice {
    const [isRequestsModalOpen, setIsRequestsModalOpen] = useState(false);
    const [requestModalLane, setRequestModalLane] = useState<'judicial' | 'lawyer'>('judicial');
    const [reqDate, setReqDate] = useState('');
    const [reqType, setReqType] = useState('');
    const [reqTypeTemplate, setReqTypeTemplate] = useState('');
    const [reqEntryLane, setReqEntryLane] = useState<'judicial' | 'lawyer' | ''>('');
    const [reqJudicialEntryScope, setReqJudicialEntryScope] = useState<DecisionsPartyScope | null>(null);
    const [reqCustomTypeName, setReqCustomTypeName] = useState('');
    const [reqIsAppealable, setReqIsAppealable] = useState(false);
    const [reqNote, setReqNote] = useState('');
    const [reqInvestigationExpirationReason, setReqInvestigationExpirationReason] = useState<
        StageConclusion['expirationReason'] | ''
    >('');
    const [reqInvestigationExpirationCustomDetail, setReqInvestigationExpirationCustomDetail] =
        useState('');
    const [reqStatus, setReqStatus] = useState<LawyerRequest['status']>('pending');
    const [reqJudgeMargin, setReqJudgeMargin] = useState('');
    const [reqDecisionDate, setReqDecisionDate] = useState('');
    const [reqDefendantIds, setReqDefendantIds] = useState<string[]>([]);
    const [reqDetentionStartDate, setReqDetentionStartDate] = useState('');
    const [reqDetentionEndDate, setReqDetentionEndDate] = useState('');
    const [reqDetentionByPartyId, setReqDetentionByPartyId] = useState<
        Record<string, PartyDetentionDraft>
    >({});
    const [reqLegalArticleBasis, setReqLegalArticleBasis] = useState('');
    const [reqReferredCourtName, setReqReferredCourtName] = useState('');
    const [reqBailByPartyId, setReqBailByPartyId] = useState<Record<string, PartyBailDraft>>({});
    const [reqBailUnified, setReqBailUnified] = useState(false);
    const [reqDetentionUnified, setReqDetentionUnified] = useState(false);
    const [reqSeizureSelectedDefendantIds, setReqSeizureSelectedDefendantIds] = useState<string[]>([]);
    const [reqSeizureDraftsByDefendant, setReqSeizureDraftsByDefendant] = useState<
        Record<string, AssetSeizureDraftLocal[]>
    >({});
    const [editingRequestId, setEditingRequestId] = useState<string | null>(null);
    const [requestModalMode, setRequestModalMode] = useState<LawyerRequestModalMode>('create');
    const [quickFinalizeRequest, setQuickFinalizeRequest] = useState<LawyerRequest | null>(null);
    const [quickFinalizeStatus, setQuickFinalizeStatus] = useState<'approved' | 'rejected'>('approved');
    const [quickFinalizeMargin, setQuickFinalizeMargin] = useState('');
    const [quickFinalizeDate, setQuickFinalizeDate] = useState('');
    const [reqIsStarred, setReqIsStarred] = useState(false);
    const [reqDraftAttachments, setReqDraftAttachments] = useState<{ id: string; name: string }[]>([]);
    const [requestMarginModalOpen, setRequestMarginModalOpen] = useState(false);

    return {
        isRequestsModalOpen,
        setIsRequestsModalOpen,
        requestModalLane,
        setRequestModalLane,
        reqDate,
        setReqDate,
        reqType,
        setReqType,
        reqTypeTemplate,
        setReqTypeTemplate,
        reqEntryLane,
        setReqEntryLane,
        reqJudicialEntryScope,
        setReqJudicialEntryScope,
        reqCustomTypeName,
        setReqCustomTypeName,
        reqIsAppealable,
        setReqIsAppealable,
        reqNote,
        setReqNote,
        reqInvestigationExpirationReason,
        setReqInvestigationExpirationReason,
        reqInvestigationExpirationCustomDetail,
        setReqInvestigationExpirationCustomDetail,
        reqStatus,
        setReqStatus,
        reqJudgeMargin,
        setReqJudgeMargin,
        reqDecisionDate,
        setReqDecisionDate,
        reqDefendantIds,
        setReqDefendantIds,
        reqDetentionStartDate,
        setReqDetentionStartDate,
        reqDetentionEndDate,
        setReqDetentionEndDate,
        reqDetentionByPartyId,
        setReqDetentionByPartyId,
        reqLegalArticleBasis,
        setReqLegalArticleBasis,
        reqReferredCourtName,
        setReqReferredCourtName,
        reqBailByPartyId,
        setReqBailByPartyId,
        reqBailUnified,
        setReqBailUnified,
        reqDetentionUnified,
        setReqDetentionUnified,
        reqSeizureSelectedDefendantIds,
        setReqSeizureSelectedDefendantIds,
        reqSeizureDraftsByDefendant,
        setReqSeizureDraftsByDefendant,
        editingRequestId,
        setEditingRequestId,
        requestModalMode,
        setRequestModalMode,
        quickFinalizeRequest,
        setQuickFinalizeRequest,
        quickFinalizeStatus,
        setQuickFinalizeStatus,
        quickFinalizeMargin,
        setQuickFinalizeMargin,
        quickFinalizeDate,
        setQuickFinalizeDate,
        reqIsStarred,
        setReqIsStarred,
        reqDraftAttachments,
        setReqDraftAttachments,
        requestMarginModalOpen,
        setRequestMarginModalOpen,
    };
}
