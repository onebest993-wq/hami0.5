/**
 * ExecutionFile dossier model — composed from domain slices; public helpers re-exported.
 */
export type { GuarantorFollowupHistoryEntry, GuarantorFollowupState, ProceduralGuaranteeHistoryEntry, ProceduralGuaranteeState } from './executionFileGuarantor';
export {
    guarantorFollowupAwaitingDetailsSave,
    guarantorFollowupCreditorNotationActive,
} from './executionFileGuarantor';
export type { EvictionSubsequentSummonsMeta } from './executionFileEviction';
export type { ExecutionFileCore } from './executionFileCore';
export type { ExecutionFileDebtor } from './executionFileDebtor';
export type { ExecutionFileDecisions } from './executionFileDecisions';
export type { ExecutionFilePartyDeath } from './executionFilePartyDeath';
export type { ExecutionFileOrders } from './executionFileOrders';
export type { ExecutionFileGuarantor } from './executionFileGuarantor';
export type { ExecutionFileEviction } from './executionFileEviction';
export type { ExecutionFileLegacyDisplay } from './executionFileLegacyDisplay';

import type { ExecutionFileCore } from './executionFileCore';
import type { ExecutionFileDebtor } from './executionFileDebtor';
import type { ExecutionFileDecisions } from './executionFileDecisions';
import type { ExecutionFilePartyDeath } from './executionFilePartyDeath';
import type { ExecutionFileOrders } from './executionFileOrders';
import type { ExecutionFileGuarantor } from './executionFileGuarantor';
import type { ExecutionFileEviction } from './executionFileEviction';
import type { ExecutionFileLegacyDisplay } from './executionFileLegacyDisplay';

export interface ExecutionFile
    extends ExecutionFileCore,
        ExecutionFileDebtor,
        ExecutionFileDecisions,
        ExecutionFilePartyDeath,
        ExecutionFileOrders,
        ExecutionFileGuarantor,
        ExecutionFileEviction,
        ExecutionFileLegacyDisplay {}
