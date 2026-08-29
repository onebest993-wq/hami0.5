import fs from 'node:fs';
import path from 'node:path';

const root = 'src/app/components/lawyer/criminal-system';

const headers = {
    'criminalStoreStateDraftSlice.types.ts': `/** Draft & party session actions — slice of CriminalStoreState */
import type {
    CriminalCaseDraft,
    CriminalCaseLocation,
    DefendantAgeCategory,
    SocialInquiryReport,
} from './criminalCaseModel';
import type { GuarantorDetails } from './criminalGuarantorModel';
import type { RevealDefendantIdentityPayload } from './criminalUnknownDefendant';

`,
    'criminalStoreStateEvidenceSlice.types.ts': `/** Evidence, timeline, investigation, procedural — slice of CriminalStoreState */
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

`,
    'criminalStoreStateRequestTrialSlice.types.ts': `/** Lawyer requests, trash, trials, verdict cards — slice of CriminalStoreState */
import type { LawyerRequest } from './criminalCaseModel';
import type {
    CreateLawyerRequestInput,
    CreateLawyerRequestResult,
    FinalizeLawyerRequestInput,
} from './lawyerRequestsEngine';
import type { OrderEnforcementTracking } from '@/app/types/criminal';
import type {
    AddTrialSessionInput,
    FinalizeTrialVerdictInput,
    TrialSessionPreparatoryDecisionInput,
} from './trialSessionsEngine';
import type {
    AddTrialDepositionInput,
    UpdateTrialDepositionPatch,
} from './trialDepositionsEngine';
import type { ModifyTrialChargeInput } from './trialChargeEngine';
import type {
    VerdictCorrectionAppealTrack,
    VerdictInterventionAppealTrack,
    VerdictOrdinaryAppealTrack,
} from './verdictCardsEngine';
import type { VerdictCassationResultSaveInput } from './verdictCassationResultEngine';
import type { StageFinalDecisionFormPayload } from './stageFinalDecisionEngine';
import type { RegisterStageFinalDecisionMeta } from './criminalStageFinalMutations';

`,
    'criminalStoreStateJudicialSlice.types.ts': `/** Judicial lifecycle, party status, seized assets — slice of CriminalStoreState */
import type {
    JudicialAppellantType,
    JudicialCassationAppealPath,
    JudicialDecision,
    OrderEnforcementTracking,
} from '@/app/types/criminal';
import type { DefendantStatus, PhysicalLocation } from './criminalCaseModel';
import type { SeizedAsset } from './criminalSeizedAssetModel';
import type { RecordJudicialCassationResultPayload } from './cassationJudicialForm';

`,
    'criminalStoreStateLifecycleSlice.types.ts': `/** Referrals, case ops, severance, lifecycle — slice of CriminalStoreState */
import type { SeveranceReason } from '@/app/types/criminal';
import type {
    CriminalCase,
    CriminalCaseStage,
    InvestigationPapersAt,
    JudicialSeveranceDraft,
    LegalArticleChange,
    StageConclusion,
} from './criminalCaseModel';
import type {
    InitiateCassationPayload,
    RecordCassationResultPayload,
} from './cassationEngine';
import type { InvestigationReferralTargetStage } from './juvenileInvestigationRules';
import type { MisdemeanorType } from './caseClassificationEngine';
import type { CriminalActionParty } from './criminalStageUtils';

`,
};

for (const [file, header] of Object.entries(headers)) {
    const full = fs.readFileSync(path.join(root, file), 'utf8');
    const idx = full.indexOf('export type CriminalStoreState');
    if (idx < 0) throw new Error('missing export in ' + file);
    let body = full.slice(idx);
    body = body.replace(
        "input: import('./verdictCassationResultEngine').VerdictCassationResultSaveInput,",
        'input: VerdictCassationResultSaveInput,',
    );
    fs.writeFileSync(path.join(root, file), header + body);
    console.log('trimmed', file, '->', (header + body).split(/\n/).length, 'lines');
}
