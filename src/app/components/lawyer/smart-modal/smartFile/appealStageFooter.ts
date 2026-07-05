import type { CaseStage } from '../../LawyerShared';
import {
    isAppealStageName,
    isAwaitingOpponentAppeal,
    isCassationStageName,
} from './judgmentTypes';

export type AppealStageFooterKind = 'register_opponent_cassation' | 'file_cassation';

export type AppealStageFooterEligibility = {
    show: boolean;
    kind: AppealStageFooterKind | null;
};

export function shouldPreferPleadingCloseFooter(stage: CaseStage | undefined | null): boolean {
    if (!stage?.wasReopened) return false;
    if (stage.isPleadingsClosed && (Boolean(stage.finalDecision) || Boolean(stage.decisionDate))) {
        return false;
    }
    return !isCassationStageName(String(stage.stageName ?? ''));
}

function stageHasActiveCassation(stages: CaseStage[]): boolean {
    return stages.some((s) => {
        if (!isCassationStageName(String(s.stageName ?? ''))) return false;
        return s.status !== 'locked' && s.status !== 'completed';
    });
}

function isTerminalAppealDecision(finalDecision: string): boolean {
    return (
        finalDecision.includes('مكتسبة الدرجة القطعية')
        || finalDecision.includes('مبطلة')
        || finalDecision === 'منتهية'
    );
}

/** تذييل الطعن/التمييز بعد ختام مرافعة الاستئناف */
export function resolveAppealStageFooterEligibility(
    stage: CaseStage | undefined | null,
    fileStatus: string | null | undefined,
    stages: CaseStage[],
): AppealStageFooterEligibility {
    if (!stage || !isAppealStageName(stage.stageName)) {
        return { show: false, kind: null };
    }
    if (!stage.isPleadingsClosed) return { show: false, kind: null };
    if (stage.status === 'locked' || stage.status === 'completed') {
        return { show: false, kind: null };
    }
    if (stageHasActiveCassation(stages)) {
        return { show: false, kind: null };
    }

    const fd = String(stage.finalDecision ?? '');
    const st = String(fileStatus ?? '');

    if (isTerminalAppealDecision(fd)) {
        return { show: false, kind: null };
    }

    const awaitingOpponentCassation =
        stage.awaitingOpponentAppeal === true
        || isAwaitingOpponentAppeal(fd)
        || fd.includes('بانتظار التمييز')
        || fd.includes('بانتظار تمييز')
        || fd.includes('لصالح الموكل')
        || st.includes('بانتظار التمييز');

    if (awaitingOpponentCassation && !fd.includes('ضد الموكل')) {
        return { show: true, kind: 'register_opponent_cassation' };
    }

    if (
        fd.includes('ضد الموكل')
        || fd.includes('بانتظار الطعن')
        || Boolean(stage.decisionDate)
    ) {
        return { show: true, kind: 'file_cassation' };
    }

    return { show: false, kind: null };
}
