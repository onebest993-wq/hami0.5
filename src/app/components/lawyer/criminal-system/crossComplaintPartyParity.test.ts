/**
 * ⚖️ اختبارات تَكافؤ الأطراف في الشكوى المتقابلة (Dual-Identity Parity).
 *
 * تَحرس بِصرامة:
 *   1) أن مَيزات «المتهم» (الوفاة / الحَجز / الكفالة / التَوقيف) تَنعكس بحَذافيرها
 *      على المشتكي المُتقابل (isCrossComplaint per-party أو isMutualComplaint case-level).
 *   2) أن المَنطق لا يَتسرّب إلى الحالات غير المتقابلة — لا اللُغة ولا البَيانات.
 *   3) أن مَسار الإصدار القضائي (createLawyerRequest) يَكتب على حقول `accused*`
 *      بشكل مُتطابق دون نَقل كائن المشتكي إلى مَصفوفة المتهمين.
 */
import { beforeEach, describe, expect, it, vi } from 'vitest';
import SecureStoreService from '@/app/services/SecureStoreService';
import {
    classifyAssetSeizurePartyKind,
    resolveProceduralDefendantId,
    useCriminalStore,
    type CriminalCase,
    type CriminalComplainant,
    type CriminalDefendant,
} from './criminalStore';
import {
    ASSET_SEIZURE_TEMPLATE,
    DEFENDANT_BAIL_TEMPLATE,
    DETENTION_DECISION_TEMPLATE,
} from './proceduralRequestTypes';
import { resetCriminalStore as resetStore } from './__tests__/criminalStoreTestHelpers';

/**
 * بَذرة إضبارة جنحة جاهزة بِكامل الحقول الإلزامية + متهم واحد + مشتكي واحد.
 * تَسمح للاختبار بِتفعيل `isMutualComplaint` أو `complainant.isCrossComplaint` لاحقاً.
 */
function seedMisdemeanorCase(opts: {
    complainantName?: string;
    defendantName?: string;
    isMutualComplaint?: boolean;
    complainantIsCrossComplaint?: boolean;
    complainantAccusedStatus?: CriminalDefendant['status'];
} = {}): { caseId: string; complainantId: string; defendantId: string } {
    const s = useCriminalStore.getState();
    s.setBasicField('role', 'وكيل المشتكي');
    s.setBasicField('ourRepresentation', 'complainant_side');
    s.setBasicField('stage', 'محكمة الجنح');
    s.setBasicField('crimeType', 'جنحة');
    s.setBasicField('legalArticle', '413 ق.ع');
    s.setLocationField('investigationCourtName', 'محكمة تحقيق الكرخ');
    s.setLocationField('baseRegisterNumberAndDate', '1/2026 في 2026-05-19');
    s.setLocationField('courtName', 'محكمة جنح الكرخ');
    s.setLocationField('caseNumber', '123/ج/2026');

    const draft = useCriminalStore.getState().draft;
    const defId = draft.defendants[0]!.id;
    const compId = draft.complainants[0]!.id;
    s.setDefendantField(defId, 'fullName', opts.defendantName ?? 'علي حسين عبد');
    s.setDefendantField(defId, 'birthYear', '1990');
    s.setDefendantField(defId, 'status', 'حر');
    s.setComplainantField(compId, 'fullName', opts.complainantName ?? 'سعد عبد الكريم');

    const caseId = s.createCaseFromDraft();
    if (!caseId) throw new Error('case creation failed');

    if (opts.isMutualComplaint || opts.complainantIsCrossComplaint || opts.complainantAccusedStatus) {
        useCriminalStore.setState((state) => {
            const t = state.casesById[caseId];
            if (!t) return state;
            const nextComps = (t.complainants ?? []).map((c) =>
                c.id === compId
                    ? {
                          ...c,
                          ...(opts.complainantIsCrossComplaint ? { isCrossComplaint: true } : {}),
                          ...(opts.complainantAccusedStatus
                              ? { accusedStatus: opts.complainantAccusedStatus }
                              : {}),
                      }
                    : c,
            );
            return {
                casesById: {
                    ...state.casesById,
                    [caseId]: {
                        ...t,
                        isMutualComplaint: opts.isMutualComplaint === true,
                        complainants: nextComps,
                    },
                },
            };
        });
    }

    return { caseId, complainantId: compId, defendantId: defId };
}

function loadCase(caseId: string): CriminalCase {
    return useCriminalStore.getState().casesById[caseId]!;
}

