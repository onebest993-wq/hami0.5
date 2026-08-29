import { uuidv4 } from '@/app/services/urgent-actions-db';
import type { CaseHearing } from '../../types';

/** Normalize hearings for judge-decision / terminate patches (shared). */
export function buildNormalizedJudgeHearingsPayload(hearings: unknown): CaseHearing[] {
    const safeHearings = Array.isArray(hearings) ? hearings : [];
    return safeHearings
        .map((h) => {
            if (!h || typeof h !== 'object') return null;
            const stage =
                (h as CaseHearing).stage === 'pre_decision' || (h as CaseHearing).stage === 'grievance'
                    ? (h as CaseHearing).stage
                    : null;
            if (!stage) return null;
            return {
                id: typeof (h as CaseHearing).id === 'string' ? (h as CaseHearing).id : uuidv4(),
                stage,
                sessionDate:
                    typeof (h as CaseHearing).sessionDate === 'string'
                        ? (h as CaseHearing).sessionDate
                        : '',
                notes: typeof (h as CaseHearing).notes === 'string' ? (h as CaseHearing).notes : '',
                nextSessionDate:
                    typeof (h as CaseHearing).nextSessionDate === 'string'
                        ? (h as CaseHearing).nextSessionDate
                        : '',
                createdAt:
                    typeof (h as CaseHearing).createdAt === 'string'
                        ? (h as CaseHearing).createdAt
                        : new Date().toISOString(),
            } satisfies CaseHearing;
        })
        .filter(Boolean) as CaseHearing[];
}
