import type { Decision } from '../../types';

const CASSATION_APPEAL_RESULTS = new Set(['رد اللائحة', 'نقض القرار', 'تصديق القرار']);

export function inferAppealMethodsUsed(d: Decision): { tadhallum: boolean; tamyeez: boolean } {
    const logs = Array.isArray(d.appealTimelineLogs) ? d.appealTimelineLogs : [];
    const logText = logs.map((l) => l.message).join('\n');
    const appealResult = String(d.appealResult || '').trim();
    const grievanceOutcomeOnly =
        (appealResult === 'قبول التظلم' || appealResult === 'رد التظلم') &&
        d.appealStatus !== 'tamyeez_filed' &&
        d.appealPhase !== 'cassation';
    const tamyeez =
        d.appealStatus === 'tamyeez_filed' ||
        d.appealPhase === 'cassation' ||
        Boolean(String(d.tamyeezDecisionNumber || '').trim()) ||
        CASSATION_APPEAL_RESULTS.has(appealResult) ||
        appealResult === 'نقض القرار' ||
        (!grievanceOutcomeOnly &&
            (d.appealMethod === 'tamyeez' ||
                /تم تسجيل تمييز|تسجيل تمييز|سُجِّل تمييز|تمييز المدين|تمييز وكيل/.test(logText) ||
                (/رد اللائحة|نقض القرار|تصديق القرار/.test(logText) && !/تظلم/.test(logText))));
    const tadhallum =
        d.appealMethod === 'tadhallum' ||
        d.appealPhase === 'grievance' ||
        d.appealStatus === 'tadhallum_filed' ||
        appealResult === 'قبول التظلم' ||
        appealResult === 'رد التظلم' ||
        /تظلم/.test(logText) ||
        /قبول التظلم|رد التظلم/.test(logText);
    return { tadhallum, tamyeez };
}

export { CASSATION_APPEAL_RESULTS };
