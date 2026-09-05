/**
 * عقد قبول — مصفوفة التقاضي المدني (تعدد مدعى عليهم + اختصام)
 * =================================================================
 * يربط اختبارات القبول بمحرك القرار النقي `litigationDecisionEngine`
 * دون لمس كود تشغيلي خارجي أو واجهات.
 */
import { describe, expect, it } from 'vitest';
import {
    assertsHomogeneousAppealCard,
    buildLineageSpawn,
    canAppealFromOutcome,
    getPartyDecision,
    isCrossAppealFeatureEnabled,
    readDormantHasCrossAppeal,
    resolveChallengeClockAnchor,
    resolveCivilLitigationMatrixDecision,
    resolveJudicialConsolidation,
    resolveOperationalAppealAction,
    type MatrixDecision,
} from '../litigationDecisionEngine';

function party(decision: MatrixDecision, id: string) {
    return getPartyDecision(decision, id);
}

describe('Acceptance — مصفوفة التقاضي المدني (قرار نهائي)', () => {
    describe('حسم التعارضات (عقد ثابت)', () => {
        it('م/190: hasCrossAppeal خامل وFeature Flag مغلق', () => {
            expect(isCrossAppealFeatureEnabled()).toBe(false);
            expect(readDormantHasCrossAppeal({ hasCrossAppeal: true })).toBe(true);
            expect(readDormantHasCrossAppeal({ hasCrossAppeal: false })).toBe(false);
            const d = resolveCivilLitigationMatrixDecision({
                isJointOrIndivisible: true,
                hasCrossAppeal: true,
                parties: [
                    { id: 'P', role: 'plaintiff', outcome: 'PARTIAL', form: 'HADORI' },
                    { id: '1', role: 'defendant', outcome: 'FULL_LOSS', form: 'HADORI' },
                ],
            });
            expect(d.hasCrossAppeal).toBe(true);
            expect(d.spawnInvertedDossier).toBeNull();
        });

        it('م/172: القابل للتجزئة ⇒ Staging = FALSE حتى مع اعتراض غيابي معلّق', () => {
            const d = resolveCivilLitigationMatrixDecision({
                isJointOrIndivisible: false,
                ghayabiObjection: { partyId: '3', path: 'PENDING' },
                parties: [
                    { id: 'P', role: 'plaintiff', outcome: 'FULL_WIN', form: 'HADORI' },
                    { id: '3', role: 'defendant', outcome: 'FULL_LOSS', form: 'GHIABI' },
                ],
            });
            expect(d.staging).toBe('FALSE');
        });

        it('م/168: PARTIAL للاختصامي ⇒ canAppeal = true', () => {
            expect(canAppealFromOutcome('PARTIAL')).toBe(true);
            const d = resolveCivilLitigationMatrixDecision({
                isJointOrIndivisible: true,
                parties: [
                    { id: 'P', role: 'plaintiff', outcome: 'PARTIAL', form: 'HADORI' },
                    {
                        id: 'IC',
                        role: 'interpleader',
                        outcome: 'PARTIAL',
                        form: 'HADORI',
                        interpleaderKind: 'voluntary_66',
                    },
                ],
            });
            expect(party(d, 'IC').canAppeal).toBe(true);
        });

        it('محوّل المسار التشغيلي يمر عبر canAppealFromOutcome', () => {
            expect(resolveOperationalAppealAction('FULL_WIN')).toBe('wait_opponent');
            expect(resolveOperationalAppealAction('EXEMPT')).toBe('wait_opponent');
            expect(resolveOperationalAppealAction('FULL_LOSS')).toBe('self_appeal');
            expect(resolveOperationalAppealAction('PARTIAL')).toBe('both_paths');
            expect(resolveOperationalAppealAction('PARTIAL', { partialAction: 'self_appeal' })).toBe(
                'self_appeal',
            );
        });
    });

    describe('Hard Invariants — Sanity Check Table', () => {
        it('1) تفريد الخصوم: نتائج مختلفة ⇒ DispositionState مستقلة لكل طرف', () => {
            const d = resolveCivilLitigationMatrixDecision({
                isJointOrIndivisible: true,
                parties: [
                    { id: 'P', role: 'plaintiff', outcome: 'PARTIAL', form: 'HADORI' },
                    { id: '1', role: 'defendant', outcome: 'FULL_LOSS', form: 'HADORI' },
                    { id: '2', role: 'defendant', outcome: 'FULL_WIN', form: 'HADORI' },
                    { id: '3', role: 'defendant', outcome: 'FULL_LOSS', form: 'GHIABI' },
                ],
            });
            expect(party(d, '2').dispositionState).toBe('RELEASED');
            expect(party(d, '2').canAppeal).toBe(false);
            expect(party(d, '1').dispositionState).toBe('ELIGIBLE_FOR_APPEAL');
            expect(party(d, '3').dispositionState).toBe('ELIGIBLE_FOR_OBJECTION_OR_DIRECT_APPEAL');
            expect(party(d, 'P').dispositionState).toBe('ELIGIBLE_FOR_APPEAL');
        });

        it('2) تعدد الطاعنين: شريط علوي spawn — لا دمج في عريضة واحدة ولا تعديل الملف المفتوح', () => {
            const d = resolveCivilLitigationMatrixDecision({
                isJointOrIndivisible: true,
                parties: [
                    { id: 'P', name: 'أحمد', role: 'plaintiff', outcome: 'PARTIAL', form: 'HADORI' },
                    { id: '1', name: 'سامي', role: 'defendant', outcome: 'FULL_LOSS', form: 'HADORI' },
                    { id: '2', name: 'كريم', role: 'defendant', outcome: 'FULL_WIN', form: 'HADORI' },
                ],
            });
            expect(d.topBarActions.length).toBeGreaterThanOrEqual(2);
            expect(d.topBarActions.every((a) => a.mutatesOpenDossier === false)).toBe(true);
            expect(d.topBarActions.some((a) => a.challengerId === '1')).toBe(true);
            expect(d.topBarActions.every((a) => a.kind === 'SPAWN_INDEPENDENT_CHALLENGE')).toBe(true);

            const lineage = buildLineageSpawn({
                parentId: 'file-mother',
                originStageId: 'stage-fi',
                challengerId: '1',
                parties: [
                    { id: 'P', role: 'plaintiff', outcome: 'PARTIAL', form: 'HADORI' },
                    { id: '1', role: 'defendant', outcome: 'FULL_LOSS', form: 'HADORI' },
                    { id: '2', role: 'defendant', outcome: 'FULL_WIN', form: 'HADORI' },
                ],
            });
            expect(lineage.parentId).toBe('file-mother');
            expect(lineage.originStageId).toBe('stage-fi');
            expect(lineage.appellantId).toBe('1');
            expect(lineage.appelleeIds).toEqual(['P']);
            expect(lineage.excludedExemptIds).toContain('2');
        });

        it('3) مهلة الغائب من التبليغ فقط — يُحظر النطق كمرساة', () => {
            const ghayabi = resolveChallengeClockAnchor({
                form: 'GHIABI',
                judgmentPronouncementDate: '2026-01-01',
                officialServiceDate: '2026-01-20',
            });
            expect(ghayabi.source).toBe('SERVICE');
            expect(ghayabi.anchorDate).toBe('2026-01-20');
            expect(ghayabi.anchorDate).not.toBe('2026-01-01');

            const withoutService = resolveChallengeClockAnchor({
                form: 'GHIABI',
                judgmentPronouncementDate: '2026-01-01',
                officialServiceDate: null,
            });
            expect(withoutService.anchorDate).toBeNull();

            const hadori = resolveChallengeClockAnchor({
                form: 'HADORI',
                judgmentPronouncementDate: '2026-01-01',
            });
            expect(hadori.source).toBe('PRONOUNCEMENT');
        });

        it('4) براءة مدعى عليه ⇒ EXEMPT/RELEASED وإقصاء من أزرار الطعن', () => {
            const d = resolveCivilLitigationMatrixDecision({
                isJointOrIndivisible: true,
                parties: [
                    { id: 'P', name: 'أحمد', role: 'plaintiff', outcome: 'PARTIAL', form: 'HADORI' },
                    { id: '1', name: 'سامي', role: 'defendant', outcome: 'FULL_LOSS', form: 'HADORI' },
                    { id: '2', name: 'نورا', role: 'defendant', outcome: 'EXEMPT', form: 'HADORI' },
                ],
            });
            expect(party(d, '2').exempt).toBe(true);
            expect(party(d, '2').canAppeal).toBe(false);
            expect(party(d, '2').clockExtinguished).toBe(true);
            expect(d.topBarActions.every((a) => a.challengerId !== '2')).toBe(true);
        });

        it('5) اعتراض غائب في دين قابل للتجزئة ⇒ لا استئخار', () => {
            const d = resolveCivilLitigationMatrixDecision({
                isJointOrIndivisible: false,
                ghayabiObjection: { partyId: '3', path: 'PENDING' },
                parties: [
                    { id: 'P', role: 'plaintiff', outcome: 'FULL_WIN', form: 'HADORI' },
                    { id: '1', role: 'defendant', outcome: 'FULL_LOSS', form: 'HADORI' },
                    { id: '3', role: 'defendant', outcome: 'FULL_LOSS', form: 'GHIABI' },
                ],
            });
            expect(d.staging).toBe('FALSE');
            expect(party(d, '1').appealSuspendedByStaging).toBe(false);
        });

        it('5b) استئناف مباشر للغائب (م/177) ⇒ يلغي الاستئخار', () => {
            const d = resolveCivilLitigationMatrixDecision({
                isJointOrIndivisible: true,
                ghayabiObjection: { partyId: '3', path: 'DIRECT_APPEAL' },
                parties: [
                    { id: 'P', role: 'plaintiff', outcome: 'FULL_WIN', form: 'HADORI' },
                    { id: '1', role: 'defendant', outcome: 'FULL_LOSS', form: 'HADORI' },
                    { id: '3', role: 'defendant', outcome: 'FULL_LOSS', form: 'GHIABI' },
                ],
            });
            expect(d.staging).toBe('FALSE');
        });

        it('6) توحيد قضائي: رول موحد مع بقاء أرقام الأقلام — بلا طمس إداري', () => {
            const c = resolveJudicialConsolidation({
                unifiedRollSessionId: 'roll-shared-1',
                caseNumbers: ['100/ب/2026', '55/س/2026'],
            });
            expect(c.mergesAdministrativeIdentity).toBe(false);
            expect(c.retainedCaseNumbers).toEqual(['100/ب/2026', '55/س/2026']);
            expect(c.unifiedRollSessionId).toBe('roll-shared-1');
        });

        it('7) منع التناقض البصري: مستأنِف+مستأنَف عليه للموكل ⇒ يتطلب إضبارة منشقة', () => {
            const bad = assertsHomogeneousAppealCard({
                clientPartyId: 'P',
                appellantIds: ['P', '1'],
                appelleeIds: ['P', '3'],
            });
            expect(bad.ok).toBe(false);
            expect(bad.requiresSpawnedDossier).toBe(true);

            const good = assertsHomogeneousAppealCard({
                clientPartyId: 'P',
                appellantIds: ['P'],
                appelleeIds: ['3'],
            });
            expect(good.ok).toBe(true);
        });
    });

    describe('Test Case 1 — فوز المدعي الكلي + غائب ملزَم تضامنياً', () => {
        it('يفعّل الاستئخار ويعلّق طعون غير المعترض ويحجب المدعي', () => {
            const d = resolveCivilLitigationMatrixDecision({
                isJointOrIndivisible: true,
                ghayabiObjection: { partyId: '3', path: 'PENDING' },
                parties: [
                    { id: 'P', role: 'plaintiff', outcome: 'FULL_WIN', form: 'HADORI' },
                    { id: '1', role: 'defendant', outcome: 'FULL_LOSS', form: 'HADORI' },
                    { id: '3', role: 'defendant', outcome: 'FULL_LOSS', form: 'GHIABI' },
                    {
                        id: 'IC',
                        role: 'interpleader',
                        outcome: 'FULL_LOSS',
                        form: 'HADORI',
                        interpleaderKind: 'voluntary_66',
                    },
                ],
            });

            expect(d.staging).toBe('ACTIVE');
            expect(party(d, 'P').canAppeal).toBe(false);
            expect(party(d, 'P').clockExtinguished).toBe(true);

            expect(party(d, '1').canAppeal).toBe(true);
            expect(party(d, '1').appealSuspendedByStaging).toBe(true);

            expect(party(d, 'IC').canAppeal).toBe(true);
            expect(party(d, 'IC').appealSuspendedByStaging).toBe(true);

            expect(party(d, '3').canAppeal).toBe(true);
            expect(party(d, '3').appealSuspendedByStaging).toBe(false);
            expect(d.spawnInvertedDossier).toBeNull();
        });
    });

    describe('Test Case 2 — فوز الشخص الثالث الكلي', () => {
        it('يطفئ طعن الاختصامي ويفتح طعن المدعي والمدعى عليهم', () => {
            const d = resolveCivilLitigationMatrixDecision({
                isJointOrIndivisible: true,
                parties: [
                    { id: 'P', role: 'plaintiff', outcome: 'FULL_LOSS', form: 'HADORI' },
                    { id: '1', role: 'defendant', outcome: 'FULL_LOSS', form: 'HADORI' },
                    { id: '2', role: 'defendant', outcome: 'FULL_LOSS', form: 'GHIABI' },
                    {
                        id: 'IC',
                        role: 'interpleader',
                        outcome: 'FULL_WIN',
                        form: 'HADORI',
                        interpleaderKind: 'voluntary_66',
                    },
                ],
            });

            expect(party(d, 'IC').canAppeal).toBe(false);
            expect(party(d, 'IC').clockExtinguished).toBe(true);

            expect(party(d, 'P').canAppeal).toBe(true);
            expect(party(d, '1').canAppeal).toBe(true);
            expect(party(d, '2').canAppeal).toBe(true);

            expect(d.staging).toBe('FALSE');
        });
    });

    describe('Test Case 3 — رد الدعوى والتدخل + التزام قابل للتجزئة', () => {
        it('ينعدم الاستئخار لانتفاء الإلزام/التجزئة ويطفئ ساعات المدعى عليهم', () => {
            const d = resolveCivilLitigationMatrixDecision({
                isJointOrIndivisible: false,
                ghayabiObjection: { partyId: '2', path: 'PENDING' },
                parties: [
                    { id: 'P', role: 'plaintiff', outcome: 'FULL_LOSS', form: 'HADORI' },
                    { id: '1', role: 'defendant', outcome: 'FULL_WIN', form: 'HADORI' },
                    { id: '2', role: 'defendant', outcome: 'FULL_WIN', form: 'GHIABI' },
                    {
                        id: 'IC',
                        role: 'interpleader',
                        outcome: 'FULL_LOSS',
                        form: 'HADORI',
                        interpleaderKind: 'voluntary_66',
                    },
                ],
            });

            expect(d.staging).toBe('FALSE');
            expect(party(d, '1').canAppeal).toBe(false);
            expect(party(d, '1').clockExtinguished).toBe(true);
            expect(party(d, '2').canAppeal).toBe(false);
            expect(party(d, '2').clockExtinguished).toBe(true);

            expect(party(d, 'P').canAppeal).toBe(true);
            expect(party(d, 'IC').canAppeal).toBe(true);
        });
    });

    describe('Test Case 4 — حكم مركّب + انقلاب مراكز بعد اعتراض ناجح', () => {
        it('يولّد إضبارة منشقة ويبقي المبرَّأ EXEMPT ويفك استئخار (1)', () => {
            const d = resolveCivilLitigationMatrixDecision({
                isJointOrIndivisible: true,
                ghayabiObjection: { partyId: '3', path: 'SUCCEEDED_QUASH' },
                hasCrossAppeal: false,
                parties: [
                    { id: 'P', role: 'plaintiff', outcome: 'PARTIAL', form: 'HADORI' },
                    { id: '1', role: 'defendant', outcome: 'FULL_LOSS', form: 'HADORI' },
                    { id: '2', role: 'defendant', outcome: 'EXEMPT', form: 'HADORI' },
                    { id: '3', role: 'defendant', outcome: 'FULL_WIN', form: 'GHIABI' },
                ],
            });

            expect(d.spawnInvertedDossier).toEqual({
                appellantId: 'P',
                appelleeId: '3',
                reason: 'ROLE_INVERSION_AFTER_OBJECTION_QUASH',
            });

            expect(party(d, '2').exempt).toBe(true);
            expect(party(d, '2').canAppeal).toBe(false);
            expect(party(d, '2').clockExtinguished).toBe(true);

            expect(d.staging).toBe('FALSE');
            expect(party(d, '1').canAppeal).toBe(true);
            expect(party(d, '1').appealSuspendedByStaging).toBe(false);

            expect(party(d, 'P').canAppeal).toBe(true);
            expect(party(d, '3').canAppeal).toBe(false);

            const card = assertsHomogeneousAppealCard({
                clientPartyId: 'P',
                appellantIds: [d.spawnInvertedDossier!.appellantId],
                appelleeIds: [d.spawnInvertedDossier!.appelleeId],
            });
            expect(card.ok).toBe(true);
        });
    });
});
