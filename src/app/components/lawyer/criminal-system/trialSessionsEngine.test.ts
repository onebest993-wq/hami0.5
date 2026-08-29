import { describe, expect, it } from 'vitest';
import {
    appealCountdownSnapshot,
    cassationRoutingGuide,
    computeAppealDeadline,
    findCurrentPendingTrialSession,
    findTrialVerdictSession,
    isTrialDossierConcluded,
    normalizeTrialSessions,
    resolveTrialPresenceFieldConfig,
    sanitizeTrialSessionIsoDateInput,
    sortTrialSessionsAsc,
    sortTrialSessionsDesc,
    inferDecisionPresenceFromTrialSessions,
    isTrialSessionPostCassationRemand,
    resolveCassationRemandRetrialPivotDate,
    suggestNextSessionNumber,
    validateTrialSessionIsoDate,
    isTrialSessionNumberTaken,
    validateTrialSessionNumberUnique,
    isPhantomScheduledTrialSession,
    prunePhantomScheduledTrialSessions,
    filterTrialSessionsForDisplay,
} from './trialSessionsEngine';
import { reopenTrialDossierAfterCassationRemand } from './trialSessionsRemand';
import type { TrialSession } from './trialSessionsEngine';

describe('trialSessionsEngine', () => {
    it('computes appeal deadline 30 days after verdict', () => {
        expect(computeAppealDeadline('2026-01-01')).toBe('2026-01-31');
    });

    it('routes felony to federal cassation court', () => {
        const guide = cassationRoutingGuide('felony');
        expect(guide.courtLabel).toContain('التمييز الاتحادية');
        expect(guide.warningText).toContain('صدر الحكم وجاهياً');
    });

    it('routes misdemeanor to appellate cassation', () => {
        const guide = cassationRoutingGuide('misdemeanor');
        expect(guide.courtLabel).toContain('الاستئناف');
    });

    it('routes by current accusation article when modified to misdemeanor', () => {
        const guide = cassationRoutingGuide('felony', { currentAccusationArticle: '413', crimeType: 'جناية' });
        expect(guide.courtLabel).toContain('الاستئناف');
    });

    it('resolveTrialPresenceFieldConfig switches labels after session 1', () => {
        expect(resolveTrialPresenceFieldConfig('1').label).toContain('الوصف الكلي');
        expect(resolveTrialPresenceFieldConfig('1').options.map((o) => o.label)).toEqual([
            'وجاهي',
            'غيابي',
        ]);
        expect(resolveTrialPresenceFieldConfig('2').label).toContain('في هذه الجلسة');
        expect(resolveTrialPresenceFieldConfig('2').options.map((o) => o.label)).toEqual([
            'حضر المتهم',
            'لم يحضر المتهم',
        ]);
    });

    it('validateTrialSessionIsoDate rejects implausible years', () => {
        expect(validateTrialSessionIsoDate('0666-06-06')).toMatch(/سنة/);
        expect(validateTrialSessionIsoDate('2026-06-06')).toBeNull();
        expect(sanitizeTrialSessionIsoDateInput('0666-06-06')).toBe('');
        expect(sanitizeTrialSessionIsoDateInput('2026-06-06')).toBe('2026-06-06');
    });

    it('sorts sessions oldest to newest by session number', () => {
        const sessions: TrialSession[] = [
            {
                id: '2',
                date: '2026-02-01',
                sessionNumber: '2',
                presenceStatus: 'present',
                sessionNotes: '',
                status: 'pending',
            },
            {
                id: '1',
                date: '2026-01-01',
                sessionNumber: '1',
                presenceStatus: 'absent',
                sessionNotes: '',
                status: 'verdict_issued',
            },
        ];
        const sorted = sortTrialSessionsAsc(sessions);
        expect(sorted[0]?.id).toBe('1');
        expect(sorted[1]?.id).toBe('2');
    });

    it('sorts trial sessions descending (newest first)', () => {
        const sessions: TrialSession[] = [
            {
                id: '2',
                date: '2026-02-01',
                sessionNumber: '2',
                presenceStatus: 'present',
                sessionNotes: '',
                status: 'pending',
            },
            {
                id: '1',
                date: '2026-01-01',
                sessionNumber: '1',
                presenceStatus: 'absent',
                sessionNotes: '',
                status: 'verdict_issued',
            },
        ];
        const sorted = sortTrialSessionsDesc(sessions);
        expect(sorted[0]?.id).toBe('2');
        expect(sorted[1]?.id).toBe('1');
    });

    it('infers وجاهي when any session marks defendant present', () => {
        const sessions: TrialSession[] = [
            {
                id: '1',
                date: '2026-01-01',
                sessionNumber: '1',
                presenceStatus: 'absent',
                sessionNotes: '',
                status: 'postponed',
            },
            {
                id: '2',
                date: '2026-02-01',
                sessionNumber: '2',
                presenceStatus: 'present',
                sessionNotes: '',
                status: 'pending',
            },
        ];
        expect(inferDecisionPresenceFromTrialSessions(sessions)).toBe('وجاهي');
    });

    it('infers غيابي when no session marks defendant present', () => {
        const sessions: TrialSession[] = [
            {
                id: '1',
                date: '2026-01-01',
                sessionNumber: '1',
                presenceStatus: 'absent',
                sessionNotes: '',
                status: 'postponed',
            },
        ];
        expect(inferDecisionPresenceFromTrialSessions(sessions)).toBe('غيابي');
        expect(inferDecisionPresenceFromTrialSessions([])).toBe('غيابي');
    });

    it('normalizes trial sessions array', () => {
        const list = normalizeTrialSessions([
            {
                id: 's1',
                date: '2026-05-01',
                sessionNumber: '1',
                presenceStatus: 'present',
                sessionNotes: 'مرافعة',
                status: 'pending',
            },
            { id: '', date: 'bad' },
        ]);
        expect(list.length).toBe(1);
        expect(list[0]?.sessionNotes).toBe('مرافعة');
    });

    it('suggests next session number after highest unique number', () => {
        expect(
            suggestNextSessionNumber([
                {
                    id: 'a',
                    date: '2026-01-01',
                    sessionNumber: '3',
                    presenceStatus: 'present',
                    sessionNotes: '',
                    status: 'postponed',
                },
            ]),
        ).toBe('4');
        expect(
            suggestNextSessionNumber([
                {
                    id: 'a',
                    date: '2026-01-01',
                    sessionNumber: '3',
                    presenceStatus: 'present',
                    sessionNotes: '',
                    status: 'postponed',
                },
                {
                    id: 'b',
                    date: '2026-02-01',
                    sessionNumber: '3',
                    presenceStatus: 'present',
                    sessionNotes: '',
                    status: 'postponed',
                },
            ]),
        ).toBe('4');
    });

    it('detects duplicate session numbers', () => {
        const sessions: TrialSession[] = [
            {
                id: 'a',
                date: '2026-01-01',
                sessionNumber: '2',
                presenceStatus: 'present',
                sessionNotes: '',
                status: 'postponed',
            },
        ];
        expect(isTrialSessionNumberTaken(sessions, '2')).toBe(true);
        expect(isTrialSessionNumberTaken(sessions, '2', 'a')).toBe(false);
        expect(validateTrialSessionNumberUnique(sessions, '3')).toBeNull();
    });

    it('countdown marks expired deadlines', () => {
        const snap = appealCountdownSnapshot('2020-01-01', Date.parse('2026-01-01'));
        expect(snap.expired).toBe(true);
    });

    it('finds current pending session and concluded dossier', () => {
        const sessions: TrialSession[] = [
            {
                id: '1',
                date: '2026-01-01',
                sessionNumber: '1',
                presenceStatus: 'present',
                sessionNotes: '',
                status: 'postponed',
            },
            {
                id: '2',
                date: '2026-02-01',
                sessionNumber: '2',
                presenceStatus: 'present',
                sessionNotes: '',
                status: 'pending',
            },
        ];
        expect(findCurrentPendingTrialSession(sessions)?.id).toBe('2');
        expect(isTrialDossierConcluded(sessions)).toBe(false);

        const concluded: TrialSession[] = [
            ...sessions.slice(0, 1),
            {
                ...sessions[1]!,
                status: 'verdict_issued',
                verdict: {
                    outcome: 'acquittal',
                    presenceType: 'in_person_verdict',
                    date: '2026-02-01',
                    appealDeadline: computeAppealDeadline('2026-02-01'),
                },
            },
        ];
        expect(findTrialVerdictSession(concluded)?.verdict?.outcome).toBe('acquittal');
        expect(isTrialDossierConcluded(concluded)).toBe(true);
        expect(findCurrentPendingTrialSession(concluded)).toBeNull();
    });

    it('reopenTrialDossierAfterCassationRemand unlocks concluded dossier for new sessions', () => {
        const sessions = normalizeTrialSessions([
            {
                id: 's1',
                sessionNumber: '1',
                date: '2026-05-01',
                presenceStatus: 'present',
                sessionNotes: '',
                status: 'verdict_issued',
                verdict: {
                    outcome: 'conviction',
                    date: '2026-05-01',
                    appealDeadline: computeAppealDeadline('2026-05-01'),
                },
            },
        ]);
        const reopened = reopenTrialDossierAfterCassationRemand(sessions);
        expect(isTrialDossierConcluded(reopened)).toBe(false);
        expect(reopened[0]?.status).toBe('postponed');
        expect(reopened[0]?.verdict).toBeUndefined();
        expect(reopened[0]?.trialRound).toBe('initial');
    });

    it('resolveCassationRemandRetrialPivotDate reads verdict card remand date', () => {
        const pivot = resolveCassationRemandRetrialPivotDate([
            {
                id: 'v1',
                outcome: 'conviction',
                issuedAt: '2026-04-01',
                appealDeadline: '2026-05-01',
                ordinaryAppeal: {
                    result: 'verdict_quash_remand_retrial',
                    resultRecordedAt: '2026-06-10',
                },
            },
        ] as any);
        expect(pivot).toBe('2026-06-10');
    });

    it('isTrialSessionPostCassationRemand marks post-remand sessions', () => {
        const sessions = normalizeTrialSessions([
            {
                id: 's1',
                sessionNumber: '1',
                date: '2026-05-01',
                presenceStatus: 'present',
                sessionNotes: '',
                status: 'postponed',
                trialRound: 'initial',
            },
            {
                id: 's2',
                sessionNumber: '4',
                date: '2026-06-15',
                presenceStatus: 'present',
                sessionNotes: '',
                status: 'pending',
                trialRound: 'post_cassation_remand',
            },
        ]);
        expect(isTrialSessionPostCassationRemand(sessions[1]!, '2026-06-10', sessions)).toBe(true);
        expect(isTrialSessionPostCassationRemand(sessions[0]!, '2026-06-10', sessions)).toBe(false);
    });

    it('prunes phantom scheduled session that duplicates nextHearingDate', () => {
        const phantom = normalizeTrialSessions([
            {
                id: 's1',
                sessionNumber: '1',
                date: '2026-07-31',
                presenceStatus: 'present',
                sessionNotes: '',
                status: 'pending',
            },
        ])[0]!;
        expect(isPhantomScheduledTrialSession(phantom, '2026-07-31', [phantom])).toBe(true);
        expect(prunePhantomScheduledTrialSessions([phantom], '2026-07-31')).toEqual([]);
        expect(filterTrialSessionsForDisplay([phantom], '2026-07-31')).toEqual([]);
    });

    it('does not treat user-origin session as phantom even on hearing date', () => {
        const userSession = normalizeTrialSessions([
            {
                id: 's1',
                sessionNumber: '1',
                date: '2026-07-31',
                presenceStatus: 'present',
                sessionNotes: '',
                status: 'pending',
                origin: 'user',
            },
        ])[0]!;
        expect(isPhantomScheduledTrialSession(userSession, '2026-07-31', [userSession])).toBe(false);
        expect(filterTrialSessionsForDisplay([userSession], '2026-07-31')).toHaveLength(1);
    });
});
