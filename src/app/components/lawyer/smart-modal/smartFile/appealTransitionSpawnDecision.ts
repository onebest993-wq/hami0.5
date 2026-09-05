/**
 * قرار إنشاء إضبارة طعن مستقلة عند تأكيد الانتقال.
 * يمنع تخريب رول الإضبارة المفتوحة عند تعدد الطاعنين.
 */
import type { CaseStage } from '@/app/components/lawyer/LawyerShared';
import { shouldSpawnIndependentChallengeDossier } from '@/app/domain/lawsuit/independentChallengeDossier';
import { findPriorFirstInstanceJudgmentIndex } from '@/app/components/lawyer/smart-modal/smartFile/art172AppealStay';

export function resolveAppealTransitionSpawnDecision(params: {
    stages: CaseStage[];
    currentStage: CaseStage;
    activeStageIndex: number;
    appealType: string;
    /** من زر الشريط المسمّى / طعن مستقل — لا تُعدَّل الإضبارة المفتوحة */
    forceIndependentChallengeSpawn?: boolean;
}): {
    spawn: boolean;
    sourceStage: CaseStage;
    sourceStageIndex: number;
} {
    const stages = params.stages ?? [];
    const active = Math.max(0, Math.min(params.activeStageIndex, Math.max(0, stages.length - 1)));
    const current = params.currentStage ?? stages[active];
    const fiIndex = findPriorFirstInstanceJudgmentIndex(stages);
    const fi = fiIndex >= 0 ? stages[fiIndex] : undefined;

    const force = Boolean(params.forceIndependentChallengeSpawn);
    const byCurrent = shouldSpawnIndependentChallengeDossier({
        stages,
        sourceStage: current,
        appealType: params.appealType,
    });
    const byFirstInstance = fi
        ? shouldSpawnIndependentChallengeDossier({
              stages,
              sourceStage: fi,
              appealType: params.appealType,
          })
        : false;

    const spawn = force || byCurrent || byFirstInstance;
    if (!spawn || !current) {
        return {
            spawn: false,
            sourceStage: current,
            sourceStageIndex: active,
        };
    }

    /**
     * مصدر الـhop: المرحلة الحالية إن وُجدت؛ وإلا البداءة.
     * عند force من شريط مسمّى على البداءة قبل hop — المصدر البداءة.
     */
    if (byCurrent || (force && !byFirstInstance)) {
        return { spawn: true, sourceStage: current, sourceStageIndex: active };
    }
    if (fi && fiIndex >= 0 && (byFirstInstance || force)) {
        return { spawn: true, sourceStage: fi, sourceStageIndex: fiIndex };
    }
    return { spawn: true, sourceStage: current, sourceStageIndex: active };
}
