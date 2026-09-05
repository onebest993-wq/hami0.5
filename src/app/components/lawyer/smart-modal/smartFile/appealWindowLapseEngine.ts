import type { CaseStage, TimelineEvent } from '../../LawyerShared';
import { getLocalTodayYmd } from '@/app/utils/localYmd';
import {
    computeCassationDeadline,
    computeFirstInstanceAppealDeadline,
    isAppealDeadlineExpired,
    resolveStageCassationDeadline,
} from './appealDeadlineEngine';
import { isAppealStageName } from './judgmentStageNames';

export const APPEAL_WINDOW_LAPSE_METHOD = 'انتهاء المدة الاستئنافية';
export const CASSATION_WINDOW_LAPSE_METHOD = 'انتهاء المدة التمييزية';

export function isAppealWindowLapseMethod(value: string | null | undefined): boolean {
    return String(value ?? '').trim() === APPEAL_WINDOW_LAPSE_METHOD;
}

export function isCassationWindowLapseMethod(value: string | null | undefined): boolean {
    return String(value ?? '').trim() === CASSATION_WINDOW_LAPSE_METHOD;
}

type LapseStage = Pick<
    CaseStage,
    | 'decisionDate'
    | 'appealDeadline'
    | 'legalTimers'
    | 'stageName'
    | 'appealWindowLapsed'
    | 'cassationWindowLapsed'
    | 'awaitingOpponentAppeal'
>;

function resolveAppealDeadlineYmd(stage?: LapseStage | null): string | null {
    const stored = String(stage?.appealDeadline ?? stage?.legalTimers?.appealDeadline ?? '')
        .trim()
        .slice(0, 10);
    if (stored) return stored;
    if (isAppealStageName(stage?.stageName)) return null;
    const decision = String(stage?.decisionDate ?? '').trim().slice(0, 10);
    if (!decision) return null;
    return computeFirstInstanceAppealDeadline(decision);
}

export function shouldOfferAppealWindowLapse(
    stage?: LapseStage | null,
    today?: Date,
): boolean {
    if (!stage) return false;
    if (stage.appealWindowLapsed) return false;
    if (stage.cassationWindowLapsed) return false;
    if (isAppealStageName(stage.stageName)) return false;
    const deadline = resolveAppealDeadlineYmd(stage);
    if (!deadline) return false;
    return isAppealDeadlineExpired(deadline, today);
}

export function shouldOfferCassationWindowLapse(
    stage?: LapseStage | null,
    today?: Date,
): boolean {
    if (!stage) return false;
    if (stage.cassationWindowLapsed) return false;
    const onAppeal = isAppealStageName(stage.stageName);
    if (!onAppeal && !stage.appealWindowLapsed) return false;
    const deadline = resolveStageCassationDeadline(stage);
    if (!deadline) {
        const decision = String(stage?.decisionDate ?? '').trim().slice(0, 10);
        if (!decision) return false;
        return isAppealDeadlineExpired(computeCassationDeadline(decision), today);
    }
    return isAppealDeadlineExpired(deadline, today);
}

export function filterOpponentMethodsAfterLapse(
    methods: string[],
    stage?: Pick<CaseStage, 'appealWindowLapsed' | 'cassationWindowLapsed'> | null,
): string[] {
    if (stage?.cassationWindowLapsed) return [];
    if (!stage?.appealWindowLapsed) return methods;
    return methods.filter((method) => String(method).includes('تمييز'));
}

function prependTimeline(stage: CaseStage, event: TimelineEvent): TimelineEvent[] {
    return [event, ...(stage.timeline ?? [])];
}

export function applyAppealWindowLapse(
    stage: CaseStage,
    recordedAt = getLocalTodayYmd(),
): Partial<CaseStage> {
    const event: TimelineEvent = {
        id: `appeal_lapse_${recordedAt}_${Date.now()}`,
        type: 'decision',
        date: recordedAt,
        title: APPEAL_WINDOW_LAPSE_METHOD,
        details: 'سُجّل انتهاء مدة الاستئناف دون تقديم طعن. يبقى طريق التمييز قائماً.',
        isSystemLog: true,
        isNew: true,
    };
    return {
        appealWindowLapsed: true,
        awaitingOpponentAppeal: true,
        finalDecision: 'انتهت مدة الاستئناف — يبقى طريق التمييز',
        timeline: prependTimeline(stage, event),
    };
}

export function applyCassationWindowLapse(
    stage: CaseStage,
    recordedAt = getLocalTodayYmd(),
): Partial<CaseStage> {
    const event: TimelineEvent = {
        id: `cassation_lapse_${recordedAt}_${Date.now()}`,
        type: 'decision',
        date: recordedAt,
        title: CASSATION_WINDOW_LAPSE_METHOD,
        details: 'سُجّل انتهاء مدة التمييز دون تقديم طعن.',
        isSystemLog: true,
        isNew: true,
    };
    return {
        cassationWindowLapsed: true,
        appealWindowLapsed: true,
        awaitingOpponentAppeal: false,
        status: 'completed',
        finalDecision: 'مكتسبة الدرجة القطعية',
        timeline: prependTimeline(stage, event),
    };
}

const DEADLINE_TEACHING_LINE_RES: RegExp[] = [
    /^مواعيد الطعن/i,
    /15 يوماً/,
    /شهر من (تاريخ )?صدور/,
    /آخر موعد للاستئناف/,
    /آخر موعد للتمييز/,
    /آخر مهلة لل/,
    /متبقي\s*\d+\s*يوم/,
    /انتهاء المدة القانونية للطعن/,
    /بانتظار انتهاء المدة القانونية/,
    /حتى\s+\d{4}-\d{2}-\d{2}/,
    /آخر موعد للتمييز:/,
    /آخر موعد قانوني/,
    /^مهلة الاعتراض/,
    /مهلة الاعتراض:/,
    /أيام من تاريخ التبليغ/,
];

export function stripDeadlineTeachingLines(body: string): string {
    return body
        .split('\n')
        .map((line) => line.trim())
        .filter((line) => line && !DEADLINE_TEACHING_LINE_RES.some((re) => re.test(line)))
        .join('\n')
        .trim();
}
