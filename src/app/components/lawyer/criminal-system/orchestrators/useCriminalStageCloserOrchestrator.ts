import { useState } from 'react';
import type { StageConclusion } from '../criminalStore';
import type {
    CriminalStageCloserOrchestratorSlice,
    StageCloserDecisionType,
} from './criminalOrchestratorSliceTypes';

/** حالة مودال الغلق الختامي للمرحلة / أوامر الإحالة — مستخرَجة من الـ runtime */
export function useCriminalStageCloserOrchestrator(): CriminalStageCloserOrchestratorSlice {
    const [isStageCloserOpen, setIsStageCloserOpen] = useState(false);
    const [stageCloserReferralOnly, setStageCloserReferralOnly] = useState(false);
    const [stageCloserError, setStageCloserError] = useState('');
    const [closureDecisionType, setClosureDecisionType] = useState<StageCloserDecisionType>('');
    const [closureDate, setClosureDate] = useState('');
    const [closureDetails, setClosureDetails] = useState('');
    const [closureDefendantStatus, setClosureDefendantStatus] =
        useState<StageConclusion['defendantStatusAtDecision']>('bailed');
    const [closureExpirationReason, setClosureExpirationReason] = useState<
        StageConclusion['expirationReason'] | ''
    >('');
    const [closureExpirationCustomDetail, setClosureExpirationCustomDetail] = useState('');
    const [closureExpirationDefendantIds, setClosureExpirationDefendantIds] = useState<string[]>([]);
    const [closureReferralStage, setClosureReferralStage] = useState<
        'محكمة الجنح' | 'محكمة الجنايات' | ''
    >('');
    const [closureReferralCourtName, setClosureReferralCourtName] = useState('');
    const [closureReferralCaseNumber, setClosureReferralCaseNumber] = useState('');
    const [closureSuspendedExecution, setClosureSuspendedExecution] = useState(false);
    const [closurePunishmentType, setClosurePunishmentType] = useState<'death' | 'life' | 'other'>(
        'other',
    );
    const [closureJuvenileSeverDefendantId, setClosureJuvenileSeverDefendantId] = useState('');
    const [closureScopedDefendantIds, setClosureScopedDefendantIds] = useState<string[]>([]);
    const [closureSharedObjective269b, setClosureSharedObjective269b] = useState(false);

    return {
        isStageCloserOpen,
        setIsStageCloserOpen,
        stageCloserReferralOnly,
        setStageCloserReferralOnly,
        stageCloserError,
        setStageCloserError,
        closureDecisionType,
        setClosureDecisionType,
        closureDate,
        setClosureDate,
        closureDetails,
        setClosureDetails,
        closureDefendantStatus,
        setClosureDefendantStatus,
        closureExpirationReason,
        setClosureExpirationReason,
        closureExpirationCustomDetail,
        setClosureExpirationCustomDetail,
        closureExpirationDefendantIds,
        setClosureExpirationDefendantIds,
        closureReferralStage,
        setClosureReferralStage,
        closureReferralCourtName,
        setClosureReferralCourtName,
        closureReferralCaseNumber,
        setClosureReferralCaseNumber,
        closureSuspendedExecution,
        setClosureSuspendedExecution,
        closurePunishmentType,
        setClosurePunishmentType,
        closureJuvenileSeverDefendantId,
        setClosureJuvenileSeverDefendantId,
        closureScopedDefendantIds,
        setClosureScopedDefendantIds,
        closureSharedObjective269b,
        setClosureSharedObjective269b,
    };
}
