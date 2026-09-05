import { isFirstInstanceStageName, isAppealStageName } from '../../smartFile/judgmentTypes';
import { isAbsentObjectionStageName } from '../../smartFile/absentJudgmentStageNames';

export function pickNonemptyString(...values: unknown[]): string {
    for (const value of values) {
        const text = String(value ?? '').trim();
        if (text) return text;
    }
    return '';
}

export function readFileDetailsField(file: Record<string, unknown>, key: string): string {
    const details = file.details;
    if (!details || typeof details !== 'object') return '';
    const raw = (details as Record<string, unknown>)[key];
    return typeof raw === 'string' ? raw.trim() : '';
}

/** محكمة/قاضي المرحلة الحالية: لا وراثة من الملف بعد مغادرة البداءة. */
export function resolveHeaderCourtAndJudge(input: {
    stageName?: string | null;
    stageCourt?: unknown;
    stageJudge?: unknown;
    fileCourt?: unknown;
    fileJudge?: unknown;
    parentCourt?: unknown;
    parentJudge?: unknown;
    firstInstanceCourt?: unknown;
    firstInstanceJudge?: unknown;
    /** إضبارة طعن مستقلة: محكمة/رقم هذه البطاقة، لا وراثة البداءة. */
    useFileCourtAsAppealIdentity?: boolean;
}): { court: string; judge: string } {
    const stageName = String(input.stageName ?? '').trim();
    const stageCourt = pickNonemptyString(input.stageCourt);
    const stageJudge = pickNonemptyString(input.stageJudge);
    if (isFirstInstanceStageName(stageName) || isAbsentObjectionStageName(stageName)) {
        return {
            court: pickNonemptyString(
                stageCourt,
                input.fileCourt,
                input.parentCourt,
                input.firstInstanceCourt,
            ),
            judge: pickNonemptyString(
                stageJudge,
                input.fileJudge,
                input.parentJudge,
                input.firstInstanceJudge,
            ),
        };
    }
    const firstInstanceCourt = pickNonemptyString(input.firstInstanceCourt);
    let court = stageCourt;
    if (court && firstInstanceCourt && court === firstInstanceCourt) {
        court = '';
    }
    if (!court && input.useFileCourtAsAppealIdentity) {
        court = pickNonemptyString(input.fileCourt, input.parentCourt);
        if (court && firstInstanceCourt && court === firstInstanceCourt) {
            court = '';
        }
    }
    return { court, judge: '' };
}
