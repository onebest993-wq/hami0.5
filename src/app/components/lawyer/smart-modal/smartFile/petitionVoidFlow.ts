import type { CaseStage } from '../../LawyerShared';
import { isAppealStageName, isCassationStageName, isFirstInstanceStageName } from './judgmentTypes';

export const PETITION_VOID_APPEAL_DAYS = 7;

type PetitionVoidFlowStatus =
    | 'registered'
    | 'appeal_pending'
    | 'upheld_closed'
    | 'quash_revived'
    | 'waived';

type PetitionVoidFlow = {
    status: PetitionVoidFlowStatus;
    voidLabel: string;
    registeredDate: string;
    appealFiledDate?: string;
    revivalDeadline?: string;
};

const PETITION_VOID_JUDGMENT_VALUES = [
    'إبطال',
    'إبطال عريضة الاستئناف',
    'إبطال عريضة الدعوى وعريضة التدخل',
    'إبطال عريضة الدعوى',
    'إبطال عريضة الاعتراض',
] as const;

export function resolvePetitionVoidMenuLabel(stageName?: string | null): string {
    const name = String(stageName ?? '').trim();
    if (isCassationStageName(name)) return 'إبطال عريضة التمييز';
    if (isAppealStageName(name)) return 'إبطال عريضة الاستئناف';
    if (name.includes('اعتراض')) return 'إبطال عريضة الاعتراض';
    if (isFirstInstanceStageName(name) || !name) return 'إبطال عريضة الدعوى';
    return 'إبطال العريضة';
}

export function shouldShowPetitionVoidMenuAction(stage?: CaseStage | null): boolean {
    if (!stage || stage.isVoided) return false;
    if (stage.isPleadingsClosed && !stage.petitionVoidFlow) return false;
    const flow = stage.petitionVoidFlow;
    if (!flow) return true;
    return flow.status === 'upheld_closed' || flow.status === 'waived';
}

export function shouldShowPetitionVoidFooterPanel(stage?: CaseStage | null): boolean {
    const flow = stage?.petitionVoidFlow;
    if (!flow) return false;
    return flow.status === 'registered' || flow.status === 'appeal_pending' || flow.status === 'quash_revived';
}

export function filterPetitionVoidFromJudgmentOptions<T extends { value: string }>(options: T[]): T[] {
    const blocked = new Set<string>(PETITION_VOID_JUDGMENT_VALUES);
    return options.filter((o) => !blocked.has(o.value));
}

export function daysRemainingPetitionVoidRevival(deadline?: string | null, today = new Date()): number | null {
    if (!deadline) return null;
    const end = new Date(deadline);
    if (Number.isNaN(end.getTime())) return null;
    const start = new Date(today);
    start.setHours(0, 0, 0, 0);
    end.setHours(0, 0, 0, 0);
    return Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
}

export function isPetitionVoidRevivalExpired(flow?: PetitionVoidFlow | null, today = new Date()): boolean {
    if (flow?.status !== 'quash_revived' || !flow.revivalDeadline) return false;
    const days = daysRemainingPetitionVoidRevival(flow.revivalDeadline, today);
    return days !== null && days < 0;
}
