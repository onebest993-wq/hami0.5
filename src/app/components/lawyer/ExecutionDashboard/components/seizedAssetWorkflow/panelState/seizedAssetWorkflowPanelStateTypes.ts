import type { SeizureAssetKind } from '@/app/domain/seizure/seizureWorkflowTypes';
import type {
    MovableWorkflowStep2Lane,
    MovableWorkflowStepNavRequest,
    SeizedMovableWorkflowPanelProps,
} from '../../seizedMovableWorkflow/seizedMovableWorkflowTypes';
import type {
    PropertyWorkflowStep2Lane,
    PropertyWorkflowStepNavRequest,
    SeizedPropertyWorkflowPanelProps,
} from '../../seizedPropertyWorkflow/seizedPropertyWorkflowTypes';

export type WorkflowStep2Lane = MovableWorkflowStep2Lane | PropertyWorkflowStep2Lane;
export type WorkflowStepNavRequest = MovableWorkflowStepNavRequest | PropertyWorkflowStepNavRequest;

export const MOVABLE_LIVE_TICK_EVENTS = [
    'hami-seized-movable-inline-updated',
    'hami-seized-movable-init-saved',
];
export const PROPERTY_LIVE_TICK_EVENTS = ['hami-seized-property-inline-updated'];

export type UseSeizedAssetWorkflowPanelStateInput =
    | ({ assetKind: 'movable' } & SeizedMovableWorkflowPanelProps)
    | ({ assetKind: 'property' } & SeizedPropertyWorkflowPanelProps);

export function pendingFallbackTitle(
    assetKind: SeizureAssetKind,
    subtype: string,
    mode: 'optimistic' | 'invalidDossier',
): string {
    if (assetKind === 'movable') {
        if (subtype === 'movable_expert_objection') return 'طلب الاعتراض على التقدير — قيد البت';
        if (mode === 'invalidDossier') return 'طلب حجز — قيد البت لدى المنفذ';
        if (subtype === 'movable_expert') return 'طلب انتداب خبراء — قيد البت';
        if (subtype === 'movable_auction_date') return 'طلب موعد مزايدة — قيد البت';
        return 'طلب حجز — قيد البت لدى المنفذ';
    }
    if (subtype === 'property_expert_objection') return 'طلب الاعتراض على التقدير — قيد البت';
    if (mode === 'invalidDossier') return 'طلب حجز — قيد البت لدى المنفذ';
    if (subtype === 'property_expert') return 'طلب انتداب خبراء — قيد البت';
    if (subtype === 'property_auction') return 'طلب موعد مزايدة — قيد البت';
    return 'طلب حجز — قيد البت لدى المنفذ';
}
