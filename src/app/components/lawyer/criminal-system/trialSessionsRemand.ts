/**
 * إعادة فتح أضبارة المحاكمة بعد نقض وإعادة — منفصل عن trialSessionsEngine
 * لكسر دورة import مع verdictCassationResultEngine.
 */
import { normalizeTrialSessions, type TrialSession } from './trialSessionsEngine';

/** إعادة فتح أضبارة المحاكمة بعد نقض وإعادة — لتمكين جلسات جديدة. */
export function reopenTrialDossierAfterCassationRemand(sessions: unknown): TrialSession[] {
    const list = normalizeTrialSessions(sessions);
    return list.map((s) => {
        const withoutVerdict =
            s.status === 'verdict_issued'
                ? (() => {
                      const { verdict: _verdict, ...rest } = s;
                      return { ...rest, status: 'postponed' as const };
                  })()
                : s;
        return {
            ...withoutVerdict,
            trialRound: withoutVerdict.trialRound ?? ('initial' as const),
        };
    });
}
