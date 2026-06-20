import type { DecisionCardEnforcementVisual } from '../../decisionCardGlassShell';

export type DecisionHubStatusPillTone =
    | 'red'
    | 'emerald'
    | 'amber'
    | 'slate'
    | 'violet'
    | 'neutral';

export type CreditorRequestAppealGate =
    | { kind: 'continue' }
    | {
          kind: 'paused';
          message: string;
          showAppealsShortcut: boolean;
          showWaiveCassation: boolean;
      }
    | {
          kind: 'lifecycle_reset';
          message: string;
          showAppealsShortcut: boolean;
      }
    | {
          kind: 'revoked';
          message: string;
          showAppealsShortcut: boolean;
      };

export type CreditorDecisionEnforcementState = {
    visual: DecisionCardEnforcementVisual;
    pillLabel: string;
    pillTone: DecisionHubStatusPillTone;
    enforced: boolean;
};

export type ExecutorRequestFollowupBlock = Exclude<CreditorRequestAppealGate, { kind: 'continue' }>;

export type ExecutorDecisionStatusFlag = 1 | 2 | 3;

export type ManualExecutorWorkflowPhase =
    | 'idle'
    | 'grievance_pending'
    | 'cassation_unlocked'
    | 'cassation_pending';