function loadComplainant(caseId: string, complainantId: string): CriminalComplainant {
    const c = (loadCase(caseId).complainants ?? []).find((x) => x.id === complainantId);
    if (!c) throw new Error(`complainant ${complainantId} not found`);
    return c;
}

describe('Cross-Complaint Party Parity — dual identity is honored, no leakage', () => {
    beforeEach(() => {
        resetStore();
    });

    describe('💀 registerCrossComplainantAccusedDeath', () => {
        it('locks the cross-complainant accused record when complainant has isCrossComplaint=true', () => {
            const { caseId, complainantId } = seedMisdemeanorCase({
                complainantIsCrossComplaint: true,
                complainantAccusedStatus: 'موقوف',
            });

            useCriminalStore
                .getState()
                .registerCrossComplainantAccusedDeath(caseId, complainantId, '2026-06-01');

            const c = loadComplainant(caseId, complainantId);
            expect(c.accusedStatus).toBe('متوفى');
            expect(c.accusedIsPartyRecordLocked).toBe(true);
            expect(c.accusedPersonalStage).toBe('lawsuit_dropped_death');
            expect(String(c.accusedDetentionAuthority ?? '').trim()).toBe('');
            expect(String(c.accusedDetentionExpiryDate ?? '').trim()).toBe('');

            const events = loadCase(caseId).timelineEvents ?? [];
            const deathEvent = events.find((e) => e.title === 'وفاة مشتكي متقابل');
            expect(deathEvent).toBeTruthy();
            expect(deathEvent?.category).toMatch(/سقوط الدعوى الفرعية/);
        });

        it('refuses to lock when complainant is NOT cross — guards the leakage boundary', () => {
            const { caseId, complainantId } = seedMisdemeanorCase({
                isMutualComplaint: false,
                complainantIsCrossComplaint: false,
            });

            useCriminalStore
                .getState()
                .registerCrossComplainantAccusedDeath(caseId, complainantId);

            const c = loadComplainant(caseId, complainantId);
            expect(c.accusedStatus ?? '').not.toBe('متوفى');
            expect(c.accusedIsPartyRecordLocked).toBeFalsy();
            expect(c.accusedPersonalStage).toBeFalsy();
        });

        it('refuses to re-lock an already locked record (idempotency)', () => {
            const { caseId, complainantId } = seedMisdemeanorCase({
                complainantIsCrossComplaint: true,
            });

            useCriminalStore
                .getState()
                .registerCrossComplainantAccusedDeath(caseId, complainantId, '2026-06-01');
            const firstSnapshot = loadComplainant(caseId, complainantId);

            useCriminalStore
                .getState()
                .registerCrossComplainantAccusedDeath(caseId, complainantId, '2026-09-09');
            const secondSnapshot = loadComplainant(caseId, complainantId);

            expect(secondSnapshot.accusedStatus).toBe(firstSnapshot.accusedStatus);
            const events = loadCase(caseId).timelineEvents ?? [];
            expect(events.filter((e) => e.title === 'وفاة مشتكي متقابل').length).toBe(1);
        });

        it('honors case-level isMutualComplaint even when complainant flag is absent', () => {
            const { caseId, complainantId } = seedMisdemeanorCase({
                isMutualComplaint: true,
                complainantIsCrossComplaint: false,
            });

            useCriminalStore
                .getState()
                .registerCrossComplainantAccusedDeath(caseId, complainantId);

            expect(loadComplainant(caseId, complainantId).accusedIsPartyRecordLocked).toBe(true);
        });
    });

    describe('📦 addCrossComplainantSeizedAssets / update / release', () => {
        it('attaches assets only when complainant is cross — refuses non-cross silently', () => {
            const { caseId, complainantId } = seedMisdemeanorCase({
                complainantIsCrossComplaint: false,
                isMutualComplaint: false,
            });

            useCriminalStore.getState().addCrossComplainantSeizedAssets(
                caseId,
                complainantId,
                [{ description: 'سيارة كيا' }],
                'req-1',
            );

            const c = loadComplainant(caseId, complainantId);
            expect((c.accusedSeizedAssets ?? []).length).toBe(0);
        });

        it('attaches assets when complainant is cross + status="هارب"', () => {
            const { caseId, complainantId } = seedMisdemeanorCase({
                complainantIsCrossComplaint: true,
                complainantAccusedStatus: 'هارب',
            });

            useCriminalStore.getState().addCrossComplainantSeizedAssets(
                caseId,
                complainantId,
                [
                    { description: 'سيارة كيا', referenceNumber: 'C-1' },
                    { description: 'هاتف آيفون' },
                ],
                'req-1',
            );

            const c = loadComplainant(caseId, complainantId);
            const list = c.accusedSeizedAssets ?? [];
            expect(list.length).toBe(2);
            expect(list[0]?.description).toBe('سيارة كيا');
            expect(list[0]?.sourceRequestId).toBe('req-1');
            expect(list[1]?.description).toBe('هاتف آيفون');
        });

        it('updates and releases assets correctly', () => {
            const { caseId, complainantId } = seedMisdemeanorCase({
                complainantIsCrossComplaint: true,
                complainantAccusedStatus: 'هارب',
            });

            useCriminalStore
                .getState()
                .addCrossComplainantSeizedAssets(
                    caseId,
                    complainantId,
                    [{ description: 'سيارة كيا' }, { description: 'هاتف آيفون' }],
                );

            const c1 = loadComplainant(caseId, complainantId);
            const firstAssetId = (c1.accusedSeizedAssets ?? [])[0]!.id;

            useCriminalStore
                .getState()
                .updateCrossComplainantSeizedAsset(caseId, complainantId, firstAssetId, {
                    description: 'سيارة كيا 2018 — أبيض',
                });
            expect(
                loadComplainant(caseId, complainantId).accusedSeizedAssets?.[0]?.description,
            ).toBe('سيارة كيا 2018 — أبيض');

            useCriminalStore
                .getState()
                .releaseCrossComplainantSeizedAssets(caseId, complainantId, [firstAssetId]);
            const remaining = loadComplainant(caseId, complainantId).accusedSeizedAssets ?? [];
            expect(remaining.length).toBe(1);
            expect(remaining[0]?.description).toBe('هاتف آيفون');

            useCriminalStore
                .getState()
                .releaseCrossComplainantSeizedAssets(caseId, complainantId);
            expect((loadComplainant(caseId, complainantId).accusedSeizedAssets ?? []).length).toBe(0);
        });
    });

    describe('⚖️ Judicial decisions wire through to cross-complainant accused* fields', () => {
        it('DEFENDANT_BAIL_TEMPLATE updates accusedStatus + accusedGuarantorDetails on cross complainant', () => {
            const { caseId, complainantId } = seedMisdemeanorCase({
                complainantIsCrossComplaint: true,
                complainantAccusedStatus: 'موقوف',
            });

            const result = useCriminalStore.getState().createLawyerRequest(caseId, {
                requestDate: '2026-06-10',
                lawyerNote: 'تكفيل المشتكي المتقابل ٢ مليون دينار',
                proceduralTemplate: DEFENDANT_BAIL_TEMPLATE,
                defendantIds: [complainantId],
                defendantBail: { kind: 'financial', bailAmount: '2,000,000' },
            });
            expect(result.error).toBeNull();

            const c = loadComplainant(caseId, complainantId);
            expect(c.accusedStatus).toBe('مكفل');
            expect(c.accusedGuarantorDetails?.kind).toBe('financial');
            expect(c.accusedGuarantorDetails?.bailAmount).toBe('2,000,000');
        });

        it('DETENTION_DECISION_TEMPLATE updates accusedStatus="موقوف" + expiryDate on cross complainant', () => {
            const { caseId, complainantId } = seedMisdemeanorCase({
                complainantIsCrossComplaint: true,
                complainantAccusedStatus: 'حر',
            });

            const result = useCriminalStore.getState().createLawyerRequest(caseId, {
                requestDate: '2026-06-10',
                lawyerNote: 'توقيف ابتداء بحق المشتكي المتقابل',
                proceduralTemplate: DETENTION_DECISION_TEMPLATE,
                defendantIds: [complainantId],
                detentionStartDate: '2026-06-10',
                detentionEndDate: '2026-06-25',
            });
            expect(result.error).toBeNull();

            const c = loadComplainant(caseId, complainantId);
            expect(c.accusedStatus).toBe('موقوف');
            expect(c.accusedDetentionExpiryDate).toBe('2026-06-25');
        });

        it('ASSET_SEIZURE_TEMPLATE attaches assets to accusedSeizedAssets on cross complainant', () => {
            const { caseId, complainantId } = seedMisdemeanorCase({
                complainantIsCrossComplaint: true,
                complainantAccusedStatus: 'هارب',
            });

            const result = useCriminalStore.getState().createLawyerRequest(caseId, {
                requestDate: '2026-06-10',
                lawyerNote: 'حجز أموال المشتكي الهارب',
                proceduralTemplate: ASSET_SEIZURE_TEMPLATE,
                defendantIds: [complainantId],
                assetSeizure: {
                    perDefendant: [
                        {
                            defendantId: complainantId,
                            assets: [{ description: 'سيارة كيا 2018' }],
                        },
                    ],
                },
            });
            expect(result.error).toBeNull();

            const c = loadComplainant(caseId, complainantId);
            expect((c.accusedSeizedAssets ?? []).length).toBe(1);
            expect(c.accusedSeizedAssets?.[0]?.description).toBe('سيارة كيا 2018');
        });

        it('LEAKAGE GUARD: bail decision against a non-cross complainant does NOT mutate accused*', () => {
            const { caseId, complainantId, defendantId } = seedMisdemeanorCase({
                isMutualComplaint: false,
                complainantIsCrossComplaint: false,
            });

            const result = useCriminalStore.getState().createLawyerRequest(caseId, {
                requestDate: '2026-06-10',
                lawyerNote: 'تكفيل',
                proceduralTemplate: DEFENDANT_BAIL_TEMPLATE,
                defendantIds: [defendantId, complainantId],
                defendantBail: { kind: 'financial', bailAmount: '1,000,000' },
            });
            expect(result.error).toBeNull();

            const c = loadComplainant(caseId, complainantId);
            expect(c.accusedStatus ?? '').toBe('');
            expect(c.accusedGuarantorDetails).toBeFalsy();

            const def = (loadCase(caseId).defendants ?? []).find((d) => d.id === defendantId)!;
            expect(def.status).toBe('مكفل');
            expect(def.guarantorDetails?.bailAmount).toBe('1,000,000');
        });
    });

    describe('📜 TimelineEvent.complainantIds linkage (Gap 3 — per-party filtering)', () => {
        it('death event carries complainantIds for the cross complainant', () => {
            const { caseId, complainantId } = seedMisdemeanorCase({
                complainantIsCrossComplaint: true,
            });
            useCriminalStore
                .getState()
                .registerCrossComplainantAccusedDeath(caseId, complainantId, '2026-06-01');

            const evt = (loadCase(caseId).timelineEvents ?? []).find(
                (e) => e.title === 'وفاة مشتكي متقابل',
            );
            expect(evt?.complainantIds).toEqual([complainantId]);
            expect(evt?.defendantIds).toBeFalsy();
        });

        it('seizure event for cross complainant carries complainantIds, not defendantIds', () => {
            const { caseId, complainantId } = seedMisdemeanorCase({
                complainantIsCrossComplaint: true,
                complainantAccusedStatus: 'هارب',
            });
            useCriminalStore.getState().createLawyerRequest(caseId, {
                requestDate: '2026-06-10',
                lawyerNote: 'حجز أموال',
                proceduralTemplate: ASSET_SEIZURE_TEMPLATE,
                defendantIds: [complainantId],
                assetSeizure: {
                    perDefendant: [
                        { defendantId: complainantId, assets: [{ description: 'سيارة' }] },
                    ],
                },
            });

            const seizureEvt = (loadCase(caseId).timelineEvents ?? []).find((e) =>
                e.category.includes('حجز الأموال (شكوى متقابلة)'),
            );
            expect(seizureEvt?.complainantIds).toEqual([complainantId]);
            expect(seizureEvt?.defendantIds).toBeFalsy();
        });

        it('status change event for cross complainant carries complainantIds', () => {
            const { caseId, complainantId } = seedMisdemeanorCase({
                complainantIsCrossComplaint: true,
                complainantAccusedStatus: 'حر',
            });
            useCriminalStore
                .getState()
                .updateCrossComplainantAccusedStatus(caseId, complainantId, 'موقوف');

            const evt = (loadCase(caseId).timelineEvents ?? []).find(
                (e) => e.title === 'تحديث حالة المشتكي بصفته متهماً',
            );
            expect(evt?.complainantIds).toEqual([complainantId]);
        });
    });

    describe('🔎 classifyAssetSeizurePartyKind (Gap 4 — semantic clarity)', () => {
        it('classifies a defendant ID as defendant', () => {
            const { caseId, defendantId } = seedMisdemeanorCase();
            expect(classifyAssetSeizurePartyKind(loadCase(caseId), defendantId)).toBe('defendant');
        });

        it('classifies a complainant ID as complainant (even outside mutual)', () => {
            const { caseId, complainantId } = seedMisdemeanorCase();
            expect(classifyAssetSeizurePartyKind(loadCase(caseId), complainantId)).toBe(
                'complainant',
            );
        });

        it('returns unknown for unrecognized IDs', () => {
            const { caseId } = seedMisdemeanorCase();
            expect(classifyAssetSeizurePartyKind(loadCase(caseId), 'ghost-id-999')).toBe('unknown');
            expect(classifyAssetSeizurePartyKind(loadCase(caseId), '')).toBe('unknown');
        });

        it('returns unknown when caseRecord is undefined', () => {
            expect(classifyAssetSeizurePartyKind(undefined, 'x')).toBe('unknown');
        });
    });

    describe('🧭 resolveProceduralDefendantId hardening (Gap 2 documented behavior)', () => {
        const mkDef = (id: string, name: string): CriminalDefendant =>
            ({
                id,
                fullName: name,
                address: '',
                birthYear: '',
                status: 'حر',
                detentionAuthority: '',
                detentionExpiryDate: '',
                detentionHistoryLog: [],
                totalDetentionDays: 0,
            }) as unknown as CriminalDefendant;
        const mkComp = (id: string, name: string, extra: Partial<CriminalComplainant> = {}): CriminalComplainant =>
            ({ id, fullName: name, address: '', ...extra }) as unknown as CriminalComplainant;

        it('returns the defendant ID as-is when it already matches', () => {
            const defs = [mkDef('d1', 'علي')];
            const comps: CriminalComplainant[] = [];
            expect(resolveProceduralDefendantId(comps, defs, 'd1', true)).toBe('d1');
        });

        it('returns the ID unchanged when case is NOT mutual — name match is suppressed', () => {
            const defs = [mkDef('d1', 'علي')];
            const comps = [mkComp('c1', 'علي')];
            expect(resolveProceduralDefendantId(comps, defs, 'c1', false)).toBe('c1');
        });

        it('returns the ID unchanged when complainant fullName is whitespace-only (no false match)', () => {
            const defs = [mkDef('d1', '')];
            const comps = [mkComp('c1', '   ')];
            expect(resolveProceduralDefendantId(comps, defs, 'c1', true)).toBe('c1');
        });

        it('remaps complainant→defendant ID ONLY when names match exactly under mutual flag (legacy)', () => {
            const defs = [mkDef('d1', 'علي حسين')];
            const comps = [mkComp('c1', 'علي حسين')];
            expect(resolveProceduralDefendantId(comps, defs, 'c1', true)).toBe('d1');
        });

        it('does NOT remap when names differ', () => {
            const defs = [mkDef('d1', 'علي حسين')];
            const comps = [mkComp('c1', 'سعد كاظم')];
            expect(resolveProceduralDefendantId(comps, defs, 'c1', true)).toBe('c1');
        });
    });

    describe('🛡️ Data persistence — fields survive store round-trip', () => {
        it('persists accused* fields including new ones (seizedAssets, partyRecordLocked, personalStage)', async () => {
            const { caseId, complainantId } = seedMisdemeanorCase({
                complainantIsCrossComplaint: true,
                complainantAccusedStatus: 'هارب',
            });

            useCriminalStore
                .getState()
                .addCrossComplainantSeizedAssets(caseId, complainantId, [
                    { description: 'حساب بنكي' },
                ]);
            useCriminalStore
                .getState()
                .registerCrossComplainantAccusedDeath(caseId, complainantId);

            const live = loadComplainant(caseId, complainantId);
            expect(live.accusedSeizedAssets?.length).toBe(1);
            expect(live.accusedIsPartyRecordLocked).toBe(true);
            expect(live.accusedPersonalStage).toBe('lawsuit_dropped_death');

            await SecureStoreService.ensurePersistedReady();
            await vi.waitFor(
                async () => {
                    const raw = await SecureStoreService.getItem('hami:criminal:store');
                    if (!raw) return false;
                    const parsed = JSON.parse(raw) as {
                        state?: { casesById?: Record<string, CriminalCase> };
                        casesById?: Record<string, CriminalCase>;
                    };
                    const bucket = parsed?.state?.casesById ?? parsed?.casesById;
                    if (!bucket) return false;
                    const saved =
                        bucket[caseId] ?? Object.values(bucket).find((row) => row?.id === caseId);
                    if (!saved) return false;
                    const complainant = (saved.complainants ?? []).find((c) => c.id === complainantId);
                    return (
                        (complainant?.accusedSeizedAssets?.length ?? 0) === 1 &&
                        complainant?.accusedIsPartyRecordLocked === true &&
                        complainant?.accusedPersonalStage === 'lawsuit_dropped_death'
                    );
                },
                { timeout: 3000, interval: 25 },
            );
        });
    });
});
